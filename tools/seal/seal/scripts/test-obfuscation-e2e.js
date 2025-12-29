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
  httpJson,
  waitForStatus,
  getFreePort,
  resolveExampleRoot,
  createLogger,
  withSealedBinary,
  readReadyPayload,
} = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { createTiming, formatDuration } = require("../src/lib/timing");

const EXAMPLE_ROOT = resolveExampleRoot();

const { log, fail } = createLogger("obfuscation-e2e");

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
}

function sumTiming(entries, label) {
  return (entries || []).reduce((acc, entry) => acc + (entry.label === label ? entry.ms : 0), 0);
}

function summarizeTiming(timing, totalMs) {
  const entries = timing && Array.isArray(timing.entries) ? timing.entries : [];
  return {
    totalMs,
    bundleMs: sumTiming(entries, "build.bundle"),
    terserMs: sumTiming(entries, "build.terser"),
    backendObfMs: sumTiming(entries, "build.obfuscate"),
    frontendObfMs: sumTiming(entries, "build.frontend.obfuscate"),
  };
}

function formatMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "n/a";
  return formatDuration(ms);
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
    log(`SKIP: obfuscation E2E is linux-only (platform=${process.platform})`);
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

function formatObfFailures(obf) {
  if (!obf || typeof obf !== "object") return "missing payload";
  const checks = obf.checks;
  if (!checks || typeof checks !== "object") return "missing checks";
  const failed = Object.values(checks)
    .filter((c) => c && c.ok === false)
    .map((c) => `${c.name}:${c.got}!=${c.expected}`);
  return failed.length ? failed.join(", ") : "unknown";
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port || 3000;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runReleaseAndCheck({ releaseDir, runTimeoutMs }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  await withSealedBinary({
    label: "obfuscation",
    releaseDir,
    binPath,
    runTimeoutMs,
    writeRuntimeConfig,
    log,
  }, async ({ port, readyFile, ready }) => {
    if (readyFile) {
      const payload = await readReadyPayload(readyFile, ready, 1000);
      if (!payload) {
        throw new Error(`ready-file payload invalid (${readyFile})`);
      }
      log("SKIP: HTTP obfuscation checks disabled (ready-file mode)");
      return;
    }

    const status = await withTimeout("waitForStatus", runTimeoutMs, () => waitForStatus(port, runTimeoutMs));
    assert.strictEqual(status.ok, true, "Expected /api/status ok=true");
    assert.ok(status.appName, "Expected appName in status");
    assert.ok(status.features && status.features.notes, "Expected features in status");
    const notes = String(status.features.notes || "");
    assert.ok(notes.includes("read at runtime"), "Expected runtime features note");

    const text = "seal-e2e-test";
    const expected = crypto.createHash("md5").update(text).digest("hex");
    const md5Res = await httpJson({ port, path: "/api/md5", method: "POST", body: { text }, timeoutMs: 2000 });
    assert.ok(md5Res.ok, "Expected /api/md5 OK");
    assert.strictEqual(md5Res.json.md5, expected, "Expected MD5 to match");
    assert.strictEqual(md5Res.json.textLength, text.length, "Expected MD5 textLength to match");

    const obfRes = await httpJson({ port, path: "/api/obf/checks", timeoutMs: 4000 });
    assert.ok(obfRes.ok, "Expected /api/obf/checks OK");
    const obf = obfRes.json || {};
    if (!obf.ok) {
      throw new Error(`obf checks failed: ${formatObfFailures(obf)}`);
    }
    assert.ok(obf.total >= 12, "Expected obf checks count >= 12");
    const checks = obf.checks || {};
    assert.strictEqual(checks.checksum?.got, 15594668, "Expected checksum match");
    assert.strictEqual(checks.fib?.got, 6765, "Expected fib match");
    assert.strictEqual(checks.class?.got, "6:19", "Expected class check match");
    assert.strictEqual(checks.generator?.got, "1,2", "Expected generator check match");
  });
}

async function buildProfile({ profile, passes, outRoot, ctx, backendTerser, frontendObfuscation }) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, { enabled: false });
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {}, { level: "low" });
  projectCfg.build.obfuscationProfile = profile;
  if (frontendObfuscation === false) {
    projectCfg.build.frontendObfuscation = false;
  } else if (frontendObfuscation && typeof frontendObfuscation === "object") {
    projectCfg.build.frontendObfuscation = frontendObfuscation;
  } else if (profile === "none") {
    projectCfg.build.frontendObfuscation = false;
  } else {
    projectCfg.build.frontendObfuscation = { enabled: true, profile };
  }
  projectCfg.build.backendTerser = backendTerser !== undefined ? backendTerser : { enabled: true, passes };
  ensureLauncherObfuscation(projectCfg);

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");
  const outDir = path.join(outRoot, "seal-out");
  const timing = createTiming(true);

  const started = Date.now();
  const res = await withTimeout(`buildRelease(${profile})`, ctx.buildTimeoutMs, () =>
    buildRelease({
      projectRoot: EXAMPLE_ROOT,
      projectCfg,
      targetCfg,
      configName,
      packagerOverride: "thin-split",
      outDirOverride: outDir,
      skipArtifact: true,
      timing,
    })
  );
  const totalMs = Date.now() - started;
  assert.strictEqual(res.meta?.obfuscationProfile, profile, `Expected obfuscationProfile=${profile}`);
  return { res, timing: summarizeTiming(timing, totalMs) };
}

