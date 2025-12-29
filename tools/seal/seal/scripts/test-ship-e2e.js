#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { cmdShip } = require("../src/commands/deploy");
const { uninstallLocal } = require("../src/lib/deploy");
const { uninstallSsh } = require("../src/lib/deploySsh");
const { sshExec } = require("../src/lib/ssh");
const { writeJson5, readJson5 } = require("../src/lib/json5io");
const { hasCommand } = require("./e2e-utils");

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");

function log(msg) {
  process.stdout.write(`[ship-e2e] ${msg}\n`);
}

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
  const res = spawnSync("systemctl", ["--user", "show-environment"], { stdio: "pipe" });
  if (res.status === 0) return true;
  const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  log(`SKIP: systemctl --user unavailable (${out || "status=" + res.status})`);
  return false;
}

function writeTargetConfig(targetName, cfg) {
  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  writeJson5(targetPath, cfg);
  return targetPath;
}

function cleanupTargetConfig(targetName, backup) {
  const targetPath = path.join(EXAMPLE_ROOT, "seal-config", "targets", `${targetName}.json5`);
  if (backup) {
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (!res.ok && (out.includes("__SEAL_NO_HTTP_CLIENT__") || res.code === 127)) {
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
  const installDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-ship-boot-"));
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
  }
}

async function testShipRollbackLocal() {
  log("Testing seal ship rollback on readiness failure (local)...");
  const targetName = `ship-e2e-rollback-${Date.now()}-${process.pid}`;
  const serviceName = `seal-example-ship-rollback-${Date.now()}`;
  const installDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-ship-rollback-"));
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

    const rtPath = `${installDir}/r/rt`;
    const plPath = `${installDir}/r/pl`;
    const rtStat1 = sshStat(user, host, rtPath, sshPort);
    const plStat1 = sshStat(user, host, plPath, sshPort);
    const nbStat1 = sshStat(user, host, `${installDir}/r/nb.node`, sshPort);
    assert.ok(rtStat1 && plStat1, "Missing r/rt or r/pl after bootstrap ship (ssh)");
    assert.ok(nbStat1, "Missing native bootstrap addon (r/nb.node) after bootstrap ship (ssh)");

    await shipOnce(targetCfg, { bootstrap: false, pushConfig: false, skipCheck: true, packager: "thin-split" });
    const rtStat2 = sshStat(user, host, rtPath, sshPort);
    const plStat2 = sshStat(user, host, plPath, sshPort);
    assert.ok(rtStat2 && plStat2, "Missing r/rt or r/pl after payload ship (ssh)");

    assert.strictEqual(rtStat1.ino, rtStat2.ino, "SSH bootstrap should reuse runtime (inode changed)");
    if (plStat1.ino === plStat2.ino && plStat1.mtime === plStat2.mtime) {
      fail("SSH payload did not appear to change between ships; verify build pipeline.");
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
    await waitForRemoteHealth({ user, host, sshPort, port: Math.trunc(httpPort) });
    log(`OK: remote HTTP /healthz on port ${httpPort}`);
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
    if (systemctlUserReady()) {
      try {
        await testShipThinBootstrapReuse();
        log("OK: testShipThinBootstrapReuse");
      } catch (e) {
        failures.push({ name: "local", error: e && e.stack ? e.stack : e && e.message ? e.message : String(e) });
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
