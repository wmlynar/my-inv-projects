#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn, spawnSync } = require("child_process");

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../../../..");
const RUNNER = path.join(SCRIPT_DIR, "run-e2e-suite.sh");
const { loadManifest } = require("./e2e-manifest");
const { detectCapabilities } = require("./e2e-capabilities");
const { resolveJsonSummaryPath, buildPlan, printPlan, buildJsonSummary, writeJsonSummary } = require("./e2e-report");
const { hasCommand } = require("./e2e-utils");
const {
  parseList,
  makeRunId,
  formatDuration,
  normalizeFlag,
  safeName,
} = require("./e2e-runner-utils");

function log(msg) {
  process.stdout.write(`[seal-e2e-parallel] ${msg}\n`);
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


function loadFailedTests(summaryFile) {
  if (!summaryFile || !fs.existsSync(summaryFile)) {
    return [];
  }
  const lines = fs.readFileSync(summaryFile, "utf8").split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    if (!line || line.startsWith("group\t")) continue;
    const cols = line.split("\t");
    if (cols.length < 3) continue;
    const status = cols[2];
    if (status === "failed" || status === "aborted") {
      out.push(cols[1]);
    }
  }
  return out;
}

function readSummary(summaryPath) {
  if (!summaryPath || !fs.existsSync(summaryPath)) {
    return [];
  }
  const lines = fs.readFileSync(summaryPath, "utf8").split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line || line.startsWith("group\t")) continue;
    const cols = line.split("\t");
    if (cols.length < 10) continue;
    rows.push({
      group: cols[0],
      test: cols[1],
      status: cols[2],
      duration: Number(cols[3] || 0),
      category: cols[4],
      parallel: cols[5],
      skipRisk: cols[6],
      description: cols[7],
      logPath: cols[8],
      failHint: cols[9],
    });
  }
  return rows;
}

function writeCombinedSummary(summaryPath, groupOrder, groupSummary, syntheticRows) {
  if (!summaryPath) return;
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  const header = "group\ttest\tstatus\tduration_s\tcategory\tparallel\tskip_risk\tdescription\tlog_path\tfail_hint\n";
  fs.writeFileSync(summaryPath, header, "utf8");
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
      const line = [
        row.group,
        row.test,
        row.status,
        row.duration,
        row.category,
        row.parallel,
        row.skipRisk,
        row.description,
        row.logPath,
        row.failHint,
      ].join("\t");
      fs.appendFileSync(summaryPath, `${line}\n`, "utf8");
      writtenTests.add(row.test);
    }
  }
}

