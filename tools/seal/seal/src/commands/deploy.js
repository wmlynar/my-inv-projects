"use strict";

const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { loadProjectConfig, loadTargetConfig, loadPolicy, resolveTargetName, resolveConfigName, getConfigFile, findLastArtifact } = require("../lib/project");
const { normalizePackager, resolveThinConfig } = require("../lib/packagerConfig");
const { resolveSentinelConfig } = require("../lib/sentinelConfig");
const { installSentinelSsh, uninstallSentinelSsh } = require("../lib/sentinelOps");
const { fileExists } = require("../lib/fsextra");
const { info, warn, ok, hr } = require("../lib/ui");

const { cmdRelease } = require("./release");
const { buildFastRelease } = require("../lib/fastRelease");
const { deployLocal, deployLocalFast, bootstrapLocal, statusLocal, logsLocal, enableLocal, startLocal, restartLocal, stopLocal, disableLocalOnly, disableLocal, rollbackLocal, downLocal, uninstallLocal, runLocalForeground, ensureCurrentReleaseLocal, checkConfigDriftLocal } = require("../lib/deploy");
const { deploySsh, deploySshFast, bootstrapSsh, installServiceSsh, statusSsh, logsSsh, enableSsh, startSsh, restartSsh, stopSsh, disableSshOnly, disableSsh, rollbackSsh, downSsh, uninstallSsh, runSshForeground, ensureCurrentReleaseSsh, checkConfigDriftSsh } = require("../lib/deploySsh");

function ensureConfigDriftOk({ targetCfg, targetName, configFile, acceptDrift }) {
  if (acceptDrift) {
    warn("Config drift allowed (--accept-drift). Skipping diff.");
    return;
  }

  if (!fileExists(configFile)) throw new Error(`Missing repo config: ${configFile}`);

  const kind = (targetCfg.kind || "local").toLowerCase();
  info(`Config drift check (${targetName})`);
  const res = kind === "ssh"
    ? checkConfigDriftSsh({ targetCfg, localConfigPath: configFile })
    : checkConfigDriftLocal({ targetCfg, localConfigPath: configFile });

  if (!res || res.status === "same") return;
  if (res.status === "missing") {
    warn(`Config missing on target (${res.path || "shared/config.json5"}).`);
    throw new Error(`Refusing to start with missing config. Fix: seal config push ${targetName} (or deploy --push-config), or rerun with --accept-drift.`);
  }
  if (res.status === "diff") {
    warn("Config drift detected (repo vs target).");
    throw new Error(`Refusing to start with config drift. Fix: seal config push ${targetName} (or deploy --push-config), or rerun with --accept-drift.`);
  }
  if (res.status === "error") {
    throw new Error(res.message || "Config drift check failed");
  }
}

function resolveTarget(projectRoot, targetArg) {
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Jeśli to root monorepo z listą projects, uruchom polecenie w root (wykona się dla podprojektów) albo przejdź do podprojektu.");
  const targetName = resolveTargetName(projectRoot, targetArg);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);
  t.cfg.appName = proj.appName;
  t.cfg.serviceName = t.cfg.serviceName || proj.appName;
  t.cfg.installDir = t.cfg.installDir || (t.cfg.kind === "ssh" ? `/home/admin/apps/${proj.appName}` : `~/.local/share/seal/${proj.appName}`);
  const thinCfg = resolveThinConfig(t.cfg, proj);
  const packagerSpec = normalizePackager(t.cfg.packager || proj.build.packager || "auto");
  t.cfg._thinMode = (packagerSpec.kind === "thin" && packagerSpec.thinMode) ? packagerSpec.thinMode : thinCfg.mode;
  return { proj, targetName, targetCfg: t.cfg, packagerSpec };
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
    throw new Error("Fast deploy ignores --artifact (bundle is built locally).");
  }
  if (opts && opts.fastNoNodeModules) {
    warn("FAST mode ignores --fast-no-node-modules (bundle has no node_modules).");
  }
  return buildFastRelease({ projectRoot, projectCfg: proj, targetCfg, configName });
}

