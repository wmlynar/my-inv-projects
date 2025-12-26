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
  process.stdout.write(`[ui-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[ui-e2e] ERROR: ${msg}\n`);
}

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
}

function hasCommand(cmd) {
  const res = runCmd("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`]);
  return res.status === 0;
}

function probeCompilerFlag(cmd, flag) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-cc-flag-"));
  const srcPath = path.join(tmpDir, "flag-test.c");
  const outPath = path.join(tmpDir, "flag-test.o");
  fs.writeFileSync(srcPath, "int main(void){return 0;}\n", "utf-8");
  const res = runCmd(cmd, [flag, "-c", srcPath, "-o", outPath], 8000);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return res;
}

function checkPrereqs() {
  if (process.platform !== "linux") {
    log(`SKIP: thin packager test is linux-only (platform=${process.platform})`);
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

function resolveCompilerCmd(projectCfg, launcherObfuscation) {
  const cObf = projectCfg.build?.protection?.cObfuscator;
  if (launcherObfuscation && cObf && cObf.cmd) return String(cObf.cmd);
  if (hasCommand("cc")) return "cc";
  if (hasCommand("gcc")) return "gcc";
  return null;
}

async function buildThinRelease(mode, buildTimeoutMs) {
  const projectCfg = loadProjectConfig(EXAMPLE_ROOT);
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {});
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  const cObfCmd = projectCfg.build?.protection?.cObfuscator?.cmd;
  if (projectCfg.build.thin.launcherObfuscation !== false && cObfCmd && !hasCommand(cObfCmd)) {
    log(`C obfuscator not available (${cObfCmd}); disabling launcherObfuscation for test`);
    projectCfg.build.thin.launcherObfuscation = false;
  }

  const launcherObfuscation = projectCfg.build.thin.launcherObfuscation !== false;
  const compilerCmd = resolveCompilerCmd(projectCfg, launcherObfuscation);
  if (!compilerCmd) {
    throw new Error("Missing C compiler (cc/gcc) or cObfuscator cmd");
  }

  if (projectCfg.build.thin.launcherHardeningCET !== false) {
    const probe = probeCompilerFlag(compilerCmd, "-fcf-protection=full");
    if (probe.status !== 0) {
      const msg = (probe.stderr || probe.stdout || "").toString().trim();
      const short = msg.split(/\r?\n/).filter(Boolean).slice(0, 2).join(" | ");
      if (process.env.SEAL_UI_E2E_REQUIRE_CET === "1") {
        throw new Error(`CET flag unsupported by ${compilerCmd}: ${short || "unknown error"}`);
      }
      log(`CET unsupported by ${compilerCmd}; disabling build.thin.launcherHardeningCET for test`);
      projectCfg.build.thin.launcherHardeningCET = false;
    }
  }

  const integrityCfg = projectCfg.build.thin?.integrity;
  const integrityEnabled = integrityCfg === true || (integrityCfg && typeof integrityCfg === "object" && integrityCfg.enabled === true);
  const integrityModeRaw = integrityCfg && typeof integrityCfg === "object" && integrityCfg.mode ? String(integrityCfg.mode).toLowerCase() : "inline";
  const integrityMode = integrityModeRaw === "sidecar" ? "sidecar" : "inline";
  if (integrityEnabled && integrityMode === "inline" && projectCfg.build.protection?.elfPacker?.tool) {
    log("Integrity inline + ELF packer is incompatible; disabling elfPacker for test");
    projectCfg.build.protection.elfPacker = {};
  }
  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const packager = mode === "single" ? "thin-single" : "thin-split";
  targetCfg.packager = packager;

  if (packager === "thin-single") {
    projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, {
      strip: Object.assign({}, projectCfg.build.protection?.strip || {}, { enabled: false }),
      elfPacker: Object.assign({}, projectCfg.build.protection?.elfPacker || {}, { tool: null, cmd: null, args: null }),
    });
    projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {}, {
      integrity: { enabled: false },
    });
  }

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), `seal-ui-${mode}-`));
  const outDir = path.join(outRoot, "seal-out");

  const res = await withTimeout(`buildRelease(${mode})`, buildTimeoutMs, () =>
    buildRelease({
      projectRoot: EXAMPLE_ROOT,
      projectCfg,
      targetCfg,
      configName,
      packagerOverride: packager,
      outDirOverride: outDir,
    })
  );

  return { ...res, outRoot, outDir };
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port;
  cfg.external = cfg.external || {};
  cfg.external.echoUrl = `http://127.0.0.1:${port}/healthz`;
  cfg.external.timeoutMs = 1500;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runRelease({ releaseDir, buildId, runTimeoutMs }) {
  if (runRelease.skipListen) {
    log("SKIP: listen not permitted; UI runtime check disabled");
    return { skipped: true };
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

  let status;
  try {
    status = await withTimeout("waitForStatus", runTimeoutMs, () => waitForStatus(port));
    if (exitErr) throw exitErr;
  } catch (e) {
    child.kill("SIGTERM");
    throw e;
  }

  return { port, child, status };
}

async function runUiTest({ url, buildId, headless }) {
  let playwright;
  try {
    playwright = require("playwright");
  } catch {
    throw new Error("Missing dependency: playwright. Install: npm --prefix tools/seal/seal install -D playwright && npx playwright install");
  }

  const browser = await playwright.chromium.launch({ headless });
  let page;
  try {
    page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await page.waitForSelector("#status", { timeout: 10_000 });

    await page.waitForFunction(
      (expectedBuildId) => {
        const el = document.querySelector("#status");
        if (!el) return false;
        const txt = el.textContent || "";
        return txt.includes('"appName": "seal-example"') && txt.includes(expectedBuildId);
      },
      buildId,
      { timeout: 10_000 }
    );

    await page.fill("#md5Input", "abc");
    await page.click("#btnMd5");
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#md5Out");
        return el && (el.textContent || "").includes("900150983cd24fb0d6963f7d28e17f72");
      },
      { timeout: 10_000 }
    );

    await page.click("#btnExternal");
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#externalOut");
        return el && (el.textContent || "").includes('"ok": true');
      },
      { timeout: 10_000 }
    );
  } finally {
    await browser.close();
  }
}

