#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { resolveExampleRoot, createLogger, spawnSyncWithTimeout } = require("./e2e-utils");

const EXAMPLE_ROOT = resolveExampleRoot();
const SEAL_BIN = path.resolve(__dirname, "..", "bin", "seal.js");

const { log, fail, skip } = createLogger("profile-overlay-e2e");

function runSeal(args) {
  const res = spawnSyncWithTimeout(process.execPath, [SEAL_BIN, ...args], {
    cwd: EXAMPLE_ROOT,
    env: { ...process.env, SEAL_BATCH_SKIP: "1" },
    encoding: "utf8",
    timeout: 60000,
  });
  if (res.error && res.error.code === "ETIMEDOUT") {
    throw new Error(`seal ${args.join(" ")} timed out`);
  }
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
    throw new Error(`seal ${args.join(" ")} failed (status=${res.status})\n${out}`);
  }
  return `${res.stdout || ""}\n${res.stderr || ""}`.trim();
}

function findLine(lines, prefix) {
  return lines.find((line) => line.trim().startsWith(prefix)) || "";
}

async function main() {
  if (process.env.SEAL_PROFILE_OVERLAY_E2E !== "1") {
    skip("set SEAL_PROFILE_OVERLAY_E2E=1 to run profile overlay E2E");
    process.exit(77);
  }

  const explain = runSeal(["config", "explain", "local", "--profile-overlay", "fast"]);
  const lines = explain.split(/\r?\n/);
  const overlayLine = lines.find((line) => line.includes("profileOverlay: fast"));
  assert.ok(overlayLine, "Expected profileOverlay: fast in config explain");
  const obfLine = findLine(lines, "obfuscationProfile:");
  assert.ok(obfLine, "Missing obfuscationProfile line");
  assert.ok(obfLine.includes("none"), `Expected obfuscationProfile=none, got: ${obfLine}`);
  assert.ok(obfLine.includes("profileOverlay"), `Expected obfuscationProfile source=profileOverlay, got: ${obfLine}`);

  const projectCfg = loadProjectConfig(EXAMPLE_ROOT, { profileOverlay: "fast" });
  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-profile-overlay-"));
  const outDir = path.join(outRoot, "seal-out");
  try {
    const res = await buildRelease({
      projectRoot: EXAMPLE_ROOT,
      projectCfg,
      targetCfg,
      configName,
      packagerOverride: "none",
      outDirOverride: outDir,
      skipArtifact: true,
    });
    assert.strictEqual(res.meta?.obfuscationProfile, "none", "Expected meta.obfuscationProfile=none");
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }

  log("OK");
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
