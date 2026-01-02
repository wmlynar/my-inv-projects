"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { ensureDir, fileExists } = require("./fsextra");
const { readJson5, writeJson5 } = require("./json5io");
const { packagerSupportsSentinel } = require("./packagerConfig");
const { normalizeAppId, parseNamespaceId, buildAnchor, deriveOpaqueDir, deriveOpaqueFile, buildFingerprintString, sha256 } = require("./sentinelCore");

const DEFAULT_SENTINEL = {
  enabled: "auto",
  level: "auto",
  appId: "auto",
  namespaceId: "auto",
  cpuIdSource: "auto",
  l4IncludePuid: true,
  storage: { baseDir: "/var/lib", mode: "file" },
  exitCodeBlock: 200,
  checkIntervalMs: 60000,
  timeLimit: { mode: "off", enforce: "always" },
  externalAnchor: { type: "none" },
};

const SENTINEL_PROFILES = {
  off: { enabled: false },
  auto: { enabled: "auto" },
  required: { enabled: true },
  strict: { enabled: true, level: 2 },
};

function mergeSentinelConfig(base, override) {
  const out = { ...base, ...(override || {}) };
  out.storage = { ...(base.storage || {}), ...((override || {}).storage || {}) };
  out.timeLimit = { ...(base.timeLimit || {}), ...((override || {}).timeLimit || {}) };
  out.externalAnchor = { ...(base.externalAnchor || {}), ...((override || {}).externalAnchor || {}) };
  return out;
}

function normalizeSentinelProfile(raw) {
  if (raw === undefined || raw === null) return null;
  const input = String(raw).trim().toLowerCase();
  if (!input) return null;
  return Object.prototype.hasOwnProperty.call(SENTINEL_PROFILES, input) ? input : null;
}

