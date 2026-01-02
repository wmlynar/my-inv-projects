#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { cmdShip, cmdDeploy } = require("../src/commands/deploy");
const { cmdCheck } = require("../src/commands/check");
const { cmdRelease } = require("../src/commands/release");
const { uninstallLocal, restartLocal } = require("../src/lib/deploy");
const { uninstallSsh, restartSsh } = require("../src/lib/deploySsh");
const { sshExec } = require("../src/lib/ssh");
const { writeJson5, readJson5 } = require("../src/lib/json5io");
const { hasCommand, delay, resolveExampleRoot, createLogger, spawnSyncWithTimeout, resolveTmpRoot } = require("./e2e-utils");
const { THIN_NATIVE_BOOTSTRAP_FILE } = require("../src/lib/thinPaths");

const EXAMPLE_ROOT = resolveExampleRoot();

const { log } = createLogger("ship-e2e");

function fail(msg) {
  throw new Error(msg);
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
  } catch (e) {
    e.captured = { out, err };
    throw e;
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
}

function systemctlUserReady() {
  if (process.env.SEAL_E2E_HOME_ISOLATED === "1") {
    log("SKIP: systemctl --user disabled when SEAL_E2E_HOME_ISOLATED=1");
    return false;
  }
  const res = spawnSyncWithTimeout("systemctl", ["--user", "show-environment"], { stdio: "pipe", timeout: 8000 });
  if (res.error && res.error.code === "ETIMEDOUT") {
    log("SKIP: systemctl --user timed out");
    return false;
  }
  if (res.error) {
    const msg = res.error.message || String(res.error);
    log(`SKIP: systemctl --user unavailable (${msg})`);
    return false;
  }
  if (res.status === 0) return true;
  const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  log(`SKIP: systemctl --user unavailable (${out || "status=" + res.status})`);
  return false;
}

