"use strict";

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, resolveConfigName, getConfigFile } = require("../lib/project");
const { ensureDir, fileExists, safeWriteFile } = require("../lib/fsextra");
const { ok, warn } = require("../lib/ui");
const { configDiffSsh, configPullSsh, configPushSsh } = require("../lib/deploySsh");

function templateConfig(name, appName) {
  return `// seal-config/configs/${name}.json5 – runtime config
{
  appName: "${appName}",
  http: {
    host: "0.0.0.0",
    port: ${name === "prod" ? 8080 : 3000},
  },

  log: {
    level: "${name === "prod" ? "error" : "debug"}",
    file: "./logs/app.log",
  },

  external: {
    echoUrl: "https://postman-echo.com/get?source=seal",
    timeoutMs: 5000,
  },

  featuresFile: "./data/feature_flags.json",
}
`;
}

async function cmdConfigAdd(cwd, name) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  ensureDir(paths.configDir);
  const file = path.join(paths.configDir, `${name}.json5`);
  if (fileExists(file)) {
    warn(`Config already exists: ${file}`);
    return;
  }
  safeWriteFile(file, templateConfig(name, proj.appName), { force: false });
  ok(`Created config: ${file}`);
}

function listTargets(projectRoot) {
  const { targetsDir } = getSealPaths(projectRoot);
  let entries = [];
  try {
    entries = fs.readdirSync(targetsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((d) => d.isFile() && d.name.endsWith(".json5"))
    .map((d) => path.basename(d.name, ".json5"))
    .map((name) => loadTargetConfig(projectRoot, name))
    .filter(Boolean)
    .map((t) => {
      const cfgName = resolveConfigName(t.cfg, null);
      return { name: t.cfg.target || tNameFromFile(t.file), cfgName, cfg: t.cfg };
    });
}

function tNameFromFile(filePath) {
  return path.basename(filePath, ".json5");
}

function formatTargets(targets) {
  if (!targets.length) return "  (no targets found)";
  return targets
    .map((t) => {
      const kind = (t.cfg.kind || "local").toLowerCase();
      const host = kind === "ssh" ? (t.cfg.host || "?") : "local";
      return `  - ${t.name} (config: ${t.cfgName}, kind: ${kind}, host: ${host})`;
    })
    .join("\n");
}

function normalizeConfigArg(arg) {
  if (!arg) return null;
  const raw = String(arg).trim();
  if (!raw) return null;
  if (raw.includes("/") || raw.includes("\\")) {
    const base = path.basename(raw);
    return base.replace(/\.json5$/i, "");
  }
  if (raw.toLowerCase().endsWith(".json5")) return raw.replace(/\.json5$/i, "");
  return raw;
}

function resolveTargetAndConfig(projectRoot, targetNameOrConfig) {
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  const targets = listTargets(projectRoot);
  const input = targetNameOrConfig ? String(targetNameOrConfig).trim() : "";

  if (!input) {
    const msg = [
      "Missing target name.",
      "Available targets:",
      formatTargets(targets),
      "Tip: seal config diff <target>",
    ].join("\n");
    throw new Error(msg);
  }

  // Prefer explicit target name if it exists.
  const direct = loadTargetConfig(projectRoot, input);
  if (direct) {
    direct.cfg.appName = direct.cfg.appName || proj.appName;
    direct.cfg.serviceName = direct.cfg.serviceName || proj.appName;
    const cfgName = resolveConfigName(direct.cfg, null);
    const localCfg = getConfigFile(projectRoot, cfgName);
    return { targetName: input, targetCfg: direct.cfg, cfgName, localCfg };
  }

  // Fallback: treat argument as config name or config path.
  const cfgNameGuess = normalizeConfigArg(input);
  const matches = targets.filter((t) => t.cfgName === cfgNameGuess);
  if (matches.length === 1) {
    const match = matches[0];
    const t = loadTargetConfig(projectRoot, match.name);
    if (!t) throw new Error(`Missing target: ${match.name} (create: seal target add ${match.name})`);
    t.cfg.appName = t.cfg.appName || proj.appName;
    t.cfg.serviceName = t.cfg.serviceName || proj.appName;
    const cfgName = resolveConfigName(t.cfg, null);
    const localCfg = getConfigFile(projectRoot, cfgName);
    return { targetName: match.name, targetCfg: t.cfg, cfgName, localCfg };
  }

  if (matches.length > 1) {
    const msg = [
      `Config "${cfgNameGuess}" is used by multiple targets.`,
      "Pick one:",
      formatTargets(matches),
    ].join("\n");
    throw new Error(msg);
  }

  const msg = [
    `Missing target: ${input}`,
    cfgNameGuess ? `Tried config "${cfgNameGuess}" but no target uses it.` : null,
    "Available targets:",
    formatTargets(targets),
  ].filter(Boolean).join("\n");
  throw new Error(msg);
}

async function cmdConfigDiff(cwd, targetNameOrConfig) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetNameOrConfig);
  if (!fileExists(localCfg)) throw new Error(`Missing repo config: ${localCfg}`);

  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config diff is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configDiffSsh({ targetCfg, localConfigPath: localCfg });
}

async function cmdConfigPull(cwd, targetNameOrConfig, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetNameOrConfig);
  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config pull is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configPullSsh({ targetCfg, localConfigPath: localCfg, apply: !!opts.apply });
}

async function cmdConfigPush(cwd, targetNameOrConfig) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetNameOrConfig);
  if (!fileExists(localCfg)) throw new Error(`Missing repo config: ${localCfg}`);

  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config push is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configPushSsh({ targetCfg, localConfigPath: localCfg });
}

module.exports = { cmdConfigAdd, cmdConfigDiff, cmdConfigPull, cmdConfigPush };
