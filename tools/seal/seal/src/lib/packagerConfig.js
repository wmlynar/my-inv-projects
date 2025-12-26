"use strict";

function normalizeThinMode(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v === "single") return "aio";
  if (v === "split") return "bootstrap";
  return null;
}

function normalizeThinEnvMode(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v === "allowlist") return "allowlist";
  if (v === "denylist") return "denylist";
  return null;
}

function normalizeThinRuntimeStore(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v === "memfd") return "memfd";
  if (v === "tmpfile") return "tmpfile";
  return null;
}

function normalizeThinIntegrity(raw) {
  if (raw === undefined || raw === null) return { enabled: false };
  if (typeof raw === "boolean") return { enabled: raw };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid thin.integrity: expected object or boolean`);
  }
  return { enabled: raw.enabled === true };
}

function normalizeThinAppBind(raw) {
  if (raw === undefined || raw === null) return { enabled: true, value: null };
  if (typeof raw === "boolean") return { enabled: raw, value: null };
  if (typeof raw === "string") return { enabled: true, value: raw };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid thin.appBind: expected object/boolean/string`);
  }
  const enabled = raw.enabled !== undefined ? !!raw.enabled : true;
  const value = raw.value !== undefined && raw.value !== null ? String(raw.value) : null;
  return { enabled, value };
}

function normalizeThinSnapshotGuard(raw) {
  if (raw === undefined || raw === null) return { enabled: false };
  if (typeof raw === "boolean") return { enabled: raw };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid thin.snapshotGuard: expected object or boolean`);
  }
  const enabled = raw.enabled === true;
  const intervalMs = raw.intervalMs !== undefined ? Number(raw.intervalMs) : 1000;
  const maxJumpMs = raw.maxJumpMs !== undefined ? Number(raw.maxJumpMs) : 60_000;
  const maxBackMs = raw.maxBackMs !== undefined ? Number(raw.maxBackMs) : 100;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error(`Invalid thin.snapshotGuard.intervalMs: ${raw.intervalMs}`);
  }
  if (!Number.isFinite(maxJumpMs) || maxJumpMs < 0) {
    throw new Error(`Invalid thin.snapshotGuard.maxJumpMs: ${raw.maxJumpMs}`);
  }
  if (!Number.isFinite(maxBackMs) || maxBackMs < 0) {
    throw new Error(`Invalid thin.snapshotGuard.maxBackMs: ${raw.maxBackMs}`);
  }
  return {
    enabled,
    intervalMs: Math.floor(intervalMs),
    maxJumpMs: Math.floor(maxJumpMs),
    maxBackMs: Math.floor(maxBackMs),
  };
}

function normalizeThinLauncherHardening(raw) {
  if (raw === undefined || raw === null) return true;
  if (typeof raw !== "boolean") {
    throw new Error(`Invalid thin.launcherHardening: ${raw} (expected boolean)`);
  }
  return raw;
}

function normalizeThinLauncherObfuscation(raw) {
  if (raw === undefined || raw === null) return true;
  if (typeof raw !== "boolean") {
    throw new Error(`Invalid thin.launcherObfuscation: ${raw} (expected boolean)`);
  }
  return raw;
}

function normalizeThinAntiDebug(raw) {
  if (raw === undefined || raw === null) {
    return {
      enabled: true,
      tracerPid: true,
      denyEnv: true,
      mapsDenylist: [],
    };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid thin.antiDebug: expected object`);
  }
  const enabled = raw.enabled !== undefined ? !!raw.enabled : true;
  const tracerPid = raw.tracerPid !== undefined ? !!raw.tracerPid : true;
  const denyEnv = raw.denyEnv !== undefined ? !!raw.denyEnv : true;
  let tracerPidIntervalMs = raw.tracerPidIntervalMs;
  if (tracerPidIntervalMs === undefined || tracerPidIntervalMs === null) {
    tracerPidIntervalMs = 10_000;
  }
  if (!Number.isFinite(Number(tracerPidIntervalMs))) {
    throw new Error(`Invalid thin.antiDebug.tracerPidIntervalMs: ${tracerPidIntervalMs}`);
  }
  tracerPidIntervalMs = Math.floor(Number(tracerPidIntervalMs));
  if (tracerPidIntervalMs < 0) {
    throw new Error(`Invalid thin.antiDebug.tracerPidIntervalMs: ${tracerPidIntervalMs}`);
  }
  const tracerPidThreads =
    raw.tracerPidThreads !== undefined ? !!raw.tracerPidThreads : true;
  let mapsDenylist = [];
  if (raw.mapsDenylist !== undefined) {
    if (!Array.isArray(raw.mapsDenylist)) {
      throw new Error(`Invalid thin.antiDebug.mapsDenylist: expected array of strings`);
    }
    mapsDenylist = raw.mapsDenylist.map((v) => String(v || "").trim()).filter(Boolean);
    for (const item of mapsDenylist) {
      if (/[^\x20-\x7E]/.test(item)) {
        throw new Error(`Invalid thin.antiDebug.mapsDenylist entry (non-ASCII): ${item}`);
      }
      if (item.length > 64) {
        throw new Error(`Invalid thin.antiDebug.mapsDenylist entry (too long): ${item}`);
      }
    }
  }
  if (mapsDenylist.length > 32) {
    throw new Error("thin.antiDebug.mapsDenylist too long (max 32)");
  }
  let tracerPidThreadsFinal = tracerPidThreads;
  if (!enabled || !tracerPid) {
    tracerPidIntervalMs = 0;
    tracerPidThreadsFinal = false;
  }
  return { enabled, tracerPid, denyEnv, mapsDenylist, tracerPidIntervalMs, tracerPidThreads: tracerPidThreadsFinal };
}

