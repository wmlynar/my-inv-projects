"use strict";

const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { loadProjectConfig, findLastArtifact } = require("../lib/project");
const { fileExists } = require("../lib/fsextra");
const { info, warn, ok, err, hr } = require("../lib/ui");
const { verifyArtifact, explainChecklist, buildVerifyReport, writeVerifyReport } = require("../lib/verify");

async function cmdVerify(cwd, artifactOrTarget, opts) {
  opts = opts || {};
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Jeśli to root monorepo z listą projects, uruchom polecenie w root (wykona się dla podprojektów) albo przejdź do podprojektu.");
  const verifyCfg = (proj.verify && typeof proj.verify === "object" && !Array.isArray(proj.verify)) ? proj.verify : {};

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

  if (!opts.json) {
    hr();
    info(`Verify: ${artifactPath}`);
    hr();
  }

  const verifyOptions = {
    forbidGlobs: verifyCfg.forbidGlobs || verifyCfg.forbiddenGlobs || null,
    forbidStrings: verifyCfg.forbidStrings || verifyCfg.forbiddenStrings || verifyCfg.forbidWords || null,
  };
  const res = await verifyArtifact(artifactPath, verifyOptions);
  const checklist = opts.explain ? explainChecklist(res) : null;
  let watermarkError = null;
  if (opts.watermark) {
    if (!res.manifest) {
      watermarkError = "manifest.json missing; watermark info unavailable.";
    } else if (!res.manifest.watermark || res.manifest.watermark.enabled !== true || !res.manifest.watermark.hash) {
      watermarkError = "watermark not found in manifest.json.";
    }
  }

  const report = buildVerifyReport({
    artifactPath,
    result: res,
    options: verifyOptions,
    checklist,
    source: "verify",
    includeEntries: !!opts.json,
  });
  if (watermarkError) report.watermarkError = watermarkError;
  writeVerifyReport(projectRoot, report);

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    if (!res.ok || watermarkError) process.exitCode = 1;
    return;
  }

  if (opts.explain) {
    console.log(checklist);
    console.log("");
  }

  if (opts.watermark) {
    if (watermarkError) {
      warn(watermarkError);
      throw new Error("watermark not found");
    }
    const wm = res.manifest.watermark;
    const infoLines = [];
    infoLines.push(`Watermark hash: ${wm.hash}`);
    if (wm.mode) infoLines.push(`mode=${wm.mode}`);
    if (wm.source) infoLines.push(`source=${wm.source}`);
    if (wm.style) infoLines.push(`style=${wm.style}`);
    info(infoLines.join(" "));
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
