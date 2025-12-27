#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { resolvePostjectBin } = require("../src/lib/postject");
const { cmdCheck } = require("../src/commands/check");

function log(msg) {
  process.stdout.write(`[postject-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[postject-e2e] ERROR: ${msg}\n`);
  process.exit(1);
}

const postjectBin = resolvePostjectBin();
if (!postjectBin) {
  fail("postject bin not found (expected after npm install in repo root)");
}
log(`postject bin: ${postjectBin}`);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-postject-"));
const srcDir = path.join(tmpRoot, "src");
const cfgDir = path.join(tmpRoot, "seal-config", "configs");
const targetDir = path.join(tmpRoot, "seal-config", "targets");
fs.mkdirSync(srcDir, { recursive: true });
fs.mkdirSync(cfgDir, { recursive: true });
fs.mkdirSync(targetDir, { recursive: true });

fs.writeFileSync(path.join(srcDir, "index.js"), "console.log('postject-e2e');\n", "utf-8");
fs.writeFileSync(
  path.join(tmpRoot, "seal.json5"),
  [
    "{",
    "  appName: \"seal-postject-e2e\",",
    "  entry: \"src/index.js\",",
    "  defaultTarget: \"local\",",
    "  build: {",
    "    packager: \"sea\",",
    "    protection: { enabled: false }",
    "  }",
    "}",
    "",
  ].join("\n"),
  "utf-8"
);
fs.writeFileSync(path.join(cfgDir, "local.json5"), "{ http: { host: \"127.0.0.1\", port: 0 } }\n", "utf-8");
fs.writeFileSync(
  path.join(targetDir, "local.json5"),
  "{ target: \"local\", kind: \"local\", config: \"local\", packager: \"sea\" }\n",
  "utf-8"
);

async function main() {
  const logs = [];
  const errors = [];
  const stripAnsi = (str) => str.replace(/\u001b\[[0-9;]*m/g, "");
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => logs.push(args.join(" "));
  console.error = (...args) => errors.push(args.join(" "));

  try {
    await cmdCheck(tmpRoot, "local", {});
  } catch (e) {
    console.log = origLog;
    console.error = origErr;
    const output = `${logs.join("\n")}\n${errors.join("\n")}`.trim();
    fail(`seal check failed\n${output || e.message || e}`);
  }

  console.log = origLog;
  console.error = origErr;

  const output = `${logs.join("\n")}\n${errors.join("\n")}`;
  const cleanOutput = stripAnsi(output);
  if (!cleanOutput.includes("postject: OK (SEA injection)") && !cleanOutput.includes("postject: OK")) {
    fail(`postject OK not found in output\n${cleanOutput}`);
  }
  if (/postject module installed but CLI not found/.test(cleanOutput) || /postject not installed/.test(cleanOutput)) {
    fail(`postject warning present in output\n${cleanOutput}`);
  }

  log("OK: postject check output verified");
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
