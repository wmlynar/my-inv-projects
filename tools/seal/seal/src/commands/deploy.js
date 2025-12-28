"use strict";

const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { loadProjectConfig, loadTargetConfig, loadPolicy, resolveTargetName, resolveConfigName, getConfigFile, findLastArtifact } = require("../lib/project");
const { normalizePackager, resolveThinConfig } = require("../lib/packagerConfig");
const { resolveSentinelConfig } = require("../lib/sentinelConfig");
const { installSentinelSsh, uninstallSentinelSsh } = require("../lib/sentinelOps");
const { fileExists } = require("../lib/fsextra");
const { info, warn, ok, hr } = require("../lib/ui");
const { resolveTiming } = require("../lib/timing");

const { cmdRelease } = require("./release");
const { buildFastRelease } = require("../lib/fastRelease");
const { deployLocal, deployLocalFast, bootstrapLocal, statusLocal, logsLocal, enableLocal, startLocal, restartLocal, stopLocal, disableLocalOnly, disableLocal, rollbackLocal, downLocal, uninstallLocal, runLocalForeground, ensureCurrentReleaseLocal, waitForReadyLocal, checkConfigDriftLocal } = require("../lib/deploy");
const { deploySsh, deploySshFast, bootstrapSsh, installServiceSsh, statusSsh, logsSsh, enableSsh, startSsh, restartSsh, stopSsh, disableSshOnly, disableSsh, rollbackSsh, downSsh, uninstallSsh, runSshForeground, ensureCurrentReleaseSsh, waitForReadySsh, checkConfigDriftSsh } = require("../lib/deploySsh");

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

function warnConfigDrift({ targetCfg, configFile, acceptDrift, pushConfig }) {
  const kind = (targetCfg.kind || "local").toLowerCase();
  const res = kind === "ssh"
    ? checkConfigDriftSsh({ targetCfg, localConfigPath: configFile, showDiff: false })
    : checkConfigDriftLocal({ targetCfg, localConfigPath: configFile, showDiff: false });

  if (!res || res.status === "same") return;
  if (res.status === "missing") {
    const pathLabel = res.path || "shared/config.json5";
    if (pushConfig) {
      warn(`Config missing on target (${pathLabel}). Will be created by --push-config.`);
    } else if (acceptDrift) {
      warn(`Config missing on target (${pathLabel}). Restart allowed by --accept-drift.`);
    } else {
      warn(`Config missing on target (${pathLabel}). Deploy will proceed; restart may fail unless you push config or use --accept-drift.`);
    }
    return;
  }
  if (res.status === "diff") {
    if (pushConfig) {
      warn("Config drift detected (preflight). Target config will be overwritten by --push-config.");
    } else if (acceptDrift) {
      warn("Config drift detected (preflight). Restart allowed by --accept-drift.");
    } else {
      warn("Config drift detected (preflight). Deploy will proceed; restart may fail unless you push config or use --accept-drift.");
    }
    return;
  }
  if (res.status === "error") {
    warn(`Config drift preflight failed: ${res.message || "unknown error"}`);
  }
}

function normalizeWaitMs(raw, fallback) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function normalizeWaitMode(raw, hasUrl) {
  if (!raw) return hasUrl ? "both" : "systemd";
  const mode = String(raw).toLowerCase();
  if (!["systemd", "http", "both"].includes(mode)) {
    throw new Error(`Invalid readiness mode: ${raw} (expected systemd|http|both)`);
  }
  return mode;
}

function resolveReadinessOptions(targetCfg, opts, defaults) {
  const cfg = (targetCfg.readiness && typeof targetCfg.readiness === "object")
    ? targetCfg.readiness
    : {};
  const url = opts.waitUrl ?? cfg.url ?? null;
  const mode = normalizeWaitMode(opts.waitMode ?? cfg.mode ?? null, !!url);
  const timeoutMs = normalizeWaitMs(opts.waitTimeout ?? cfg.timeoutMs, defaults.timeoutMs);
  const intervalMs = normalizeWaitMs(opts.waitInterval ?? cfg.intervalMs, defaults.intervalMs);
  const httpTimeoutMs = normalizeWaitMs(opts.waitHttpTimeout ?? cfg.httpTimeoutMs, defaults.httpTimeoutMs);
  return { mode, url, timeoutMs, intervalMs, httpTimeoutMs };
}

