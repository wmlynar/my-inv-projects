"use strict";

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig } = require("../lib/project");
const { fileExists, rmrf } = require("../lib/fsextra");
const { info, ok, hr } = require("../lib/ui");

async function cmdClean(cwd) {
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) {
    throw new Error("Brak seal.json5 (projekt). Jeśli to root monorepo z listą projects, uruchom polecenie w root (wykona się dla podprojektów) albo przejdź do podprojektu.");
  }

  const { outDir } = getSealPaths(projectRoot);

  hr();
  info(`Clean: ${proj.appName}`);
  hr();

  if (!fileExists(outDir)) {
    ok("Nothing to clean.");
    return;
  }

  rmrf(outDir);
  ok(`Removed: ${outDir}`);
}

module.exports = { cmdClean };
