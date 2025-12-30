"use strict";

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig } = require("../lib/project");
const { fileExists, rmrf } = require("../lib/fsextra");
const { info, ok, hr } = require("../lib/ui");

function cleanOutDir(outDir, keepNames = []) {
  const keep = new Set(keepNames);
  const entries = fs.readdirSync(outDir, { withFileTypes: true });
  for (const entry of entries) {
    if (keep.has(entry.name)) continue;
    rmrf(path.join(outDir, entry.name));
  }
  return entries.some((entry) => keep.has(entry.name));
}

const CLEAN_SCOPE_ALIASES = {
  all: "all",
  out: "all",
  cache: "cache",
  build: "cache",
  e2e: "e2e",
  runs: "runs",
  run: "runs",
  tmp: "runs",
};

function resolveCleanScope(raw) {
  if (!raw) return "";
  const token = String(raw).trim().toLowerCase();
  return CLEAN_SCOPE_ALIASES[token] || "";
}

async function cmdClean(cwd, scope, opts = {}) {
  const rawScope = scope ? String(scope).trim() : "";
  const scopeValue = resolveCleanScope(rawScope);
  if (rawScope && !scopeValue) {
    throw new Error(`Unknown clean scope: ${rawScope}. Use: cache, e2e, runs, all.`);
  }
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) {
    throw new Error("Brak seal.json5 (projekt). Jeśli to root monorepo z listą projects, uruchom polecenie w root (wykona się dla podprojektów) albo przejdź do podprojektu.");
  }

  const { outDir } = getSealPaths(projectRoot);

  const scopeLabel = scopeValue || (opts.cache || opts.e2e || opts.all ? "flags" : "all");
  hr();
  info(`Clean: ${proj.appName} (scope=${scopeLabel})`);
  hr();

  if (!fileExists(outDir)) {
    ok("Nothing to clean.");
    return;
  }

  if (scopeValue) {
    if (scopeValue === "all") {
      rmrf(outDir);
      ok(`Removed: ${outDir}`);
      return;
    }
    if (scopeValue === "cache") {
      rmrf(path.join(outDir, "cache"));
      ok(`Removed: ${path.join(outDir, "cache")}`);
      return;
    }
    if (scopeValue === "e2e") {
      rmrf(path.join(outDir, "e2e"));
      ok(`Removed: ${path.join(outDir, "e2e")}`);
      return;
    }
    if (scopeValue === "runs") {
      rmrf(path.join(outDir, "e2e", "run"));
      rmrf(path.join(outDir, "e2e", "concurrent-runs"));
      ok(`Removed: ${path.join(outDir, "e2e", "run")} + ${path.join(outDir, "e2e", "concurrent-runs")}`);
      return;
    }
  }

  const keepNames = [];
  if (!opts.cache && !opts.all) keepNames.push("cache");
  if (!opts.e2e && !opts.all) keepNames.push("e2e");
  if (!opts.cache && !opts.e2e && !opts.all) {
    rmrf(outDir);
    ok(`Removed: ${outDir}`);
    return;
  }

  if (!keepNames.length) {
    rmrf(outDir);
    ok(`Removed: ${outDir}`);
    return;
  }

  const kept = cleanOutDir(outDir, keepNames);
  if (!kept) {
    rmrf(outDir);
    ok(`Removed: ${outDir}`);
    return;
  }
  ok(`Cleaned: ${outDir} (kept ${keepNames.join(", ")})`);
}

module.exports = { cmdClean };
