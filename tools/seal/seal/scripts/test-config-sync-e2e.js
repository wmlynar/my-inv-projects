#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { cmdConfigAdd, cmdConfigDiff, cmdConfigPull, cmdConfigPush } = require("../src/commands/config");
const { bootstrapSsh } = require("../src/lib/deploySsh");
const { sshExec, scpFrom, formatSshFailure } = require("../src/lib/ssh");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { hasCommand, resolveExampleRoot, createLogger, resolveTmpRoot } = require("./e2e-utils");

const EXAMPLE_ROOT = resolveExampleRoot();
const { log, fail, skip } = createLogger("config-sync-e2e");

function readFileMaybe(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

function writeTargetConfig(targetName, cfg) {
  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  writeJson5(targetPath, cfg);
  return targetPath;
}

function cleanupTargetConfig(targetName, backup) {
  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  if (backup !== null && backup !== undefined) {
    fs.writeFileSync(targetPath, backup, "utf-8");
    return;
  }
  fs.rmSync(targetPath, { force: true });
}

function shellQuote(str) {
  return "'" + String(str).replace(/'/g, "'\\''") + "'";
}

function remoteLayout(targetCfg) {
  const installDir = targetCfg.installDir || `/home/admin/apps/${targetCfg.appName || "app"}`;
  return {
    installDir,
    releasesDir: `${installDir}/releases`,
    sharedDir: `${installDir}/shared`,
  };
}

async function captureOutput(fn) {
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  let out = "";
  let err = "";
  process.stdout.write = (chunk, encoding, cb) => {
    out += chunk;
    return origOut(chunk, encoding, cb);
  };
  process.stderr.write = (chunk, encoding, cb) => {
    err += chunk;
    return origErr(chunk, encoding, cb);
  };
  try {
    const result = await fn();
    return { out, err, result };
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
}

function updateConfigMarker(configPath, marker, port) {
  const cfg = readJson5(configPath) || {};
  cfg.e2e = { marker };
  cfg.http = cfg.http || {};
  if (Number.isFinite(port)) cfg.http.port = port;
  writeJson5(configPath, cfg);
}

function readConfigMarker(configPath) {
  const cfg = readJson5(configPath) || {};
  return cfg.e2e ? cfg.e2e.marker || "" : "";
}

async function main() {
  if (process.env.SEAL_CONFIG_SYNC_E2E !== "1") {
    skip("set SEAL_CONFIG_SYNC_E2E=1 to run config sync E2E");
    process.exit(77);
  }
  if (process.env.SEAL_SHIP_SSH_E2E !== "1") {
    skip("set SEAL_SHIP_SSH_E2E=1 to run SSH config sync");
    process.exit(77);
  }
  if (!hasCommand("ssh") || !hasCommand("scp")) {
    skip("ssh/scp not available");
    process.exit(77);
  }

  const host = process.env.SEAL_SHIP_SSH_HOST;
  const user = process.env.SEAL_SHIP_SSH_USER;
  const installDir = process.env.SEAL_SHIP_SSH_INSTALL_DIR;
  const serviceName = process.env.SEAL_SHIP_SSH_SERVICE_NAME;
  const sshPort = process.env.SEAL_SHIP_SSH_PORT ? Number(process.env.SEAL_SHIP_SSH_PORT) : null;
  if (!host || !user || !installDir || !serviceName) {
    skip("missing SSH env (SEAL_SHIP_SSH_HOST/USER/INSTALL_DIR/SERVICE_NAME)");
    process.exit(77);
  }

  const ping = sshExec({
    user,
    host,
    args: ["bash", "-lc", "echo __SEAL_OK__"],
    stdio: "pipe",
    sshPort,
  });
  if (!ping.ok || !(ping.stdout || "").includes("__SEAL_OK__")) {
    skip(`ssh not available${formatSshFailure(ping) || ""}`);
    process.exit(77);
  }
  const sudoCheck = sshExec({
    user,
    host,
    args: ["bash", "-lc", "sudo -n true"],
    stdio: "pipe",
    sshPort,
  });
  if (!sudoCheck.ok) {
    skip(`passwordless sudo not available${formatSshFailure(sudoCheck) || ""}`);
    process.exit(77);
  }

  const configName = `sync-ssh-${process.pid}`;
  const configPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", `${configName}.json5`);
  const configBackup = readFileMaybe(configPath);
  const targetName = `config-sync-ssh-${Date.now()}-${process.pid}`;
  const targetCfg = {
    target: targetName,
    kind: "ssh",
    host,
    user,
    serviceScope: "system",
    installDir,
    serviceName,
    sshPort: Number.isFinite(sshPort) ? sshPort : undefined,
    packager: "thin-split",
    config: configName,
  };
  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const targetBackup = readFileMaybe(targetPath);
  const tmpPullPath = path.join(resolveTmpRoot(), `${serviceName}-remote-config.json5`);
  const remoteBackupPath = path.join(resolveTmpRoot(), `${targetName}-remote-config.json5`);
  let hadRemoteBackup = false;

  try {
    if (!configBackup) {
      await cmdConfigAdd(EXAMPLE_ROOT, configName);
    }
    assert.ok(fs.existsSync(configPath), `config add failed (${configPath})`);

    const markerA = `sync-a-${Date.now()}-${process.pid}`;
    updateConfigMarker(configPath, markerA, 3200 + (process.pid % 500));

    writeTargetConfig(targetName, targetCfg);
    bootstrapSsh(targetCfg);

    const layout = remoteLayout(targetCfg);
    const remoteConfig = `${layout.sharedDir}/config.json5`;
    const exists = sshExec({
      user,
      host,
      args: ["bash", "-lc", `test -f ${shellQuote(remoteConfig)} && echo __SEAL_HAVE__`],
      stdio: "pipe",
      sshPort,
    });
    if (exists.ok && (exists.stdout || "").includes("__SEAL_HAVE__")) {
      const scpRes = scpFrom({
        user,
        host,
        remotePath: remoteConfig,
        localPath: remoteBackupPath,
        sshPort,
      });
      if (!scpRes.ok) {
        throw new Error(`failed to backup remote config${formatSshFailure(scpRes) || ""}`);
      }
      hadRemoteBackup = true;
    }

    await cmdConfigPush(EXAMPLE_ROOT, targetName);
    const cleanDiff = await captureOutput(() => cmdConfigDiff(EXAMPLE_ROOT, targetName));
    if ((cleanDiff.out + cleanDiff.err).trim()) {
      throw new Error("expected config diff to be empty after push");
    }

    const markerB = `sync-b-${Date.now()}-${process.pid}`;
    updateConfigMarker(configPath, markerB, 3300 + (process.pid % 500));
    const dirtyDiff = await captureOutput(() => cmdConfigDiff(EXAMPLE_ROOT, targetName));
    const diffOut = (dirtyDiff.out + dirtyDiff.err);
    if (!/---/.test(diffOut) || !/\+\+\+/.test(diffOut)) {
      throw new Error("expected diff output after local change");
    }

    await cmdConfigPush(EXAMPLE_ROOT, targetName);
    const cleanDiff2 = await captureOutput(() => cmdConfigDiff(EXAMPLE_ROOT, targetName));
    if ((cleanDiff2.out + cleanDiff2.err).trim()) {
      throw new Error("expected config diff to be empty after second push");
    }

    const markerC = `sync-c-${Date.now()}-${process.pid}`;
    updateConfigMarker(configPath, markerC, 3400 + (process.pid % 500));

    await cmdConfigPull(EXAMPLE_ROOT, targetName, { apply: false });
    assert.ok(fs.existsSync(tmpPullPath), "expected pulled config file");
    assert.strictEqual(readConfigMarker(tmpPullPath), markerB, "pull should fetch remote config");
    assert.strictEqual(readConfigMarker(configPath), markerC, "pull without apply should not change local config");

    await cmdConfigPull(EXAMPLE_ROOT, targetName, { apply: true });
    assert.strictEqual(readConfigMarker(configPath), markerB, "pull --apply should overwrite local config");

    log("OK");
  } catch (err) {
    fail(err && err.stack ? err.stack : String(err));
    process.exitCode = 1;
  } finally {
    try {
      if (hadRemoteBackup) {
        const backupText = readFileMaybe(remoteBackupPath);
        if (backupText) {
          fs.writeFileSync(configPath, backupText, "utf-8");
          await cmdConfigPush(EXAMPLE_ROOT, targetName);
        }
      } else {
        const layout = remoteLayout(targetCfg);
        const remoteConfig = `${layout.sharedDir}/config.json5`;
        sshExec({
          user,
          host,
          args: ["bash", "-lc", `rm -f ${shellQuote(remoteConfig)}`],
          stdio: "pipe",
          sshPort,
        });
      }
    } catch (err) {
      log(`WARN: cleanup remote config failed (${err.message || err})`);
    }

    try { fs.rmSync(tmpPullPath, { force: true }); } catch {}
    try { fs.rmSync(remoteBackupPath, { force: true }); } catch {}

    if (configBackup !== null && configBackup !== undefined) {
      fs.writeFileSync(configPath, configBackup, "utf-8");
    } else {
      fs.rmSync(configPath, { force: true });
    }
    cleanupTargetConfig(targetName, targetBackup);
  }
}

main();
