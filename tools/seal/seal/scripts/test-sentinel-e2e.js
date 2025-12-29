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
  waitForReady,
  withTimeout,
  resolveExampleRoot,
  createLogger,
  withSealedBinary,
} = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { buildAnchor, deriveOpaqueDir, deriveOpaqueFile, packBlob } = require("../src/lib/sentinelCore");
const { buildFingerprintHash } = require("../src/lib/sentinelConfig");

const EXAMPLE_ROOT = resolveExampleRoot();

const { log, fail } = createLogger("sentinel-e2e");

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
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

function parseReadyPayload(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
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

function decodeMountPath(value) {
  return String(value || "").replace(/\\([0-7]{3})/g, (_, oct) => {
    const code = parseInt(oct, 8);
    if (!Number.isFinite(code)) return _;
    return String.fromCharCode(code);
  });
}

function getRootMajMin() {
  const txt = readFileTrim("/proc/self/mountinfo");
  if (!txt) return "";
  const lines = txt.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;
    const mountPoint = decodeMountPath(parts[4]);
    if (mountPoint !== "/") continue;
    return parts[2] || "";
  }
  return "";
}

function devMajorMinor(stat) {
  try {
    const rdev = BigInt(stat.rdev);
    const major = (rdev >> 8n) & 0xfffn;
    const minor = (rdev & 0xffn) | ((rdev >> 12n) & 0xfff00n);
    return `${Number(major)}:${Number(minor)}`;
  } catch {
    return "";
  }
}

function findDevByMajMin(dir, majmin) {
  try {
    const entries = fs.readdirSync(dir);
    for (const name of entries) {
      const full = path.join(dir, name);
      let target = full;
      try {
        target = fs.realpathSync(full);
      } catch {}
      let st;
      try {
        st = fs.statSync(target);
      } catch {
        continue;
      }
      const mm = devMajorMinor(st);
      if (mm && mm === majmin) return name;
    }
  } catch {}
  return "";
}

function getRootRid() {
  const majmin = getRootMajMin();
  if (!majmin) return "";
  const uuid = findDevByMajMin("/dev/disk/by-uuid", majmin);
  if (uuid) return `uuid:${uuid}`;
  const partuuid = findDevByMajMin("/dev/disk/by-partuuid", majmin);
  if (partuuid) return `partuuid:${partuuid}`;
  return `dev:${majmin}`;
}

async function buildReleaseWithSentinel({ baseDir, outRoot, sentinelOverride }) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const appId = "seal-example";
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {});
  ensureLauncherObfuscation(projectCfg);
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
  cfg.http.port = port || 3000;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

function ensureBaseDirOwned(baseDir, mode) {
  fs.mkdirSync(baseDir, { recursive: true, mode });
  fs.chmodSync(baseDir, mode);
  fs.chownSync(baseDir, 0, 0);
}

function installSentinelBlob({
  baseDir,
  namespaceId,
  appId,
  level = 1,
  cpuid,
  mid,
  rid,
  puid,
  eah,
  includeCpuId,
  includePuid,
  expiresAtSec,
}) {
  ensureBaseDirOwned(baseDir, 0o711);
  const opaqueDir = deriveOpaqueDir(namespaceId);
  const opaqueFile = deriveOpaqueFile(namespaceId, appId);
  const dirPath = path.join(baseDir, opaqueDir);
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o710 });
  fs.chmodSync(dirPath, 0o710);
  fs.chownSync(dirPath, 0, 0);

  const anchor = buildAnchor(namespaceId, appId);
  const installId = crypto.randomBytes(32);
  const useCpuId = includeCpuId !== undefined ? !!includeCpuId : !!cpuid;
  const usePuid = includePuid !== undefined ? !!includePuid : !!puid;
  const useMid = mid !== undefined ? String(mid) : readFileTrim("/etc/machine-id");
  const useRid = rid !== undefined ? String(rid) : "";
  const usePuidValue = puid !== undefined ? String(puid) : "";
  const useEah = eah !== undefined ? String(eah) : "";
  const fpHash = buildFingerprintHash(level, {
    mid: useMid,
    rid: useRid,
    puid: usePuidValue,
    eah: useEah,
    cpuid,
  }, { includePuid: usePuid, includeCpuId: useCpuId });

  const flags = useCpuId ? 0x0004 : 0x0000;
  const blob = packBlob({ level, flags, installId, fpHash, expiresAtSec }, anchor);
  const filePath = path.join(dirPath, opaqueFile);
  fs.writeFileSync(filePath, blob, { mode: 0o640 });
  fs.chmodSync(filePath, 0o640);
  fs.chownSync(filePath, 0, 0);
  return filePath;
}

