"use strict";

const path = require("path");
const fs = require("fs");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile, findLastArtifact } = require("../lib/project");
const { fileExists } = require("../lib/fsextra");
const { info, warn, ok, hr } = require("../lib/ui");

const { cmdRelease } = require("./release");
const { deployLocal, bootstrapLocal, statusLocal, logsLocal, enableLocal, startLocal, restartLocal, stopLocal, disableLocalOnly, disableLocal, rollbackLocal, downLocal, uninstallLocal, runLocalForeground } = require("../lib/deploy");
const { deploySsh, bootstrapSsh, installServiceSsh, statusSsh, logsSsh, enableSsh, startSsh, restartSsh, stopSsh, disableSshOnly, disableSsh, rollbackSsh, downSsh, uninstallSsh, runSshForeground } = require("../lib/deploySsh");

function resolveTarget(projectRoot, targetArg) {
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal-config/project.json5. Zrób: seal init");
  const targetName = resolveTargetName(projectRoot, targetArg);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);
  t.cfg.appName = proj.appName;
  t.cfg.serviceName = t.cfg.serviceName || proj.appName;
  t.cfg.installDir = t.cfg.installDir || (t.cfg.kind === "ssh" ? `/opt/${proj.appName}` : `~/.local/share/seal/${proj.appName}`);
  return { proj, targetName, targetCfg: t.cfg };
}

async function ensureArtifact(projectRoot, proj, opts, targetName, configName) {
  if (opts.artifact) return path.resolve(opts.artifact);

  // Prefer last artifact if exists and user didn't ask to rebuild.
  const last = findLastArtifact(projectRoot, proj.appName);
  if (last) return last;

  // Build now
  await cmdRelease(projectRoot, targetName, { config: configName, skipCheck: false, packager: null });
  const built = findLastArtifact(projectRoot, proj.appName);
  if (!built) throw new Error("Build produced no artifact");
  return built;
}

async function cmdDeploy(cwd, targetArg, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { proj, targetName, targetCfg } = resolveTarget(projectRoot, targetArg);

  const configName = resolveConfigName(targetCfg, null);
  const configFile = getConfigFile(projectRoot, configName);
  if (!fileExists(configFile)) throw new Error(`Missing repo config: ${configFile}`);

  const artifactPath = await ensureArtifact(projectRoot, proj, opts, targetName, configName);

  hr();
  info(`Deploy -> ${targetName} (${targetCfg.kind})`);
  info(`Artifact: ${artifactPath}`);
  hr();

  if (opts.bootstrap) {
    if ((targetCfg.kind || "local").toLowerCase() === "ssh") bootstrapSsh(targetCfg);
    else bootstrapLocal(targetCfg);
  }

  if ((targetCfg.kind || "local").toLowerCase() === "ssh") {
    deploySsh({ targetCfg, artifactPath, repoConfigPath: configFile, pushConfig: !!opts.pushConfig, bootstrap: !!opts.bootstrap });
    if (opts.bootstrap) installServiceSsh(targetCfg);
  } else {
    deployLocal({ targetCfg, artifactPath, repoConfigPath: configFile, pushConfig: !!opts.pushConfig });
  }

  if (opts.restart) {
    hr();
    info("Restart requested (--restart)");
    if ((targetCfg.kind || "local").toLowerCase() === "ssh") restartSsh(targetCfg);
    else restartLocal(targetCfg);
  }

  console.log("");
  ok("Done.");
  console.log("Next:");
  console.log(`  seal deploy ${targetName} --bootstrap   # (once) install systemd service (explicit)`);
  console.log(`  seal restart ${targetName}             # start/restart service (explicit)`);
  console.log(`  seal status ${targetName}`);
  console.log(`  seal logs ${targetName}`);
}

async function cmdStatus(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, targetName } = resolveTarget(projectRoot, targetArg);
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") statusSsh(targetCfg);
  else statusLocal(targetCfg);
}

async function cmdLogs(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg } = resolveTarget(projectRoot, targetArg);
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") logsSsh(targetCfg);
  else logsLocal(targetCfg);
}

async function cmdRestart(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg } = resolveTarget(projectRoot, targetArg);
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") restartSsh(targetCfg);
  else restartLocal(targetCfg);
}

async function cmdDisable(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg } = resolveTarget(projectRoot, targetArg);
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") disableSsh(targetCfg);
  else disableLocal(targetCfg);
}

async function cmdRollback(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg } = resolveTarget(projectRoot, targetArg);
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") rollbackSsh(targetCfg);
  else rollbackLocal(targetCfg);
}

async function cmdUninstall(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg } = resolveTarget(projectRoot, targetArg);
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") uninstallSsh(targetCfg);
  else uninstallLocal(targetCfg);
}

async function cmdRunRemote(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg } = resolveTarget(projectRoot, targetArg);
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") runSshForeground(targetCfg);
  else runLocalForeground(targetCfg);
}

async function cmdRemote(cwd, targetArg, action) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, targetName } = resolveTarget(projectRoot, targetArg);
  const kind = (targetCfg.kind || "local").toLowerCase();
  const act = (action || "").toLowerCase();
  const allowed = ["up", "enable", "start", "restart", "stop", "disable", "down", "status", "logs"];

  if (!act) {
    throw new Error(`Missing action. Use: seal remote ${targetName} <${allowed.join("|")}>`);
  }
  if (!allowed.includes(act)) {
    throw new Error(`Unknown action: ${act}. Use: seal remote ${targetName} <${allowed.join("|")}>`);
  }

  const isSsh = kind === "ssh";

  switch (act) {
    case "up":
      if (isSsh) {
        bootstrapSsh(targetCfg);
        installServiceSsh(targetCfg);
        enableSsh(targetCfg);
        startSsh(targetCfg);
      } else {
        bootstrapLocal(targetCfg);
      }
      return;
    case "enable":
      if (isSsh) enableSsh(targetCfg);
      else enableLocal(targetCfg);
      return;
    case "start":
      if (isSsh) startSsh(targetCfg);
      else startLocal(targetCfg);
      return;
    case "restart":
      if (isSsh) restartSsh(targetCfg);
      else restartLocal(targetCfg);
      return;
    case "stop":
      if (isSsh) stopSsh(targetCfg);
      else stopLocal(targetCfg);
      return;
    case "disable":
      if (isSsh) disableSshOnly(targetCfg);
      else disableLocalOnly(targetCfg);
      return;
    case "down":
      if (isSsh) downSsh(targetCfg);
      else downLocal(targetCfg);
      return;
    case "status":
      if (isSsh) statusSsh(targetCfg);
      else statusLocal(targetCfg);
      return;
    case "logs":
      if (isSsh) logsSsh(targetCfg);
      else logsLocal(targetCfg);
      return;
    default:
      return;
  }
}

module.exports = {
  cmdDeploy,
  cmdStatus,
  cmdLogs,
  cmdRestart,
  cmdDisable,
  cmdRollback,
  cmdUninstall,
  cmdRunRemote,
  cmdRemote,
};
