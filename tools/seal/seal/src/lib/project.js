"use strict";

const fs = require("fs");
const path = require("path");
const { SEAL_CONFIG_DIR, SEAL_OUT_DIR } = require("./paths");
const { readJson5 } = require("./json5io");
const { fileExists } = require("./fsextra");
const { normalizeRetention } = require("./retention");

function getSealPaths(projectRoot) {
  const sealConfigDir = path.join(projectRoot, SEAL_CONFIG_DIR);
  const sealOutDir = path.join(projectRoot, SEAL_OUT_DIR);
  return {
    projectRoot,
    sealConfigDir,
    sealOutDir,
    projectFile: path.join(sealConfigDir, "project.json5"),
    policyFile: path.join(sealConfigDir, "policy.json5"),
    targetsDir: path.join(sealConfigDir, "targets"),
    outDir: sealOutDir,
    configDir: path.join(sealConfigDir, "configs"),
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
  if (pkg && typeof pkg.name === "string") return pkg.name.replace(/^@/,"").replace(/\//g,"-");
  return path.basename(projectRoot);
}

function loadProjectConfig(projectRoot) {
  const { projectFile } = getSealPaths(projectRoot);
  if (!fs.existsSync(projectFile)) return null;
  const cfg = readJson5(projectFile);

  // Fill defaults defensively
  cfg.appName = cfg.appName || detectAppName(projectRoot);
  cfg.entry = cfg.entry || detectEntry(projectRoot) || "src/index.js";
  cfg.defaultTarget = cfg.defaultTarget || "local";
  cfg.build = cfg.build || {};
  cfg.build.packager = cfg.build.packager || "auto"; // auto|sea|fallback|thin
  cfg.build.thinLevel = cfg.build.thinLevel || "low";
  if (cfg.build.allowFallback === undefined) cfg.build.allowFallback = false;
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

  // Hardening: enabled by default. Attempts to reduce "casual" inspection of executables/bundles.
  // - SEA: packs the main bundle into a compressed loader (so the SEA blob has no plaintext JS)
  // - fallback: gzip-pack backend bundle + loader
  // - strip/upx for SEA binaries are EXPERIMENTAL and therefore OFF by default
  if (cfg.build.hardening === undefined) {
    cfg.build.hardening = { enabled: true, strip: false, upx: false, bundlePacking: true };
  }
  cfg.build.thinMode = cfg.build.thinMode || "aio";

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
  const { policyFile } = getSealPaths(projectRoot);
  if (!fs.existsSync(policyFile)) {
    return { retention: normalizeRetention({ retention: {} }) };
  }
  const cfg = readJson5(policyFile) || {};
  return { retention: normalizeRetention(cfg) };
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

function findLastArtifact(projectRoot, appName) {
  const { outDir } = getSealPaths(projectRoot);
  if (!fs.existsSync(outDir)) return null;
  const files = fs.readdirSync(outDir).filter(f => f.endsWith(".tgz"));
  const ours = files
    .filter(f => f.startsWith(appName + "-"))
    .map(f => ({ f, mtime: fs.statSync(path.join(outDir, f)).mtimeMs }))
    .sort((a,b) => b.mtime - a.mtime);
  if (!ours.length) return null;
  return path.join(outDir, ours[0].f);
}

module.exports = {
  getSealPaths,
  loadPackageJson,
  detectEntry,
  detectAppName,
  loadProjectConfig,
  loadTargetConfig,
  loadPolicy,
  resolveTargetName,
  resolveConfigName,
  getConfigFile,
  findLastArtifact,
};
