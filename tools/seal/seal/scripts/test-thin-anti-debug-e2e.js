#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");

function log(msg) {
  process.stdout.write(`[thin-anti-debug-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[thin-anti-debug-e2e] ERROR: ${msg}\n`);
}

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
}

function hasCommand(cmd) {
  const res = runCmd("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`]);
  return res.status === 0;
}

function checkPrereqs() {
  if (process.platform !== "linux") {
    log(`SKIP: thin anti-debug E2E is linux-only (platform=${process.platform})`);
    return { ok: false, skip: true };
  }
  if (!hasCommand("cc") && !hasCommand("gcc")) {
    fail("Missing C compiler (cc/gcc)");
    return { ok: false, skip: false };
  }
  if (!hasCommand("pkg-config")) {
    fail("Missing pkg-config (required for libzstd)");
    return { ok: false, skip: false };
  }
  const zstdCheck = runCmd("pkg-config", ["--libs", "libzstd"]);
  if (zstdCheck.status !== 0) {
    fail("libzstd not found via pkg-config");
    return { ok: false, skip: false };
  }
  return { ok: true, skip: false };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(label, ms, fn) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([fn(), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function httpJson({ port, path: reqPath, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: reqPath,
        method: "GET",
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            const json = JSON.parse(raw);
            resolve({ status: res.statusCode, json });
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${raw.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("HTTP timeout")));
    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function waitForStatus(port, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { status, json } = await httpJson({ port, path: "/api/status", timeoutMs: 800 });
      if (status === 200 && json && json.ok) return json;
    } catch {
      // ignore and retry
    }
    await delay(200);
  }
  throw new Error(`Timeout waiting for /api/status on port ${port}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : null;
      srv.close(() => resolve(port));
    });
  });
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runReleaseOk({ releaseDir, runTimeoutMs, env }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }
  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        code !== null ? `code=${code}` : null,
        signal ? `signal=${signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      reject(new Error(`process exited early (${detail || "no output"})`));
    });
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([waitForStatus(port), exitPromise]));
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}

async function runReleaseExpectFail({ releaseDir, runTimeoutMs, env, expectStderr }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }
  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      resolve({ code, signal, stdout, stderr });
    });
  });

  try {
    const winner = await withTimeout("expectFail", runTimeoutMs, () => Promise.race([
      exitPromise,
      waitForStatus(port).then(() => ({ ok: true })),
    ]));
    if (winner && winner.ok) {
      throw new Error("process reached /api/status (expected failure)");
    }
    const { code, signal, stderr } = winner || {};
    if (code === 0) {
      throw new Error("process exited with code=0 (expected failure)");
    }
    if (code === null && !signal) {
      throw new Error("process did not fail as expected");
    }
    if (expectStderr) {
      const hay = String(stderr || "");
      const ok = expectStderr instanceof RegExp ? expectStderr.test(hay) : hay.includes(String(expectStderr));
      if (!ok) {
        throw new Error(`stderr did not match expected pattern: ${expectStderr}`);
      }
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}

async function runReleaseExpectFailAfterReady({ releaseDir, readyTimeoutMs, failTimeoutMs, env, expectStderr }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }
  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      resolve({ code, signal, stdout, stderr });
    });
  });

  try {
    await withTimeout("waitForReady", readyTimeoutMs, () => Promise.race([
      waitForStatus(port),
      exitPromise.then(({ code, signal }) => {
        throw new Error(`process exited before ready (code=${code} signal=${signal || "none"})`);
      }),
    ]));

    const failRes = await withTimeout("waitForFail", failTimeoutMs, () => exitPromise);
    const { code, signal, stderr } = failRes || {};
    if (code === 0) {
      throw new Error("process exited with code=0 (expected failure)");
    }
    if (code === null && !signal) {
      throw new Error("process did not fail as expected");
    }
    if (expectStderr) {
      const hay = String(stderr || "");
      const ok = expectStderr instanceof RegExp ? expectStderr.test(hay) : hay.includes(String(expectStderr));
      if (!ok) {
        throw new Error(`stderr did not match expected pattern: ${expectStderr}`);
      }
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}

async function buildThinSplit({
  outRoot,
  antiDebug,
  integrity,
  appBind,
  snapshotGuard,
  launcherHardening,
  launcherObfuscation,
}) {
  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  const thinCfg = Object.assign({}, projectCfg.build.thin || {});
  if (antiDebug !== undefined) thinCfg.antiDebug = Object.assign({}, thinCfg.antiDebug || {}, antiDebug);
  if (integrity !== undefined) thinCfg.integrity = Object.assign({}, thinCfg.integrity || {}, integrity);
  if (appBind !== undefined) thinCfg.appBind = Object.assign({}, thinCfg.appBind || {}, appBind);
  if (snapshotGuard !== undefined) thinCfg.snapshotGuard = Object.assign({}, thinCfg.snapshotGuard || {}, snapshotGuard);
  if (launcherHardening !== undefined) thinCfg.launcherHardening = launcherHardening;
  if (launcherObfuscation !== undefined) thinCfg.launcherObfuscation = launcherObfuscation;
  projectCfg.build.thin = thinCfg;

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const outDir = path.join(outRoot, "seal-out");
  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: "thin-split",
    outDirOverride: outDir,
  });
  return res;
}

