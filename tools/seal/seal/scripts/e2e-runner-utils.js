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

function buildTimingRows(durationByTest, statusByTest) {
  const durations = durationByTest || {};
  const statuses = statusByTest || {};
  return Object.keys(durations).map((name) => ({
    name,
    duration: durations[name] || 0,
    status: statuses[name],
  }));
}

module.exports = {
  parseList,
  makeRunId,
  formatDuration,
  normalizeFlag,
  sanitizeName,
  shortHash,
  safeName,
  assertEscalated,
  logEffectiveConfig,
  formatConfigLine,
  buildTimingRows,
};
