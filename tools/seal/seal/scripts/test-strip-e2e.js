#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { hasCommand } = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");

function log(msg) {
  process.stdout.write(`[strip-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[strip-e2e] ERROR: ${msg}\n`);
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
    log(`SKIP: strip E2E is linux-only (platform=${process.platform})`);
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
  if (!hasCommand("nm")) {
    fail("Missing nm (binutils). Run: tools/seal/seal/scripts/install-strip.sh");
    return { ok: false, skip: false };
  }
  if (!hasCommand("strings")) {
    fail("Missing strings (binutils). Run: tools/seal/seal/scripts/install-strip.sh");
    return { ok: false, skip: false };
  }
  if (!hasCommand("strip")) {
    fail("Missing strip (binutils). Run: tools/seal/seal/scripts/install-strip.sh");
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
  const maxLog = 16000;
  const logs = { out: "", err: "" };
  const append = (prev, chunk) => {
    const next = prev + chunk.toString("utf8");
    return next.length > maxLog ? next.slice(-maxLog) : next;
  };
  child.stdout.on("data", (c) => { logs.out = append(logs.out, c); });
  child.stderr.on("data", (c) => { logs.err = append(logs.err, c); });
  let done = false;
  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      if (done) return;
      reject(new Error(`app exited (code=${code ?? "null"}, signal=${signal || "none"})`));
    });
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([
      waitForStatus(port),
      exitPromise,
    ]));
  } catch (err) {
    const out = logs.out ? `\n--- stdout ---\n${logs.out}` : "";
    const errOut = logs.err ? `\n--- stderr ---\n${logs.err}` : "";
    const msg = `${err && err.message ? err.message : err}${out}${errOut}`;
    throw new Error(msg);
  } finally {
    done = true;
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

function assertNoDebugSections(binPath) {
  const sections = parseReadelfSections(binPath);
  if (!sections) {
    throw new Error("readelf -S failed on launcher (expected ELF)");
  }
  const forbidden = [".symtab", ".strtab", ".comment"];
  const hits = sections.filter((name) => name.startsWith(".debug_") || forbidden.includes(name));
  if (hits.length > 0) {
    throw new Error(`Unexpected debug/symbol sections after strip: ${hits.join(", ")}`);
  }
}

function assertNmStripped(binPath) {
  const res = runCmd("nm", ["-a", binPath], 5000);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    throw new Error(`nm failed on launcher: ${out.slice(0, 200)}`);
  }
  const combined = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  if (combined && !/no symbols/i.test(combined)) {
    throw new Error(`Expected nm to report no symbols; got: ${combined.slice(0, 200)}`);
  }
}

function checkReadelfNotes(binPath) {
  const res = runCmd("readelf", ["-n", binPath], 5000);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    return { skip: out ? `readelf -n failed: ${out.slice(0, 120)}` : "readelf -n failed" };
  }
  const out = String(res.stdout || "");
  if (/Build ID/i.test(out)) {
    if (process.env.SEAL_E2E_STRICT_BUILD_ID === "1") {
      throw new Error("Build ID note present after strip");
    }
    return { skip: "Build ID note present (set SEAL_E2E_STRICT_BUILD_ID=1 to enforce)" };
  }
  return { ok: true };
}

function checkReadelfComment(binPath) {
  const res = runCmd("readelf", ["--string-dump=.comment", binPath], 5000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.status !== 0) {
    if (/no such section|not found/i.test(out)) return { ok: true };
    return { skip: out ? `readelf comment failed: ${out.slice(0, 120)}` : "readelf comment failed" };
  }
  if (/no strings found/i.test(out)) return { ok: true };
  if (/String dump of section '.comment'/i.test(out)) {
    const lines = out.split(/\r?\n/).filter((l) => /\b0x[0-9a-f]+\b/i.test(l) && /[\w\.\-]+/.test(l));
    if (lines.length > 0) {
      throw new Error("readelf .comment contains strings");
    }
  }
  return { ok: true };
}

