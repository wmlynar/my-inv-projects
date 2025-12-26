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
  process.stdout.write(`[strip-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[strip-e2e] ERROR: ${msg}\n`);
}

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
}

function hasCommand(cmd) {
  const res = runCmd("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`]);
  return res.status === 0;
}

function ensureLauncherObfuscation(projectCfg) {
  const thinCfg = projectCfg.build && projectCfg.build.thin ? projectCfg.build.thin : {};
  const cObf = projectCfg.build && projectCfg.build.protection ? projectCfg.build.protection.cObfuscator || {} : {};
  const cObfCmd = cObf.cmd || cObf.tool;
  if (thinCfg.launcherObfuscation !== false && cObfCmd && !hasCommand(cObfCmd)) {
    log(`C obfuscator not available (${cObfCmd}); disabling launcherObfuscation for test`);
    thinCfg.launcherObfuscation = false;
  }
  projectCfg.build.thin = thinCfg;
}

function checkPrereqs() {
  if (process.platform !== "linux") {
    log(`SKIP: strip E2E is linux-only (platform=${process.platform})`);
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
  if (!hasCommand("strip")) {
    fail("Missing strip (binutils). Run: tools/seal/seal/scripts/install-strip.sh");
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

async function runRelease({ releaseDir, runTimeoutMs }) {
  if (runRelease.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }

  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

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

function readelfHasSymtab(binPath) {
  if (!hasCommand("readelf")) return null;
  const res = runCmd("readelf", ["-S", binPath], 5000);
  if (res.status !== 0) return null;
  const out = String(res.stdout || "");
  return out.includes(".symtab");
}

async function buildWithStrip({ outRoot, packager }) {
  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {});
  projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, {
    strip: { enabled: true, cmd: "strip" },
    elfPacker: {},
  });
  ensureLauncherObfuscation(projectCfg);

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const outDir = path.join(outRoot, "seal-out");
  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: packager || "thin-split",
    outDirOverride: outDir,
  });

  const metaPath = path.join(res.outDir, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  return { ...res, meta };
}

function extractStripStep(res) {
  const steps = ((res.meta || {}).protection || {}).post?.steps || [];
  const stripStep = steps.find((s) => s.step === "strip");
  assert.ok(stripStep, "Missing strip step in meta");
  return stripStep;
}

async function testStripMetadataThinSplit(res) {
  const stripStep = extractStripStep(res);
  if (!stripStep.ok) {
    throw new Error(`strip step not OK: ${JSON.stringify(stripStep)}`);
  }

  const launcherPath = path.join(res.releaseDir, "b", "a");
  const binPath = fs.existsSync(launcherPath)
    ? launcherPath
    : path.join(res.releaseDir, "seal-example");
  const symtab = readelfHasSymtab(binPath);
  if (symtab === true) {
    throw new Error("Expected stripped thin-split binary (symtab still present)");
  }
}

async function testStripRuntime(res, ctx) {
  await runRelease({ releaseDir: res.releaseDir, runTimeoutMs: ctx.runTimeoutMs });
}

async function expectBuildFailure(label, fn, match) {
  try {
    await fn();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (match && !msg.includes(match)) {
      throw new Error(`${label}: expected error to include "${match}", got: ${msg}`);
    }
    return;
  }
  throw new Error(`${label}: expected build to fail`);
}

async function main() {
  if (process.env.SEAL_STRIP_E2E !== "1") {
    log("SKIP: set SEAL_STRIP_E2E=1 to run strip E2E tests");
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) process.exit(prereq.skip ? 0 : 1);

  const prevPath = process.env.PATH;
  const binCandidates = [
    path.resolve(__dirname, "..", "node_modules", ".bin"),
    path.resolve(__dirname, "..", "..", "node_modules", ".bin"),
  ];
  for (const binPath of binCandidates) {
    if (fs.existsSync(binPath) && !process.env.PATH.split(path.delimiter).includes(binPath)) {
      process.env.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;
    }
  }

  const prevChunk = process.env.SEAL_THIN_CHUNK_SIZE;
  const prevZstd = process.env.SEAL_THIN_ZSTD_LEVEL;
  const prevZstdTimeout = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
  process.env.SEAL_THIN_CHUNK_SIZE = process.env.SEAL_THIN_CHUNK_SIZE || "8388608";
  process.env.SEAL_THIN_ZSTD_LEVEL = process.env.SEAL_THIN_ZSTD_LEVEL || "1";
  process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS || "120000";

  const buildTimeoutMs = Number(process.env.SEAL_STRIP_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_STRIP_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_STRIP_E2E_TIMEOUT_MS || "240000");
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

  if (process.env.SEAL_STRIP_E2E_SKIP_RUN === "1") {
    runRelease.skipListen = true;
    log("SKIP: runtime check disabled by SEAL_STRIP_E2E_SKIP_RUN");
  }

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-strip-"));
  let failures = 0;
  try {
    log("Building thin-split with strip enabled...");
    const thinSplitRes = await withTimeout("buildRelease(strip-thin-split)", buildTimeoutMs, () =>
      buildWithStrip({ outRoot, packager: "thin-split" })
    );
    await withTimeout("testStripMetadataThinSplit", testTimeoutMs, () => testStripMetadataThinSplit(thinSplitRes));
    log("OK: testStripMetadataThinSplit");
    if (!runRelease.skipListen) {
      await withTimeout("testStripRuntime(thin-split)", testTimeoutMs, () => testStripRuntime(thinSplitRes, ctx));
      log("OK: testStripRuntime(thin-split)");
    } else {
      log("SKIP: testStripRuntime(thin-split) (listen not permitted)");
    }

    if (!hasCommand("postject")) {
      log("SKIP: postject not available; SEA strip test disabled");
    } else {
      log("Building SEA with strip enabled (expect error)...");
      await withTimeout("buildRelease(strip-sea)", buildTimeoutMs, () =>
        expectBuildFailure(
          "sea",
          () => buildWithStrip({ outRoot, packager: "sea" }),
          "SEA"
        )
      );
      log("OK: SEA strip rejected");
    }
  } catch (e) {
    failures += 1;
    fail(e.message || e);
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
    if (prevChunk === undefined) delete process.env.SEAL_THIN_CHUNK_SIZE;
    else process.env.SEAL_THIN_CHUNK_SIZE = prevChunk;
    if (prevZstd === undefined) delete process.env.SEAL_THIN_ZSTD_LEVEL;
    else process.env.SEAL_THIN_ZSTD_LEVEL = prevZstd;
    if (prevZstdTimeout === undefined) delete process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
    else process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = prevZstdTimeout;
    process.env.PATH = prevPath;
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
