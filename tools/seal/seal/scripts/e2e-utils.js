"use strict";

const fs = require("fs");
const path = require("path");

function resolveCommand(cmd) {
  if (!cmd) return null;
  const str = String(cmd);
  if (!str) return null;
  const hasSlash = str.includes("/") || str.includes("\\");
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";")
    : [""];
  const candidates = [];
  if (hasSlash) {
    candidates.push(str);
  } else {
    const pathEnv = process.env.PATH || "";
    for (const dir of pathEnv.split(path.delimiter)) {
      if (!dir) continue;
      for (const ext of exts) {
        candidates.push(path.join(dir, str + ext));
      }
    }
  }
  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (!stat.isFile()) continue;
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // ignore
    }
  }
  return null;
}

function hasCommand(cmd) {
  return !!resolveCommand(cmd);
}

module.exports = { resolveCommand, hasCommand };
