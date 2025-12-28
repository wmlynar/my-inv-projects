"use strict";

const path = require("path");

const { buildRelease } = require("./build");
const { getSealPaths } = require("./project");
const { info, ok } = require("./ui");

async function buildFastRelease({ projectRoot, projectCfg, targetCfg, configName, timing }) {
  const appName = projectCfg.appName;
  const { outDir } = getSealPaths(projectRoot);
  const fastOutDir = path.join(outDir, "fast");

  const res = await buildRelease({
    projectRoot,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: "bundle",
    outDirOverride: fastOutDir,
    skipArtifact: true,
    timing,
  });

  const folderName = `${appName}-fast-${res.buildId}`;
  info(`Fast release: ${folderName}`);
  ok("Fast release ready (bundle)");

  return {
    ...res,
    folderName,
    releaseDir: res.releaseDir,
    outDir: fastOutDir,
  };
}

module.exports = { buildFastRelease };
