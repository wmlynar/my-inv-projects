"use strict";

const fs = require("fs");
const path = require("path");
const { parseList, normalizeFlag } = require("./e2e-runner-utils");

function loadE2EConfig(env, options) {
  if (normalizeFlag(env.SEAL_E2E_CONFIG_LOADED, "0") === "1") return;
  const repoRoot = options.repoRoot;
  const scriptDir = options.scriptDir;
  const log = options.log;
  let cfg = env.SEAL_E2E_CONFIG || "";
  const defaultCfg = path.join(repoRoot, ".seal", "e2e.env");
  const sampleCfg = path.join(scriptDir, "e2e-config.env");
  if (!cfg) {
    if (fs.existsSync(defaultCfg)) {
      cfg = defaultCfg;
    } else if (fs.existsSync(sampleCfg)) {
      cfg = sampleCfg;
    }
  }
  if (!cfg || cfg === "/dev/null") return;
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
  log(`NOTE: E2E config file detected (${cfg}) but not loaded.`);
  log("      Run via tools/seal/seal/scripts/e2e.sh or source the config before invoking this runner.");
}

function parseTestFilters(env, knownTests, log) {
  const onlyList = parseList(env.SEAL_E2E_TESTS);
  const skipList = parseList(env.SEAL_E2E_SKIP);
  const known = new Set(Array.isArray(knownTests) ? knownTests : []);
  const validateList = (label, list) => {
    const unknown = list.filter((item) => !known.has(item));
    if (unknown.length) {
      log(`ERROR: ${label} contains unknown tests: ${unknown.join(", ")}`);
      log("       Check tools/seal/seal/scripts/e2e-tests.json5 for valid names.");
      process.exit(1);
    }
  };
  if (onlyList.length) validateList("SEAL_E2E_TESTS", onlyList);
  if (skipList.length) validateList("SEAL_E2E_SKIP", skipList);
  return { onlyList, skipList };
}

function resolveSummaryPaths(options) {
  const env = options.env || process.env;
  const cacheRoot = options.cacheRoot || "";
  const runId = options.runId || "";
  const enabled = options.enabled !== false;
  if (!enabled) {
    return { summaryPath: "", summaryLastPath: "" };
  }
  const summaryOverride = env.SEAL_E2E_SUMMARY_PATH || "";
  if (summaryOverride) {
    return { summaryPath: summaryOverride, summaryLastPath: "" };
  }
  const summaryDir = path.join(cacheRoot, "e2e-summary");
  return {
    summaryPath: path.join(summaryDir, `run-${runId}.tsv`),
    summaryLastPath: path.join(summaryDir, "last.tsv"),
  };
}

function resolveLogDir(options) {
  const env = options.env || process.env;
  const cacheRoot = options.cacheRoot || "";
  const runId = options.runId || "";
  return env.SEAL_E2E_LOG_DIR || path.join(cacheRoot, "e2e-logs", runId);
}

function resolveRerunFrom(env, summaryPath, summaryLastPath) {
  const rerunOverride = env.SEAL_E2E_RERUN_FROM || "";
  if (rerunOverride) return rerunOverride;
  if (summaryLastPath) return summaryLastPath;
  return summaryPath || "";
}

function isPlanMode(env) {
  return normalizeFlag(env.SEAL_E2E_PLAN || env.SEAL_E2E_EXPLAIN, "0") === "1";
}

module.exports = {
  loadE2EConfig,
  parseTestFilters,
  resolveSummaryPaths,
  resolveLogDir,
  resolveRerunFrom,
  isPlanMode,
};
