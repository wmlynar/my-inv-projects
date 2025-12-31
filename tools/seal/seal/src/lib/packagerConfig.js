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

function normalizeThinRuntimeArgv0(raw) {
  if (raw === undefined || raw === null) return "n";
  if (typeof raw !== "string") {
    throw new Error(`Invalid thin.runtimeArgv0: ${raw} (expected string)`);
  }
  const val = raw.trim();
  if (!val) throw new Error("Invalid thin.runtimeArgv0: empty");
  if (val.length > 64) {
    throw new Error(`Invalid thin.runtimeArgv0: too long (${val.length} > 64)`);
  }
  if (/[^\x20-\x7E]/.test(val)) {
    throw new Error(`Invalid thin.runtimeArgv0: non-ASCII`);
  }
  return val;
}

function normalizeThinIntegrity(raw) {
  const defaults = { enabled: false, mode: "inline", file: "ih" };
  if (raw === undefined || raw === null) return { ...defaults };
  if (typeof raw === "boolean") return { ...defaults, enabled: raw };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid thin.integrity: expected object or boolean`);
  }
  const enabled = raw.enabled === true;
  const modeRaw = raw.mode !== undefined && raw.mode !== null ? String(raw.mode).toLowerCase() : "inline";
  const mode = (modeRaw === "sidecar" || modeRaw === "inline") ? modeRaw : null;
  if (!mode) throw new Error(`Invalid thin.integrity.mode: ${raw.mode} (expected: inline|sidecar)`);
  let file = raw.file !== undefined && raw.file !== null ? String(raw.file) : "ih";
  file = file.trim();
  if (!file) throw new Error("Invalid thin.integrity.file: empty");
  if (file.includes("/") || file.includes("\\")) {
    throw new Error(`Invalid thin.integrity.file: ${file} (slashes not allowed)`);
  }
  if (/[^\x20-\x7E]/.test(file)) {
    throw new Error(`Invalid thin.integrity.file: ${file} (non-ASCII)`);
  }
  if (file.length > 32) {
    throw new Error(`Invalid thin.integrity.file: too long (${file.length} > 32)`);
  }
  return { enabled, mode, file };
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

function normalizeThinNativeBootstrap(raw) {
  if (raw === undefined || raw === null) return { enabled: false, mode: "compile" };
  if (typeof raw === "boolean") return { enabled: raw, mode: "compile" };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid thin.nativeBootstrap: expected boolean or object");
  }
  const modeRaw = raw.mode !== undefined && raw.mode !== null ? String(raw.mode).trim().toLowerCase() : "";
  let mode = "compile";
  if (modeRaw) {
    if (modeRaw === "compile" || modeRaw === "native-compile" || modeRaw === "native") {
      mode = "compile";
    } else if (modeRaw === "string" || modeRaw === "external-string" || modeRaw === "legacy") {
      mode = "string";
    } else {
      throw new Error(`Invalid thin.nativeBootstrap.mode: ${raw.mode}`);
    }
  }
  return {
    enabled: raw.enabled !== undefined ? !!raw.enabled : true,
    mode,
  };
}

function normalizeThinLauncherHardening(raw) {
  if (raw === undefined || raw === null) return true;
  if (typeof raw !== "boolean") {
    throw new Error(`Invalid thin.launcherHardening: ${raw} (expected boolean)`);
  }
  return raw;
}

function normalizeThinLauncherHardeningCet(raw) {
  if (raw === undefined || raw === null) return true;
  if (typeof raw !== "boolean") {
    throw new Error(`Invalid thin.launcherHardeningCET: ${raw} (expected boolean)`);
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
      argvDeny: false,
      mapsDenylist: [],
      ptraceGuard: { enabled: true, dumpable: true },
      seccompNoDebug: { enabled: true, mode: "errno", aggressive: false },
      coreDump: true,
      loaderGuard: true,
    };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid thin.antiDebug: expected object`);
  }
  const enabled = raw.enabled !== undefined ? !!raw.enabled : true;
  const tracerPid = raw.tracerPid !== undefined ? !!raw.tracerPid : true;
  const denyEnv = raw.denyEnv !== undefined ? !!raw.denyEnv : true;
  let argvDeny = raw.argvDeny;
  if (argvDeny === undefined) argvDeny = false;
  if (typeof argvDeny !== "boolean") {
    throw new Error(`Invalid thin.antiDebug.argvDeny: ${raw.argvDeny} (expected boolean)`);
  }
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
  let ptraceGuard = { enabled: true, dumpable: true };
  if (raw.ptraceGuard !== undefined) {
    if (typeof raw.ptraceGuard === "boolean") {
      ptraceGuard = { enabled: raw.ptraceGuard, dumpable: raw.ptraceGuard };
    } else if (typeof raw.ptraceGuard === "object" && !Array.isArray(raw.ptraceGuard)) {
      ptraceGuard = {
        enabled: raw.ptraceGuard.enabled !== undefined ? !!raw.ptraceGuard.enabled : true,
        dumpable: raw.ptraceGuard.dumpable !== undefined ? !!raw.ptraceGuard.dumpable : true,
      };
    } else {
      throw new Error("Invalid thin.antiDebug.ptraceGuard: expected boolean or object");
    }
  }
  let seccompNoDebug = { enabled: true, mode: "errno", aggressive: false };
  if (raw.seccompNoDebug !== undefined) {
    if (typeof raw.seccompNoDebug === "boolean") {
      seccompNoDebug = { enabled: raw.seccompNoDebug, mode: "errno", aggressive: false };
    } else if (typeof raw.seccompNoDebug === "object" && !Array.isArray(raw.seccompNoDebug)) {
      const modeRaw = raw.seccompNoDebug.mode !== undefined
        ? String(raw.seccompNoDebug.mode).toLowerCase()
        : "errno";
      const mode = modeRaw === "kill" ? "kill" : "errno";
      if (raw.seccompNoDebug.aggressive !== undefined && typeof raw.seccompNoDebug.aggressive !== "boolean") {
        throw new Error(`Invalid thin.antiDebug.seccompNoDebug.aggressive: ${raw.seccompNoDebug.aggressive} (expected boolean)`);
      }
      const aggressive = raw.seccompNoDebug.aggressive === true;
      seccompNoDebug = {
        enabled: raw.seccompNoDebug.enabled !== undefined ? !!raw.seccompNoDebug.enabled : true,
        mode,
        aggressive,
      };
    } else {
      throw new Error("Invalid thin.antiDebug.seccompNoDebug: expected boolean or object");
    }
  }
  let coreDump = raw.coreDump;
  if (coreDump === undefined) coreDump = true;
  if (typeof coreDump !== "boolean") {
    throw new Error(`Invalid thin.antiDebug.coreDump: ${raw.coreDump} (expected boolean)`);
  }
  let loaderGuard = raw.loaderGuard;
  if (loaderGuard === undefined) loaderGuard = true;
  if (typeof loaderGuard !== "boolean") {
    throw new Error(`Invalid thin.antiDebug.loaderGuard: ${raw.loaderGuard} (expected boolean)`);
  }
  let tracerPidThreadsFinal = tracerPidThreads;
  if (!enabled || !tracerPid) {
    tracerPidIntervalMs = 0;
    tracerPidThreadsFinal = false;
  }
  if (!enabled) {
    ptraceGuard = { enabled: false, dumpable: false };
    seccompNoDebug = { enabled: false, mode: seccompNoDebug.mode, aggressive: false };
    coreDump = false;
    loaderGuard = false;
    argvDeny = false;
  }
  return {
    enabled,
    tracerPid,
    denyEnv,
    argvDeny,
    mapsDenylist,
    tracerPidIntervalMs,
    tracerPidThreads: tracerPidThreadsFinal,
    ptraceGuard,
    seccompNoDebug,
    coreDump,
    loaderGuard,
  };
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

  const runtimeArgv0Raw =
    tThin.runtimeArgv0 ??
    pThin.runtimeArgv0 ??
    null;
  const runtimeArgv0 = normalizeThinRuntimeArgv0(runtimeArgv0Raw);

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

  const nativeBootstrapRaw =
    tThin.nativeBootstrap ??
    pThin.nativeBootstrap ??
    null;
  const nativeBootstrap = normalizeThinNativeBootstrap(nativeBootstrapRaw);

  const launcherHardeningRaw =
    tThin.launcherHardening ??
    pThin.launcherHardening ??
    null;
  const launcherHardening = normalizeThinLauncherHardening(launcherHardeningRaw);

  const launcherHardeningCetRaw =
    tThin.launcherHardeningCET ??
    pThin.launcherHardeningCET ??
    null;
  const launcherHardeningCET = normalizeThinLauncherHardeningCet(launcherHardeningCetRaw);

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
    runtimeArgv0,
    antiDebug,
    integrity,
    appBind,
    snapshotGuard,
    nativeBootstrap,
    launcherHardening,
    launcherHardeningCET,
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