async function testUi(ctx) {
  log(`Building thin ${ctx.mode.toUpperCase()}...`);
  const res = await buildThinRelease(ctx.mode, ctx.buildTimeoutMs);
  const { releaseDir, buildId, outRoot } = res;

  log("Running sealed binary...");
  const runRes = await runRelease({ releaseDir, buildId, runTimeoutMs: ctx.runTimeoutMs });
  if (!runRes || runRes.skipped) {
    log("SKIP: sealed runtime check disabled");
    fs.rmSync(outRoot, { recursive: true, force: true });
    return;
  }

  const { port, child } = runRes;
  const url = `http://127.0.0.1:${port}/`;

  try {
    await withTimeout("uiSmoke", ctx.uiTimeoutMs, () =>
      runUiTest({ url, buildId, headless: ctx.headless })
    );
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
    if (!ctx.keepArtifacts) fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_UI_E2E !== "1") {
    log("SKIP: set SEAL_UI_E2E=1 to run UI E2E tests");
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

  const buildTimeoutMs = Number(process.env.SEAL_UI_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_UI_E2E_RUN_TIMEOUT_MS || "15000");
  const uiTimeoutMs = Number(process.env.SEAL_UI_E2E_UI_TIMEOUT_MS || "20000");
  const testTimeoutMs = Number(process.env.SEAL_UI_E2E_TIMEOUT_MS || "240000");
  const headless = process.env.SEAL_UI_E2E_HEADLESS !== "0";
  const keepArtifacts = process.env.SEAL_UI_E2E_KEEP === "1";
  const modeRaw = String(process.env.SEAL_UI_E2E_MODE || "split").toLowerCase();
  const mode = modeRaw === "single" ? "single" : "split";

  const ctx = { buildTimeoutMs, runTimeoutMs, uiTimeoutMs, headless, keepArtifacts, mode };

  await withTimeout("testUi", testTimeoutMs, () => testUi(ctx));
  log("OK: ui-e2e");
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
