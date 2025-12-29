"use strict";

const fs = require("fs");
const path = require("path");
const { loadManifest } = require("./e2e-manifest");
const { detectCapabilities } = require("./e2e-capabilities");
const { buildPlan, printPlan, listFailedTests } = require("./e2e-report");
const { parseTestFilters } = require("./e2e-runner-config");

function loadManifestData(manifestPath, manifestStrict, log) {
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
  return { tests, manifestOrder, testByName };
}

function logHostLimited(tests, capabilities, log) {
  if (!capabilities.limitedHost) {
    return;
  }
  const hostOnlyList = tests
    .filter((test) => Array.isArray(test.requirements) && test.requirements.includes("host"))
    .map((test) => test.name);
  if (hostOnlyList.length) {
    log(`Host-limited mode: skipping host-only tests: ${hostOnlyList.join(" ")}`);
  }
}

function ensureTestScripts(selectedTests, testByName, repoRoot, log) {
  const missingScripts = [];
  for (const name of selectedTests) {
    const test = testByName.get(name);
    const scriptPath = test ? test.script : "";
    if (!scriptPath) {
      missingScripts.push(`${name}: <missing script>`);
      continue;
    }
    const resolved = path.isAbsolute(scriptPath) ? scriptPath : path.join(repoRoot, scriptPath);
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
}

function applyRerunFailedFilters(options) {
  const {
    onlyList,
    skipList,
    rerunFailed,
    rerunFrom,
    log,
    intersect,
    emptyExitCode,
    onScopeSelected,
  } = options || {};
  const baseOnly = Array.isArray(onlyList) ? onlyList : [];
  const baseSkip = Array.isArray(skipList) ? skipList : [];
  if (!rerunFailed) {
    return { onlyList: baseOnly, skipList: baseSkip };
  }
  if (!rerunFrom) {
    if (typeof log === "function") {
      log("WARN: SEAL_E2E_RERUN_FAILED=1 but no summary path is set.");
    }
    return { onlyList: baseOnly, skipList: baseSkip };
  }
  const failed = listFailedTests(rerunFrom);
  if (!failed.length) {
    if (typeof log === "function") {
      log(`No failed tests in ${rerunFrom}; nothing to rerun.`);
    }
    process.exit(0);
  }
  let nextOnly = baseOnly;
  if (nextOnly.length) {
    if (typeof intersect === "function") {
      nextOnly = intersect(nextOnly, failed);
    } else {
      nextOnly = nextOnly.filter((item) => failed.includes(item));
    }
  } else {
    nextOnly = failed;
  }
  if (!nextOnly.length) {
    if (typeof log === "function") {
      log("No tests left after rerun/filters.");
    }
    process.exit(typeof emptyExitCode === "number" ? emptyExitCode : 0);
  }
  if (typeof onScopeSelected === "function") {
    onScopeSelected();
  }
  if (typeof log === "function") {
    log(`Rerun failed tests only: ${nextOnly.join(" ")}`);
  }
  return { onlyList: nextOnly, skipList: baseSkip };
}

function preparePlan(options) {
  const {
    env,
    repoRoot,
    manifestPath,
    manifestStrict,
    planMode,
    log,
    adjustFilters,
  } = options;

  const { tests, manifestOrder, testByName } = loadManifestData(manifestPath, manifestStrict, log);

  let { onlyList, skipList } = parseTestFilters(env, manifestOrder, log);
  if (typeof adjustFilters === "function") {
    const updated = adjustFilters({
      onlyList,
      skipList,
      manifestOrder,
      tests,
      testByName,
    });
    if (updated && Array.isArray(updated.onlyList)) {
      onlyList = updated.onlyList;
    }
    if (updated && Array.isArray(updated.skipList)) {
      skipList = updated.skipList;
    }
  }

  const capabilities = detectCapabilities(env);
  logHostLimited(tests, capabilities, log);

  const onlySet = new Set(onlyList);
  const skipSet = new Set(skipList);
  const plan = buildPlan(manifestOrder, testByName, onlySet, skipSet, capabilities);
  if (planMode) {
    printPlan(plan.entries, testByName, capabilities, log);
    process.exit(0);
  }
  if (onlySet.size && !plan.selected.length) {
    log("ERROR: filter resulted in zero tests to run.");
    process.exit(1);
  }
  if (onlyList.length) {
    log(`Selected tests: ${onlyList.join(" ")}`);
  }

  ensureTestScripts(plan.selected, testByName, repoRoot, log);

  const shouldRun = (name) => {
    const entry = plan.byName.get(name);
    return entry ? entry.run : false;
  };

  return {
    tests,
    manifestOrder,
    testByName,
    capabilities,
    plan,
    selectedTests: plan.selected,
    shouldRun,
    onlyList,
    skipList,
  };
}

module.exports = {
  preparePlan,
  applyRerunFailedFilters,
};
