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
  process.stdout.write(`[protection-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[protection-e2e] ERROR: ${msg}\n`);
}

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
}

function hasCommand(cmd) {
  const res = runCmd("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`]);
  return res.status === 0;
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
    log(`SKIP: protection E2E is linux-only (platform=${process.platform})`);
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

async function runRelease({ releaseDir, buildId, runTimeoutMs }) {
  if (runRelease.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }

  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const child = spawn(binPath, [], { cwd: releaseDir, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  let exitErr = null;
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      exitErr = new Error(`app exited (code=${code}, signal=${signal || "none"})`);
    }
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () => waitForStatus(port));
    if (exitErr) throw exitErr;
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

function makeFakeElfPacker(dir) {
  const scriptPath = path.join(dir, "fake-elf-packer.sh");
  const script = `#!/usr/bin/env bash
set -euo pipefail
in="$1"
out="$2"
cp "$in" "$out"
`;
  fs.writeFileSync(scriptPath, script, "utf-8");
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
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
  const blobPath = path.join(dirPath, opaqueFile);
  fs.writeFileSync(blobPath, blob, { mode: 0o600 });
  fs.chmodSync(blobPath, 0o600);
  fs.chownSync(blobPath, 0, 0);
  return blobPath;
}

async function buildWithProtection({ protection, outRoot, packager, build }) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {});
  projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, protection || {});
  if (build && typeof build === "object") {
    projectCfg.build = Object.assign({}, projectCfg.build, build);
    if (build.thin && typeof build.thin === "object") {
      projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {}, build.thin);
    }
    if (build.protection && typeof build.protection === "object") {
      projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, build.protection);
    }
  }
  ensureLauncherObfuscation(projectCfg);

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const outDir = path.join(outRoot, "seal-out");
  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: packager,
    outDirOverride: outDir,
  });

  const metaPath = path.join(res.outDir, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  return { ...res, meta };
}

