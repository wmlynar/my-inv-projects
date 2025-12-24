"use strict";

const path = require("path");
const fs = require("fs");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, loadPolicy, resolveTargetName, resolveConfigName, getConfigFile, findLastArtifact } = require("../lib/project");
const { fileExists } = require("../lib/fsextra");
const { info, warn, ok, hr } = require("../lib/ui");

const { cmdRelease } = require("./release");
const { buildFastRelease } = require("../lib/fastRelease");
const { deployLocal, deployLocalFast, bootstrapLocal, statusLocal, logsLocal, enableLocal, startLocal, restartLocal, stopLocal, disableLocalOnly, disableLocal, rollbackLocal, downLocal, uninstallLocal, runLocalForeground, ensureCurrentReleaseLocal } = require("../lib/deploy");
const { deploySsh, deploySshFast, bootstrapSsh, installServiceSsh, statusSsh, logsSsh, enableSsh, startSsh, restartSsh, stopSsh, disableSshOnly, disableSsh, rollbackSsh, downSsh, uninstallSsh, runSshForeground, ensureCurrentReleaseSsh } = require("../lib/deploySsh");

function resolveTarget(projectRoot, targetArg) {
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal-config/project.json5. Zrób: seal init");
  const targetName = resolveTargetName(projectRoot, targetArg);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);
  t.cfg.appName = proj.appName;
  t.cfg.serviceName = t.cfg.serviceName || proj.appName;
  t.cfg.installDir = t.cfg.installDir || (t.cfg.kind === "ssh" ? `/home/admin/apps/${proj.appName}` : `~/.local/share/seal/${proj.appName}`);
  t.cfg.thinMode = t.cfg.thinMode || proj.build?.thinMode || "aio";
  return { proj, targetName, targetCfg: t.cfg };
}

async function ensureArtifact(projectRoot, proj, opts, targetName, configName) {
  if (opts.artifact) return { path: path.resolve(opts.artifact), built: false };

  // Prefer last artifact if exists and user didn't ask to rebuild.
  const last = findLastArtifact(projectRoot, proj.appName);
  if (last) return { path: last, built: false };

  // Build now
  await cmdRelease(projectRoot, targetName, { config: configName, skipCheck: false, packager: null });
  const built = findLastArtifact(projectRoot, proj.appName);
  if (!built) throw new Error("Build produced no artifact");
  return { path: built, built: true };
}

function ensureFastRelease(projectRoot, proj, targetCfg, configName, opts) {
  if (opts.artifact) {
    throw new Error("Fast deploy ignores --artifact (fallback bundle is built locally).");
  }
  if (opts && opts.fastNoNodeModules) {
    warn("FAST mode ignores --fast-no-node-modules (fallback bundle has no node_modules).");
  }
  return buildFastRelease({ projectRoot, projectCfg: proj, targetCfg, configName });
}

async function cmdDeploy(cwd, targetArg, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { proj, targetName, targetCfg } = resolveTarget(projectRoot, targetArg);
  const policy = loadPolicy(projectRoot);

  const configName = resolveConfigName(targetCfg, null);
  const configFile = getConfigFile(projectRoot, configName);
  if (!fileExists(configFile)) throw new Error(`Missing repo config: ${configFile}`);

  const isFast = !!opts.fast;
  const fastRelease = isFast ? await ensureFastRelease(projectRoot, proj, targetCfg, configName, opts) : null;
  const artifactInfo = isFast
    ? null
    : await ensureArtifact(projectRoot, proj, opts, targetName, configName);
  const artifactPath = isFast ? null : artifactInfo.path;

  hr();
  info(`Deploy -> ${targetName} (${targetCfg.kind})`);
  if (!isFast && !artifactInfo.built) info(`Artifact: ${artifactPath}`);
  if (isFast) {
    warn("FAST mode: fallback bundle synced via rsync (unsafe, no SEA).");
  }
  hr();

  if (opts.bootstrap) {
    if ((targetCfg.kind || "local").toLowerCase() === "ssh") bootstrapSsh(targetCfg);
    else bootstrapLocal(targetCfg);
  }

  if ((targetCfg.kind || "local").toLowerCase() === "ssh") {
    if (isFast) {
      deploySshFast({
        targetCfg,
        releaseDir: fastRelease.releaseDir,
        repoConfigPath: configFile,
        pushConfig: !!opts.pushConfig,
        bootstrap: !!opts.bootstrap,
        buildId: fastRelease.buildId,
      });
    } else {
      deploySsh({
        targetCfg,
        artifactPath,
        repoConfigPath: configFile,
        pushConfig: !!opts.pushConfig,
        bootstrap: !!opts.bootstrap,
        policy,
        releaseDir: opts.releaseDir || null,
        buildId: opts.buildId || null,
      });
    }
    if (opts.bootstrap) installServiceSsh(targetCfg);
  } else {
    if (isFast) {
      deployLocalFast({
        targetCfg,
        releaseDir: fastRelease.releaseDir,
        repoConfigPath: configFile,
        pushConfig: !!opts.pushConfig,
        buildId: fastRelease.buildId,
      });
    } else {
      deployLocal({ targetCfg, artifactPath, repoConfigPath: configFile, pushConfig: !!opts.pushConfig, policy, bootstrap: !!opts.bootstrap });
    }
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

async function cmdShip(cwd, targetArg, opts) {
  if (opts.fast) {
    if (opts.packager) warn("FAST mode ignores --packager.");
    if (opts.skipCheck) warn("FAST mode ignores --skip-check.");
    const deployOpts = {
      bootstrap: !!opts.bootstrap,
      pushConfig: !!opts.pushConfig,
      restart: true,
      artifact: null,
      fast: true,
      fastNoNodeModules: !!opts.fastNoNodeModules,
    };
    await cmdDeploy(cwd, targetArg, deployOpts);
    return;
  }

  const releaseOpts = {
    config: null,
    skipCheck: !!opts.skipCheck,
    packager: opts.packager || null,
  };
  const releaseRes = await cmdRelease(cwd, targetArg, releaseOpts);

  const deployOpts = {
    bootstrap: !!opts.bootstrap,
    pushConfig: !!opts.pushConfig,
    restart: true,
    artifact: releaseRes && releaseRes.artifactPath ? releaseRes.artifactPath : null,
    releaseDir: releaseRes && releaseRes.releaseDir ? releaseRes.releaseDir : null,
    buildId: releaseRes && releaseRes.buildId ? releaseRes.buildId : null,
  };
  await cmdDeploy(cwd, targetArg, deployOpts);
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

async function cmdRunRemote(cwd, targetArg, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg } = resolveTarget(projectRoot, targetArg);
  const runOpts = { kill: !!(opts && opts.kill), sudo: !!(opts && opts.sudo) };
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") runSshForeground(targetCfg, runOpts);
  else runLocalForeground(targetCfg, runOpts);
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
        ensureCurrentReleaseSsh(targetCfg);
        installServiceSsh(targetCfg);
        enableSsh(targetCfg);
        startSsh(targetCfg);
      } else {
        ensureCurrentReleaseLocal(targetCfg);
        bootstrapLocal(targetCfg);
        enableLocal(targetCfg);
        startLocal(targetCfg);
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
  cmdShip,
  cmdStatus,
  cmdLogs,
  cmdRestart,
  cmdDisable,
  cmdRollback,
  cmdUninstall,
  cmdRunRemote,
  cmdRemote,
};
