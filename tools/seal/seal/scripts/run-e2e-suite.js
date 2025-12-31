#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const {
  ensureSummaryFile,
  updateLastSummaryFile,
  formatSummaryRow,
  buildSummaryRowsFromState,
  printCategorySummary,
  printStatusList,
  printTimingSummary,
  countStatuses,
  logRerunHint,
  writeJsonSummaryReport,
} = require("./e2e-report");
const { hasCommand } = require("./e2e-utils");
const { loadE2EConfig, resolveE2ERoot, resolveE2EPaths, resolveRerunFrom, isPlanMode } = require("./e2e-runner-config");
const { ensureDir, resolveRunContext, setupRunCleanup, removeDirSafe } = require("./e2e-runner-fs");
const {
  assertEscalated,
  makeRunId,
  formatDuration,
  logEffectiveConfig,
  formatConfigLine,
  buildRunConfigLines,
  buildTimingRows,
  isEnabled,
  logE2EDiskSummary,
} = require("./e2e-runner-utils");
const { applyToolsetDefaults, applyE2EFeatureFlags, applySshDefaults } = require("./e2e-runner-env");
const { preparePlan, applyRerunFailedFilters } = require("./e2e-runner-plan");
const { prepareExampleWorkspace } = require("./e2e-runner-workspace");

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const SKIP_CODE = 77;

function log(msg) {
  process.stdout.write(`[seal-e2e] ${msg}\n`);
}

function dirHasFiles(dir) {
  try {
    return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

function runScript(scriptPath, env, args = []) {
  const res = spawnSync("bash", [scriptPath, ...args], { env, stdio: "inherit" });
  if (res.error) {
    const msg = res.error.message || String(res.error);
    throw new Error(`Script failed (${path.basename(scriptPath)}): ${msg}`);
  }
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
  if (res.error) {
    const msg = res.error.message || String(res.error);
    throw new Error(`npm ${args.join(" ")} failed in ${dir}: ${msg}`);
  }
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

function readProcStartTime(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const end = stat.lastIndexOf(")");
    if (end === -1) return null;
    const rest = stat.slice(end + 2).trim();
    const fields = rest.split(/\s+/);
    return fields[19] || null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (err && err.code === "EPERM") return true;
    return false;
  }
}

function readLockOwner(lockDir) {
  const ownerPath = path.join(lockDir, "owner.json");
  try {
    const data = JSON.parse(fs.readFileSync(ownerPath, "utf8"));
    if (data && typeof data.pid === "number") return data;
  } catch {
    // ignore
  }
  return null;
}

function writeLockOwner(lockDir) {
  const ownerPath = path.join(lockDir, "owner.json");
  const data = {
    pid: process.pid,
    ppid: process.ppid,
    host: os.hostname(),
    startTime: readProcStartTime(process.pid),
    createdAt: Date.now(),
  };
  fs.writeFileSync(ownerPath, JSON.stringify(data, null, 2), { mode: 0o600 });
  return data;
}

function lockActivityMs(lockDir) {
  const files = [lockDir, path.join(lockDir, "owner.json"), path.join(lockDir, "heartbeat")];
  let newest = 0;
  for (const file of files) {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs > newest) newest = stat.mtimeMs;
    } catch {
      // ignore
    }
  }
  return newest;
}

function isLockStale(lockDir, staleMs) {
  if (!staleMs || staleMs <= 0) return false;
  const lastActivity = lockActivityMs(lockDir);
  if (!lastActivity || Date.now() - lastActivity <= staleMs) return false;
  const owner = readLockOwner(lockDir);
  if (!owner || typeof owner.pid !== "number") return true;
  if (!isProcessAlive(owner.pid)) return true;
  if (owner.startTime) {
    const currentStart = readProcStartTime(owner.pid);
    if (currentStart && currentStart !== owner.startTime) return true;
  }
  return false;
}

function removeLockDir(lockDir) {
  try {
    fs.rmSync(path.join(lockDir, "owner.json"), { force: true });
  } catch {
    // ignore
  }
  try {
    fs.rmSync(path.join(lockDir, "heartbeat"), { force: true });
  } catch {
    // ignore
  }
  try {
    fs.rmdirSync(lockDir);
  } catch {
    // ignore
  }
}

