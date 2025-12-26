#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");

const EXAMPLE_ROOT = path.resolve(__dirname, "..", "..", "example");

function log(msg) {
  process.stdout.write(`[c-obf-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[c-obf-e2e] ERROR: ${msg}\n`);
}

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
}

function hasCommand(cmd) {
  const res = runCmd("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`]);
  return res.status === 0;
}

function checkPrereqs() {
  if (process.platform !== "linux") {
    log(`SKIP: C obfuscator tests are linux-only (platform=${process.platform})`);
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

function withTimeout(label, ms, fn) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([fn(), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function resolveSystemCc() {
  if (hasCommand("cc")) return "cc";
  if (hasCommand("gcc")) return "gcc";
  return null;
}

function createFakeCompiler(dir) {
  const scriptPath = path.join(dir, "fake-obf-cc.sh");
  const script = `#!/usr/bin/env bash
set -euo pipefail
marker="\${SEAL_OBF_MARKER:-}"
cc="\${SEAL_OBF_CC:-cc}"
hit=0
for arg in "$@"; do
  if [[ "$arg" == "-DSEAL_OBF_TEST=1" ]]; then
    hit=1
  fi
done
if [[ -n "$marker" && "$hit" -eq 1 ]]; then
  echo "ok" > "$marker"
fi
exec "$cc" "$@"
`;
  fs.writeFileSync(scriptPath, script, "utf-8");
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
}

async function buildWithObfuscator({ outRoot, obfuscator, cmd, args }) {
  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, {
    cObfuscator: obfuscator,
    cObfuscatorCmd: cmd,
    cObfuscatorArgs: args,
  });

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const outDir = path.join(outRoot, "seal-out");
  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: "thin-single",
    outDirOverride: outDir,
  });

  const metaPath = path.join(res.outDir, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  return { ...res, meta };
}

async function testObfuscator(ctx, obfuscator) {
  log(`Building with cObfuscator=${obfuscator}...`);
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-c-obf-"));
  const toolRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-c-obf-tool-"));
  const marker = path.join(toolRoot, "marker.txt");

  try {
    const systemCc = resolveSystemCc();
    if (!systemCc) {
      throw new Error("Missing system CC");
    }
    const fakeCompiler = createFakeCompiler(toolRoot);
    process.env.SEAL_OBF_CC = systemCc;
    process.env.SEAL_OBF_MARKER = marker;

    if (fs.existsSync(marker)) fs.rmSync(marker);
    const res = await withTimeout(`buildRelease(${obfuscator})`, ctx.buildTimeoutMs, () =>
      buildWithObfuscator({
        outRoot,
        obfuscator,
        cmd: fakeCompiler,
        args: ["-DSEAL_OBF_TEST=1"],
      })
    );

    assert.ok(fs.existsSync(marker), "Expected fake compiler to receive obfuscator args");
    assert.strictEqual(res.meta?.protection?.cObfuscator, obfuscator);
  } finally {
    delete process.env.SEAL_OBF_CC;
    delete process.env.SEAL_OBF_MARKER;
    fs.rmSync(outRoot, { recursive: true, force: true });
    fs.rmSync(toolRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_C_OBF_E2E !== "1") {
    log("SKIP: set SEAL_C_OBF_E2E=1 to run C obfuscator tests");
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 0 : 1);
  }

  const buildTimeoutMs = Number(process.env.SEAL_C_OBF_E2E_BUILD_TIMEOUT_MS || "180000");
  const testTimeoutMs = Number(process.env.SEAL_C_OBF_E2E_TIMEOUT_MS || "240000");
  const ctx = { buildTimeoutMs };

  const tests = [
    () => testObfuscator(ctx, "obfuscator-llvm"),
    () => testObfuscator(ctx, "hikari"),
  ];

  let failures = 0;
  for (const t of tests) {
    try {
      await withTimeout(t.name || "cObfTest", testTimeoutMs, () => t());
      log(`OK: ${t.name || "cObfTest"}`);
    } catch (e) {
      failures += 1;
      fail(`${t.name || "cObfTest"}: ${e.message || e}`);
    }
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
