#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const {
  hasCommand,
  resolveE2ETimeout,
  resolveE2ERunTimeout,
  withTimeout,
  getFreePort,
  resolveExampleRoot,
  createLogger,
  withSealedBinary,
  readReadyPayload, resolveTmpRoot } = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { buildAnchor, deriveOpaqueDir, deriveOpaqueFile, packBlob } = require("../src/lib/sentinelCore");
const { buildFingerprintHash } = require("../src/lib/sentinelConfig");

const EXAMPLE_ROOT = resolveExampleRoot();
const NAMESPACE_ID = "00112233445566778899aabbccddeeff";

const { log, fail, skip } = createLogger("full-protection-e2e");

function runCmd(cmd, args, timeoutMs = 5000) {
  const res = spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
  if (res.error) {
    const msg = res.error.message || String(res.error);
    throw new Error(`${cmd} failed: ${msg}`);
  }
  return res;
}

function readFileTrim(p) {
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return "";
  }
}

function ensureBaseDirOwned(baseDir, mode = 0o711) {
  fs.mkdirSync(baseDir, { recursive: true, mode });
  fs.chmodSync(baseDir, mode);
  fs.chownSync(baseDir, 0, 0);
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
  const flag = process.env.SEAL_FULL_PROTECTION_E2E;
  const enabled = flag ? flag === "1" : process.env.SEAL_PROTECTION_E2E === "1";
  if (!enabled) {
    skip("set SEAL_FULL_PROTECTION_E2E=1 to run full protection E2E");
    return { ok: false, skip: true };
  }
  if (process.platform !== "linux") {
    skip(`full protection E2E is linux-only (platform=${process.platform})`);
    return { ok: false, skip: true };
  }
  if (process.env.SEAL_E2E_TOOLSET !== "full") {
    skip("full protection requires SEAL_E2E_TOOLSET=full");
    return { ok: false, skip: true };
  }
  if (typeof process.getuid === "function" && process.getuid() !== 0) {
    skip("full protection requires root (sentinel baseDir must be root-owned)");
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
    fail("Missing strip (run tools/seal/seal/scripts/install-strip.sh)");
    return { ok: false, skip: false };
  }
  if (!hasCommand("kiteshield")) {
    fail("Missing kiteshield (run tools/seal/seal/scripts/install-kiteshield.sh)");
    return { ok: false, skip: false };
  }
  if (!hasCommand("ollvm-clang")) {
    fail("Missing C obfuscator (ollvm-clang). Set SEAL_E2E_TOOLSET=full and install obfuscators.");
    return { ok: false, skip: false };
  }
  if (!readFileTrim("/etc/machine-id")) {
    fail("Missing /etc/machine-id (sentinel requires machine id)");
    return { ok: false, skip: false };
  }
  return { ok: true, skip: false };
}

function installSentinelBlob({ baseDir, namespaceId, appId, level = 1 }) {
  const opaqueDir = deriveOpaqueDir(namespaceId);
  const opaqueFile = deriveOpaqueFile(namespaceId, appId);
  const dirPath = path.join(baseDir, opaqueDir);
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o710 });
  fs.chmodSync(dirPath, 0o710);
  fs.chownSync(dirPath, 0, 0);

  const anchor = buildAnchor(namespaceId, appId);
  const installId = crypto.randomBytes(32);
  const mid = readFileTrim("/etc/machine-id");
  const fpHash = buildFingerprintHash(level, { mid }, { includeCpuId: false, includePuid: false });
  const blob = packBlob({ level, flags: 0x0000, installId, fpHash, expiresAtSec: 0 }, anchor);
  const filePath = path.join(dirPath, opaqueFile);
  fs.writeFileSync(filePath, blob, { mode: 0o640 });
  fs.chmodSync(filePath, 0o640);
  fs.chownSync(filePath, 0, 0);
  return filePath;
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port || 3000;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runRelease({ releaseDir, runTimeoutMs, appName, buildId }) {
  const binPath = path.join(releaseDir, appName);
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  await withSealedBinary({
    label: "full-protection",
    releaseDir,
    binPath,
    runTimeoutMs,
    skipListen: runRelease.skipListen === true,
    writeRuntimeConfig,
    captureOutput: true,
    log,
  }, async ({ readyFile, ready }) => {
    if (!readyFile) {
      assert.strictEqual(ready.appName, appName);
      assert.strictEqual(ready.buildId, buildId);
      return;
    }
    const payload = await readReadyPayload(readyFile, ready, 1000);
    if (!payload) {
      throw new Error(`ready-file payload invalid (${readyFile})`);
    }
    assert.strictEqual(payload.appName, appName);
    assert.strictEqual(payload.buildId, buildId);
  });
}

