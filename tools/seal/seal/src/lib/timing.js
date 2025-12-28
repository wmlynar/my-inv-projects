"use strict";

const { info } = require("./ui");

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return "n/a";
  if (ms >= 1000) {
    const secs = ms / 1000;
    const precision = secs >= 10 ? 1 : 2;
    return `${secs.toFixed(precision)}s`;
  }
  return `${Math.round(ms)}ms`;
}

function createTiming(enabled) {
  const active = !!enabled;
  const entries = [];
  const start = process.hrtime.bigint();

  const nowMs = () => Number(process.hrtime.bigint() - start) / 1e6;

  const record = (label, ms) => {
    if (!active) return;
    entries.push({ label, ms });
  };

  const timeSync = (label, fn) => {
    if (!active) return fn();
    const t0 = nowMs();
    try {
      return fn();
    } finally {
      record(label, nowMs() - t0);
    }
  };

  const timeAsync = async (label, fn) => {
    if (!active) return await fn();
    const t0 = nowMs();
    try {
      return await fn();
    } finally {
      record(label, nowMs() - t0);
    }
  };

  const report = (opts = {}) => {
    if (!active || entries.length === 0) return;
    const title = opts.title || "Timing";
    const limit = Number.isFinite(Number(opts.limit)) ? Number(opts.limit) : 12;
    const totalMs = nowMs();
    const byLabel = new Map();
    for (const entry of entries) {
      byLabel.set(entry.label, (byLabel.get(entry.label) || 0) + entry.ms);
    }
    const rows = Array.from(byLabel.entries()).sort((a, b) => b[1] - a[1]);
    const shown = rows.slice(0, limit);
    info(`${title} (total ${formatDuration(totalMs)})`);
    for (const [label, ms] of shown) {
      console.log(`  - ${label}: ${formatDuration(ms)}`);
    }
    if (rows.length > shown.length) {
      console.log(`  - ... ${rows.length - shown.length} more`);
    }
    const sumMs = rows.reduce((acc, [, ms]) => acc + ms, 0);
    if (sumMs > totalMs * 1.1) {
      console.log("  - note: steps can overlap (nested timings)");
    }
  };

  return {
    enabled: active,
    entries,
    timeSync,
    timeAsync,
    report,
  };
}

function resolveTiming(input) {
  if (input && typeof input === "object" && typeof input.timeAsync === "function") {
    return { timing: input, report: false };
  }
  const timing = createTiming(!!input);
  return { timing, report: !!input };
}

module.exports = { createTiming, resolveTiming, formatDuration };
