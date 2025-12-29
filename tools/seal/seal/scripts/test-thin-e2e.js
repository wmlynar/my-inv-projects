#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const {
  hasCommand,
  resolveE2ETimeout,
  resolveE2ERunTimeout,
  withTimeout,
  getFreePort,
  resolveExampleRoot,
  createLogger,
  withSealedBinary,
  terminateChild,
  spawnSyncWithTimeout,
  readReadyPayload,
} = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { THIN_NATIVE_BOOTSTRAP_FILE } = require("../src/lib/thinPaths");

const EXAMPLE_ROOT = resolveExampleRoot();

const { log, fail } = createLogger("thin-e2e");

function runCmd(cmd, args, timeoutMs = 5000) {
  const res = spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
  if (res.error) {
    const msg = res.error.message || String(res.error);
    throw new Error(`${cmd} failed: ${msg}`);
  }
  return res;
}

function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(1024 * 1024);
    let bytes = 0;
    while ((bytes = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
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

function hasCxx() {
  return hasCommand("c++") || hasCommand("g++") || hasCommand("clang++");
}

function resolveCxx() {
  if (process.env.CXX) return process.env.CXX;
  if (hasCommand("c++")) return "c++";
  if (hasCommand("g++")) return "g++";
  if (hasCommand("clang++")) return "clang++";
  return null;
}

function supportsCxx20(cxx) {
  if (!cxx) return false;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-cxx20-"));
  const srcPath = path.join(tmpDir, "cxx20.cc");
  const outPath = path.join(tmpDir, "cxx20.o");
  try {
    fs.writeFileSync(srcPath, "int main(){return 0;}\n", "utf-8");
    const res = spawnSyncWithTimeout(cxx, ["-std=c++20", "-c", srcPath, "-o", outPath], {
      stdio: "ignore",
      timeout: 8000,
    });
    return res.status === 0;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function resolveNodeIncludeDir() {
  const candidates = [];
  if (process.env.SEAL_NODE_INCLUDE_DIR) candidates.push(process.env.SEAL_NODE_INCLUDE_DIR);
  if (process.env.NODE_INCLUDE_DIR) candidates.push(process.env.NODE_INCLUDE_DIR);
  const execDir = path.dirname(process.execPath);
  candidates.push(path.join(execDir, "..", "include", "node"));
  candidates.push("/usr/include/node");
  for (const dir of candidates) {
    if (dir && fs.existsSync(dir)) return dir;
  }
  return null;
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

function checkNativePrereqs() {
  if (!hasCxx()) {
    return { ok: false, skip: true, reason: "Missing C++ compiler (c++/g++/clang++)" };
  }
  const cxx = resolveCxx();
  if (!supportsCxx20(cxx)) {
    return { ok: false, skip: true, reason: "C++20 support missing (native bootstrap requires C++20)" };
  }
  const nodeInc = resolveNodeIncludeDir();
  if (!nodeInc) {
    return { ok: false, skip: true, reason: "Missing Node headers (set SEAL_NODE_INCLUDE_DIR)" };
  }
  return { ok: true, skip: false };
}

async function buildThinRelease(buildTimeoutMs, opts = {}) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  const packager = opts.packager || "thin-split";
  const thinCfg = Object.assign({}, projectCfg.build.thin || {});
  if (packager === "thin-single") {
    thinCfg.mode = "single";
    thinCfg.integrity = { enabled: false };
    thinCfg.launcherObfuscation = false;
    thinCfg.nativeBootstrap = { enabled: false };
  } else {
    thinCfg.mode = "split";
  }
  if (opts.nativeBootstrap === true) {
    const mode = opts.nativeBootstrapMode;
    thinCfg.nativeBootstrap = mode ? { enabled: true, mode } : { enabled: true };
  }
  projectCfg.build.thin = thinCfg;
  ensureLauncherObfuscation(projectCfg);
  if (packager !== "thin-single"
    && projectCfg.build.protection?.elfPacker?.tool
    && !hasCommand(projectCfg.build.protection.elfPacker.cmd || projectCfg.build.protection.elfPacker.tool)) {
    log("ELF packer not available; disabling elfPacker for test");
    projectCfg.build.protection.elfPacker = {};
  }
  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  targetCfg.packager = packager;

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), packager === "thin-single" ? "seal-out-single-" : "seal-out-split-"));
  const outDir = path.join(outRoot, "seal-out");

  try {
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
    return { ...res, outRoot, outDir };
  } catch (err) {
    fs.rmSync(outRoot, { recursive: true, force: true });
    throw err;
  }
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port || 3000;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

function assertNoReleaseArtifacts(releaseDir) {
  const forbiddenNames = new Set([
    "codec_state.json",
    "codec_state.bin",
    "codec_state",
  ]);
  if (fs.existsSync(path.join(releaseDir, "seal-out"))) {
    throw new Error("forbidden artifact in release: seal-out");
  }
  if (fs.existsSync(path.join(releaseDir, "cache"))) {
    throw new Error("forbidden artifact in release: cache");
  }
  const stack = [releaseDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (forbiddenNames.has(ent.name)) {
        throw new Error(`forbidden artifact in release: ${path.relative(releaseDir, full)}`);
      }
      if (ent.isDirectory()) stack.push(full);
    }
  }
}

function resolveRunTimeoutMs(releaseDir, runTimeoutMs) {
  const base = Number.isFinite(runTimeoutMs) && runTimeoutMs > 0 ? runTimeoutMs : 10_000;
  const nativeOverrideRaw = process.env.SEAL_THIN_E2E_NATIVE_RUN_TIMEOUT_MS;
  const nativeOverride = nativeOverrideRaw ? Number(nativeOverrideRaw) : 0;
  if (!Number.isFinite(nativeOverride) || nativeOverride <= 0) return base;
  const nbPath = path.join(releaseDir, "r", THIN_NATIVE_BOOTSTRAP_FILE);
  if (!fs.existsSync(nbPath)) return base;
  return Math.max(base, nativeOverride);
}

async function runRelease({ releaseDir, buildId, runTimeoutMs, env }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);
  const statusTimeout = resolveRunTimeoutMs(releaseDir, runTimeoutMs);
  await withSealedBinary({
    label: "thin",
    releaseDir,
    binPath,
    runTimeoutMs: statusTimeout,
    skipListen: runRelease.skipListen === true,
    writeRuntimeConfig,
    env,
    log,
    captureOutput: true,
  }, async ({ port, readyFile, ready }) => {
    if (readyFile) {
      const payload = await readReadyPayload(readyFile, ready, 1000);
      if (!payload) {
        throw new Error(`ready-file payload invalid (${readyFile})`);
      }
      assert.strictEqual(payload.appName, "seal-example");
      assert.strictEqual(payload.buildId, buildId);
      return;
    }
    assert.strictEqual(ready.appName, "seal-example");
    assert.strictEqual(ready.buildId, buildId);
    assert.strictEqual(ready.http.port, port);
  });
}

