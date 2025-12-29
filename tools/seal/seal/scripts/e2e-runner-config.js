"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseList, normalizeFlag } = require("./e2e-runner-utils");
const { hasCommand } = require("./e2e-utils");

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function loadE2EConfig(env, options) {
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
  if (!cfg) return;
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
  log(`Loading E2E config: ${cfg}`);
  if (!hasCommand("bash")) {
    log("ERROR: bash not found; cannot load E2E config.");
    process.exit(1);
  }
  const configText = fs.readFileSync(cfg, "utf8");
  const vars = new Set();
  for (const line of configText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (match) vars.add(match[1]);
  }
  if (!vars.size) return;
  const cmd = `set -a; source ${shellQuote(cfg)}; env -0`;
  const res = spawnSync("bash", ["-lc", cmd], {
    env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (res.status !== 0) {
    log(`ERROR: failed to load E2E config (${cfg}).`);
    if (res.stderr) process.stderr.write(res.stderr);
    process.exit(1);
  }
  const out = res.stdout || "";
  const entries = out.split("\0").filter(Boolean);
  const nextEnv = {};
  for (const entry of entries) {
    const idx = entry.indexOf("=");
    if (idx === -1) continue;
    const key = entry.slice(0, idx);
    const value = entry.slice(idx + 1);
    nextEnv[key] = value;
  }
  for (const key of vars) {
    if (Object.prototype.hasOwnProperty.call(nextEnv, key)) {
      env[key] = nextEnv[key];
    }
  }
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
