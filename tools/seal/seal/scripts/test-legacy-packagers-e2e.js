#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { resolvePostjectBin } = require("../src/lib/postject");

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");

function log(msg) {
  process.stdout.write(`[legacy-packagers-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[legacy-packagers-e2e] ERROR: ${msg}\n`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(name, ms, fn) {
  let timer;
  return Promise.race([
    Promise.resolve().then(fn),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function httpJson({ port, path: urlPath, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: urlPath,
        method: "GET",
        timeout: timeoutMs,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            resolve({ status: res.statusCode, json });
          } catch {
            resolve({ status: res.statusCode, json: null });
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timeout"));
    });
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

async function runRelease({ releaseDir, runTimeoutMs, appName }) {
  if (runRelease.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }

  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, appName);
  assert.ok(fs.existsSync(binPath), `Missing runner: ${binPath}`);

  const child = spawn(binPath, [], { cwd: releaseDir, stdio: ["ignore", "pipe", "pipe"] });
  const maxLog = 16000;
  const logs = { out: "", err: "" };
  const append = (prev, chunk) => {
    const next = prev + chunk.toString("utf8");
    return next.length > maxLog ? next.slice(-maxLog) : next;
  };
  child.stdout.on("data", (c) => { logs.out = append(logs.out, c); });
  child.stderr.on("data", (c) => { logs.err = append(logs.err, c); });
  let done = false;
  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      if (done) return;
      reject(new Error(`app exited (code=${code ?? "null"}, signal=${signal || "none"})`));
    });
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([
      waitForStatus(port),
      exitPromise,
    ]));
  } catch (err) {
    const out = logs.out ? `\n--- stdout ---\n${logs.out}` : "";
    const errOut = logs.err ? `\n--- stderr ---\n${logs.err}` : "";
    const msg = `${err && err.message ? err.message : err}${out}${errOut}`;
    throw new Error(msg);
  } finally {
    done = true;
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

async function buildWithPackager(packager, buildTimeoutMs) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.packager = packager;
  projectCfg.build.packagerFallback = false;
  projectCfg.build.sentinel = { enabled: false };
  projectCfg.build.decoy = { mode: "none" };
  projectCfg.build.frontendObfuscation = { enabled: false };
  projectCfg.build.frontendMinify = { enabled: false };
  projectCfg.build.protection = { enabled: false };
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {}, {
    integrity: { enabled: false },
  });

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");
  targetCfg.packager = packager;

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), `seal-out-${packager}-`));
  const outDir = path.join(outRoot, "seal-out");
  const res = await withTimeout(`buildRelease(${packager})`, buildTimeoutMs, () =>
    buildRelease({
      projectRoot: EXAMPLE_ROOT,
      projectCfg,
      targetCfg,
      configName,
      packagerOverride: packager,
      outDirOverride: outDir,
    })
  );
  return { ...res, outRoot };
}

async function testPackager(packager, ctx) {
  log(`Building ${packager}...`);
  const res = await buildWithPackager(packager, ctx.buildTimeoutMs);
  const { releaseDir, outRoot, packagerUsed, appName } = res;
  try {
    assert.strictEqual(packagerUsed, packager, `Expected packagerUsed=${packager} but got ${packagerUsed}`);
    await runRelease({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, appName });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function testSeaPackager(ctx) {
  const postjectBin = resolvePostjectBin();
  if (!postjectBin) {
    log("SKIP: postject not available; sea packager test disabled");
    return;
  }
  await testPackager("sea", ctx);
}

async function main() {
  if (process.env.SEAL_LEGACY_PACKAGERS_E2E !== "1") {
    log("SKIP: set SEAL_LEGACY_PACKAGERS_E2E=1 to run legacy packager E2E");
    process.exit(0);
  }
  if (process.platform !== "linux") {
    log(`SKIP: legacy packager tests are linux-only (platform=${process.platform})`);
    process.exit(0);
  }

  const buildTimeoutMs = Number(process.env.SEAL_LEGACY_PACKAGERS_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_LEGACY_PACKAGERS_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_LEGACY_PACKAGERS_E2E_TIMEOUT_MS || "240000");
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

  const tests = [
    { name: "bundle", run: () => testPackager("bundle", ctx) },
    { name: "none", run: () => testPackager("none", ctx) },
    { name: "sea", run: () => testSeaPackager(ctx) },
  ];

  let failures = 0;
  for (const t of tests) {
    const name = t.name || "legacy-packager";
    try {
      await withTimeout(name, testTimeoutMs, t.run);
      log(`OK: ${name}`);
    } catch (err) {
      failures += 1;
      fail(`${name}: ${err.message || err}`);
    }
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
