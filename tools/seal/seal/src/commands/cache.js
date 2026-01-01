"use strict";

const path = require("path");
const os = require("os");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig } = require("../lib/project");
const { fileExists, rmrf } = require("../lib/fsextra");
const { hr, info, warn, ok } = require("../lib/ui");

const VALID_SCOPES = ["build", "e2e", "runs", "global", "playwright", "docker"];

const SCOPE_ALIASES = {
  build: "build",
  project: "build",
  e2e: "e2e",
  tests: "e2e",
  runs: "runs",
  run: "runs",
  tmp: "runs",
  temp: "runs",
  global: "global",
  user: "global",
  toolchain: "global",
  playwright: "playwright",
  pw: "playwright",
  docker: "docker",
  "docker-e2e": "docker",
};

function expandHome(p) {
  if (!p) return "";
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function resolvePath(p) {
  if (!p) return "";
  return path.resolve(expandHome(p));
}

function isUnsafePath(p) {
  if (!p) return true;
  const resolved = resolvePath(p);
  if (!resolved) return true;
  const root = path.parse(resolved).root;
  if (resolved === root) return true;
  const home = os.homedir();
  if (resolved === home) return true;
  return false;
}

function safeRemove(label, target, state) {
  const resolved = resolvePath(target);
  if (!resolved) return;
  if (state.seen.has(resolved)) return;
  state.seen.add(resolved);
  if (isUnsafePath(resolved)) {
    warn(`Cache clean: skip unsafe path for ${label}: ${resolved}`);
    return;
  }
  if (!fileExists(resolved)) {
    info(`Cache clean: missing ${label}: ${resolved}`);
    return;
  }
  try {
    rmrf(resolved);
    ok(`Cache clean: removed ${label}: ${resolved}`);
    state.removed.push(resolved);
  } catch (err) {
    warn(`Cache clean: failed to remove ${label}: ${resolved} (${err && err.message ? err.message : String(err)})`);
    state.failed.push(resolved);
  }
}

function parseScopes(raw, options = {}) {
  const input = raw ? String(raw).trim() : "";
  const defaultScopes = Array.isArray(options.defaultScopes) ? options.defaultScopes : null;
  const allowedScopes = Array.isArray(options.allowedScopes) ? new Set(options.allowedScopes) : null;
  const parts = input.split(/[,\s]+/).filter(Boolean);
  const scopes = new Set();
  if (!parts.length) {
    if (defaultScopes && defaultScopes.length) {
      for (const scope of defaultScopes) {
        scopes.add(scope);
      }
      return scopes;
    }
    parts.push("all");
  }
  for (const part of parts) {
    const token = part.toLowerCase();
    if (token === "all") {
      const source = allowedScopes ? Array.from(allowedScopes) : VALID_SCOPES;
      for (const scope of source) scopes.add(scope);
      continue;
    }
    const resolved = SCOPE_ALIASES[token];
    if (!resolved) {
      const scopeList = allowedScopes ? Array.from(allowedScopes) : VALID_SCOPES;
      throw new Error(`Unknown cache scope: ${part}. Use: ${scopeList.join(", ")} or all.`);
    }
    if (allowedScopes && !allowedScopes.has(resolved)) {
      throw new Error(`Scope not allowed here: ${part}. Allowed: ${Array.from(allowedScopes).join(", ")}, all.`);
    }
    scopes.add(resolved);
  }
  return scopes;
}

function resolveProjectPaths(cwd) {
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) {
    throw new Error(
      "Brak seal.json5 (projekt). Cache dla build/e2e wymaga wejscia do projektu lub podprojektu."
    );
  }
  const { outDir } = getSealPaths(projectRoot);
  return { projectRoot, outDir, appName: proj.appName };
}

function addPath(set, p) {
  const resolved = resolvePath(p);
  if (!resolved) return;
  set.add(resolved);
}