function resolveWaitEnabled(opts, targetCfg, defaultEnabled) {
  if (opts && typeof opts.wait === "boolean") return opts.wait;
  const cfg = (targetCfg.readiness && typeof targetCfg.readiness === "object") ? targetCfg.readiness : {};
  if (typeof cfg.enabled === "boolean") return cfg.enabled;
  return defaultEnabled;
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
  t.cfg._thinIntegrityEnabled = !!(thinCfg.integrity && thinCfg.integrity.enabled);
  t.cfg._thinIntegrityMode = thinCfg.integrity && thinCfg.integrity.mode ? thinCfg.integrity.mode : null;
  t.cfg._thinIntegrityFile = thinCfg.integrity && thinCfg.integrity.file ? thinCfg.integrity.file : null;
  return { proj, targetName, targetCfg: t.cfg, packagerSpec };
}

async function ensureArtifact(projectRoot, proj, opts, targetName, configName, timing) {
  if (opts.artifact) return { path: path.resolve(opts.artifact), built: false };

  // Prefer last artifact if exists and user didn't ask to rebuild.
  const last = findLastArtifact(projectRoot, proj.appName);
  if (last) return { path: last, built: false };

  // Build now
  await cmdRelease(projectRoot, targetName, { config: configName, skipCheck: false, packager: null, timing });
  const built = findLastArtifact(projectRoot, proj.appName);
  if (!built) throw new Error("Build produced no artifact");
  return { path: built, built: true };
}

function ensureFastRelease(projectRoot, proj, targetCfg, configName, opts, timing) {
  if (opts.artifact) {
    throw new Error("Fast deploy ignores --artifact (bundle is built locally).");
  }
  if (opts && opts.fastNoNodeModules) {
    warn("FAST mode ignores --fast-no-node-modules (bundle has no node_modules).");
  }
  return buildFastRelease({ projectRoot, projectCfg: proj, targetCfg, configName, timing });
}

