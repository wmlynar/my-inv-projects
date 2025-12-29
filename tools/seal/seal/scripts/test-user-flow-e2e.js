#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const {
  hasCommand,
  applyReadyFileEnv,
  makeReadyFile,
  waitForReady,
  getFreePort,
  stripAnsi,
  resolveExampleRoot,
  createLogger,
  terminateChild,
  spawnSyncWithTimeout,
} = require("./e2e-utils");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

const EXAMPLE_ROOT = resolveExampleRoot();
const SEAL_BIN = path.resolve(__dirname, "..", "bin", "seal.js");

const { log, error } = createLogger("user-flow-e2e");

function fail(msg) {
  error(msg);
  process.exit(1);
}

function truncate(input, max = 2500) {
  const str = String(input || "");
  if (str.length <= max) return str;
  return `${str.slice(0, max)}\n...truncated (${str.length - max} chars)`;
}

function parsePort(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const port = Math.trunc(n);
  if (port < 1 || port > 65535) return null;
  return port;
}

function shellQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function systemctlUserReady() {
  const res = spawnSyncWithTimeout("systemctl", ["--user", "show-environment"], {
    stdio: "pipe",
    encoding: "utf-8",
    timeout: 8000,
  });
  if (res.error && res.error.code === "ETIMEDOUT") {
    log("SKIP: systemctl --user timed out");
    return false;
  }
  if (res.status === 0) return true;
  const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  log(`SKIP: systemctl --user unavailable (${out || "status=" + res.status})`);
  return false;
}

function sshExec(user, host, cmd, sshPort) {
  const args = [
    "-o", "BatchMode=yes",
    "-o", "PreferredAuthentications=publickey",
    "-o", "PasswordAuthentication=no",
    "-o", "KbdInteractiveAuthentication=no",
    "-o", "ChallengeResponseAuthentication=no",
    "-o", "NumberOfPasswordPrompts=0",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "ConnectTimeout=10",
    "-o", "ServerAliveInterval=10",
    "-o", "ServerAliveCountMax=2",
  ];
  if (sshPort) args.push("-p", String(sshPort));
  args.push(`${user}@${host}`, `bash -lc ${shellQuote(cmd)}`);
  const res = spawnSyncWithTimeout("ssh", args, { stdio: "pipe", encoding: "utf-8", timeout: 20000 });
  const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    return { ok: false, status: null, out: "ssh timed out" };
  }
  return { ok: res.status === 0, status: res.status, out };
}

function runSeal(cwd, args, opts = {}) {
  const res = spawnSyncWithTimeout(process.execPath, [SEAL_BIN, ...args], {
    cwd,
    env: {
      ...process.env,
      SEAL_BATCH_SKIP: "1",
      ...(opts.env || {}),
    },
    stdio: "pipe",
    encoding: "utf-8",
    timeout: opts.timeoutMs || 120000,
  });
  const stdout = res.stdout || "";
  const stderr = res.stderr || "";
  if (res.error && res.error.code === "ETIMEDOUT") {
    throw new Error(`seal ${args.join(" ")} timed out`);
  }
  if (res.status !== 0) {
    const out = stripAnsi(`${stdout}\n${stderr}`.trim());
    throw new Error(`seal ${args.join(" ")} failed (status=${res.status})\n${truncate(out)}`);
  }
  return { stdout, stderr, out: stripAnsi(`${stdout}\n${stderr}`) };
}

function copyExampleSkeleton(src, dst) {
  const skipRoots = new Set(["seal-config", "seal-out", "node_modules"]);
  fs.cpSync(src, dst, {
    recursive: true,
    filter: (p) => {
      if (p === src) return true;
      const rel = path.relative(src, p);
      if (!rel) return true;
      if (rel === "seal.json5" || rel === "config.runtime.json5") return false;
      const first = rel.split(path.sep)[0];
      if (skipRoots.has(first)) return false;
      return true;
    },
  });
}