async function testLocalPreflightResources() {
  const backupMb = process.env.SEAL_PREFLIGHT_LOCAL_MIN_FREE_MB;
  const backupTmpMb = process.env.SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_MB;
  const backupInodes = process.env.SEAL_PREFLIGHT_LOCAL_MIN_FREE_INODES;
  const backupTmpInodes = process.env.SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_INODES;
  process.env.SEAL_PREFLIGHT_LOCAL_MIN_FREE_MB = "999999";
  process.env.SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_MB = "999999";
  process.env.SEAL_PREFLIGHT_LOCAL_MIN_FREE_INODES = "999999999";
  process.env.SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_INODES = "999999999";
  let failed = false;
  try {
    await cmdCheck(EXAMPLE_ROOT, null, { strict: false, verbose: false, skipRemote: true });
  } catch (e) {
    failed = true;
    const errors = e && e.sealCheck && Array.isArray(e.sealCheck.errors) ? e.sealCheck.errors.join("\n") : "";
    assert.ok(errors.includes("Low disk space on project root"), `Expected local disk preflight error, got: ${errors || e.message}`);
    assert.ok(errors.includes("Low disk space on tmp"), `Expected local tmp preflight error, got: ${errors || e.message}`);
  } finally {
    if (backupMb === undefined) delete process.env.SEAL_PREFLIGHT_LOCAL_MIN_FREE_MB;
    else process.env.SEAL_PREFLIGHT_LOCAL_MIN_FREE_MB = backupMb;
    if (backupTmpMb === undefined) delete process.env.SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_MB;
    else process.env.SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_MB = backupTmpMb;
    if (backupInodes === undefined) delete process.env.SEAL_PREFLIGHT_LOCAL_MIN_FREE_INODES;
    else process.env.SEAL_PREFLIGHT_LOCAL_MIN_FREE_INODES = backupInodes;
    if (backupTmpInodes === undefined) delete process.env.SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_INODES;
    else process.env.SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_INODES = backupTmpInodes;
  }
  assert.ok(failed, "Expected local preflight to fail when thresholds are too high");
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

function readFileMaybe(p) {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

function writeCorruptArtifact(src, dest) {
  const data = fs.readFileSync(src);
  const minBytes = 1024;
  const keep = Math.max(minBytes, Math.floor(data.length / 10));
  fs.writeFileSync(dest, data.subarray(0, Math.min(keep, data.length)));
  return dest;
}

function disableSentinelOnDisk() {
  const sealPath = path.join(EXAMPLE_ROOT, "seal.json5");
  if (!fs.existsSync(sealPath)) return null;
  const backup = readFileMaybe(sealPath);
  const cfg = readJson5(sealPath) || {};
  cfg.build = cfg.build || {};
  cfg.build.sentinel = Object.assign({}, cfg.build.sentinel || {}, {
    enabled: false,
  });
  const thinCfg = cfg.build.thin || {};
  const cObf = cfg.build.protection ? cfg.build.protection.cObfuscator || {} : {};
  const cObfCmd = cObf.cmd || cObf.tool;
  if (thinCfg.launcherObfuscation !== false && cObfCmd && !hasCommand(cObfCmd)) {
    log(`C obfuscator not available (${cObfCmd}); disabling launcherObfuscation for test`);
    thinCfg.launcherObfuscation = false;
  }
  cfg.build.thin = thinCfg;
  writeJson5(sealPath, cfg);
  return backup;
}

function restoreSentinelOnDisk(backup) {
  const sealPath = path.join(EXAMPLE_ROOT, "seal.json5");
  if (backup !== null && backup !== undefined) {
    fs.writeFileSync(sealPath, backup, "utf-8");
  }
}

function setDeployAutoBootstrap(value) {
  const sealPath = path.join(EXAMPLE_ROOT, "seal.json5");
  if (!fs.existsSync(sealPath)) return null;
  const backup = readFileMaybe(sealPath);
  const cfg = readJson5(sealPath) || {};
  cfg.deploy = (cfg.deploy && typeof cfg.deploy === "object" && !Array.isArray(cfg.deploy)) ? { ...cfg.deploy } : {};
  cfg.deploy.autoBootstrap = value;
  writeJson5(sealPath, cfg);
  return backup;
}

function restoreDeployAutoBootstrap(backup) {
  const sealPath = path.join(EXAMPLE_ROOT, "seal.json5");
  if (backup !== null && backup !== undefined) {
    fs.writeFileSync(sealPath, backup, "utf-8");
  }
}

function cleanupServiceArtifacts(targetCfg) {
  const svc = path.join(os.homedir(), ".config", "systemd", "user", `${targetCfg.serviceName}.service`);
  fs.rmSync(svc, { force: true });
  fs.rmSync(targetCfg.installDir, { recursive: true, force: true });
}

function createSafeInstallDir(prefix) {
  const root = fs.mkdtempSync(path.join(resolveTmpRoot(), prefix));
  const installDir = path.join(root, "install");
  fs.mkdirSync(installDir, { recursive: true });
  return { root, installDir };
}

function sshOk(user, host, cmd, sshPort) {
  const res = sshExec({ user, host, args: ["bash", "-lc", cmd], stdio: "pipe", sshPort });
  return { ok: res.ok, out: `${res.stdout || ""}\n${res.stderr || ""}`.trim() };
}

function sshStat(user, host, filePath, sshPort) {
  const res = sshExec({ user, host, args: ["bash", "-lc", `stat -c '%i %Y %s' ${shellQuote(filePath)}`], stdio: "pipe", sshPort });
  if (!res.ok) return null;
  const out = (res.stdout || "").trim();
  const parts = out.split(/\s+/).map((x) => Number(x));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return { ino: parts[0], mtime: parts[1], size: parts[2] };
}

function sshReadFile(user, host, filePath, sshPort) {
  const res = sshExec({ user, host, args: ["bash", "-lc", `if [ -f ${shellQuote(filePath)} ]; then cat ${shellQuote(filePath)}; fi`], stdio: "pipe", sshPort });
  if (!res.ok) return null;
  const out = (res.stdout || "").trim();
  return out || null;
}

function sshReadFileBase64(user, host, filePath, sshPort) {
  const cmd = `if [ -f ${shellQuote(filePath)} ]; then (base64 -w 0 ${shellQuote(filePath)} 2>/dev/null || base64 ${shellQuote(filePath)} | tr -d '\\n'); fi`;
  const res = sshExec({ user, host, args: ["bash", "-lc", cmd], stdio: "pipe", sshPort });
  if (!res.ok) return null;
  const out = (res.stdout || "").trim();
  if (!out) return null;
  try {
    return Buffer.from(out, "base64");
  } catch {
    return null;
  }
}

function hashRuntimeVersion(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeRuntimeMarker(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  if (buf.length === 32) return buf.toString("hex");
  const text = buf.toString("utf-8").trim();
  if (!text) return null;
  return hashRuntimeVersion(text);
}

function sshReadRuntimeMarker(user, host, filePath, sshPort) {
  const buf = sshReadFileBase64(user, host, filePath, sshPort);
  return normalizeRuntimeMarker(buf);
}

function shellQuote(str) {
  return "'" + String(str).replace(/'/g, "'\\''") + "'";
}

function readHttpPort(configName) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", `${configName}.json5`);
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const cfg = readJson5(cfgPath) || {};
    const port = cfg.http ? Number(cfg.http.port) : null;
    if (Number.isFinite(port) && port > 0) return Math.trunc(port);
  } catch {
    return null;
  }
  return null;
}

function buildRemoteHttpCmd(url) {
  const urlQ = shellQuote(url);
  return `
set -e
if command -v curl >/dev/null 2>&1; then
  curl -fsS ${urlQ}
elif command -v wget >/dev/null 2>&1; then
  wget -qO- ${urlQ}
elif command -v python3 >/dev/null 2>&1; then
  URL=${urlQ} python3 - <<'PY'
import os, urllib.request, sys
url = os.environ.get("URL")
with urllib.request.urlopen(url, timeout=5) as r:
    sys.stdout.write(r.read().decode("utf-8"))
PY
else
  echo "__SEAL_NO_HTTP_CLIENT__"
  exit 127
fi
`;
}

async function waitForRemoteHealth({ user, host, sshPort, port, timeoutMs = 20_000 }) {
  const url = `http://127.0.0.1:${port}/healthz`;
  const cmd = buildRemoteHttpCmd(url);
  const start = Date.now();
  let sawNoClient = false;
  while (Date.now() - start < timeoutMs) {
    const res = sshExec({ user, host, args: ["bash", "-lc", cmd], stdio: "pipe", sshPort });
    const out = (res.stdout || "").trim();
    if (!res.ok && (out.includes("__SEAL_NO_HTTP_CLIENT__") || res.status === 127)) {
      sawNoClient = true;
      break;
    }
    if (res.ok && out) {
      try {
        const json = JSON.parse(out);
        if (json && json.ok === true) return json;
      } catch {
        // retry
      }
    }
    await delay(500);
  }
  if (sawNoClient) {
    throw new Error("Remote HTTP check failed: missing curl/wget/python3 on target host");
  }
  throw new Error(`Timeout waiting for HTTP response on ${url}`);
}

async function shipOnce(targetCfg, opts) {
  await cmdShip(EXAMPLE_ROOT, targetCfg.target, opts);
  if (targetCfg.kind === "ssh") {
    return;
  }
  const currentFile = path.join(targetCfg.installDir, "current.buildId");
  assert.ok(fs.existsSync(currentFile), "Missing current.buildId after ship");
}

async function testShipThinBootstrapReuse() {
  log("Testing seal ship prod (thin SPLIT/BOOTSTRAP reuse)...");
  const targetName = `ship-e2e-boot-${Date.now()}-${process.pid}`;
  const serviceName = `seal-example-ship-boot-${Date.now()}`;
  const { root: installRoot, installDir } = createSafeInstallDir("seal-ship-boot-");
  const targetCfg = {
    target: targetName,
    kind: "local",
    host: "127.0.0.1",
    user: "local",
    serviceScope: "user",
    installDir,
    serviceName,
    packager: "thin-split",
    config: "local",
    sentinel: { enabled: true },
  };

  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const backup = readFileMaybe(targetPath);
  writeTargetConfig(targetName, targetCfg);

  try {
    await shipOnce(targetCfg, { bootstrap: true, pushConfig: true, skipCheck: true, packager: "thin-split" });
    const rtPath = path.join(installDir, "r", "rt");
    const plPath = path.join(installDir, "r", "pl");
    assert.ok(fs.existsSync(rtPath), "BOOTSTRAP should install r/rt");
    assert.ok(fs.existsSync(plPath), "BOOTSTRAP should install r/pl");

    const rtStat1 = fs.statSync(rtPath);
    const plStat1 = fs.statSync(plPath);

    await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });

    const rtStat2 = fs.statSync(rtPath);
    const plStat2 = fs.statSync(plPath);

    assert.strictEqual(rtStat1.ino, rtStat2.ino, "BOOTSTRAP should reuse runtime (inode changed)");
    if (plStat1.ino === plStat2.ino && plStat1.mtimeMs === plStat2.mtimeMs) {
      fail("Payload did not appear to change between ships; verify build pipeline.");
    }
  } finally {
    try {
      uninstallLocal(targetCfg);
    } catch {
      cleanupServiceArtifacts(targetCfg);
    }
    cleanupTargetConfig(targetName, backup);
    fs.rmSync(installRoot, { recursive: true, force: true });
  }
}

