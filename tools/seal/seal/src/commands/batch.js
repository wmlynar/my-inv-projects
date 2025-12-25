"use strict";

const fs = require("fs");
const path = require("path");

const { spawnSyncSafe } = require("../lib/spawn");
const { hr, info, warn, ok } = require("../lib/ui");
const { loadProjectConfig } = require("../lib/project");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "seal-out",
  "dist",
  "build",
  "out",
  ".cache",
  ".turbo",
  ".next",
  ".nuxt",
  ".vite",
  ".svelte-kit",
  ".idea",
  ".vscode",
  "tmp",
  ".tmp",
  "coverage",
  "old",
]);

function isSealProject(dir) {
  const p = path.join(dir, "seal-config", "project.json5");
  return fs.existsSync(p);
}

function matchesFilter(projectRoot, appName, filter) {
  if (!filter) return true;
  const hay = `${projectRoot} ${appName || ""}`.toLowerCase();
  return hay.includes(String(filter).toLowerCase());
}

function findSealProjects(rootDir, maxDepth, filter) {
  const results = [];
  const seen = new Set();

  function walk(dir, depth) {
    if (depth < 0) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      if (SKIP_DIRS.has(ent.name)) continue;
      const child = path.join(dir, ent.name);
      if (isSealProject(child)) {
        if (!seen.has(child)) {
          const proj = loadProjectConfig(child);
          const appName = proj && proj.appName ? proj.appName : path.basename(child);
          if (matchesFilter(child, appName, filter)) {
            results.push({ root: child, appName });
          }
          seen.add(child);
        }
        continue;
      }
      walk(child, depth - 1);
    }
  }

  if (isSealProject(rootDir)) {
    const proj = loadProjectConfig(rootDir);
    const appName = proj && proj.appName ? proj.appName : path.basename(rootDir);
    if (matchesFilter(rootDir, appName, filter)) {
      results.push({ root: rootDir, appName });
    }
    seen.add(rootDir);
  }

  walk(rootDir, maxDepth);
  results.sort((a, b) => a.root.localeCompare(b.root));
  return results;
}

async function cmdBatch(cwd, cmd, args, opts) {
  const rootDir = path.resolve(cwd, opts.root || ".");
  const depth = Number.isFinite(Number(opts.depth)) ? Number(opts.depth) : 4;
  const filter = opts.filter || null;

  const projects = findSealProjects(rootDir, depth, filter);
  if (!projects.length) {
    throw new Error(`No seal projects found under ${rootDir}`);
  }

  hr();
  info(`Batch: ${projects.length} project(s) under ${rootDir}`);
  if (filter) info(`Batch: filter="${filter}"`);
  if (opts.dryRun) {
    for (const p of projects) {
      console.log(`- ${p.appName}: ${p.root}`);
    }
    ok("Dry run done.");
    return;
  }

  const cliPath = process.argv[1];
  const useNode = path.extname(cliPath) === ".js";
  const bin = useNode ? process.execPath : cliPath;
  const baseArgs = useNode ? [cliPath, cmd, ...args] : [cmd, ...args];

  const failures = [];
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    hr();
    info(`Batch: [${i + 1}/${projects.length}] ${p.appName} (${p.root})`);
    const res = spawnSyncSafe(bin, baseArgs, { cwd: p.root, stdio: "inherit" });
    if (!res.ok) {
      const msg = `Batch: command failed for ${p.appName} (exit=${res.status ?? "?"})`;
      warn(msg);
      failures.push({ project: p, status: res.status });
      if (!opts.keepGoing) break;
    }
  }

  if (failures.length) {
    const names = failures.map((f) => f.project.appName).join(", ");
    throw new Error(`Batch failed for: ${names}`);
  }

  ok("Batch done.");
}

module.exports = { cmdBatch };
