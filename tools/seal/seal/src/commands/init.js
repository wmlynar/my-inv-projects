"use strict";

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, detectAppName, detectEntry } = require("../lib/project");
const { ensureDir, safeWriteFile, fileExists } = require("../lib/fsextra");
const { writeJson5 } = require("../lib/json5io");
const { info, ok, hr } = require("../lib/ui");

function templateProjectJson5(appName, entry) {
  return {
    appName,
    entry,
    defaultTarget: "local",
    build: {
      packager: "auto",
      packagerFallback: false,
      securityProfile: "strict",
      frontendMinify: { enabled: true, level: "safe", html: true, css: true },
      // NOTE: SEA does not support strip/ELF packer (fail-fast). thin-split uses kiteshield by default.
      protection: {
        enabled: true,
        seaMain: { pack: true, method: "brotli", chunkSize: 8000 },
        bundle: { pack: true },
        strip: { enabled: false, cmd: "strip" },
        elfPacker: { tool: "kiteshield", cmd: "kiteshield", args: ["-n", "{in}", "{out}"] },
      },
      thin: { mode: "split", level: "low" },
      decoy: { mode: "none", scope: "backend", sourceDir: "decoy", overwrite: false, generator: "off" },
      includeDirs: ["public", "data"],
    },
  };
}

function templatePolicyJson5() {
  return {
    retention: {
      keepReleases: 1,
      cleanupOnSuccess: true,
      neverDeleteCurrent: true,
      keepAtLeastOneRollback: true,
    },
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
    config: "local",
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

  // seal.json5 (project + policy)
  if (!fileExists(paths.sealFile) || force) {
    const proj = templateProjectJson5(appName, entry);
    if (!proj.appName) proj.appName = appName;
    if (!proj.entry) proj.entry = entry;
    if (!proj.defaultTarget) proj.defaultTarget = "local";
    if (!proj.build) proj.build = templateProjectJson5(appName, entry).build;
    const sealCfg = { ...proj, policy: templatePolicyJson5() };
    writeJson5(paths.sealFile, sealCfg);
    ok("Created seal.json5");
  } else {
    ok("Keeping existing seal.json5");
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
