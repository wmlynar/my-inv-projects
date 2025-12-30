"use strict";

const crypto = require("crypto");

function parseList(raw) {
  return String(raw || "")
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function makeRunId() {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${stamp}-${process.pid}`;
}

function formatDuration(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeFlag(value, fallback = "0") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value === "1" ? "1" : "0";
}

function isEnabled(env, key, fallback = "0") {
  const source = env || process.env;
  if (!source || !key) {
    return normalizeFlag(undefined, fallback) === "1";
  }
  return normalizeFlag(source[key], fallback) === "1";
}

function sanitizeName(raw) {
  const cleaned = String(raw || "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!cleaned) {
    return "group";
  }
  return cleaned.slice(0, 32);
}

function shortHash(raw) {
  return crypto.createHash("sha256").update(String(raw || "")).digest("hex").slice(0, 8);
}

function safeName(raw) {
  return `${sanitizeName(raw)}-${shortHash(raw)}`;
}

function assertEscalated(log) {
  if (process.env.SEAL_E2E_REQUIRE_ESCALATION === "0") {
    return;
  }
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  if (uid === 0 || process.env.SEAL_E2E_ESCALATED === "1") {
    return;
  }
  const logger = typeof log === "function" ? log : (msg) => process.stdout.write(`${msg}\n`);
  logger("ERROR: escalation required; run the shell wrapper or use sudo.");
  process.exit(1);
}

function logEffectiveConfig(log, lines) {
  const logger = typeof log === "function" ? log : (msg) => process.stdout.write(`${msg}\n`);
  logger("Effective config:");
  for (const line of lines || []) {
    if (!line) continue;
    logger(line);
  }
}

function formatConfigLine(entries) {
  const parts = (entries || [])
    .filter(Boolean)
    .map((entry) => {
      if (!entry || entry.key === undefined) return "";
      const value = entry.value === undefined || entry.value === null ? "" : String(entry.value);
      return `${entry.key}=${value}`;
    })
    .filter(Boolean);
  if (!parts.length) return "";
  return `  ${parts.join(" ")}`;
}

function buildRunConfigLines(options) {
  const entries = [
    { key: "run_layout", value: options.runLayout },
    { key: "run_id", value: options.runId },
    { key: "run_root", value: options.runRoot || "<none>" },
  ];
  if (options.includeTmpRoot) {
    entries.push({ key: "tmp_root", value: options.tmpRoot || "<none>" });
  }
  return [formatConfigLine(entries)];
}

function buildTimingRows(durationByTest, statusByTest) {
  const durations = durationByTest || {};
  const statuses = statusByTest || {};
  return Object.keys(durations).map((name) => ({
    name,
    duration: durations[name] || 0,
    status: statuses[name],
  }));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)}${units[idx]}`;
}

function getDuBytes(dir) {
  if (!dir) return null;
  const { existsSync } = require("fs");
  const { spawnSync } = require("child_process");
  if (!existsSync(dir)) return null;
  const res = spawnSync("du", ["-sb", dir], { encoding: "utf8" });
  if (!res.error && res.status === 0 && res.stdout) {
    const token = String(res.stdout).trim().split(/\s+/)[0];
    const parsed = Number(token);
    if (Number.isFinite(parsed)) return parsed;
  }
  const fallback = spawnSync("du", ["-sk", dir], { encoding: "utf8" });
  if (!fallback.error && fallback.status === 0 && fallback.stdout) {
    const token = String(fallback.stdout).trim().split(/\s+/)[0];
    const parsed = Number(token);
    if (Number.isFinite(parsed)) return parsed * 1024;
  }
  return null;
}

function getDirSizeBytes(dir) {
  if (!dir) return null;
  const fs = require("fs");
  const path = require("path");
  if (!fs.existsSync(dir)) return null;
  const duBytes = getDuBytes(dir);
  if (duBytes !== null) return duBytes;
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isFile()) {
      total += stat.size || 0;
      continue;
    }
    if (!stat.isDirectory()) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      stack.push(path.join(current, entry));
    }
  }
  return total;
}

function parseWarnGb(env) {
  const raw = env.SEAL_E2E_SEAL_OUT_WARN_GB || env.SEAL_SEAL_OUT_WARN_GB;
  if (raw === undefined || raw === null || raw === "") return 10;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(0, parsed);
}

function logE2EDiskSummary(env, options) {
  if (normalizeFlag(env.SEAL_E2E_DISK_SUMMARY, "1") !== "1") {
    return;
  }
  const logger = typeof options.log === "function" ? options.log : (msg) => process.stdout.write(`${msg}\n`);
  const e2eRoot = options.e2eRoot || "";
  if (e2eRoot) {
    const e2eBytes = getDirSizeBytes(e2eRoot);
    if (e2eBytes !== null) {
      logger(`Disk: e2e_root=${e2eRoot} size=${formatBytes(e2eBytes)}`);
    }
  }
  if (e2eRoot) {
    const path = require("path");
    const sealOutRoot = path.dirname(e2eRoot);
    const sealOutBytes = getDirSizeBytes(sealOutRoot);
    const warnGb = parseWarnGb(env || process.env);
    if (sealOutBytes !== null && warnGb > 0 && sealOutBytes >= warnGb * 1024 * 1024 * 1024) {
      logger(`WARN: seal-out size ${formatBytes(sealOutBytes)} exceeds ${warnGb}GB at ${sealOutRoot}. Consider: seal clean`);
    }
  }
}

module.exports = {
  parseList,
  makeRunId,
  formatDuration,
  normalizeFlag,
  isEnabled,
  sanitizeName,
  shortHash,
  safeName,
  assertEscalated,
  logEffectiveConfig,
  formatConfigLine,
  buildRunConfigLines,
  buildTimingRows,
  formatBytes,
  getDuBytes,
  getDirSizeBytes,
  parseWarnGb,
  logE2EDiskSummary,
};
