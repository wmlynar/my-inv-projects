#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const { loadManifest } = require("./e2e-manifest");
const { detectCapabilities } = require("./e2e-capabilities");
const {
  resolveJsonSummaryPath,
  ensureSummaryFile,
  parseSummaryRows,
  listFailedTests,
  buildPlan,
  printPlan,
  buildJsonSummary,
  writeJsonSummary,
} = require("./e2e-report");
const { hasCommand } = require("./e2e-utils");
const { parseList, makeRunId, formatDuration } = require("./e2e-runner-utils");

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const SKIP_CODE = 77;

function log(msg) {
  process.stdout.write(`[seal-e2e] ${msg}\n`);
}

function ensureEscalation() {
  if (process.env.SEAL_E2E_ESCALATED === "1") {
    return;
  }
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  if (uid === 0) {
    process.env.SEAL_E2E_ESCALATED = "1";
    return;
  }
  if (!hasCommand("sudo")) {
    log("ERROR: escalation required but sudo not found.");
    process.exit(1);
  }
  const reexecArgs = ["-E", "env", "SEAL_E2E_ESCALATED=1", process.execPath, ...process.argv.slice(1)];
  const nonInteractive = spawnSync("sudo", ["-n", "true"], { stdio: "ignore" });
  if (nonInteractive.status === 0) {
    log("Escalating via sudo...");
    const res = spawnSync("sudo", reexecArgs, { stdio: "inherit" });
    process.exit(res.status === null ? 1 : res.status);
  }
  if (!process.stdin.isTTY) {
    log("ERROR: escalation required but no TTY; re-run with sudo or Codex escalation.");
    process.exit(1);
  }
  log("Escalation required; you may be prompted.");
  const auth = spawnSync("sudo", ["-v"], { stdio: "inherit" });
  if (auth.status !== 0) {
    process.exit(auth.status === null ? 1 : auth.status);
  }
  const res = spawnSync("sudo", reexecArgs, { stdio: "inherit" });
  process.exit(res.status === null ? 1 : res.status);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function dirHasFiles(dir) {
  try {
    return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

function setEnvDefault(env, key, value) {
  if (env[key] === undefined || env[key] === null || env[key] === "") {
    env[key] = value;
  }
}

function loadE2EConfig(env) {
  let cfg = env.SEAL_E2E_CONFIG || "";
  const defaultCfg = path.join(REPO_ROOT, ".seal", "e2e.env");
  const sampleCfg = path.join(SCRIPT_DIR, "e2e-config.env");
  if (!cfg) {
    if (fs.existsSync(defaultCfg)) {
      cfg = defaultCfg;
    } else if (fs.existsSync(sampleCfg)) {
      cfg = sampleCfg;
    }
  }
  if (!cfg) return;
  if (!fs.existsSync(cfg)) {
    log(`ERROR: SEAL_E2E_CONFIG points to missing file: ${cfg}`);
    process.exit(1);
  }
  try {
    fs.accessSync(cfg, fs.constants.R_OK);
  } catch {
    log(`ERROR: SEAL_E2E_CONFIG is not readable: ${cfg}`);
    process.exit(1);
  }
  log(`Loading E2E config: ${cfg}`);
  if (!hasCommand("bash")) {
    log("ERROR: bash not found; cannot load E2E config.");
    process.exit(1);
  }
  const configText = fs.readFileSync(cfg, "utf8");
  const vars = new Set();
  for (const line of configText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (match) vars.add(match[1]);
  }
  if (!vars.size) return;
  const cmd = `set -a; source ${shellQuote(cfg)}; env -0`;
  const res = spawnSync("bash", ["-lc", cmd], {
    env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (res.status !== 0) {
    log(`ERROR: failed to load E2E config (${cfg}).`);
    if (res.stderr) process.stderr.write(res.stderr);
    process.exit(1);
  }
  const out = res.stdout || "";
  const entries = out.split("\0").filter(Boolean);
  const nextEnv = {};
  for (const entry of entries) {
    const idx = entry.indexOf("=");
    if (idx === -1) continue;
    const key = entry.slice(0, idx);
    const value = entry.slice(idx + 1);
    nextEnv[key] = value;
  }
  for (const key of vars) {
    if (Object.prototype.hasOwnProperty.call(nextEnv, key)) {
      env[key] = nextEnv[key];
    }
  }
}

function runScript(scriptPath, env, args = []) {
  const res = spawnSync("bash", [scriptPath, ...args], { env, stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`Script failed (${path.basename(scriptPath)}): exit=${res.status}`);
  }
}

function npmInstall(dir, env) {
  if (!hasCommand("npm")) {
    throw new Error("npm not found in PATH.");
  }
  const args = fs.existsSync(path.join(dir, "package-lock.json")) ? ["ci"] : ["install"];
  const res = spawnSync("npm", args, { cwd: dir, env, stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`npm ${args.join(" ")} failed in ${dir}`);
  }
}

function hashInputs(files) {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    if (fs.existsSync(file)) {
      hash.update(`file:${file}\n`);
      hash.update(fs.readFileSync(file));
    } else {
      hash.update(`missing:${file}\n`);
    }
  }
  return hash.digest("hex");
}

function getCommandOutput(cmd, args = []) {
  if (!hasCommand(cmd)) return "";
  const res = spawnSync(cmd, args, { encoding: "utf8" });
  if (res.status !== 0) return "";
  return String(res.stdout || "").trim();
}

function makeSig(label, files, env) {
  const hash = crypto.createHash("sha256");
  const npmVersion = getCommandOutput("npm", ["-v"]) || "missing";
  hash.update(`label=${label}\n`);
  hash.update(`node_major=${env.SEAL_NODE_MAJOR || "24"}\n`);
  hash.update(`node_version=${process.version || "missing"}\n`);
  hash.update(`npm_version=${npmVersion}\n`);
  hash.update(hashInputs(files));
  return hash.digest("hex");
}

function sigChanged(stampPath, sig) {
  try {
    return fs.readFileSync(stampPath, "utf8").trim() !== sig;
  } catch {
    return true;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function findFirstFile(root, names) {
  const nameSet = new Set(names);
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && nameSet.has(entry.name)) {
        return full;
      }
    }
  }
  return "";
}

function tailFile(filePath, lines) {
  if (!filePath || lines === 0) return [];
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const chunks = content.trimEnd().split(/\r?\n/);
    return chunks.slice(-lines);
  } catch {
    return [];
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDirLock(lockPath, fn) {
  const lockDir = `${lockPath}.d`;
  while (true) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch {
      await sleep(200);
    }
  }
  try {
    return await fn();
  } finally {
    try {
      fs.rmdirSync(lockDir);
    } catch {
      // ignore
    }
  }
}

function buildSafeRoots(env) {
  const roots = ["/tmp", "/var/tmp", "/dev/shm"];
  const extras = [env.TMPDIR, env.TMP, env.TEMP];
  for (const extra of extras) {
    if (extra) roots.push(extra);
  }
  if (env.SEAL_E2E_SAFE_ROOTS) {
    for (const root of env.SEAL_E2E_SAFE_ROOTS.split(/[:;,]+/).filter(Boolean)) {
      roots.push(root);
    }
  }
  return roots;
}

function isSafeExampleRoot(exampleRoot, safeRoots) {
  return safeRoots.some((base) => exampleRoot === base || exampleRoot.startsWith(`${base}/`));
}

function requireSafeExampleRoot(exampleRoot, safeRoots, env) {
  if (env.SEAL_E2E_UNSAFE_EXAMPLE_ROOT === "1") return;
  if (!path.isAbsolute(exampleRoot)) {
    log(`ERROR: SEAL_E2E_EXAMPLE_ROOT must be absolute (got: ${exampleRoot})`);
    process.exit(1);
  }
  if (!isSafeExampleRoot(exampleRoot, safeRoots)) {
    log(`ERROR: SEAL_E2E_EXAMPLE_ROOT is not under safe roots (${safeRoots.join(" ")}).`);
    log("       Set SEAL_E2E_SAFE_ROOTS or SEAL_E2E_UNSAFE_EXAMPLE_ROOT=1 to override.");
    process.exit(1);
  }
}

async function runCommand(cmd, args, options) {
  if (!options.logFile) {
    const res = spawnSync(cmd, args, { env: options.env, cwd: options.cwd, stdio: "inherit" });
    return res.status === null ? 1 : res.status;
  }
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: options.env, cwd: options.cwd, stdio: ["inherit", "pipe", "pipe"] });
    ensureDir(path.dirname(options.logFile));
    const logStream = fs.createWriteStream(options.logFile);
    const forward = (chunk, target) => {
      logStream.write(chunk);
      target.write(chunk);
    };
    child.stdout.on("data", (chunk) => forward(chunk, process.stdout));
    child.stderr.on("data", (chunk) => forward(chunk, process.stderr));
    child.on("close", (code) => {
      logStream.end();
      resolve(code === null ? 1 : code);
    });
  });
}