function updateLastSummary(summaryPath, lastPath) {
  if (!summaryPath || !lastPath || !fs.existsSync(summaryPath)) return;
  fs.mkdirSync(path.dirname(lastPath), { recursive: true });
  const tmpPath = `${lastPath}.tmp.${process.pid}`;
  fs.copyFileSync(summaryPath, tmpPath);
  fs.renameSync(tmpPath, lastPath);
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
  ensureEscalation();
  const env = process.env;
  const runId = env.SEAL_E2E_RUN_ID || makeRunId();
  env.SEAL_E2E_RUN_ID = runId;
  const runStart = Date.now();

  const home = env.HOME || os.homedir();
  const cacheBin = env.SEAL_E2E_CACHE_BIN || path.join(home, ".cache", "seal", "bin");
  const cacheRoot = env.SEAL_E2E_CACHE_DIR || path.dirname(cacheBin);
  const manifestPath = env.SEAL_E2E_MANIFEST || path.join(SCRIPT_DIR, "e2e-tests.json5");
  const manifestStrict = normalizeFlag(env.SEAL_E2E_MANIFEST_STRICT, "1") === "1";
  const logRoot = env.SEAL_E2E_LOG_DIR || path.join(cacheRoot, "e2e-logs", runId);
  const summaryPath = env.SEAL_E2E_SUMMARY_PATH || path.join(cacheRoot, "e2e-summary", `run-${runId}.tsv`);
  const summaryLastPath = env.SEAL_E2E_SUMMARY_PATH ? "" : path.join(cacheRoot, "e2e-summary", "last.tsv");
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
  if (onlyList.length) {
    validateList("SEAL_E2E_TESTS", onlyList);
  }
  if (skipList.length) {
    validateList("SEAL_E2E_SKIP", skipList);
  }

  const planMode = normalizeFlag(env.SEAL_E2E_PLAN || env.SEAL_E2E_EXPLAIN, "0") === "1";
  const capabilities = detectCapabilities(env);
  const hostLimited = capabilities.limitedHost;
  if (hostLimited) {
    const hostOnlyList = tests
      .filter((test) => Array.isArray(test.requirements) && test.requirements.includes("host"))
      .map((test) => test.name);
    if (hostOnlyList.length) {
      log(`Host-limited mode: skipping host-only tests: ${hostOnlyList.join(" ")}`);
    }
  }

  const rerunFailed = normalizeFlag(env.SEAL_E2E_RERUN_FAILED, "0") === "1";
  let rerunFrom = env.SEAL_E2E_RERUN_FROM || summaryPath;
  if (summaryLastPath) {
    rerunFrom = env.SEAL_E2E_RERUN_FROM || summaryLastPath;
  }
  if (rerunFailed) {
    if (!rerunFrom) {
      log("WARN: SEAL_E2E_RERUN_FAILED=1 but no summary path is set.");
    } else {
      const failed = loadFailedTests(rerunFrom);
      if (!failed.length) {
        log(`No failed tests in ${rerunFrom}; nothing to rerun.`);
        process.exit(0);
      }
      if (onlyList.length) {
        onlyList = intersectLists(onlyList, failed);
      } else {
        onlyList = failed;
      }
      if (!onlyList.length) {
        log("No tests left after rerun/filters.");
        process.exit(1);
      }
      log(`Rerun failed tests only: ${onlyList.join(" ")}`);
    }
  }

  const onlySet = new Set(onlyList);
  const skipSet = new Set(skipList);

  const plan = buildPlan(manifestOrder, testByName, onlySet, skipSet, capabilities);
  const shouldRun = (name) => {
    const entry = plan.byName.get(name);
    return entry ? entry.run : false;
  };

  const selectedTests = plan.selected;
  if (onlySet.size && !selectedTests.length) {
    log("ERROR: filter resulted in zero tests to run.");
    process.exit(1);
  }
  if (onlyList.length) {
    log(`Selected tests: ${onlyList.join(" ")}`);
  }

  if (planMode) {
    printPlan(plan.entries, testByName, capabilities, log);
    process.exit(0);
  }

  const missingScripts = [];
  for (const name of selectedTests) {
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

  log("Effective config:");
  log(`  jobs=${jobs} cgroup_limit=${cgroupLimit || "none"} mode=${parallelMode} fail_fast=${failFast}`);
  log(`  tests=${env.SEAL_E2E_TESTS || "<all>"} skip=${env.SEAL_E2E_SKIP || "<none>"} limited_host=${hostLimited ? 1 : 0}`);
  log(`  summary=${summaryPath} last=${summaryLastPath || "<none>"}`);
  log(`  log_root=${logRoot} seed_root=${seedRoot} tmp_root=${tmpRoot}`);
  log(`  node_modules_root=${env.SEAL_E2E_NODE_MODULES_ROOT || "<none>"}`);

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
    if (!entries.length) return;
    log("Group timing summary:");
    entries.sort((a, b) => b.duration - a.duration);
    for (const entry of entries) {
      log(`  - ${entry.name}  ${entry.status}  (${formatDuration(entry.duration)})`);
    }
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
      const rows = readSummary(summaryFile);
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
    const statusByTest = {};
    const durationByTest = {};
    const descByTest = {};
    const skipRiskByTest = {};
    const hintByTest = {};
    const logPathByTest = {};
    for (const row of summaryRows) {
      statusByTest[row.test] = row.status;
      durationByTest[row.test] = row.duration;
      descByTest[row.test] = row.description;
      skipRiskByTest[row.test] = row.skipRisk;
      hintByTest[row.test] = row.failHint;
      logPathByTest[row.test] = row.logPath;
    }

    let ok = 0;
    let skipped = 0;
    let failed = 0;
    let aborted = 0;
    for (const test of orderList) {
      const status = statusByTest[test] || "skipped";
      if (status === "ok") ok += 1;
      else if (status === "failed") failed += 1;
      else if (status === "aborted") aborted += 1;
      else skipped += 1;
    }
    log(`Combined stats: total=${orderList.length}, ok=${ok}, skipped=${skipped}, failed=${failed}, aborted=${aborted}`);
    log(`Summary file: ${summaryPath}`);
    if (summaryLastPath) {
      log(`Summary last: ${summaryLastPath}`);
    }
    if (failed) {
      const rerunHint = summaryLastPath || summaryPath;
      log(`Rerun failed only: SEAL_E2E_RERUN_FAILED=1 SEAL_E2E_RERUN_FROM=${rerunHint}`);
    }

    const categories = [];
    const seen = new Set();
    for (const test of orderList) {
      const category = (testByName.get(test) || {}).category || "misc";
      if (!seen.has(category)) {
        seen.add(category);
        categories.push(category);
      }
    }
    log("Combined category summary:");
    for (const category of categories) {
      let total = 0;
      let catOk = 0;
      let catSkipped = 0;
      let catFailed = 0;
      let catAborted = 0;
      for (const test of orderList) {
        const testCategory = (testByName.get(test) || {}).category || "misc";
        if (testCategory !== category) continue;
        const status = statusByTest[test] || "skipped";
        total += 1;
        if (status === "ok") catOk += 1;
        else if (status === "failed") catFailed += 1;
        else if (status === "aborted") catAborted += 1;
        else catSkipped += 1;
      }
      log(`Category ${category}: total=${total} ok=${catOk} skipped=${catSkipped} failed=${catFailed} aborted=${catAborted}`);
      log("  Test | Status | Time | Parallel | SkipRisk | Description");
      for (const test of orderList) {
        const testCategory = (testByName.get(test) || {}).category || "misc";
        if (testCategory !== category) continue;
        const status = statusByTest[test] || "skipped";
        const par = (testByName.get(test) || {}).parallel === "1" ? "yes" : "no";
        log(`  - ${test} | ${status} | ${formatDuration(durationByTest[test] || 0)} | ${par} | ${skipRiskByTest[test] || ""} | ${descByTest[test] || ""}`);
      }
    }

    if (failed) {
      log("Failures:");
      for (const test of orderList) {
        if (statusByTest[test] !== "failed") continue;
        log(`  - ${test}: ${descByTest[test] || ""}`);
        if (hintByTest[test]) {
          log(`    hint: ${hintByTest[test]}`);
        }
        if (logPathByTest[test]) {
          log(`    log: ${logPathByTest[test]}`);
        }
      }
    }
    if (aborted) {
      log("Aborted:");
      for (const test of orderList) {
        if (statusByTest[test] !== "aborted") continue;
        log(`  - ${test}: ${descByTest[test] || ""}`);
        if (hintByTest[test]) {
          log(`    hint: ${hintByTest[test]}`);
        }
      }
    }
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
  updateLastSummary(summaryPath, summaryLastPath);

  const combinedRows = readSummary(summaryPath);
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
