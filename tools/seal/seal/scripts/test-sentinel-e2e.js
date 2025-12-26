#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { buildAnchor, deriveOpaqueDir, deriveOpaqueFile, packBlob } = require("../src/lib/sentinelCore");
const { buildFingerprintHash } = require("../src/lib/sentinelConfig");

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");

function log(msg) {
  process.stdout.write(`[sentinel-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[sentinel-e2e] ERROR: ${msg}\n`);
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
    log(`SKIP: sentinel E2E is linux-only (platform=${process.platform})`);
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
  if (typeof process.getuid === "function" && process.getuid() !== 0) {
    log("SKIP: sentinel E2E requires root (baseDir must be root-owned)");
    return { ok: false, skip: true };
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

function readFileTrim(p) {
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return "";
  }
}

function readCpuInfoValue(key) {
  const content = readFileTrim("/proc/cpuinfo");
  if (!content) return "";
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    if (k !== key) continue;
    return line.slice(idx + 1).trim();
  }
  return "";
}

function getCpuIdProc() {
  const vendor = readCpuInfoValue("vendor_id");
  const family = readCpuInfoValue("cpu family");
  const model = readCpuInfoValue("model");
  const stepping = readCpuInfoValue("stepping");
  if (!vendor || !family || !model || !stepping) return "";
  return `${vendor}:${family}:${model}:${stepping}`.toLowerCase();
}

function resolveCc() {
  if (hasCommand("cc")) return "cc";
  if (hasCommand("gcc")) return "gcc";
  return null;
}

function getCpuIdAsm() {
  const arch = process.arch;
  if (arch !== "x64" && arch !== "ia32") {
    return { value: "", unsupported: true };
  }
  const cc = resolveCc();
  if (!cc) return { value: "", error: "Missing C compiler" };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-cpuid-"));
  const srcPath = path.join(tmpDir, "cpuid.c");
  const outPath = path.join(tmpDir, "cpuid");
  const src = `#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <ctype.h>
#if !defined(__x86_64__) && !defined(__i386__)
int main(void) { return 2; }
#else
#include <cpuid.h>
static void to_lower(char *s) { for (; *s; s++) *s = (char)tolower((unsigned char)*s); }
int main(void) {
  unsigned int eax = 0, ebx = 0, ecx = 0, edx = 0;
  if (!__get_cpuid(0, &eax, &ebx, &ecx, &edx)) return 3;
  char vendor[13];
  memcpy(vendor + 0, &ebx, 4);
  memcpy(vendor + 4, &edx, 4);
  memcpy(vendor + 8, &ecx, 4);
  vendor[12] = 0;
  if (!__get_cpuid(1, &eax, &ebx, &ecx, &edx)) return 4;
  unsigned int family = (eax >> 8) & 0x0f;
  unsigned int model = (eax >> 4) & 0x0f;
  unsigned int stepping = eax & 0x0f;
  unsigned int ext_family = (eax >> 20) & 0xff;
  unsigned int ext_model = (eax >> 16) & 0x0f;
  if (family == 0x0f) family += ext_family;
  if (family == 0x06 || family == 0x0f) model |= (ext_model << 4);
  to_lower(vendor);
  printf("%s:%u:%u:%u\\n", vendor, family, model, stepping);
  return 0;
}
#endif
`;
  fs.writeFileSync(srcPath, src, "utf8");
  const build = runCmd(cc, ["-O2", srcPath, "-o", outPath], 8000);
  if (build.status !== 0) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { value: "", error: "C compile failed" };
  }
  const run = runCmd(outPath, [], 5000);
  const out = (run.stdout || "").toString("utf8").trim();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (run.status === 2) {
    return { value: "", unsupported: true };
  }
  if (run.status !== 0 || !out) {
    return { value: "", error: "cpuid asm failed" };
  }
  return { value: out, unsupported: false };
}

function computeCpuIdBoth() {
  const proc = getCpuIdProc();
  const asmRes = getCpuIdAsm();
  if (proc && asmRes.value) return `proc:${proc}|asm:${asmRes.value}`;
  if (proc) return `proc:${proc}`;
  if (asmRes.value) return `asm:${asmRes.value}`;
  return "";
}

