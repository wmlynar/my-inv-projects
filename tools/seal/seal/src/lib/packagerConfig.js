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
  const tThin = targetCfg && typeof targetCfg.thin === "object" ? targetCfg.thin : {};
  const pThin = projectCfg?.build && typeof projectCfg.build.thin === "object" ? projectCfg.build.thin : {};

  const modeRaw =
    targetCfg?.thinMode ??
    targetCfg?.thinVariant ??
    tThin.mode ??
    tThin.variant ??
    projectCfg?.build?.thinMode ??
    projectCfg?.build?.thinVariant ??
    pThin.mode ??
    pThin.variant;

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
    tThin.chunkSize ??
    projectCfg?.build?.thinChunkSize ??
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
  return !!(
    targetCfg?.bundleFallback ??
    targetCfg?.allowFallback ??
    projectCfg?.build?.bundleFallback ??
    projectCfg?.build?.allowFallback ??
    false
  );
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
    cfg.stringObfuscation ??
    cfg.sourceStringObfuscation ??
    cfg.sourceObfuscation ??
    null;
  const stringObfuscation = normalizeStringObfuscation(stringObfuscationRaw);

  const cObfuscatorRaw =
    cfg.cObfuscator ??
    cfg.cObfuscatorMode ??
    cfg.codeObfuscator ??
    cfg.obfuscatorC ??
    null;
  const cObfuscator = normalizeCObfuscator(cObfuscatorRaw);
  const cObfuscatorCmd = cfg.cObfuscatorCmd ?? cfg.cObfuscatorBin ?? cfg.codeObfuscatorCmd ?? null;
  const cObfuscatorArgs = normalizeArgList(cfg.cObfuscatorArgs ?? cfg.cObfuscatorFlags ?? null);

  return {
    enabled,
    packSeaMain: cfg.packSeaMain ?? cfg.seaMainPacking ?? true,
    packSeaMainMethod: cfg.packSeaMainMethod ?? cfg.seaMainPackingMethod ?? "brotli",
    packSeaMainChunkSize: cfg.packSeaMainChunkSize ?? cfg.seaMainPackingChunkSize ?? 8000,
    packBundle: cfg.packBundle ?? cfg.bundlePacking ?? true,
    stripSymbols: cfg.stripSymbols ?? cfg.strip ?? false,
    stripTool: cfg.stripTool ?? cfg.stripCmd ?? "strip",
    stripArgs: cfg.stripArgs ?? null,
    upxPack: cfg.upxPack ?? cfg.upx ?? false,
    elfPacker: cfg.elfPacker ?? cfg.elfPack ?? null,
    elfPackerCmd: cfg.elfPackerCmd ?? cfg.elfPackerBin ?? null,
    elfPackerArgs: cfg.elfPackerArgs ?? cfg.elfPackerFlags ?? null,
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
