"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { parseList, normalizeFlag } = require("./e2e-runner-utils");

function resolveE2ERoot(options) {
  const env = options.env || process.env;
  if (env.SEAL_E2E_ROOT) return env.SEAL_E2E_ROOT;
  const repoRoot = options.repoRoot || "";
  if (!repoRoot) return "";
  return path.join(repoRoot, "tools", "seal", "example", "seal-out", "e2e");
}

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
  const e2eRoot = env.SEAL_E2E_ROOT || "";
  const summaryDir = e2eRoot ? path.join(e2eRoot, "summary") : path.join(cacheRoot, "e2e-summary");
  return {
    summaryPath: path.join(summaryDir, `run-${runId}.tsv`),
    summaryLastPath: path.join(summaryDir, "last.tsv"),
  };
}

function resolveLogDir(options) {
  const env = options.env || process.env;
  const cacheRoot = options.cacheRoot || "";
  const runId = options.runId || "";
  if (env.SEAL_E2E_LOG_DIR) return env.SEAL_E2E_LOG_DIR;
  const runRoot = env.SEAL_E2E_RUN_ROOT || "";
  if (runRoot) return path.join(runRoot, "logs");
  const e2eRoot = env.SEAL_E2E_ROOT || "";
  if (e2eRoot) return path.join(e2eRoot, "run", "logs");
  return path.join(cacheRoot, "e2e-logs", runId);
}

function resolveE2EPaths(options) {
  const env = options.env || process.env;
  const e2eRoot = options.e2eRoot || env.SEAL_E2E_ROOT || "";
  const home = options.home || env.HOME || os.homedir();
  const defaultCacheRoot = e2eRoot ? path.join(e2eRoot, "cache") : path.join(home, ".cache", "seal");
  const cacheRoot = env.SEAL_E2E_CACHE_DIR || defaultCacheRoot;
  const cacheBin = env.SEAL_E2E_CACHE_BIN || path.join(cacheRoot, "bin");
  const stampsDir = path.join(cacheRoot, "stamps");
  const npmCacheDir = env.NPM_CONFIG_CACHE || path.join(cacheRoot, "npm");
  const { summaryPath, summaryLastPath } = resolveSummaryPaths({
    env,
    cacheRoot,
    runId: options.runId,
    enabled: options.summaryEnabled !== false,
  });
  const logDir = resolveLogDir({ env, cacheRoot, runId: options.runId });
  return {
    e2eRoot,
    cacheRoot,
    cacheBin,
    stampsDir,
    npmCacheDir,
    summaryPath,
    summaryLastPath,
    logDir,
  };
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
  resolveE2ERoot,
  parseTestFilters,
  resolveSummaryPaths,
  resolveLogDir,
  resolveE2EPaths,
  resolveRerunFrom,
  isPlanMode,
};
