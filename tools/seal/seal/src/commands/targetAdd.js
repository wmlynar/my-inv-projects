"use strict";

const path = require("path");
const os = require("os");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig } = require("../lib/project");
const { writeJson5 } = require("../lib/json5io");
const { ensureDir, fileExists } = require("../lib/fsextra");
const { info, ok, warn, hr } = require("../lib/ui");

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
      packager: "auto",
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
    packager: "auto",
    config: target,
  };
}

async function cmdTargetAdd(cwd, target) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal-config/project.json5. Zrób: seal init");

  ensureDir(paths.targetsDir);

  const file = path.join(paths.targetsDir, `${target}.json5`);
  if (fileExists(file)) {
    warn(`Target already exists: ${file}`);
    return;
  }

  writeJson5(file, templateTarget(projectRoot, proj.appName, target));
  ok(`Created target: ${file}`);
  console.log("Next: edit host/user/installDir if needed.");
}

module.exports = { cmdTargetAdd };
