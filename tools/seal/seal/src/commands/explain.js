"use strict";

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile, findLastArtifact } = require("../lib/project");
const { info, warn, ok, hr } = require("../lib/ui");
const { fileExists } = require("../lib/fsextra");

async function cmdExplain(cwd, opts) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);

  const proj = loadProjectConfig(projectRoot);
  if (!proj) {
    throw new Error("Brak seal.json5 (projekt). Jeśli to root monorepo z listą projects, uruchom polecenie w root (wykona się dla podprojektów) albo przejdź do podprojektu.");
  }

  const targetName = resolveTargetName(projectRoot, null);
  const t = loadTargetConfig(projectRoot, targetName);
  const targetCfg = t ? t.cfg : null;

  const configName = targetCfg ? resolveConfigName(targetCfg, null) : "local";
  const configFile = getConfigFile(projectRoot, configName);
  const configOk = fileExists(configFile);

  const out = {
    projectRoot,
    appName: proj.appName,
    entry: proj.entry,
    defaultTarget: proj.defaultTarget,
    build: proj.build,
    target: targetCfg || { missing: true, expected: `seal-config/targets/${targetName}.json5` },
    configName,
    configFromSeal: configOk,
    runtimeConfig: paths.runtimeConfigPath,
    sealFile: paths.sealFile,
    outDir: paths.outDir,
    artifactPath: findLastArtifact(projectRoot, proj.appName),
  };

  if (opts.json) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  hr();
  info("SEAL explain");
  hr();
  console.log(`projectRoot: ${projectRoot}`);
  console.log(`appName:      ${proj.appName}`);
  console.log(`entry:        ${proj.entry}`);
  console.log(`defaultTarget:${proj.defaultTarget}`);
  console.log(`configName:   ${configName}`);
  console.log(`config:       ${configOk ? configFile : "missing"}`);
  console.log(`runtimeConfig:${fileExists(paths.runtimeConfigPath) ? paths.runtimeConfigPath : paths.runtimeConfigPath + " (missing)"}`);
  console.log(`sealFile:     ${paths.sealFile}`);
  console.log(`outDir:       ${paths.outDir}`);
  console.log(`artifact:     ${findLastArtifact(projectRoot, proj.appName) || "(none)"}`);
  console.log("");
  console.log("Targets:");
  if (!targetCfg) {
    warn(`missing target: ${targetName} (create: seal target add ${targetName})`);
  } else {
    console.log(`- ${targetName}: kind=${targetCfg.kind} host=${targetCfg.host} user=${targetCfg.user} installDir=${targetCfg.installDir} service=${targetCfg.serviceName}`);
  }
}

module.exports = { cmdExplain };
