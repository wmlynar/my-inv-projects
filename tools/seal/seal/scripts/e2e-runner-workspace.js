"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { ensureDir } = require("./e2e-runner-fs");
const { isEnabled } = require("./e2e-runner-utils");

function buildSafeRoots(env, extraRoots = []) {
  const roots = new Set();
  const osTmp = os.tmpdir();
  if (osTmp) roots.add(osTmp);
  roots.add("/tmp");
  roots.add("/var/tmp");
  roots.add("/dev/shm");
  const extras = [
    env.TMPDIR,
    env.TMP,
    env.TEMP,
    env.SEAL_E2E_RUN_ROOT,
    env.SEAL_E2E_ROOT,
    env.SEAL_E2E_TMP_ROOT,
  ];
  for (const extra of extras) {
    if (extra) roots.add(extra);
  }
  if (env.SEAL_E2E_SAFE_ROOTS) {
    for (const root of env.SEAL_E2E_SAFE_ROOTS.split(/[:;,]+/).filter(Boolean)) {
      roots.add(root);
    }
  }
  for (const root of extraRoots || []) {
    if (root) roots.add(root);
  }
  return Array.from(roots).filter(Boolean);
}

function isSafeExampleRoot(exampleRoot, safeRoots) {
  return safeRoots.some((base) => exampleRoot === base || exampleRoot.startsWith(`${base}/`));
}

function requireSafeExampleRoot(exampleRoot, safeRoots, env, log) {
  if (env.SEAL_E2E_UNSAFE_EXAMPLE_ROOT === "1") return;
  const logger = typeof log === "function" ? log : (msg) => process.stdout.write(`${msg}\n`);
  if (!path.isAbsolute(exampleRoot)) {
    logger(`ERROR: SEAL_E2E_EXAMPLE_ROOT must be absolute (got: ${exampleRoot})`);
    process.exit(1);
  }
  if (!isSafeExampleRoot(exampleRoot, safeRoots)) {
    logger(`ERROR: SEAL_E2E_EXAMPLE_ROOT is not under safe roots (${safeRoots.join(" ")}).`);
    logger("       Set SEAL_E2E_SAFE_ROOTS or SEAL_E2E_UNSAFE_EXAMPLE_ROOT=1 to override.");
    process.exit(1);
  }
}

function prepareExampleWorkspace(options) {
  const env = options.env || process.env;
  const log = options.log;
  const repoRoot = options.repoRoot || "";
  const exampleSrc = path.join(repoRoot, "tools", "seal", "example");
  let exampleRootBase = options.exampleRootBase || "";
  const hardTmp = "/tmp";
  let fallbackExampleRoot = env.SEAL_E2E_TMP_ROOT || os.tmpdir();
  if (fallbackExampleRoot && (fallbackExampleRoot === exampleSrc || fallbackExampleRoot.startsWith(`${exampleSrc}${path.sep}`))) {
    if (typeof log === "function") {
      log(`WARN: SEAL_E2E_TMP_ROOT is inside example source (${fallbackExampleRoot}); using ${hardTmp}.`);
    }
    fallbackExampleRoot = hardTmp;
  }
  if (fallbackExampleRoot && (fallbackExampleRoot === exampleSrc || fallbackExampleRoot.startsWith(`${exampleSrc}${path.sep}`))) {
    if (typeof log === "function") {
      log(`WARN: tmp fallback is still inside example source (${fallbackExampleRoot}); using /var/tmp.`);
    }
    fallbackExampleRoot = "/var/tmp";
  }
  if (exampleRootBase && (exampleRootBase === exampleSrc || exampleRootBase.startsWith(`${exampleSrc}${path.sep}`))) {
    if (typeof log === "function") {
      log(`WARN: exampleRootBase is inside example source (${exampleRootBase}); using tmp fallback.`);
    }
    exampleRootBase = "";
  }
  const defaultExampleRoot = exampleRootBase
    ? path.join(exampleRootBase, "single")
    : path.join(fallbackExampleRoot, "seal-example-e2e");
  const exampleDst = env.SEAL_E2E_EXAMPLE_ROOT || defaultExampleRoot;
  const cleanupExample = !env.SEAL_E2E_EXAMPLE_ROOT;
  const copyExample = isEnabled(env, "SEAL_E2E_COPY_EXAMPLE", "1");
  const safeRoots = buildSafeRoots(env, [exampleRootBase]);

  if (copyExample) {
    if (typeof log === "function") {
      log("Preparing disposable example workspace...");
    }
    requireSafeExampleRoot(exampleDst, safeRoots, env, log);
    ensureDir(path.dirname(exampleDst));
    fs.rmSync(exampleDst, { recursive: true, force: true });
    fs.cpSync(exampleSrc, exampleDst, { recursive: true, dereference: false });
    env.SEAL_E2E_EXAMPLE_ROOT = exampleDst;
  }

  const exampleDir = env.SEAL_E2E_EXAMPLE_ROOT || exampleDst;
  if (!copyExample && !fs.existsSync(exampleDir)) {
    if (typeof log === "function") {
      log(`ERROR: SEAL_E2E_EXAMPLE_ROOT not found (${exampleDir}).`);
      log("       Set SEAL_E2E_EXAMPLE_ROOT to an existing example or enable SEAL_E2E_COPY_EXAMPLE=1.");
    }
    process.exit(1);
  }

  return {
    exampleRoot: exampleDst,
    exampleDir,
    cleanupExample,
    exampleSrc,
  };
}

module.exports = {
  buildSafeRoots,
  prepareExampleWorkspace,
  requireSafeExampleRoot,
};