async function withDirLock(lockPath, fn) {
  const lockDir = `${lockPath}.d`;
  const timeoutMs = Number(process.env.SEAL_E2E_LOCK_TIMEOUT_MS || 15 * 60 * 1000);
  const staleMs = Number(process.env.SEAL_E2E_LOCK_STALE_MS || 30 * 60 * 1000);
  const start = Date.now();
  let heartbeatTimer = null;
  // Lock-dir + owner.json + heartbeat avoids false-stale on long builds while
  // still clearing crashed locks deterministically.
  while (true) {
    try {
      fs.mkdirSync(lockDir);
      try {
        writeLockOwner(lockDir);
        if (staleMs > 0) {
          const interval = Math.max(1000, Math.min(30_000, Math.floor(staleMs / 2)));
          heartbeatTimer = setInterval(() => {
            try {
              fs.writeFileSync(path.join(lockDir, "heartbeat"), `${Date.now()}\n`, { mode: 0o600 });
            } catch {
              // ignore heartbeat errors
            }
          }, interval);
          heartbeatTimer.unref();
        }
      } catch (err) {
        removeLockDir(lockDir);
        throw new Error(`Failed to initialize lock metadata: ${err && err.message ? err.message : String(err)}`);
      }
      break;
    } catch {
      const elapsed = Date.now() - start;
      if (timeoutMs > 0 && elapsed > timeoutMs) {
        throw new Error(`Timed out waiting for lock: ${lockDir}`);
      }
      try {
        if (isLockStale(lockDir, staleMs)) {
          log(`Stale lock detected (${lockDir}); removing.`);
          removeLockDir(lockDir);
          continue;
        }
      } catch {
        // ignore stale check errors
      }
      await sleep(200);
    }
  }
  try {
    return await fn();
  } finally {
    try {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      removeLockDir(lockDir);
    } catch {
      // ignore
    }
  }
}

function formatElapsedMs(startMs) {
  const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  return formatDuration(elapsedSec);
}

async function runCommand(cmd, args, options) {
  if (!options.logFile) {
    const res = spawnSync(cmd, args, { env: options.env, cwd: options.cwd, stdio: "inherit" });
    if (res.error) {
      const msg = res.error.message || String(res.error);
      log(`ERROR: failed to spawn ${cmd}: ${msg}`);
      return 1;
    }
    return res.status === null ? 1 : res.status;
  }
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: options.env, cwd: options.cwd, stdio: ["inherit", "pipe", "pipe"] });
    ensureDir(path.dirname(options.logFile));
    const logStream = fs.createWriteStream(options.logFile);
    let settled = false;
    const label = options.label ? String(options.label) : "";
    const heartbeatSec = Number(options.heartbeatSec || 0);
    const startedAt = Date.now();
    let heartbeatTimer = null;
    const forward = (chunk, target) => {
      logStream.write(chunk);
      target.write(chunk);
    };
    const finish = (code, extraMessage) => {
      if (settled) return;
      settled = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (extraMessage) {
        const line = `${extraMessage}\n`;
        logStream.write(line);
        process.stderr.write(line);
      }
      logStream.end();
      resolve(code);
    };
    if (heartbeatSec > 0) {
      heartbeatTimer = setInterval(() => {
        const line = `[seal-e2e] HEARTBEAT: ${label || "test"} running (${formatElapsedMs(startedAt)})\n`;
        logStream.write(line);
        process.stdout.write(line);
      }, Math.max(1, Math.floor(heartbeatSec * 1000)));
      heartbeatTimer.unref();
    }
    child.stdout.on("data", (chunk) => forward(chunk, process.stdout));
    child.stderr.on("data", (chunk) => forward(chunk, process.stderr));
    child.on("error", (err) => {
      finish(1, `[seal-e2e] ERROR: failed to spawn ${cmd}: ${err && err.message ? err.message : String(err)}`);
    });
    child.on("close", (code) => {
      finish(code === null ? 1 : code);
    });
  });
}

