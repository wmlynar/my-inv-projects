import { describe, it } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const runScript = (label, scriptPath, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: options.cwd || repoRoot,
      env: { ...process.env, ...(options.env || {}) },
      stdio: "inherit"
    });
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 180000;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} failed with code ${code}`));
      }
    });
  });

const listScripts = (dir, exclude = []) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("e2e-") && name.endsWith(".js"))
    .filter((name) => !exclude.includes(name))
    .sort()
    .map((name) => path.join(dir, name));
};

const trafficLabScripts = listScripts(
  path.join(repoRoot, "apps", "traffic-lab", "scripts")
);

const taskManagerScripts = listScripts(
  path.join(repoRoot, "apps", "task-manager", "scripts"),
  ["e2e-all.js"]
);

const extraScripts = [
  path.join(repoRoot, "apps", "robokit-proxy", "scripts", "e2e.js")
];

const coreScripts = listScripts(path.join(repoRoot, "e2e", "scripts"));

const scripts = [
  ...trafficLabScripts,
  ...taskManagerScripts,
  ...coreScripts,
  ...extraScripts
].filter((scriptPath) => fs.existsSync(scriptPath));

const normalizeKey = (scriptPath) => path.relative(repoRoot, scriptPath).replace(/\\/g, "/");

const trafficMatrixEnv = {
  E2E_TRAFFIC_STRATEGIES: "simple",
  E2E_TRAFFIC_YIELD_MODES: "no-yield",
  E2E_IGNORE_TRAFFIC_MODES: "0",
  E2E_DISPATCH_STRATEGIES: "nearest",
  E2E_TRAFFIC_ROUTE_PLANNERS: "spatial",
  E2E_TRAFFIC_RESERVATION_MODES: "none",
  E2E_TRAFFIC_AVOIDANCE_MODES: "none",
  E2E_TRAFFIC_DIM_ROUTE_SEARCH: "spatial",
  E2E_TRAFFIC_DIM_ROUTE_TIME_MODEL: "static",
  E2E_TRAFFIC_DIM_ROUTE_OPTIMALITY: "heuristic",
  E2E_TRAFFIC_DIM_ROUTE_KINEMATICS: "point",
  E2E_TRAFFIC_DIM_ROUTE_REPLAN: "static",
  E2E_TRAFFIC_DIM_RESERVATION_GRANULARITY: "none",
  E2E_TRAFFIC_DIM_RESERVATION_LOCKING: "none",
  E2E_TRAFFIC_DIM_RESERVATION_SCOPE: "none",
  E2E_TRAFFIC_DIM_RESERVATION_RELEASE: "none",
  E2E_TRAFFIC_DIM_AVOIDANCE_MECHANISM: "none",
  E2E_TRAFFIC_DIM_AVOIDANCE_RESPONSE: "none",
  E2E_TRAFFIC_DIM_AVOIDANCE_SCOPE: "none",
  E2E_TRAFFIC_DIM_AVOIDANCE_CLEARANCE: "none",
  E2E_TRAFFIC_DIM_CONFLICT_SEARCH: "none",
  E2E_TRAFFIC_DIM_CONFLICT_RESOLUTION: "none",
  E2E_TRAFFIC_DIM_EXEC_CONTROL: "stop-and-go",
  E2E_TRAFFIC_DIM_EXEC_SPEED_PROFILE: "trapezoidal",
  E2E_TRAFFIC_DIM_EXEC_TRACKING: "open-loop"
};

const envOverrides = {
  "apps/traffic-lab/scripts/e2e-matrix-runner.js": {
    E2E_TIER: "smoke",
    E2E_MATRIX_LIMIT: "1"
  },
  "apps/traffic-lab/scripts/e2e-ui-packages.js": {
    E2E_PACKAGES_TOTAL: "10",
    E2E_PACKAGES_TIMEOUT_MS: "120000"
  },
  "apps/traffic-lab/scripts/e2e-traffic-matrix.js": trafficMatrixEnv,
  "apps/task-manager/scripts/e2e-edge-lock-stress.js": {
    E2E_STRESS_CYCLES: "1"
  }
};

describe.sequential("e2e scripts", () => {
  scripts.forEach((scriptPath) => {
    const rel = normalizeKey(scriptPath);
    it(rel, async () => {
      const env = {
        E2E_TRAFFIC_YIELD_MODE: "no-yield",
        TRAFFIC_YIELD_MODE: "no-yield",
        ...(envOverrides[rel] || {})
      };
      await runScript(rel, scriptPath, { env, timeoutMs: 240000 });
    });
  });
});