async function testStringObfuscationMeta(ctx) {
  log("Building thin-split with stringObfuscation metadata...");
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-protection-meta-"));
  try {
    const res = await withTimeout("buildRelease(meta)", ctx.buildTimeoutMs, () =>
      buildWithProtection({
        protection: { strings: { obfuscation: "xorstr" } },
        outRoot,
        packager: "thin-split",
      })
    );
    const value = res.meta?.protection?.stringObfuscation;
    assert.ok(Array.isArray(value), "Expected stringObfuscation to be an array");
    assert.ok(value.includes("xorstr"), "Expected stringObfuscation to include xorstr");
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function testBackendTerser(ctx) {
  log("Building thin-split with backend terser...");
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-protection-terser-"));
  try {
    const res = await withTimeout("buildRelease(terser)", ctx.buildTimeoutMs, () =>
      buildWithProtection({
        protection: {},
        build: {
          obfuscationProfile: "prod-strict",
          backendTerser: { enabled: true, passes: 2 },
        },
        outRoot,
        packager: "thin-split",
      })
    );
    const terser = res.meta?.backendTerser;
    assert.ok(terser && terser.enabled, "Expected backendTerser enabled");
    assert.strictEqual(terser.ok, true, "Expected backendTerser to be ok");
    assert.strictEqual(terser.passes, 2, "Expected backendTerser passes=2");
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function testProdMaxRuntime(ctx) {
  log("Building thin-split with prod-max obfuscation...");
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-protection-prodmax-"));
  try {
    const res = await withTimeout("buildRelease(prod-max)", ctx.buildTimeoutMs, () =>
      buildWithProtection({
        protection: {},
        build: {
          obfuscationProfile: "prod-max",
          backendTerser: { enabled: true, passes: 4 },
        },
        outRoot,
        packager: "thin-split",
      })
    );
    assert.strictEqual(res.meta?.obfuscationProfile, "prod-max", "Expected prod-max profile");
    const terser = res.meta?.backendTerser;
    assert.ok(terser && terser.enabled, "Expected backendTerser enabled");
    assert.strictEqual(terser.ok, true, "Expected backendTerser to be ok");
    assert.strictEqual(terser.passes, 4, "Expected backendTerser passes=4");
    await runRelease({ releaseDir: res.releaseDir, buildId: res.buildId, runTimeoutMs: ctx.runTimeoutMs });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function testElfPacker(ctx) {
  log("Building thin-split with ELF packer...");
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-protection-elf-"));
  const toolRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-elf-tool-"));
  try {
    const packerPath = makeFakeElfPacker(toolRoot);
    const res = await withTimeout("buildRelease(elf)", ctx.buildTimeoutMs, () =>
      buildWithProtection({
        protection: {
          elfPacker: {
            tool: "fake",
            cmd: packerPath,
            args: ["{in}", "{out}"],
          },
        },
        outRoot,
        packager: "thin-split",
      })
    );

    const steps = (res.meta?.protection?.post?.steps || []);
    const packStep = steps.find((s) => s && s.step === "elf_packer");
    assert.ok(packStep, "Expected elf_packer step in protection metadata");
    assert.strictEqual(packStep.ok, true, "Expected elf_packer step to be ok");

    log("Running packed thin-split binary...");
    await runRelease({ releaseDir: res.releaseDir, buildId: res.buildId, runTimeoutMs: ctx.runTimeoutMs });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(toolRoot, { recursive: true, force: true });
  }
}

async function testFullProtection(ctx) {
  const requireFull = process.env.SEAL_PROTECTION_E2E_REQUIRE_FULL === "1";
  if (typeof process.getuid === "function" && process.getuid() !== 0) {
    const msg = "full protection test requires root (sentinel baseDir ownership)";
    if (requireFull) throw new Error(msg);
    log(`SKIP: ${msg}`);
    return;
  }

  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const protectionCfg = baseCfg.build && baseCfg.build.protection ? baseCfg.build.protection : {};
  const cObfCmd = protectionCfg.cObfuscator ? (protectionCfg.cObfuscator.cmd || protectionCfg.cObfuscator.tool) : null;
  const packerCmd = protectionCfg.elfPacker ? (protectionCfg.elfPacker.cmd || protectionCfg.elfPacker.tool) : null;
  const stripCmd = protectionCfg.strip && protectionCfg.strip.cmd ? protectionCfg.strip.cmd : "strip";

  const missing = [];
  if (stripCmd && !hasCommand(stripCmd)) missing.push(`strip:${stripCmd}`);
  if (packerCmd && !hasCommand(packerCmd)) missing.push(`elfPacker:${packerCmd}`);
  if (cObfCmd && !hasCommand(cObfCmd)) missing.push(`cObfuscator:${cObfCmd}`);
  if (missing.length) {
    const msg = `missing tools: ${missing.join(", ")}`;
    if (requireFull) throw new Error(msg);
    log(`SKIP: full protection (${msg})`);
    return;
  }

  const cpuid = computeCpuIdBoth();
  if (!cpuid) {
    const msg = "cpuid unavailable for full protection sentinel";
    if (requireFull) throw new Error(msg);
    log(`SKIP: ${msg}`);
    return;
  }

  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-full-guard-"));
  const namespaceId = "00112233445566778899aabbccddeeff";
  const appId = baseCfg.appName || "seal-example";

  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = {
    enabled: true,
    level: 1,
    appId,
    namespaceId,
    storage: { baseDir, mode: "file" },
    cpuIdSource: "both",
    exitCodeBlock: 222,
    checkIntervalMs: 0,
    timeLimit: { mode: "off" },
  };
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {});
  ensureLauncherObfuscation(projectCfg);

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-full-protection-"));
  const outDir = path.join(outRoot, "seal-out");

  try {
    installSentinelBlob({ baseDir, namespaceId, appId, cpuid, expiresAtSec: 0 });
    const res = await withTimeout("buildRelease(full)", ctx.buildTimeoutMs, () =>
      buildRelease({
        projectRoot: EXAMPLE_ROOT,
        projectCfg,
        targetCfg,
        configName,
        packagerOverride: "thin-split",
        outDirOverride: outDir,
      })
    );

    const steps = (res.meta?.protection?.post?.steps || []);
    const stripStep = steps.find((s) => s && s.step === "strip");
    const packStep = steps.find((s) => s && s.step === "elf_packer");
    assert.ok(stripStep && stripStep.ok, "Expected strip step OK in full protection build");
    assert.ok(packStep && packStep.ok, "Expected elf_packer step OK in full protection build");

    const strObs = res.meta?.protection?.stringObfuscation || [];
    assert.ok(Array.isArray(strObs) && strObs.length > 0, "Expected string obfuscation enabled");
    assert.ok(res.meta?.protection?.cObfuscator, "Expected cObfuscator enabled");

    await runRelease({ releaseDir: res.releaseDir, buildId: res.buildId, runTimeoutMs: ctx.runTimeoutMs });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_PROTECTION_E2E !== "1") {
    log("SKIP: set SEAL_PROTECTION_E2E=1 to run protection E2E tests");
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

  const buildTimeoutMs = Number(process.env.SEAL_PROTECTION_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_PROTECTION_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_PROTECTION_E2E_TIMEOUT_MS || "240000");
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

  const tests = [testStringObfuscationMeta, testBackendTerser, testProdMaxRuntime, testElfPacker, testFullProtection];
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