async function cmdDeploy(cwd, targetArg, opts) {
  opts = opts || {};
  const { timing, report } = resolveTiming(opts.timing);
  const projectRoot = findProjectRoot(cwd);
  const { proj, targetName, targetCfg, packagerSpec } = resolveTarget(projectRoot, targetArg);
  const policy = loadPolicy(projectRoot);
  const sentinelCfg = resolveSentinelConfig({ projectRoot, projectCfg: proj, targetCfg, targetName, packagerSpec });
  const autoBootstrapEnabled = !(proj && proj.deploy && proj.deploy.autoBootstrap === false);
  const payloadOnly = !!opts.payloadOnly;

  const configName = resolveConfigName(targetCfg, null);
  const configFile = getConfigFile(projectRoot, configName);
  if (!fileExists(configFile)) throw new Error(`Missing repo config: ${configFile}`);
  if (opts.warnDrift) {
    warnConfigDrift({
      targetCfg,
      configFile,
      acceptDrift: !!opts.acceptDrift,
      pushConfig: !!opts.pushConfig,
    });
  }

  const isFast = !!opts.fast;
  const isSsh = (targetCfg.kind || "local").toLowerCase() === "ssh";
  if (payloadOnly && !isSsh) {
    throw new Error("Payload-only deploy is supported only for SSH targets");
  }
  if (payloadOnly && isFast) {
    throw new Error("Payload-only deploy is not supported with --fast");
  }
  if (payloadOnly && opts.bootstrap) {
    throw new Error("Payload-only deploy cannot be combined with --bootstrap");
  }
  if (payloadOnly && !opts.releaseDir) {
    throw new Error("Payload-only deploy requires a local releaseDir (use: seal ship <target> --payload-only)");
  }

  const fastRelease = isFast
    ? await timing.timeAsync("deploy.fast_build", async () => ensureFastRelease(projectRoot, proj, targetCfg, configName, opts, timing))
    : null;
  let artifactInfo = null;
  let artifactPath = null;
  if (!isFast && !payloadOnly) {
    artifactInfo = await timing.timeAsync("deploy.ensure_artifact", async () => ensureArtifact(projectRoot, proj, opts, targetName, configName, timing));
    artifactPath = artifactInfo ? artifactInfo.path : null;
  } else if (!isFast && opts.artifact) {
    artifactPath = path.resolve(opts.artifact);
  }

  hr();
  info(`Deploy -> ${targetName} (${targetCfg.kind})`);
  if (!isFast && !payloadOnly && artifactInfo && !artifactInfo.built) info(`Artifact: ${artifactPath}`);
  if (isFast) {
    warn("FAST mode: bundle synced via rsync (unsafe, no SEA).");
  }
  if (payloadOnly) {
    info("Payload-only deploy: updating thin payload only.");
  }
  hr();

  if (opts.bootstrap) {
    if ((targetCfg.kind || "local").toLowerCase() === "ssh") {
      timing.timeSync("deploy.bootstrap", () => bootstrapSsh(targetCfg));
    } else {
      timing.timeSync("deploy.bootstrap", () => bootstrapLocal(targetCfg));
    }
  }

  let autoBootstrap = false;
  if (isSsh) {
    info(`Auto bootstrap: ${autoBootstrapEnabled ? "enabled" : "disabled"} (deploy.autoBootstrap)`);
    let deployRes;
    if (isFast) {
      deployRes = deploySshFast({
        targetCfg,
        releaseDir: fastRelease.releaseDir,
        repoConfigPath: configFile,
        pushConfig: !!opts.pushConfig,
        bootstrap: !!opts.bootstrap,
        allowAutoBootstrap: autoBootstrapEnabled,
        buildId: fastRelease.buildId,
        timing,
      });
    } else {
      deployRes = deploySsh({
        targetCfg,
        artifactPath,
        repoConfigPath: configFile,
        pushConfig: !!opts.pushConfig,
        bootstrap: !!opts.bootstrap,
        policy,
        releaseDir: opts.releaseDir || null,
        buildId: opts.buildId || null,
        allowAutoBootstrap: autoBootstrapEnabled,
        payloadOnlyRequired: payloadOnly,
        timing,
      });
    }
    autoBootstrap = !!(deployRes && deployRes.autoBootstrap);
    const shouldInstall = !!opts.bootstrap || autoBootstrap;
    if (shouldInstall) {
      timing.timeSync("deploy.install_service", () => installServiceSsh(targetCfg, sentinelCfg));
      if (sentinelCfg.enabled) {
        timing.timeSync("deploy.install_sentinel", () => installSentinelSsh({
          targetCfg,
          sentinelCfg,
          force: false,
          insecure: false,
          skipVerify: !!opts.skipSentinelVerify,
        }));
      }
    }
  } else {
    if (isFast) {
      timing.timeSync("deploy.local.fast", () => deployLocalFast({
        targetCfg,
        releaseDir: fastRelease.releaseDir,
        repoConfigPath: configFile,
        pushConfig: !!opts.pushConfig,
        buildId: fastRelease.buildId,
      }));
    } else {
      timing.timeSync("deploy.local", () => deployLocal({
        targetCfg,
        artifactPath,
        repoConfigPath: configFile,
        pushConfig: !!opts.pushConfig,
        policy,
        bootstrap: !!opts.bootstrap,
      }));
    }
  }

  if (opts.restart) {
    timing.timeSync("deploy.config_drift", () => ensureConfigDriftOk({
      targetCfg,
      targetName,
      configFile,
      acceptDrift: !!opts.acceptDrift,
    }));
    hr();
    info("Restart requested (--restart)");
    if ((targetCfg.kind || "local").toLowerCase() === "ssh") {
      timing.timeSync("deploy.restart", () => restartSsh(targetCfg));
    } else {
      timing.timeSync("deploy.restart", () => restartLocal(targetCfg));
    }
  }

  const waitEnabled = resolveWaitEnabled(opts, targetCfg, false);
  if (waitEnabled) {
    if (!opts.restart) warn("Readiness wait requested without --restart; checking current service state.");
    const readiness = resolveReadinessOptions(targetCfg, opts, {
      timeoutMs: 60000,
      intervalMs: 1000,
      httpTimeoutMs: 2000,
    });
    hr();
    if ((targetCfg.kind || "local").toLowerCase() === "ssh") {
      await timing.timeAsync("deploy.wait", async () => waitForReadySsh(targetCfg, readiness));
    } else {
      await timing.timeAsync("deploy.wait", async () => waitForReadyLocal(targetCfg, readiness));
    }
  }

  console.log("");
  ok("Done.");
  console.log("Next:");
  if (!opts.bootstrap && !autoBootstrap) {
    console.log(`  seal deploy ${targetName} --bootstrap   # (once) install systemd service (explicit)`);
  }
  console.log(`  seal remote ${targetName} restart      # start/restart service (explicit)`);
  console.log(`  seal remote ${targetName} status`);
  console.log(`  seal remote ${targetName} logs`);
  if (report) timing.report({ title: "Deploy timing" });
}