async function runReleaseExpectOk({ releaseDir, buildId, runTimeoutMs }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  await withSealedBinary({
    label: "sentinel",
    releaseDir,
    binPath,
    runTimeoutMs,
    writeRuntimeConfig,
    log,
    captureOutput: true,
  }, ({ port, readyFile, ready }) => {
    if (readyFile) {
      const payload = parseReadyPayload(ready);
      if (payload) {
        assert.strictEqual(payload.appName, "seal-example");
        assert.strictEqual(payload.buildId, buildId);
      }
      return;
    }
    assert.strictEqual(ready.appName, "seal-example");
    assert.strictEqual(ready.buildId, buildId);
    assert.strictEqual(ready.http.port, port);
  });
}

async function runReleaseExpectFail({ releaseDir, runTimeoutMs, expectCode }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const exitInfo = await withSealedBinary({
    label: "sentinel",
    releaseDir,
    binPath,
    runTimeoutMs,
    writeRuntimeConfig,
    log,
    waitForReady: false,
    failOnExit: false,
    captureOutput: true,
  }, async ({ port, readyFile, exitInfo: exitPromise }) => {
    const winner = await withTimeout("waitForExit", runTimeoutMs, () => Promise.race([
      exitPromise.then((info) => ({ type: "exit", info })),
      waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }).then(() => ({ type: "ready" })),
    ]));
    if (winner && winner.type === "ready") {
      throw new Error("process reached /api/status (expected failure)");
    }
    return winner && winner.info ? winner.info : { code: null, signal: null };
  });

  const { code } = exitInfo || {};
  if (expectCode !== undefined && expectCode !== null) {
    assert.strictEqual(code, expectCode);
  } else {
    assert.ok(code !== 0, "Expected non-zero exit code");
  }
}

async function runReleaseExpectExpire({ releaseDir, buildId, runTimeoutMs, expectCode, expireTimeoutMs }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const exitInfo = await withSealedBinary({
    label: "sentinel",
    releaseDir,
    binPath,
    runTimeoutMs,
    writeRuntimeConfig,
    log,
    failOnExit: false,
    captureOutput: true,
  }, async ({ exitInfo: exitPromise }) => {
    return await withTimeout("waitForExpire", expireTimeoutMs, () => exitPromise);
  });

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
      buildReleaseWithSentinel({
        baseDir,
        outRoot,
        sentinelOverride: { level: 1, cpuIdSource: "both" },
      })
    );
    outRoot = res.outRoot;
    releaseDir = res.releaseDir;
    buildId = res.buildId;
    appId = res.appId;

    log("Case: missing blob -> expect fail");
    ensureBaseDirOwned(baseDir, 0o711);
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });

    log("Case: valid blob -> expect OK");
    const mid = readFileTrim("/etc/machine-id");
    const cpuid = computeCpuIdBoth();
    installSentinelBlob({ baseDir, namespaceId, appId, level: 1, mid, cpuid });
    await runReleaseExpectOk({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });

    log("Case: mismatched machine-id -> expect fail");
    const badMid = mid ? `${mid}-bad` : "deadbeef";
    installSentinelBlob({ baseDir, namespaceId, appId, level: 1, mid: badMid, cpuid });
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });

    log("Case: mismatched cpuId -> expect fail");
    if (cpuid) {
      const badCpuId = `${cpuid}-bad`;
      installSentinelBlob({ baseDir, namespaceId, appId, level: 1, mid, cpuid: badCpuId });
      await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });
    } else {
      log("SKIP: cpuId unavailable for mismatch test");
    }

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