async function testShipRestartPreflightLocal() {
  log("Testing restart preflight when runner missing (local)...");
  const targetName = `ship-e2e-preflight-${Date.now()}-${process.pid}`;
  const serviceName = `seal-example-ship-preflight-${Date.now()}`;
  const { root: installRoot, installDir } = createSafeInstallDir("seal-ship-preflight-");
  const targetCfg = {
    target: targetName,
    kind: "local",
    host: "127.0.0.1",
    user: "local",
    serviceScope: "user",
    installDir,
    serviceName,
    packager: "thin-split",
    config: "local",
  };

  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const backup = readFileMaybe(targetPath);
  writeTargetConfig(targetName, targetCfg);

  try {
    await shipOnce(targetCfg, { bootstrap: true, pushConfig: true, skipCheck: true, packager: "thin-split" });
    fs.rmSync(path.join(installDir, "run-current.sh"), { force: true });
    let failed = false;
    try {
      restartLocal(targetCfg);
    } catch (e) {
      failed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("Missing runner"), `Expected missing runner preflight, got: ${msg}`);
    }
    assert.ok(failed, "Expected restart to fail when runner missing");
  } finally {
    try {
      uninstallLocal(targetCfg);
    } catch {
      cleanupServiceArtifacts(targetCfg);
    }
    cleanupTargetConfig(targetName, backup);
    fs.rmSync(installRoot, { recursive: true, force: true });
  }
}

async function testShipRuntimeMismatchLocal() {
  log("Testing runtime mismatch fallback (local)...");
  const targetName = `ship-e2e-runtime-mismatch-${Date.now()}-${process.pid}`;
  const serviceName = `seal-example-ship-runtime-mismatch-${Date.now()}`;
  const { root: installRoot, installDir } = createSafeInstallDir("seal-ship-runtime-mismatch-");
  const targetCfg = {
    target: targetName,
    kind: "local",
    host: "127.0.0.1",
    user: "local",
    serviceScope: "user",
    installDir,
    serviceName,
    packager: "thin-split",
    config: "local",
  };

  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const backup = readFileMaybe(targetPath);
  writeTargetConfig(targetName, targetCfg);

  try {
    await shipOnce(targetCfg, { bootstrap: true, pushConfig: true, skipCheck: true, packager: "thin-split" });
    const nvPath = path.join(installDir, "r", "nv");
    assert.ok(fs.existsSync(nvPath), "Missing r/nv before runtime mismatch test");
    fs.writeFileSync(nvPath, "v0.0.0", "utf-8");

    const cap = await captureOutput(() =>
      shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" })
    );
    const out = `${cap.out}\n${cap.err}`;
    assert.ok(out.includes("node version mismatch"), `Expected node version mismatch warning, got: ${out.trim()}`);
    assert.ok(out.toLowerCase().includes("copying full bootstrap"), `Expected full bootstrap fallback, got: ${out.trim()}`);
  } finally {
    try {
      uninstallLocal(targetCfg);
    } catch {
      cleanupServiceArtifacts(targetCfg);
    }
    cleanupTargetConfig(targetName, backup);
    fs.rmSync(installRoot, { recursive: true, force: true });
  }
}

async function testShipCorruptArtifactLocal() {
  log("Testing corrupt artifact handling (local)...");
  const targetName = `ship-e2e-corrupt-${Date.now()}-${process.pid}`;
  const serviceName = `seal-example-ship-corrupt-${Date.now()}`;
  const { root: installRoot, installDir } = createSafeInstallDir("seal-ship-corrupt-");
  const targetCfg = {
    target: targetName,
    kind: "local",
    host: "127.0.0.1",
    user: "local",
    serviceScope: "user",
    installDir,
    serviceName,
    packager: "thin-split",
    config: "local",
  };

  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const backup = readFileMaybe(targetPath);
  writeTargetConfig(targetName, targetCfg);

  let corruptPath = null;
  try {
    const releaseRes = await cmdRelease(EXAMPLE_ROOT, targetCfg.target, {
      skipCheck: true,
      skipVerify: true,
      packager: "thin-split",
    });
    assert.ok(releaseRes && releaseRes.artifactPath, "Missing artifact for corrupt test");
    corruptPath = path.join(installRoot, "corrupt.tgz");
    writeCorruptArtifact(releaseRes.artifactPath, corruptPath);

    let failed = false;
    try {
      await cmdDeploy(EXAMPLE_ROOT, targetCfg.target, {
        artifact: corruptPath,
        skipVerify: true,
        pushConfig: false,
        bootstrap: false,
        restart: false,
        wait: false,
      });
    } catch (e) {
      failed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("Artifact appears corrupted or incomplete"), `Expected corrupt artifact hint, got: ${msg}`);
      assert.ok(msg.includes("seal ship") || msg.includes("seal deploy"), `Expected fix hint, got: ${msg}`);
    }
    assert.ok(failed, "Expected deploy to fail with corrupt artifact");
  } finally {
    if (corruptPath) fs.rmSync(corruptPath, { force: true });
    try {
      uninstallLocal(targetCfg);
    } catch {
      cleanupServiceArtifacts(targetCfg);
    }
    cleanupTargetConfig(targetName, backup);
    fs.rmSync(installRoot, { recursive: true, force: true });
  }
}

