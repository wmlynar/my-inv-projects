"use strict";

const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { loadProjectConfig, findLastArtifact } = require("../lib/project");
const { fileExists } = require("../lib/fsextra");
const { info, warn, ok, err, hr } = require("../lib/ui");
const { verifyArtifact, explainChecklist } = require("../lib/verify");

async function cmdVerify(cwd, artifactOrTarget, opts) {
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Jeśli jesteś w root monorepo, użyj seal batch lub przejdź do podprojektu.");

  let artifactPath = null;

  if (artifactOrTarget && artifactOrTarget.endsWith(".tgz")) {
    artifactPath = path.resolve(artifactOrTarget);
  } else if (artifactOrTarget) {
    // treat as target name and pick last artifact
    artifactPath = findLastArtifact(projectRoot, proj.appName);
  } else {
    artifactPath = findLastArtifact(projectRoot, proj.appName);
  }

  if (!artifactPath || !fileExists(artifactPath)) {
    throw new Error("Brak artefaktu do weryfikacji. Zrób: seal release");
  }

  hr();
  info(`Verify: ${artifactPath}`);
  hr();

  const res = await verifyArtifact(artifactPath);

  if (opts.explain) {
    console.log(explainChecklist(res));
    console.log("");
  }

  if (res.ok) {
    ok("Artifact looks clean (no obvious leaks).");
  } else {
    err("Artifact FAILED verification:");
    for (const l of res.leaks) {
      console.log(` - ${l.reason}: ${l.path}`);
    }
    throw new Error("verify failed");
  }
}

module.exports = { cmdVerify };