function resolveThinConfig(targetCfg, projectCfg) {
  const tThin = targetCfg && typeof targetCfg.thin === "object" ? targetCfg.thin : {};
  const pThin = projectCfg?.build && typeof projectCfg.build.thin === "object" ? projectCfg.build.thin : {};

  const legacyThinKeys = [
    "thinMode",
    "thinVariant",
    "thinPackager",
    "thinLevel",
    "thinChunkSize",
    "thinZstdLevel",
    "thinZstdTimeoutMs",
    "thinEnvMode",
    "thinRuntimeStore",
  ];
  for (const key of legacyThinKeys) {
    if (targetCfg && targetCfg[key] !== undefined) {
      throw new Error(`Unsupported target config "${key}". Use target.thin.* instead.`);
    }
    if (projectCfg?.build && projectCfg.build[key] !== undefined) {
      throw new Error(`Unsupported build config "${key}". Use build.thin.* instead.`);
    }
  }

  const modeRaw = tThin.mode ?? pThin.mode;
  const normMode = normalizeThinMode(modeRaw);
  if (modeRaw !== undefined && modeRaw !== null && normMode === null) {
    throw new Error(`Invalid thin.mode: ${modeRaw} (expected: split|single)`);
  }
  const mode = normMode || "bootstrap";

  const levelRaw =
    tThin.level ??
    pThin.level ??
    "low";
  const level = String(levelRaw).toLowerCase();

  const chunkSizeBytes =
    tThin.chunkSizeBytes ??
    pThin.chunkSizeBytes ??
    null;

  const zstdLevel =
    tThin.zstdLevel ??
    pThin.zstdLevel ??
    null;

  const zstdTimeoutMs =
    tThin.zstdTimeoutMs ??
    pThin.zstdTimeoutMs ??
    null;

  const envModeRaw =
    tThin.envMode ??
    pThin.envMode ??
    null;
  const envMode = normalizeThinEnvMode(envModeRaw);
  if (envModeRaw !== undefined && envModeRaw !== null && envMode === null) {
    throw new Error(`Invalid thin.envMode: ${envModeRaw} (expected: allowlist|denylist)`);
  }

  const runtimeStoreRaw =
    tThin.runtimeStore ??
    pThin.runtimeStore ??
    null;
  const runtimeStore = normalizeThinRuntimeStore(runtimeStoreRaw);
  if (runtimeStoreRaw !== undefined && runtimeStoreRaw !== null && runtimeStore === null) {
    throw new Error(`Invalid thin.runtimeStore: ${runtimeStoreRaw} (expected: memfd|tmpfile)`);
  }

  const antiDebugRaw =
    tThin.antiDebug ??
    pThin.antiDebug ??
    null;
  const antiDebug = normalizeThinAntiDebug(antiDebugRaw);

  const integrityRaw =
    tThin.integrity ??
    pThin.integrity ??
    null;
  const integrity = normalizeThinIntegrity(integrityRaw);

  const appBindRaw =
    tThin.appBind ??
    pThin.appBind ??
    null;
  const appBind = normalizeThinAppBind(appBindRaw);

  const snapshotRaw =
    tThin.snapshotGuard ??
    pThin.snapshotGuard ??
    null;
  const snapshotGuard = normalizeThinSnapshotGuard(snapshotRaw);

  const launcherHardeningRaw =
    tThin.launcherHardening ??
    pThin.launcherHardening ??
    null;
  const launcherHardening = normalizeThinLauncherHardening(launcherHardeningRaw);

  const launcherObfRaw =
    tThin.launcherObfuscation ??
    pThin.launcherObfuscation ??
    null;
  const launcherObfuscation = normalizeThinLauncherObfuscation(launcherObfRaw);

  return {
    mode,
    level,
    chunkSizeBytes,
    zstdLevel,
    zstdTimeoutMs,
    envMode,
    runtimeStore,
    antiDebug,
    integrity,
    appBind,
    snapshotGuard,
    launcherHardening,
    launcherObfuscation,
  };
}

