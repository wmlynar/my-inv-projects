"use strict";

const path = require("path");
const fs = require("fs");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, getConfigFile } = require("../lib/project");
const { info, warn, ok, hr } = require("../lib/ui");
const { fileExists } = require("../lib/fsextra");

async function wizard(cwd) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);
  const hasSeal = fileExists(paths.sealFile);
  const pkgPath = path.join(projectRoot, "package.json");

  hr();
  info(`SEAL v0.6 wizard`);
  info(`cwd: ${cwd}`);
  info(`projectRoot: ${projectRoot}`);
  hr();

  if (!fs.existsSync(pkgPath)) {
    warn("Brak package.json w bieżącym katalogu (to nie wygląda jak projekt Node).");
    console.log("Tip: przejdź do folderu projektu i uruchom ponownie: seal");
    return;
  }

  if (!hasSeal) {
    warn("Projekt nie jest zainicjalizowany pod SEAL (brak seal.json5).");
    console.log("");
    console.log("Następny krok:");
    console.log("  seal init");
    console.log("");
    console.log("Potem:");
    console.log("  seal check");
    console.log("  seal release");
    console.log("  seal run-local --sealed");
    return;
  }

  const proj = loadProjectConfig(projectRoot);
  ok(`Projekt SEAL: appName=${proj.appName} entry=${proj.entry}`);

  // missing config local?
  const localCfg = getConfigFile(projectRoot, "local");
  if (!fileExists(localCfg)) {
    warn("Brak config local (seal-config/configs/local.json5)");
    console.log("Następny krok:");
    console.log("  seal config add local");
    return;
  }

  // missing target/local?
  const localTarget = path.join(paths.targetsDir, "local.json5");
  if (!fileExists(localTarget)) {
    warn("Brak targetu local (seal-config/targets/local.json5)");
    console.log("Następny krok:");
    console.log("  seal target add local");
    return;
  }

  // Suggest typical actions
  console.log("");
  console.log("Typowe komendy:");
  console.log("  seal check");
  console.log("  seal release");
  console.log("  seal verify --explain");
  console.log("  seal run-local --sealed");
  console.log("");
  console.log("Deploy (localhost / serwer):");
  console.log("  seal deploy local --bootstrap");
  console.log("  seal deploy <target> --bootstrap");
  console.log("");
  console.log("Nie wiesz co dalej? Zrób:");
  console.log("  seal explain");
}

module.exports = { wizard };