function ensureNodeModules(srcRoot, dstRoot) {
  const srcModules = path.join(srcRoot, "node_modules");
  const dstModules = path.join(dstRoot, "node_modules");
  if (!fs.existsSync(srcModules)) {
    return { ok: false, reason: "node_modules missing in example root" };
  }
  try {
    fs.symlinkSync(srcModules, dstModules, "dir");
    return { ok: true, linked: true };
  } catch (e) {
    log(`WARN: symlink node_modules failed (${e.message}); copying instead`);
    fs.cpSync(srcModules, dstModules, { recursive: true });
    return { ok: true, linked: false };
  }
}

function parseReadyPayload(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

async function stopChild(child, timeoutMs = 5000) {
  await terminateChild(child, timeoutMs);
}

async function runSealed(releaseDir, appName, port, readyFile) {
  const cfgPath = path.join(releaseDir, "config.runtime.json5");
  assert.ok(fs.existsSync(cfgPath), `Missing runtime config: ${cfgPath}`);

  const appctl = path.join(releaseDir, "appctl");
  const useAppctl = fs.existsSync(appctl);
  const bin = useAppctl ? appctl : path.join(releaseDir, appName);
  assert.ok(fs.existsSync(bin), `Missing runtime entry: ${bin}`);

  const args = useAppctl ? ["run"] : [];
  const childEnv = applyReadyFileEnv(process.env, readyFile);
  const child = spawn(bin, args, { cwd: releaseDir, stdio: ["ignore", "pipe", "pipe"], env: childEnv });
  let exitErr = null;
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      exitErr = new Error(`app exited early (code=${code}, signal=${signal || "none"})`);
    }
  });

  try {
    const status = await waitForReady({ port, readyFile, timeoutMs: 12000 });
    if (exitErr) throw exitErr;
    if (readyFile) {
      const payload = parseReadyPayload(status);
      if (payload && payload.buildId === "DEV") {
        throw new Error("unexpected buildId=DEV in sealed run");
      }
    } else if (status.buildId === "DEV") {
      throw new Error("unexpected buildId=DEV in sealed run");
    }
  } finally {
    await stopChild(child, 5000);
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function runRemoteFlow({ tmpRoot, appName }) {
  if (process.env.SEAL_E2E_NO_LISTEN === "1") {
    log("SKIP: remote user flow disabled (SEAL_E2E_NO_LISTEN=1)");
    return;
  }
  if (process.env.SEAL_USER_FLOW_SSH_E2E !== "1") {
    log("SKIP: remote user flow disabled (SEAL_USER_FLOW_SSH_E2E!=1)");
    return;
  }
  if (!hasCommand("ssh") || !hasCommand("scp")) {
    throw new Error("ssh/scp not found (required for remote user flow)");
  }

  const host = process.env.SEAL_SHIP_SSH_HOST;
  if (!host) {
    throw new Error("Missing SEAL_SHIP_SSH_HOST for remote user flow");
  }
  const user = process.env.SEAL_SHIP_SSH_USER || "admin";
  const sshPort = parsePort(process.env.SEAL_SHIP_SSH_PORT);
  const installDir = process.env.SEAL_SHIP_SSH_INSTALL_DIR || `/home/${user}/apps/${appName}`;
  const serviceName = process.env.SEAL_SHIP_SSH_SERVICE_NAME || appName;
  const httpPort = parsePort(process.env.SEAL_SHIP_SSH_HTTP_PORT) || 3333;

  const ping = sshExec(user, host, "echo __SEAL_OK__", sshPort);
  if (!ping.ok || !ping.out.includes("__SEAL_OK__")) {
    throw new Error(`SSH not ready (${ping.out || "no output"})`);
  }
  const sudoCheck = sshExec(user, host, "sudo -n true", sshPort);
  if (!sudoCheck.ok) {
    throw new Error(`Passwordless sudo not available (${sudoCheck.out || "no output"})`);
  }

  runSeal(tmpRoot, ["config", "add", "remote"]);
  const remoteCfgPath = path.join(tmpRoot, "seal-config", "configs", "remote.json5");
  const remoteCfg = readJson5(remoteCfgPath);
  remoteCfg.http = remoteCfg.http || {};
  remoteCfg.http.host = "127.0.0.1";
  remoteCfg.http.port = httpPort;
  writeJson5(remoteCfgPath, remoteCfg);

  runSeal(tmpRoot, ["target", "add", "remote"]);
  const remoteTargetPath = path.join(tmpRoot, "seal-config", "targets", "remote.json5");
  const remoteTargetCfg = readJson5(remoteTargetPath);
  remoteTargetCfg.kind = "ssh";
  remoteTargetCfg.host = host;
  remoteTargetCfg.user = user;
  remoteTargetCfg.serviceScope = "system";
  remoteTargetCfg.installDir = installDir;
  remoteTargetCfg.serviceName = serviceName;
  remoteTargetCfg.packager = "bundle";
  remoteTargetCfg.config = "remote";
  if (sshPort) remoteTargetCfg.sshPort = sshPort;
  writeJson5(remoteTargetPath, remoteTargetCfg);

  const waitUrl = `http://127.0.0.1:${httpPort}/healthz`;
  log(`Remote ship -> ${user}@${host} (${installDir})`);
  runSeal(tmpRoot, ["ship", "remote", "--bootstrap", "--skip-check", "--push-config", "--wait-mode", "both", "--wait-url", waitUrl], {
    timeoutMs: 240000,
  });
  runSeal(tmpRoot, ["uninstall", "remote"]);
}

async function main() {
  if (process.env.SEAL_USER_FLOW_E2E !== "1") {
    log("SKIP: set SEAL_USER_FLOW_E2E=1 to run user-flow E2E");
    process.exit(77);
  }
  if (process.platform !== "linux") {
    log(`SKIP: user-flow E2E is linux-only (platform=${process.platform})`);
    process.exit(77);
  }
  if (!fs.existsSync(EXAMPLE_ROOT)) {
    fail(`Missing example root: ${EXAMPLE_ROOT}`);
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-user-flow-"));
  try {
    copyExampleSkeleton(EXAMPLE_ROOT, tmpRoot);
    const nm = ensureNodeModules(EXAMPLE_ROOT, tmpRoot);
    if (!nm.ok) {
      log(`SKIP: ${nm.reason}`);
      return;
    }

    const profiles = runSeal(tmpRoot, ["profiles"]);
    const profileText = profiles.out.trim();
    let profileOk = false;
    const lower = profileText.toLowerCase();
    if (lower.includes("security profiles") && lower.includes("minimal")) {
      profileOk = true;
    } else if (profileText.startsWith("{") || profileText.startsWith("[")) {
      const parsed = parseReadyPayload(profileText);
      const raw = parsed ? JSON.stringify(parsed).toLowerCase() : "";
      if (raw.includes("minimal")) profileOk = true;
    }
    if (!profileOk) {
      throw new Error(`profiles output missing expected sections\n${truncate(profileText)}`);
    }

    runSeal(tmpRoot, ["init"]);
    const sealPath = path.join(tmpRoot, "seal.json5");
    const localTarget = path.join(tmpRoot, "seal-config", "targets", "local.json5");
    const localConfig = path.join(tmpRoot, "seal-config", "configs", "local.json5");
    const runtimeConfig = path.join(tmpRoot, "config.runtime.json5");
    assert.ok(fs.existsSync(sealPath), "seal.json5 missing after init");
    assert.ok(fs.existsSync(localTarget), "local target missing after init");
    assert.ok(fs.existsSync(localConfig), "local config missing after init");
    assert.ok(fs.existsSync(runtimeConfig), "config.runtime.json5 missing after init");

    const sealCfg = readJson5(sealPath);
    sealCfg.build = sealCfg.build || {};
    sealCfg.build.packager = "bundle";
    sealCfg.build.thin = sealCfg.build.thin || {};
    sealCfg.build.thin.mode = "single";
    if (sealCfg.build.protection && typeof sealCfg.build.protection === "object") {
      const prot = { ...sealCfg.build.protection };
      delete prot.elfPacker;
      sealCfg.build.protection = prot;
    }
    writeJson5(sealPath, sealCfg);

    const localTargetCfg = readJson5(localTarget);
    localTargetCfg.installDir = path.join(tmpRoot, "deploy-root");
    localTargetCfg.serviceName = `seal-user-flow-${process.pid}-${Date.now()}`;
    localTargetCfg.serviceScope = "user";
    localTargetCfg.packager = "bundle";
    writeJson5(localTarget, localTargetCfg);

    runSeal(tmpRoot, ["config", "add", "staging"]);
    runSeal(tmpRoot, ["target", "add", "staging"]);
    assert.ok(fs.existsSync(path.join(tmpRoot, "seal-config", "configs", "staging.json5")), "staging config missing");
    assert.ok(fs.existsSync(path.join(tmpRoot, "seal-config", "targets", "staging.json5")), "staging target missing");

    const explain = runSeal(tmpRoot, ["config", "explain", "local"]);
    if (!explain.out.includes("packager: bundle")) {
      throw new Error("config explain did not report packager=bundle");
    }

    const check = runSeal(tmpRoot, ["check"]);
    if (!check.out.includes("Check OK")) {
      throw new Error("seal check did not report Check OK");
    }

    runSeal(tmpRoot, ["release", "--skip-check"], { timeoutMs: 180000 });
    const releaseDir = path.join(tmpRoot, "seal-out", "release");
    assert.ok(fs.existsSync(releaseDir), "release dir missing after release");
    const appName = sealCfg.appName || "seal-example";
    assert.ok(fs.existsSync(path.join(releaseDir, appName)), "release binary missing");
    assert.ok(fs.existsSync(path.join(releaseDir, "appctl")), "appctl missing in release");

    const verify = runSeal(tmpRoot, ["verify", "--explain"]);
    if (!verify.out.includes("Artifact looks clean")) {
      throw new Error("verify did not confirm clean artifact");
    }

    const port = await getFreePort();
    const readyFile = port === null ? makeReadyFile("user-flow") : null;
    if (readyFile) {
      log("WARN: listen not permitted; using ready-file mode");
    }
    const cfg = readJson5(localConfig);
    cfg.http = cfg.http || {};
    cfg.http.host = "127.0.0.1";
    cfg.http.port = port || 3000;
    writeJson5(localConfig, cfg);
    fs.copyFileSync(localConfig, path.join(releaseDir, "config.runtime.json5"));

    runSeal(tmpRoot, ["deploy", "local"]);
    const currentBuildId = path.join(localTargetCfg.installDir, "current.buildId");
    assert.ok(fs.existsSync(currentBuildId), "current.buildId missing after deploy");

    if (readyFile) {
      log("SKIP: systemd user ship disabled (ready-file mode)");
    } else if (systemctlUserReady()) {
      runSeal(tmpRoot, ["ship", "local", "--bootstrap", "--skip-check", "--wait-mode", "systemd"], { timeoutMs: 240000 });
      const svcPath = path.join(os.homedir(), ".config", "systemd", "user", `${localTargetCfg.serviceName}.service`);
      assert.ok(fs.existsSync(svcPath), "systemd user service missing after ship --bootstrap");
      runSeal(tmpRoot, ["uninstall", "local"]);
    }

    fs.copyFileSync(localConfig, path.join(releaseDir, "config.runtime.json5"));
    await runSealed(releaseDir, appName, port, readyFile);
    await runRemoteFlow({ tmpRoot, appName });

    runSeal(tmpRoot, ["clean"]);
    assert.ok(!fs.existsSync(path.join(tmpRoot, "seal-out")), "seal-out still present after clean");

    log("OK: user flow validated");
  } catch (e) {
    fail(e && e.stack ? e.stack : String(e));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main();
