"use strict";

const fs = require("fs");
const path = require("path");

function isForbiddenTmp(p) {
  return p === "/tmp" || p.startsWith("/tmp/") || p === "/var/tmp" || p.startsWith("/var/tmp/");
}

function resolveTmpBase({ projectRoot } = {}) {
  const env = process.env;
  const candidates = [
    env.SEAL_TMPDIR,
    env.SEAL_E2E_TMP_ROOT,
    env.TMPDIR,
    env.TMP,
    env.TEMP,
  ].filter(Boolean);

  for (const cand of candidates) {
    const resolved = path.resolve(cand);
    if (!isForbiddenTmp(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
      return resolved;
    }
  }

  const root = projectRoot ? path.resolve(projectRoot) : process.cwd();
  const base = path.join(root, "seal-out", "tmp");
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function mkdtemp(prefix, options = {}) {
  const base = resolveTmpBase(options);
  return fs.mkdtempSync(path.join(base, prefix));
}

module.exports = {
  resolveTmpBase,
  mkdtemp,
};