function resolveGlobalCacheRoots(env) {
  const roots = new Set();
  const home = os.homedir();
  const xdg = env.XDG_CACHE_HOME || path.join(home, ".cache");
  addPath(roots, path.join(xdg, "seal"));
  addPath(roots, env.SEAL_KITESHIELD_DIR);
  addPath(roots, env.SEAL_MIDGETPACK_DIR);
  addPath(roots, env.SEAL_OLLVM_DIR);
  addPath(roots, env.SEAL_HIKARI_DIR);
  addPath(roots, env.SEAL_CRIU_DIR);
  addPath(roots, env.SEAL_THIRD_PARTY_CACHE);
  return Array.from(roots);
}

function resolvePlaywrightRoots(env) {
  const roots = new Set();
  const home = os.homedir();
  const xdg = env.XDG_CACHE_HOME || path.join(home, ".cache");
  if (env.SEAL_PLAYWRIGHT_CACHE_DIR) addPath(roots, env.SEAL_PLAYWRIGHT_CACHE_DIR);
  if (env.PLAYWRIGHT_BROWSERS_PATH) addPath(roots, env.PLAYWRIGHT_BROWSERS_PATH);
  if (env.SEAL_E2E_PLAYWRIGHT_CACHE_ROOT) {
    addPath(roots, path.join(env.SEAL_E2E_PLAYWRIGHT_CACHE_ROOT, "ms-playwright"));
  }
  addPath(roots, path.join(xdg, "ms-playwright"));
  addPath(roots, "/usr/local/share/ms-playwright");
  return Array.from(roots);
}

function resolveDockerCacheRoot(env, outDir) {
  const fallback = outDir ? path.join(outDir, "e2e", "cache", "docker") : path.join(process.cwd(), "seal-out", "e2e", "cache", "docker");
  const cand = env.SEAL_DOCKER_E2E_CACHE_DIR || fallback;
  return resolvePath(cand);
}

function resolveExtraE2ECache(env, e2eRoot) {
  const extra = env.SEAL_E2E_CACHE_DIR ? resolvePath(env.SEAL_E2E_CACHE_DIR) : "";
  if (!extra) return [];
  if (!e2eRoot) return [extra];
  const base = resolvePath(e2eRoot);
  if (extra === base || extra.startsWith(`${base}${path.sep}`)) return [];
  return [extra];
}

async function cmdCacheClean(cwd, scopeArg, options = {}) {
  const env = process.env;
  const scopes = parseScopes(scopeArg, options);
  const needProject = scopes.has("build") || scopes.has("e2e");
  const state = { seen: new Set(), removed: [], failed: [] };

  hr();
  info(`Cache clean: scopes=${Array.from(scopes).join(", ")}`);

  let outDir = "";
  let e2eRoot = "";
  if (needProject) {
    const project = resolveProjectPaths(cwd);
    outDir = project.outDir;
    e2eRoot = path.join(outDir, "e2e");
  }

  if (scopes.has("build")) {
    safeRemove("build cache (seal-out/cache)", outDir ? path.join(outDir, "cache") : "", state);
  }
  if (scopes.has("e2e")) {
    safeRemove("e2e cache (seal-out/e2e)", e2eRoot, state);
    const extra = resolveExtraE2ECache(env, e2eRoot);
    for (const p of extra) {
      safeRemove("e2e cache (SEAL_E2E_CACHE_DIR)", p, state);
    }
  }
  if (scopes.has("runs")) {
    safeRemove("e2e run (seal-out/e2e/run)", e2eRoot ? path.join(e2eRoot, "run") : "", state);
    safeRemove("e2e concurrent runs (seal-out/e2e/concurrent-runs)", e2eRoot ? path.join(e2eRoot, "concurrent-runs") : "", state);
  }
  if (scopes.has("docker")) {
    safeRemove("docker e2e cache (SEAL_DOCKER_E2E_CACHE_DIR)", resolveDockerCacheRoot(env, outDir), state);
  }
  if (scopes.has("global")) {
    for (const p of resolveGlobalCacheRoots(env)) {
      safeRemove("global cache", p, state);
    }
  }
  if (scopes.has("playwright")) {
    for (const p of resolvePlaywrightRoots(env)) {
      safeRemove("playwright cache", p, state);
    }
  }

  if (state.failed.length) {
    warn(`Cache clean: completed with ${state.failed.length} failure(s).`);
  } else {
    ok("Cache clean: done.");
  }
}

module.exports = { cmdCacheClean };