async function cmdDeploy(cwd, targetArg, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { proj, targetName, targetCfg, packagerSpec } = resolveTarget(projectRoot, targetArg);
  const policy = loadPolicy(projectRoot);
  const sentinelCfg = resolveSentinelConfig({ projectRoot, projectCfg: proj, targetCfg, targetName, packagerSpec });

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
    warn("FAST mode: bundle synced via rsync (unsafe, no SEA).");
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
    if (opts.bootstrap) {
      installServiceSsh(targetCfg, sentinelCfg);
      if (sentinelCfg.enabled) {
        installSentinelSsh({ targetCfg, sentinelCfg, force: false, insecure: false });
      }
    }
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
    ensureConfigDriftOk({
      targetCfg,
      targetName,
      configFile,
      acceptDrift: !!opts.acceptDrift,
    });
    hr();
    info("Restart requested (--restart)");
    if ((targetCfg.kind || "local").toLowerCase() === "ssh") restartSsh(targetCfg);
    else restartLocal(targetCfg);
  }

  console.log("");
  ok("Done.");
  console.log("Next:");
  console.log(`  seal deploy ${targetName} --bootstrap   # (once) install systemd service (explicit)`);
  console.log(`  seal remote ${targetName} restart      # start/restart service (explicit)`);
  console.log(`  seal remote ${targetName} status`);
  console.log(`  seal remote ${targetName} logs`);
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
      acceptDrift: !!opts.acceptDrift,
    };
    await cmdDeploy(cwd, targetArg, deployOpts);
    return;
  }

  const releaseOpts = {
    config: null,
    skipCheck: !!opts.skipCheck,
    checkVerbose: !!opts.checkVerbose,
    checkCc: opts.checkCc || null,
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
    acceptDrift: !!opts.acceptDrift,
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

async function cmdRollback(cwd, targetArg, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, targetName } = resolveTarget(projectRoot, targetArg);
  const configName = resolveConfigName(targetCfg, null);
  const configFile = getConfigFile(projectRoot, configName);
  ensureConfigDriftOk({
    targetCfg,
    targetName,
    configFile,
    acceptDrift: !!(opts && opts.acceptDrift),
  });
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") rollbackSsh(targetCfg);
  else rollbackLocal(targetCfg);
}

async function cmdUninstall(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const { proj, targetName, targetCfg, packagerSpec } = resolveTarget(projectRoot, targetArg);
  const sentinelCfg = resolveSentinelConfig({ projectRoot, projectCfg: proj, targetCfg, targetName, packagerSpec });
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") {
    if (sentinelCfg.enabled) {
      uninstallSentinelSsh({ targetCfg, sentinelCfg });
    }
    uninstallSsh(targetCfg);
  } else {
    uninstallLocal(targetCfg);
  }
}

async function cmdRunRemote(cwd, targetArg, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, targetName } = resolveTarget(projectRoot, targetArg);
  const configName = resolveConfigName(targetCfg, null);
  const configFile = getConfigFile(projectRoot, configName);
  ensureConfigDriftOk({
    targetCfg,
    targetName,
    configFile,
    acceptDrift: !!(opts && opts.acceptDrift),
  });
  const runOpts = { kill: !!(opts && opts.kill), sudo: !!(opts && opts.sudo) };
  if ((targetCfg.kind || "local").toLowerCase() === "ssh") runSshForeground(targetCfg, runOpts);
  else runLocalForeground(targetCfg, runOpts);
}

async function cmdRemote(cwd, targetArg, action, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { proj, targetCfg, targetName, packagerSpec } = resolveTarget(projectRoot, targetArg);
  const sentinelCfg = resolveSentinelConfig({ projectRoot, projectCfg: proj, targetCfg, targetName, packagerSpec });
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
  const isStartAction = act === "up" || act === "start" || act === "restart";
  if (isStartAction) {
    const configName = resolveConfigName(targetCfg, null);
    const configFile = getConfigFile(projectRoot, configName);
    ensureConfigDriftOk({
      targetCfg,
      targetName,
      configFile,
      acceptDrift: !!(opts && opts.acceptDrift),
    });
  }

  switch (act) {
    case "up":
      if (isSsh) {
        bootstrapSsh(targetCfg);
        ensureCurrentReleaseSsh(targetCfg);
        installServiceSsh(targetCfg, sentinelCfg);
        if (sentinelCfg.enabled) {
          installSentinelSsh({ targetCfg, sentinelCfg, force: false, insecure: false });
        }
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
