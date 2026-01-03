#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const RUNNER = path.join(SCRIPT_DIR, "run-e2e-suite.sh");
const {
  ensureSummaryFile,
  updateLastSummaryFile,
  parseSummaryRows,
  formatSummaryRow,
  printCategorySummary,
  printStatusList,
  printTimingSummary,
  countStatuses,
  logRerunHint,
  writeJsonSummaryReport,
} = require("./e2e-report");
const { loadE2EConfig, resolveE2ERoot, resolveE2EPaths, resolveRerunFrom, isPlanMode } = require("./e2e-runner-config");
const { ensureDir, resolveRunContext, setupRunCleanup, removeDirSafe, autoCleanE2ERoot, pruneE2EHistory } = require("./e2e-runner-fs");
const {
  assertEscalated,
  makeRunId,
  formatDuration,
  normalizeFlag,
  safeName,
  logEffectiveConfig,
  formatConfigLine,
  buildRunConfigLines,
  buildTimingRows,
  isEnabled,
  logE2EDiskSummary,
} = require("./e2e-runner-utils");
const { preparePlan, applyRerunFailedFilters } = require("./e2e-runner-plan");

function log(msg) {
  process.stdout.write(`[seal-e2e-parallel] ${msg}\n`);
}

function intersectLists(left, right) {
  const set = new Set(left);
  return right.filter((item) => set.has(item));
}

function isNumber(value) {
  return /^[0-9]+$/.test(String(value || ""));
}

