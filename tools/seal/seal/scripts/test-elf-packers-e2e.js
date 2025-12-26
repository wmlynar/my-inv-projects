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

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");

function log(msg) {
  process.stdout.write(`[elf-packers-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[elf-packers-e2e] ERROR: ${msg}\n`);
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
    log(`SKIP: ELF packer tests are linux-only (platform=${process.platform})`);
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runRelease({ releaseDir, buildId, runTimeoutMs }) {
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

async function buildWithProtection({ protection, outRoot }) {
  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {}, {
    launcherObfuscation: false,
  });
  projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, protection || {});

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

async function testElfPacker(ctx, spec) {
  const skipEnv = process.env[spec.skipEnv];
  if (skipEnv === "1") {
    log(`SKIP: ${spec.name} disabled by ${spec.skipEnv}`);
    return;
  }

  const cmd = process.env[spec.cmdEnv] || spec.defaultCmd;
  if (!cmd || !hasCommand(cmd)) {
    const msg = `${spec.name} command not found (${cmd || "unset"})`;
    if (process.env.SEAL_ELF_PACKERS_ALLOW_MISSING === "1") {
      log(`SKIP: ${msg}`);
      return;
    }
    throw new Error(msg);
  }

  let args = parseArgsEnv(process.env[spec.argsEnv]);
  if (!args) args = spec.defaultArgs.slice();

  log(`Building thin-split with ${spec.name}...`);
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), `seal-${spec.id}-`));
  try {
    const res = await withTimeout(`buildRelease(${spec.id})`, ctx.buildTimeoutMs, () =>
      buildWithProtection({
        protection: {
          elfPacker: {
            tool: spec.id,
            cmd,
            args,
          },
        },
        outRoot,
      })
    );
    const steps = res.meta?.protection?.post?.steps || [];
    const step = steps.find((s) => s && s.step === "elf_packer");
    assert.ok(step, "Expected elf_packer step in protection metadata");
    assert.strictEqual(step.ok, true, "Expected elf_packer step to be ok");
    await runRelease({ releaseDir: res.releaseDir, buildId: res.buildId, runTimeoutMs: ctx.runTimeoutMs });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_ELF_PACKERS_E2E !== "1") {
    log("SKIP: set SEAL_ELF_PACKERS_E2E=1 to run ELF packer tests");
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 0 : 1);
  }

  const prevChunk = process.env.SEAL_THIN_CHUNK_SIZE;
  const prevZstd = process.env.SEAL_THIN_ZSTD_LEVEL;
  const prevZstdTimeout = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
  process.env.SEAL_THIN_CHUNK_SIZE = process.env.SEAL_THIN_CHUNK_SIZE || "8388608";
  process.env.SEAL_THIN_ZSTD_LEVEL = process.env.SEAL_THIN_ZSTD_LEVEL || "1";
  process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS || "120000";

  const buildTimeoutMs = Number(process.env.SEAL_ELF_PACKERS_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_ELF_PACKERS_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_ELF_PACKERS_E2E_TIMEOUT_MS || "240000");
  const ctx = { buildTimeoutMs, runTimeoutMs };

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

  const packers = [
    {
      id: "upx",
      name: "UPX",
      cmdEnv: "SEAL_UPX_CMD",
      argsEnv: "SEAL_UPX_ARGS",
      skipEnv: "SEAL_UPX_SKIP",
      defaultCmd: "upx",
      defaultArgs: [],
    },
    {
      id: "kiteshield",
      name: "Kiteshield",
      cmdEnv: "SEAL_KITESHIELD_CMD",
      argsEnv: "SEAL_KITESHIELD_ARGS",
      skipEnv: "SEAL_KITESHIELD_SKIP",
      defaultCmd: "kiteshield",
      defaultArgs: ["-n", "{in}", "{out}"],
    },
    {
      id: "midgetpack",
      name: "MidgetPack",
      cmdEnv: "SEAL_MIDGETPACK_CMD",
      argsEnv: "SEAL_MIDGETPACK_ARGS",
      skipEnv: "SEAL_MIDGETPACK_SKIP",
      defaultCmd: "midgetpack",
      defaultArgs: ["-P", "seal-test", "-o", "{out}", "{in}"],
    },
  ];

  const tests = packers.map((spec) => () => testElfPacker(ctx, spec));

  let failures = 0;
  try {
    for (const t of tests) {
      try {
        await withTimeout(t.name || "packerTest", testTimeoutMs, () => t());
      } catch (e) {
        failures += 1;
        fail(`${t.name || "packerTest"}: ${e.message || e}`);
      }
    }
  } finally {
    if (prevChunk === undefined) delete process.env.SEAL_THIN_CHUNK_SIZE;
    else process.env.SEAL_THIN_CHUNK_SIZE = prevChunk;
    if (prevZstd === undefined) delete process.env.SEAL_THIN_ZSTD_LEVEL;
    else process.env.SEAL_THIN_ZSTD_LEVEL = prevZstd;
    if (prevZstdTimeout === undefined) delete process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
    else process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = prevZstdTimeout;
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
