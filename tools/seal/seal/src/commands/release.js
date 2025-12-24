"use strict";

const { findProjectRoot } = require("../lib/paths");
const { loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile } = require("../lib/project");
const { fileExists } = require("../lib/fsextra");
const { info, warn, ok, hr } = require("../lib/ui");
const { cmdCheck } = require("./check");
const { buildRelease } = require("../lib/build");

async function cmdRelease(cwd, targetArg, opts) {
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal-config/project.json5. Zrób: seal init");

  const targetName = resolveTargetName(projectRoot, targetArg);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);

  const targetCfg = t.cfg;
  targetCfg.appName = proj.appName;

  const configName = resolveConfigName(targetCfg, opts.config);
  const configFile = getConfigFile(projectRoot, configName);
  if (!fileExists(configFile)) {
    warn(`Missing config/${configName}.json5. Creating template...`);
    // Suggest user to create
    console.log(`Tip: seal config add ${configName}`);
  }

  if (!opts.skipCheck) {
    await cmdCheck(projectRoot, null, { strict: false });
  }

  const result = await buildRelease({
    projectRoot,
    projectCfg: proj,
    targetCfg,
    configName,
    packagerOverride: opts.packager,
  });

  ok(`Release ready: ${result.releaseDir}`);
  console.log("Next:");
  console.log("  seal verify --explain");
  console.log("  seal run-local --sealed");
  console.log("");
  console.log("Inspect:");
  console.log(`  ls -la ${result.releaseDir}`);

  // Update support bundle (always) – useful even when the release succeeds.
  try {
    const { writeAiBundle } = require("../lib/aiBundle");
    const bundle = writeAiBundle(projectRoot, null, {
      kind: "release_success",
      buildId: result.buildId,
      artifactPath: result.artifactPath,
      releaseDir: result.releaseDir,
      target: targetName,
      config: configName,
      packager: result.packagerUsed,
    });
    if (bundle) info(`AI bundle updated: ${bundle}`);
  } catch {
    // ignore
  }

  return result;
}

module.exports = { cmdRelease };
