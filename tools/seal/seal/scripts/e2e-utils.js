"use strict";

const fs = require("fs");
const os = require("os");
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

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function resolveE2ETimeoutScale() {
  const override = parseNumber(process.env.SEAL_E2E_TIMEOUT_SCALE);
  if (override !== null && override > 0) return override;
  if (process.env.SEAL_E2E_SLOW === "1") return 2;
  if (process.env.SEAL_DOCKER_E2E === "1") return 2;
  return 1;
}

function resolveE2ETimeout(envKey, defaultMs) {
  const override = envKey ? parseNumber(process.env[envKey]) : null;
  if (override !== null) return override;
  const scale = resolveE2ETimeoutScale();
  return Math.max(1, Math.round(defaultMs * scale));
}

function resolveE2ERunTimeout(envKey, defaultMs) {
  const override = parseNumber(process.env[envKey]);
  if (override !== null) return override;
  const base = resolveE2ETimeout(null, defaultMs);
  const jobs = Math.max(1, parseNumber(process.env.SEAL_E2E_JOBS) || 1);
  const scaled = base + (jobs - 1) * 5000;
  return Math.min(base * 4, scaled);
}

function makeReadyFile(label) {
  const safeLabel = String(label || "seal")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "");
  const name = `${safeLabel}-ready-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`;
  return path.join(os.tmpdir(), name);
}

function applyReadyFileEnv(env, readyFile) {
  const out = Object.assign({}, env || {});
  if (readyFile) {
    out.SEAL_E2E_READY_FILE = readyFile;
    out.SEAL_E2E_NO_LISTEN = "1";
  }
  return out;
}

async function waitForReadyFile(filePath, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timeout waiting for ready file: ${filePath}`);
}

module.exports = {
  resolveCommand,
  hasCommand,
  resolveE2ERunTimeout,
  resolveE2ETimeout,
  makeReadyFile,
  applyReadyFileEnv,
  waitForReadyFile,
};
