"use strict";

const fs = require("fs");
const path = require("path");

const { spawnSyncSafe } = require("../lib/spawn");
const { hr, info, warn, ok } = require("../lib/ui");
const { loadProjectConfig, loadSealFile, isWorkspaceConfig } = require("../lib/project");

const BATCH_SKIP_ENV = "SEAL_BATCH_SKIP";

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
  const sealPath = path.join(dir, "seal.json5");
  if (fs.existsSync(sealPath)) {
    try {
      const cfg = loadSealFile(dir);
      return !!cfg && !isWorkspaceConfig(cfg);
    } catch {
      return true;
    }
  }
  const legacyProject = path.join(dir, "seal-config", "project.json5");
  const legacyStandard = path.join(dir, "seal-config", "standard.lock.json");
  return fs.existsSync(legacyProject) || fs.existsSync(legacyStandard);
}

function loadWorkspaceProjects(rootDir) {
  const p = path.join(rootDir, "seal.json5");
  if (!fs.existsSync(p)) return null;
  const cfg = loadSealFile(rootDir);
  if (!cfg || !isWorkspaceConfig(cfg)) return null;
  const projects = Array.isArray(cfg.projects) ? cfg.projects : [];
  return projects.map((p) => {
    if (typeof p === "string") return { path: p, name: path.basename(p) };
    const projPath = p.path || p.name;
    return { path: projPath, name: p.name || (projPath ? path.basename(projPath) : "project") };
  }).filter((p) => p.path);
}

function matchesFilter(projectRoot, appName, filter) {
  if (!filter) return true;
  const hay = `${projectRoot} ${appName || ""}`.toLowerCase();
  return hay.includes(String(filter).toLowerCase());
}

function findSealProjects(rootDir, maxDepth, filter) {
  const results = [];
  const seen = new Set();

  const workspaceProjects = loadWorkspaceProjects(rootDir);
  if (workspaceProjects && workspaceProjects.length) {
    for (const p of workspaceProjects) {
      const abs = path.resolve(rootDir, p.path);
      if (seen.has(abs)) continue;
      if (!isSealProject(abs)) continue;
      const proj = loadProjectConfig(abs);
      const appName = proj && proj.appName ? proj.appName : p.name || path.basename(abs);
      if (matchesFilter(abs, appName, filter)) {
        results.push({ root: abs, appName });
      }
      seen.add(abs);
    }
    results.sort((a, b) => a.root.localeCompare(b.root));
    return results;
  }

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
  info(`Workspace: ${projects.length} project(s) under ${rootDir}`);
  if (filter) info(`Workspace: filter="${filter}"`);
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
    info(`Workspace: [${i + 1}/${projects.length}] ${p.appName} (${p.root})`);
    const res = spawnSyncSafe(bin, baseArgs, {
      cwd: p.root,
      stdio: "inherit",
      env: { [BATCH_SKIP_ENV]: "1" },
    });
    if (!res.ok) {
      const msg = `Workspace: command failed for ${p.appName} (exit=${res.status ?? "?"})`;
      warn(msg);
      failures.push({ project: p, status: res.status });
      if (!opts.keepGoing) break;
    }
  }

  if (failures.length) {
    const names = failures.map((f) => f.project.appName).join(", ");
    throw new Error(`Workspace failed for: ${names}`);
  }

  ok("Workspace done.");
}

module.exports = { cmdBatch };
