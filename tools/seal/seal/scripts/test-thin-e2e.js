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

const EXAMPLE_ROOT = path.resolve(__dirname, "..", "..", "example");

function log(msg) {
  process.stdout.write(`[thin-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[thin-e2e] ERROR: ${msg}\n`);
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
    log(`SKIP: thin packager test is linux-only (platform=${process.platform})`);
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
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
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
    req.on("timeout", () => {
      req.destroy(new Error("HTTP timeout"));
    });
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

async function buildThinRelease(mode, buildTimeoutMs) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  targetCfg.packager = "thin";
  targetCfg.thinMode = mode;

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), `seal-thin-${mode}-`));
  const outDir = path.join(outRoot, "seal-out");

  const res = await withTimeout(`buildRelease(${mode})`, buildTimeoutMs, () =>
    buildRelease({
      projectRoot: EXAMPLE_ROOT,
      projectCfg,
      targetCfg,
      configName,
      packagerOverride: "thin",
      outDirOverride: outDir,
    })
  );

  return { ...res, outRoot, outDir };
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "config", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runRelease({ releaseDir, buildId, runTimeoutMs, env }) {
  if (runRelease.skipListen) {
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
  const childExit = new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });

  let status;
  try {
    const earlyExit = childExit.then(({ code, signal }) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        code !== null ? `code=${code}` : null,
        signal ? `signal=${signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      throw new Error(`process exited early (${detail || "no output"})`);
    });
    status = await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([waitForStatus(port), earlyExit]));
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

  assert.strictEqual(status.appName, "seal-example");
  assert.strictEqual(status.buildId, buildId);
  assert.strictEqual(status.http.port, port);
}

async function testThinAio(ctx) {
  log("Building thin AIO...");
  const res = await buildThinRelease("aio", ctx.buildTimeoutMs);
  const { releaseDir, buildId, outRoot } = res;

  const aioB = path.join(releaseDir, "b", "a");
  const aioR = path.join(releaseDir, "r", "rt");
  assert.ok(!fs.existsSync(aioB), "AIO release should not contain b/a");
  assert.ok(!fs.existsSync(aioR), "AIO release should not contain r/rt");

  log("Running thin AIO binary...");
  await runRelease({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });

  const badEnv = {
    NODE_OPTIONS: "--require /nonexistent",
    NODE_PATH: "/nonexistent",
    NODE_V8_COVERAGE: "/tmp/cover",
  };
  log("Running thin AIO with hardened env (default)...");
  await runRelease({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs, env: badEnv });

  log("Running thin AIO with hardened env (strict)...");
  await runRelease({
    releaseDir,
    buildId,
    runTimeoutMs: ctx.runTimeoutMs,
    env: { ...badEnv, SEAL_THIN_ENV_STRICT: "1", PATH: "" },
  });

  fs.rmSync(outRoot, { recursive: true, force: true });
}

async function testThinBootstrap(ctx) {
  log("Building thin BOOTSTRAP...");
  const res = await buildThinRelease("bootstrap", ctx.buildTimeoutMs);
  const { releaseDir, buildId, outRoot } = res;

  const launcher = path.join(releaseDir, "b", "a");
  const rt = path.join(releaseDir, "r", "rt");
  const pl = path.join(releaseDir, "r", "pl");
  assert.ok(fs.existsSync(launcher), "BOOTSTRAP release missing b/a");
  assert.ok(fs.existsSync(rt), "BOOTSTRAP release missing r/rt");
  assert.ok(fs.existsSync(pl), "BOOTSTRAP release missing r/pl");

  log("Running thin BOOTSTRAP wrapper...");
  await runRelease({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });

  const badEnv = {
    NODE_OPTIONS: "--require /nonexistent",
    NODE_PATH: "/nonexistent",
    NODE_V8_COVERAGE: "/tmp/cover",
  };
  log("Running thin BOOTSTRAP with hardened env (default)...");
  await runRelease({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs, env: badEnv });

  log("Running thin BOOTSTRAP with hardened env (strict)...");
  await runRelease({
    releaseDir,
    buildId,
    runTimeoutMs: ctx.runTimeoutMs,
    env: { ...badEnv, SEAL_THIN_ENV_STRICT: "1", PATH: "" },
  });

  fs.rmSync(outRoot, { recursive: true, force: true });
}

async function main() {
  if (process.env.SEAL_THIN_E2E !== "1") {
    log("SKIP: set SEAL_THIN_E2E=1 to run thin E2E tests");
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 0 : 1);
  }

  const prevChunk = process.env.SEAL_THIN_CHUNK_SIZE;
  const prevZstd = process.env.SEAL_THIN_ZSTD_LEVEL;
  const prevZstdTimeout = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
  process.env.SEAL_THIN_CHUNK_SIZE = process.env.SEAL_THIN_CHUNK_SIZE || "8388608";
  process.env.SEAL_THIN_ZSTD_LEVEL = process.env.SEAL_THIN_ZSTD_LEVEL || "1";
  process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS || "120000";

  const buildTimeoutMs = Number(process.env.SEAL_THIN_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_THIN_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_THIN_E2E_TIMEOUT_MS || "240000");
  const ctx = { buildTimeoutMs, runTimeoutMs };

  try {
    await getFreePort();
  } catch (e) {
    if (e && e.code === "EPERM") {
      runRelease.skipListen = true;
      log("SKIP: cannot listen on localhost (EPERM)");
    } else {
      throw e;
    }
  }

  const tests = [testThinAio, testThinBootstrap];
  let failures = 0;
  try {
    for (const t of tests) {
      try {
        await withTimeout(t.name, testTimeoutMs, () => t(ctx));
        log(`OK: ${t.name}`);
      } catch (e) {
        failures += 1;
        fail(`${t.name}: ${e.message || e}`);
      }
    }
  } finally {
    if (prevChunk === undefined) delete process.env.SEAL_THIN_CHUNK_SIZE;
    else process.env.SEAL_THIN_CHUNK_SIZE = prevChunk;
    if (prevZstd === undefined) delete process.env.SEAL_THIN_ZSTD_LEVEL;
    else process.env.SEAL_THIN_ZSTD_LEVEL = prevZstd;
    if (prevZstdTimeout === undefined) delete process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
    else process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = prevZstdTimeout;
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