async function runReleaseExpectFailure({ releaseDir, env, runTimeoutMs, expectSubstring, expectExitCode }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: ["ignore", "pipe", "pipe"], env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  let exit = null;
  try {
    exit = await withTimeout("expectFailure", runTimeoutMs, () =>
      new Promise((resolve) => {
        child.on("close", (code, signal) => resolve({ code, signal }));
        child.on("error", (error) => resolve({ code: null, signal: null, error }));
      })
    );
  } catch (err) {
    await terminateChild(child);
    throw err;
  }

  if (exit && exit.error) {
    throw exit.error;
  }

  const stdout = Buffer.concat(outChunks).toString("utf8");
  const stderr = Buffer.concat(errChunks).toString("utf8");
  const combined = `${stdout}${stderr}`;
  if (exit.code === 0) {
    throw new Error(`expected failure but exit code was 0 (stdout=${stdout.slice(0, 200)}, stderr=${stderr.slice(0, 200)})`);
  }
  if (typeof expectExitCode === "number" && exit.code !== expectExitCode) {
    throw new Error(`expected exit code ${expectExitCode} but got ${exit.code} (stdout=${stdout.slice(0, 200)}, stderr=${stderr.slice(0, 200)})`);
  }
  if (expectSubstring && !combined.includes(expectSubstring)) {
    throw new Error(`expected output to include "${expectSubstring}" (stdout=${stdout.slice(0, 200)}, stderr=${stderr.slice(0, 200)})`);
  }
}

