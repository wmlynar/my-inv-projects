"use strict";

const fs = require("fs");
const path = require("path");
const { isEnabled } = require("./e2e-runner-utils");

const RUN_LAYOUTS = {
  AUTO: "auto",
  SHARED: "shared",
  CONCURRENT: "concurrent",
};
const RUN_MODES = {
  SINGLE: "single",
  PARALLEL: "parallel",
};

function ensureDir(dir) {
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
}

function removeDirSafe(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function isProcessAlive(pid) {
  if (!pid || !Number.isFinite(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function readLockInfo(lockPath) {
  if (!lockPath || !fs.existsSync(lockPath)) return null;
  try {
    const raw = fs.readFileSync(lockPath, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function writeLockFile(lockPath, info) {
  const fd = fs.openSync(lockPath, "wx");
  try {
    fs.writeFileSync(fd, JSON.stringify(info, null, 2) + "\n", "utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function tryAcquireRunLock(lockPath, log) {
  if (!lockPath) return { ok: false, reason: "missing_lock_path" };
  const info = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
  };
  try {
    writeLockFile(lockPath, info);
    return { ok: true, info };
  } catch (err) {
    if (!err || err.code !== "EEXIST") {
      return { ok: false, reason: "lock_error", error: err };
    }
  }

  const existing = readLockInfo(lockPath);
  const existingPid = existing && existing.pid ? Number(existing.pid) : null;
  if (existingPid && isProcessAlive(existingPid)) {
    return { ok: false, reason: "busy", info: existing };
  }
  try {
    fs.rmSync(lockPath, { force: true });
  } catch {}
  try {
    writeLockFile(lockPath, info);
    return { ok: true, info };
  } catch (err) {
    return { ok: false, reason: "lock_error", error: err };
  }
}

function releaseRunLock(lockPath) {
  if (!lockPath) return;
  try {
    fs.rmSync(lockPath, { force: true });
  } catch {
    // ignore
  }
}

function resolveRunLayout(options) {
  const env = options.env || process.env;
  const log = typeof options.log === "function" ? options.log : null;
  const e2eRoot = options.e2eRoot || "";
  const concurrentSwitch = isEnabled(env, "SEAL_E2E_CONCURRENT", "0");
  let raw = env.SEAL_E2E_RUN_LAYOUT || RUN_LAYOUTS.AUTO;
  if (concurrentSwitch) {
    if (raw && raw !== RUN_LAYOUTS.AUTO && raw !== RUN_LAYOUTS.CONCURRENT && log) {
      log(`WARN: SEAL_E2E_CONCURRENT=1 overrides SEAL_E2E_RUN_LAYOUT=${raw}.`);
    }
    raw = RUN_LAYOUTS.CONCURRENT;
  }
  const value = String(raw || "").toLowerCase();
  const allowed = new Set(Object.values(RUN_LAYOUTS));
  if (!allowed.has(value)) {
    if (log) log(`ERROR: invalid SEAL_E2E_RUN_LAYOUT=${raw}. Allowed: auto, shared, concurrent.`);
    process.exit(1);
  }
  if (!e2eRoot) {
    env.SEAL_E2E_RUN_LAYOUT = RUN_LAYOUTS.CONCURRENT;
    return { layout: RUN_LAYOUTS.CONCURRENT, lockOwned: false, lockPath: "" };
  }
  ensureDir(e2eRoot);
  if (value === RUN_LAYOUTS.CONCURRENT) {
    env.SEAL_E2E_RUN_LAYOUT = RUN_LAYOUTS.CONCURRENT;
    return { layout: RUN_LAYOUTS.CONCURRENT, lockOwned: false, lockPath: "" };
  }

  const lockPath = path.join(e2eRoot, "run.lock");
  const lock = tryAcquireRunLock(lockPath, log);
  if (!lock.ok && lock.reason === "lock_error") {
    const msg = lock.error && lock.error.message ? lock.error.message : String(lock.error || "unknown error");
    if (log) log(`ERROR: failed to acquire E2E run lock (${lockPath}): ${msg}`);
    process.exit(1);
  }
  if (lock.ok) {
    env.SEAL_E2E_RUN_LAYOUT = RUN_LAYOUTS.SHARED;
    return { layout: RUN_LAYOUTS.SHARED, lockOwned: true, lockPath, lockInfo: lock.info };
  }

  if (value === RUN_LAYOUTS.SHARED) {
    if (log) {
      const owner = lock.info && lock.info.pid ? `pid=${lock.info.pid}` : "unknown";
      log(`ERROR: shared E2E run is busy (${owner}). Use SEAL_E2E_RUN_LAYOUT=concurrent to force a separate run.`);
    }
    process.exit(1);
  }

  if (log) {
    const owner = lock.info && lock.info.pid ? `pid=${lock.info.pid}` : "unknown";
    log(`WARN: shared E2E run is busy (${owner}); falling back to concurrent-runs.`);
  }
  env.SEAL_E2E_RUN_LAYOUT = RUN_LAYOUTS.CONCURRENT;
  return { layout: RUN_LAYOUTS.CONCURRENT, lockOwned: false, lockPath, lockInfo: lock.info, fallback: true };
}

function cleanupOldRuns(runsRoot, keepRunId) {
  if (!runsRoot || !fs.existsSync(runsRoot)) return;
  const entries = fs.readdirSync(runsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name === keepRunId) continue;
    removeDirSafe(path.join(runsRoot, name));
  }
}

function cleanupTmpDirs(state) {
  if (!state || state.keepTmp) return;
  const { runRoot, tmpRoot, exampleRoot, cleanupExample } = state;
  if (tmpRoot && runRoot && tmpRoot.startsWith(`${runRoot}${path.sep}`)) {
    removeDirSafe(tmpRoot);
  }
  if (cleanupExample && exampleRoot && runRoot && exampleRoot.startsWith(`${runRoot}${path.sep}`)) {
    removeDirSafe(exampleRoot);
  }
}

function registerCleanupHandlers(state) {
  if (!state) return;
  if (state.cleanupRegistered) return;
  state.cleanupRegistered = true;
  const handler = () => {
    cleanupTmpDirs(state);
    if (state.cleanupRunRoot && state.runRoot && !state.keepRuns) {
      removeDirSafe(state.runRoot);
    }
    if (state.cleanupRunsRoot && !state.keepRuns) {
      cleanupOldRuns(state.runsRoot, state.runId);
    }
    if (state.lockOwned && state.lockPath) {
      releaseRunLock(state.lockPath);
    }
  };
  process.on("exit", handler);
  process.on("SIGINT", () => {
    handler();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    handler();
    process.exit(143);
  });
}

function resolveRunMode(env, log, options = {}) {
  const forcedMode = options.forceMode || "";
  const rawMode = env.SEAL_E2E_RUN_MODE;
  const fallbackMode = options.defaultMode || (isEnabled(env, "SEAL_E2E_PARALLEL") ? RUN_MODES.PARALLEL : RUN_MODES.SINGLE);
  let mode = rawMode ? String(rawMode).toLowerCase() : fallbackMode;
  if (mode !== RUN_MODES.SINGLE && mode !== RUN_MODES.PARALLEL) {
    if (typeof log === "function") {
      log(`ERROR: invalid SEAL_E2E_RUN_MODE=${rawMode}. Allowed: single, parallel.`);
    }
    process.exit(1);
  }
  if (forcedMode) {
    if (rawMode && mode !== forcedMode && typeof log === "function") {
      log(`WARN: SEAL_E2E_RUN_MODE=${rawMode} ignored; forcing ${forcedMode}.`);
    }
    mode = forcedMode;
  }
  env.SEAL_E2E_RUN_MODE = mode;
  return mode;
}

function resolveRunId(env, runMode, makeRunId, log, options = {}) {
  const hasRunIdOverride = Boolean(env.SEAL_E2E_RUN_ID);
  const isParallel = env.SEAL_E2E_PARALLEL_CHILD === "1" || runMode === "parallel";
  const allowCurrent = options.allowCurrent === true;
  const forceUnique = options.forceUnique === true;
  let runId = hasRunIdOverride
    ? env.SEAL_E2E_RUN_ID
    : (isParallel && !allowCurrent ? makeRunId() : "current");
  if (runMode === "parallel" && runId === "current" && !allowCurrent) {
    if (typeof log === "function") {
      log("SEAL_E2E_RUN_ID=current is reserved for non-parallel runs; generating a unique run id.");
    }
    runId = makeRunId();
  }
  if (forceUnique && (!runId || runId === "current")) {
    if (typeof log === "function") {
      log("SEAL_E2E_RUN_ID=current ignored for concurrent run; generating a unique run id.");
    }
    runId = makeRunId();
  }
  env.SEAL_E2E_RUN_ID = runId;
  return { runId, isParallel, hasRunIdOverride };
}

function prepareRunLayout(options) {
  const log = typeof options.log === "function" ? options.log : null;
  const {
    env,
    repoRoot,
    resolveE2ERoot,
    e2eRoot: e2eRootOverride,
    runId,
    runMode,
    runLayout,
    isParallel,
    hasRunIdOverride,
    keepRuns,
    ensureExampleBase = false,
  } = options;
  const e2eRoot = e2eRootOverride || resolveE2ERoot({ env, repoRoot });
  if (e2eRoot) {
    env.SEAL_E2E_ROOT = e2eRoot;
    ensureDir(e2eRoot);
  }
  const rawLayout = runLayout || env.SEAL_E2E_RUN_LAYOUT || RUN_LAYOUTS.SHARED;
  const layout = rawLayout === RUN_LAYOUTS.AUTO ? RUN_LAYOUTS.SHARED : rawLayout;
  const sharedRoot = e2eRoot ? path.join(e2eRoot, "run") : "";
  const concurrentRoot = e2eRoot ? path.join(e2eRoot, "concurrent-runs") : "";
  const runsRoot = concurrentRoot;
  const runRoot = layout === "shared"
    ? sharedRoot
    : (concurrentRoot ? path.join(concurrentRoot, runId) : "");
  env.SEAL_E2E_RUN_LAYOUT = layout;
  if (runRoot) {
    env.SEAL_E2E_RUN_ROOT = runRoot;
  }
  const parallel = typeof isParallel === "boolean" ? isParallel : runMode === "parallel";
  if (runRoot && !hasRunIdOverride && !keepRuns) {
    if (layout === "shared" || !parallel) {
      removeDirSafe(runRoot);
    }
  }
  if (layout === "concurrent" && concurrentRoot) {
    ensureDir(concurrentRoot);
  }
  if (runRoot) ensureDir(runRoot);

  const isUnderRunRoot = (value) => {
    if (!value || !runRoot) return false;
    return value === runRoot || value.startsWith(`${runRoot}${path.sep}`);
  };
  const allowExternalTmp = isEnabled(env, "SEAL_E2E_TMP_ALLOW_EXTERNAL");
  let tmpRoot = env.SEAL_E2E_TMP_ROOT || "";
  if (tmpRoot && !isUnderRunRoot(tmpRoot)) {
    if (!allowExternalTmp) {
      if (log) {
        log(`WARN: SEAL_E2E_TMP_ROOT ignored (outside run root); using ${runRoot ? path.join(runRoot, "tmp") : "<auto>"}.`);
      }
      tmpRoot = "";
    }
  }
  if (!tmpRoot) {
    tmpRoot = runRoot ? path.join(runRoot, "tmp") : "";
  }
  if (tmpRoot) {
    env.SEAL_E2E_TMP_ROOT = tmpRoot;
    env.TMPDIR = tmpRoot;
    env.TMP = tmpRoot;
    env.TEMP = tmpRoot;
    ensureDir(tmpRoot);
  }

  const exampleRootBase = ensureExampleBase && runRoot ? path.join(runRoot, "workers") : "";
  if (exampleRootBase) ensureDir(exampleRootBase);

  return { e2eRoot, runsRoot, runRoot, tmpRoot, exampleRootBase };
}

function resolveRunContext(options) {
  const env = options.env || process.env;
  const log = options.log;
  const repoRoot = options.repoRoot || "";
  const resolveE2ERoot = options.resolveE2ERoot;
  const runMode = options.runMode || resolveRunMode(env, log, options.runModeOptions);
  const keepRuns = options.keepRuns === true;
  let e2eRoot = options.e2eRoot || (resolveE2ERoot ? resolveE2ERoot({ env, repoRoot }) : "");
  const runLayoutState = resolveRunLayout({ env, log, e2eRoot });
  const runIdState = resolveRunId(env, runMode, options.makeRunId, log, {
    allowCurrent: runLayoutState.layout === "shared",
    forceUnique: runLayoutState.layout === "concurrent",
  });
  const layoutState = prepareRunLayout({
    env,
    log,
    repoRoot,
    resolveE2ERoot,
    e2eRoot,
    runId: runIdState.runId,
    runMode,
    runLayout: runLayoutState.layout,
    isParallel: runIdState.isParallel,
    hasRunIdOverride: runIdState.hasRunIdOverride,
    keepRuns,
    ensureExampleBase: options.ensureExampleBase,
  });
  e2eRoot = layoutState.e2eRoot || e2eRoot;
  return {
    runMode,
    runId: runIdState.runId,
    isParallel: runIdState.isParallel,
    hasRunIdOverride: runIdState.hasRunIdOverride,
    runLayout: runLayoutState.layout,
    runLayoutFallback: runLayoutState.fallback === true,
    lockOwned: runLayoutState.lockOwned,
    lockPath: runLayoutState.lockPath,
    e2eRoot,
    runsRoot: layoutState.runsRoot,
    runRoot: layoutState.runRoot,
    tmpRoot: layoutState.tmpRoot,
    exampleRootBase: layoutState.exampleRootBase,
  };
}

function setupRunCleanup(options) {
  const env = options.env || process.env;
  const log = options.log;
  const state = {
    runId: options.runId,
    runRoot: options.runRoot,
    runsRoot: options.runsRoot,
    tmpRoot: options.tmpRoot,
    exampleRoot: options.exampleRoot,
    cleanupExample: options.cleanupExample,
    keepTmp: options.keepTmp,
    keepRuns: options.keepRuns,
    cleanupRunRoot: options.runLayout === "concurrent",
    cleanupRunsRoot: false,
    lockOwned: options.lockOwned,
    lockPath: options.lockPath,
    isParallelChild: options.isParallelChild,
    cleanupRegistered: false,
  };
  registerCleanupHandlers(state);
  if (env.SEAL_E2E_GC === "1" && options.runsRoot) {
    if (options.runLayout === "concurrent") {
      if (log) log("NOTE: SEAL_E2E_GC skipped for concurrent runs; use it when no concurrent runs are active.");
    } else {
      cleanupOldRuns(options.runsRoot, options.runId);
    }
  }
  return state;
}

module.exports = {
  ensureDir,
  removeDirSafe,
  cleanupOldRuns,
  registerCleanupHandlers,
  resolveRunLayout,
  resolveRunMode,
  resolveRunId,
  releaseRunLock,
  prepareRunLayout,
  resolveRunContext,
  setupRunCleanup,
};
