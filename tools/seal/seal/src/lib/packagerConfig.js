"use strict";

function normalizeThinMode(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v === "aio" || v === "single") return "aio";
  if (v === "bootstrap" || v === "split") return "bootstrap";
  return null;
}

function normalizeThinEnvMode(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v === "allow" || v === "allowlist" || v === "strict") return "allowlist";
  if (v === "deny" || v === "denylist" || v === "default") return "denylist";
  return null;
}

function normalizeThinRuntimeStore(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v === "memfd" || v === "mem" || v === "memory") return "memfd";
  if (v === "tmpfile" || v === "tmp" || v === "file") return "tmpfile";
  return null;
}

function resolveThinConfig(targetCfg, projectCfg) {
  const tThinBuild = (targetCfg && targetCfg.build && typeof targetCfg.build.thin === "object") ? targetCfg.build.thin : {};
  const tThinRaw = targetCfg && typeof targetCfg.thin === "object" ? targetCfg.thin : {};
  const tThin = { ...tThinBuild, ...tThinRaw };
  const pThin = projectCfg?.build && typeof projectCfg.build.thin === "object" ? projectCfg.build.thin : {};

  const modeRaw =
    targetCfg?.thinMode ??
    targetCfg?.thinVariant ??
    targetCfg?.thinPackager ??
    targetCfg?.build?.thinMode ??
    targetCfg?.build?.thinVariant ??
    targetCfg?.build?.thinPackager ??
    tThin.mode ??
    tThin.variant ??
    tThin.packager ??
    projectCfg?.build?.thinMode ??
    projectCfg?.build?.thinVariant ??
    projectCfg?.build?.thinPackager ??
    pThin.mode ??
    pThin.variant ??
    pThin.packager;

  const mode = normalizeThinMode(modeRaw) || "aio";

  const levelRaw =
    targetCfg?.thinLevel ??
    tThin.level ??
    projectCfg?.build?.thinLevel ??
    pThin.level ??
    "low";
  const level = String(levelRaw).toLowerCase();

  const chunkSizeBytes =
    targetCfg?.thinChunkSize ??
    tThin.chunkSizeBytes ??
    tThin.chunkSize ??
    projectCfg?.build?.thinChunkSize ??
    pThin.chunkSizeBytes ??
    pThin.chunkSize ??
    null;

  const zstdLevel =
    targetCfg?.thinZstdLevel ??
    tThin.zstdLevel ??
    projectCfg?.build?.thinZstdLevel ??
    pThin.zstdLevel ??
    null;

  const zstdTimeoutMs =
    targetCfg?.thinZstdTimeoutMs ??
    tThin.zstdTimeoutMs ??
    projectCfg?.build?.thinZstdTimeoutMs ??
    pThin.zstdTimeoutMs ??
    null;

  const envModeRaw =
    targetCfg?.thinEnvMode ??
    tThin.envMode ??
    projectCfg?.build?.thinEnvMode ??
    pThin.envMode ??
    null;
  const envMode = normalizeThinEnvMode(envModeRaw);

  const runtimeStoreRaw =
    targetCfg?.thinRuntimeStore ??
    tThin.runtimeStore ??
    projectCfg?.build?.thinRuntimeStore ??
    pThin.runtimeStore ??
    null;
  const runtimeStore = normalizeThinRuntimeStore(runtimeStoreRaw);

  return { mode, level, chunkSizeBytes, zstdLevel, zstdTimeoutMs, envMode, runtimeStore };
}

