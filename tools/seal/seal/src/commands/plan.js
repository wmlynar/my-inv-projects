"use strict";

const { findProjectRoot } = require("../lib/paths");
const { loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile } = require("../lib/project");
const { fileExists } = require("../lib/fsextra");
const { buildPlan, writePlanArtifacts } = require("../lib/plan");
const { info, ok, warn } = require("../lib/ui");

async function cmdPlan(cwd, targetArg, opts) {
  opts = opts || {};
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot, { profileOverlay: opts.profileOverlay });
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  const targetName = resolveTargetName(projectRoot, targetArg);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);

  const targetCfg = t.cfg;
  targetCfg.appName = proj.appName;

  const configName = resolveConfigName(targetCfg, opts.config);
  const configFile = getConfigFile(projectRoot, configName);
  if (!fileExists(configFile)) {
    warn(`Missing config file: ${configFile}`);
    console.log(`Tip: seal config add ${configName}`);
  }

  info(`Plan -> ${targetName}`);
  const plan = buildPlan({
    projectRoot,
    projectCfg: proj,
    targetCfg,
    targetName,
    configName,
    packagerOverride: opts.packager || null,
    action: "plan",
    buildResult: null,
    artifactPath: null,
  });
  const res = writePlanArtifacts(projectRoot, plan);
  ok(`Plan written: ${res.jsonPath}`);
  ok(`Plan written: ${res.mdPath}`);
}

module.exports = { cmdPlan };
