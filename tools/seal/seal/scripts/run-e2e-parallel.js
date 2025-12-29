#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn, spawnSync } = require("child_process");

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const RUNNER = path.join(SCRIPT_DIR, "run-e2e-suite.sh");
const {
  resolveJsonSummaryPath,
  ensureSummaryFile,
  updateLastSummaryFile,
  parseSummaryRows,
  formatSummaryRow,
  printCategorySummary,
  printStatusList,
  printTimingSummary,
  countStatuses,
  buildJsonSummary,
  writeJsonSummary,
} = require("./e2e-report");
const { loadE2EConfig, resolveSummaryPaths } = require("./e2e-runner-config");
const {
  assertEscalated,
  makeRunId,
  formatDuration,
  normalizeFlag,
  safeName,
  logEffectiveConfig,
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
  const child = spawn(RUNNER, [], { env, stdio: "inherit" });
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

async function main() {
  const env = process.env;
  loadE2EConfig(env, { repoRoot: REPO_ROOT, scriptDir: SCRIPT_DIR, log });
  assertEscalated(log);
  const runId = env.SEAL_E2E_RUN_ID || makeRunId();
  env.SEAL_E2E_RUN_ID = runId;
  const runStart = Date.now();

  const home = env.HOME || os.homedir();
  const cacheBin = env.SEAL_E2E_CACHE_BIN || path.join(home, ".cache", "seal", "bin");
  const cacheRoot = env.SEAL_E2E_CACHE_DIR || path.dirname(cacheBin);
  const manifestPath = env.SEAL_E2E_MANIFEST || path.join(SCRIPT_DIR, "e2e-tests.json5");
  const manifestStrict = normalizeFlag(env.SEAL_E2E_MANIFEST_STRICT, "1") === "1";
  const logRoot = env.SEAL_E2E_LOG_DIR || path.join(cacheRoot, "e2e-logs", runId);
  const { summaryPath, summaryLastPath } = resolveSummaryPaths({ env, cacheRoot, runId });
  const failFast = normalizeFlag(env.SEAL_E2E_FAIL_FAST, "0");
  const remoteE2e = normalizeFlag(env.SEAL_E2E_SSH || env.SEAL_SHIP_SSH_E2E, "0");
  const parallelMode = env.SEAL_E2E_PARALLEL_MODE || "groups";
  const allowedModes = new Set(["groups", "per-test"]);
  if (!allowedModes.has(parallelMode)) {
    log(`ERROR: invalid SEAL_E2E_PARALLEL_MODE=${parallelMode}. Allowed: groups, per-test.`);
    process.exit(1);
  }
  const tmpRoot = env.SEAL_E2E_TMP_ROOT || env.TMPDIR || "/tmp";
  fs.mkdirSync(tmpRoot, { recursive: true });

  const seedUser = env.SUDO_USER || env.USER || "unknown";
  const seedRootDefault = path.join(cacheRoot, "e2e-seed", seedUser);
  const seedRoot = env.SEAL_E2E_SEED_ROOT || seedRootDefault;

  let safeRootsEnv = env.SEAL_E2E_SAFE_ROOTS || "";
  if (cacheRoot) {
    safeRootsEnv = safeRootsEnv ? `${safeRootsEnv}:${cacheRoot}` : cacheRoot;
  }
  if (tmpRoot) {
    safeRootsEnv = safeRootsEnv ? `${safeRootsEnv}:${tmpRoot}` : tmpRoot;
  }

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

  const planMode = normalizeFlag(env.SEAL_E2E_PLAN || env.SEAL_E2E_EXPLAIN, "0") === "1";
  const rerunFailed = normalizeFlag(env.SEAL_E2E_RERUN_FAILED, "0") === "1";
  let rerunFrom = env.SEAL_E2E_RERUN_FROM || summaryPath;
  if (summaryLastPath) {
    rerunFrom = env.SEAL_E2E_RERUN_FROM || summaryLastPath;
  }
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
    `  jobs=${jobs} cgroup_limit=${cgroupLimit || "none"} mode=${parallelMode} fail_fast=${failFast}`,
    `  tests=${env.SEAL_E2E_TESTS || "<all>"} skip=${env.SEAL_E2E_SKIP || "<none>"} limited_host=${hostLimited ? 1 : 0}`,
    `  summary=${summaryPath} last=${summaryLastPath || "<none>"}`,
    `  log_root=${logRoot} seed_root=${seedRoot} tmp_root=${tmpRoot}`,
    `  node_modules_root=${env.SEAL_E2E_NODE_MODULES_ROOT || "<none>"}`,
  ];
  logEffectiveConfig(log, effectiveLines);

  const prepareSeed = normalizeFlag(env.SEAL_E2E_PREPARE_SEED, "1") === "1";
  if (prepareSeed) {
    log("Preparing shared example seed...");
    const seedEnv = {
      ...env,
      SEAL_E2E_SETUP_ONLY: "1",
      SEAL_E2E_EXAMPLE_ROOT: seedRoot,
      SEAL_E2E_COPY_EXAMPLE: "1",
      SEAL_E2E_SAFE_ROOTS: safeRootsEnv,
    };
    await new Promise((resolve, reject) => {
      const child = spawn(RUNNER, [], { env: seedEnv, stdio: "inherit" });
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
    const summaryFile = path.join(root, ".e2e-summary.tsv");
    const logDir = logRoot ? path.join(logRoot, safeName(group)) : path.join(root, ".e2e-logs");
    const exampleDeps = nodeModulesRoot ? "0" : (env.SEAL_E2E_INSTALL_EXAMPLE_DEPS || "1");
    groupSummary[group] = summaryFile;
    log(`Group ${group}: ${testsList.join(",")} (root=${root})`);
    const childEnv = {
      ...env,
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
      SEAL_E2E_SSH: remoteE2e,
      SEAL_E2E_GROUP: group,
      SEAL_E2E_SUMMARY_PATH: summaryFile,
      SEAL_E2E_SUMMARY_SCOPE: "selected",
      SEAL_E2E_SUMMARY_APPEND: "0",
      SEAL_E2E_LOG_DIR: logDir,
      SEAL_E2E_RERUN_FAILED: "0",
      SEAL_E2E_FAIL_FAST: failFast,
      SEAL_E2E_SAFE_ROOTS: safeRootsEnv,
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
        const root = fs.mkdtempSync(path.join(tmpRoot, `seal-example-e2e-${safeName(group)}-`));
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
      }
      return;
    }

    const queue = [...groups];
    const running = new Map();
    let failFastTriggered = false;

    const startNext = () => {
      while (!failFastTriggered && running.size < jobs && queue.length) {
        const group = queue.shift();
        const root = fs.mkdtempSync(path.join(tmpRoot, `seal-example-e2e-${safeName(group)}-`));
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
    const entries = Object.keys(groupDurations).map((name) => ({
      name,
      duration: groupDurations[name],
      status: groupStatus[name],
    }));
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
    if (totals.failed) {
      const rerunHint = summaryLastPath || summaryPath;
      log(`Rerun failed only: SEAL_E2E_RERUN_FAILED=1 SEAL_E2E_RERUN_FROM=${rerunHint}`);
    }

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
      const root = fs.mkdtempSync(path.join(tmpRoot, `seal-example-e2e-${safeName(test)}-`));
      const start = Date.now();
      const task = runGroup(test, [test], root);
      const result = await task.promise;
      const duration = Math.floor((Date.now() - start) / 1000);
      groupDurations[test] = duration;
      groupStatus[test] = result.code === 0 ? "ok" : "failed";
      groupSummary[test] = path.join(root, ".e2e-summary.tsv");
      if (result.code !== 0) failures += 1;
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

  const summaryJsonPath = resolveJsonSummaryPath(summaryPath, env);
  const runEnd = Date.now();
  const summaryData = buildJsonSummary({
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
  });
  writeJsonSummary(summaryJsonPath, summaryData);
  if (summaryJsonPath) {
    log(`Summary json: ${summaryJsonPath}`);
  }

  log("All E2E groups finished.");
  if (failures) {
    process.exit(1);
  }
}

main().catch((err) => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
