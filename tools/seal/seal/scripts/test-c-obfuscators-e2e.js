#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  hasCommand,
  resolveE2ETimeout,
  resolveE2ERunTimeout,
  withTimeout,
  getFreePort,
  resolveExampleRoot,
  createLogger,
  withSealedBinary,
  parseArgsEnv,
  readReadyPayload,
} = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

const EXAMPLE_ROOT = resolveExampleRoot();

const { log, fail } = createLogger("c-obf-e2e");

function runCmd(cmd, args, timeoutMs = 5000) {
  const res = spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
  if (res.error) {
    const msg = res.error.message || String(res.error);
    throw new Error(`${cmd} failed: ${msg}`);
  }
  return res;
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

function resolveSystemCc() {
  if (hasCommand("cc")) return "cc";
  if (hasCommand("gcc")) return "gcc";
  return null;
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port || 3000;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runRelease({ releaseDir, runTimeoutMs }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  await withSealedBinary({
    label: "c-obf",
    releaseDir,
    binPath,
    runTimeoutMs,
    skipListen: runRelease.skipListen === true,
    writeRuntimeConfig,
    log,
  }, async ({ readyFile, ready }) => {
    if (!readyFile) return;
    const payload = await readReadyPayload(readyFile, ready, 1000);
    if (!payload) {
      throw new Error(`ready-file payload invalid (${readyFile})`);
    }
  });
}

async function buildWithObfuscator({ outRoot, obfuscator, cmd, args }) {
  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, {
    cObfuscator: {
      tool: obfuscator,
      cmd,
      args,
    },
    elfPacker: {},
  });

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const outDir = path.join(outRoot, "seal-out");
  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: "thin-split",
    outDirOverride: outDir,
  });

  const metaPath = path.join(res.outDir, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  return { ...res, meta };
}

async function testObfuscator(ctx, spec) {
  const cmd = process.env[spec.cmdEnv] || spec.defaultCmd;
  if (!cmd || !hasCommand(cmd)) {
    const msg = `${spec.name} command not found (${cmd || "unset"})`;
    if (process.env.SEAL_C_OBF_ALLOW_MISSING === "1") {
      log(`SKIP: ${msg}`);
      return;
    }
    throw new Error(`${msg}. Install via ${spec.installHint}`);
  }
  let args = parseArgsEnv(process.env[spec.argsEnv], spec.argsEnv);
  if (!args) args = spec.defaultArgs.slice();

  log(`Building with cObfuscator=${spec.id} (${cmd})...`);
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-c-obf-"));

  try {
    const res = await withTimeout(`buildRelease(${spec.id})`, ctx.buildTimeoutMs, () =>
      buildWithObfuscator({
        outRoot,
        obfuscator: spec.id,
        cmd,
        args,
      })
    );

    assert.strictEqual(res.meta?.protection?.cObfuscator, spec.id);
    if (spec.runtimeSkip && process.env[spec.runtimeEnv] !== "1") {
      log(`SKIP: ${spec.name} runtime check disabled (set ${spec.runtimeEnv}=1 to enable)`);
      return;
    }
    await runRelease({ releaseDir: res.releaseDir, runTimeoutMs: ctx.runTimeoutMs });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_C_OBF_E2E !== "1") {
    log("SKIP: set SEAL_C_OBF_E2E=1 to run C obfuscator tests");
    process.exit(77);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 77 : 1);
  }

  try {
    await getFreePort();
  } catch (e) {
    if (e && e.code === "EPERM") {
      runRelease.skipListen = true;
      log("WARN: cannot listen on localhost (EPERM); using ready-file mode");
    } else {
      throw e;
    }
  }

  const buildTimeoutMs = resolveE2ETimeout("SEAL_C_OBF_E2E_BUILD_TIMEOUT_MS", 180000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_C_OBF_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_C_OBF_E2E_TIMEOUT_MS", 240000);
  const ctx = { buildTimeoutMs, runTimeoutMs };

  const tests = [
    {
      name: "O-LLVM",
      run: () => testObfuscator(ctx, {
        id: "obfuscator-llvm",
        name: "O-LLVM",
        cmdEnv: "SEAL_OLLVM_CMD",
        argsEnv: "SEAL_OLLVM_ARGS",
        defaultCmd: "ollvm-clang",
        defaultArgs: ["-mllvm", "-fla", "-mllvm", "-sub"],
        installHint: "./tools/seal/seal/scripts/install-ollvm.sh",
      }),
    },
    {
      name: "Hikari",
      run: () => testObfuscator(ctx, {
        id: "hikari",
        name: "Hikari",
        cmdEnv: "SEAL_HIKARI_CMD",
        argsEnv: "SEAL_HIKARI_ARGS",
        defaultCmd: "hikari-clang",
        defaultArgs: ["-mllvm", "-enable-allobf"],
        runtimeSkip: true,
        runtimeEnv: "SEAL_HIKARI_RUNTIME",
        installHint: "./tools/seal/seal/scripts/install-hikari-llvm15.sh",
      }),
    },
  ];

  let failures = 0;
  for (const t of tests) {
    const name = t.name || "cObfTest";
    try {
      await withTimeout(name, testTimeoutMs, () => t.run());
      log(`OK: ${name}`);
    } catch (e) {
      failures += 1;
      fail(`${name}: ${e.message || e}`);
    }
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