function checkEuReadelfNotes(binPath) {
  if (!hasCommand("eu-readelf")) return { skip: "eu-readelf missing" };
  const res = runCmd("eu-readelf", ["-n", binPath], 5000);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    return { skip: out ? `eu-readelf -n failed: ${out.slice(0, 120)}` : "eu-readelf -n failed" };
  }
  const out = String(res.stdout || "");
  if (/Build ID/i.test(out)) {
    if (process.env.SEAL_E2E_STRICT_BUILD_ID === "1") {
      throw new Error("Build ID note present after strip (eu-readelf)");
    }
    return { skip: "Build ID note present (eu-readelf; set SEAL_E2E_STRICT_BUILD_ID=1 to enforce)" };
  }
  return { ok: true };
}

function resolveDwarfTool() {
  if (hasCommand("dwarfdump")) return "dwarfdump";
  if (hasCommand("llvm-dwarfdump")) return "llvm-dwarfdump";
  return null;
}

function checkDwarfInfo(binPath) {
  const tool = resolveDwarfTool();
  if (!tool) return { skip: "dwarfdump missing" };
  const res = runCmd(tool, [binPath], 8000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (/no debug info|no dwarf/i.test(out)) {
    return { ok: true };
  }
  if (res.status !== 0) {
    return { skip: out ? `${tool} failed: ${out.slice(0, 120)}` : `${tool} failed` };
  }
  if (out) {
    throw new Error(`DWARF info present (${tool})`);
  }
  return { ok: true };
}

function checkObjdumpHeaders(binPath) {
  if (!hasCommand("objdump")) return { skip: "objdump missing" };
  const res = runCmd("objdump", ["-h", binPath], 5000);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    return { skip: out ? `objdump failed: ${out.slice(0, 120)}` : "objdump failed" };
  }
  const out = String(res.stdout || "");
  const hits = out
    .split(/\r?\n/)
    .filter((line) => /\.debug_|\.symtab|\.strtab|\.comment/.test(line));
  if (hits.length > 0) {
    throw new Error(`objdump found debug/symbol sections: ${hits.slice(0, 3).join(" | ")}`);
  }
  return { ok: true };
}

function walkFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile()) out.push(full);
    }
  }
  return out;
}

function assertNoSourceMaps({ outDir, releaseDir }) {
  const mapFiles = walkFiles(releaseDir).filter((p) => p.endsWith(".map"));
  if (mapFiles.length > 0) {
    const sample = mapFiles.slice(0, 5).map((p) => path.relative(releaseDir, p)).join(", ");
    throw new Error(`Found sourcemaps in release: ${sample}`);
  }

  const bundlePath = path.join(outDir, "stage", "bundle.obf.cjs");
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Missing bundle.obf.cjs: ${bundlePath}`);
  }
  const bundleSrc = fs.readFileSync(bundlePath, "utf-8");
  if (bundleSrc.includes("sourceMappingURL=")) {
    throw new Error("Found sourceMappingURL in stage/bundle.obf.cjs");
  }

  const publicDir = path.join(releaseDir, "public");
  if (!fs.existsSync(publicDir)) return;
  const jsFiles = walkFiles(publicDir).filter((p) => /\.(cjs|mjs|js)$/.test(p));
  for (const filePath of jsFiles) {
    const src = fs.readFileSync(filePath, "utf-8");
    if (src.includes("sourceMappingURL=")) {
      throw new Error(`Found sourceMappingURL in ${path.relative(releaseDir, filePath)}`);
    }
  }
}

const LEAK_DENYLIST = [
  "startup.config_missing",
  "/api/status",
  "/api/md5",
  "/api/external/ping",
  "runObfChecks",
  "externalEcho",
  "require(",
  "/home/",
  "/root/",
  "/build/",
  "/workspace/",
  "__FILE__",
];

function readDenylist(appName) {
  const list = LEAK_DENYLIST.slice();
  if (appName) list.push(String(appName));
  const extra = process.env.SEAL_ANTI_DISASM_STRINGS_DENYLIST;
  if (extra) {
    for (const item of extra.split(",")) {
      const trimmed = item.trim();
      if (trimmed) list.push(trimmed);
    }
  }
  return Array.from(new Set(list));
}

function scanStringsForDenylist(filePath, denylist) {
  const res = runCmd("strings", ["-a", filePath], 8000);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    throw new Error(`strings failed for ${filePath}: ${out.slice(0, 200)}`);
  }
  const out = String(res.stdout || "");
  return denylist.filter((needle) => out.includes(needle));
}

function assertNoStringLeaks({ releaseDir, appName }) {
  const launcherPath = path.join(releaseDir, "b", "a");
  const runtimePath = path.join(releaseDir, "r", "rt");
  const payloadPath = path.join(releaseDir, "r", "pl");
  const targets = [launcherPath, runtimePath, payloadPath];
  for (const filePath of targets) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing thin container: ${filePath}`);
    }
  }
  const denylist = readDenylist(appName);
  const hits = [];
  for (const filePath of targets) {
    const found = scanStringsForDenylist(filePath, denylist);
    if (found.length > 0) {
      hits.push(`${path.relative(releaseDir, filePath)} => ${found.join(", ")}`);
    }
  }
  if (hits.length > 0) {
    throw new Error(`Plaintext leak detected in strings scan: ${hits.join("; ")}`);
  }
}

