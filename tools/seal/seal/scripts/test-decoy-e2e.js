#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName } = require("../src/lib/project");
const { createLogger, resolveExampleRoot } = require("./e2e-utils");

const { log, fail, skip } = createLogger("decoy-e2e");
const EXAMPLE_ROOT = resolveExampleRoot();

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function ensureNoSecrets(text) {
  const banned = ["seal", "runner", "bootstrap", "sentinel", "thin"];
  for (const token of banned) {
    const re = new RegExp(`\\b${token}\\b`, "i");
    if (re.test(text)) {
      throw new Error(`Decoy contains banned token: ${token}`);
    }
  }
}

async function buildWithDecoy({ mode, includeDirs, scope, overwrite }) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  const targetName = resolveTargetName(EXAMPLE_ROOT, "local");
  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, targetName);
  const configName = resolveConfigName(targetCfg, null);

  projectCfg.build = projectCfg.build || {};
  projectCfg.build.packager = "none";
  projectCfg.build.protection = { enabled: false };
  projectCfg.build.frontendObfuscation = { enabled: false };
  projectCfg.build.frontendMinify = { enabled: false };
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {}, {
    integrity: { enabled: false },
  });
  projectCfg.build.decoy = {
    mode,
    scope: scope || "backend",
    overwrite: overwrite !== undefined ? overwrite : false,
    generator: "basic",
  };
  projectCfg.build.includeDirs = includeDirs;
  projectCfg.build.sentinel = { enabled: false };

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-decoy-"));
  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: "none",
    outDirOverride: outDir,
    skipArtifact: true,
  });
  return { outDir, releaseDir: res.releaseDir };
}

async function testSoftDecoy() {
  log("Building soft decoy...");
  const { releaseDir } = await buildWithDecoy({ mode: "soft", includeDirs: ["data"] });
  const files = [
    "package.json",
    "server.js",
    "README.md",
    "src/routes/index.js",
    "src/services/data.js",
    "src/services/cache.js",
    "src/services/metrics.js",
    "config/ui.json",
  ];
  for (const rel of files) {
    const full = path.join(releaseDir, rel);
    assert.ok(fs.existsSync(full), `Missing decoy file: ${rel}`);
    ensureNoSecrets(readFileSafe(full));
  }
  assert.ok(!fs.existsSync(path.join(releaseDir, "public", "index.html")), "Backend-only decoy should not write public/");
}

async function testWrapperDecoy() {
  log("Building wrapper decoy...");
  const { releaseDir } = await buildWithDecoy({ mode: "wrapper", includeDirs: ["data"] });
  const worker = path.join(releaseDir, "bin", "worker.js");
  assert.ok(fs.existsSync(worker), "Missing wrapper worker.js");
  ensureNoSecrets(readFileSafe(worker));
}

async function testFullDecoy() {
  log("Building full decoy...");
  const { releaseDir } = await buildWithDecoy({ mode: "soft", includeDirs: ["data"], scope: "full" });
  const publicHtml = path.join(releaseDir, "public", "index.html");
  assert.ok(fs.existsSync(publicHtml), "Missing decoy public/index.html");
  ensureNoSecrets(readFileSafe(publicHtml));
}

async function testCollision() {
  log("Testing collision detection...");
  let failed = false;
  try {
    await buildWithDecoy({ mode: "soft", includeDirs: ["public"], scope: "full", overwrite: false });
  } catch (e) {
    failed = true;
    const msg = String(e && e.message ? e.message : e);
    if (!msg.includes("Decoy install blocked")) {
      throw new Error(`Unexpected error: ${msg}`);
    }
  }
  if (!failed) {
    throw new Error("Expected collision failure, but build succeeded");
  }
}

async function main() {
  if (process.env.SEAL_DECOY_E2E !== "1") {
    return skip("set SEAL_DECOY_E2E=1 to run decoy E2E");
  }
  await testSoftDecoy();
  await testWrapperDecoy();
  await testFullDecoy();
  await testCollision();
  log("OK");
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