function normalizePackager(rawPackager) {
  const name = String(rawPackager || "auto").toLowerCase();
  if (name === "thin-split") {
    return { kind: "thin", label: "thin-split", thinMode: "bootstrap" };
  }
  if (name === "thin-single") {
    return { kind: "thin", label: "thin-single", thinMode: "aio" };
  }

  if (name === "bundle") {
    return { kind: "bundle", label: "bundle" };
  }
  if (name === "sea") return { kind: "sea", label: "sea" };
  if (name === "none") return { kind: "none", label: "none" };
  if (name === "auto") return { kind: "thin", label: "thin-split", thinMode: "bootstrap", auto: true };

  return { kind: "unknown", label: name };
}

function resolveBundleFallback(targetCfg, projectCfg) {
  if (targetCfg?.bundleFallback !== undefined || targetCfg?.allowFallback !== undefined) {
    throw new Error("Unsupported target config bundleFallback/allowFallback. Use target.packagerFallback.");
  }
  if (projectCfg?.build?.bundleFallback !== undefined || projectCfg?.build?.allowFallback !== undefined) {
    throw new Error("Unsupported build config bundleFallback/allowFallback. Use build.packagerFallback.");
  }
  const raw =
    targetCfg?.packagerFallback ??
    projectCfg?.build?.packagerFallback ??
    false;
  if (typeof raw !== "boolean") {
    throw new Error(`Invalid packagerFallback: ${raw} (expected boolean)`);
  }
  return raw;
}

