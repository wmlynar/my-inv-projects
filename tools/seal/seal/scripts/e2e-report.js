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

function updateLastSummaryFile(summaryPath, lastPath) {
  if (!summaryPath || !lastPath || !fs.existsSync(summaryPath)) return;
  fs.mkdirSync(path.dirname(lastPath), { recursive: true });
  const tmpPath = `${lastPath}.tmp.${process.pid}`;
  fs.copyFileSync(summaryPath, tmpPath);
  fs.renameSync(tmpPath, lastPath);
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

function sanitizeSummaryField(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function formatSummaryRow(row) {
  const fields = [
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
  ].map(sanitizeSummaryField);
  return fields.join("\t");
}

function buildSummaryRowsFromState(options) {
  const {
    order,
    testByName,
    statusByTest,
    durationByTest,
    logByTest,
    group,
  } = options || {};
  const list = Array.isArray(order) ? order : [];
  const rows = [];
  for (const name of list) {
    if (!name) continue;
    const test = testByName && typeof testByName.get === "function" ? testByName.get(name) : null;
    rows.push({
      group: group || "",
      test: name,
      status: statusByTest && statusByTest[name] ? statusByTest[name] : "skipped",
      duration: durationByTest && durationByTest[name] ? durationByTest[name] : 0,
      category: (test && test.category) || "",
      parallel: (test && test.parallel) || "0",
      skipRisk: (test && test.skipRisk) || "",
      description: (test && test.description) || "",
      logPath: logByTest && logByTest[name] ? logByTest[name] : "",
      failHint: (test && test.failHint) || "",
    });
  }
  return rows;
}

function buildSummaryIndex(rows) {
  const index = new Map();
  if (!Array.isArray(rows)) return index;
  for (const row of rows) {
    if (row && row.test) {
      index.set(row.test, row);
    }
  }
  return index;
}

function pickTestMeta(testByName, name, row) {
  const test = testByName && typeof testByName.get === "function" ? testByName.get(name) : null;
  return {
    category: (test && test.category) || (row && row.category) || "misc",
    parallel: (test && test.parallel) || (row && row.parallel) || "0",
    skipRisk: (test && test.skipRisk) || (row && row.skipRisk) || "",
    description: (test && test.description) || (row && row.description) || "",
    failHint: (test && test.failHint) || (row && row.failHint) || "",
  };
}

function printCategorySummary(options) {
  const {
    orderList,
    testByName,
    summaryRows,
    log,
    formatDuration,
    label,
  } = options || {};
  if (!Array.isArray(orderList) || orderList.length === 0) return;
  const logger = typeof log === "function" ? log : (msg) => process.stdout.write(`${msg}\n`);
  const fmt = typeof formatDuration === "function" ? formatDuration : (value) => String(value);
  const index = buildSummaryIndex(summaryRows);
  const categories = [];
  const seen = new Set();
  for (const name of orderList) {
    const row = index.get(name);
    const meta = pickTestMeta(testByName, name, row);
    if (!seen.has(meta.category)) {
      seen.add(meta.category);
      categories.push(meta.category);
    }
  }
  logger(label || "Category summary:");
  for (const category of categories) {
    let total = 0;
    let okCount = 0;
    let skipCount = 0;
    let failCount = 0;
    let abortCount = 0;
    let durationSum = 0;
    for (const name of orderList) {
      const row = index.get(name);
      const meta = pickTestMeta(testByName, name, row);
      if (meta.category !== category) continue;
      const status = (row && row.status) || "skipped";
      const duration = row ? Number(row.duration || 0) : 0;
      total += 1;
      if (status === "ok") okCount += 1;
      else if (status === "failed") failCount += 1;
      else if (status === "aborted") abortCount += 1;
      else skipCount += 1;
      durationSum += duration;
    }
    logger(`Category ${category}: total=${total} ok=${okCount} skipped=${skipCount} failed=${failCount} aborted=${abortCount} time=${fmt(durationSum)}`);
    logger("  Test | Status | Time | Parallel | SkipRisk | Description");
    for (const name of orderList) {
      const row = index.get(name);
      const meta = pickTestMeta(testByName, name, row);
      if (meta.category !== category) continue;
      const status = (row && row.status) || "skipped";
      const duration = row ? Number(row.duration || 0) : 0;
      const parallel = meta.parallel === "1" ? "yes" : "no";
      logger(`  - ${name} | ${status} | ${fmt(duration)} | ${parallel} | ${meta.skipRisk} | ${meta.description}`);
    }
  }
}

function printStatusList(options) {
  const {
    orderList,
    testByName,
    summaryRows,
    status,
    label,
    log,
  } = options || {};
  if (!Array.isArray(orderList) || orderList.length === 0) return;
  const logger = typeof log === "function" ? log : (msg) => process.stdout.write(`${msg}\n`);
  const index = buildSummaryIndex(summaryRows);
  const matched = [];
  for (const name of orderList) {
    const row = index.get(name);
    const rowStatus = (row && row.status) || "skipped";
    if (rowStatus === status) {
      matched.push(name);
    }
  }
  if (!matched.length) return;
  logger(label || "Results:");
  for (const name of matched) {
    const row = index.get(name);
    const meta = pickTestMeta(testByName, name, row);
    const desc = meta.description || "";
    logger(`  - ${name}: ${desc}`);
    if (meta.failHint) {
      logger(`    hint: ${meta.failHint}`);
    }
    if (row && row.logPath) {
      logger(`    log: ${row.logPath}`);
    }
  }
}

function printTimingSummary(options) {
  const {
    label,
    entries,
    log,
    formatDuration,
  } = options || {};
  if (!Array.isArray(entries) || entries.length === 0) return;
  const logger = typeof log === "function" ? log : (msg) => process.stdout.write(`${msg}\n`);
  const fmt = typeof formatDuration === "function" ? formatDuration : (value) => String(value);
  const rows = [...entries].sort((a, b) => (b.duration || 0) - (a.duration || 0));
  logger(label || "Timing summary:");
  for (const row of rows) {
    const status = row.status ? `  ${row.status}` : "";
    logger(`  - ${row.name || ""}${status}  (${fmt(row.duration || 0)})`);
  }
}

function countStatuses(orderList, summaryRows) {
  const list = Array.isArray(orderList)
    ? orderList
    : (Array.isArray(summaryRows) ? summaryRows.map((row) => row.test).filter(Boolean) : []);
  const totals = { total: 0, ok: 0, skipped: 0, failed: 0, aborted: 0 };
  const index = buildSummaryIndex(summaryRows);
  for (const name of list) {
    const row = index.get(name);
    const status = (row && row.status) || "skipped";
    totals.total += 1;
    if (status === "ok") totals.ok += 1;
    else if (status === "failed") totals.failed += 1;
    else if (status === "aborted") totals.aborted += 1;
    else totals.skipped += 1;
  }
  return totals;
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
      categoryMap.set(category, {
        name: category,
        durationSec: 0,
        totals: { total: 0, ok: 0, failed: 0, skipped: 0, aborted: 0 },
        tests: [],
      });
    }
    const entry = categoryMap.get(category);
    const status = statusByTest[name] || "skipped";
    const durationSec = durationByTest[name] || 0;
    entry.totals.total += 1;
    if (status === "ok") entry.totals.ok += 1;
    else if (status === "failed") entry.totals.failed += 1;
    else if (status === "aborted") entry.totals.aborted += 1;
    else entry.totals.skipped += 1;
    entry.durationSec += durationSec;
    entry.tests.push({
      name,
      status,
      durationSec,
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
  updateLastSummaryFile,
  parseSummaryRows,
  formatSummaryRow,
  buildSummaryRowsFromState,
  printCategorySummary,
  printStatusList,
  printTimingSummary,
  countStatuses,
  listFailedTests,
  buildPlan,
  printPlan,
  buildJsonSummary,
  writeJsonSummary,
};
