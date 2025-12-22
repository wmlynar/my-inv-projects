"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const AdmZip = require("adm-zip");

const { findProjectRoot } = require("./paths");
const { getSealPaths } = require("./project");
const { ensureDir, fileExists } = require("./fsextra");
const { version } = require("./version");

function safeReadText(p, maxBytes = 256_000) {
  try {
    const buf = fs.readFileSync(p);
    return buf.length > maxBytes ? buf.slice(0, maxBytes).toString("utf-8") : buf.toString("utf-8");
  } catch {
    return null;
  }
}

function listJson5Files(dirPath) {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".json5"))
      .map((d) => path.join(dirPath, d.name));
  } catch {
    return [];
  }
}

function addLocalFile(zip, absPath, zipRelPath) {
  try {
    if (!fileExists(absPath)) return;
    const zipDir = path.dirname(zipRelPath);
    const zipName = path.basename(zipRelPath);
    zip.addLocalFile(absPath, zipDir === "." ? "" : zipDir, zipName);
  } catch {
    // ignore
  }
}

function addText(zip, zipRelPath, text) {
  try {
    zip.addFile(zipRelPath, Buffer.from(String(text ?? ""), "utf-8"));
  } catch {
    // ignore
  }
}

/**
 * Create AI/support bundle on failure.
 * Writes:
 *  - <project>/seal-out/ai.zip (latest)
 *
 * This bundle is meant to be shared with an AI to debug SEAL failures.
 */
function writeAiBundle(cwd, err, extra = {}) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);
  if (!fileExists(paths.projectFile)) return null;

  ensureDir(paths.outDir);
  const latestZip = path.join(paths.outDir, "ai.zip");

  const zip = new AdmZip();

  // Core report
  const report = {
    ts: new Date().toISOString(),
    sealVersion: version,
    cwd,
    projectRoot,
    argv: process.argv,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    os: {
      type: os.type(),
      release: os.release(),
      hostname: os.hostname(),
    },
    error: err
      ? {
          name: err.name,
          message: err.message,
          code: err.code ?? null,
          stack: err.stack,
          sealCheck: err.sealCheck ?? null,
        }
      : null,
    extra,
  };

  addText(zip, "ai_report.json", JSON.stringify(report, null, 2));

  // Project snapshots (small, useful)
  addLocalFile(zip, path.join(projectRoot, "package.json"), "project/package.json");
  addLocalFile(zip, path.join(projectRoot, "package-lock.json"), "project/package-lock.json");
  addLocalFile(zip, path.join(projectRoot, "README.md"), "project/README.md");
  addLocalFile(zip, path.join(projectRoot, "AGENTS.md"), "project/AGENTS.md");

  addLocalFile(zip, path.join(paths.sealConfigDir, "project.json5"), "seal-config/project.json5");
  addLocalFile(zip, path.join(paths.sealConfigDir, "policy.json5"), "seal-config/policy.json5");

  // Targets
  for (const f of listJson5Files(paths.targetsDir)) {
    addLocalFile(zip, f, `seal-config/targets/${path.basename(f)}`);
  }

  // Runtime config(s)
  addLocalFile(zip, path.join(projectRoot, "config.runtime.json5"), "config/config.runtime.json5");
  const cfgDir = path.join(projectRoot, "config");
  for (const f of listJson5Files(cfgDir)) {
    // Include all variants (usually tiny). If you store secrets here: treat the bundle as sensitive.
    addLocalFile(zip, f, `config/${path.basename(f)}`);
  }

  // Optional: last release meta for context (if exists).
  // NOTE: meta.json is NOT shipped inside the release artifact.
  const latestMeta = path.join(paths.outDir, "meta.json");
  addLocalFile(zip, latestMeta, "last_release/meta.json");

  // Write zip (always overwrite)
  zip.writeZip(latestZip);

  return latestZip;
}

module.exports = { writeAiBundle };