async function cmdShip(cwd, targetArg, opts) {
  opts = opts || {};
  const { timing, report } = resolveTiming(opts.timing);
  if (opts.payloadOnly && opts.fast) {
    throw new Error("Payload-only build is not supported with --fast");
  }
  if (opts.fast) {
    if (opts.packager) warn("FAST mode ignores --packager.");
    if (opts.skipCheck) warn("FAST mode ignores --skip-check.");
    const deployOpts = {
      bootstrap: !!opts.bootstrap,
      pushConfig: !!opts.pushConfig,
      skipSentinelVerify: !!opts.skipSentinelVerify,
      restart: true,
      artifact: null,
      fast: true,
      fastNoNodeModules: !!opts.fastNoNodeModules,
      acceptDrift: !!opts.acceptDrift,
      warnDrift: !!opts.warnDrift,
      wait: opts.wait !== false,
      waitTimeout: opts.waitTimeout,
      waitInterval: opts.waitInterval,
      waitUrl: opts.waitUrl,
      waitMode: opts.waitMode,
      waitHttpTimeout: opts.waitHttpTimeout,
      timing,
    };
    await timing.timeAsync("ship.deploy", async () => cmdDeploy(cwd, targetArg, deployOpts));
    if (report) timing.report({ title: "Ship timing" });
    return;
  }

  const releaseOpts = {
    config: null,
    skipCheck: !!opts.skipCheck,
    checkVerbose: !!opts.checkVerbose,
    checkCc: opts.checkCc || null,
    packager: opts.packager || null,
    payloadOnly: !!opts.payloadOnly,
    timing,
  };
  const releaseRes = await timing.timeAsync("ship.release", async () => cmdRelease(cwd, targetArg, releaseOpts));
  const payloadOnly = !!(releaseRes && releaseRes.payloadOnly);

  const deployOpts = {
    bootstrap: !!opts.bootstrap,
    pushConfig: !!opts.pushConfig,
    restart: true,
    artifact: releaseRes && releaseRes.artifactPath ? releaseRes.artifactPath : null,
    releaseDir: releaseRes && releaseRes.releaseDir ? releaseRes.releaseDir : null,
    buildId: releaseRes && releaseRes.buildId ? releaseRes.buildId : null,
    acceptDrift: !!opts.acceptDrift,
    warnDrift: !!opts.warnDrift,
    payloadOnly,
    wait: opts.wait !== false,
    waitTimeout: opts.waitTimeout,
    waitInterval: opts.waitInterval,
    waitUrl: opts.waitUrl,
    waitMode: opts.waitMode,
    waitHttpTimeout: opts.waitHttpTimeout,
    timing,
  };
  await timing.timeAsync("ship.deploy", async () => cmdDeploy(cwd, targetArg, deployOpts));
  if (report) timing.report({ title: "Ship timing" });
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
          installSentinelSsh({
            targetCfg,
            sentinelCfg,
            force: false,
            insecure: false,
            skipVerify: !!(opts && opts.skipSentinelVerify),
          });
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
