"use strict";

const fs = require("fs");
const path = require("path");
const { SEAL_CONFIG_DIR, SEAL_OUT_DIR, SEAL_FILE } = require("./paths");
const { readJson5, writeJson5 } = require("./json5io");
const { normalizeRetention } = require("./retention");

function getSealPaths(projectRoot) {
  const sealConfigDir = path.join(projectRoot, SEAL_CONFIG_DIR);
  const sealOutDir = path.join(projectRoot, SEAL_OUT_DIR);
  return {
    projectRoot,
    sealConfigDir,
    sealFile: path.join(projectRoot, SEAL_FILE),
    projectFile: path.join(sealConfigDir, "project.json5"),
    policyFile: path.join(sealConfigDir, "policy.json5"),
    targetsDir: path.join(sealConfigDir, "targets"),
    configDir: path.join(sealConfigDir, "configs"),
    outDir: sealOutDir,
    runtimeConfigPath: path.join(projectRoot, "config.runtime.json5"),
  };
}

function loadPackageJson(projectRoot) {
  const p = path.join(projectRoot, "package.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function detectEntry(projectRoot) {
  const pkg = loadPackageJson(projectRoot);
  if (pkg && typeof pkg.main === "string") {
    const cand = path.join(projectRoot, pkg.main);
    if (fs.existsSync(cand)) return pkg.main;
  }
  const cand1 = path.join(projectRoot, "src", "index.js");
  if (fs.existsSync(cand1)) return "src/index.js";
  const cand2 = path.join(projectRoot, "index.js");
  if (fs.existsSync(cand2)) return "index.js";
  return null;
}

function detectAppName(projectRoot) {
  const pkg = loadPackageJson(projectRoot);
  if (pkg && typeof pkg.name === "string") return pkg.name.replace(/^@/, "").replace(/\//g, "-");
  return path.basename(projectRoot);
}

function loadSealFile(projectRoot) {
  const { sealFile } = getSealPaths(projectRoot);
  if (!fs.existsSync(sealFile)) return null;
  return readJson5(sealFile);
}

function isWorkspaceConfig(cfg) {
  return !!cfg && Array.isArray(cfg.projects);
}

function loadWorkspaceConfig(projectRoot) {
  const cfg = loadSealFile(projectRoot);
  if (!cfg || !isWorkspaceConfig(cfg)) return null;
  return cfg;
}

function loadProjectConfig(projectRoot) {
  const { sealFile } = getSealPaths(projectRoot);
  let cfg = null;

  if (fs.existsSync(sealFile)) {
    cfg = readJson5(sealFile);
    if (isWorkspaceConfig(cfg)) return null;
  }

  if (!cfg) return null;

  // Fill defaults defensively
  cfg.appName = cfg.appName || detectAppName(projectRoot);
  cfg.entry = cfg.entry || detectEntry(projectRoot) || "src/index.js";
  cfg.defaultTarget = cfg.defaultTarget || "local";
  cfg.build = cfg.build || {};
  cfg.build.packager = cfg.build.packager || "auto"; // auto|sea|bundle|none|thin-split|thin-single
  if (cfg.build.packagerFallback === undefined) cfg.build.packagerFallback = false;
  cfg.build.thin = cfg.build.thin || {};
  if (cfg.build.thin.mode === undefined) cfg.build.thin.mode = "split";
  if (cfg.build.thin.level === undefined) cfg.build.thin.level = "low";
  cfg.build.obfuscationProfile = cfg.build.obfuscationProfile || "balanced";
  cfg.build.includeDirs = cfg.build.includeDirs || ["public", "data"];
  // Frontend obfuscation: enabled by default (can be set to false)
  if (cfg.build.frontendObfuscation === undefined) {
    cfg.build.frontendObfuscation = { enabled: true, profile: cfg.build.obfuscationProfile };
  }
  // Frontend minification: enabled by default (safe HTML/CSS minify)
  if (cfg.build.frontendMinify === undefined) {
    cfg.build.frontendMinify = { enabled: true, level: "safe", html: true, css: true };
  }

  // Protection: enabled by default. Attempts to reduce "casual" inspection of executables/bundles.
  // - SEA: packs the main bundle into a compressed loader (so the SEA blob has no plaintext JS)
  // - bundle: gzip-pack backend bundle + loader
  // - strip/ELF packer for SEA binaries are EXPERIMENTAL and therefore OFF by default
  if (cfg.build.protection === undefined) {
    cfg.build.protection = {
      enabled: true,
      seaMain: {
        pack: true,
        method: "brotli",
        chunkSize: 8000,
      },
      bundle: {
        pack: true,
      },
      strip: {
        enabled: false,
        cmd: "strip",
      },
    };
  }

  return cfg;
}

function loadTargetConfig(projectRoot, targetName) {
  const { targetsDir } = getSealPaths(projectRoot);
  const file = path.join(targetsDir, `${targetName}.json5`);
  if (!fs.existsSync(file)) return null;
  const cfg = readJson5(file);
  cfg.target = cfg.target || targetName;
  cfg.config = cfg.config || targetName;
  cfg.packager = cfg.packager || "auto";
  cfg.kind = cfg.kind || (cfg.host && cfg.host !== "127.0.0.1" ? "ssh" : "local");
  return { file, cfg };
}

function loadPolicy(projectRoot) {
  const proj = loadProjectConfig(projectRoot);
  if (proj && proj.policy) {
    return { retention: normalizeRetention(proj.policy || {}) };
  }
  return { retention: normalizeRetention({ retention: {} }) };
}

function resolveTargetName(projectRoot, maybeTarget) {
  const proj = loadProjectConfig(projectRoot);
  if (maybeTarget) return maybeTarget;
  if (proj && proj.defaultTarget) return proj.defaultTarget;

  // fallback: if local target exists use it
  const { targetsDir } = getSealPaths(projectRoot);
  const localFile = path.join(targetsDir, "local.json5");
  if (fs.existsSync(localFile)) return "local";
  return "local";
}

function resolveConfigName(targetCfg, optsConfig) {
  if (optsConfig) return optsConfig;
  return targetCfg.config || targetCfg.target;
}

function getConfigFile(projectRoot, configName) {
  const { configDir } = getSealPaths(projectRoot);
  return path.join(configDir, `${configName}.json5`);
}

function saveProjectConfig(projectRoot, cfg) {
  const { sealFile } = getSealPaths(projectRoot);
  writeJson5(sealFile, cfg);
}

function findLastArtifact(projectRoot, appName) {
  const { outDir } = getSealPaths(projectRoot);
  if (!fs.existsSync(outDir)) return null;
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".tgz"));
  const ours = files
    .filter((f) => f.startsWith(appName + "-"))
    .map((f) => ({ f, mtime: fs.statSync(path.join(outDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!ours.length) return null;
  return path.join(outDir, ours[0].f);
}

module.exports = {
  getSealPaths,
  loadPackageJson,
  detectEntry,
  detectAppName,
  loadSealFile,
  loadWorkspaceConfig,
  isWorkspaceConfig,
  loadProjectConfig,
  loadTargetConfig,
  loadPolicy,
  resolveTargetName,
  resolveConfigName,
  getConfigFile,
  saveProjectConfig,
  findLastArtifact,
};
