#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { resolvePostjectBin } = require("../src/lib/postject");
const {
  resolveE2ETimeout,
  resolveE2ERunTimeout,
  withTimeout,
  getFreePort,
  resolveExampleRoot,
  createLogger,
  withSealedBinary,
  readReadyPayload,
} = require("./e2e-utils");

const EXAMPLE_ROOT = resolveExampleRoot();

const { log, fail, skip } = createLogger("full-packagers-e2e");

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port || 3000;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runRelease({ releaseDir, runTimeoutMs, appName }) {
  const binPath = path.join(releaseDir, appName);
  assert.ok(fs.existsSync(binPath), `Missing runner: ${binPath}`);

  await withSealedBinary({
    label: "full-packagers",
    releaseDir,
    binPath,
    runTimeoutMs,
    skipListen: runRelease.skipListen === true,
    writeRuntimeConfig,
    captureOutput: true,
    log,
  }, async ({ readyFile, ready }) => {
    if (!readyFile) return;
    const payload = await readReadyPayload(readyFile, ready, 1000);
    if (!payload) {
      throw new Error(`ready-file payload invalid (${readyFile})`);
    }
  });
}

function findStep(meta, name) {
  const steps = meta && meta.protection && meta.protection.post ? meta.protection.post.steps : [];
  if (!Array.isArray(steps)) return null;
  return steps.find((step) => step && step.step === name) || null;
}

function assertProtectionMeta(meta, packager) {
  assert.ok(meta && meta.protection && meta.protection.enabled === true, "Expected protection enabled");
  if (packager === "bundle") {
    const bundleStep = findStep(meta, "bundle_pack_gzip");
    assert.ok(bundleStep && bundleStep.ok, "Expected bundle_pack_gzip step to be ok");
    const elfStep = findStep(meta, "elf_packer");
    if (elfStep) {
      assert.ok(elfStep.skipped, "Expected elf_packer to be skipped for bundle script");
    }
  }
  if (packager === "sea") {
    const seaMain = meta && meta.protection ? meta.protection.seaMainPacking : null;
    assert.ok(seaMain && seaMain.ok, "Expected sea main packing to be ok");
  }
}

async function buildWithPackager(packager, buildTimeoutMs) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.packager = packager;
  projectCfg.build.sentinel = { enabled: false };
  const protectionBase = projectCfg.build.protection || {};
  projectCfg.build.protection = Object.assign({}, protectionBase, {
    enabled: true,
    seaMain: Object.assign({}, protectionBase.seaMain || {}, { pack: true }),
    bundle: Object.assign({}, protectionBase.bundle || {}, { pack: true }),
  });

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");
  targetCfg.packager = packager;

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), `seal-full-${packager}-`));
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
    return { ...res, outRoot };
  } catch (err) {
    fs.rmSync(outRoot, { recursive: true, force: true });
    throw err;
  }
}

async function testPackager(packager, ctx) {
  log(`Building ${packager} with protection...`);
  const res = await buildWithPackager(packager, ctx.buildTimeoutMs);
  const { releaseDir, outRoot, packagerUsed, appName, meta } = res;
  try {
    assert.strictEqual(packagerUsed, packager, `Expected packagerUsed=${packager} but got ${packagerUsed}`);
    assertProtectionMeta(meta, packager);
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
  const flag = process.env.SEAL_FULL_PACKAGERS_E2E;
  const enabled = flag ? flag === "1" : process.env.SEAL_LEGACY_PACKAGERS_E2E === "1";
  if (!enabled) {
    skip("set SEAL_FULL_PACKAGERS_E2E=1 to run full packagers E2E");
    process.exit(77);
  }
  if (process.env.SEAL_E2E_TOOLSET !== "full") {
    skip("full packagers requires SEAL_E2E_TOOLSET=full");
    process.exit(77);
  }
  if (process.platform !== "linux") {
    skip(`full packager tests are linux-only (platform=${process.platform})`);
    process.exit(77);
  }

  const buildTimeoutMs = resolveE2ETimeout("SEAL_FULL_PACKAGERS_E2E_BUILD_TIMEOUT_MS", 180000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_FULL_PACKAGERS_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_FULL_PACKAGERS_E2E_TIMEOUT_MS", 240000);
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

  const tests = [
    { name: "bundle", run: () => testPackager("bundle", ctx) },
    { name: "sea", run: () => testSeaPackager(ctx) },
  ];

  let failures = 0;
  for (const t of tests) {
    const name = t.name || "full-packager";
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
