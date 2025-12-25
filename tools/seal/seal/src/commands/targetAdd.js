"use strict";

const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig } = require("../lib/project");
const { ensureDir, fileExists } = require("../lib/fsextra");
const { writeJson5 } = require("../lib/json5io");
const { ok, warn } = require("../lib/ui");

function templateTarget(projectRoot, appName, target) {
  if (target === "local") {
    return {
      target: "local",
      kind: "local",
      host: "127.0.0.1",
      user: process.env.USER || "local",
      serviceScope: "user",
      installDir: `~/.local/share/seal/${appName}`,
      serviceName: `${appName}-sandbox`,
      packager: "thin-split",
      config: "local",
    };
  }

  return {
    target,
    kind: "ssh",
    host: "CHANGE-ME",
    user: "admin",
    serviceScope: "system",
    installDir: `/home/admin/apps/${appName}`,
    serviceName: appName,
    packager: "thin-split",
    config: target,
  };
}

async function cmdTargetAdd(cwd, target) {
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  const paths = getSealPaths(projectRoot);
  ensureDir(paths.targetsDir);

  const targetFile = path.join(paths.targetsDir, `${target}.json5`);
  if (fileExists(targetFile)) {
    warn(`Target already exists: ${targetFile}`);
    return;
  }

  writeJson5(targetFile, templateTarget(projectRoot, proj.appName, target));
  ok(`Created target: ${targetFile}`);
  console.log("Next: edit host/user/installDir if needed.");
}

module.exports = { cmdTargetAdd };
