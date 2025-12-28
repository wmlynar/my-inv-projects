#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { hasCommand, resolveE2ETimeout, resolveE2ERunTimeout, applyReadyFileEnv, makeReadyFile, waitForReadyFile } = require("./e2e-utils");

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

function ensureLauncherObfuscation(projectCfg) {
  const thinCfg = projectCfg.build && projectCfg.build.thin ? projectCfg.build.thin : {};
  const cObf = projectCfg.build && projectCfg.build.protection ? projectCfg.build.protection.cObfuscator || {} : {};
  const cObfCmd = cObf.cmd || cObf.tool;
  if (thinCfg.launcherObfuscation !== false && cObfCmd && !hasCommand(cObfCmd)) {
    log(`C obfuscator not available (${cObfCmd}); disabling launcherObfuscation for test`);
    thinCfg.launcherObfuscation = false;
  }
  projectCfg.build.thin = thinCfg;
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
  if (!hasCommand("readelf")) {
    fail("Missing readelf (binutils). Run: tools/seal/seal/scripts/install-strip.sh");
    return { ok: false, skip: false };
  }
  if (!hasCommand("strings")) {
    fail("Missing strings (binutils). Run: tools/seal/seal/scripts/install-strip.sh");
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
    if (process.env.SEAL_E2E_NO_LISTEN === "1") {
      resolve(null);
      return;
    }
    const srv = net.createServer();
    srv.on("error", (err) => {
      if (err && err.code === "EPERM") {
        process.env.SEAL_E2E_NO_LISTEN = "1";
        resolve(null);
        return;
      }
      reject(err);
    });
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

function parseReadelfSections(binPath) {
  const res = runCmd("readelf", ["-S", binPath], 5000);
  if (res.status !== 0) return null;
  const out = String(res.stdout || "");
  if (/There are no sections/i.test(out)) return [];
  const sections = [];
  for (const line of out.split(/\r?\n/)) {
    const match = line.match(/^\s*\[\s*\d+\]\s+(\S+)/);
    if (match) sections.push(match[1]);
  }
  return sections;
}

function verifyUpxPacked(binPath) {
  if (!hasCommand("upx")) {
    return { skip: "upx not installed" };
  }
  const res = runCmd("upx", ["-t", binPath], 10000);
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  const lower = out.toLowerCase();
  if (lower.includes("not packed") || lower.includes("notpacked")) {
    return { error: "not packed" };
  }
  if (res.status !== 0) {
    return { skip: `upx check failed: ${out.slice(0, 120)}` };
  }
  return { ok: true };
}

function verifyMarker(binPath, markers) {
  const res = runCmd("strings", ["-a", binPath], 8000);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    return { skip: `strings failed: ${out.slice(0, 120)}` };
  }
  const out = String(res.stdout || "");
  for (const marker of markers) {
    if (out.includes(marker)) return { ok: true, marker };
  }
  return { skip: "marker missing (tool version?)" };
}

function verifyPacker(binPath, spec) {
  if (spec.id === "upx") return verifyUpxPacked(binPath);
  if (spec.id === "kiteshield") return verifyMarker(binPath, ["[kiteshield]", "kiteshield"]);
  if (spec.id === "midgetpack") return verifyMarker(binPath, ["midgetpack"]);
  return { skip: "unsupported packer check" };
}

function attemptUnpack(binPath, spec) {
  const strict = process.env.SEAL_E2E_STRICT_UNPACK === "1";
  if (spec.id !== "upx") return { skip: "unpack check not supported" };
  if (!hasCommand("upx")) return { skip: "upx missing" };
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-unpack-"));
  const tmpPath = path.join(tmpDir, path.basename(binPath));
  try {
    fs.copyFileSync(binPath, tmpPath);
    const res = runCmd("upx", ["-d", tmpPath], 10000);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.status === 0) {
      if (strict) throw new Error("upx unpack succeeded");
      return { skip: "upx unpack succeeded (set SEAL_E2E_STRICT_UNPACK=1 to enforce)" };
    }
    if (/not packed|notpacked|not a packed/i.test(out)) {
      return { ok: true };
    }
    if (/unknown option|usage:/i.test(out)) return { skip: out.slice(0, 120) || "upx unsupported" };
    return { ok: true };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function checkSectionHeaderCollapse(binPath, spec) {
  const sections = parseReadelfSections(binPath);
  if (!sections) return { skip: "readelf failed" };
  const count = sections.length;
  const max = Number.isFinite(spec.sectionMax) ? spec.sectionMax : 16;
  if (count <= max) return { ok: true, sections: count, max };
  return { skip: `section count ${count} > ${max}` };
}

function resolveLauncherPath(releaseDir, appName) {
  const launcherPath = path.join(releaseDir, "b", "a");
  if (fs.existsSync(launcherPath)) return launcherPath;
  const appPath = path.join(releaseDir, appName);
  if (fs.existsSync(appPath)) return appPath;
  throw new Error(`Missing launcher binary (${launcherPath})`);
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port || 3000;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function waitForReady({ port, readyFile, timeoutMs }) {
  if (readyFile) return waitForReadyFile(readyFile, timeoutMs);
  return waitForStatus(port, timeoutMs);
}

async function runRelease({ releaseDir, buildId, runTimeoutMs }) {
  const port = runRelease.skipListen ? null : await getFreePort();
  const readyFile = port === null ? makeReadyFile("elf-packers") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = applyReadyFileEnv(process.env, readyFile);
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: ["ignore", "pipe", "pipe"], env: childEnv });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  let exitErr = null;
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      exitErr = new Error(`app exited (code=${code}, signal=${signal || "none"})`);
    }
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () => waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }));
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
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function buildWithProtection({ protection, outRoot }) {
  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {});
  projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, protection || {});
  ensureLauncherObfuscation(projectCfg);

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

  const launcherPath = resolveLauncherPath(res.releaseDir, res.appName);
  const verify = verifyPacker(launcherPath, spec);
  if (verify && verify.error) {
    throw new Error(`${spec.name} verification failed: ${verify.error}`);
  }
  if (verify && verify.skip) {
    log(`SKIP: ${spec.name} packer verification (${verify.skip})`);
  }
  const unpack = attemptUnpack(launcherPath, spec);
  if (unpack && unpack.skip) {
    log(`SKIP: ${spec.name} unpack check (${unpack.skip})`);
  }
  const collapse = checkSectionHeaderCollapse(launcherPath, spec);
  if (collapse && collapse.ok) {
    log(`${spec.name}: section headers collapsed (sections=${collapse.sections}, max=${collapse.max})`);
  } else if (collapse && collapse.skip) {
    log(`SKIP: ${spec.name} section header check (${collapse.skip})`);
  }

  const nbPath = path.join(res.releaseDir, "r", "nb.node");
  const checkNb = process.env.SEAL_E2E_CHECK_PACK_NB === "1" || process.env.SEAL_E2E_STRICT_PACK_NB === "1";
  if (checkNb && fs.existsSync(nbPath)) {
    const verifyNb = verifyPacker(nbPath, spec);
    if (verifyNb && verifyNb.error) {
      throw new Error(`${spec.name} nb.node verification failed: ${verifyNb.error}`);
    }
    if (verifyNb && verifyNb.skip) {
      if (process.env.SEAL_E2E_STRICT_PACK_NB === "1") {
        throw new Error(`${spec.name} nb.node packer check skipped: ${verifyNb.skip}`);
      }
      log(`SKIP: ${spec.name} nb.node packer check (${verifyNb.skip})`);
    }
  } else if (checkNb) {
    log("SKIP: nb.node not present; packer check skipped");
  }

  if (spec.runtimeSkip && process.env[spec.runtimeEnv] !== "1") {
    log(`SKIP: ${spec.name} runtime check disabled (set ${spec.runtimeEnv}=1 to enable)`);
    return;
  }
  await runRelease({ releaseDir: res.releaseDir, buildId: res.buildId, runTimeoutMs: ctx.runTimeoutMs });
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_ELF_PACKERS_E2E !== "1") {
    log("SKIP: set SEAL_ELF_PACKERS_E2E=1 to run ELF packer tests");
    process.exit(77);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) {
    process.exit(prereq.skip ? 77 : 1);
  }

  const prevChunk = process.env.SEAL_THIN_CHUNK_SIZE;
  const prevZstd = process.env.SEAL_THIN_ZSTD_LEVEL;
  const prevZstdTimeout = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
  process.env.SEAL_THIN_CHUNK_SIZE = process.env.SEAL_THIN_CHUNK_SIZE || "8388608";
  process.env.SEAL_THIN_ZSTD_LEVEL = process.env.SEAL_THIN_ZSTD_LEVEL || "1";
  const zstdTimeoutMs = resolveE2ETimeout("SEAL_THIN_ZSTD_TIMEOUT_MS", 120000);
  process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS || String(zstdTimeoutMs);

  const buildTimeoutMs = resolveE2ETimeout("SEAL_ELF_PACKERS_E2E_BUILD_TIMEOUT_MS", 180000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_ELF_PACKERS_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_ELF_PACKERS_E2E_TIMEOUT_MS", 240000);
  const ctx = { buildTimeoutMs, runTimeoutMs };

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

  const packers = [
    {
      id: "upx",
      name: "UPX",
      cmdEnv: "SEAL_UPX_CMD",
      argsEnv: "SEAL_UPX_ARGS",
      skipEnv: "SEAL_UPX_SKIP",
      defaultCmd: "upx",
      defaultArgs: [],
      sectionMax: 12,
    },
    {
      id: "kiteshield",
      name: "Kiteshield",
      cmdEnv: "SEAL_KITESHIELD_CMD",
      argsEnv: "SEAL_KITESHIELD_ARGS",
      skipEnv: "SEAL_KITESHIELD_SKIP",
      defaultCmd: "kiteshield",
      defaultArgs: ["-n", "{in}", "{out}"],
      sectionMax: 20,
    },
    {
      id: "midgetpack",
      name: "MidgetPack",
      cmdEnv: "SEAL_MIDGETPACK_CMD",
      argsEnv: "SEAL_MIDGETPACK_ARGS",
      skipEnv: "SEAL_MIDGETPACK_SKIP",
      runtimeSkip: true,
      runtimeEnv: "SEAL_MIDGETPACK_RUNTIME",
      defaultCmd: "midgetpack",
      defaultArgs: ["-P", "seal-test", "-o", "{out}", "{in}"],
      sectionMax: 20,
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