async function main() {
  ensureEscalation();
  const env = process.env;
  loadE2EConfig(env);

  const runId = env.SEAL_E2E_RUN_ID || makeRunId();
  env.SEAL_E2E_RUN_ID = runId;
  const runStart = Date.now();

  const originalHome = env.HOME || os.homedir();
  const cacheBin = env.SEAL_E2E_CACHE_BIN || path.join(originalHome, ".cache", "seal", "bin");
  const cacheRoot = env.SEAL_E2E_CACHE_DIR || path.dirname(cacheBin);
  const stampsDir = path.join(cacheRoot, "stamps");
  ensureDir(cacheBin);
  ensureDir(stampsDir);
  env.PATH = `${cacheBin}${path.delimiter}${env.PATH || ""}`;
  env.SEAL_OLLVM_BIN_DIR = cacheBin;
  env.SEAL_HIKARI_BIN_DIR = cacheBin;
  env.SEAL_KITESHIELD_BIN_DIR = cacheBin;
  env.SEAL_MIDGETPACK_BIN_DIR = cacheBin;

  const setupOnly = env.SEAL_E2E_SETUP_ONLY === "1";
  const failFast = env.SEAL_E2E_FAIL_FAST || "0";
  const summaryGroup = env.SEAL_E2E_GROUP || "default";
  let summaryScope = env.SEAL_E2E_SUMMARY_SCOPE || "all";

  const npmCacheDir = env.NPM_CONFIG_CACHE || path.join(cacheRoot, "npm");
  env.NPM_CONFIG_CACHE = npmCacheDir;
  env.NPM_CONFIG_AUDIT = env.NPM_CONFIG_AUDIT || "false";
  env.NPM_CONFIG_FUND = env.NPM_CONFIG_FUND || "false";
  env.NPM_CONFIG_PROGRESS = env.NPM_CONFIG_PROGRESS || "false";
  env.NPM_CONFIG_UPDATE_NOTIFIER = env.NPM_CONFIG_UPDATE_NOTIFIER || "false";
  env.NPM_CONFIG_LOGLEVEL = env.NPM_CONFIG_LOGLEVEL || "warn";
  ensureDir(npmCacheDir);

  let summaryPath = "";
  let summaryLastPath = "";
  const defaultSummaryDir = path.join(cacheRoot, "e2e-summary");
  if (!setupOnly) {
    if (env.SEAL_E2E_SUMMARY_PATH) {
      summaryPath = env.SEAL_E2E_SUMMARY_PATH;
    } else {
      summaryPath = path.join(defaultSummaryDir, `run-${runId}.tsv`);
      summaryLastPath = path.join(defaultSummaryDir, "last.tsv");
    }
  }

  let logCapture = env.SEAL_E2E_CAPTURE_LOGS || "1";
  let logDir = env.SEAL_E2E_LOG_DIR || path.join(cacheRoot, "e2e-logs", runId);
  env.SEAL_E2E_LOG_DIR = logDir;
  const logTailLines = Number(env.SEAL_E2E_LOG_TAIL_LINES || "40");
  const logFiltered = env.SEAL_E2E_LOG_FILTERED || "1";
  if (setupOnly) {
    logCapture = "0";
  }

  const toolset = env.SEAL_E2E_TOOLSET || "core";
  if (toolset === "core") {
    env.SEAL_C_OBF_ALLOW_MISSING = "1";
    env.SEAL_MIDGETPACK_SKIP = "1";
  }

  let isolateHome = env.SEAL_E2E_ISOLATE_HOME || "";
  if (!isolateHome) {
    isolateHome = env.SEAL_DOCKER_E2E === "1" ? "1" : "0";
  }
  let e2eHome = "";
  if (isolateHome === "1") {
    const homeRoot = env.SEAL_E2E_HOME_ROOT || path.join(cacheRoot, "e2e-home");
    ensureDir(homeRoot);
    e2eHome = fs.mkdtempSync(path.join(homeRoot, "home-"));
    env.HOME = e2eHome;
    env.XDG_CACHE_HOME = path.join(e2eHome, ".cache");
    env.XDG_CONFIG_HOME = path.join(e2eHome, ".config");
    env.XDG_DATA_HOME = path.join(e2eHome, ".local", "share");
    env.XDG_STATE_HOME = path.join(e2eHome, ".local", "state");
    ensureDir(env.XDG_CACHE_HOME);
    ensureDir(env.XDG_CONFIG_HOME);
    ensureDir(env.XDG_DATA_HOME);
    ensureDir(env.XDG_STATE_HOME);
    log(`Isolated HOME for E2E: ${e2eHome}`);
  }

  const manifestPath = env.SEAL_E2E_MANIFEST || path.join(SCRIPT_DIR, "e2e-tests.json5");
  const manifestStrict = env.SEAL_E2E_MANIFEST_STRICT !== "0";
  if (!fs.existsSync(manifestPath)) {
    log(`ERROR: missing E2E manifest: ${manifestPath}`);
    process.exit(1);
  }
  if (!manifestStrict) {
    log("WARN: SEAL_E2E_MANIFEST_STRICT=0; manifest validation warnings are non-fatal.");
  }
  let manifestData;
  try {
    manifestData = loadManifest(manifestPath, { strict: manifestStrict, log });
  } catch (err) {
    log(`ERROR: ${err.message}`);
    process.exit(1);
  }
  const { tests, order: manifestOrder } = manifestData;
  const testByName = new Map(tests.map((item) => [item.name, item]));

  const logEffectiveConfig = () => {
    log("Effective config:");
    log(`  toolset=${toolset} parallel=${env.SEAL_E2E_PARALLEL || "0"} mode=${env.SEAL_E2E_PARALLEL_MODE || ""} jobs=${env.SEAL_E2E_JOBS || ""}`);
    log(`  tests=${env.SEAL_E2E_TESTS || "<all>"} skip=${env.SEAL_E2E_SKIP || "<none>"} limited_host=${env.SEAL_E2E_LIMITED_HOST || 0} fail_fast=${failFast}`);
    log(`  summary=${summaryPath || "<disabled>"} last=${summaryLastPath || "<none>"}`);
    log(`  log_dir=${logDir} capture_logs=${logCapture} log_filtered=${logFiltered}`);
    log(`  cache_root=${cacheRoot} npm_cache=${npmCacheDir} node_modules_root=${env.SEAL_E2E_NODE_MODULES_ROOT || "<none>"}`);
    if (env.SEAL_E2E_CONFIG) {
      log(`  config=${env.SEAL_E2E_CONFIG}`);
    }
    if (e2eHome) {
      log(`  home=${e2eHome}`);
    }
  };

  logEffectiveConfig();

  const initSummaryFile = () => {
    if (!summaryPath) return;
    ensureSummaryFile(summaryPath, { append: env.SEAL_E2E_SUMMARY_APPEND === "1" });
  };

  const updateLastSummary = () => {
    if (!summaryLastPath || !summaryPath || !fs.existsSync(summaryPath)) return;
    ensureDir(path.dirname(summaryLastPath));
    const tmpPath = `${summaryLastPath}.tmp.${process.pid}`;
    fs.copyFileSync(summaryPath, tmpPath);
    fs.renameSync(tmpPath, summaryLastPath);
  };

  let onlyList = parseList(env.SEAL_E2E_TESTS);
  let skipList = parseList(env.SEAL_E2E_SKIP);
  const knownTests = new Set(manifestOrder);
  const validateList = (label, list) => {
    const unknown = list.filter((item) => !knownTests.has(item));
    if (unknown.length) {
      log(`ERROR: ${label} contains unknown tests: ${unknown.join(", ")}`);
      log("       Check tools/seal/seal/scripts/e2e-tests.json5 for valid names.");
      process.exit(1);
    }
  };
  if (onlyList.length) validateList("SEAL_E2E_TESTS", onlyList);
  if (skipList.length) validateList("SEAL_E2E_SKIP", skipList);

  const rerunFailed = env.SEAL_E2E_RERUN_FAILED === "1";
  const rerunFrom = env.SEAL_E2E_RERUN_FROM || summaryLastPath || summaryPath;
  if (rerunFailed && !setupOnly) {
    if (!rerunFrom) {
      log("WARN: SEAL_E2E_RERUN_FAILED=1 but no summary path is set.");
    } else {
      const failed = listFailedTests(rerunFrom);
      if (!failed.length) {
        log(`No failed tests in ${rerunFrom}; nothing to rerun.`);
        process.exit(0);
      }
      if (onlyList.length) {
        onlyList = onlyList.filter((item) => failed.includes(item));
      } else {
        onlyList = failed;
      }
      if (!onlyList.length) {
        log("No tests left after rerun/filters.");
        process.exit(0);
      }
      if (!env.SEAL_E2E_SUMMARY_SCOPE) {
        summaryScope = "selected";
      }
      log(`Rerun failed tests only: ${onlyList.join(" ")}`);
    }
  }

  const onlySet = new Set(onlyList);
  const skipSet = new Set(skipList);
  const capabilities = detectCapabilities(env);
  const plan = buildPlan(manifestOrder, testByName, onlySet, skipSet, capabilities);
  const planMode = env.SEAL_E2E_PLAN === "1" || env.SEAL_E2E_EXPLAIN === "1";

  if (capabilities.limitedHost) {
    const hostOnlyList = tests
      .filter((test) => Array.isArray(test.requirements) && test.requirements.includes("host"))
      .map((test) => test.name);
    if (hostOnlyList.length) {
      log(`Host-limited mode: skipping host-only tests: ${hostOnlyList.join(" ")}`);
    }
  }

  if (planMode) {
    printPlan(plan.entries, testByName, capabilities, log);
    process.exit(0);
  }

  const missingScripts = [];
  for (const name of plan.selected) {
    const test = testByName.get(name);
    const scriptPath = test ? test.script : "";
    if (!scriptPath) {
      missingScripts.push(`${name}: <missing script>`);
      continue;
    }
    const resolved = path.isAbsolute(scriptPath) ? scriptPath : path.join(REPO_ROOT, scriptPath);
    let stat = null;
    try {
      stat = fs.statSync(resolved);
    } catch {
      stat = null;
    }
    if (!stat || !stat.isFile()) {
      missingScripts.push(`${name}: ${resolved}`);
    }
  }
  if (missingScripts.length) {
    log("ERROR: missing E2E test scripts:");
    for (const entry of missingScripts) {
      log(`  - ${entry}`);
    }
    process.exit(1);
  }

  const shouldRun = (name) => {
    const entry = plan.byName.get(name);
    return entry ? entry.run : false;
  };

  if (onlySet.size && !plan.selected.length) {
    log("ERROR: filter resulted in zero tests to run.");
    process.exit(1);
  }
  if (onlyList.length) {
    log(`Selected tests: ${onlyList.join(" ")}`);
  }

  initSummaryFile();

  const depsSig = makeSig("deps", [
    path.join(REPO_ROOT, "package.json"),
    path.join(REPO_ROOT, "package-lock.json"),
    path.join(REPO_ROOT, "tools", "seal", "seal", "package.json"),
    path.join(REPO_ROOT, "tools", "seal", "seal", "package-lock.json"),
  ], env);
  const depsStamp = path.join(stampsDir, "deps.sig");
  let needDeps = env.SEAL_E2E_INSTALL_DEPS || "";
  if (!needDeps) {
    needDeps = "0";
    if (!dirHasFiles(path.join(REPO_ROOT, "node_modules"))) {
      needDeps = "1";
    } else if (sigChanged(depsStamp, depsSig)) {
      needDeps = "1";
    }
  }
  if (needDeps === "1") {
    log("Installing core SEAL dependencies...");
    const script = path.join(SCRIPT_DIR, "install-seal-deps.sh");
    runScript(script, { ...env, SEAL_NPM_SKIP_IF_PRESENT: "0" });
    fs.writeFileSync(depsStamp, depsSig, "utf8");
  }

  let needPackers = env.SEAL_E2E_INSTALL_PACKERS || "";
  if (!needPackers) {
    needPackers = "0";
    if (env.SEAL_E2E_REINSTALL_PACKERS === "1") {
      needPackers = "1";
    } else {
      if (!hasCommand("upx") || !hasCommand("kiteshield") || !hasCommand("strip")) {
        needPackers = "1";
      } else if (toolset === "full" && !hasCommand("midgetpack")) {
        needPackers = "1";
      }
    }
  }
  if (needPackers === "1") {
    log("Installing ELF packers...");
    runScript(path.join(SCRIPT_DIR, "install-upx.sh"), env);
    runScript(path.join(SCRIPT_DIR, "install-kiteshield.sh"), env);
    if (toolset === "full") {
      runScript(path.join(SCRIPT_DIR, "install-midgetpack.sh"), env);
    }
    runScript(path.join(SCRIPT_DIR, "install-strip.sh"), env);
  } else {
    log("ELF packers already installed (skip).");
  }

  let needObf = env.SEAL_E2E_INSTALL_OBFUSCATORS || "";
  if (!needObf) {
    needObf = "0";
    if (env.SEAL_E2E_REINSTALL_OBFUSCATORS === "1") {
      needObf = "1";
    } else if (toolset === "full") {
      if (!hasCommand("ollvm-clang") || !hasCommand("hikari-clang")) {
        needObf = "1";
      }
    }
  }
  if (needObf === "1") {
    log("Installing C obfuscators...");
    runScript(path.join(SCRIPT_DIR, "install-ollvm.sh"), env);
    if (toolset === "full") {
      runScript(path.join(SCRIPT_DIR, "install-hikari-llvm15.sh"), env);
    }
  } else {
    if (toolset === "full") {
      log("C obfuscators already installed (skip).");
    } else {
      log("Skipping C obfuscator install for core toolset (set SEAL_E2E_INSTALL_OBFUSCATORS=1 to enable).");
    }
  }

  env.LC_ALL = "C";
  env.TZ = "UTC";

  const safeRoots = buildSafeRoots(env);
  const exampleSrc = path.join(REPO_ROOT, "tools", "seal", "example");
  const exampleDst = env.SEAL_E2E_EXAMPLE_ROOT || "/tmp/seal-example-e2e";

  if ((env.SEAL_E2E_COPY_EXAMPLE || "1") === "1") {
    log("Preparing disposable example workspace...");
    requireSafeExampleRoot(exampleDst, safeRoots, env);
    ensureDir(path.dirname(exampleDst));
    fs.rmSync(exampleDst, { recursive: true, force: true });
    fs.cpSync(exampleSrc, exampleDst, { recursive: true, dereference: false });
    env.SEAL_E2E_EXAMPLE_ROOT = exampleDst;
  }

  const exampleDir = env.SEAL_E2E_EXAMPLE_ROOT || exampleDst;
  let exampleNodeModulesDir = path.join(exampleDir, "node_modules");
  let sharedNodeModulesDir = "";
  if (env.SEAL_E2E_NODE_MODULES_ROOT) {
    if (path.basename(env.SEAL_E2E_NODE_MODULES_ROOT) === "node_modules") {
      sharedNodeModulesDir = env.SEAL_E2E_NODE_MODULES_ROOT;
    } else {
      sharedNodeModulesDir = path.join(env.SEAL_E2E_NODE_MODULES_ROOT, "node_modules");
    }
    exampleNodeModulesDir = sharedNodeModulesDir;
  }

  const exampleSig = makeSig("example", [
    path.join(exampleSrc, "package.json"),
    path.join(exampleSrc, "package-lock.json"),
  ], env);
  const exampleStamp = path.join(stampsDir, "example.sig");
  const exampleLock = path.join(stampsDir, "example.lock");
  let needExampleDeps = env.SEAL_E2E_INSTALL_EXAMPLE_DEPS || "";
  if (fs.existsSync(exampleDir)) {
    if (!needExampleDeps) {
      needExampleDeps = "0";
      if (sigChanged(exampleStamp, exampleSig) || !dirHasFiles(exampleNodeModulesDir)) {
        needExampleDeps = "1";
      }
    }
    if (sharedNodeModulesDir) {
      ensureDir(sharedNodeModulesDir);
      if (!dirHasFiles(sharedNodeModulesDir) && dirHasFiles(env.SEAL_E2E_NODE_MODULES_ROOT || "")) {
        log("Migrating shared node_modules cache layout...");
        const root = env.SEAL_E2E_NODE_MODULES_ROOT;
        if (root && fs.existsSync(root)) {
          for (const entry of fs.readdirSync(root)) {
            if (entry === "node_modules") continue;
            fs.renameSync(path.join(root, entry), path.join(sharedNodeModulesDir, entry));
          }
        }
      }
      if (needExampleDeps === "1") {
        await withDirLock(exampleLock, async () => {
          if (sigChanged(exampleStamp, exampleSig) || !dirHasFiles(exampleNodeModulesDir)) {
            log("Installing example dependencies (shared cache)...");
            const nmLink = path.join(exampleDir, "node_modules");
            try {
              if (fs.lstatSync(nmLink).isSymbolicLink()) {
                fs.unlinkSync(nmLink);
              }
            } catch {
              // ignore
            }
            npmInstall(exampleDir, env);
            if (hasCommand("rsync")) {
              const res = spawnSync("rsync", ["-a", "--delete", `${nmLink}/`, sharedNodeModulesDir], { env, stdio: "inherit" });
              if (res.status !== 0) {
                throw new Error("rsync failed while syncing node_modules");
              }
            } else {
              fs.rmSync(sharedNodeModulesDir, { recursive: true, force: true });
              ensureDir(sharedNodeModulesDir);
              fs.cpSync(nmLink, sharedNodeModulesDir, { recursive: true, dereference: false });
            }
            fs.rmSync(nmLink, { recursive: true, force: true });
            fs.symlinkSync(sharedNodeModulesDir, nmLink);
            fs.writeFileSync(exampleStamp, exampleSig, "utf8");
          } else {
            log("Example dependencies already installed (shared cache).");
          }
        });
      } else if (!fs.existsSync(path.join(exampleDir, "node_modules"))) {
        log("Linking shared node_modules...");
        fs.symlinkSync(sharedNodeModulesDir, path.join(exampleDir, "node_modules"));
      }
    } else if (needExampleDeps === "1") {
      log("Installing example dependencies...");
      npmInstall(exampleDir, env);
      fs.writeFileSync(exampleStamp, exampleSig, "utf8");
    }
  }

  if (!fs.existsSync("/etc/machine-id") || fs.readFileSync("/etc/machine-id", "utf8").trim().length === 0) {
    log("Generating /etc/machine-id for sentinel E2E...");
    if (hasCommand("systemd-machine-id-setup")) {
      spawnSync("systemd-machine-id-setup", [], { stdio: "ignore" });
    }
    if (!fs.existsSync("/etc/machine-id") || fs.readFileSync("/etc/machine-id", "utf8").trim().length === 0) {
      const uuid = fs.readFileSync("/proc/sys/kernel/random/uuid", "utf8").trim().replace(/-/g, "");
      fs.writeFileSync("/etc/machine-id", uuid, "utf8");
    }
  }

  env.SEAL_THIN_E2E = "1";
  env.SEAL_THIN_ANTI_DEBUG_E2E = "1";
  env.SEAL_LEGACY_PACKAGERS_E2E = "1";
  env.SEAL_USER_FLOW_E2E = "1";
  setEnvDefault(env, "SEAL_E2E_STRICT_PROC_MEM", "1");
  setEnvDefault(env, "SEAL_E2E_STRICT_PTRACE", "1");
  setEnvDefault(env, "SEAL_E2E_STRICT_DENY_ENV", "0");
  env.SEAL_SENTINEL_E2E = "1";
  env.SEAL_PROTECTION_E2E = "1";
  env.SEAL_OBFUSCATION_E2E = "1";
  env.SEAL_STRIP_E2E = "1";
  env.SEAL_STRIP_E2E_STRINGS_TIMEOUT_MS = env.SEAL_STRIP_E2E_STRINGS_TIMEOUT_MS || "60000";
  env.SEAL_STRIP_E2E_STRINGS_MAX_BUFFER = env.SEAL_STRIP_E2E_STRINGS_MAX_BUFFER || "50000000";
  env.SEAL_ELF_PACKERS_E2E = "1";
  const defaultCObf = toolset === "full" ? "1" : "0";
  env.SEAL_C_OBF_E2E = env.SEAL_C_OBF_E2E || defaultCObf;
  env.SEAL_UI_E2E = "1";
  env.SEAL_POSTJECT_E2E = "1";
  env.SEAL_SHIP_E2E = "1";
  env.SEAL_DECOY_E2E = "1";

  let e2eSsh = env.SEAL_E2E_SSH || "";
  if (!e2eSsh) {
    e2eSsh = env.SEAL_SHIP_SSH_E2E || "0";
  }
  if (e2eSsh === "1") {
    env.SEAL_E2E_SSH = "1";
    env.SEAL_SHIP_SSH_E2E = "1";
    env.SEAL_USER_FLOW_SSH_E2E = "1";
    env.SEAL_SHIP_SSH_HOST = env.SEAL_SHIP_SSH_HOST || "seal-server";
    env.SEAL_SHIP_SSH_USER = env.SEAL_SHIP_SSH_USER || "admin";
    env.SEAL_SHIP_SSH_PORT = env.SEAL_SHIP_SSH_PORT || "22";
    env.SEAL_SHIP_SSH_INSTALL_DIR = env.SEAL_SHIP_SSH_INSTALL_DIR || "/home/admin/apps/seal-example";
    env.SEAL_SHIP_SSH_SERVICE_NAME = env.SEAL_SHIP_SSH_SERVICE_NAME || "seal-example";
    env.SEAL_SHIP_SSH_HTTP_PORT = env.SEAL_SHIP_SSH_HTTP_PORT || "3333";
  } else {
    env.SEAL_E2E_SSH = "0";
    env.SEAL_SHIP_SSH_E2E = "0";
    env.SEAL_USER_FLOW_SSH_E2E = "0";
  }

  env.SEAL_THIN_CHUNK_SIZE = env.SEAL_THIN_CHUNK_SIZE || "8388608";
  env.SEAL_THIN_ZSTD_LEVEL = env.SEAL_THIN_ZSTD_LEVEL || "1";
  if (!env.SEAL_E2E_TIMEOUT_SCALE && env.SEAL_DOCKER_E2E === "1") {
    env.SEAL_E2E_TIMEOUT_SCALE = "2";
  }
  env.SEAL_UI_E2E_HEADLESS = env.SEAL_UI_E2E_HEADLESS || "1";

  const disableUiE2E = (reason) => {
    log(`WARN: ${reason}`);
    env.SEAL_UI_E2E = "0";
  };

  if (env.SEAL_UI_E2E === "1" && shouldRun("example-ui")) {
    if (!env.PLAYWRIGHT_BROWSERS_PATH && env.SEAL_DOCKER_E2E === "1") {
      env.PLAYWRIGHT_BROWSERS_PATH = "/root/.cache/ms-playwright";
    }
    const pwCacheRoot = env.SEAL_E2E_PLAYWRIGHT_CACHE_ROOT || env.XDG_CACHE_HOME || path.join(env.HOME || originalHome, ".cache");
    const pwCache = env.PLAYWRIGHT_BROWSERS_PATH || path.join(pwCacheRoot, "ms-playwright");
    const pwMarker = env.SEAL_E2E_PLAYWRIGHT_MARKER || path.join(cacheRoot, "playwright-installed");
    let pwHasBrowser = false;
    let pwDepsOk = true;
    let pwBrowserPath = "";
    if (fs.existsSync(pwCache)) {
      pwBrowserPath = findFirstFile(pwCache, ["chrome-headless-shell", "chrome"]);
      if (pwBrowserPath) pwHasBrowser = true;
    }
    if (pwHasBrowser && hasCommand("ldd")) {
      const res = spawnSync("ldd", [pwBrowserPath], { encoding: "utf8" });
      if (res.status === 0 && /not found/.test(res.stdout || "")) {
        pwDepsOk = false;
      }
    }
    if (!hasCommand("npx")) {
      if (env.SEAL_DOCKER_E2E === "1") {
        disableUiE2E("npx not found; disabling UI E2E in docker");
      } else {
        log("WARN: npx not found; skipping Playwright browser install");
      }
    } else if (!fs.existsSync(pwMarker) || !pwHasBrowser || !pwDepsOk) {
      if (fs.existsSync(pwMarker) && !pwHasBrowser) {
        log("Playwright marker present but browsers missing; reinstalling.");
      }
      if (!pwDepsOk) {
        log("Playwright browser deps missing; reinstalling with --with-deps.");
      }
      const pwCli = path.join(REPO_ROOT, "tools", "seal", "seal", "node_modules", ".bin", "playwright");
      if (!fs.existsSync(pwCli)) {
        log("Playwright CLI missing; installing tools/seal/seal npm deps...");
        try {
          npmInstall(path.join(REPO_ROOT, "tools", "seal", "seal"), env);
        } catch (err) {
          if (env.SEAL_DOCKER_E2E === "1") {
            disableUiE2E("Playwright npm install failed; disabling UI E2E in docker");
          } else {
            throw err;
          }
        }
      }
      if (env.SEAL_UI_E2E === "1") {
        log("Installing Playwright browsers for UI E2E...");
        const res = spawnSync("npx", ["playwright", "install", "--with-deps", "chromium"], { cwd: REPO_ROOT, env, stdio: "inherit" });
        if (res.status !== 0) {
          if (env.SEAL_DOCKER_E2E === "1") {
            disableUiE2E("Playwright browser install failed; disabling UI E2E in docker");
          } else {
            throw new Error("Playwright browser install failed.");
          }
        } else {
          fs.writeFileSync(pwMarker, `${Date.now()}\n`, "utf8");
        }
      }
    }
  }

  if (setupOnly) {
    log("Setup only (SEAL_E2E_SETUP_ONLY=1). Skipping tests.");
    return;
  }

  const testStatus = {};
  const testDurations = {};
  const testLogs = {};
  const testOrder = [];
  let failures = 0;
  const startTs = Date.now();

  const runTest = async (name, scriptPath, extraEnv = {}) => {
    if (!shouldRun(name)) {
      if (logFiltered === "1") {
        log(`SKIP: ${name} (filtered)`);
      }
      if (summaryScope === "all") {
        testStatus[name] = "skipped";
        testDurations[name] = 0;
        testOrder.push(name);
      }
      return;
    }
    if (!scriptPath) {
      log(`ERROR: missing manifest entry for test: ${name}`);
      testStatus[name] = "failed";
      testDurations[name] = 0;
      testOrder.push(name);
      failures += 1;
      return;
    }
    const resolvedScript = path.isAbsolute(scriptPath) ? scriptPath : path.join(REPO_ROOT, scriptPath);
    if (!fs.existsSync(resolvedScript)) {
      log(`ERROR: script not found for ${name}: ${resolvedScript}`);
      testStatus[name] = "failed";
      testDurations[name] = 0;
      testOrder.push(name);
      failures += 1;
      return;
    }

    log(`Running ${name}...`);
    testOrder.push(name);
    const start = Date.now();
    const logFile = logCapture === "1" ? path.join(logDir, `${name}.log`) : "";
    const exitCode = await runCommand(process.execPath, [resolvedScript], {
      env: { ...env, ...extraEnv },
      cwd: REPO_ROOT,
      logFile,
    });
    const duration = Math.floor((Date.now() - start) / 1000);
    testDurations[name] = duration;
    if (logFile) testLogs[name] = logFile;

    if (exitCode === SKIP_CODE) {
      testStatus[name] = "skipped";
      log(`SKIP: ${name} (time=${formatDuration(duration)})`);
      return;
    }
    if (exitCode !== 0) {
      testStatus[name] = "failed";
      failures += 1;
      log(`FAIL: ${name} (time=${formatDuration(duration)}, exit=${exitCode})`);
      const hint = testByName.get(name) ? testByName.get(name).failHint : "";
      if (hint) {
        log(`HINT: ${hint}`);
      }
      if (logFile && logTailLines !== 0) {
        log(`Log tail (${logTailLines} lines): ${logFile}`);
        const lines = tailFile(logFile, logTailLines);
        for (const line of lines) {
          log(`  | ${line}`);
        }
      }
      if (failFast === "1") {
        throw new Error("fail-fast");
      }
      return;
    }
    testStatus[name] = "ok";
    log(`OK: ${name} (time=${formatDuration(duration)})`);
  };

  try {
    let thinTimeoutMs = env.SEAL_THIN_E2E_NATIVE_RUN_TIMEOUT_MS || "";
    if (!thinTimeoutMs) {
      if (env.SEAL_E2E_TIMEOUT_SCALE) {
        const scale = Number(env.SEAL_E2E_TIMEOUT_SCALE) || 1;
        thinTimeoutMs = String(Math.max(1, Math.round(240000 * scale)));
      } else {
        thinTimeoutMs = "240000";
      }
    }

    for (const name of manifestOrder) {
      const test = testByName.get(name);
      if (!test) continue;
      const extraEnv = {};
      if (name === "thin") {
        extraEnv.SEAL_THIN_E2E_NATIVE_RUN_TIMEOUT_MS = thinTimeoutMs;
      }
      try {
        await runTest(name, test.script, extraEnv);
      } catch (err) {
        if (failFast === "1" && err && err.message === "fail-fast") {
          break;
        }
        throw err;
      }
    }
  } finally {
    if (failFast === "1" && failures > 0) {
      for (const name of manifestOrder) {
        if (testStatus[name]) continue;
        if (!shouldRun(name)) continue;
        testStatus[name] = "aborted";
        testDurations[name] = 0;
        testOrder.push(name);
      }
    }
  }

  const printCategoryTable = () => {
    const orderList = summaryScope === "selected" ? testOrder : manifestOrder;
    if (!orderList.length) return;
    log("Category summary:");
    const categories = [];
    const seen = new Set();
    for (const name of orderList) {
      const category = (testByName.get(name) || {}).category || "misc";
      if (!seen.has(category)) {
        seen.add(category);
        categories.push(category);
      }
    }
    for (const category of categories) {
      let total = 0;
      let okCount = 0;
      let skipCount = 0;
      let failCount = 0;
      let abortCount = 0;
      for (const name of orderList) {
        if (((testByName.get(name) || {}).category || "misc") !== category) continue;
        const status = testStatus[name] || "skipped";
        total += 1;
        if (status === "ok") okCount += 1;
        else if (status === "failed") failCount += 1;
        else if (status === "aborted") abortCount += 1;
        else skipCount += 1;
      }
      log(`Category ${category}: total=${total} ok=${okCount} skipped=${skipCount} failed=${failCount} aborted=${abortCount}`);
      log("  Test | Status | Time | Parallel | SkipRisk | Description");
      for (const name of orderList) {
        if (((testByName.get(name) || {}).category || "misc") !== category) continue;
        const status = testStatus[name] || "skipped";
        const dur = testDurations[name] || 0;
        const par = (testByName.get(name) || {}).parallel === "1" ? "yes" : "no";
        const skipRisk = (testByName.get(name) || {}).skipRisk || "";
        const desc = (testByName.get(name) || {}).description || "";
        log(`  - ${name} | ${status} | ${formatDuration(dur)} | ${par} | ${skipRisk} | ${desc}`);
      }
    }
  };

  const printFailureList = () => {
    if (failures === 0) return;
    log("Failures:");
    for (const name of manifestOrder) {
      if (testStatus[name] !== "failed") continue;
      const desc = (testByName.get(name) || {}).description || "";
      const hint = (testByName.get(name) || {}).failHint || "";
      const logPath = testLogs[name] || "";
      log(`  - ${name}: ${desc}`);
      if (hint) {
        log(`    hint: ${hint}`);
      }
      if (logPath) {
        log(`    log: ${logPath}`);
      }
    }
  };

  const writeSummaryFile = () => {
    if (!summaryPath) return;
    for (const name of testOrder) {
      const status = testStatus[name];
      const dur = testDurations[name] || 0;
      const category = (testByName.get(name) || {}).category || "";
      const parallel = (testByName.get(name) || {}).parallel || "0";
      const skipRisk = (testByName.get(name) || {}).skipRisk || "";
      const desc = ((testByName.get(name) || {}).description || "").replace(/\t/g, " ");
      const hint = ((testByName.get(name) || {}).failHint || "").replace(/\t/g, " ");
      const logPath = testLogs[name] || "";
      const line = [
        summaryGroup,
        name,
        status,
        dur,
        category,
        parallel,
        skipRisk,
        desc,
        logPath,
        hint,
      ].join("\t");
      fs.appendFileSync(summaryPath, `${line}\n`, "utf8");
    }
  };

  const endTs = Date.now();
  const total = Math.floor((endTs - startTs) / 1000);
  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;
  let abortCount = 0;
  let sumTests = 0;
  for (const name of Object.keys(testStatus)) {
    const status = testStatus[name];
    if (status === "ok") okCount += 1;
    else if (status === "failed") failCount += 1;
    else if (status === "aborted") abortCount += 1;
    else skipCount += 1;
  }
  for (const name of Object.keys(testDurations)) {
    sumTests += testDurations[name] || 0;
  }

  log(`Timing summary (total ${formatDuration(total)}):`);
  const timingRows = Object.keys(testDurations)
    .map((name) => ({ name, duration: testDurations[name] || 0 }))
    .sort((a, b) => b.duration - a.duration);
  for (const row of timingRows) {
    const status = testStatus[row.name];
    log(`  - ${row.name}  ${status}  (${formatDuration(row.duration)})`);
  }
  const totalCount = okCount + skipCount + failCount + abortCount;
  log(`Stats: total=${totalCount}, ok=${okCount}, skipped=${skipCount}, failed=${failCount}, aborted=${abortCount}`);
  if (sumTests > 0 && total > sumTests) {
    log(`Non-test time: ${formatDuration(total - sumTests)} (setup/deps/copy)`);
  }
  if (summaryPath) log(`Summary file: ${summaryPath}`);
  if (summaryLastPath) log(`Summary last: ${summaryLastPath}`);
  if (logCapture === "1") log(`Logs: ${logDir}`);
  if (failCount !== 0 && summaryPath) {
    const rerunHint = summaryLastPath || summaryPath;
    log(`Rerun failed only: SEAL_E2E_RERUN_FAILED=1 SEAL_E2E_RERUN_FROM=${rerunHint}`);
  }

  printCategoryTable();
  printFailureList();

  writeSummaryFile();
  updateLastSummary();

  const summaryRows = parseSummaryRows(summaryPath);
  const summaryJsonPath = resolveJsonSummaryPath(summaryPath, env);
  const summaryData = buildJsonSummary({
    runId,
    manifestPath,
    manifestOrder,
    testByName,
    planByName: plan.byName,
    summaryRows,
    capabilities,
    summaryPath,
    runStart,
    runEnd: Date.now(),
  });
  writeJsonSummary(summaryJsonPath, summaryData);
  if (summaryJsonPath) {
    log(`Summary json: ${summaryJsonPath}`);
  }

  if (failures > 0) {
    log(`E2E failures: ${failures}`);
    process.exit(1);
  }
  if (abortCount > 0 && failFast === "1") {
    process.exit(1);
  }
}

main().catch((err) => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
