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
} = require("./e2e-utils");

const EXAMPLE_ROOT = resolveExampleRoot();

const { log, fail } = createLogger("legacy-packagers-e2e");

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
    label: "legacy-packagers",
    releaseDir,
    binPath,
    runTimeoutMs,
    skipListen: runRelease.skipListen === true,
    writeRuntimeConfig,
    captureOutput: true,
    log,
  });
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
    process.exit(77);
  }
  if (process.platform !== "linux") {
    log(`SKIP: legacy packager tests are linux-only (platform=${process.platform})`);
    process.exit(77);
  }

  const buildTimeoutMs = resolveE2ETimeout("SEAL_LEGACY_PACKAGERS_E2E_BUILD_TIMEOUT_MS", 180000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_LEGACY_PACKAGERS_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_LEGACY_PACKAGERS_E2E_TIMEOUT_MS", 240000);
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