async function testShipMissingAppctlLocal() {
  log("Testing missing appctl hint (local)...");
  const targetName = `ship-e2e-missing-appctl-${Date.now()}-${process.pid}`;
  const serviceName = `seal-example-ship-missing-appctl-${Date.now()}`;
  const { root: installRoot, installDir } = createSafeInstallDir("seal-ship-missing-appctl-");
  const targetCfg = {
    target: targetName,
    kind: "local",
    host: "127.0.0.1",
    user: "local",
    serviceScope: "user",
    installDir,
    serviceName,
    packager: "thin-split",
    config: "local",
  };

  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const backup = readFileMaybe(targetPath);
  writeTargetConfig(targetName, targetCfg);

  try {
    await shipOnce(targetCfg, { bootstrap: true, pushConfig: true, skipCheck: true, packager: "thin-split" });
    const buildId = fs.readFileSync(path.join(installDir, "current.buildId"), "utf-8").trim();
    const relDir = path.join(installDir, "releases", buildId);
    fs.rmSync(path.join(installDir, "b", "a"), { force: true });
    fs.rmSync(path.join(relDir, "appctl"), { force: true });
    const res = spawnSyncWithTimeout("bash", [path.join(installDir, "run-current.sh")], { stdio: "pipe", timeout: 8000, encoding: "utf8" });
    const out = `${res.stdout || ""}\n${res.stderr || ""}`;
    assert.ok(!res.ok, "Expected run-current.sh to fail when appctl missing");
    assert.ok(out.includes("Missing appctl in release"), `Expected missing appctl hint, got: ${out.trim()}`);
    assert.ok(out.includes("Fix: redeploy with --bootstrap"), `Expected bootstrap hint, got: ${out.trim()}`);
  } finally {
    try {
      uninstallLocal(targetCfg);
    } catch {
      cleanupServiceArtifacts(targetCfg);
    }
    cleanupTargetConfig(targetName, backup);
    fs.rmSync(installRoot, { recursive: true, force: true });
  }
}

async function testShipChdirHintLocal() {
  log("Testing systemd CHDIR hint (local)...");
  const targetName = `ship-e2e-chdir-hint-${Date.now()}-${process.pid}`;
  const serviceName = `seal-example-ship-chdir-hint-${Date.now()}`;
  const { root: installRoot, installDir } = createSafeInstallDir("seal-ship-chdir-hint-");
  const targetCfg = {
    target: targetName,
    kind: "local",
    host: "127.0.0.1",
    user: "local",
    serviceScope: "user",
    installDir,
    serviceName,
    packager: "thin-split",
    config: "local",
  };

  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const backup = readFileMaybe(targetPath);
  writeTargetConfig(targetName, targetCfg);

  try {
    await shipOnce(targetCfg, { bootstrap: true, pushConfig: true, skipCheck: true, packager: "thin-split" });
    const svcPath = path.join(os.homedir(), ".config", "systemd", "user", `${serviceName}.service`);
    const unit = fs.readFileSync(svcPath, "utf8");
    const badDir = path.join(installDir, "missing");
    fs.rmSync(badDir, { recursive: true, force: true });
    const patchedUnit = unit.replace(/^\\s*WorkingDirectory=.*$/m, `WorkingDirectory=${badDir}`);
    if (patchedUnit === unit) {
      throw new Error("Failed to patch WorkingDirectory in systemd unit");
    }
    fs.writeFileSync(svcPath, patchedUnit, "utf8");
    const reload = spawnSyncWithTimeout("systemctl", ["--user", "daemon-reload"], { stdio: "pipe", timeout: 8000 });
    if (reload.error || reload.status !== 0) {
      const out = `${reload.stdout || ""}\n${reload.stderr || ""}`.trim();
      throw new Error(`systemctl daemon-reload failed: ${out || reload.error || reload.status}`);
    }
    const show = spawnSyncWithTimeout(
      "systemctl",
      ["--user", "show", `${serviceName}.service`, "-p", "WorkingDirectory", "--value"],
      { stdio: "pipe", timeout: 8000 },
    );
    const wd = String(show.stdout || "").trim();
    if (show.error || show.status !== 0 || wd !== badDir) {
      const out = `${show.stdout || ""}\n${show.stderr || ""}`.trim();
      throw new Error(`systemctl WorkingDirectory mismatch: ${wd || "<empty>"} (${out || show.error || show.status})`);
    }

    let failed = false;
    try {
      await cmdShip(EXAMPLE_ROOT, targetCfg.target, {
        restart: true,
        wait: true,
        waitMode: "systemd",
      });
    } catch (e) {
      failed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("Missing WorkingDirectory/installDir"), `Expected CHDIR hint, got: ${msg}`);
      assert.ok(msg.includes("seal ship"), `Expected bootstrap hint, got: ${msg}`);
    }
    assert.ok(failed, "Expected readiness to fail with CHDIR hint");
  } finally {
    try {
      uninstallLocal(targetCfg);
    } catch {
      cleanupServiceArtifacts(targetCfg);
    }
    cleanupTargetConfig(targetName, backup);
    fs.rmSync(installRoot, { recursive: true, force: true });
  }
}

