"use strict";

const fs = require("fs");
const path = require("path");

const SEAL_CONFIG_DIR = "seal-config";
const SEAL_OUT_DIR = "seal-out";

/**
 * Find project root:
 * - prefer directory containing seal-config/project.json5
 * - else fallback to nearest directory containing package.json
 */
function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 25; i++) {
    const sealProject = path.join(dir, SEAL_CONFIG_DIR, "project.json5");
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(sealProject)) return dir;
    if (fs.existsSync(pkg)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(startDir);
}

function pJoin(...parts) {
  return path.join(...parts);
}

module.exports = { findProjectRoot, pJoin, SEAL_CONFIG_DIR, SEAL_OUT_DIR };
