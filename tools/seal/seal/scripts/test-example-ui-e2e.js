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
} = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

const EXAMPLE_ROOT = resolveExampleRoot();

const { log, fail } = createLogger("ui-e2e");

function ensureDir(dir) {
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
}

function resolveArtifactsDir() {
  const envDir = process.env.SEAL_UI_E2E_ARTIFACTS;
  if (envDir === "0") return null;
  if (envDir) return path.resolve(envDir);
  if (process.env.SEAL_E2E_LOG_DIR) {
    return path.join(process.env.SEAL_E2E_LOG_DIR, "ui-e2e");
  }
  return path.join(os.tmpdir(), `seal-ui-e2e-${process.pid}`);
}

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
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

function resolveCompilerCmd(projectCfg, launcherObfuscation) {
  const cObf = projectCfg.build?.protection?.cObfuscator;
  if (launcherObfuscation && cObf && cObf.cmd) return String(cObf.cmd);
  if (hasCommand("cc")) return "cc";
  if (hasCommand("gcc")) return "gcc";
  return null;
}

async function buildThinRelease(buildTimeoutMs) {
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

  const packager = "thin-split";
  targetCfg.packager = packager;

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-ui-split-"));
  const outDir = path.join(outRoot, "seal-out");

  const res = await withTimeout("buildRelease(split)", buildTimeoutMs, () =>
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
  cfg.http.port = port || 3000;
  cfg.external = cfg.external || {};
  cfg.external.echoUrl = `http://127.0.0.1:${port}/healthz`;
  cfg.external.timeoutMs = 1500;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runUiTest({ url, buildId, headless, artifactsDir, captureTrace }) {
  let playwright;
  try {
    playwright = require("playwright");
  } catch {
    throw new Error("Missing dependency: playwright. Install: npm --prefix tools/seal/seal install -D playwright && npx playwright install");
  }

  const browser = await playwright.chromium.launch({ headless });
  let context;
  let page;
  const consoleLogs = [];
  const pageErrors = [];
  const requestFailures = [];
  let traceSaved = false;
  try {
    context = await browser.newContext();
    if (captureTrace) {
      await context.tracing.start({ screenshots: true, snapshots: true });
    }
    page = await context.newPage();
    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      pageErrors.push(err && err.stack ? err.stack : String(err));
    });
    page.on("requestfailed", (req) => {
      const failure = req.failure();
      requestFailures.push(`${req.method()} ${req.url()} ${failure ? failure.errorText : "request failed"}`);
    });

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
  } catch (err) {
    if (artifactsDir) {
      ensureDir(artifactsDir);
      const prefix = path.join(artifactsDir, `ui-${Date.now()}-${process.pid}`);
      if (page) {
        try {
          await page.screenshot({ path: `${prefix}.png`, fullPage: true });
        } catch {
          // ignore
        }
        try {
          const html = await page.content();
          fs.writeFileSync(`${prefix}.html`, html, "utf-8");
        } catch {
          // ignore
        }
      }
      if (consoleLogs.length) {
        fs.writeFileSync(`${prefix}.console.log`, consoleLogs.join("\n"), "utf-8");
      }
      if (pageErrors.length) {
        fs.writeFileSync(`${prefix}.pageerror.log`, pageErrors.join("\n"), "utf-8");
      }
      if (requestFailures.length) {
        fs.writeFileSync(`${prefix}.request-fail.log`, requestFailures.join("\n"), "utf-8");
      }
      if (captureTrace && context) {
        try {
          await context.tracing.stop({ path: `${prefix}.trace.zip` });
          traceSaved = true;
        } catch {
          // ignore
        }
      }
      log(`UI artifacts saved: ${artifactsDir}`);
    }
    throw err;
  } finally {
    if (captureTrace && context && !traceSaved) {
      try {
        await context.tracing.stop();
      } catch {
        // ignore
      }
    }
    await browser.close();
  }
}

async function testUi(ctx) {
  log("Building thin SPLIT...");
  const res = await buildThinRelease(ctx.buildTimeoutMs);
  const { releaseDir, buildId, outRoot } = res;

  try {
    if (testUi.skipListen) {
      log("SKIP: listen not permitted; UI runtime check disabled");
      return;
    }
    log("Running sealed binary...");
    const binPath = path.join(releaseDir, "seal-example");
    assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);
    await withSealedBinary({
      label: "ui",
      releaseDir,
      binPath,
      runTimeoutMs: ctx.runTimeoutMs,
      skipListen: testUi.skipListen === true,
      writeRuntimeConfig,
      log,
      captureOutput: true,
    }, async ({ port, readyFile }) => {
      if (readyFile || port === null) {
        log("SKIP: UI runtime check disabled (ready-file mode)");
        return;
      }
      const url = `http://127.0.0.1:${port}/`;
      await withTimeout("uiSmoke", ctx.uiTimeoutMs, () =>
        runUiTest({
          url,
          buildId,
          headless: ctx.headless,
          artifactsDir: ctx.artifactsDir,
          captureTrace: ctx.captureTrace,
        })
      );
    });
  } finally {
    if (!ctx.keepArtifacts) fs.rmSync(outRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.env.SEAL_UI_E2E !== "1") {
    log("SKIP: set SEAL_UI_E2E=1 to run UI E2E tests");
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
      testUi.skipListen = true;
      log("SKIP: cannot listen on localhost (EPERM); UI requires HTTP");
    } else {
      throw e;
    }
  }

  const buildTimeoutMs = resolveE2ETimeout("SEAL_UI_E2E_BUILD_TIMEOUT_MS", 180000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_UI_E2E_RUN_TIMEOUT_MS", 15000);
  const uiTimeoutMs = resolveE2ERunTimeout("SEAL_UI_E2E_UI_TIMEOUT_MS", 20000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_UI_E2E_TIMEOUT_MS", 240000);
  const headless = process.env.SEAL_UI_E2E_HEADLESS !== "0";
  const keepArtifacts = process.env.SEAL_UI_E2E_KEEP === "1";
  const artifactsDir = resolveArtifactsDir();
  const captureTrace = process.env.SEAL_UI_E2E_TRACE !== "0";
  const ctx = { buildTimeoutMs, runTimeoutMs, uiTimeoutMs, headless, keepArtifacts, artifactsDir, captureTrace };

  await withTimeout("testUi", testTimeoutMs, () => testUi(ctx));
  log("OK: ui-e2e");
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