function normalizePackager(rawPackager, thinMode) {
  const name = String(rawPackager || "auto").toLowerCase();
  const thinNorm = normalizeThinMode(thinMode) || "aio";

  const thinSplitAliases = new Set(["thin-split", "thin:split"]);
  const thinSingleAliases = new Set(["thin-single", "thin:single"]);

  if (thinSplitAliases.has(name)) {
    return { kind: "thin", label: "thin-split", thinMode: "bootstrap" };
  }
  if (thinSingleAliases.has(name)) {
    return { kind: "thin", label: "thin-single", thinMode: "aio" };
  }

  if (name === "thin") {
    return { kind: "thin", label: thinNorm === "bootstrap" ? "thin-split" : "thin-single", thinMode: thinNorm, legacy: true };
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
  const raw =
    targetCfg?.packagerFallback ??
    targetCfg?.bundleFallback ??
    targetCfg?.allowFallback ??
    targetCfg?.build?.packagerFallback ??
    targetCfg?.build?.bundleFallback ??
    targetCfg?.build?.allowFallback ??
    projectCfg?.build?.packagerFallback ??
    projectCfg?.build?.bundleFallback ??
    projectCfg?.build?.allowFallback ??
    false;

  if (raw === "bundle") return true;
  if (raw === "none" || raw === "false") return false;
  return !!raw;
}

function resolveProtectionConfig(projectCfg) {
  const build = projectCfg?.build || {};
  const raw =
    build.protection ??
    build.artifactProtection ??
    build.hardening ??
    {};

  if (raw === false) return { enabled: false };

  const enabled = !(typeof raw === "object" && raw && raw.enabled === false);
  const cfg = (typeof raw === "object" && raw) ? raw : {};
  const stringObfuscationRaw =
    (cfg.strings && cfg.strings.obfuscation) ??
    cfg.stringObfuscation ??
    cfg.sourceStringObfuscation ??
    cfg.sourceObfuscation ??
    null;
  const stringObfuscation = normalizeStringObfuscation(stringObfuscationRaw);

  const cObfCfg =
    (cfg.cObfuscator && typeof cfg.cObfuscator === "object") ? cfg.cObfuscator : null;
  const cObfuscatorRaw =
    (cObfCfg && cObfCfg.tool) ??
    cfg.cObfuscator ??
    cfg.cObfuscatorMode ??
    cfg.codeObfuscator ??
    cfg.obfuscatorC ??
    null;
  const cObfuscator = normalizeCObfuscator(cObfuscatorRaw);
  const cObfuscatorCmd =
    (cObfCfg && cObfCfg.cmd) ??
    cfg.cObfuscatorCmd ??
    cfg.cObfuscatorBin ??
    cfg.codeObfuscatorCmd ??
    null;
  const cObfuscatorArgs = normalizeArgList(
    (cObfCfg && cObfCfg.args) ??
    cfg.cObfuscatorArgs ??
    cfg.cObfuscatorFlags ??
    null
  );

  const seaCfg = (cfg.sea && typeof cfg.sea === "object") ? cfg.sea : {};
  const seaMainCfg = (cfg.seaMain && typeof cfg.seaMain === "object")
    ? cfg.seaMain
    : (seaCfg.main && typeof seaCfg.main === "object" ? seaCfg.main : {});
  const bundleCfg = (cfg.bundle && typeof cfg.bundle === "object") ? cfg.bundle : {};
  const stripCfg = (cfg.strip && typeof cfg.strip === "object") ? cfg.strip : {};
  const upxCfg = (cfg.upx && typeof cfg.upx === "object") ? cfg.upx : {};
  const elfCfg = (cfg.elfPacker && typeof cfg.elfPacker === "object")
    ? cfg.elfPacker
    : (cfg.elf && typeof cfg.elf === "object" ? cfg.elf : {});

  return {
    enabled,
    packSeaMain: seaMainCfg.pack ?? cfg.packSeaMain ?? cfg.seaMainPacking ?? true,
    packSeaMainMethod: seaMainCfg.method ?? cfg.packSeaMainMethod ?? cfg.seaMainPackingMethod ?? "brotli",
    packSeaMainChunkSize: seaMainCfg.chunkSize ?? cfg.packSeaMainChunkSize ?? cfg.seaMainPackingChunkSize ?? 8000,
    packBundle: bundleCfg.pack ?? cfg.packBundle ?? cfg.bundlePacking ?? true,
    stripSymbols: stripCfg.enabled ?? cfg.stripSymbols ?? cfg.strip ?? false,
    stripTool: stripCfg.cmd ?? cfg.stripTool ?? cfg.stripCmd ?? "strip",
    stripArgs: stripCfg.args ?? cfg.stripArgs ?? null,
    upxPack: upxCfg.enabled ?? cfg.upxPack ?? cfg.upx ?? false,
    elfPacker: elfCfg.tool ?? cfg.elfPacker ?? cfg.elfPack ?? null,
    elfPackerCmd: elfCfg.cmd ?? cfg.elfPackerCmd ?? cfg.elfPackerBin ?? null,
    elfPackerArgs: normalizeArgList(elfCfg.args ?? cfg.elfPackerArgs ?? cfg.elfPackerFlags ?? null),
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
  if (v === "ollvm" || v === "obfuscator-llvm" || v === "obfuscatorllvm" || v === "obfuscator_llvm") {
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
