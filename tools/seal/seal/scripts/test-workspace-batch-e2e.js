#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { spawnSyncWithTimeout, stripAnsi, resolveTmpRoot, createLogger } = require("./e2e-utils");

const { log, fail } = createLogger("workspace-batch-e2e");

const SEAL_BIN = path.resolve(__dirname, "..", "bin", "seal.js");

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function runSeal(cwd, args) {
  const env = { ...process.env };
  delete env.SEAL_BATCH_SKIP;
  const res = spawnSyncWithTimeout(process.execPath, [SEAL_BIN, ...args], {
    cwd,
    env,
    encoding: "utf8",
  });
  const stdout = res.stdout || "";
  const stderr = res.stderr || "";
  if (res.error && res.error.code === "ETIMEDOUT") {
    throw new Error(`seal ${args.join(" ")} timed out`);
  }
  if (res.error) {
    throw new Error(`seal ${args.join(" ")} failed: ${res.error.message || String(res.error)}`);
  }
  if (res.status !== 0) {
    const out = stripAnsi(`${stdout}\n${stderr}`.trim());
    throw new Error(`seal ${args.join(" ")} failed (status=${res.status})\n${out}`);
  }
  return stripAnsi(`${stdout}\n${stderr}`.trim());
}

function setupWorkspace(root) {
  writeFile(path.join(root, "seal.json5"), `{
  "projects": [
    { "name": "app-a", "path": "apps/app-a" },
    { "name": "app-b", "path": "apps/app-b" }
  ]
}
`);

  const appA = path.join(root, "apps", "app-a");
  const appB = path.join(root, "apps", "app-b");

  writeFile(path.join(appA, "seal.json5"), `{
  "appName": "app-a",
  "entry": "src/index.js"
}
`);
  writeFile(path.join(appA, "src", "index.js"), "console.log(\"app-a\");\n");

  writeFile(path.join(appB, "seal.json5"), `{
  "appName": "app-b",
  "entry": "src/index.js"
}
`);
  writeFile(path.join(appB, "src", "index.js"), "console.log(\"app-b\");\n");

  return { appA, appB };
}

async function main() {
  const root = fs.mkdtempSync(path.join(resolveTmpRoot(), "seal-workspace-batch-"));
  const { appA, appB } = setupWorkspace(root);
  try {
    const out = runSeal(root, ["config", "add", "batch"]);
    assert.ok(out.includes("Workspace: 2 project(s)"), "Expected auto-batch workspace header");
    assert.ok(out.includes("Workspace: [1/2]"), "Expected auto-batch progress for project 1");
    assert.ok(out.includes("Workspace: [2/2]"), "Expected auto-batch progress for project 2");

    const cfgA = path.join(appA, "seal-config", "configs", "batch.json5");
    const cfgB = path.join(appB, "seal-config", "configs", "batch.json5");
    assert.ok(fs.existsSync(cfgA), "Expected batch config for app-a");
    assert.ok(fs.existsSync(cfgB), "Expected batch config for app-b");

    log("OK");
  } finally {
    if (process.env.SEAL_E2E_KEEP_TMP !== "1") {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