function resolveProtectionConfig(projectCfg) {
  const build = projectCfg?.build || {};
  if (build.hardening !== undefined || build.artifactProtection !== undefined) {
    throw new Error("Unsupported build.hardening/artifactProtection. Use build.protection.");
  }
  const raw = build.protection ?? {};

  if (raw === false) return { enabled: false };

  const enabled = !(typeof raw === "object" && raw && raw.enabled === false);
  const cfg = (typeof raw === "object" && raw) ? raw : {};

  const structuredFields = ["seaMain", "bundle", "strip", "elfPacker", "cObfuscator", "strings"];
  for (const key of structuredFields) {
    if (cfg[key] !== undefined && (cfg[key] === null || typeof cfg[key] !== "object" || Array.isArray(cfg[key]))) {
      throw new Error(`Invalid build.protection.${key}: expected object`);
    }
  }
  if (cfg.upx !== undefined) {
    throw new Error("Unsupported build.protection.upx. Use build.protection.elfPacker.tool=\"upx\" instead.");
  }

  const legacyProtectionKeys = [
    "packSeaMain",
    "packSeaMainMethod",
    "packSeaMainChunkSize",
    "packBundle",
    "stripSymbols",
    "stripTool",
    "stripArgs",
    "upxPack",
    "elfPackerCmd",
    "elfPackerArgs",
    "stringObfuscation",
    "sourceStringObfuscation",
    "sourceObfuscation",
    "cObfuscatorCmd",
    "cObfuscatorArgs",
    "cObfuscatorMode",
    "codeObfuscator",
    "obfuscatorC",
  ];
  for (const key of legacyProtectionKeys) {
    if (cfg[key] !== undefined) {
      throw new Error(`Unsupported build.protection.${key}. Use structured protection.* sections.`);
    }
  }
  if (typeof cfg.cObfuscator === "string") {
    throw new Error("Unsupported build.protection.cObfuscator string. Use cObfuscator.tool/cmd/args.");
  }
  if (typeof cfg.elfPacker === "string") {
    throw new Error("Unsupported build.protection.elfPacker string. Use elfPacker.tool/cmd/args.");
  }

  const stringsCfg = cfg.strings || {};
  const stringObfuscationRaw = stringsCfg.obfuscation ?? null;
  const stringObfuscation = normalizeStringObfuscation(stringObfuscationRaw);
  if (stringObfuscationRaw !== null && stringObfuscation === null) {
    throw new Error(`Invalid protection.strings.obfuscation: ${stringObfuscationRaw}`);
  }

  const cObfCfg = (cfg.cObfuscator && typeof cfg.cObfuscator === "object") ? cfg.cObfuscator : null;
  const cObfuscatorRaw = (cObfCfg && cObfCfg.tool) ?? null;
  const cObfuscator = normalizeCObfuscator(cObfuscatorRaw);
  if (cObfuscatorRaw !== null && cObfuscator === null) {
    throw new Error(`Invalid protection.cObfuscator.tool: ${cObfuscatorRaw}`);
  }
  const cObfuscatorCmd = (cObfCfg && cObfCfg.cmd) ?? null;
  const cObfuscatorArgs = normalizeArgList((cObfCfg && cObfCfg.args) ?? null);

  const seaMainCfg = (cfg.seaMain && typeof cfg.seaMain === "object")
    ? cfg.seaMain
    : {};
  const bundleCfg = (cfg.bundle && typeof cfg.bundle === "object") ? cfg.bundle : {};
  const stripCfg = (cfg.strip && typeof cfg.strip === "object") ? cfg.strip : {};
  const elfCfg = (cfg.elfPacker && typeof cfg.elfPacker === "object")
    ? cfg.elfPacker
    : {};

  return {
    enabled,
    packSeaMain: seaMainCfg.pack !== undefined ? !!seaMainCfg.pack : true,
    packSeaMainMethod: seaMainCfg.method ?? "brotli",
    packSeaMainChunkSize: seaMainCfg.chunkSize ?? 8000,
    packBundle: bundleCfg.pack !== undefined ? !!bundleCfg.pack : true,
    stripSymbols: stripCfg.enabled !== undefined ? !!stripCfg.enabled : false,
    stripTool: stripCfg.cmd ?? "strip",
    stripArgs: stripCfg.args ?? null,
    elfPacker: elfCfg.tool ?? null,
    elfPackerCmd: elfCfg.cmd ?? null,
    elfPackerArgs: normalizeArgList(elfCfg.args ?? null),
    cObfuscator,
    cObfuscatorCmd,
    cObfuscatorArgs,
    stringObfuscation,
    raw,
  };
}

function normalizeStringObfuscation(raw) {
  if (!raw) return null;
  const values = Array.isArray(raw) ? raw : [raw];
  const allowed = new Set(["xorstr", "crystr", "obfuscate"]);
  const out = values
    .map((v) => String(v || "").trim().toLowerCase())
    .filter((v) => allowed.has(v));
  return out.length ? out : null;
}

function normalizeCObfuscator(raw) {
  if (!raw) return null;
  const v = String(raw).trim().toLowerCase();
  if (v === "obfuscator-llvm") {
    return "obfuscator-llvm";
  }
  if (v === "hikari") return "hikari";
  return null;
}

function normalizeArgList(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map((v) => String(v));
  if (typeof raw === "string") {
    return raw.split(/\s+/).map((v) => v.trim()).filter(Boolean);
  }
  return null;
}

module.exports = {
  normalizeThinMode,
  normalizeThinEnvMode,
  normalizeThinRuntimeStore,
  resolveThinConfig,
  normalizePackager,
  resolveBundleFallback,
  resolveProtectionConfig,
  normalizeStringObfuscation,
  normalizeCObfuscator,
  normalizeArgList,
};
