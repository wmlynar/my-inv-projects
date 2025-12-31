#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  spawnSyncWithTimeout,
  resolveExampleRoot,
  resolveE2ERunTimeout,
  stripAnsi,
  createLogger,
} = require("./e2e-utils");
const { removeDirSafe } = require("./e2e-runner-fs");
const { getDirSizeBytes } = require("./e2e-runner-utils");

const { log, fail } = createLogger("e2e-cleanup");

function listSubdirs(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function main() {
  const exampleRoot = resolveExampleRoot();
  const e2eBase = path.join(exampleRoot, "seal-out", "e2e");
  const runLabel = `cleanup-${process.pid}-${Date.now()}`;
  const e2eRoot = path.join(e2eBase, runLabel);
  const runnerPath = path.join(__dirname, "run-e2e-parallel.js");
  const outerRunRoot = process.env.SEAL_E2E_RUN_ROOT || "";
  const innerLogDir = outerRunRoot
    ? path.join(outerRunRoot, "logs", runLabel)
    : path.join(e2eRoot, "logs");
  const innerRunId = `cleanup-${process.pid}`;
  const tmpBase = fs.existsSync("/tmp") ? "/tmp" : "/var/tmp";
  const workerRoot = path.join(tmpBase, "seal-e2e-workers", innerRunId);
  const sandboxRoot = fs.mkdtempSync(path.join(tmpBase, `seal-e2e-cleanup-${process.pid}-`));
  const sandboxExample = path.join(sandboxRoot, "example");
  fs.mkdirSync(sandboxExample, { recursive: true });
  fs.writeFileSync(path.join(sandboxExample, "seal.json5"), "{ appName: \"seal-cleanup\" }\n", "utf8");
  fs.mkdirSync(path.join(sandboxExample, "seal-config", "targets"), { recursive: true });
  fs.writeFileSync(
    path.join(sandboxExample, "seal-config", "targets", "local.json5"),
    "{ target: \"local\", kind: \"local\" }\n",
    "utf8"
  );
  const maxBytesRaw = process.env.SEAL_E2E_CLEANUP_MAX_BYTES;
  const maxBytes = Number.isFinite(Number(maxBytesRaw))
    ? Number(maxBytesRaw)
    : 50 * 1024 * 1024;

  fs.mkdirSync(innerLogDir, { recursive: true });

  const env = {
    ...process.env,
    SEAL_E2E_ROOT: e2eRoot,
    SEAL_E2E_LOG_DIR: innerLogDir,
    SEAL_E2E_TESTS: "noop-a,noop-b",
    SEAL_E2E_PARALLEL: "1",
    SEAL_E2E_PARALLEL_MODE: "groups",
    SEAL_E2E_JOBS: "4",
    SEAL_E2E_RUN_LAYOUT: "concurrent",
    SEAL_E2E_RUN_ID: innerRunId,
    SEAL_E2E_KEEP_TMP: "0",
    SEAL_E2E_KEEP_RUNS: "0",
    SEAL_E2E_ESCALATED: "1",
    SEAL_E2E_REQUIRE_ESCALATION: "0",
  };

  const timeout = resolveE2ERunTimeout("SEAL_E2E_CLEANUP_TIMEOUT_MS", 120000);
  try {
    const res = spawnSyncWithTimeout(process.execPath, [runnerPath], {
      env: {
        ...env,
        SEAL_E2E_EXAMPLE_ROOT: sandboxExample,
        SEAL_E2E_COPY_EXAMPLE: "0",
      },
      encoding: "utf8",
      timeout,
    });
    if (res.error) {
      const msg = res.error.code === "ETIMEDOUT"
        ? `cleanup runner timed out after ${timeout}ms`
        : (res.error.message || String(res.error));
      throw new Error(msg);
    }
    if (res.status !== 0) {
      const output = stripAnsi(`${res.stdout || ""}\n${res.stderr || ""}`).trim();
      throw new Error(`cleanup runner failed (status=${res.status})${output ? `\n${output}` : ""}`);
    }
  } finally {
    removeDirSafe(sandboxRoot);
  }

  const concurrentRoot = path.join(e2eRoot, "concurrent-runs");
  const runDir = path.join(e2eRoot, "run");
  const allowed = new Set(["cache", "summary", "logs", "concurrent-runs"]);
  const entries = fs.existsSync(e2eRoot)
    ? fs.readdirSync(e2eRoot, { withFileTypes: true })
    : [];

  if (fs.existsSync(runDir)) {
    throw new Error(`unexpected shared run directory: ${runDir}`);
  }

  if (fs.existsSync(concurrentRoot)) {
    const runs = listSubdirs(concurrentRoot);
    if (runs.length) {
      throw new Error(`leftover concurrent runs: ${runs.join(", ")}`);
    }
  }

  if (fs.existsSync(workerRoot)) {
    throw new Error(`leftover worker root: ${workerRoot}`);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      throw new Error(`unexpected file in e2e root: ${entry.name}`);
    }
    if (!allowed.has(entry.name)) {
      throw new Error(`unexpected directory in e2e root: ${entry.name}`);
    }
  }

  const e2eBytes = getDirSizeBytes(e2eRoot);
  if (e2eBytes !== null && e2eBytes > maxBytes) {
    throw new Error(`e2e root too large after cleanup (${e2eBytes} bytes > ${maxBytes} bytes)`);
  }

  const shouldRemoveRoot = outerRunRoot && !innerLogDir.startsWith(`${e2eRoot}${path.sep}`);
  if (shouldRemoveRoot) {
    fs.rmSync(e2eRoot, { recursive: true, force: true });
  }
  log("OK: cleanup guard verified");
}

try {
  main();
} catch (err) {
  fail(err && err.stack ? err.stack : String(err));
  process.exit(1);
}