async function testShipRollbackLocal() {
  log("Testing seal ship rollback on readiness failure (local)...");
  const targetName = `ship-e2e-rollback-${Date.now()}-${process.pid}`;
  const serviceName = `seal-example-ship-rollback-${Date.now()}`;
  const { root: installRoot, installDir } = createSafeInstallDir("seal-ship-rollback-");
  const targetCfg = {
    target: targetName,
    kind: "local",
    host: "127.0.0.1",
    user: "local",
    serviceScope: "user",
    installDir,
    serviceName,
    packager: "thin-split",
    config: "local",
  };

  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const backup = readFileMaybe(targetPath);
  writeTargetConfig(targetName, targetCfg);

  try {
    await shipOnce(targetCfg, { bootstrap: true, pushConfig: true, skipCheck: true, packager: "thin-split" });
    const currentFile = path.join(installDir, "current.buildId");
    const before = fs.readFileSync(currentFile, "utf-8").trim();

    let failed = false;
    try {
      await cmdShip(EXAMPLE_ROOT, targetCfg.target, {
        bootstrap: false,
        pushConfig: false,
        skipCheck: true,
        packager: "thin-split",
        waitMode: "http",
        waitUrl: "http://127.0.0.1:1/healthz",
        waitTimeout: 3000,
        waitInterval: 500,
        waitHttpTimeout: 500,
      });
    } catch {
      failed = true;
    }
    assert.ok(failed, "Expected ship to fail readiness and trigger rollback");

    const after = fs.readFileSync(currentFile, "utf-8").trim();
    assert.strictEqual(after, before, "Rollback should restore previous current.buildId");
  } finally {
    try {
      uninstallLocal(targetCfg);
    } catch {
      cleanupServiceArtifacts(targetCfg);
    }
    cleanupTargetConfig(targetName, backup);
    fs.rmSync(installRoot, { recursive: true, force: true });
  }
}

