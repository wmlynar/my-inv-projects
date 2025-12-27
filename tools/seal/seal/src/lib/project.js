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

function hasOwn(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function mergeConfig(base, override) {
  const out = { ...(isPlainObject(base) ? base : {}) };
  if (!isPlainObject(override)) return out;
  for (const key of Object.keys(override)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const next = override[key];
    if (isPlainObject(next) && isPlainObject(out[key])) {
      out[key] = mergeConfig(out[key], next);
      continue;
    }
    if (next !== undefined) out[key] = next;
  }
  return out;
}

function hasPath(obj, pathParts) {
  let cur = obj;
  for (const key of pathParts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return false;
    if (!Object.prototype.hasOwnProperty.call(cur, key)) return false;
    cur = cur[key];
  }
  return true;
}

function getPath(obj, pathParts) {
  let cur = obj;
  for (const key of pathParts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, key)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function applyFrontendObfuscationProfile(cfg, rawCfg, obfProfile) {
  const rawFrontendObf = getPath(rawCfg, ["build", "frontendObfuscation"]);
  if (!hasPath(rawCfg, ["build", "frontendObfuscation"])) {
    cfg.build.frontendObfuscation = { enabled: true, profile: "balanced" };
    return;
  }
  if (!rawFrontendObf || typeof rawFrontendObf !== "object" || Array.isArray(rawFrontendObf)) return;
  if (rawFrontendObf.enabled === false) return;
  if (!hasPath(rawCfg, ["build", "frontendObfuscation", "profile"])) {
    if (!cfg.build.frontendObfuscation || typeof cfg.build.frontendObfuscation !== "object" || Array.isArray(cfg.build.frontendObfuscation)) {
      cfg.build.frontendObfuscation = { enabled: true };
    }
    cfg.build.frontendObfuscation.profile = "balanced";
  }
}

function normalizeSecurityProfile(raw) {
  if (raw === undefined || raw === null) return null;
  const input = String(raw).trim().toLowerCase();
  if (!input) return null;
  const known = new Set(["minimal", "balanced", "strict", "max"]);
  return known.has(input) ? input : null;
}

function applySecurityProfile(cfg, rawCfg) {
  if (!cfg || !cfg.build) return;
  const profileRaw = hasPath(rawCfg, ["build", "securityProfile"])
    ? rawCfg.build.securityProfile
    : cfg.build.securityProfile;
  if (!profileRaw) return;
  const profile = normalizeSecurityProfile(profileRaw);
  if (!profile) {
    throw new Error(`Invalid build.securityProfile: ${profileRaw} (expected: minimal|balanced|strict|max)`);
  }

  const mapsDenylistDefault = [
    "frida",
    "frida-agent",
    "gum-js-loop",
    "frida-gadget",
    "ltrace",
    "strace",
  ];

  if (!hasPath(rawCfg, ["build", "securityProfile"])) {
    cfg.build.securityProfile = profile;
  }

  const obfDefault = profile === "minimal"
    ? "minimal"
    : (profile === "max" ? "max" : (profile === "strict" ? "strict" : "balanced"));
  if (!hasPath(rawCfg, ["build", "obfuscationProfile"])) {
    cfg.build.obfuscationProfile = obfDefault;
  }
  const obfProfile = cfg.build.obfuscationProfile || obfDefault;
  applyFrontendObfuscationProfile(cfg, rawCfg, obfProfile);

  const thin = cfg.build.thin || (cfg.build.thin = {});

  const rawAntiDebug = getPath(rawCfg, ["build", "thin", "antiDebug"]);
  const rawAntiDebugIsObject = rawAntiDebug && typeof rawAntiDebug === "object" && !Array.isArray(rawAntiDebug);
  const rawAntiDebugIsTrue = rawAntiDebug === true;
  const allowAntiDebugDefaults = !hasPath(rawCfg, ["build", "thin", "antiDebug"]) || rawAntiDebugIsObject || rawAntiDebugIsTrue;

  if (profile === "balanced" || profile === "strict" || profile === "max") {
    if (!hasPath(rawCfg, ["build", "thin", "envMode"])) {
      thin.envMode = (profile === "strict" || profile === "max") ? "allowlist" : "denylist";
    }
  }

  if (profile === "strict" || profile === "max") {
    const rawSnapshot = getPath(rawCfg, ["build", "thin", "snapshotGuard"]);
    if (!hasPath(rawCfg, ["build", "thin", "snapshotGuard"])) {
      thin.snapshotGuard = { enabled: true };
    } else if (rawSnapshot === true) {
      thin.snapshotGuard = { enabled: true };
    } else if (thin.snapshotGuard && typeof thin.snapshotGuard === "object" && !Array.isArray(thin.snapshotGuard)) {
      if (!hasPath(rawCfg, ["build", "thin", "snapshotGuard", "enabled"])) {
        thin.snapshotGuard.enabled = true;
      }
    }
  }

  const rawIntegrity = getPath(rawCfg, ["build", "thin", "integrity"]);
  if (!hasPath(rawCfg, ["build", "thin", "integrity"])) {
    thin.integrity = { enabled: true, mode: "sidecar" };
  } else if (rawIntegrity === true) {
    thin.integrity = { enabled: true, mode: "sidecar" };
  } else if (thin.integrity && typeof thin.integrity === "object" && !Array.isArray(thin.integrity)) {
    if (!hasPath(rawCfg, ["build", "thin", "integrity", "enabled"])) {
      thin.integrity.enabled = true;
    }
    if (!hasPath(rawCfg, ["build", "thin", "integrity", "mode"])) {
      thin.integrity.mode = "sidecar";
    }
  }

  const rawNative = getPath(rawCfg, ["build", "thin", "nativeBootstrap"]);
  if (!hasPath(rawCfg, ["build", "thin", "nativeBootstrap"])) {
    thin.nativeBootstrap = { enabled: true };
  } else if (rawNative === true) {
    thin.nativeBootstrap = { enabled: true };
  } else if (thin.nativeBootstrap && typeof thin.nativeBootstrap === "object" && !Array.isArray(thin.nativeBootstrap)) {
    if (!hasPath(rawCfg, ["build", "thin", "nativeBootstrap", "enabled"])) {
      thin.nativeBootstrap.enabled = true;
    }
  }

  if (allowAntiDebugDefaults) {
    const antiDebug = thin.antiDebug || (thin.antiDebug = {});
    if (!hasPath(rawCfg, ["build", "thin", "antiDebug", "enabled"])) {
      antiDebug.enabled = true;
    }
    if (!hasPath(rawCfg, ["build", "thin", "antiDebug", "mapsDenylist"])) {
      antiDebug.mapsDenylist = mapsDenylistDefault;
    }
    const rawSeccomp = getPath(rawCfg, ["build", "thin", "antiDebug", "seccompNoDebug"]);
    const rawSeccompEnabled = hasPath(rawCfg, ["build", "thin", "antiDebug", "seccompNoDebug", "enabled"])
      ? getPath(rawCfg, ["build", "thin", "antiDebug", "seccompNoDebug", "enabled"])
      : undefined;
    const seccompExplicitOff = rawSeccomp === false || rawSeccompEnabled === false;
    if (!hasPath(rawCfg, ["build", "thin", "antiDebug", "seccompNoDebug"])) {
      antiDebug.seccompNoDebug = { enabled: true, mode: "kill", aggressive: profile === "max" };
    } else if (!seccompExplicitOff && !hasPath(rawCfg, ["build", "thin", "antiDebug", "seccompNoDebug", "mode"])) {
      if (rawSeccomp !== false) {
        if (!antiDebug.seccompNoDebug || typeof antiDebug.seccompNoDebug !== "object" || Array.isArray(antiDebug.seccompNoDebug)) {
          antiDebug.seccompNoDebug = { enabled: true };
        } else if (!hasOwn(antiDebug.seccompNoDebug, "enabled")) {
          antiDebug.seccompNoDebug.enabled = true;
        }
        antiDebug.seccompNoDebug.mode = "kill";
        if (profile === "max" && !hasOwn(antiDebug.seccompNoDebug, "aggressive")) {
          antiDebug.seccompNoDebug.aggressive = true;
        }
      }
    } else if (profile === "max" && !seccompExplicitOff && rawSeccomp !== false && !hasPath(rawCfg, ["build", "thin", "antiDebug", "seccompNoDebug", "aggressive"])) {
      if (!antiDebug.seccompNoDebug || typeof antiDebug.seccompNoDebug !== "object" || Array.isArray(antiDebug.seccompNoDebug)) {
        antiDebug.seccompNoDebug = { enabled: true, mode: "kill", aggressive: true };
      } else {
        antiDebug.seccompNoDebug.aggressive = true;
      }
    }
  }

  const protection = cfg.build.protection || (cfg.build.protection = {});
  if (!hasPath(rawCfg, ["build", "protection", "strip"])) {
    protection.strip = { enabled: true, cmd: "strip" };
  } else if (protection.strip && typeof protection.strip === "object" && !Array.isArray(protection.strip)) {
    if (!hasPath(rawCfg, ["build", "protection", "strip", "enabled"])) {
      protection.strip.enabled = true;
    }
  }
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

function extractWorkspaceDefaults(cfg, dir) {
  if (!cfg || !isWorkspaceConfig(cfg)) return null;
  if (cfg.defaults === undefined || cfg.defaults === null) return null;
  if (!isPlainObject(cfg.defaults)) {
    throw new Error(`Invalid seal.json5 defaults in ${dir} (expected object)`);
  }
  return cfg.defaults;
}

function collectWorkspaceDefaults(projectRoot) {
  const defaults = [];
  let dir = path.resolve(projectRoot);
  for (let i = 0; i < 25; i++) {
    const sealFile = path.join(dir, SEAL_FILE);
    if (fs.existsSync(sealFile)) {
      const cfg = loadSealFile(dir);
      const defs = extractWorkspaceDefaults(cfg, dir);
      if (defs) defaults.push({ dir, defs });
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!defaults.length) return null;
  const ordered = defaults.reverse();
  let merged = {};
  for (const entry of ordered) {
    merged = mergeConfig(merged, entry.defs);
  }
  return merged;
}

function loadProjectConfig(projectRoot) {
  const { sealFile } = getSealPaths(projectRoot);
  let cfg = null;

  if (fs.existsSync(sealFile)) {
    cfg = readJson5(sealFile);
    if (isWorkspaceConfig(cfg)) return null;
  }

  if (!cfg) return null;
  const workspaceDefaults = collectWorkspaceDefaults(projectRoot);
  const rawMerged = workspaceDefaults ? mergeConfig(workspaceDefaults, cfg) : cfg;
  const rawCfg = JSON.parse(JSON.stringify(rawMerged));
  cfg = JSON.parse(JSON.stringify(rawMerged));

  // Fill defaults defensively
  cfg.appName = cfg.appName || detectAppName(projectRoot);
  cfg.entry = cfg.entry || detectEntry(projectRoot) || "src/index.js";
  cfg.defaultTarget = cfg.defaultTarget || "local";
  cfg.build = cfg.build || {};
  if (cfg.build.securityProfile === undefined || cfg.build.securityProfile === null) {
    cfg.build.securityProfile = "strict";
  }
  cfg.build.packager = cfg.build.packager || "auto"; // auto|sea|bundle|none|thin-split
  if (cfg.build.packagerFallback === undefined) cfg.build.packagerFallback = false;
  cfg.build.thin = cfg.build.thin || {};
  if (cfg.build.thin.mode === undefined) cfg.build.thin.mode = "split";
  if (cfg.build.thin.level === undefined) cfg.build.thin.level = "low";
  cfg.build.obfuscationProfile = cfg.build.obfuscationProfile || "balanced";
  cfg.build.includeDirs = cfg.build.includeDirs || ["public", "data"];
  // Frontend obfuscation: enabled by default (can be set to false)
  if (cfg.build.frontendObfuscation === undefined) {
    cfg.build.frontendObfuscation = { enabled: true, profile: "balanced" };
  }
  // Frontend minification: enabled by default (safe HTML/CSS minify)
  if (cfg.build.frontendMinify === undefined) {
    cfg.build.frontendMinify = { enabled: true, level: "safe", html: true, css: true };
  }
  if (cfg.build.decoy === undefined) {
    cfg.build.decoy = {
      mode: "none",
      scope: "backend",
      sourceDir: "decoy",
      overwrite: false,
      generator: "off",
    };
  }

  // Protection: enabled by default. Attempts to reduce "casual" inspection of executables/bundles.
  // - SEA: packs the main bundle into a compressed loader (so the SEA blob has no plaintext JS)
  // - bundle: gzip-pack backend bundle + loader
  // - ELF packer defaults to kiteshield (-n) for thin-split; SEA/thin-single ignore strip/ELF packer
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
      elfPacker: {
        tool: "kiteshield",
        cmd: "kiteshield",
        args: ["-n", "{in}", "{out}"],
      },
    };
  }

  applySecurityProfile(cfg, rawCfg);
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
