#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { resolveExampleRoot, createLogger, resolveTmpRoot } = require("./e2e-utils");

const { log, fail } = createLogger("diag-e2e");
const EXAMPLE_ROOT = resolveExampleRoot();

function runDiag(target) {
  const cliPath = path.join(__dirname, "..", "bin", "seal.js");
  const res = spawnSync(process.execPath, [cliPath, "diag", target], { cwd: EXAMPLE_ROOT, stdio: "pipe" });
  if (res.error) {
    throw new Error(res.error.message || String(res.error));
  }
  if (res.status !== 0) {
    const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
    throw new Error(`diag failed (status=${res.status}): ${out}`);
  }
  return `${res.stdout || ""}\n${res.stderr || ""}`;
}

function findLatestDiagRoot() {
  const base = path.join(EXAMPLE_ROOT, "seal-out", "diagnostics");
  if (!fs.existsSync(base)) return null;
  const entries = fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(base, d.name));
  if (!entries.length) return null;
  entries.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return entries[0];
}

function main() {
  if (process.env.SEAL_DIAG_E2E !== "1") {
    log("SKIP: set SEAL_DIAG_E2E=1 to run diag E2E tests");
    process.exit(77);
  }
  runDiag("local");
  const diagRoot = findLatestDiagRoot();
  assert.ok(diagRoot, "Missing diagnostics dir after diag");
  const files = ["check.txt", "config-explain.txt", "config-diff.txt", "remote-status.txt", "remote-logs.txt"];
  for (const file of files) {
    const filePath = path.join(diagRoot, file);
    assert.ok(fs.existsSync(filePath), `Missing diag file: ${filePath}`);
  }
  if (process.env.SEAL_E2E_KEEP_TMP !== "1" && process.env.SEAL_E2E_KEEP_DIAG !== "1") {
    fs.rmSync(diagRoot, { recursive: true, force: true });
  }
  log("OK: diag-e2e");
}

main();