async function testShipThinBootstrapSsh() {
  if (process.env.SEAL_SHIP_SSH_E2E !== "1") {
    log("SKIP: set SEAL_SHIP_SSH_E2E=1 to run SSH ship E2E");
    return;
  }

  const host = process.env.SEAL_SHIP_SSH_HOST;
  const user = process.env.SEAL_SHIP_SSH_USER;
  const installDir = process.env.SEAL_SHIP_SSH_INSTALL_DIR;
  const serviceName = process.env.SEAL_SHIP_SSH_SERVICE_NAME;
  const sshPort = process.env.SEAL_SHIP_SSH_PORT ? Number(process.env.SEAL_SHIP_SSH_PORT) : null;
  if (!host || !user || !installDir || !serviceName) {
    log("SKIP: missing SSH env (SEAL_SHIP_SSH_HOST/USER/INSTALL_DIR/SERVICE_NAME)");
    return;
  }

  const ping = sshOk(user, host, "echo __SEAL_OK__", sshPort);
  if (!ping.ok || !ping.out.includes("__SEAL_OK__")) {
    log(`SKIP: ssh not available (${ping.out || "no output"})`);
    return;
  }
  const sudoCheck = sshOk(user, host, "sudo -n true", sshPort);
  if (!sudoCheck.ok) {
    log(`SKIP: passwordless sudo not available (${sudoCheck.out || "no output"})`);
    return;
  }

  log("Testing seal ship prod (thin SPLIT/BOOTSTRAP over SSH, auto bootstrap)...");
  const targetName = `ship-e2e-ssh-${Date.now()}-${process.pid}`;
  const expectedRuntimeMarker = hashRuntimeVersion(process.version);
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
    config: "server",
  };

  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  const backup = readFileMaybe(targetPath);
  writeTargetConfig(targetName, targetCfg);

  try {
    const checkPreflightBackup = targetCfg.preflight;
    targetCfg.preflight = {
      requireTools: ["__seal_missing_tool__"],
      tmpDir: "/__seal_tmp_missing__",
    };
    writeTargetConfig(targetName, targetCfg);
    let checkFailed = false;
    const sudoBackup = process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL;
    process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL = "1";
    try {
      await cmdCheck(EXAMPLE_ROOT, targetName, { strict: false, verbose: false, skipRemote: false });
    } catch (e) {
      checkFailed = true;
      const errors = e && e.sealCheck && Array.isArray(e.sealCheck.errors) ? e.sealCheck.errors.join("\n") : "";
      assert.ok(errors.includes("Missing tools"), `Expected missing tools in check errors, got: ${errors || e.message}`);
      assert.ok(errors.includes("Tmp dir missing"), `Expected tmp dir missing in check errors, got: ${errors || e.message}`);
      assert.ok(errors.includes("sudo"), `Expected sudo in check errors, got: ${errors || e.message}`);
    } finally {
      if (sudoBackup === undefined) delete process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL;
      else process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL = sudoBackup;
      if (checkPreflightBackup === undefined) delete targetCfg.preflight;
      else targetCfg.preflight = checkPreflightBackup;
      writeTargetConfig(targetName, targetCfg);
    }
    assert.ok(checkFailed, "Expected seal check to fail on missing tools tmp dir");

    try {
      uninstallSsh(targetCfg);
    } catch (e) {
      log(`WARN: SSH pre-clean failed: ${e.message || e}`);
    }

    const autoBackup = setDeployAutoBootstrap(false);
    try {
      let failed = false;
      try {
        await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
      } catch (e) {
        failed = true;
        const msg = e && e.message ? e.message : String(e);
        assert.ok(msg.includes("Run: seal deploy"), "Auto bootstrap OFF should instruct manual bootstrap");
      }
      if (!failed) {
        fail("Expected failure when deploy.autoBootstrap=false and target is unprepared");
      }
    } finally {
      restoreDeployAutoBootstrap(autoBackup);
    }

    await shipOnce(targetCfg, { bootstrap: false, pushConfig: true, skipCheck: true, packager: "thin-split" });
    const runnerStat = sshStat(user, host, `${installDir}/run-current.sh`, sshPort);
    const unitStat = sshStat(user, host, `/etc/systemd/system/${serviceName}.service`, sshPort);
    assert.ok(runnerStat, "Missing runner after auto bootstrap ship (ssh)");
    assert.ok(unitStat, "Missing systemd unit after auto bootstrap ship (ssh)");
    const tmpDirCheck = sshOk(user, host, `test -d ${shellQuote(`${installDir}/.seal-tmp`)}`, sshPort);
    assert.ok(tmpDirCheck.ok, "Missing .seal-tmp after auto bootstrap ship (ssh)");
    const activeCheck = sshOk(user, host, `sudo -n systemctl is-active ${shellQuote(`${serviceName}.service`)}`, sshPort);
    assert.ok(activeCheck.ok, `systemctl is-active failed (ssh): ${activeCheck.out}`);
    assert.strictEqual(activeCheck.out.trim(), "active", `Expected systemd active after ship (ssh), got: ${activeCheck.out}`);

    const corruptPath = path.join(resolveTmpRoot(), `seal-e2e-corrupt-${Date.now()}-${process.pid}.tgz`);
    try {
      const releaseRes = await cmdRelease(EXAMPLE_ROOT, targetCfg.target, {
        skipCheck: true,
        skipVerify: true,
        packager: "thin-split",
      });
      assert.ok(releaseRes && releaseRes.artifactPath, "Missing artifact for ssh corrupt test");
      writeCorruptArtifact(releaseRes.artifactPath, corruptPath);

      let failed = false;
      try {
        await cmdDeploy(EXAMPLE_ROOT, targetCfg.target, {
          artifact: corruptPath,
          skipVerify: true,
          pushConfig: false,
          bootstrap: false,
          restart: false,
          wait: false,
        });
      } catch (e) {
        failed = true;
        const msg = e && e.message ? e.message : String(e);
        assert.ok(msg.includes("Artifact appears corrupted or incomplete"), `Expected corrupt artifact hint (ssh), got: ${msg}`);
        assert.ok(msg.includes("seal ship") || msg.includes("seal deploy"), `Expected fix hint (ssh), got: ${msg}`);
      }
      assert.ok(failed, "Expected SSH deploy to fail with corrupt artifact");
    } finally {
      fs.rmSync(corruptPath, { force: true });
    }

    const rmRunner = sshOk(user, host, `rm -f ${shellQuote(`${installDir}/run-current.sh`)}`, sshPort);
    assert.ok(rmRunner.ok, `Failed to remove runner before preflight test: ${rmRunner.out}`);
    let restartFailed = false;
    try {
      restartSsh(targetCfg);
    } catch (e) {
      restartFailed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("Missing runner"), `Expected missing runner preflight, got: ${msg}`);
    }
    assert.ok(restartFailed, "Expected restart to fail when runner missing (ssh)");
    await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });

    const rtPath = `${installDir}/r/rt`;
    const plPath = `${installDir}/r/pl`;
    const rtStat1 = sshStat(user, host, rtPath, sshPort);
    const plStat1 = sshStat(user, host, plPath, sshPort);
    const nbStat1 = sshStat(user, host, `${installDir}/r/${THIN_NATIVE_BOOTSTRAP_FILE}`, sshPort);
    assert.ok(rtStat1 && plStat1, "Missing r/rt or r/pl after bootstrap ship (ssh)");
    assert.ok(nbStat1, `Missing native bootstrap addon (r/${THIN_NATIVE_BOOTSTRAP_FILE}) after bootstrap ship (ssh)`);

    await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
    const rtStat2 = sshStat(user, host, rtPath, sshPort);
    const plStat2 = sshStat(user, host, plPath, sshPort);
    assert.ok(rtStat2 && plStat2, "Missing r/rt or r/pl after payload ship (ssh)");

    assert.strictEqual(rtStat1.ino, rtStat2.ino, "SSH bootstrap should reuse runtime (inode changed)");
    if (plStat1.ino === plStat2.ino && plStat1.mtime === plStat2.mtime) {
      fail("SSH payload did not appear to change between ships; verify build pipeline.");
    }

    const currentBuildId = sshReadFile(user, host, `${installDir}/current.buildId`, sshPort);
    assert.ok(currentBuildId, "Missing current.buildId after payload ship (ssh)");
    const releaseDir = `${installDir}/releases/${currentBuildId}`;
    const appctlStat = sshStat(user, host, `${releaseDir}/appctl`, sshPort);
    assert.ok(appctlStat, "Missing appctl after payload-only ship (ssh)");
    if (fs.existsSync(path.join(EXAMPLE_ROOT, "public"))) {
      const publicStat = sshStat(user, host, `${releaseDir}/public`, sshPort);
      assert.ok(publicStat, "Missing public assets after payload-only ship (ssh)");
    }

    const sharedPath = `${installDir}/shared/config.json5`;
    const sharedBackupBuf = sshReadFileBase64(user, host, sharedPath, sshPort);
    assert.ok(sharedBackupBuf, "Missing shared config for config drift test (ssh)");
    const sharedBackupB64 = sharedBackupBuf.toString("base64");
    try {
      const driftText = `${sharedBackupBuf.toString("utf-8").trimEnd()}\n// seal-e2e-drift\n`;
      const driftB64 = Buffer.from(driftText, "utf-8").toString("base64");
      const writeDrift = sshOk(
        user,
        host,
        `printf %s ${shellQuote(driftB64)} | (base64 -d 2>/dev/null || base64 -D) > ${shellQuote(sharedPath)}`,
        sshPort
      );
      assert.ok(writeDrift.ok, `Failed to write config drift fixture (ssh): ${writeDrift.out}`);
      let driftFailed = false;
      let driftOutput = "";
      try {
        await captureOutput(() =>
          cmdShip(EXAMPLE_ROOT, targetCfg.target, {
            bootstrap: false,
            pushConfig: false,
            acceptDrift: false,
            skipCheck: true,
            packager: "thin-split",
          })
        );
      } catch (e) {
        driftFailed = true;
        driftOutput = `${(e.captured && e.captured.out) || ""}\n${(e.captured && e.captured.err) || ""}`;
      }
      assert.ok(driftFailed, "Expected ship to fail on config drift (ssh)");
      assert.ok(driftOutput.includes("seal config push"), "Expected config drift hint: seal config push");
      assert.ok(driftOutput.includes("accept-drift"), "Expected config drift hint: --accept-drift");
    } finally {
      const restoreDrift = sshOk(
        user,
        host,
        `printf %s ${shellQuote(sharedBackupB64)} | (base64 -d 2>/dev/null || base64 -D) > ${shellQuote(sharedPath)}`,
        sshPort
      );
      if (!restoreDrift.ok) {
        log(`WARN: failed to restore shared config after drift test: ${restoreDrift.out}`);
      }
    }

    const rmRuntime = sshOk(
      user,
      host,
      `rm -f ${shellQuote(`${installDir}/b/a`)} ${shellQuote(`${installDir}/r/rt`)} ${shellQuote(`${installDir}/r/nv`)}`,
      sshPort
    );
    assert.ok(rmRuntime.ok, `Failed to remove runtime before payload-only fallback test: ${rmRuntime.out}`);

    let fallbackOutput = "";
    try {
      const cap = await captureOutput(() => shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" }));
      fallbackOutput = `${cap.out}\n${cap.err}`;
    } catch (e) {
      fallbackOutput = `${(e.captured && e.captured.out) || ""}\n${(e.captured && e.captured.err) || ""}`;
      throw e;
    }
    assert.ok(
      fallbackOutput.includes("runtime/launcher missing on target; falling back to full upload"),
      "Expected payload-only fallback log (missing runtime)"
    );
    const nvAfterFallback = sshReadRuntimeMarker(user, host, `${installDir}/r/nv`, sshPort);
    assert.strictEqual(nvAfterFallback, expectedRuntimeMarker, "Expected runtime marker to be restored after fallback");

    const nvWrite = sshOk(
      user,
      host,
      `printf %s ${shellQuote("v0.0.0")} > ${shellQuote(`${installDir}/r/nv`)}`,
      sshPort
    );
    assert.ok(nvWrite.ok, `Failed to write runtime version before mismatch test: ${nvWrite.out}`);

    let mismatchOutput = "";
    try {
      const cap = await captureOutput(() => shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" }));
      mismatchOutput = `${cap.out}\n${cap.err}`;
    } catch (e) {
      mismatchOutput = `${(e.captured && e.captured.out) || ""}\n${(e.captured && e.captured.err) || ""}`;
      throw e;
    }
    assert.ok(
      mismatchOutput.includes("node version mismatch"),
      "Expected payload-only fallback log (node version mismatch)"
    );
    const nvAfterMismatch = sshReadRuntimeMarker(user, host, `${installDir}/r/nv`, sshPort);
    assert.strictEqual(nvAfterMismatch, expectedRuntimeMarker, "Expected runtime marker to be refreshed after mismatch");

    const httpPort = process.env.SEAL_SHIP_SSH_HTTP_PORT
      ? Number(process.env.SEAL_SHIP_SSH_HTTP_PORT)
      : readHttpPort("server");
    if (!httpPort || !Number.isFinite(httpPort)) {
      throw new Error("Missing HTTP port for SSH E2E (set SEAL_SHIP_SSH_HTTP_PORT or seal-config/configs/server.json5)");
    }
    const limitedHost = process.env.SEAL_E2E_LIMITED_HOST === "1";
    const httpCheck = process.env.SEAL_SHIP_SSH_HTTP_CHECK;
    if (httpCheck === "0" || (limitedHost && httpCheck !== "1")) {
      log("SKIP: remote HTTP /healthz check (limited host)");
    } else {
      await waitForRemoteHealth({ user, host, sshPort, port: Math.trunc(httpPort) });
      log(`OK: remote HTTP /healthz on port ${httpPort}`);
    }

    const preflightMbBackup = process.env.SEAL_PREFLIGHT_MIN_FREE_MB;
    process.env.SEAL_PREFLIGHT_MIN_FREE_MB = "999999";
    let preflightFailed = false;
    try {
      await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
    } catch (e) {
      preflightFailed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("low disk space"), `Expected low disk space preflight failure, got: ${msg}`);
    } finally {
      if (preflightMbBackup === undefined) delete process.env.SEAL_PREFLIGHT_MIN_FREE_MB;
      else process.env.SEAL_PREFLIGHT_MIN_FREE_MB = preflightMbBackup;
    }
    assert.ok(preflightFailed, "Expected preflight to fail when SEAL_PREFLIGHT_MIN_FREE_MB is too high");

    const preflightTmpBackup = process.env.SEAL_PREFLIGHT_TMP_MIN_FREE_MB;
    process.env.SEAL_PREFLIGHT_TMP_MIN_FREE_MB = "999999";
    let preflightTmpFailed = false;
    try {
      await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
    } catch (e) {
      preflightTmpFailed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("tmp"), `Expected tmp preflight failure, got: ${msg}`);
    } finally {
      if (preflightTmpBackup === undefined) delete process.env.SEAL_PREFLIGHT_TMP_MIN_FREE_MB;
      else process.env.SEAL_PREFLIGHT_TMP_MIN_FREE_MB = preflightTmpBackup;
    }
    assert.ok(preflightTmpFailed, "Expected preflight to fail when SEAL_PREFLIGHT_TMP_MIN_FREE_MB is too high");

    const sudoPreflightBackup = process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL;
    process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL = "1";
    let sudoFailed = false;
    try {
      await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
    } catch (e) {
      sudoFailed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("sudo"), `Expected sudo preflight failure, got: ${msg}`);
    } finally {
      if (sudoPreflightBackup === undefined) delete process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL;
      else process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL = sudoPreflightBackup;
    }
    assert.ok(sudoFailed, "Expected preflight to fail when sudo is missing");

    const toolBackup = targetCfg.preflight;
    targetCfg.preflight = { requireTools: ["__seal_missing_tool__"] };
    writeTargetConfig(targetName, targetCfg);
    let toolFailed = false;
    try {
      await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
    } catch (e) {
      toolFailed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("missing tools"), `Expected missing tools preflight failure, got: ${msg}`);
    } finally {
      if (toolBackup === undefined) delete targetCfg.preflight;
      else targetCfg.preflight = toolBackup;
      writeTargetConfig(targetName, targetCfg);
    }
    assert.ok(toolFailed, "Expected preflight to fail for missing tools");

    const tmpDirBackup = targetCfg.preflight;
    targetCfg.preflight = { tmpDir: "/__seal_tmp_missing__" };
    writeTargetConfig(targetName, targetCfg);
    let tmpMissingFailed = false;
    try {
      await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
    } catch (e) {
      tmpMissingFailed = true;
      const msg = e && e.message ? e.message : String(e);
      assert.ok(msg.includes("tmp dir missing"), `Expected tmp dir missing preflight failure, got: ${msg}`);
    } finally {
      if (tmpDirBackup === undefined) delete targetCfg.preflight;
      else targetCfg.preflight = tmpDirBackup;
      writeTargetConfig(targetName, targetCfg);
    }
    assert.ok(tmpMissingFailed, "Expected preflight to fail for missing tmp dir");

    const findmnt = sshOk(
      user,
      host,
      `if command -v findmnt >/dev/null 2>&1; then findmnt -no OPTIONS --target ${shellQuote(installDir)} 2>/dev/null || true; fi`,
      sshPort
    );
    if (findmnt.ok && findmnt.out.includes("noexec")) {
      const noexecBackup = targetCfg.preflight;
      targetCfg.preflight = { allowNoexec: false };
      writeTargetConfig(targetName, targetCfg);
      let noexecFailed = false;
      try {
        await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
      } catch (e) {
        noexecFailed = true;
        const msg = e && e.message ? e.message : String(e);
        assert.ok(msg.includes("noexec"), `Expected noexec preflight failure, got: ${msg}`);
      } finally {
        if (noexecBackup === undefined) delete targetCfg.preflight;
        else targetCfg.preflight = noexecBackup;
        writeTargetConfig(targetName, targetCfg);
      }
      assert.ok(noexecFailed, "Expected preflight to fail for noexec installDir");
    } else {
      log("SKIP: noexec preflight (findmnt not available or installDir has exec)");
    }

    const beforeRollback = sshReadFile(user, host, `${installDir}/current.buildId`, sshPort);
    assert.ok(beforeRollback, "Missing current.buildId before rollback test (ssh)");
    let rollbackFailed = false;
    try {
      await cmdShip(EXAMPLE_ROOT, targetCfg.target, {
        bootstrap: false,
        pushConfig: false,
        acceptDrift: true,
        skipCheck: true,
        packager: "thin-split",
        wait: true,
        waitMode: "http",
        waitUrl: "http://127.0.0.1:1/healthz",
        waitTimeout: 3000,
        waitInterval: 500,
        waitHttpTimeout: 500,
      });
    } catch {
      rollbackFailed = true;
    }
    assert.ok(rollbackFailed, "Expected ship to fail readiness and trigger rollback (ssh)");
    const afterRollback = sshReadFile(user, host, `${installDir}/current.buildId`, sshPort);
    assert.ok(afterRollback, "Missing current.buildId after rollback test (ssh)");
    assert.strictEqual(afterRollback.trim(), beforeRollback.trim(), "Rollback should restore previous current.buildId");
  } finally {
    if (process.env.SEAL_SHIP_SSH_KEEP !== "1") {
      try {
        uninstallSsh(targetCfg);
      } catch (e) {
        log(`WARN: SSH cleanup failed: ${e.message || e}`);
      }
    }
    cleanupTargetConfig(targetName, backup);
  }
}