async function buildFullRelease(buildTimeoutMs) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const appName = projectCfg.appName || "seal-example";
  const baseDir = fs.mkdtempSync(path.join(resolveTmpRoot(), "seal-full-sentinel-"));
  ensureBaseDirOwned(baseDir);

  projectCfg.build = projectCfg.build || {};
  projectCfg.build.packager = "thin-split";
  projectCfg.build.securityProfile = projectCfg.build.securityProfile || "strict";
  projectCfg.build.sentinel = {
    enabled: true,
    level: 1,
    appId: appName,
    namespaceId: NAMESPACE_ID,
    storage: { baseDir, mode: "file" },
    cpuIdSource: "off",
    exitCodeBlock: 222,
    checkIntervalMs: 0,
  };
  projectCfg.build.decoy = {
    mode: "soft",
    scope: "backend",
    generator: "basic",
    overwrite: false,
  };
  projectCfg.build.protection = {
    ...(projectCfg.build.protection || {}),
    enabled: true,
  };
  projectCfg.build.frontendObfuscation = {
    ...(projectCfg.build.frontendObfuscation || {}),
    enabled: true,
  };
  projectCfg.build.frontendMinify = {
    ...(projectCfg.build.frontendMinify || {}),
    enabled: true,
  };
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {}, {
    mode: "split",
  });

  ensureLauncherObfuscation(projectCfg);

  targetCfg.packager = "thin-split";

  const outRoot = fs.mkdtempSync(path.join(resolveTmpRoot(), "seal-full-protection-"));
  const outDir = path.join(outRoot, "seal-out");
  try {
    const res = await withTimeout("buildRelease(full-protection)", buildTimeoutMs, () =>
      buildRelease({
        projectRoot: EXAMPLE_ROOT,
        projectCfg,
        targetCfg,
        configName,
        packagerOverride: "thin-split",
        outDirOverride: outDir,
      })
    );
    return { ...res, outRoot, outDir, baseDir, appName };
  } catch (err) {
    fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(baseDir, { recursive: true, force: true });
    throw err;
  }
}

async function main() {
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    if (prereq.skip) process.exit(77);
    process.exit(1);
  }

  const buildTimeoutMs = resolveE2ETimeout("SEAL_FULL_PROTECTION_E2E_BUILD_TIMEOUT_MS", 240000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_FULL_PROTECTION_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_FULL_PROTECTION_E2E_TIMEOUT_MS", 300000);

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

  let ctx = null;
  try {
    ctx = await withTimeout("full-protection", testTimeoutMs, async () => {
      log("Building thin-split with full protection...");
      const res = await buildFullRelease(buildTimeoutMs);
      const { releaseDir, buildId, outRoot, baseDir, appName } = res;
      installSentinelBlob({ baseDir, namespaceId: NAMESPACE_ID, appId: appName, level: 1 });
      await runRelease({ releaseDir, runTimeoutMs, appName, buildId });
      return { outRoot, baseDir };
    });
    log("OK: full protection run");
  } catch (err) {
    fail(err && err.stack ? err.stack : String(err));
    process.exitCode = 1;
  } finally {
    if (ctx && ctx.outRoot) {
      fs.rmSync(ctx.outRoot, { recursive: true, force: true });
    }
    if (ctx && ctx.baseDir) {
      fs.rmSync(ctx.baseDir, { recursive: true, force: true });
    }
  }
}

main();