async function testSentinelRehostRid(ctx) {
  log("Building thin-split with sentinel level=2 (root RID)...");
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-rid-"));
  const namespaceId = "00112233445566778899aabbccddeeff";

  let outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  let releaseDir = null;
  let buildId = null;
  let appId = null;

  const rid = getRootRid();
  if (!rid) {
    log("SKIP: root RID unavailable for sentinel level=2 test");
    fs.rmSync(baseDir, { recursive: true, force: true });
    fs.rmSync(outRoot, { recursive: true, force: true });
    return;
  }

  try {
    const res = await withTimeout("buildRelease", ctx.buildTimeoutMs, () =>
      buildReleaseWithSentinel({
        baseDir,
        outRoot,
        sentinelOverride: { level: 2, cpuIdSource: "off" },
      })
    );
    outRoot = res.outRoot;
    releaseDir = res.releaseDir;
    buildId = res.buildId;
    appId = res.appId;

    const mid = readFileTrim("/etc/machine-id");
    log("Case: valid level=2 blob -> expect OK");
    installSentinelBlob({ baseDir, namespaceId, appId, level: 2, mid, rid, includeCpuId: false });
    await runReleaseExpectOk({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });

    log("Case: mismatched RID -> expect fail");
    const badRid = `${rid}-bad`;
    installSentinelBlob({ baseDir, namespaceId, appId, level: 2, mid, rid: badRid, includeCpuId: false });
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });
  } finally {
    if (outRoot) fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(baseDir, { recursive: true, force: true });
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

async function testSentinelMismatchDeferred(ctx) {
  log("Building thin-split with sentinel mismatch deferral...");
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-def-"));
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
          timeLimit: { validForSeconds: 3, enforce: "mismatch" },
        },
      })
    );
    outRoot = res.outRoot;
    releaseDir = res.releaseDir;
    buildId = res.buildId;
    appId = res.appId;

    const mid = readFileTrim("/etc/machine-id");
    const cpuid = computeCpuIdBoth();
    const nowSec = Math.floor(Date.now() / 1000);
    const badMid = mid ? `${mid}-bad` : "deadbeef";
    installSentinelBlob({ baseDir, namespaceId, appId, level: 1, mid: badMid, cpuid, expiresAtSec: nowSec + 3 });
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

