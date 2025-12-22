"use strict";

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile } = require("../lib/project");
const { ensureDir, fileExists, safeWriteFile } = require("../lib/fsextra");
const { ok, warn, info, hr } = require("../lib/ui");
const { writeJson5 } = require("../lib/json5io");
const { configDiffSsh, configPullSsh, configPushSsh } = require("../lib/deploySsh");

function templateConfig(name, appName) {
  // Very similar to local; user can tweak ports/log levels.
  return `// config/${name}.json5 – runtime config
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
  if (!proj) throw new Error("Brak seal-config/project.json5. Zrób: seal init");

  ensureDir(paths.configDir);
  const file = path.join(paths.configDir, `${name}.json5`);
  if (fileExists(file)) {
    warn(`Config already exists: ${file}`);
    return;
  }
  safeWriteFile(file, templateConfig(name, proj.appName), { force: false });
  ok(`Created config: ${file}`);
}

function resolveTargetAndConfig(projectRoot, targetName) {
  const tName = resolveTargetName(projectRoot, targetName);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal-config/project.json5. Zrób: seal init");
  const t = loadTargetConfig(projectRoot, tName);
  if (!t) throw new Error(`Missing target: ${tName} (create: seal target add ${tName})`);
  t.cfg.appName = t.cfg.appName || proj.appName;
  t.cfg.serviceName = t.cfg.serviceName || proj.appName;
  const cfgName = resolveConfigName(t.cfg, null);
  const localCfg = getConfigFile(projectRoot, cfgName);
  return { targetName: tName, targetCfg: t.cfg, cfgName, localCfg };
}

async function cmdConfigDiff(cwd, targetName) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetName);
  if (!fileExists(localCfg)) throw new Error(`Missing repo config: ${localCfg}`);

  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config diff is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configDiffSsh({ targetCfg, localConfigPath: localCfg });
}

async function cmdConfigPull(cwd, targetName, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetName);
  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config pull is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configPullSsh({ targetCfg, localConfigPath: localCfg, apply: !!opts.apply });
}

async function cmdConfigPush(cwd, targetName) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetName);
  if (!fileExists(localCfg)) throw new Error(`Missing repo config: ${localCfg}`);

  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config push is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configPushSsh({ targetCfg, localConfigPath: localCfg });
}

module.exports = { cmdConfigAdd, cmdConfigDiff, cmdConfigPull, cmdConfigPush };
