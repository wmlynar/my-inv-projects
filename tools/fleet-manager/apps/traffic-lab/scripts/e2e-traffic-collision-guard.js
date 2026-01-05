const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ACTIVE_TASK_STATUSES = new Set(["in_progress", "paused"]);

const parseNumber = (value) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

async function getFreePort(hosts = ["127.0.0.1", "0.0.0.0"]) {
  return new Promise((resolve, reject) => {
    const tryHost = (index, lastError) => {
      if (index >= hosts.length) {
        reject(lastError || new Error("free_port_failed"));
        return;
      }
      const host = hosts[index];
      const server = net.createServer();
      server.once("error", (err) => {
        server.close(() => {});
        tryHost(index + 1, err);
      });
      server.listen(0, host, () => {
        const address = server.address();
        const port = address && typeof address === "object" ? address.port : 0;
        server.close(() => resolve(port));
      });
    };
    tryHost(0, null);
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(baseUrl, pathName, options = {}, timeoutMs = 4000) {
  const response = await fetchWithTimeout(`${baseUrl}${pathName}`, options, timeoutMs);
  assert.ok(response.ok, `Expected ${pathName} to be OK`);
  return response.json();
}

async function postJson(baseUrl, pathName, payload) {
  return fetchJson(
    baseUrl,
    pathName,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    },
    6000
  );
}

async function waitForHealthy(baseUrl, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/health`);
      if (response.ok) {
        const json = await response.json();
        if (json && json.ok === true) {
          return;
        }
      }
    } catch (_err) {
      // ignore and retry
    }
    await delay(250);
  }
  throw new Error("Server did not become healthy in time.");
}

async function waitFor(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30000;
  const intervalMs = options.intervalMs ?? 300;
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      if (await predicate()) return true;
      lastError = null;
    } catch (err) {
      if (err && err.fatal) {
        throw err;
      }
      lastError = err;
    }
    await delay(intervalMs);
  }
  if (lastError) {
    throw lastError;
  }
  return false;
}

function buildActiveRobotSet(tasks) {
  const active = new Set();
  (tasks || []).forEach((task) => {
    if (!task?.robotId) return;
    if (ACTIVE_TASK_STATUSES.has(task.status)) {
      active.add(task.robotId);
    }
  });
  return active;
}

function detectCollision(snapshot) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  const collisions = [];
  (snapshot.robots || []).forEach((robot) => {
    if (!activeRobots.has(robot.id)) return;
    const reason = robot.diagnostics?.reason || null;
    if (reason === "blocked_collision") {
      collisions.push(robot.id);
    }
  });
  return collisions;
}

function hasCollisionInHistory(history) {
  if (!Array.isArray(history)) return false;
  return history.some((entry) => entry && entry.reason === "blocked_collision");
}

async function run() {
  const port = await getFreePort();
  const roboshopPort = await getFreePort();
  const trafficStrategy =
    process.env.E2E_TRAFFIC_STRATEGY || process.env.TRAFFIC_STRATEGY || "pulse-mapf-time";
  const dispatchStrategy =
    process.env.E2E_DISPATCH_STRATEGY || process.env.DISPATCH_STRATEGY || "nearest";
  const segmentLength = parseNumber(process.env.E2E_TRAFFIC_SEGMENT_LENGTH);

  const env = {
    ...process.env,
    PORT: String(port),
    ROBOSHOP_PORT: String(roboshopPort),
    BIND_HOST: "127.0.0.1",
    ROBOSHOP_BIND_HOST: "127.0.0.1",
    FLEET_ACTIVE_SCENE_ID: "traffic",
    FLEET_SIM_FAST: "1",
    FLEET_SIM_SPEED_MULTIPLIER: process.env.FLEET_SIM_SPEED_MULTIPLIER || "6",
    FLEET_SIM_ACTION_WAIT_MS: "0",
    FLEET_SIM_COLLISION_BLOCKING: "1"
  };

  const server = spawn("node", ["src/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let serverExited = false;
  server.on("exit", (code) => {
    serverExited = true;
    if (code && code !== 0) {
      process.stderr.write(`Server exited with code ${code}\n`);
    }
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForHealthy(baseUrl);
    await fetchJson(baseUrl, "/api/fleet/diagnostics?history=1&historyClear=1&historyLimit=5000");
    await postJson(baseUrl, "/api/scenes/activate", { sceneId: "traffic" });

    const initial = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
    const robots = initial.robots || [];
    assert.ok(robots.length >= 2, "Expected at least two robots");

    for (const robot of robots) {
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/control`, {
        controlled: true
      });
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/dispatchable`, {
        dispatchable: true
      });
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/manual`, {
        enabled: false
      });
    }

    const trafficOptions = {
      reservationWaits: true,
      avoidanceLocks: false,
      avoidanceZones: false,
      yieldRecovery: false
    };
    if (Number.isFinite(segmentLength)) {
      trafficOptions.segmentLength = segmentLength;
    }
    await postJson(baseUrl, "/api/sim/settings", {
      dispatchStrategy,
      trafficStrategy,
      trafficOptions
    });

    const worksites = initial.worksites || [];
    const ids = ["PICK-A1", "PICK-A2", "PICK-A3", "PICK-A4", "DROP-A1", "DROP-A2", "DROP-A3", "DROP-A4"];
    ids.forEach((id) => {
      assert.ok(worksites.find((site) => site.id === id), `Missing ${id} in traffic scene`);
    });

    for (const id of ids) {
      await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(id)}`, {
        filled: false,
        blocked: false
      });
    }

    await postJson(baseUrl, "/api/fleet/worksites/DROP-A1", { filled: true, blocked: false });
    await postJson(baseUrl, "/api/fleet/worksites/DROP-A2", { filled: true, blocked: false });
    await postJson(baseUrl, "/api/fleet/worksites/DROP-A3", { filled: false, blocked: false });
    await postJson(baseUrl, "/api/fleet/worksites/DROP-A4", { filled: false, blocked: false });

    await postJson(baseUrl, "/api/fleet/worksites/PICK-A2", { filled: true, blocked: false });
    await postJson(baseUrl, "/api/fleet/worksites/PICK-A3", { filled: true, blocked: false });

    const finished = await waitFor(
      async () => {
        const status = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
        const collisions = detectCollision(status);
        if (collisions.length) {
          const err = new Error(`Collision detected: ${collisions.join(", ")}`);
          err.fatal = true;
          throw err;
        }
        const nextWorksites = status.worksites || [];
        const picksEmpty = ["PICK-A2", "PICK-A3"].every(
          (id) => !nextWorksites.find((site) => site.id === id)?.filled
        );
        const dropsFilled = ["DROP-A3", "DROP-A4"].every(
          (id) => nextWorksites.find((site) => site.id === id)?.filled
        );
        return picksEmpty && dropsFilled;
      },
      { timeoutMs: 90000, intervalMs: 350 }
    );

    assert.ok(finished, "Expected deliveries to complete");

    const diag = await fetchJson(
      baseUrl,
      "/api/fleet/diagnostics?history=1&historyLimit=5000&route=0&reservations=0&obstacles=0"
    );
    const collisionsInHistory = (diag.robots || []).some((entry) => {
      const history = entry.robot?.diagnosticsHistory || [];
      return hasCollisionInHistory(history);
    });
    assert.ok(!collisionsInHistory, "Expected no blocked_collision in diagnostics history");

    console.log("E2E collision guard ok: no collision detected for pulse-mapf-time.");
  } finally {
    if (!serverExited) {
      server.kill("SIGTERM");
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