function assertNoPackagerFallback(targetCfg, projectCfg) {
  const invalid = [];
  if (targetCfg?.bundleFallback !== undefined) invalid.push("target.bundleFallback");
  if (targetCfg?.allowFallback !== undefined) invalid.push("target.allowFallback");
  if (targetCfg?.packagerFallback !== undefined) invalid.push("target.packagerFallback");
  if (projectCfg?.build?.bundleFallback !== undefined) invalid.push("build.bundleFallback");
  if (projectCfg?.build?.allowFallback !== undefined) invalid.push("build.allowFallback");
  if (projectCfg?.build?.packagerFallback !== undefined) invalid.push("build.packagerFallback");
  if (invalid.length) {
    throw new Error(`Unsupported config: ${invalid.join(", ")}. Bundle fallback has been removed; use packager=bundle explicitly.`);
  }
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

  const structuredFields = ["seaMain", "bundle", "strip", "elfPacker", "cObfuscator", "nativeBootstrapObfuscator", "strings"];
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

  const defaultCObfuscator = {
    tool: "obfuscator-llvm",
    cmd: "ollvm-clang",
    args: ["-mllvm", "-fla", "-mllvm", "-sub"],
  };
  const hasCObfuscator = Object.prototype.hasOwnProperty.call(cfg, "cObfuscator");
  const cObfCfg = hasCObfuscator
    ? ((cfg.cObfuscator && typeof cfg.cObfuscator === "object") ? cfg.cObfuscator : null)
    : (enabled ? defaultCObfuscator : null);
  const cObfuscatorRaw = (cObfCfg && cObfCfg.tool) ?? null;
  const cObfuscator = normalizeCObfuscator(cObfuscatorRaw);
  if (cObfuscatorRaw !== null && cObfuscator === null) {
    throw new Error(`Invalid protection.cObfuscator.tool: ${cObfuscatorRaw}`);
  }
  const cObfuscatorCmd = (cObfCfg && cObfCfg.cmd) ?? null;
  const cObfuscatorArgs = normalizeArgList((cObfCfg && cObfCfg.args) ?? null);

  const nbObfRaw = cfg.nativeBootstrapObfuscator;
  const nbObfCfg = (nbObfRaw && typeof nbObfRaw === "object" && !Array.isArray(nbObfRaw)) ? nbObfRaw : null;
  if (nbObfRaw !== undefined && nbObfCfg === null) {
    throw new Error("Invalid build.protection.nativeBootstrapObfuscator: expected object");
  }
  const nativeBootstrapObfuscatorCmd = (nbObfCfg && nbObfCfg.cmd) ?? null;
  const nativeBootstrapObfuscatorArgs = normalizeArgList((nbObfCfg && nbObfCfg.args) ?? null);
  if (nbObfCfg) {
    if (!nativeBootstrapObfuscatorCmd) {
      throw new Error("Invalid build.protection.nativeBootstrapObfuscator.cmd: expected string");
    }
    if (!nativeBootstrapObfuscatorArgs || !nativeBootstrapObfuscatorArgs.length) {
      throw new Error("Invalid build.protection.nativeBootstrapObfuscator.args: expected non-empty list");
    }
  }

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
    nativeBootstrapObfuscatorCmd,
    nativeBootstrapObfuscatorArgs,
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

function packagerLabelDisplay(label) {
  return label === "sea" ? "SEA" : label;
}

function packagerSupportsHardening(label) {
  return label !== "sea" && label !== "thin-single";
}

function packagerSupportsNativeBootstrap(label) {
  return label === "thin-split";
}

function packagerSupportsIntegrity(label) {
  return label === "thin-split";
}

function packagerSupportsSentinel(label) {
  return label === "thin-split";
}

function applyThinCompatibility(packagerLabel, thinCfg) {
  const next = {
    ...thinCfg,
    integrity: { ...(thinCfg && thinCfg.integrity ? thinCfg.integrity : { enabled: false }) },
    nativeBootstrap: { ...(thinCfg && thinCfg.nativeBootstrap ? thinCfg.nativeBootstrap : { enabled: false }) },
  };
  const notes = [];
  const disabled = {};
  const label = packagerLabelDisplay(packagerLabel);

  if (next.nativeBootstrap.enabled && !packagerSupportsNativeBootstrap(packagerLabel)) {
    next.nativeBootstrap.enabled = false;
    disabled.nativeBootstrap = true;
    notes.push(`${label} ignores thin.nativeBootstrap (requires thin-split)`);
  }
  if (next.integrity.enabled && !packagerSupportsIntegrity(packagerLabel)) {
    next.integrity.enabled = false;
    disabled.integrity = true;
    notes.push(`${label} ignores thin.integrity (requires thin-split)`);
  }

  return { thinCfg: next, notes, disabled };
}

function applyProtectionCompatibility(packagerLabel, protectionCfg) {
  const next = { ...protectionCfg };
  const notes = [];
  const disabled = {};
  const label = packagerLabelDisplay(packagerLabel);

  if (next.enabled === false) {
    return { protectionCfg: next, notes, disabled };
  }

  if (!packagerSupportsHardening(packagerLabel)) {
    if (next.stripSymbols) {
      next.stripSymbols = false;
      disabled.strip = true;
      notes.push(`${label} ignores protection.strip (symbol stripping)`);
    }
    if (next.elfPacker) {
      const tool = next.elfPackerCmd || next.elfPacker;
      next.elfPacker = null;
      next.elfPackerCmd = null;
      next.elfPackerArgs = null;
      disabled.elfPacker = true;
      notes.push(`${label} ignores protection.elfPacker${tool ? ` (${tool})` : ""}`);
    }
  }

  return { protectionCfg: next, notes, disabled };
}

module.exports = {
  normalizeThinMode,
  normalizeThinEnvMode,
  normalizeThinRuntimeStore,
  resolveThinConfig,
  normalizePackager,
  assertNoPackagerFallback,
  resolveProtectionConfig,
  normalizeStringObfuscation,
  normalizeCObfuscator,
  normalizeArgList,
  packagerSupportsHardening,
  packagerSupportsNativeBootstrap,
  packagerSupportsIntegrity,
  packagerSupportsSentinel,
  applyThinCompatibility,
  applyProtectionCompatibility,
};