async function testProfile(test, ctx) {
  const { profile, passes, run, backendTerser, frontendObfuscation } = test;
  const label = test.label || profile;
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), `seal-obf-${label}-`));
  try {
    const { res, timing } = await buildProfile({
      profile,
      passes,
      outRoot,
      ctx,
      backendTerser,
      frontendObfuscation,
    });
    const terser = res.meta?.backendTerser;
    if (backendTerser === false || (backendTerser && backendTerser.enabled === false)) {
      assert.ok(terser && terser.enabled === false, "Expected backendTerser disabled");
    } else {
      assert.ok(terser && terser.enabled, "Expected backendTerser enabled");
      assert.strictEqual(terser.ok, true, "Expected backendTerser ok");
      assert.strictEqual(terser.passes, passes, "Expected backendTerser passes");
    }
    if (run) {
      await runReleaseAndCheck({ releaseDir: res.releaseDir, runTimeoutMs: ctx.runTimeoutMs });
    }
    return { profile, label, passes, timing };
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_OBFUSCATION_E2E !== "1") {
    log("SKIP: set SEAL_OBFUSCATION_E2E=1 to run obfuscation E2E tests");
    process.exit(77);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 77 : 1);
  }

  const buildTimeoutMs = resolveE2ETimeout("SEAL_OBFUSCATION_E2E_BUILD_TIMEOUT_MS", 180000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_OBFUSCATION_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_OBFUSCATION_E2E_TIMEOUT_MS", 240000);
  const ctx = { buildTimeoutMs, runTimeoutMs };

  try {
    await getFreePort();
  } catch (e) {
    if (e && e.code === "EPERM") {
      process.env.SEAL_E2E_NO_LISTEN = "1";
      log("WARN: cannot listen on localhost (EPERM); using ready-file mode");
    } else {
      throw e;
    }
  }

  const tests = [
    { profile: "none", passes: 1, run: false, frontendObfuscation: false },
    { profile: "minimal", passes: 1, run: false },
    { profile: "balanced", passes: 2, run: false },
    { profile: "strict", passes: 3, run: true },
    { profile: "max", passes: 4, run: true },
  ];
  let failures = 0;
  const timingRows = [];
  for (const t of tests) {
    try {
      const label = t.label || t.profile;
      const res = await withTimeout(`testProfile(${label})`, testTimeoutMs, () => testProfile(t, ctx));
      timingRows.push(res);
      log(`OK: ${label}`);
    } catch (e) {
      failures += 1;
      fail(`${t.label || t.profile}: ${e.message || e}`);
    }
  }

  if (timingRows.length) {
    log("Timing (JS obfuscation profiles):");
    for (const row of timingRows) {
      const timing = row.timing || {};
      const label = row.label || row.profile;
      log(`  profile=${label} passes=${row.passes} total=${formatMs(timing.totalMs)} backend=${formatMs(timing.backendObfMs)} frontend=${formatMs(timing.frontendObfMs)} terser=${formatMs(timing.terserMs)} bundle=${formatMs(timing.bundleMs)}`);
    }
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