async function testSentinelMissingDeferred(ctx) {
  log("Building thin-split with sentinel missing deferral...");
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-miss-"));
  let outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  let releaseDir = null;
  let buildId = null;

  try {
    const res = await withTimeout("buildRelease", ctx.buildTimeoutMs, () =>
      buildReleaseWithSentinel({
        baseDir,
        outRoot,
        sentinelOverride: {
          checkIntervalMs: 200,
          timeLimit: { validForSeconds: 3, enforce: "mismatch" },
        },
      })
    );
    outRoot = res.outRoot;
    releaseDir = res.releaseDir;
    buildId = res.buildId;

    ensureBaseDirOwned(baseDir, 0o711);
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

async function testSentinelExpiredBlob(ctx) {
  log("Building thin-split with sentinel expired blob...");
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-expired-"));
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
        sentinelOverride: { level: 1, cpuIdSource: "both" },
      })
    );
    outRoot = res.outRoot;
    releaseDir = res.releaseDir;
    buildId = res.buildId;
    appId = res.appId;

    const mid = readFileTrim("/etc/machine-id");
    const cpuid = computeCpuIdBoth();
    const nowSec = Math.floor(Date.now() / 1000);
    installSentinelBlob({ baseDir, namespaceId, appId, level: 1, mid, cpuid, expiresAtSec: nowSec - 5 });
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });
  } finally {
    if (outRoot) fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

async function testSentinelUnsupportedLevels(ctx) {
  log("Building thin-split with sentinel for unsupported level tests...");
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-l34-"));
  const namespaceId = "00112233445566778899aabbccddeeff";
  let outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  let releaseDir = null;
  let buildId = null;
  let appId = null;

  const mid = readFileTrim("/etc/machine-id");
  const rid = getRootRid();
  if (!mid || !rid) {
    log("SKIP: missing mid/rid for unsupported level tests");
    fs.rmSync(baseDir, { recursive: true, force: true });
    fs.rmSync(outRoot, { recursive: true, force: true });
    return;
  }

  try {
    const res = await withTimeout("buildRelease", ctx.buildTimeoutMs, () =>
      buildReleaseWithSentinel({
        baseDir,
        outRoot,
        sentinelOverride: { level: 1, cpuIdSource: "off" },
      })
    );
    outRoot = res.outRoot;
    releaseDir = res.releaseDir;
    buildId = res.buildId;
    appId = res.appId;

    log("Case: L3 blob -> expect fail (unsupported)");
    installSentinelBlob({
      baseDir,
      namespaceId,
      appId,
      level: 3,
      mid,
      rid,
      puid: "puid-test",
      includePuid: true,
      includeCpuId: false,
    });
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });

    log("Case: L4 blob -> expect fail (unsupported)");
    installSentinelBlob({
      baseDir,
      namespaceId,
      appId,
      level: 4,
      mid,
      rid,
      eah: "eah-test",
      includeCpuId: false,
      includePuid: false,
    });
    await runReleaseExpectFail({ releaseDir, runTimeoutMs: ctx.runTimeoutMs, expectCode: 222 });
  } finally {
    if (outRoot) fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

async function testSentinelExternalAnchorUnsupported(ctx) {
  log("Testing sentinel externalAnchor unsupported...");
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-ext-"));
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  try {
    let threw = false;
    try {
      await withTimeout("buildRelease(ext anchor)", ctx.buildTimeoutMs, () =>
        buildReleaseWithSentinel({
          baseDir,
          outRoot,
          sentinelOverride: {
            externalAnchor: { type: "usb", usb: { vid: "1234", pid: "5678", serial: "deadbeef" } },
          },
        })
      );
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      if (!/externalAnchor.*not supported/i.test(msg)) {
        throw e;
      }
      threw = true;
    }
    if (!threw) {
      throw new Error("expected externalAnchor build failure");
    }
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_SENTINEL_E2E !== "1") {
    log("SKIP: set SEAL_SENTINEL_E2E=1 to run sentinel E2E tests");
    process.exit(77);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 77 : 1);
  }

  const buildTimeoutMs = resolveE2ETimeout("SEAL_SENTINEL_E2E_BUILD_TIMEOUT_MS", 180000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_SENTINEL_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_SENTINEL_E2E_TIMEOUT_MS", 240000);
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
    await withTimeout("testSentinelRehostRid", testTimeoutMs, () => testSentinelRehostRid(ctx));
    log("OK: testSentinelRehostRid");
  } catch (e) {
    failures += 1;
    fail(`testSentinelRehostRid: ${e.message || e}`);
  }
  try {
    await withTimeout("testSentinelUnsupportedLevels", testTimeoutMs, () => testSentinelUnsupportedLevels(ctx));
    log("OK: testSentinelUnsupportedLevels");
  } catch (e) {
    failures += 1;
    fail(`testSentinelUnsupportedLevels: ${e.message || e}`);
  }
  try {
    await withTimeout("testSentinelExternalAnchorUnsupported", testTimeoutMs, () => testSentinelExternalAnchorUnsupported(ctx));
    log("OK: testSentinelExternalAnchorUnsupported");
  } catch (e) {
    failures += 1;
    fail(`testSentinelExternalAnchorUnsupported: ${e.message || e}`);
  }
  try {
    await withTimeout("testSentinelExpiry", testTimeoutMs, () => testSentinelExpiry(ctx));
    log("OK: testSentinelExpiry");
  } catch (e) {
    failures += 1;
    fail(`testSentinelExpiry: ${e.message || e}`);
  }
  try {
    await withTimeout("testSentinelMismatchDeferred", testTimeoutMs, () => testSentinelMismatchDeferred(ctx));
    log("OK: testSentinelMismatchDeferred");
  } catch (e) {
    failures += 1;
    fail(`testSentinelMismatchDeferred: ${e.message || e}`);
  }
  try {
    await withTimeout("testSentinelMissingDeferred", testTimeoutMs, () => testSentinelMissingDeferred(ctx));
    log("OK: testSentinelMissingDeferred");
  } catch (e) {
    failures += 1;
    fail(`testSentinelMissingDeferred: ${e.message || e}`);
  }
  try {
    await withTimeout("testSentinelExpiredBlob", testTimeoutMs, () => testSentinelExpiredBlob(ctx));
    log("OK: testSentinelExpiredBlob");
  } catch (e) {
    failures += 1;
    fail(`testSentinelExpiredBlob: ${e.message || e}`);
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
