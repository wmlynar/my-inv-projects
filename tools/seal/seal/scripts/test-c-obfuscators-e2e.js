#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpJson({ port, path: reqPath, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: reqPath,
        method: "GET",
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            const json = JSON.parse(raw);
            resolve({ status: res.statusCode, json });
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${raw.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("HTTP timeout")));
    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function waitForStatus(port, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { status, json } = await httpJson({ port, path: "/api/status", timeoutMs: 800 });
      if (status === 200 && json && json.ok) return json;
    } catch {
      // ignore and retry
    }
    await delay(200);
  }
  throw new Error(`Timeout waiting for /api/status on port ${port}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : null;
      srv.close(() => resolve(port));
    });
  });
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runRelease({ releaseDir, runTimeoutMs }) {
  if (runRelease.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }

  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const child = spawn(binPath, [], { cwd: releaseDir, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  let exitErr = null;
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      exitErr = new Error(`app exited (code=${code}, signal=${signal || "none"})`);
    }
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () => waitForStatus(port));
    if (exitErr) throw exitErr;
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}

function parseArgsEnv(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("args must be a JSON array");
    return parsed.map((v) => String(v));
  }
  return trimmed.split(/\s+/).filter(Boolean);
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
  let args = parseArgsEnv(process.env[spec.argsEnv]);
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
    await runRelease({ releaseDir: res.releaseDir, runTimeoutMs: ctx.runTimeoutMs });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
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

  try {
    await getFreePort();
  } catch (e) {
    if (e && e.code === "EPERM") {
      runRelease.skipListen = true;
      log("SKIP: cannot listen on localhost (EPERM)");
    } else {
      throw e;
    }
  }

  const buildTimeoutMs = Number(process.env.SEAL_C_OBF_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_C_OBF_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_C_OBF_E2E_TIMEOUT_MS || "240000");
  const ctx = { buildTimeoutMs, runTimeoutMs };

  const tests = [
    () => testObfuscator(ctx, {
      id: "obfuscator-llvm",
      name: "O-LLVM",
      cmdEnv: "SEAL_OLLVM_CMD",
      argsEnv: "SEAL_OLLVM_ARGS",
      defaultCmd: "ollvm-clang",
      defaultArgs: ["-mllvm", "-fla", "-mllvm", "-sub"],
      installHint: "./tools/seal/seal/scripts/install-ollvm.sh",
    }),
    () => testObfuscator(ctx, {
      id: "hikari",
      name: "Hikari",
      cmdEnv: "SEAL_HIKARI_CMD",
      argsEnv: "SEAL_HIKARI_ARGS",
      defaultCmd: "hikari-clang",
      defaultArgs: ["-mllvm", "-fla", "-mllvm", "-sub"],
      installHint: "./tools/seal/seal/scripts/install-hikari-llvm15.sh",
    }),
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
