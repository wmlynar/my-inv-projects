#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { resolvePostjectBin } = require("../src/lib/postject");
const { cmdCheck } = require("../src/commands/check");
const { createLogger, stripAnsi, resolveTmpRoot } = require("./e2e-utils");

const { log, fail } = createLogger("postject-e2e");

const postjectBin = resolvePostjectBin();
if (!postjectBin) {
  fail("postject bin not found (expected after npm install in repo root)");
  process.exit(1);
}
log(`postject bin: ${postjectBin}`);

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(resolveTmpRoot(), "seal-postject-"));
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
      "    packager: \"sea\"",
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

  const logs = [];
  const errors = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => logs.push(args.join(" "));
  console.error = (...args) => errors.push(args.join(" "));
  let failure = null;
  let ok = false;

  try {
    await cmdCheck(tmpRoot, "local", {});
    const output = `${logs.join("\n")}\n${errors.join("\n")}`;
    const cleanOutput = stripAnsi(output);
    if (!cleanOutput.includes("postject: OK (SEA injection)") && !cleanOutput.includes("postject: OK")) {
      throw new Error(`postject OK not found in output\n${cleanOutput}`);
    }
    if (/postject module installed but CLI not found/.test(cleanOutput) || /postject not installed/.test(cleanOutput)) {
      throw new Error(`postject warning present in output\n${cleanOutput}`);
    }
    ok = true;
  } catch (e) {
    const output = `${logs.join("\n")}\n${errors.join("\n")}`.trim();
    const msg = e && e.message ? e.message : String(e);
    const detail = output ? `${msg}\n${output}` : msg;
    failure = new Error(`seal check failed\n${detail}`);
  } finally {
    console.log = origLog;
    console.error = origErr;
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  if (failure) throw failure;
  if (ok) log("OK: postject check output verified");
}

main().catch((e) => {
  fail(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
