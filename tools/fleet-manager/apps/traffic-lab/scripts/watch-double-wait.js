const fs = require("node:fs");
const path = require("node:path");

const WAIT_REASONS = new Set([
  "reservation_wait",
  "reservation_entry",
  "edge_lock",
  "node_lock",
  "traffic",
  "traffic_overlap",
  "critical_section_wait"
]);

const parseNumber = (value, fallback) => {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const baseUrl = process.env.WAIT_WATCH_BASE_URL || "http://127.0.0.1:3000";
const durationMs = parseNumber(process.env.WAIT_WATCH_DURATION_MS, 120000);
const intervalMs = parseNumber(process.env.WAIT_WATCH_INTERVAL_MS, 300);
const historyLimit = parseNumber(process.env.WAIT_WATCH_HISTORY_LIMIT, 5000);
const outputPath =
  process.env.WAIT_WATCH_OUTPUT || path.join("/tmp", `fleet-wait-${Date.now()}.json`);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(pathName, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${pathName}`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed: ${pathName} (${response.status})`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function isWaiting(robot) {
  const diag = robot.diagnostics || {};
  if (diag.state !== "holding") return false;
  if (!diag.reason) return false;
  return WAIT_REASONS.has(diag.reason);
}

function summarizeRobot(robot) {
  return {
    id: robot.id,
    activity: robot.activity,
    blocked: robot.blocked,
    manualMode: robot.manualMode,
    dispatchable: robot.dispatchable,
    controlled: robot.controlled,
    diag: robot.diagnostics
      ? {
          state: robot.diagnostics.state,
          reason: robot.diagnostics.reason,
          shouldMove: robot.diagnostics.shouldMove
        }
      : null
  };
}

function describeWait(entry) {
  const robot = entry.robot || {};
  const runtime = entry.runtime || {};
  return {
    robotId: robot.id,
    state: robot.diagnostics?.state || null,
    reason: robot.diagnostics?.reason || null,
    entryHold: runtime.entryHold || null,
    scheduleConflict: runtime.scheduleEntry?.conflict || null,
    lastTrafficBlock: runtime.lastTrafficBlock || null,
    edgeLockHold: runtime.edgeLockHold || null,
    nodeLockHold: runtime.nodeLockHold || null,
    segment: runtime.segment || null,
    routeGoal: runtime.routeGoal || null
  };
}

async function run() {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const status = await fetchJson("/api/fleet/status?worksites=1");
    const robots = status.robots || [];
    const waiting = robots.filter(isWaiting);
    if (waiting.length >= 2) {
      const diag = await fetchJson(
        `/api/fleet/diagnostics?history=1&historyLimit=${historyLimit}&route=1&reservations=1&obstacles=0&switching=1`
      );
      fs.writeFileSync(outputPath, JSON.stringify(diag, null, 2));
      console.log(`Detected ${waiting.length} waiting robots. Snapshot saved to ${outputPath}`);
      console.log("Status robots:", robots.map(summarizeRobot));
      const details = (diag.robots || [])
        .map(describeWait)
        .filter((entry) => WAIT_REASONS.has(entry.reason));
      console.log("Wait details:", details);
      return;
    }
    await delay(intervalMs);
  }
  console.log("No simultaneous waiting detected within the polling window.");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