async function main() {
  const env = process.env;
  loadE2EConfig(env, { repoRoot: REPO_ROOT, scriptDir: SCRIPT_DIR, log });
  assertEscalated(log);

  const keepRuns = isEnabled(env, "SEAL_E2E_KEEP_RUNS");
  const runContext = resolveRunContext({
    env,
    log,
    repoRoot: REPO_ROOT,
    resolveE2ERoot,
    keepRuns,
    makeRunId,
    ensureExampleBase: true,
  });
  const {
    runId,
    runLayout,
    runRoot,
    runsRoot,
    tmpRoot,
    exampleRootBase,
    e2eRoot,
    lockOwned,
    lockPath,
  } = runContext;
  const runStart = Date.now();

  const setupOnly = isEnabled(env, "SEAL_E2E_SETUP_ONLY");
  const {
    cacheRoot,
    cacheBin,
    stampsDir,
    npmCacheDir,
    summaryPath,
    summaryLastPath,
    logDir,
  } = resolveE2EPaths({
    env,
    e2eRoot,
    runId,
    summaryEnabled: !setupOnly,
  });
  ensureDir(cacheBin);
  ensureDir(stampsDir);
  env.PATH = `${cacheBin}${path.delimiter}${env.PATH || ""}`;
  env.SEAL_OLLVM_BIN_DIR = cacheBin;
  env.SEAL_HIKARI_BIN_DIR = cacheBin;
  env.SEAL_KITESHIELD_BIN_DIR = cacheBin;
  env.SEAL_MIDGETPACK_BIN_DIR = cacheBin;

  const failFast = env.SEAL_E2E_FAIL_FAST || "0";
  const summaryGroup = env.SEAL_E2E_GROUP || "default";
  let summaryScope = env.SEAL_E2E_SUMMARY_SCOPE || "all";

  env.NPM_CONFIG_CACHE = npmCacheDir;
  env.NPM_CONFIG_AUDIT = env.NPM_CONFIG_AUDIT || "false";
  env.NPM_CONFIG_FUND = env.NPM_CONFIG_FUND || "false";
  env.NPM_CONFIG_PROGRESS = env.NPM_CONFIG_PROGRESS || "false";
  env.NPM_CONFIG_UPDATE_NOTIFIER = env.NPM_CONFIG_UPDATE_NOTIFIER || "false";
  env.NPM_CONFIG_LOGLEVEL = env.NPM_CONFIG_LOGLEVEL || "warn";
  ensureDir(npmCacheDir);
  {
    // Avoid TMPDIR overrides that point into per-run temp roots.
    const compileRoot = path.join("/tmp", "seal-e2e-compile-cache");
    const compileCache = path.join(compileRoot, String(process.pid));
    ensureDir(compileCache);
    env.NODE_COMPILE_CACHE = compileCache;
  }

  let logCapture = env.SEAL_E2E_CAPTURE_LOGS || "1";
  env.SEAL_E2E_LOG_DIR = logDir;
  const logTailLines = Number(env.SEAL_E2E_LOG_TAIL_LINES || "40");
  const logFiltered = env.SEAL_E2E_LOG_FILTERED || "1";
  const heartbeatSec = Number(env.SEAL_E2E_RUNNER_HEARTBEAT_SEC || "60");
  if (setupOnly) {
    logCapture = "0";
  }

  const toolset = env.SEAL_E2E_TOOLSET || "core";
  applyToolsetDefaults(env, toolset);

  const keepTmp = isEnabled(env, "SEAL_E2E_KEEP_TMP");
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
  if (e2eHome && !keepTmp) {
    const cleanupHome = () => {
      removeDirSafe(e2eHome);
    };
    process.on("exit", cleanupHome);
    process.on("SIGINT", () => {
      cleanupHome();
      process.exit(130);
    });
    process.on("SIGTERM", () => {
      cleanupHome();
      process.exit(143);
    });
  }

  const manifestPath = env.SEAL_E2E_MANIFEST || path.join(SCRIPT_DIR, "e2e-tests.json5");
  const manifestStrict = env.SEAL_E2E_MANIFEST_STRICT !== "0";

  const effectiveLines = [
    ...buildRunConfigLines({
      runLayout,
      runId,
      runRoot,
      tmpRoot,
      includeTmpRoot: true,
    }),
    formatConfigLine([
      { key: "toolset", value: toolset },
      { key: "parallel", value: env.SEAL_E2E_PARALLEL || "0" },
      { key: "mode", value: env.SEAL_E2E_PARALLEL_MODE || "" },
      { key: "jobs", value: env.SEAL_E2E_JOBS || "" },
    ]),
    formatConfigLine([
      { key: "tests", value: env.SEAL_E2E_TESTS || "<all>" },
      { key: "skip", value: env.SEAL_E2E_SKIP || "<none>" },
      { key: "limited_host", value: env.SEAL_E2E_LIMITED_HOST || 0 },
      { key: "fail_fast", value: failFast },
    ]),
    formatConfigLine([
      { key: "heartbeat_sec", value: Number.isFinite(heartbeatSec) ? String(heartbeatSec) : "0" },
    ]),
    formatConfigLine([
      { key: "summary", value: summaryPath || "<disabled>" },
      { key: "last", value: summaryLastPath || "<none>" },
    ]),
    formatConfigLine([
      { key: "log_dir", value: logDir },
      { key: "capture_logs", value: logCapture },
      { key: "log_filtered", value: logFiltered },
    ]),
    formatConfigLine([
      { key: "cache_root", value: cacheRoot },
      { key: "npm_cache", value: npmCacheDir },
      { key: "node_modules_root", value: env.SEAL_E2E_NODE_MODULES_ROOT || "<none>" },
    ]),
  ].filter(Boolean);
  if (env.SEAL_E2E_CONFIG) {
    effectiveLines.push(formatConfigLine([{ key: "config", value: env.SEAL_E2E_CONFIG }]));
  }
  if (e2eHome) {
    effectiveLines.push(formatConfigLine([{ key: "home", value: e2eHome }]));
  }
  logEffectiveConfig(log, effectiveLines);

  const initSummaryFile = () => {
    if (!summaryPath) return;
    ensureSummaryFile(summaryPath, { append: env.SEAL_E2E_SUMMARY_APPEND === "1" });
  };

  const rerunFailed = isEnabled(env, "SEAL_E2E_RERUN_FAILED") && !setupOnly;
  const rerunFrom = resolveRerunFrom(env, summaryPath, summaryLastPath);
  const planMode = isPlanMode(env);
  const adjustFilters = ({ onlyList, skipList }) => {
    return applyRerunFailedFilters({
      onlyList,
      skipList,
      rerunFailed,
      rerunFrom,
      log,
      emptyExitCode: 0,
      onScopeSelected: () => {
        if (!env.SEAL_E2E_SUMMARY_SCOPE) {
          summaryScope = "selected";
        }
      },
    });
  };
  const {
    manifestOrder,
    testByName,
    capabilities,
    plan,
    shouldRun,
  } = preparePlan({
    env,
    repoRoot: REPO_ROOT,
    manifestPath,
    manifestStrict,
    planMode,
    log,
    adjustFilters,
  });

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

  const wantCObf = env.SEAL_C_OBF_E2E === "1" || (!env.SEAL_C_OBF_E2E && process.platform === "linux");
  let needObf = env.SEAL_E2E_INSTALL_OBFUSCATORS || "";
  if (!needObf) {
    needObf = "0";
    if (env.SEAL_E2E_REINSTALL_OBFUSCATORS === "1") {
      needObf = "1";
    } else if (toolset === "full" || wantCObf) {
      const needsOllvm = !hasCommand("ollvm-clang");
      const needsHikari = toolset === "full" && !hasCommand("hikari-clang");
      if (needsOllvm || needsHikari) {
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
    if (toolset === "full" || wantCObf) {
      log("C obfuscators already installed (skip).");
    } else {
      log("Skipping C obfuscator install for core toolset (set SEAL_C_OBF_E2E=1 to enable).");
    }
  }

  env.LC_ALL = "C";
  env.TZ = "UTC";

  const {
    exampleRoot: exampleDst,
    exampleDir,
    cleanupExample,
    exampleSrc,
  } = prepareExampleWorkspace({
    env,
    repoRoot: REPO_ROOT,
    exampleRootBase,
    log,
  });
  if (runRoot) ensureDir(runRoot);
  if (tmpRoot) ensureDir(tmpRoot);

  setupRunCleanup({
    env,
    log,
    runId,
    runRoot,
    runsRoot,
    tmpRoot,
    exampleRoot: exampleRootBase || exampleDst,
    cleanupExample,
    keepTmp,
    keepRuns,
    runLayout,
    lockOwned,
    lockPath,
    isParallelChild: isEnabled(env, "SEAL_E2E_PARALLEL_CHILD"),
  });
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
      if (!dirHasFiles(sharedNodeModulesDir)) {
        needExampleDeps = "1";
      }
      const sharedResolved = path.resolve(sharedNodeModulesDir);
      try {
        const sharedStat = fs.lstatSync(sharedNodeModulesDir);
        if (sharedStat.isSymbolicLink()) {
          const linkTarget = fs.readlinkSync(sharedNodeModulesDir);
          const linkResolved = path.resolve(path.dirname(sharedNodeModulesDir), linkTarget);
          if (linkResolved === sharedResolved) {
            fs.unlinkSync(sharedNodeModulesDir);
          }
        }
      } catch {
        // ignore
      }
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
              if (res.error) {
                const msg = res.error.message || String(res.error);
                throw new Error(`rsync failed while syncing node_modules: ${msg}`);
              }
              if (res.status !== 0) {
                throw new Error("rsync failed while syncing node_modules");
              }
            } else {
              fs.rmSync(sharedNodeModulesDir, { recursive: true, force: true });
              ensureDir(sharedNodeModulesDir);
              fs.cpSync(nmLink, sharedNodeModulesDir, { recursive: true, dereference: false });
            }
            if (path.resolve(nmLink) !== sharedResolved) {
              fs.rmSync(nmLink, { recursive: true, force: true });
              fs.symlinkSync(sharedNodeModulesDir, nmLink);
            }
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
      const res = spawnSync("systemd-machine-id-setup", [], { stdio: "ignore" });
      if (res.error) {
        const msg = res.error.message || String(res.error);
        log(`WARN: systemd-machine-id-setup failed: ${msg}`);
      } else if (res.status !== 0) {
        log(`WARN: systemd-machine-id-setup exited with status ${res.status}`);
      }
    }
    if (!fs.existsSync("/etc/machine-id") || fs.readFileSync("/etc/machine-id", "utf8").trim().length === 0) {
      const uuid = fs.readFileSync("/proc/sys/kernel/random/uuid", "utf8").trim().replace(/-/g, "");
      fs.writeFileSync("/etc/machine-id", uuid, "utf8");
    }
  }

  applyE2EFeatureFlags(env, toolset);
  applySshDefaults(env);

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
      if (res.error) {
        const msg = res.error.message || String(res.error);
        log(`WARN: ldd failed (${msg}); forcing Playwright reinstall.`);
        pwDepsOk = false;
      } else if (res.status === 0 && /not found/.test(res.stdout || "")) {
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
        if (res.error) {
          const msg = res.error.message || String(res.error);
          if (env.SEAL_DOCKER_E2E === "1") {
            disableUiE2E(`Playwright browser install failed (${msg}); disabling UI E2E in docker`);
          } else {
            throw new Error(`Playwright browser install failed: ${msg}`);
          }
        } else if (res.status !== 0) {
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
      label: name,
      heartbeatSec,
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

  const summaryRows = buildSummaryRowsFromState({
    order: testOrder,
    testByName,
    statusByTest: testStatus,
    durationByTest: testDurations,
    logByTest: testLogs,
    group: summaryGroup,
  });
  const summaryOrder = summaryScope === "selected" ? testOrder : manifestOrder;

  const writeSummaryFile = () => {
    if (!summaryPath) return;
    for (const row of summaryRows) {
      const line = formatSummaryRow(row);
      fs.appendFileSync(summaryPath, `${line}\n`, "utf8");
    }
  };

  const endTs = Date.now();
  const total = Math.floor((endTs - startTs) / 1000);
  let sumTests = 0;
  for (const name of Object.keys(testDurations)) {
    sumTests += testDurations[name] || 0;
  }

  const timingRows = buildTimingRows(testDurations, testStatus);
  printTimingSummary({
    label: `Timing summary (total ${formatDuration(total)}):`,
    entries: timingRows,
    log,
    formatDuration,
  });
  const totals = countStatuses(summaryOrder, summaryRows);
  log(`Stats: total=${totals.total}, ok=${totals.ok}, skipped=${totals.skipped}, failed=${totals.failed}, aborted=${totals.aborted}`);
  if (sumTests > 0 && total > sumTests) {
    log(`Non-test time: ${formatDuration(total - sumTests)} (setup/deps/copy)`);
  }
  if (summaryPath) log(`Summary file: ${summaryPath}`);
  if (summaryLastPath) log(`Summary last: ${summaryLastPath}`);
  if (logCapture === "1") log(`Logs: ${logDir}`);
  logRerunHint({
    failedCount: totals.failed,
    summaryPath,
    summaryLastPath,
    log,
  });

  printCategorySummary({
    orderList: summaryOrder,
    testByName,
    summaryRows,
    log,
    formatDuration,
  });
  printStatusList({
    orderList: summaryOrder,
    testByName,
    summaryRows,
    status: "failed",
    label: "Failures:",
    log,
  });

  writeSummaryFile();
  updateLastSummaryFile(summaryPath, summaryLastPath);

  writeJsonSummaryReport({
    env,
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
    log,
  });

  logE2EDiskSummary(env, { e2eRoot, log });

  if (failures > 0) {
    log(`E2E failures: ${failures}`);
    process.exit(1);
  }
  if (totals.aborted > 0 && failFast === "1") {
    process.exit(1);
  }
}

main().catch((err) => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