async function testThinSplit(ctx) {
  log("Building thin SPLIT (bootstrap)...");
  const res = await buildThinRelease(ctx.buildTimeoutMs);
  const { releaseDir, buildId, outRoot } = res;

  try {
    const launcher = path.join(releaseDir, "b", "a");
    const rt = path.join(releaseDir, "r", "rt");
    const pl = path.join(releaseDir, "r", "pl");
    assert.ok(fs.existsSync(launcher), "BOOTSTRAP release missing b/a");
    assert.ok(fs.existsSync(rt), "BOOTSTRAP release missing r/rt");
    assert.ok(fs.existsSync(pl), "BOOTSTRAP release missing r/pl");
    assertNoReleaseArtifacts(releaseDir);

    log("Running thin SPLIT wrapper...");
    await runRelease({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });

    log("Running thin SPLIT with hardened env (strict)...");
    await runRelease({
      releaseDir,
      buildId,
      runTimeoutMs: ctx.runTimeoutMs,
      env: { SEAL_THIN_ENV_STRICT: "1", PATH: "" },
    });

    const badEnv = {
      NODE_OPTIONS: "--require /nonexistent",
      NODE_PATH: "/nonexistent",
      NODE_V8_COVERAGE: "/tmp/cover",
    };
    log("Running thin SPLIT with debug env (expect failure)...");
    await runReleaseExpectFailure({
      releaseDir,
      runTimeoutMs: ctx.runTimeoutMs,
      env: badEnv,
      expectSubstring: "[thin] runtime invalid",
    });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function testThinSingleLegacy(ctx) {
  log("Building thin-single (AIO)...");
  const res = await buildThinRelease(ctx.buildTimeoutMs, { packager: "thin-single" });
  const { releaseDir, buildId, outRoot } = res;

  try {
    const binPath = path.join(releaseDir, "seal-example");
    assert.ok(fs.existsSync(binPath), "AIO release missing seal-example binary");

    log("Running thin-single...");
    await runRelease({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function testThinSplitNativeBootstrap(ctx) {
  const prereq = checkNativePrereqs();
  if (!prereq.ok) {
    log(`SKIP: native bootstrap prerequisites not met (${prereq.reason || "unknown"})`);
    return;
  }

  const modes = ["compile", "string"];
  for (const mode of modes) {
    log(`Building thin SPLIT (bootstrap) with native bootstrap mode=${mode}...`);
    const res = await buildThinRelease(ctx.buildTimeoutMs, { nativeBootstrap: true, nativeBootstrapMode: mode });
    const { releaseDir, buildId, outRoot } = res;

    try {
      const nb = path.join(releaseDir, "r", THIN_NATIVE_BOOTSTRAP_FILE);
      assert.ok(fs.existsSync(nb), `BOOTSTRAP release missing r/${THIN_NATIVE_BOOTSTRAP_FILE}`);
      const nbSize = fs.statSync(nb).size;
      const launcher = path.join(releaseDir, "b", "a");
      const launcherSize = fs.existsSync(launcher) ? fs.statSync(launcher).size : 0;
      log(`Native bootstrap mode=${mode} sizes: ${THIN_NATIVE_BOOTSTRAP_FILE}=${nbSize} bytes, launcher=${launcherSize} bytes`);

      log(`Running thin SPLIT with native bootstrap mode=${mode}...`);
      await runRelease({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });

      if (mode === "compile") {
        log("Running thin SPLIT with native bootstrap (missing addon -> expect failure)...");
        const nbBak = `${nb}.bak`;
        fs.renameSync(nb, nbBak);
        try {
          await runReleaseExpectFailure({
            releaseDir,
            runTimeoutMs: ctx.runTimeoutMs,
            expectExitCode: 82,
          });
        } finally {
          if (fs.existsSync(nbBak)) fs.renameSync(nbBak, nb);
        }
      }
    } finally {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
  }
}

async function testThinSplitRandomization(ctx) {
  log("Building thin SPLIT twice (randomness check)...");
  let resA = null;
  let resB = null;
  try {
    resA = await buildThinRelease(ctx.buildTimeoutMs);
    resB = await buildThinRelease(ctx.buildTimeoutMs);
    const aPl = hashFile(path.join(resA.releaseDir, "r", "pl"));
    const bPl = hashFile(path.join(resB.releaseDir, "r", "pl"));
    if (aPl === bPl) {
      throw new Error("payload containers identical across builds (expected per-build randomness)");
    }

    const aRt = hashFile(path.join(resA.releaseDir, "r", "rt"));
    const bRt = hashFile(path.join(resB.releaseDir, "r", "rt"));
    if (aRt === bRt) {
      throw new Error("runtime containers identical across builds (expected per-build randomness)");
    }
  } finally {
    if (resA && resA.outRoot) fs.rmSync(resA.outRoot, { recursive: true, force: true });
    if (resB && resB.outRoot) fs.rmSync(resB.outRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_THIN_E2E !== "1") {
    log("SKIP: set SEAL_THIN_E2E=1 to run thin E2E tests");
    process.exit(77);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 77 : 1);
  }

  const prevChunk = process.env.SEAL_THIN_CHUNK_SIZE;
  const prevZstd = process.env.SEAL_THIN_ZSTD_LEVEL;
  const prevZstdTimeout = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
  process.env.SEAL_THIN_CHUNK_SIZE = process.env.SEAL_THIN_CHUNK_SIZE || "8388608";
  process.env.SEAL_THIN_ZSTD_LEVEL = process.env.SEAL_THIN_ZSTD_LEVEL || "1";
  const zstdTimeoutMs = resolveE2ETimeout("SEAL_THIN_ZSTD_TIMEOUT_MS", 120000);
  process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS || String(zstdTimeoutMs);

  const buildTimeoutMs = resolveE2ETimeout("SEAL_THIN_E2E_BUILD_TIMEOUT_MS", 180000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_THIN_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_THIN_E2E_TIMEOUT_MS", 240000);
  const ctx = { buildTimeoutMs, runTimeoutMs };

  try {
    await getFreePort();
  } catch (e) {
    if (e && e.code === "EPERM") {
      runRelease.skipListen = true;
      log("WARN: cannot listen on localhost (EPERM); using ready-file mode");
    } else {
      throw e;
    }
  }

  const tests = [testThinSplit, testThinSingleLegacy, testThinSplitRandomization, testThinSplitNativeBootstrap];
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
