"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSyncSafe } = require("../spawn");
const { fileExists, copyFile } = require("../fsextra");
const { resolvePostjectBin } = require("../postject");

/**
 * SEA packager (Linux-friendly baseline).
 * Tries to build a single executable using Node SEA blob + postject injection.
 *
 * If it fails (unsupported Node, missing postject, platform issues), SEA build fails.
 */
function packSea({ stageDir, releaseDir, appName, mainRel }) {
  try {
    const nodePath = process.execPath;
    const seaConfigPath = path.join(stageDir, "sea-config.json");
    const blobPath = path.join(stageDir, "sea-prep.blob");
    const resolvedMainRel = mainRel || "./bundle.obf.cjs";

    // Node SEA config fields evolve; enable safe defaults when supported.
    const seaCfg = {
      main: resolvedMainRel,
      output: "./sea-prep.blob",
    };

    // Disable the experimental warning spam when supported.
    // Enable code cache to avoid shipping an always-fresh compilation path.
    // (Best-effort; if Node rejects the fields, SEA generation will fail.)
    seaCfg.disableExperimentalSEAWarning = true;
    seaCfg.useCodeCache = true;

    fs.writeFileSync(seaConfigPath, JSON.stringify(seaCfg, null, 2) + "\n", "utf-8");

    // 1) Generate blob
    const gen = spawnSyncSafe(nodePath, ["--experimental-sea-config", seaConfigPath], { cwd: stageDir, stdio: "pipe" });
    if (!gen.ok) {
      return { ok: false, errorShort: `node SEA config failed (status=${gen.status})`, error: gen.stderr || gen.stdout || "" };
    }
    if (!fileExists(blobPath)) {
      return { ok: false, errorShort: "SEA blob not produced", error: gen.stderr || gen.stdout || "" };
    }

    // 2) Copy node binary to release/<appName>
    const outBin = path.join(releaseDir, appName);
    fs.copyFileSync(nodePath, outBin);
    fs.chmodSync(outBin, 0o755);

    // 3) Inject blob (postject)
    // Sentinel fuse value documented in Node SEA guides; if Node changes it, SEA may fail.
    const fuse = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

    // postject is optional in v0.6. If it's not installed, SEA will fail.
    const postjectCmd = resolvePostjectBin() || "postject";

const inj = spawnSyncSafe(postjectCmd, [outBin, "NODE_SEA_BLOB", blobPath, "--sentinel-fuse", fuse], { cwd: stageDir, stdio: "pipe" });
if (!inj.ok) {
  const hint = (inj.error && inj.error.includes("ENOENT")) ? "postject not found in PATH" : "postject failed";
  return { ok: false, errorShort: `${hint} (status=${inj.status ?? "?"})`, error: inj.stderr || inj.stdout || inj.error || "" };
}

    // Optionally: strip xattrs? not here.
    return { ok: true };
  } catch (e) {
    return { ok: false, errorShort: e && e.message ? e.message : String(e), error: e && e.stack ? e.stack : String(e) };
  }
}

module.exports = { packSea };