async function buildReleaseWithSentinel({ baseDir, outRoot, sentinelOverride }) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const appId = "seal-example";
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {}, {
    launcherObfuscation: false,
  });
  const baseSentinel = {
    enabled: true,
    level: 1,
    appId,
    namespaceId: "00112233445566778899aabbccddeeff",
    storage: { baseDir, mode: "file" },
    cpuIdSource: "both",
    exitCodeBlock: 222,
    checkIntervalMs: 0,
  };
  const override = sentinelOverride || {};
  projectCfg.build.sentinel = {
    ...baseSentinel,
    ...override,
    storage: { ...baseSentinel.storage, ...(override.storage || {}) },
    timeLimit: { ...(baseSentinel.timeLimit || {}), ...(override.timeLimit || {}) },
  };
  targetCfg.packager = "thin-split";

  const outRootFinal = outRoot || fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  const outDir = path.join(outRootFinal, "seal-out");

  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: "thin-split",
    outDirOverride: outDir,
  });

  return { ...res, outRoot: outRootFinal, outDir, appId };
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

function ensureBaseDirOwned(baseDir, mode) {
  fs.mkdirSync(baseDir, { recursive: true, mode });
  fs.chmodSync(baseDir, mode);
  fs.chownSync(baseDir, 0, 0);
}

function installSentinelBlob({ baseDir, namespaceId, appId, cpuid, expiresAtSec }) {
  ensureBaseDirOwned(baseDir, 0o711);
  const opaqueDir = deriveOpaqueDir(namespaceId);
  const opaqueFile = deriveOpaqueFile(namespaceId, appId);
  const dirPath = path.join(baseDir, opaqueDir);
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o710 });
  fs.chmodSync(dirPath, 0o710);
  fs.chownSync(dirPath, 0, 0);

  const anchor = buildAnchor(namespaceId, appId);
  const installId = crypto.randomBytes(32);
  const includeCpuId = !!cpuid;
  const fpHash = buildFingerprintHash(1, {
    mid: readFileTrim("/etc/machine-id"),
    rid: "",
    puid: "",
    cpuid,
  }, { includePuid: false, includeCpuId });

  const flags = includeCpuId ? 0x0004 : 0x0000;
  const blob = packBlob({ level: 1, flags, installId, fpHash, expiresAtSec }, anchor);
  const filePath = path.join(dirPath, opaqueFile);
  fs.writeFileSync(filePath, blob, { mode: 0o640 });
  fs.chmodSync(filePath, 0o640);
  fs.chownSync(filePath, 0, 0);
  return filePath;
}