function dirHasFiles(dir) {
  try {
    return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

function canWritePath(target) {
  if (!target) return false;
  let probe = target;
  while (probe && !fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  if (!probe) return false;
  try {
    fs.accessSync(probe, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function detectCgroupCpuLimit() {
  try {
    const cpuMax = "/sys/fs/cgroup/cpu.max";
    if (fs.existsSync(cpuMax)) {
      const raw = fs.readFileSync(cpuMax, "utf8").trim();
      const [quota, period] = raw.split(/\s+/);
      if (quota && period && quota !== "max" && isNumber(quota) && isNumber(period) && Number(period) > 0) {
        const limit = Math.max(1, Math.floor(Number(quota) / Number(period)));
        return limit;
      }
    }
    const quotaPath = "/sys/fs/cgroup/cpu/cpu.cfs_quota_us";
    const periodPath = "/sys/fs/cgroup/cpu/cpu.cfs_period_us";
    if (fs.existsSync(quotaPath) && fs.existsSync(periodPath)) {
      const quota = fs.readFileSync(quotaPath, "utf8").trim();
      const period = fs.readFileSync(periodPath, "utf8").trim();
      if (quota !== "-1" && isNumber(quota) && isNumber(period) && Number(period) > 0) {
        const limit = Math.max(1, Math.floor(Number(quota) / Number(period)));
        return limit;
      }
    }
  } catch (err) {
    return null;
  }
  return null;
}

function writeCombinedSummary(summaryPath, groupOrder, groupSummary, syntheticRows) {
  if (!summaryPath) return;
  ensureSummaryFile(summaryPath, { append: false });
  const writtenTests = new Set();
  for (const group of groupOrder) {
    const file = groupSummary[group];
    if (!file || !fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith("group\t")) continue;
      const cols = line.split("\t");
      if (cols[1]) {
        writtenTests.add(cols[1]);
      }
      fs.appendFileSync(summaryPath, `${line}\n`, "utf8");
    }
  }
  if (Array.isArray(syntheticRows) && syntheticRows.length) {
    for (const row of syntheticRows) {
      if (!row || !row.test || writtenTests.has(row.test)) {
        continue;
      }
      const line = formatSummaryRow(row);
      fs.appendFileSync(summaryPath, `${line}\n`, "utf8");
      writtenTests.add(row.test);
    }
  }
}

function spawnRunner(env, label) {
  const child = spawn("bash", [RUNNER], { env, stdio: "inherit" });
  const start = Date.now();
  const promise = new Promise((resolve) => {
    let settled = false;
    const finish = (code, signal) => {
      if (settled) return;
      settled = true;
      const duration = Math.floor((Date.now() - start) / 1000);
      resolve({
        label,
        code: code === null ? 1 : code,
        signal: signal || "",
        duration,
      });
    };
    child.on("error", () => finish(1, "error"));
    child.on("close", (code, signal) => {
      finish(code, signal);
    });
  });
  return { child, promise };
}

function createWorkerRoot(parent, label) {
  fs.mkdirSync(parent, { recursive: true });
  const root = path.join(parent, safeName(label));
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  return root;
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
    runModeOptions: { forceMode: "parallel", defaultMode: "parallel" },
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

  const manifestPath = env.SEAL_E2E_MANIFEST || path.join(SCRIPT_DIR, "e2e-tests.json5");
  const manifestStrict = normalizeFlag(env.SEAL_E2E_MANIFEST_STRICT, "1") === "1";
  const {
    cacheRoot,
    cacheBin,
    summaryPath,
    summaryLastPath,
    logDir,
  } = resolveE2EPaths({ env, e2eRoot, runId });
  const logRoot = logDir;
  const summaryGroupRoot = summaryPath ? path.join(path.dirname(summaryPath), "groups", runId) : "";
  if (summaryGroupRoot) ensureDir(summaryGroupRoot);
  const getSummaryPath = (label, fallbackRoot) => {
    if (summaryGroupRoot) return path.join(summaryGroupRoot, `${safeName(label)}.tsv`);
    return path.join(fallbackRoot, ".e2e-summary.tsv");
  };
  const failFast = normalizeFlag(env.SEAL_E2E_FAIL_FAST, "0");
  const remoteE2e = normalizeFlag(env.SEAL_E2E_SSH || env.SEAL_SHIP_SSH_E2E, "0");
  const keepTmp = isEnabled(env, "SEAL_E2E_KEEP_TMP");
  const parallelMode = env.SEAL_E2E_PARALLEL_MODE || "groups";
  const allowedModes = new Set(["groups", "per-test"]);
  if (!allowedModes.has(parallelMode)) {
    log(`ERROR: invalid SEAL_E2E_PARALLEL_MODE=${parallelMode}. Allowed: groups, per-test.`);
    process.exit(1);
  }

  const seedUser = env.SUDO_USER || env.USER || "unknown";
  const exampleSrc = path.join(REPO_ROOT, "tools", "seal", "example");
  const cacheUnderExample = cacheRoot && (cacheRoot === exampleSrc || cacheRoot.startsWith(`${exampleSrc}${path.sep}`));
  const seedRootDefault = cacheUnderExample
    ? path.join(process.cwd(), "seal-out", "e2e", "seed", seedUser)
    : path.join(cacheRoot, "e2e-seed", seedUser);
  const seedRootEnv = env.SEAL_E2E_SEED_ROOT || "";
  let seedRoot = seedRootEnv || seedRootDefault;
  if (!seedRootEnv && !canWritePath(seedRoot)) {
    const fallback = cacheRoot
      ? path.join(cacheRoot, "e2e-seed", seedUser)
      : path.join(process.cwd(), "seal-out", "e2e", `seed-${seedUser}-${Date.now()}`);
    log(`WARN: seed root not writable (${seedRoot}); using ${fallback}`);
    seedRoot = fallback;
  }

  let exampleRootParent = exampleRootBase || tmpRoot || path.join(process.cwd(), "seal-out", "e2e", "workers");
  let createdWorkerParent = false;
  if (exampleRootParent) {
    const exampleSrc = path.join(REPO_ROOT, "tools", "seal", "example");
    if (exampleRootParent === exampleSrc || exampleRootParent.startsWith(`${exampleSrc}${path.sep}`)) {
      const base = path.join(process.cwd(), "seal-out", "e2e");
      exampleRootParent = path.join(base, "workers", runId);
      fs.mkdirSync(exampleRootParent, { recursive: true });
      createdWorkerParent = true;
      log(`WARN: exampleRootParent inside example source; using ${exampleRootParent}`);
    }
  }
  let safeRootsEnv = env.SEAL_E2E_SAFE_ROOTS || "";
  if (cacheRoot) {
    safeRootsEnv = safeRootsEnv ? `${safeRootsEnv}:${cacheRoot}` : cacheRoot;
  }
  if (e2eRoot) {
    safeRootsEnv = safeRootsEnv ? `${safeRootsEnv}:${e2eRoot}` : e2eRoot;
  }
  if (tmpRoot) {
    safeRootsEnv = safeRootsEnv ? `${safeRootsEnv}:${tmpRoot}` : tmpRoot;
  }
  if (exampleRootBase) {
    safeRootsEnv = safeRootsEnv ? `${safeRootsEnv}:${exampleRootBase}` : exampleRootBase;
  }
  if (exampleRootParent) {
    safeRootsEnv = safeRootsEnv ? `${safeRootsEnv}:${exampleRootParent}` : exampleRootParent;
  }
  if (seedRoot) {
    safeRootsEnv = safeRootsEnv ? `${safeRootsEnv}:${seedRoot}` : seedRoot;
  }

  setupRunCleanup({
    env,
    log,
    runId,
    runRoot,
    runsRoot,
    tmpRoot,
    exampleRoot: exampleRootBase,
    cleanupExample: true,
    keepTmp: isEnabled(env, "SEAL_E2E_KEEP_TMP"),
    keepRuns,
    runLayout,
    lockOwned,
    lockPath,
    isParallelChild: isEnabled(env, "SEAL_E2E_PARALLEL_CHILD"),
  });

  const cleanupWorkerParent = () => {
    if (!keepTmp && createdWorkerParent && exampleRootParent) {
      removeDirSafe(exampleRootParent);
    }
  };
  process.on("exit", cleanupWorkerParent);
  process.on("SIGINT", () => {
    cleanupWorkerParent();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanupWorkerParent();
    process.exit(143);
  });

  let defaultJobs = 4;
  if (Array.isArray(os.cpus()) && os.cpus().length) {
    defaultJobs = os.cpus().length;
  }
  const cgroupLimit = detectCgroupCpuLimit();
  if (cgroupLimit && defaultJobs > cgroupLimit) {
    defaultJobs = cgroupLimit;
  }
  let jobs = defaultJobs;
  if (env.SEAL_E2E_JOBS && isNumber(env.SEAL_E2E_JOBS)) {
    jobs = Number(env.SEAL_E2E_JOBS);
  }
  if (cgroupLimit && jobs > cgroupLimit) {
    log(`Capping jobs to cgroup limit: ${jobs} -> ${cgroupLimit}`);
    jobs = cgroupLimit;
  }
  if (jobs < 1) jobs = 1;

  const planMode = isPlanMode(env);
  const rerunFailed = normalizeFlag(env.SEAL_E2E_RERUN_FAILED, "0") === "1";
  const rerunFrom = resolveRerunFrom(env, summaryPath, summaryLastPath);
  const adjustFilters = ({ onlyList, skipList }) => {
    return applyRerunFailedFilters({
      onlyList,
      skipList,
      rerunFailed,
      rerunFrom,
      log,
      intersect: intersectLists,
      emptyExitCode: 1,
    });
  };

  const {
    manifestOrder,
    testByName,
    capabilities,
    plan,
    selectedTests,
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
  const hostLimited = capabilities.limitedHost;

  const effectiveLines = [
    ...buildRunConfigLines({
      runLayout,
      runId,
      runRoot,
    }),
    formatConfigLine([
      { key: "jobs", value: jobs },
      { key: "cgroup_limit", value: cgroupLimit || "none" },
      { key: "mode", value: parallelMode },
      { key: "fail_fast", value: failFast },
    ]),
    formatConfigLine([
      { key: "tests", value: env.SEAL_E2E_TESTS || "<all>" },
      { key: "skip", value: env.SEAL_E2E_SKIP || "<none>" },
      { key: "limited_host", value: hostLimited ? 1 : 0 },
    ]),
    formatConfigLine([
      { key: "summary", value: summaryPath },
      { key: "last", value: summaryLastPath || "<none>" },
    ]),
    formatConfigLine([
      { key: "log_root", value: logRoot },
      { key: "seed_root", value: seedRoot },
      { key: "tmp_root", value: tmpRoot },
    ]),
    formatConfigLine([
      { key: "node_modules_root", value: env.SEAL_E2E_NODE_MODULES_ROOT || "<none>" },
    ]),
    formatConfigLine([
      { key: "auto_clean", value: env.SEAL_E2E_AUTO_CLEAN || "0" },
      { key: "disk_warn_gb", value: env.SEAL_E2E_SEAL_OUT_WARN_GB || "" },
    ]),
    formatConfigLine([
      { key: "summary_keep", value: env.SEAL_E2E_SUMMARY_KEEP || "" },
      { key: "log_keep", value: env.SEAL_E2E_LOG_KEEP || "" },
    ]),
  ].filter(Boolean);
  logEffectiveConfig(log, effectiveLines);

  const heartbeatSec = Number(env.SEAL_E2E_RUNNER_HEARTBEAT_SEC || "0");
  let heartbeatTimer = null;
  if (heartbeatSec > 0) {
    heartbeatTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - runStart) / 1000);
      log(`HEARTBEAT: e2e-parallel running (${formatDuration(elapsed)})`);
    }, heartbeatSec * 1000);
    if (heartbeatTimer && typeof heartbeatTimer.unref === "function") heartbeatTimer.unref();
  }

  const prepareSeed = normalizeFlag(env.SEAL_E2E_PREPARE_SEED, "1") === "1";
  if (prepareSeed) {
    log("Preparing shared example seed...");
    const seedEnv = {
      ...env,
      SEAL_E2E_TMP_ROOT: "",
      TMPDIR: "",
      TMP: "",
      TEMP: "",
      SEAL_E2E_SETUP_ONLY: "1",
      SEAL_E2E_EXAMPLE_ROOT: seedRoot,
      SEAL_E2E_COPY_EXAMPLE: "1",
      SEAL_E2E_RUN_LAYOUT: "concurrent",
      SEAL_E2E_SAFE_ROOTS: safeRootsEnv,
    };
    await new Promise((resolve, reject) => {
      const child = spawn(RUNNER, [], { env: seedEnv, stdio: "inherit" });
      child.on("error", (err) => {
        reject(new Error(`Seed preparation spawn failed: ${err && err.message ? err.message : String(err)}`));
      });
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Seed preparation failed (exit=${code})`));
      });
    }).catch((err) => {
      log(`ERROR: ${err.message}`);
      process.exit(1);
    });
  }

  const useSharedNodeModules = normalizeFlag(env.SEAL_E2E_USE_SHARED_NODE_MODULES, "1") === "1";
  let nodeModulesRoot = env.SEAL_E2E_NODE_MODULES_ROOT || "";
  if (!nodeModulesRoot && useSharedNodeModules && fs.existsSync(path.join(seedRoot, "node_modules"))) {
    nodeModulesRoot = path.join(seedRoot, "node_modules");
  }
  if (nodeModulesRoot) {
    log(`Using shared node_modules: ${nodeModulesRoot}`);
  }
  const sharedNodeModulesReady = nodeModulesRoot ? dirHasFiles(nodeModulesRoot) : false;

  const groupTests = new Map();
  const groupOrder = [];
  const serialTests = [];
  if (parallelMode === "per-test") {
    for (const name of manifestOrder) {
      const test = testByName.get(name);
      if (!test) continue;
      if (test.parallel !== "1") {
        serialTests.push(name);
        continue;
      }
      groupTests.set(name, [name]);
      groupOrder.push(name);
    }
  } else {
    for (const name of manifestOrder) {
      const test = testByName.get(name);
      if (!test) continue;
      if (test.parallel !== "1") {
        serialTests.push(name);
        continue;
      }
      const category = test.category || "misc";
      if (!groupTests.has(category)) {
        groupTests.set(category, [name]);
        groupOrder.push(category);
      } else {
        groupTests.get(category).push(name);
      }
    }
  }

  const filteredGroups = [];
  const groupTestsFiltered = new Map();
  for (const group of groupOrder) {
    const testsList = groupTests.get(group) || [];
    const filtered = testsList.filter(shouldRun);
    if (!filtered.length) {
      log(`Skipping group ${group} (no tests after filters)`);
      continue;
    }
    groupTestsFiltered.set(group, filtered);
    filteredGroups.push(group);
  }

  const serialFiltered = serialTests.filter(shouldRun);

  const groupSummary = {};
  const groupDurations = {};
  const groupStatus = {};
  const abortedRows = [];
  const abortedTests = new Set();
  let failures = 0;
  let skipSerial = false;

  const addAbortedRow = (group, testName) => {
    if (!testName || abortedTests.has(testName)) return;
    const test = testByName.get(testName);
    if (!test) return;
    abortedTests.add(testName);
    abortedRows.push({
      group,
      test: testName,
      status: "aborted",
      duration: 0,
      category: test.category || "misc",
      parallel: test.parallel || "0",
      skipRisk: test.skipRisk || "",
      description: test.description || "",
      logPath: "",
      failHint: "aborted by fail-fast",
    });
  };

  const markGroupAborted = (group) => {
    if (groupStatus[group]) return;
    groupStatus[group] = "aborted";
    groupDurations[group] = 0;
    const testsList = groupTestsFiltered.get(group) || [];
    for (const testName of testsList) {
      addAbortedRow(group, testName);
    }
  };

  function runGroup(group, testsList, root) {
    const summaryFile = getSummaryPath(group, root);
    const logDir = logRoot ? path.join(logRoot, safeName(group)) : path.join(root, ".e2e-logs");
    const exampleDeps = (nodeModulesRoot && sharedNodeModulesReady)
      ? "0"
      : (env.SEAL_E2E_INSTALL_EXAMPLE_DEPS || "1");
    groupSummary[group] = summaryFile;
    log(`Group ${group}: ${testsList.join(",")} (root=${root})`);
    const childEnv = {
      ...env,
      SEAL_E2E_TMP_ROOT: "",
      TMPDIR: "",
      TMP: "",
      TEMP: "",
      SEAL_E2E_TESTS: testsList.join(","),
      SEAL_E2E_SKIP: env.SEAL_E2E_SKIP || "",
      SEAL_E2E_CACHE_DIR: cacheRoot,
      SEAL_E2E_CACHE_BIN: cacheBin,
      SEAL_E2E_EXAMPLE_ROOT: root,
      SEAL_E2E_COPY_EXAMPLE: "1",
      SEAL_E2E_INSTALL_EXAMPLE_DEPS: exampleDeps,
      SEAL_E2E_INSTALL_DEPS: "0",
      SEAL_E2E_INSTALL_PACKERS: "0",
      SEAL_E2E_INSTALL_OBFUSCATORS: "0",
      SEAL_E2E_RUN_LAYOUT: "concurrent",
      SEAL_E2E_SSH: remoteE2e,
      SEAL_E2E_GROUP: group,
      SEAL_E2E_SUMMARY_PATH: summaryFile,
      SEAL_E2E_SUMMARY_SCOPE: "selected",
      SEAL_E2E_SUMMARY_APPEND: "0",
      SEAL_E2E_LOG_DIR: logDir,
      SEAL_E2E_RERUN_FAILED: "0",
      SEAL_E2E_FAIL_FAST: failFast,
      SEAL_E2E_SAFE_ROOTS: safeRootsEnv,
      SEAL_E2E_PARALLEL_CHILD: "1",
    };
    if (nodeModulesRoot) {
      childEnv.SEAL_E2E_NODE_MODULES_ROOT = nodeModulesRoot;
    }
    return spawnRunner(childEnv, group);
  }

  async function runGroupsParallel(groups) {
    if (!groups.length) return;
    if (jobs <= 1) {
      for (const group of groups) {
        const root = createWorkerRoot(exampleRootParent, `group-${group}`);
        const start = Date.now();
        const task = runGroup(group, groupTestsFiltered.get(group) || [], root);
        const result = await task.promise;
        const duration = Math.floor((Date.now() - start) / 1000);
        groupDurations[group] = duration;
        if (result.code === 0) {
          groupStatus[group] = "ok";
        } else {
          groupStatus[group] = "failed";
          failures += 1;
        }
        if (!keepTmp) {
          removeDirSafe(root);
        }
      }
      return;
    }

    const queue = [...groups];
    const running = new Map();
    let failFastTriggered = false;

    const startNext = () => {
      while (!failFastTriggered && running.size < jobs && queue.length) {
        const group = queue.shift();
        const root = createWorkerRoot(exampleRootParent, `group-${group}`);
        const start = Date.now();
        const task = runGroup(group, groupTestsFiltered.get(group) || [], root);
        running.set(group, task.child);
        task.promise.then((result) => {
          const duration = Math.floor((Date.now() - start) / 1000);
          groupDurations[group] = duration;
          if (result.code === 0) {
            groupStatus[group] = "ok";
          } else {
            groupStatus[group] = "failed";
            failures += 1;
            if (failFast === "1" && !failFastTriggered) {
              failFastTriggered = true;
              log("Fail-fast enabled; stopping remaining groups...");
              for (const [otherGroup, child] of running.entries()) {
                if (otherGroup !== group && child && child.kill) {
                  child.kill("SIGTERM");
                }
              }
              while (queue.length) {
                markGroupAborted(queue.shift());
              }
            }
          }
        })
          .finally(() => {
            if (!keepTmp) {
              removeDirSafe(root);
            }
            running.delete(group);
            if (queue.length) {
              startNext();
            }
          });
      }
    };

    startNext();

    await new Promise((resolve) => {
      const check = () => {
        if (running.size === 0 && (queue.length === 0 || failFastTriggered)) {
          resolve();
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });

    if (failFast === "1" && failures) {
      skipSerial = true;
    }
  }

  function printGroupSummary() {
    const entries = buildTimingRows(groupDurations, groupStatus);
    printTimingSummary({
      label: "Group timing summary:",
      entries,
      log,
      formatDuration,
    });
  }

  function printDetailedSummary(groupOrderList) {
    if (!Object.keys(groupSummary).length) return;
    log("Detailed summary:");
    for (const group of groupOrderList) {
      const summaryFile = groupSummary[group];
      const status = groupStatus[group] || "unknown";
      const wallTime = groupDurations[group] || 0;
      let testSum = 0;
      let hasTests = false;
      const rows = parseSummaryRows(summaryFile);
      for (const row of rows) {
        hasTests = true;
        testSum += row.duration || 0;
      }
      log(`Group ${group}  ${status}  (tests=${formatDuration(testSum)}, wall=${formatDuration(wallTime)})`);
      if (rows.length) {
        log("  Test | Status | Time | Category | SkipRisk | Description");
        for (const row of rows) {
          log(`  - ${row.test} | ${row.status} | ${formatDuration(row.duration || 0)} | ${row.category} | ${row.skipRisk} | ${row.description}`);
        }
      } else if (!hasTests) {
        if (status === "aborted") {
          log("  - aborted (fail-fast)");
        } else {
          log("  - no summary data");
        }
      }
    }
  }

  function printCombinedSummary(summaryRows, orderList) {
    const totals = countStatuses(orderList, summaryRows);
    log(`Combined stats: total=${totals.total}, ok=${totals.ok}, skipped=${totals.skipped}, failed=${totals.failed}, aborted=${totals.aborted}`);
    log(`Summary file: ${summaryPath}`);
    if (summaryLastPath) {
      log(`Summary last: ${summaryLastPath}`);
    }
    logRerunHint({
      failedCount: totals.failed,
      summaryPath,
      summaryLastPath,
      log,
    });

    printCategorySummary({
      orderList,
      testByName,
      summaryRows,
      log,
      formatDuration,
      label: "Combined category summary:",
    });
    printStatusList({
      orderList,
      testByName,
      summaryRows,
      status: "failed",
      label: "Failures:",
      log,
    });
    printStatusList({
      orderList,
      testByName,
      summaryRows,
      status: "aborted",
      label: "Aborted:",
      log,
    });
  }

  await runGroupsParallel(filteredGroups);
  if (failures) {
    log(`Parallel groups failed: ${failures}`);
    printGroupSummary();
    printDetailedSummary(filteredGroups);
  }

  if (skipSerial) {
    for (const testName of serialFiltered) {
      markGroupAborted(testName);
    }
  } else {
    for (const test of serialFiltered) {
      const root = createWorkerRoot(exampleRootParent, `test-${test}`);
      const start = Date.now();
      const task = runGroup(test, [test], root);
      const result = await task.promise;
      const duration = Math.floor((Date.now() - start) / 1000);
      groupDurations[test] = duration;
      groupStatus[test] = result.code === 0 ? "ok" : "failed";
      groupSummary[test] = getSummaryPath(test, root);
      if (result.code !== 0) failures += 1;
      if (!keepTmp) {
        removeDirSafe(root);
      }
    }
  }

  if (failures) {
    log(`Serial groups failed: ${failures}`);
    printGroupSummary();
    printDetailedSummary([...filteredGroups, ...serialFiltered]);
  }

  printGroupSummary();
  printDetailedSummary([...filteredGroups, ...serialFiltered]);

  writeCombinedSummary(summaryPath, [...filteredGroups, ...serialFiltered], groupSummary, abortedRows);
  updateLastSummaryFile(summaryPath, summaryLastPath);

  const combinedRows = parseSummaryRows(summaryPath);
  const orderList = selectedTests;
  printCombinedSummary(combinedRows, orderList);

  const runEnd = Date.now();
  writeJsonSummaryReport({
    env,
    runId,
    manifestPath,
    manifestOrder,
    testByName,
    planByName: plan.byName,
    summaryRows: combinedRows,
    capabilities,
    summaryPath,
    runStart,
    runEnd,
    log,
  });

  logE2EDiskSummary(env, { e2eRoot, log });
  autoCleanE2ERoot({
    env,
    e2eRoot,
    runLayout,
    keepRuns,
    keepTmp,
    lockOwned,
    log,
  });
  pruneE2EHistory({
    env,
    e2eRoot,
    cacheRoot,
    runLayout,
    keepRuns,
    keepTmp,
    lockOwned,
    summaryPath,
    logDir: logRoot,
    log,
  });

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  cleanupWorkerParent();
  log("All E2E groups finished.");
  if (failures) {
    process.exit(1);
  }
}

main().catch((err) => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
