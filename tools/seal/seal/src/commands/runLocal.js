"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSyncSafe } = require("../lib/spawn");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, resolveTargetName, loadTargetConfig, resolveConfigName, getConfigFile } = require("../lib/project");
const { fileExists } = require("../lib/fsextra");
const { info, warn, ok, hr } = require("../lib/ui");

async function cmdRunLocal(cwd, opts) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal-config/project.json5. Zrób: seal init");

  if (!opts.sealed) {
    // Dev run: node entry
    hr();
    info("DEV run (node)");
    hr();
    if (!fileExists(paths.runtimeConfigPath)) {
      warn("Missing config.runtime.json5. Copying from config/local.json5");
      const localCfg = path.join(paths.configDir, "local.json5");
      if (!fileExists(localCfg)) throw new Error("Missing config/local.json5");
      fs.copyFileSync(localCfg, paths.runtimeConfigPath);
    }
    const res = spawnSyncSafe("node", [proj.entry], { cwd: projectRoot, stdio: "inherit" });
    if (!res.ok) throw new Error(`node run failed (status=${res.status})`);
    return;
  }

  const releaseDir = path.join(paths.outDir, "release");
  if (!fileExists(releaseDir)) {
    throw new Error("Missing seal-out/release. Build first: seal release");
  }

  // Determine config to copy
  const targetName = resolveTargetName(projectRoot, "local");
  const t = loadTargetConfig(projectRoot, targetName);
  const targetCfg = t ? t.cfg : { target: "local", config: "local" };
  const configName = resolveConfigName(targetCfg, opts.config);
  const configFile = getConfigFile(projectRoot, configName);

  if (!fileExists(configFile)) throw new Error(`Missing config file: ${configFile}`);

  // Copy runtime config into release dir
  fs.copyFileSync(configFile, path.join(releaseDir, "config.runtime.json5"));

  hr();
  info(`Sealed run from: ${releaseDir}`);
  hr();

  // Prefer appctl if present (it enforces config/runtime in CWD)
const appctl = path.join(releaseDir, "appctl");
if (fileExists(appctl)) {
  const res = spawnSyncSafe("bash", [appctl, "run"], { cwd: releaseDir, stdio: "inherit" });
  if (!res.ok) throw new Error(`sealed run failed (status=${res.status})`);
  return;
}

// Otherwise, run the binary/script directly
const bin = path.join(releaseDir, proj.appName);
if (!fileExists(bin)) throw new Error(`Missing executable: ${bin}`);
const res = spawnSyncSafe(bin, [], { cwd: releaseDir, stdio: "inherit" });
if (!res.ok) throw new Error(`sealed run failed (status=${res.status})`);
}

module.exports = { cmdRunLocal };