async function buildWithStrip({ outRoot, packager }) {
  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  projectCfg.build.thin = Object.assign({}, projectCfg.build.thin || {});
  projectCfg.build.protection = Object.assign({}, projectCfg.build.protection || {}, {
    strip: { enabled: true, cmd: "strip" },
    elfPacker: {},
  });
  ensureLauncherObfuscation(projectCfg);

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const outDir = path.join(outRoot, "seal-out");
  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: packager || "thin-split",
    outDirOverride: outDir,
  });

  const metaPath = path.join(res.outDir, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  return { ...res, meta };
}

function extractStripStep(res) {
  const steps = ((res.meta || {}).protection || {}).post?.steps || [];
  const stripStep = steps.find((s) => s.step === "strip");
  assert.ok(stripStep, "Missing strip step in meta");
  return stripStep;
}

async function testStripMetadataThinSplit(res) {
  const stripStep = extractStripStep(res);
  if (!stripStep.ok) {
    throw new Error(`strip step not OK: ${JSON.stringify(stripStep)}`);
  }

  const launcherPath = path.join(res.releaseDir, "b", "a");
  const binPath = fs.existsSync(launcherPath)
    ? launcherPath
    : path.join(res.releaseDir, "seal-example");
  assertNoDebugSections(binPath);
  assertNmStripped(binPath);
  const noteRes = checkReadelfNotes(binPath);
  if (noteRes && noteRes.skip) log(`SKIP: readelf notes (${noteRes.skip})`);
  const noteEu = checkEuReadelfNotes(binPath);
  if (noteEu && noteEu.skip) log(`SKIP: eu-readelf notes (${noteEu.skip})`);
  const commentRes = checkReadelfComment(binPath);
  if (commentRes && commentRes.skip) log(`SKIP: readelf comment (${commentRes.skip})`);
  const dwarfRes = checkDwarfInfo(binPath);
  if (dwarfRes && dwarfRes.skip) log(`SKIP: DWARF check (${dwarfRes.skip})`);
  const objdumpRes = checkObjdumpHeaders(binPath);
  if (objdumpRes && objdumpRes.skip) log(`SKIP: objdump headers (${objdumpRes.skip})`);
  assertNoSourceMaps({ outDir: res.outDir, releaseDir: res.releaseDir });
  assertNoStringLeaks({ releaseDir: res.releaseDir, appName: res.appName });
}

async function testStripRuntime(res, ctx) {
  await runRelease({ releaseDir: res.releaseDir, runTimeoutMs: ctx.runTimeoutMs });
}

