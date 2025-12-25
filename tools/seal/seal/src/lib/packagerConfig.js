"use strict";

function normalizeThinMode(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v === "aio" || v === "single") return "aio";
  if (v === "bootstrap" || v === "split") return "bootstrap";
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

  return { mode, level, chunkSizeBytes, zstdLevel, zstdTimeoutMs };
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
  if (name === "fallback") {
    return { kind: "bundle", label: "bundle", legacy: true };
  }
  if (name === "sea") return { kind: "sea", label: "sea" };
  if (name === "none") return { kind: "none", label: "none" };
  if (name === "auto") return { kind: "auto", label: "auto" };

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

  return {
    enabled,
    packSeaMain: cfg.packSeaMain ?? cfg.seaMainPacking ?? true,
    packSeaMainMethod: cfg.packSeaMainMethod ?? cfg.seaMainPackingMethod ?? "brotli",
    packSeaMainChunkSize: cfg.packSeaMainChunkSize ?? cfg.seaMainPackingChunkSize ?? 8000,
    packBundle: cfg.packBundle ?? cfg.bundlePacking ?? true,
    stripSymbols: cfg.stripSymbols ?? cfg.strip ?? false,
    upxPack: cfg.upxPack ?? cfg.upx ?? false,
    raw,
  };
}

module.exports = {
  normalizeThinMode,
  resolveThinConfig,
  normalizePackager,
  resolveBundleFallback,
  resolveProtectionConfig,
};
