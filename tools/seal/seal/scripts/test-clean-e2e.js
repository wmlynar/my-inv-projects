#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { cmdClean } = require("../src/commands/clean");
const { resolveExampleRoot, createLogger } = require("./e2e-utils");

const EXAMPLE_ROOT = resolveExampleRoot();
const { log, fail } = createLogger("clean-e2e");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

async function main() {
  const outDir = path.join(EXAMPLE_ROOT, "seal-out");
  fs.rmSync(outDir, { recursive: true, force: true });

  ensureDir(path.join(outDir, "cache"));
  ensureDir(path.join(outDir, "e2e", "run"));
  ensureDir(path.join(outDir, "e2e", "concurrent-runs"));
  writeFile(path.join(outDir, "e2e", "keep.txt"), "ok\n");
  writeFile(path.join(outDir, "cache", "blob.txt"), "ok\n");

  await cmdClean(EXAMPLE_ROOT, "runs");
  assert.ok(!fs.existsSync(path.join(outDir, "e2e", "run")), "Expected e2e/run removed by clean runs");
  assert.ok(!fs.existsSync(path.join(outDir, "e2e", "concurrent-runs")), "Expected e2e/concurrent-runs removed by clean runs");
  assert.ok(fs.existsSync(path.join(outDir, "e2e", "keep.txt")), "Expected e2e contents preserved by clean runs");
  assert.ok(fs.existsSync(path.join(outDir, "cache", "blob.txt")), "Expected cache preserved by clean runs");

  await cmdClean(EXAMPLE_ROOT, "e2e");
  assert.ok(!fs.existsSync(path.join(outDir, "e2e")), "Expected e2e removed by clean e2e");
  assert.ok(fs.existsSync(path.join(outDir, "cache")), "Expected cache preserved by clean e2e");

  await cmdClean(EXAMPLE_ROOT, "cache");
  assert.ok(!fs.existsSync(path.join(outDir, "cache")), "Expected cache removed by clean cache");

  ensureDir(path.join(outDir, "cache"));
  writeFile(path.join(outDir, "cache", "blob.txt"), "ok\n");
  await cmdClean(EXAMPLE_ROOT, "all");
  assert.ok(!fs.existsSync(outDir), "Expected seal-out removed by clean all");

  log("OK");
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