function splitSentinelSection(raw, label) {
  if (raw === undefined || raw === null) return { cfg: {}, profile: undefined };
  if (typeof raw === "boolean") return { cfg: { enabled: raw }, profile: undefined };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid ${label}: expected object or boolean`);
  }
  const cfg = { ...raw };
  const profile = Object.prototype.hasOwnProperty.call(cfg, "profile") ? cfg.profile : undefined;
  if (Object.prototype.hasOwnProperty.call(cfg, "profile")) {
    delete cfg.profile;
  }
  return { cfg, profile };
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

function normalizeUsbId(raw, label) {
  const value = String(raw || "").trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{4}$/.test(value)) {
    throw new Error(`Invalid sentinel externalAnchor.usb.${label}: ${raw} (expected 4 hex chars)`);
  }
  return value;
}

function normalizeExternalAnchor(raw) {
  const cfg = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const type = String(cfg.type || "none").trim().toLowerCase();
  if (type === "none") return { type: "none" };
  if (type === "usb") {
    const usb = cfg.usb && typeof cfg.usb === "object" && !Array.isArray(cfg.usb) ? cfg.usb : {};
    const vid = normalizeUsbId(usb.vid, "vid");
    const pid = normalizeUsbId(usb.pid, "pid");
    const serialRaw = usb.serial !== undefined && usb.serial !== null ? String(usb.serial) : "";
    const serial = serialRaw.trim();
    if (serial && /[^\x20-\x7E]/.test(serial)) {
      throw new Error(`Invalid sentinel externalAnchor.usb.serial: ${usb.serial} (non-ASCII)`);
    }
    return { type: "usb", usb: { vid, pid, serial } };
  }
  if (type === "file") {
    const file = cfg.file && typeof cfg.file === "object" && !Array.isArray(cfg.file) ? cfg.file : {};
    const pathRaw = file.path !== undefined && file.path !== null ? String(file.path) : "";
    const filePath = pathRaw.trim();
    if (!filePath) throw new Error("Invalid sentinel externalAnchor.file.path: empty");
    if (!path.isAbsolute(filePath) || /\s/.test(filePath)) {
      throw new Error(`Invalid sentinel externalAnchor.file.path: ${filePath}`);
    }
    return { type: "file", file: { path: filePath } };
  }
  if (type === "lease") {
    const lease = cfg.lease && typeof cfg.lease === "object" && !Array.isArray(cfg.lease) ? cfg.lease : {};
    const urlRaw = lease.url !== undefined && lease.url !== null ? String(lease.url) : "";
    const url = urlRaw.trim();
    if (!url) throw new Error("Invalid sentinel externalAnchor.lease.url: empty");
    if (/\s/.test(url)) {
      throw new Error(`Invalid sentinel externalAnchor.lease.url: ${url}`);
    }
    const timeoutMsRaw = lease.timeoutMs !== undefined && lease.timeoutMs !== null ? Number(lease.timeoutMs) : 1500;
    if (!Number.isFinite(timeoutMsRaw) || timeoutMsRaw <= 0) {
      throw new Error(`Invalid sentinel externalAnchor.lease.timeoutMs: ${lease.timeoutMs}`);
    }
    const maxBytesRaw = lease.maxBytes !== undefined && lease.maxBytes !== null ? Number(lease.maxBytes) : 4096;
    if (!Number.isFinite(maxBytesRaw) || maxBytesRaw <= 0) {
      throw new Error(`Invalid sentinel externalAnchor.lease.maxBytes: ${lease.maxBytes}`);
    }
    return { type: "lease", lease: { url, timeoutMs: Math.trunc(timeoutMsRaw), maxBytes: Math.trunc(maxBytesRaw) } };
  }
  if (type === "tpm2") {
    const tpm2 = cfg.tpm2 && typeof cfg.tpm2 === "object" && !Array.isArray(cfg.tpm2) ? cfg.tpm2 : {};
    const bankRaw = tpm2.bank !== undefined && tpm2.bank !== null ? String(tpm2.bank) : "sha256";
    const bank = bankRaw.trim().toLowerCase();
    if (!["sha1", "sha256", "sha384", "sha512"].includes(bank)) {
      throw new Error(`Invalid sentinel externalAnchor.tpm2.bank: ${tpm2.bank} (expected sha1|sha256|sha384|sha512)`);
    }
    const pcrsRaw = tpm2.pcrs !== undefined && tpm2.pcrs !== null ? tpm2.pcrs : [0, 2, 4, 7];
    const pcrs = Array.isArray(pcrsRaw) ? pcrsRaw : String(pcrsRaw).split(/[, ]+/);
    const parsed = [];
    for (const entry of pcrs) {
      if (entry === "" || entry === null || entry === undefined) continue;
      const n = Number(entry);
      if (!Number.isFinite(n) || n < 0 || n > 23) {
        throw new Error(`Invalid sentinel externalAnchor.tpm2.pcrs: ${entry} (expected 0..23)`);
      }
      parsed.push(Math.trunc(n));
    }
    if (!parsed.length) {
      throw new Error("Invalid sentinel externalAnchor.tpm2.pcrs: empty");
    }
    const unique = Array.from(new Set(parsed)).sort((a, b) => a - b);
    return { type: "tpm2", tpm2: { bank, pcrs: unique } };
  }
  throw new Error(`Invalid sentinel externalAnchor.type: ${cfg.type} (expected: none|usb|file|lease|tpm2)`);
}

function isRidStable(rid, fstype) {
  if (!rid) return false;
  if (fstype === "overlay" || fstype === "tmpfs" || fstype === "ramfs") return false;
  return rid.startsWith("uuid:") || rid.startsWith("partuuid:");
}

function resolveAutoLevel(hostInfo) {
  if (!hostInfo) throw new Error("Missing host info for auto level");
  const stableRid = isRidStable(hostInfo.rid, hostInfo.fstype);
  if (stableRid && hostInfo.puid) return 3;
  return stableRid ? 2 : 1;
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
  const enforceRaw = cfg.enforce;
  const enforce = enforceRaw === undefined || enforceRaw === null || enforceRaw === ""
    ? "always"
    : String(enforceRaw).trim().toLowerCase();
  if (enforce !== "always" && enforce !== "mismatch") {
    throw new Error(`Invalid sentinel timeLimit.enforce: ${enforceRaw}`);
  }
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
    return { mode: "absolute", expiresAtSec, durationSec: null, enforce };
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
    return { mode: "relative", expiresAtSec: null, durationSec, enforce };
  }
  return { mode: "off", expiresAtSec: null, durationSec: null, enforce };
}

function resolveSentinelConfig({ projectRoot, projectCfg, targetCfg, targetName, packagerSpec }) {
  const projHasSentinel = !!(projectCfg && projectCfg.build && Object.prototype.hasOwnProperty.call(projectCfg.build, "sentinel"));
  const projRaw = projHasSentinel ? projectCfg.build.sentinel : undefined;
  const targetRaw = targetCfg
    ? (Object.prototype.hasOwnProperty.call(targetCfg, "sentinel")
        ? targetCfg.sentinel
        : (targetCfg.build && Object.prototype.hasOwnProperty.call(targetCfg.build, "sentinel") ? targetCfg.build.sentinel : undefined))
    : undefined;
  const { cfg: projSentinel, profile: projProfile } = splitSentinelSection(projRaw, "build.sentinel");
  const { cfg: targetSentinel, profile: targetProfile } = splitSentinelSection(targetRaw, "target.sentinel/build.sentinel");

  const profileRaw = targetProfile !== undefined ? targetProfile : projProfile;
  const profileName = normalizeSentinelProfile(profileRaw);
  if (profileRaw !== undefined && profileRaw !== null && profileName === null) {
    throw new Error(`Invalid sentinel profile: ${profileRaw} (expected: off|auto|required|strict)`);
  }
  const profileDefaults = profileName ? SENTINEL_PROFILES[profileName] : {};

  const merged = mergeSentinelConfig(DEFAULT_SENTINEL, profileDefaults);
  const mergedProject = mergeSentinelConfig(merged, projSentinel);
  const cfg = mergeSentinelConfig(mergedProject, targetSentinel);

  const enabledRaw = cfg.enabled;
  const supportsSentinel = !!(packagerSpec && packagerSupportsSentinel(packagerSpec.label));
  const isSsh = (targetCfg && String(targetCfg.kind || "local").toLowerCase() === "ssh");
  const enabledAuto = enabledRaw === undefined || enabledRaw === null || enabledRaw === "auto";
  const enabled = enabledAuto
    ? (supportsSentinel && isSsh)
    : !!enabledRaw;
  const sentinelConfigured = projHasSentinel || targetRaw !== undefined || profileRaw !== undefined;

  if (!enabled) {
    if (enabledAuto && sentinelConfigured && (!supportsSentinel || !isSsh)) {
      const label = packagerSpec ? (packagerSpec.label === "sea" ? "SEA" : packagerSpec.label) : "unknown";
      const notes = [];
      if (!supportsSentinel) {
        notes.push(`Sentinel auto disabled: ${label} does not support sentinel (requires thin-split)`);
      }
      if (!isSsh) {
        notes.push("Sentinel auto disabled: target is not SSH");
      }
      return {
        enabled: false,
        profile: profileName || null,
        compat: {
          disabled: { auto: true, packager: !supportsSentinel, target: !isSsh },
          packager: packagerSpec ? packagerSpec.label : "unknown",
          notes,
        },
      };
    }
    return { enabled: false, profile: profileName || null };
  }
  if (!supportsSentinel) {
    const label = packagerSpec ? packagerSpec.label : "unknown";
    return {
      enabled: false,
      profile: profileName || null,
      compat: {
        disabled: { packager: true },
        packager: label,
        notes: [`${label === "sea" ? "SEA" : label} ignores sentinel (requires thin-split)`],
      },
    };
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

  const externalAnchor = normalizeExternalAnchor(cfg.externalAnchor);
  let level = normalizeLevel(cfg.level);
  const hasExternalAnchor = externalAnchor.type && externalAnchor.type !== "none";
  if (level === "auto" && hasExternalAnchor) {
    level = 4;
  }
  if (hasExternalAnchor && level !== 4) {
    throw new Error("sentinel externalAnchor requires level=4");
  }
  if (!hasExternalAnchor && level === 4) {
    throw new Error("sentinel level=4 requires externalAnchor");
  }
  const l4IncludePuidRaw = cfg.l4IncludePuid;
  if (l4IncludePuidRaw !== undefined && typeof l4IncludePuidRaw !== "boolean") {
    throw new Error(`Invalid sentinel l4IncludePuid: ${l4IncludePuidRaw} (expected boolean)`);
  }
  const l4IncludePuid = !!l4IncludePuidRaw;

  const cpuIdSource = normalizeCpuIdSource(cfg.cpuIdSource);
  const exitCodeBlock = normalizeExitCode(cfg.exitCodeBlock ?? DEFAULT_SENTINEL.exitCodeBlock);
  const checkIntervalMs = normalizeCheckIntervalMs(cfg.checkIntervalMs, DEFAULT_SENTINEL.checkIntervalMs);
  const timeLimit = normalizeTimeLimit(cfg.timeLimit);
  if (timeLimit.enforce === "mismatch" && timeLimit.mode === "off") {
    throw new Error("sentinel timeLimit.enforce=mismatch requires expiresAt or validFor*");
  }

  const anchor = buildAnchor(nsHex, appId);
  const opaqueDir = deriveOpaqueDir(nsHex);
  const opaqueFile = deriveOpaqueFile(nsHex, appId);
  const sentinelPath = path.join(baseDir, opaqueDir, opaqueFile);

  return {
    enabled: true,
    profile: profileName || null,
    appId,
    namespaceId: nsHex,
    storage: { baseDir, mode },
    level,
    cpuIdSource,
    exitCodeBlock,
    checkIntervalMs,
    timeLimit,
    externalAnchor,
    l4IncludePuid,
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
