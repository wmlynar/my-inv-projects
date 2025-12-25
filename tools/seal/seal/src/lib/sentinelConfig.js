"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { ensureDir, fileExists } = require("./fsextra");
const { readJson5, writeJson5 } = require("./json5io");
const { normalizeAppId, parseNamespaceId, buildAnchor, deriveOpaqueDir, deriveOpaqueFile, buildFingerprintString, sha256 } = require("./sentinelCore");

const DEFAULT_SENTINEL = {
  enabled: "auto",
  level: "auto",
  appId: "auto",
  namespaceId: "auto",
  cpuIdSource: "auto",
  storage: { baseDir: "/var/lib", mode: "file" },
  exitCodeBlock: 200,
  externalAnchor: { type: "none" },
};

function mergeSentinelConfig(base, override) {
  const out = { ...base, ...(override || {}) };
  out.storage = { ...(base.storage || {}), ...((override || {}).storage || {}) };
  out.externalAnchor = { ...(base.externalAnchor || {}), ...((override || {}).externalAnchor || {}) };
  return out;
}

function normalizeTargetKey(value) {
  return String(value || "default").replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function sentinelPrivatePath(projectRoot, targetName) {
  const safe = normalizeTargetKey(targetName);
  return path.join(projectRoot, "seal-config", ".private", "targets", `${safe}.json5`);
}

function writePrivateJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  const json = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, json, { mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // best-effort; file may already have stricter perms
  }
}

function getOrCreateNamespaceId(projectRoot, targetName) {
  const file = sentinelPrivatePath(projectRoot, targetName);
  if (fileExists(file)) {
    try {
      const data = readJson5(file);
      if (data && typeof data.namespaceId === "string") {
        parseNamespaceId(data.namespaceId);
        return data.namespaceId.toLowerCase();
      }
    } catch {
      // ignore and regenerate
    }
  }
  const ns = crypto.randomBytes(16).toString("hex");
  writePrivateJson(file, { namespaceId: ns });
  return ns;
}

function normalizeExitCode(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 255) {
    throw new Error(`Invalid exitCodeBlock: ${value} (expected 1..255)`);
  }
  return Math.trunc(n);
}

function normalizeLevel(value) {
  if (value === undefined || value === null || value === "" || value === "auto") return "auto";
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 4) {
    throw new Error(`Invalid sentinel level: ${value}`);
  }
  return Math.trunc(n);
}

function normalizeCpuIdSource(value) {
  if (value === undefined || value === null || value === "" || value === "auto") return "both";
  const v = String(value).trim().toLowerCase();
  if (["off", "none", "proc", "asm", "both"].includes(v)) {
    return v === "none" ? "off" : v;
  }
  throw new Error(`Invalid sentinel cpuIdSource: ${value}`);
}

function isRidStable(rid, fstype) {
  if (!rid) return false;
  if (fstype === "overlay" || fstype === "tmpfs" || fstype === "ramfs") return false;
  return rid.startsWith("uuid:") || rid.startsWith("partuuid:");
}

function resolveAutoLevel(hostInfo) {
  if (!hostInfo) throw new Error("Missing host info for auto level");
  return isRidStable(hostInfo.rid, hostInfo.fstype) ? 2 : 1;
}

function resolveSentinelConfig({ projectRoot, projectCfg, targetCfg, targetName, packagerSpec }) {
  const projSentinel = (projectCfg && projectCfg.build && projectCfg.build.sentinel) ? projectCfg.build.sentinel : {};
  const targetSentinel = targetCfg && (targetCfg.sentinel || (targetCfg.build && targetCfg.build.sentinel)) ? (targetCfg.sentinel || targetCfg.build.sentinel) : {};
  const merged = mergeSentinelConfig(DEFAULT_SENTINEL, projSentinel);
  const cfg = mergeSentinelConfig(merged, targetSentinel);

  const enabledRaw = cfg.enabled;
  const isThin = packagerSpec && packagerSpec.kind === "thin";
  const isSsh = (targetCfg && String(targetCfg.kind || "local").toLowerCase() === "ssh");
  const enabled = (enabledRaw === undefined || enabledRaw === null || enabledRaw === "auto")
    ? (isThin && isSsh)
    : !!enabledRaw;

  if (!enabled) return { enabled: false };
  if (packagerSpec && packagerSpec.kind !== "thin") {
    throw new Error("Sentinel requires thin packager");
  }

  const appIdRaw = (cfg.appId === undefined || cfg.appId === null || cfg.appId === "auto")
    ? (targetCfg.serviceName || projectCfg.appName || targetName)
    : cfg.appId;
  const appId = normalizeAppId(appIdRaw);

  const nsHex = (cfg.namespaceId === undefined || cfg.namespaceId === null || cfg.namespaceId === "auto")
    ? getOrCreateNamespaceId(projectRoot, targetName)
    : String(cfg.namespaceId || "").toLowerCase();
  parseNamespaceId(nsHex);

  const storage = cfg.storage || {};
  const baseDir = String(storage.baseDir || "/var/lib");
  if (!path.isAbsolute(baseDir) || /\s/.test(baseDir)) {
    throw new Error(`Invalid sentinel storage.baseDir: ${baseDir}`);
  }
  const mode = String(storage.mode || "file").toLowerCase();
  if (mode !== "file") {
    throw new Error(`Sentinel storage.mode not supported in MVP: ${mode}`);
  }

  const externalAnchor = cfg.externalAnchor || { type: "none" };
  const anchorType = String(externalAnchor.type || "none").toLowerCase();
  if (anchorType !== "none") {
    throw new Error(`Sentinel externalAnchor not supported in MVP: ${anchorType}`);
  }

  const level = normalizeLevel(cfg.level);
  const cpuIdSource = normalizeCpuIdSource(cfg.cpuIdSource);
  const exitCodeBlock = normalizeExitCode(cfg.exitCodeBlock ?? DEFAULT_SENTINEL.exitCodeBlock);

  const anchor = buildAnchor(nsHex, appId);
  const opaqueDir = deriveOpaqueDir(nsHex);
  const opaqueFile = deriveOpaqueFile(nsHex, appId);
  const sentinelPath = path.join(baseDir, opaqueDir, opaqueFile);

  return {
    enabled: true,
    appId,
    namespaceId: nsHex,
    storage: { baseDir, mode },
    level,
    cpuIdSource,
    exitCodeBlock,
    externalAnchor: { type: anchorType },
    anchor,
    opaqueDir,
    opaqueFile,
    sentinelPath,
  };
}

function buildFingerprintHash(level, hostInfo, flags) {
  const includePuid = !!(flags && flags.includePuid);
  const includeCpuId = !!(flags && flags.includeCpuId);
  const fpString = buildFingerprintString(level, {
    mid: hostInfo.mid,
    rid: hostInfo.rid,
    puid: hostInfo.puid,
    eah: hostInfo.eah,
    cpuid: hostInfo.cpuid,
    includePuid,
    includeCpuId,
  });
  return sha256(Buffer.from(fpString, "utf8"));
}

module.exports = {
  DEFAULT_SENTINEL,
  resolveSentinelConfig,
  resolveAutoLevel,
  isRidStable,
  sentinelPrivatePath,
  getOrCreateNamespaceId,
  normalizeExitCode,
  normalizeLevel,
  normalizeCpuIdSource,
  buildFingerprintHash,
};