async function runReleaseExpectOk({ releaseDir, buildId, runTimeoutMs }) {
  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe" });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));
  const childExit = new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve({ type: "exit", code, signal }));
  });
  const childError = new Promise((resolve) => {
    child.on("error", (err) => resolve({ type: "error", err }));
  });

  let status;
  try {
    const earlyResult = await withTimeout("waitForStatus", runTimeoutMs, () =>
      Promise.race([waitForStatus(port), childExit, childError])
    );
    if (earlyResult && earlyResult.type === "error") {
      throw new Error(`spawn failed: ${earlyResult.err && earlyResult.err.message ? earlyResult.err.message : "unknown error"}`);
    }
    if (earlyResult && earlyResult.type === "exit") {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        earlyResult.code !== null ? `code=${earlyResult.code}` : null,
        earlyResult.signal ? `signal=${earlyResult.signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      throw new Error(`process exited early (${detail || "no output"})`);
    }
    status = earlyResult;
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

async function runReleaseExpectFail({ releaseDir, runTimeoutMs, expectCode }) {
  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe" });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  const childExit = new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve({ type: "exit", code, signal }));
  });
  const childError = new Promise((resolve) => {
    child.on("error", (err) => resolve({ type: "error", err }));
  });

  let exitInfo = null;
  try {
    exitInfo = await withTimeout("waitForExit", runTimeoutMs, async () =>
      Promise.race([childExit, childError])
    );
  } finally {
    if (child.exitCode === null) {
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
  if (exitInfo && exitInfo.type === "error") {
    throw new Error(`spawn failed: ${exitInfo.err && exitInfo.err.message ? exitInfo.err.message : "unknown error"}`);
  }
  const { code } = exitInfo || {};
  if (expectCode !== undefined && expectCode !== null) {
    assert.strictEqual(code, expectCode);
  } else {
    assert.ok(code !== 0, "Expected non-zero exit code");
  }
}

async function runReleaseExpectExpire({ releaseDir, buildId, runTimeoutMs, expectCode, expireTimeoutMs }) {
  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe" });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));
  const childExit = new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve({ type: "exit", code, signal }));
  });
  const childError = new Promise((resolve) => {
    child.on("error", (err) => resolve({ type: "error", err }));
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () =>
      Promise.race([waitForStatus(port), childExit, childError])
    );
  } catch (e) {
    child.kill("SIGTERM");
    throw e;
  }

  const exitInfo = await withTimeout("waitForExpire", expireTimeoutMs, async () =>
    Promise.race([childExit, childError])
  );
  if (exitInfo && exitInfo.type === "error") {
    throw new Error(`spawn failed: ${exitInfo.err && exitInfo.err.message ? exitInfo.err.message : "unknown error"}`);
  }
  const { code } = exitInfo || {};
  if (expectCode !== undefined && expectCode !== null) {
    assert.strictEqual(code, expectCode);
  } else {
    assert.ok(code !== 0, "Expected non-zero exit code");
  }
}

async function testSentinelBasics(ctx) {
  log("Building thin-split with sentinel...");
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-base-"));
  const namespaceId = "00112233445566778899aabbccddeeff";

  let outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  let releaseDir = null;
  let buildId = null;
  let appId = null;
  let realBase = null;
  try {
    const res = await withTimeout("buildRelease", ctx.buildTimeoutMs, () =>
      buildReleaseWithSentinel({ baseDir, outRoot })
    );
    outRoot = res.outRoot;
    releaseDir = res.releaseDir;
    buildId = res.buildId;
    appId = res.appId;

    log("Case: missing blob -> expect fail");
    ensureBaseDirOwned(baseDir, 0o711);
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });

    log("Case: valid blob -> expect OK");
    const cpuid = computeCpuIdBoth();
    installSentinelBlob({ baseDir, namespaceId, appId, cpuid });
    await runReleaseExpectOk({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });

    log("Case: mismatched blob -> expect fail");
    const badCpuId = cpuid ? `${cpuid}-bad` : "proc:bad";
    installSentinelBlob({ baseDir, namespaceId, appId, cpuid: badCpuId });
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });

    log("Case: baseDir symlink -> expect fail");
    realBase = path.join(os.tmpdir(), `seal-sentinel-real-${process.pid}`);
    fs.rmSync(baseDir, { recursive: true, force: true });
    ensureBaseDirOwned(realBase, 0o711);
    fs.symlinkSync(realBase, baseDir);
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });
    fs.rmSync(baseDir, { recursive: true, force: true });
    fs.rmSync(realBase, { recursive: true, force: true });
    realBase = null;

    log("Case: baseDir writable -> expect fail");
    ensureBaseDirOwned(baseDir, 0o777);
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });
  } finally {
    if (outRoot) fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(baseDir, { recursive: true, force: true });
    if (realBase) fs.rmSync(realBase, { recursive: true, force: true });
  }
}

async function testSentinelExpiry(ctx) {
  log("Building thin-split with sentinel expiry...");
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-exp-"));
  const namespaceId = "00112233445566778899aabbccddeeff";
  let outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  let releaseDir = null;
  let buildId = null;
  let appId = null;

  try {
    const res = await withTimeout("buildRelease", ctx.buildTimeoutMs, () =>
      buildReleaseWithSentinel({
        baseDir,
        outRoot,
        sentinelOverride: {
          checkIntervalMs: 200,
          timeLimit: { validForSeconds: 3 },
        },
      })
    );
    outRoot = res.outRoot;
    releaseDir = res.releaseDir;
    buildId = res.buildId;
    appId = res.appId;

    const cpuid = computeCpuIdBoth();
    const nowSec = Math.floor(Date.now() / 1000);
    installSentinelBlob({ baseDir, namespaceId, appId, cpuid, expiresAtSec: nowSec + 3 });
    await runReleaseExpectExpire({
      releaseDir,
      buildId,
      runTimeoutMs: ctx.runTimeoutMs,
      expectCode: 222,
      expireTimeoutMs: 8000,
    });
  } finally {
    if (outRoot) fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_SENTINEL_E2E !== "1") {
    log("SKIP: set SEAL_SENTINEL_E2E=1 to run sentinel E2E tests");
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 0 : 1);
  }

  const buildTimeoutMs = Number(process.env.SEAL_SENTINEL_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_SENTINEL_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_SENTINEL_E2E_TIMEOUT_MS || "240000");
  const ctx = { buildTimeoutMs, runTimeoutMs };

  let failures = 0;
  try {
    await withTimeout("testSentinelBasics", testTimeoutMs, () => testSentinelBasics(ctx));
    log("OK: testSentinelBasics");
  } catch (e) {
    failures += 1;
    fail(`testSentinelBasics: ${e.message || e}`);
  }
  try {
    await withTimeout("testSentinelExpiry", testTimeoutMs, () => testSentinelExpiry(ctx));
    log("OK: testSentinelExpiry");
  } catch (e) {
    failures += 1;
    fail(`testSentinelExpiry: ${e.message || e}`);
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
