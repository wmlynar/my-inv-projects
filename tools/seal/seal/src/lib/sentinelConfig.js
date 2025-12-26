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
  checkIntervalMs: 60000,
  timeLimit: { mode: "off" },
  externalAnchor: { type: "none" },
};

function mergeSentinelConfig(base, override) {
  const out = { ...base, ...(override || {}) };
  out.storage = { ...(base.storage || {}), ...((override || {}).storage || {}) };
  out.timeLimit = { ...(base.timeLimit || {}), ...((override || {}).timeLimit || {}) };
  out.externalAnchor = { ...(base.externalAnchor || {}), ...((override || {}).externalAnchor || {}) };
  return out;
}

function normalizeTargetKey(value) {
  return String(value || "default").replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function sentinelPrivatePath(projectRoot, targetName) {
  const safe = normalizeTargetKey(targetName);
  return path.join(projectRoot, "seal-out", "cache", "private", "targets", `${safe}.json5`);
}

function sentinelLegacyPrivatePath(projectRoot, targetName) {
  const safe = normalizeTargetKey(targetName);
  return path.join(projectRoot, "seal-config", ".private", "targets", `${safe}.json5`);
}

function cleanupLegacyPrivatePath(filePath) {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {}
  try {
    fs.rmdirSync(path.dirname(filePath));
  } catch {}
  try {
    fs.rmdirSync(path.dirname(path.dirname(filePath)));
  } catch {}
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
  const legacy = sentinelLegacyPrivatePath(projectRoot, targetName);
  if (fileExists(legacy)) {
    try {
      const data = readJson5(legacy);
      if (data && typeof data.namespaceId === "string") {
        parseNamespaceId(data.namespaceId);
        writePrivateJson(file, { namespaceId: data.namespaceId.toLowerCase() });
        cleanupLegacyPrivatePath(legacy);
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

function normalizeCheckIntervalMs(value, fallback) {
  const raw = value === undefined || value === null || value === "" ? fallback : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid sentinel checkIntervalMs: ${value}`);
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

function parseExpiresAtSec(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid sentinel timeLimit.expiresAt: ${value}`);
    }
    const sec = value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
    return sec;
  }
  const text = String(value).trim();
  if (!text) return null;
  const num = Number(text);
  if (Number.isFinite(num) && num > 0) {
    const sec = num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
    return sec;
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid sentinel timeLimit.expiresAt: ${value}`);
  }
  return Math.floor(parsed / 1000);
}

function parseDurationSec(value, unitLabel) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid sentinel timeLimit.${unitLabel}: ${value}`);
  }
  return n;
}

function normalizeTimeLimit(value) {
  const cfg = value && typeof value === "object" ? value : {};
  const expiresAtSec = parseExpiresAtSec(cfg.expiresAt);
  const validForMs = parseDurationSec(cfg.validForMs, "validForMs");
  const validForSeconds = parseDurationSec(cfg.validForSeconds, "validForSeconds");
  const validForDays = parseDurationSec(cfg.validForDays, "validForDays");

  const durationFields = [validForMs, validForSeconds, validForDays].filter((v) => v !== null);
  if (expiresAtSec !== null && durationFields.length > 0) {
    throw new Error("sentinel timeLimit: choose expiresAt or validFor*, not both");
  }
  if (durationFields.length > 1) {
    throw new Error("sentinel timeLimit: only one of validForMs/validForSeconds/validForDays may be set");
  }
  if (expiresAtSec !== null) {
    return { mode: "absolute", expiresAtSec, durationSec: null };
  }
  if (durationFields.length > 0) {
    let durationSec = 0;
    if (validForMs !== null) {
      durationSec = Math.ceil(validForMs / 1000);
    } else if (validForSeconds !== null) {
      durationSec = Math.ceil(validForSeconds);
    } else {
      durationSec = Math.ceil(validForDays * 86400);
    }
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      throw new Error("Invalid sentinel timeLimit duration");
    }
    return { mode: "relative", expiresAtSec: null, durationSec };
  }
  return { mode: "off", expiresAtSec: null, durationSec: null };
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
  const checkIntervalMs = normalizeCheckIntervalMs(cfg.checkIntervalMs, DEFAULT_SENTINEL.checkIntervalMs);
  const timeLimit = normalizeTimeLimit(cfg.timeLimit);

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
    checkIntervalMs,
    timeLimit,
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
  normalizeCheckIntervalMs,
  normalizeLevel,
  normalizeCpuIdSource,
  normalizeTimeLimit,
  buildFingerprintHash,
};