async function main() {
  if (process.env.SEAL_SHIP_E2E !== "1") {
    log("SKIP: set SEAL_SHIP_E2E=1 to run ship E2E tests");
    process.exit(77);
  }
  const sentinelBackup = disableSentinelOnDisk();
  const failures = [];
  try {
    try {
      await testLocalPreflightResources();
      log("OK: testLocalPreflightResources");
    } catch (e) {
      failures.push({ name: "local-preflight-resources", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
    }
    if (systemctlUserReady()) {
      try {
        await testShipThinBootstrapReuse();
        log("OK: testShipThinBootstrapReuse");
      } catch (e) {
        failures.push({ name: "local", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
      }
      try {
        await testShipRuntimeMismatchLocal();
        log("OK: testShipRuntimeMismatchLocal");
      } catch (e) {
        failures.push({ name: "local-runtime-mismatch", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
      }
      try {
        await testShipCorruptArtifactLocal();
        log("OK: testShipCorruptArtifactLocal");
      } catch (e) {
        failures.push({ name: "local-corrupt-artifact", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
      }
      try {
        await testShipMissingAppctlLocal();
        log("OK: testShipMissingAppctlLocal");
      } catch (e) {
        failures.push({ name: "local-missing-appctl", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
      }
      try {
        await testShipChdirHintLocal();
        log("OK: testShipChdirHintLocal");
      } catch (e) {
        failures.push({ name: "local-chdir-hint", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
      }
      try {
        await testShipRestartPreflightLocal();
        log("OK: testShipRestartPreflightLocal");
      } catch (e) {
        failures.push({ name: "local-preflight", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
      }
      try {
        await testShipRollbackLocal();
        log("OK: testShipRollbackLocal");
      } catch (e) {
        failures.push({ name: "local-rollback", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
      }
    }
    try {
      await testShipThinBootstrapSsh();
    } catch (e) {
      failures.push({ name: "ssh", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
    }
  } finally {
    restoreSentinelOnDisk(sentinelBackup);
  }

  if (failures.length) {
    for (const failure of failures) {
      process.stderr.write(`[ship-e2e] ERROR (${failure.name}): ${failure.error}\n`);
    }
    process.exit(1);
  }
}

main();
