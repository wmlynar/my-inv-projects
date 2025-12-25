"use strict";

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, detectAppName, detectEntry } = require("../lib/project");
const { ensureDir, safeWriteFile, fileExists } = require("../lib/fsextra");
const { writeJson5 } = require("../lib/json5io");
const { info, warn, ok, hr } = require("../lib/ui");

function templateProjectJson5(appName, entry) {
  return {
    appName,
    entry,
    defaultTarget: "local",
    build: {
      packager: "auto",
      obfuscationProfile: "balanced",
      frontendObfuscation: { enabled: true, profile: "balanced" },
      frontendMinify: { enabled: true, level: "safe", html: true, css: true },
      // NOTE: strip/upx are experimental for postject-ed SEA binaries; keep them OFF by default.
      hardening: { enabled: true, strip: false, upx: false, bundlePacking: true },
      includeDirs: ["public", "data"]
    }
  };
}

function templatePolicyJson5() {
  return {
    retention: {
      keepReleases: 1,
      cleanupOnSuccess: true,
      neverDeleteCurrent: true,
      keepAtLeastOneRollback: true,
    }
  };
}

function templateTargetLocal(appName) {
  return {
    target: "local",
    kind: "local",
    host: "127.0.0.1",
    user: process.env.USER || "local",
    serviceScope: "user",
    installDir: `~/.local/share/seal/${appName}`,
    serviceName: `${appName}-sandbox`,
    packager: "auto",
    config: "local"
  };
}

function templateConfigLocal(appName) {
  return `// seal-config/configs/local.json5 – runtime config (dev & local sealed run)
{
  appName: "${appName}",
  http: {
    host: "127.0.0.1",
    port: 3000,
  },

  log: {
    // debug | error
    level: "debug",
    file: "./logs/app.log",
  },

  external: {
    // Example external service (debug logs show request/response)
    echoUrl: "https://postman-echo.com/get?source=seal",
    timeoutMs: 5000,
  },

  featuresFile: "./data/feature_flags.json",
}
`;
}

async function cmdInit(cwd, opts) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);

  hr();
  info(`Init in: ${projectRoot}`);
  hr();

  const appName = detectAppName(projectRoot);
  const entry = detectEntry(projectRoot);
  if (!entry) {
    throw new Error("Nie mogę wykryć entrypointu. Ustaw `main` w package.json albo dodaj src/index.js.");
  }

  ensureDir(paths.sealConfigDir);
  ensureDir(paths.targetsDir);
  ensureDir(paths.configDir);

  const force = !!opts.force;

  // project.json5
  if (!fileExists(paths.projectFile) || force) {
    // we write as JSON (valid JSON5)
    const proj = {
      appName,
      entry,
      defaultTarget: "local",
      build: {
        packager: "auto",
        allowFallback: false,
        obfuscationProfile: "balanced",
        frontendObfuscation: { enabled: true, profile: "balanced" },
        frontendMinify: { enabled: true, level: "safe", html: true, css: true },
        // NOTE: strip/upx are experimental for postject-ed SEA binaries; keep them OFF by default.
        hardening: { enabled: true, strip: false, upx: false, bundlePacking: true },
        includeDirs: ["public", "data"]
      }
    };
    writeJson5(paths.projectFile, proj);
    ok("Created seal-config/project.json5");
  } else {
    ok("Keeping existing seal-config/project.json5");
  }

  // policy.json5
  if (!fileExists(paths.policyFile) || force) {
    writeJson5(paths.policyFile, templatePolicyJson5());
    ok("Created seal-config/policy.json5");
  } else {
    ok("Keeping existing seal-config/policy.json5");
  }

  // local target
  const localTargetPath = path.join(paths.targetsDir, "local.json5");
  if (!fileExists(localTargetPath) || force) {
    writeJson5(localTargetPath, templateTargetLocal(appName));
    ok("Created seal-config/targets/local.json5");
  } else {
    ok("Keeping existing seal-config/targets/local.json5");
  }

  // seal-config/configs/local.json5
  const localCfgPath = path.join(paths.configDir, "local.json5");
  const wrote = safeWriteFile(localCfgPath, templateConfigLocal(appName), { force });
  if (wrote) ok("Created seal-config/configs/local.json5");
  else ok("Keeping existing seal-config/configs/local.json5");

  // config.runtime.json5 (dev convenience)
  if (!fileExists(paths.runtimeConfigPath) || force) {
    fs.copyFileSync(localCfgPath, paths.runtimeConfigPath);
    ok("Created config.runtime.json5 (copy of local)");
  } else {
    ok("Keeping existing config.runtime.json5");
  }

  // logs dir hint
  if (!fileExists(path.join(projectRoot, "logs"))) {
    ensureDir(path.join(projectRoot, "logs"));
  }

  console.log("");
  console.log("Next:");
  console.log("  seal check");
  console.log("  seal release");
  console.log("  seal run-local --sealed");
  console.log("");
  console.log("DEV run:");
  console.log(`  node ${entry}`);
}

module.exports = { cmdInit };
