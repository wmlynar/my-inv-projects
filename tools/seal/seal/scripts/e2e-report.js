"use strict";

const fs = require("fs");
const path = require("path");

const SUMMARY_TSV_HEADER = "group\ttest\tstatus\tduration_s\tcategory\tparallel\tskip_risk\tdescription\tlog_path\tfail_hint\n";

function resolveJsonSummaryPath(summaryPath, env) {
  if (env.SEAL_E2E_SUMMARY_JSON_PATH) {
    return env.SEAL_E2E_SUMMARY_JSON_PATH;
  }
  if (!summaryPath) return "";
  if (summaryPath.endsWith(".tsv")) {
    return summaryPath.replace(/\.tsv$/i, ".json");
  }
  return `${summaryPath}.json`;
}

function buildPlan(manifestOrder, testByName, onlySet, skipSet, capabilities) {
  const entries = [];
  const byName = new Map();
  for (const name of manifestOrder) {
    const test = testByName.get(name);
    let run = true;
    let reason = "";
    if (onlySet.size && !onlySet.has(name)) {
      run = false;
      reason = "filtered by selection";
    } else if (skipSet.has(name)) {
      run = false;
      reason = "skipped by SEAL_E2E_SKIP";
    } else {
      const reqs = (test && Array.isArray(test.requirements)) ? test.requirements : [];
      const missing = reqs.filter((req) => !capabilities[req]);
      if (missing.length) {
        run = false;
        reason = `missing requirements: ${missing.join(", ")}`;
      }
    }
    const entry = {
      name,
      run,
      reason,
    };
    entries.push(entry);
    byName.set(name, entry);
  }
  const selected = entries.filter((item) => item.run).map((item) => item.name);
  return { entries, byName, selected };
}

function printPlan(entries, testByName, capabilities, log) {
  const logger = typeof log === "function" ? log : (msg) => process.stdout.write(`${msg}\n`);
  logger("Plan (no tests executed):");
  logger(`Capabilities: host=${capabilities.host ? 1 : 0} docker=${capabilities.docker ? 1 : 0} root=${capabilities.root ? 1 : 0} limited_host=${capabilities.limitedHost ? 1 : 0}`);
  for (const entry of entries) {
    const test = testByName.get(entry.name);
    const category = test && test.category ? test.category : "misc";
    const status = entry.run ? "run" : "skip";
    const reason = entry.reason || "selected";
    logger(`  - ${entry.name} | ${status} | ${category} | ${reason}`);
  }
}

function ensureSummaryFile(summaryPath, options = {}) {
  if (!summaryPath) return;
  const append = options.append === true;
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  if (!append || !fs.existsSync(summaryPath)) {
    fs.writeFileSync(summaryPath, SUMMARY_TSV_HEADER, "utf8");
  }
}

function parseSummaryRows(summaryPath) {
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

function listFailedTests(summaryPath) {
  const rows = parseSummaryRows(summaryPath);
  const failed = new Set();
  for (const row of rows) {
    if (row.status === "failed" || row.status === "aborted") {
      failed.add(row.test);
    }
  }
  return Array.from(failed);
}

function buildJsonSummary(options) {
  const {
    runId,
    manifestPath,
    manifestOrder,
    testByName,
    planByName,
    summaryRows,
    capabilities,
    summaryPath,
    runStart,
    runEnd,
  } = options;

  const statusByTest = {};
  const durationByTest = {};
  const logPathByTest = {};
  for (const row of summaryRows) {
    statusByTest[row.test] = row.status;
    durationByTest[row.test] = row.duration;
    logPathByTest[row.test] = row.logPath;
  }

  const selectedNames = manifestOrder.filter((name) => (planByName.get(name) || {}).run);
  const totals = { total: 0, ok: 0, failed: 0, skipped: 0, aborted: 0 };
  for (const name of selectedNames) {
    const status = statusByTest[name] || "skipped";
    totals.total += 1;
    if (status === "ok") totals.ok += 1;
    else if (status === "failed") totals.failed += 1;
    else if (status === "aborted") totals.aborted += 1;
    else totals.skipped += 1;
  }

  const tests = manifestOrder.map((name) => {
    const test = testByName.get(name) || {};
    const plan = planByName.get(name) || { run: false, reason: "missing plan" };
    const status = plan.run ? (statusByTest[name] || "skipped") : "skipped";
    const result = plan.run
      ? {
          status,
          durationSec: durationByTest[name] || 0,
          logPath: logPathByTest[name] || "",
        }
      : null;
    return {
      name,
      category: test.category || "misc",
      parallel: test.parallel === "1",
      description: test.description || "",
      skipRisk: test.skipRisk || "",
      failHint: test.failHint || "",
      script: test.script || "",
      requirements: Array.isArray(test.requirements) ? test.requirements : [],
      planned: {
        run: plan.run,
        reason: plan.reason,
      },
      result,
    };
  });

  const categoryMap = new Map();
  for (const name of selectedNames) {
    const test = testByName.get(name) || {};
    const category = test.category || "misc";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { name: category, totals: { total: 0, ok: 0, failed: 0, skipped: 0, aborted: 0 }, tests: [] });
    }
    const entry = categoryMap.get(category);
    const status = statusByTest[name] || "skipped";
    entry.totals.total += 1;
    if (status === "ok") entry.totals.ok += 1;
    else if (status === "failed") entry.totals.failed += 1;
    else if (status === "aborted") entry.totals.aborted += 1;
    else entry.totals.skipped += 1;
    entry.tests.push({
      name,
      status,
      durationSec: durationByTest[name] || 0,
      parallel: test.parallel === "1",
      skipRisk: test.skipRisk || "",
      description: test.description || "",
      logPath: logPathByTest[name] || "",
      failHint: test.failHint || "",
    });
  }

  return {
    runId,
    manifestPath,
    summaryPath,
    generatedAt: new Date(runEnd).toISOString(),
    durationSec: Math.max(0, Math.floor((runEnd - runStart) / 1000)),
    totals,
    capabilities,
    categories: Array.from(categoryMap.values()),
    tests,
  };
}

function writeJsonSummary(summaryPath, data) {
  if (!summaryPath) return;
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

module.exports = {
  SUMMARY_TSV_HEADER,
  resolveJsonSummaryPath,
  ensureSummaryFile,
  parseSummaryRows,
  listFailedTests,
  buildPlan,
  printPlan,
  buildJsonSummary,
  writeJsonSummary,
};