function tamperLauncher(releaseDir) {
  const launcherPath = path.join(releaseDir, "b", "a");
  if (!fs.existsSync(launcherPath)) {
    throw new Error(`launcher not found: ${launcherPath}`);
  }
  const buf = fs.readFileSync(launcherPath);
  const idx = Math.max(0, buf.length - 16);
  buf[idx] = buf[idx] ^ 0x01;
  fs.writeFileSync(launcherPath, buf);
}

async function main() {
  if (process.env.SEAL_THIN_ANTI_DEBUG_E2E !== "1") {
    log("SKIP: set SEAL_THIN_ANTI_DEBUG_E2E=1 to run thin anti-debug E2E tests");
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) process.exit(prereq.skip ? 0 : 1);

  const buildTimeoutMs = Number(process.env.SEAL_THIN_ANTI_DEBUG_E2E_BUILD_TIMEOUT_MS || "240000");
  const runTimeoutMs = Number(process.env.SEAL_THIN_ANTI_DEBUG_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_THIN_ANTI_DEBUG_E2E_TIMEOUT_MS || "300000");

  try {
    await getFreePort();
  } catch (e) {
    if (e && e.code === "EPERM") {
      runReleaseOk.skipListen = true;
      log("SKIP: cannot listen on localhost (EPERM)");
    } else {
      throw e;
    }
  }

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-thin-ad-"));
  let failures = 0;
  try {
    const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
    const cObfCmd = baseCfg?.build?.protection?.cObfuscator?.cmd;
    const cObfAvailable = !!(cObfCmd && hasCommand(cObfCmd));
    if (cObfAvailable) {
      log("Testing launcherObfuscation with available cObfuscator...");
      await withTimeout("buildRelease(launcherObfuscation ok)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          launcherObfuscation: true,
        })
      );
      log("OK: launcherObfuscation build succeeded");
    } else {
      log("Testing launcherObfuscation requires cObfuscator...");
      await withTimeout("buildRelease(launcherObfuscation missing)", buildTimeoutMs, async () => {
        let threw = false;
        try {
          await buildThinSplit({
            outRoot,
            launcherObfuscation: true,
          });
        } catch (e) {
          const msg = e && e.message ? e.message : String(e);
          if (!msg.includes("launcherObfuscation")) {
            throw e;
          }
          threw = true;
        }
        if (!threw) {
          throw new Error("expected launcherObfuscation build failure");
        }
      });
      log("OK: launcherObfuscation requires cObfuscator");
    }

    log("Building thin-split with integrity enabled...");
    const resA = await withTimeout("buildRelease(integrity)", buildTimeoutMs, () =>
      buildThinSplit({
        outRoot,
        integrity: { enabled: true },
        antiDebug: { enabled: true, tracerPid: true, denyEnv: true },
        launcherObfuscation: false,
      })
    );
    await withTimeout("run ok (integrity)", testTimeoutMs, () =>
      runReleaseOk({ releaseDir: resA.releaseDir, runTimeoutMs })
    );
    log("OK: integrity enabled (runtime ok)");

    log("Testing denyEnv (NODE_OPTIONS)...");
    await withTimeout("denyEnv fail", testTimeoutMs, () =>
      runReleaseExpectFail({ releaseDir: resA.releaseDir, runTimeoutMs, env: { NODE_OPTIONS: "--trace-warnings" }, expectStderr: "[thin] runtime invalid" })
    );
    log("OK: denyEnv triggers failure");

    log("Testing ptrace/core probes (expect success)...");
    await withTimeout("ptrace/core probes ok", testTimeoutMs, () =>
      runReleaseOk({
        releaseDir: resA.releaseDir,
        runTimeoutMs,
        env: { SEAL_DUMPABLE_PROBE: "1", SEAL_CORE_PROBE: "1" },
      })
    );
    log("OK: ptrace/core probes ok");

    log("Testing ptrace force (expect failure)...");
    await withTimeout("ptrace force fail", testTimeoutMs, () =>
      runReleaseExpectFail({
        releaseDir: resA.releaseDir,
        runTimeoutMs,
        env: { SEAL_PTRACE_FORCE: "1" },
        expectStderr: "[thin] runtime invalid",
      })
    );
    log("OK: ptrace force triggers failure");

    log("Testing loader guard force (expect failure)...");
    await withTimeout("loader guard fail", testTimeoutMs, () =>
      runReleaseExpectFail({
        releaseDir: resA.releaseDir,
        runTimeoutMs,
        env: { SEAL_LOADER_GUARD_FORCE: "1" },
        expectStderr: "[thin] runtime invalid",
      })
    );
    log("OK: loader guard triggers failure");

    log("Testing seccomp probe (expect success)...");
    await withTimeout("seccomp probe ok", testTimeoutMs, () =>
      runReleaseOk({
        releaseDir: resA.releaseDir,
        runTimeoutMs,
        env: { SEAL_SECCOMP_PROBE: "1" },
      })
    );
    log("OK: seccomp probe ok");

    log("Testing integrity tamper...");
    tamperLauncher(resA.releaseDir);
    await withTimeout("integrity tamper fail", testTimeoutMs, () =>
      runReleaseExpectFail({ releaseDir: resA.releaseDir, runTimeoutMs, expectStderr: "[thin] runtime invalid" })
    );
    log("OK: integrity tamper rejected");

    log("Building thin-split with antiDebug disabled...");
    const resB = await withTimeout("buildRelease(antiDebug=off)", buildTimeoutMs, () =>
      buildThinSplit({
        outRoot,
        antiDebug: { enabled: false },
        launcherObfuscation: false,
      })
    );
    await withTimeout("run ok (antiDebug off)", testTimeoutMs, () =>
      runReleaseOk({ releaseDir: resB.releaseDir, runTimeoutMs, env: { LD_PRELOAD: "1" } })
    );
    log("OK: antiDebug disabled allows LD_PRELOAD");

    log("Building thin-split with launcher hardening disabled...");
    const resHard = await withTimeout("buildRelease(hardening off)", buildTimeoutMs, () =>
      buildThinSplit({
        outRoot,
        antiDebug: { enabled: false },
        launcherHardening: false,
        launcherObfuscation: false,
      })
    );
    await withTimeout("run ok (hardening off)", testTimeoutMs, () =>
      runReleaseOk({ releaseDir: resHard.releaseDir, runTimeoutMs })
    );
    log("OK: launcher hardening off still runs");

    log("Building thin-split with maps denylist...");
    const resC = await withTimeout("buildRelease(maps deny)", buildTimeoutMs, () =>
      buildThinSplit({
        outRoot,
        antiDebug: { enabled: true, mapsDenylist: ["libc"] },
        launcherObfuscation: false,
      })
    );
    await withTimeout("maps deny fail", testTimeoutMs, () =>
      runReleaseExpectFail({ releaseDir: resC.releaseDir, runTimeoutMs, expectStderr: "[thin] runtime invalid" })
    );
    log("OK: maps denylist triggers failure");

    log("Testing periodic TracerPid (forced after ready)...");
    const resD = await withTimeout("buildRelease(tracerpid interval)", buildTimeoutMs, () =>
      buildThinSplit({
        outRoot,
        antiDebug: { enabled: true, tracerPid: true, tracerPidIntervalMs: 200, tracerPidThreads: false },
        launcherObfuscation: false,
      })
    );
    await withTimeout("tracerpid interval fail", testTimeoutMs, () =>
      runReleaseExpectFailAfterReady({
        releaseDir: resD.releaseDir,
        readyTimeoutMs: 8000,
        failTimeoutMs: 8000,
        env: { SEAL_TRACERPID_FORCE: "1", SEAL_TRACERPID_FORCE_AFTER_MS: "300" },
        expectStderr: "[thin] runtime invalid",
      })
    );
    log("OK: periodic TracerPid triggers failure");

    log("Testing TracerPid thread scan (forced after ready)...");
    const resE = await withTimeout("buildRelease(tracerpid threads)", buildTimeoutMs, () =>
      buildThinSplit({
        outRoot,
        antiDebug: { enabled: true, tracerPid: true, tracerPidIntervalMs: 200, tracerPidThreads: true },
        launcherObfuscation: false,
      })
    );
    await withTimeout("tracerpid threads fail", testTimeoutMs, () =>
      runReleaseExpectFailAfterReady({
        releaseDir: resE.releaseDir,
        readyTimeoutMs: 8000,
        failTimeoutMs: 8000,
        env: { SEAL_TRACERPID_FORCE_THREADS: "1", SEAL_TRACERPID_FORCE_AFTER_MS: "300" },
        expectStderr: "[thin] runtime invalid",
      })
    );
    log("OK: TracerPid thread scan triggers failure");

    log("Testing appBind mismatch (launcher swap)...");
    const bindRootA = fs.mkdtempSync(path.join(os.tmpdir(), "seal-thin-bind-a-"));
    const bindRootB = fs.mkdtempSync(path.join(os.tmpdir(), "seal-thin-bind-b-"));
    try {
      const resBindA = await withTimeout("buildRelease(appBind A)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot: bindRootA,
          appBind: { value: "bind-a" },
          integrity: { enabled: false },
          launcherObfuscation: false,
        })
      );
      const resBindB = await withTimeout("buildRelease(appBind B)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot: bindRootB,
          appBind: { value: "bind-b" },
          integrity: { enabled: false },
          launcherObfuscation: false,
        })
      );
      const launcherA = path.join(resBindA.releaseDir, "b", "a");
      const launcherB = path.join(resBindB.releaseDir, "b", "a");
      fs.copyFileSync(launcherB, launcherA);
      await withTimeout("appBind mismatch fail", testTimeoutMs, () =>
        runReleaseExpectFail({ releaseDir: resBindA.releaseDir, runTimeoutMs, expectStderr: "decode runtime failed" })
      );
    } finally {
      fs.rmSync(bindRootA, { recursive: true, force: true });
      fs.rmSync(bindRootB, { recursive: true, force: true });
    }
    log("OK: appBind mismatch rejected");

    log("Testing snapshot guard (forced after ready)...");
    const resSnap = await withTimeout("buildRelease(snapshotGuard)", buildTimeoutMs, () =>
      buildThinSplit({
        outRoot,
        snapshotGuard: { enabled: true, intervalMs: 200, maxJumpMs: 200, maxBackMs: 100 },
        launcherObfuscation: false,
      })
    );
    await withTimeout("snapshot guard fail", testTimeoutMs, () =>
      runReleaseExpectFail({
        releaseDir: resSnap.releaseDir,
        runTimeoutMs,
        env: { SEAL_SNAPSHOT_FORCE: "1" },
        expectStderr: "[thin] runtime invalid",
      })
    );
    log("OK: snapshot guard triggers failure");
  } catch (e) {
    failures += 1;
    fail(e.message || e);
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
