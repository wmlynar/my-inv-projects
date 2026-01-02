#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { loadProjectConfig } = require("../src/lib/project");
const { createLogger, resolveTmpRoot } = require("./e2e-utils");

const { log, fail } = createLogger("workspace-defaults-e2e");

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeProjectFiles(root, appName) {
  writeFile(path.join(root, "src", "index.js"), `console.log("${appName}");\n`);
}

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(resolveTmpRoot(), "seal-workspace-"));
  const workspaceSeal = `{
  "projects": [
    { "name": "app-a", "path": "apps/app-a" },
    { "name": "app-b", "path": "apps/app-b" }
  ],
  "defaults": {
    "build": {
      "includeDirs": [
        "public"
      ],
      "thin": {
        "runtimeArgv0": "appName"
      }
    }
  }
}
`;
  writeFile(path.join(tmpRoot, "seal.json5"), workspaceSeal);

  const appA = path.join(tmpRoot, "apps", "app-a");
  const appB = path.join(tmpRoot, "apps", "app-b");

  writeFile(
    path.join(appA, "seal.json5"),
    `{
  "appName": "app-a",
  "entry": "src/index.js",
  "build": {
    "includeDirs": [],
    "thin": {
      "runtimeArgv0": "n"
    }
  }
}
`
  );
  writeProjectFiles(appA, "app-a");

  writeFile(
    path.join(appB, "seal.json5"),
    `{
  "appName": "app-b",
  "entry": "src/index.js"
}
`
  );
  writeProjectFiles(appB, "app-b");

  const cfgA = loadProjectConfig(appA);
  assert.ok(cfgA, "Missing config for app-a");
  assert.deepStrictEqual(cfgA.build.includeDirs, [], "Expected app-a includeDirs override");
  assert.strictEqual(cfgA.build.thin.runtimeArgv0, "n", "Expected app-a runtimeArgv0 override");

  const cfgB = loadProjectConfig(appB);
  assert.ok(cfgB, "Missing config for app-b");
  assert.deepStrictEqual(cfgB.build.includeDirs, ["public"], "Expected app-b includeDirs from workspace defaults");
  assert.strictEqual(cfgB.build.thin.runtimeArgv0, "appName", "Expected app-b runtimeArgv0 from workspace defaults");

  if (process.env.SEAL_E2E_KEEP_TMP !== "1") {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  log("OK");
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
