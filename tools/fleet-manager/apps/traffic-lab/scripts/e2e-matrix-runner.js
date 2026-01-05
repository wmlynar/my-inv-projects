const { spawn } = require("node:child_process");
const path = require("node:path");

const {
  resolveTrafficStrategies,
  resolveYieldModes,
  resolveSegmentLengths,
  resolveIgnoreTrafficModes,
  resolveDispatchStrategies,
  buildTrafficScenarios,
  resolveTierConfig
} = require("./e2e-traffic-matrix");

const TESTS = {
  "ui-packages": "e2e-ui-packages.js",
  "ui-delivery": "e2e-ui-delivery.js",
  "fleet-delivery": "e2e-fleet-delivery.js"
};

const TIER_TESTS = {
  smoke: ["ui-delivery"],
  standard: ["ui-delivery", "fleet-delivery", "ui-packages"],
  full: ["ui-delivery", "fleet-delivery", "ui-packages"],
  stress: ["ui-packages"]
};

const parseCsv = (value) => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const resolveTests = (raw) => {
  const requested = parseCsv(raw);
  if (!requested.length) return Object.keys(TESTS);
  const filtered = requested.filter((name) => Object.prototype.hasOwnProperty.call(TESTS, name));
  return filtered.length ? filtered : Object.keys(TESTS);
};

const runScript = (scriptPath, env) =>
  new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      env,
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed: ${path.basename(scriptPath)} (exit ${code})`));
      }
    });
    child.on("error", (err) => reject(err));
  });

async function run() {
  const tierName = process.env.E2E_TIER || process.env.E2E_MATRIX_TIER || "standard";
  const tierConfig = resolveTierConfig(tierName);
  const tests = resolveTests(
    process.env.E2E_MATRIX_TESTS || TIER_TESTS[tierConfig.tier]?.join(",")
  );
  const strategies = resolveTrafficStrategies(
    process.env.E2E_TRAFFIC_STRATEGIES,
    tierConfig.strategies
  );
  const yieldModes = resolveYieldModes(
    process.env.E2E_TRAFFIC_YIELD_MODES,
    tierConfig.yieldModes
  );
  const segmentLengths = resolveSegmentLengths(
    process.env.E2E_TRAFFIC_SEGMENT_LENGTHS,
    tierConfig.segmentLengths
  );
  const ignoreTrafficModes = resolveIgnoreTrafficModes(
    process.env.E2E_IGNORE_TRAFFIC_MODES,
    tierConfig.ignoreTrafficModes
  );
  const dispatchStrategies = resolveDispatchStrategies(
    process.env.E2E_DISPATCH_STRATEGIES,
    tierConfig.dispatchStrategies
  );
  let scenarios = buildTrafficScenarios({
    strategies,
    yieldModes,
    segmentLengths,
    ignoreTrafficModes,
    dispatchStrategies
  });
  const limitRaw = Number(process.env.E2E_MATRIX_LIMIT);
  if (Number.isFinite(limitRaw) && limitRaw > 0) {
    scenarios = scenarios.slice(0, Math.floor(limitRaw));
  }
  if (!scenarios.length) {
    throw new Error("No traffic scenarios selected for matrix run.");
  }

  for (const scenario of scenarios) {
    for (const testName of tests) {
      const script = TESTS[testName];
      if (!script) continue;
      const scriptPath = path.resolve(__dirname, script);
      const env = {
        ...process.env,
        E2E_TRAFFIC_STRATEGY: scenario.strategy,
        E2E_TRAFFIC_YIELD_MODE: scenario.yieldRecovery ? "yield" : "no-yield",
        E2E_TRAFFIC_SEGMENT_LENGTH: Number.isFinite(scenario.segmentLength)
          ? String(scenario.segmentLength)
          : "",
        E2E_IGNORE_TRAFFIC: scenario.ignoreTraffic ? "1" : "0",
        E2E_DISPATCH_STRATEGY: scenario.dispatchStrategy || ""
      };
      console.log(`[E2E matrix] ${testName} -> ${scenario.label}`);
      await runScript(scriptPath, env);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
