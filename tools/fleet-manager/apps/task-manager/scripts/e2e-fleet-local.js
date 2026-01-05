const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const fleetManagerPath = path.resolve(repoRoot, "apps", "traffic-lab", "src", "server.js");

const PORT = Number.parseInt(process.env.E2E_FLEET_PORT || "3191", 10);
const SCENE_ID = process.env.E2E_SCENE_ID || "entry-reservation";
const TIMEOUT_MS = Number.parseInt(process.env.E2E_TIMEOUT_MS || "60000", 10);
const STALL_TIMEOUT_MS = Number.parseInt(process.env.E2E_STALL_TIMEOUT_MS || "5000", 10);
const POLL_MS = Number.parseInt(process.env.E2E_POLL_MS || "200", 10);

const TARGETS = {
  "RB-01": { id: "P2", pos: { x: 10, y: 0 } },
  "RB-02": { id: "P1", pos: { x: 0, y: 0 } }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest({ method, port, reqPath, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: reqPath,
        headers
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks) });
        });
      }
    );
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function postJson(port, reqPath, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  return httpRequest({
    method: "POST",
    port,
    reqPath,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": body.length
    },
    body
  });
}

async function waitForHealth(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpRequest({ method: "GET", port, reqPath: "/health" });
      if (res.statusCode === 200) return;
    } catch (_err) {
      // keep trying
    }
    await sleep(200);
  }
  throw new Error(`timeout waiting for /health on ${port}`);
}

function spawnProcess(label, scriptPath, env) {
  const child = spawn(process.execPath, [scriptPath], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  return child;
}

async function fetchState() {
  const res = await httpRequest({ method: "GET", port: PORT, reqPath: "/api/fleet/state" });
  if (res.statusCode !== 200) {
    throw new Error(`fleet state ${res.statusCode}`);
  }
  return JSON.parse(res.body.toString("utf8"));
}

async function waitForRobots(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await fetchState();
    if (Array.isArray(state.robots) && state.robots.length >= 2) {
      return state.robots;
    }
    await sleep(200);
  }
  throw new Error("robots not ready");
}

function distance(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

async function main() {
  const fleet = spawnProcess("fleet", fleetManagerPath, {
    PORT: String(PORT),
    BIND_HOST: "127.0.0.1",
    FLEET_SIM_MODE: "local",
    FLEET_ACTIVE_SCENE_ID: SCENE_ID,
    FLEET_SIM_TICK_MS: "80"
  });

  let exitCode = 1;
  try {
    await waitForHealth(PORT);
    await waitForRobots();

    await postJson(PORT, "/api/fleet/robots/RB-01/manual", { enabled: true });
    await postJson(PORT, "/api/fleet/robots/RB-02/manual", { enabled: true });

    const r1 = await postJson(PORT, "/api/fleet/robots/RB-01/go-target", { id: "P2" });
    const r2 = await postJson(PORT, "/api/fleet/robots/RB-02/go-target", { id: "P1" });
    const r1Body = JSON.parse(r1.body.toString("utf8"));
    const r2Body = JSON.parse(r2.body.toString("utf8"));
    if (r1Body?.result?.ret_code !== 0 || r2Body?.result?.ret_code !== 0) {
      throw new Error("go-target failed");
    }

    const start = Date.now();
    const sawHold = new Set();
    const stallSince = new Map();
    let arrived = new Set();

    while (Date.now() - start < TIMEOUT_MS) {
      const state = await fetchState();
      const robots = Array.isArray(state.robots) ? state.robots : [];
      arrived = new Set();

      for (const robot of robots) {
        if (!robot?.id || !robot.pose) continue;
        const target = TARGETS[robot.id];
        if (!target) continue;
        const dist = distance(robot.pose, target.pos);
        if (dist <= 0.35) {
          arrived.add(robot.id);
        }

        const diag = robot.diagnostics || null;
        if (diag?.reason === "reservation_entry" || diag?.reason === "reservation_wait") {
          sawHold.add(diag.reason);
        }
        if (diag?.state === "stalled" && diag?.shouldMove) {
          if (!stallSince.has(robot.id)) {
            stallSince.set(robot.id, Date.now());
          }
          const since = stallSince.get(robot.id);
          if (since && Date.now() - since > STALL_TIMEOUT_MS) {
            throw new Error(`robot ${robot.id} stalled > ${STALL_TIMEOUT_MS}ms`);
          }
        } else {
          stallSince.delete(robot.id);
        }
      }

      if (arrived.size === Object.keys(TARGETS).length) {
        break;
      }
      await sleep(POLL_MS);
    }

    if (arrived.size !== Object.keys(TARGETS).length) {
      throw new Error("robots did not reach targets");
    }
    if (!sawHold.size) {
      throw new Error("scenario did not hit reservation hold");
    }

    exitCode = 0;
    console.log("e2e-fleet-local: ok");
  } finally {
    fleet.kill("SIGTERM");
    await sleep(300);
    process.exit(exitCode);
  }
}

main().catch((err) => {
  console.error(`e2e-fleet-local failed: ${err.message}`);
  process.exit(1);
});
