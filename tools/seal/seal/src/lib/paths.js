"use strict";

const fs = require("fs");
const path = require("path");
const { readJson5 } = require("./json5io");

const SEAL_CONFIG_DIR = "seal-config";
const SEAL_FILE = "seal.json5";
const SEAL_OUT_DIR = "seal-out";

/**
 * Find project root:
 * - prefer directory containing seal.json5 (non-workspace)
 */
function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 25; i++) {
    const sealProject = path.join(dir, SEAL_FILE);
    if (fs.existsSync(sealProject)) {
      try {
        const cfg = readJson5(sealProject);
        if (!cfg || !Array.isArray(cfg.projects)) return dir;
      } catch {
        return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(startDir);
}

function pJoin(...parts) {
  return path.join(...parts);
}

module.exports = { findProjectRoot, pJoin, SEAL_CONFIG_DIR, SEAL_FILE, SEAL_OUT_DIR };
