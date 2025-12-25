"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSyncSafe } = require("./spawn");
const { fileExists } = require("./fsextra");

function hasCommand(cmd) {
  const r = spawnSyncSafe("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`], { stdio: "pipe" });
  return !!r.ok;
}

function resolvePostjectBin() {
  const candidates = [
    path.join(__dirname, "..", "..", "node_modules", ".bin", "postject"),
    path.join(__dirname, "..", "..", "..", "node_modules", ".bin", "postject"),
    path.join(__dirname, "..", "..", "..", "..", "..", "node_modules", ".bin", "postject"),
  ];

  for (const cand of candidates) {
    if (fileExists(cand)) return cand;
  }

  try {
    const pkgPath = require.resolve("postject/package.json");
    const pkgDir = path.dirname(pkgPath);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const binRel = typeof pkg.bin === "string" ? pkg.bin : (pkg.bin && pkg.bin.postject);
    if (binRel) {
      const binPath = path.join(pkgDir, binRel);
      if (fileExists(binPath)) return binPath;
    }
  } catch {
    // ignore
  }

  if (hasCommand("postject")) return "postject";
  return null;
}

module.exports = { resolvePostjectBin };