async function expectBuildFailure(label, fn, match) {
  try {
    await fn();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (match && !msg.includes(match)) {
      throw new Error(`${label}: expected error to include "${match}", got: ${msg}`);
    }
    return;
  }
  throw new Error(`${label}: expected build to fail`);
}

async function main() {
  if (process.env.SEAL_STRIP_E2E !== "1") {
    log("SKIP: set SEAL_STRIP_E2E=1 to run strip E2E tests");
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) process.exit(prereq.skip ? 0 : 1);

  const prevPath = process.env.PATH;
  const binCandidates = [
    path.resolve(__dirname, "..", "node_modules", ".bin"),
    path.resolve(__dirname, "..", "..", "node_modules", ".bin"),
  ];
  for (const binPath of binCandidates) {
    if (fs.existsSync(binPath) && !process.env.PATH.split(path.delimiter).includes(binPath)) {
      process.env.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;
    }
  }

  const prevChunk = process.env.SEAL_THIN_CHUNK_SIZE;
  const prevZstd = process.env.SEAL_THIN_ZSTD_LEVEL;
  const prevZstdTimeout = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
  process.env.SEAL_THIN_CHUNK_SIZE = process.env.SEAL_THIN_CHUNK_SIZE || "8388608";
  process.env.SEAL_THIN_ZSTD_LEVEL = process.env.SEAL_THIN_ZSTD_LEVEL || "1";
  process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = process.env.SEAL_THIN_ZSTD_TIMEOUT_MS || "120000";

  const buildTimeoutMs = Number(process.env.SEAL_STRIP_E2E_BUILD_TIMEOUT_MS || "180000");
  const runTimeoutMs = Number(process.env.SEAL_STRIP_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_STRIP_E2E_TIMEOUT_MS || "240000");
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

  if (process.env.SEAL_STRIP_E2E_SKIP_RUN === "1") {
    runRelease.skipListen = true;
    log("SKIP: runtime check disabled by SEAL_STRIP_E2E_SKIP_RUN");
  }

  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-strip-"));
  let failures = 0;
  try {
    log("Building thin-split with strip enabled...");
    const thinSplitRes = await withTimeout("buildRelease(strip-thin-split)", buildTimeoutMs, () =>
      buildWithStrip({ outRoot, packager: "thin-split" })
    );
    await withTimeout("testStripMetadataThinSplit", testTimeoutMs, () => testStripMetadataThinSplit(thinSplitRes));
    log("OK: testStripMetadataThinSplit");
    if (!runRelease.skipListen) {
      await withTimeout("testStripRuntime(thin-split)", testTimeoutMs, () => testStripRuntime(thinSplitRes, ctx));
      log("OK: testStripRuntime(thin-split)");
    } else {
      log("SKIP: testStripRuntime(thin-split) (listen not permitted)");
    }

    if (!hasCommand("postject")) {
      log("SKIP: postject not available; SEA strip test disabled");
    } else {
      log("Building SEA with strip enabled (expect error)...");
      await withTimeout("buildRelease(strip-sea)", buildTimeoutMs, () =>
        expectBuildFailure(
          "sea",
          () => buildWithStrip({ outRoot, packager: "sea" }),
          "SEA"
        )
      );
      log("OK: SEA strip rejected");
    }
  } catch (e) {
    failures += 1;
    fail(e.message || e);
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
    if (prevChunk === undefined) delete process.env.SEAL_THIN_CHUNK_SIZE;
    else process.env.SEAL_THIN_CHUNK_SIZE = prevChunk;
    if (prevZstd === undefined) delete process.env.SEAL_THIN_ZSTD_LEVEL;
    else process.env.SEAL_THIN_ZSTD_LEVEL = prevZstd;
    if (prevZstdTimeout === undefined) delete process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
    else process.env.SEAL_THIN_ZSTD_TIMEOUT_MS = prevZstdTimeout;
    process.env.PATH = prevPath;
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
