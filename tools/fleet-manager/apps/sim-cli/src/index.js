"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { buildGraph } = require("@fleet-manager/core-graph");
const { TimingModel } = require("@fleet-manager/core-timing");
const { createRunner } = require("@fleet-manager/traffic-runner");
const { SimRuntime } = require("@fleet-manager/sim-runtime");

const parseArgs = (argv) => {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
};

const loadScene = (scenePath) => {
  const raw = fs.readFileSync(scenePath, "utf8");
  return JSON.parse(raw);
};

const runSimulation = (options = {}) => {
  const scenePath = options.scenePath;
  const seed = options.seed ? String(options.seed) : "default";
  const scene = loadScene(scenePath);
  const graph = buildGraph(scene.graph);
  const timingModel = new TimingModel(scene.timing || {});
  const runner = createRunner({ graph, timingModel });

  const runtime = new SimRuntime({ graph, timingModel });
  runtime.setRobots(scene.robots || []);

  const strategy = options.strategy || "prioritized";
  const planResult = runner.run(
    { timeMs: 0, robots: scene.robots || [] },
    { strategy }
  );
  if (!planResult.ok) {
    throw new Error(`plan_failed:${planResult.error}`);
  }
  runtime.applyPlans(planResult.plans);

  const steps = Number.isFinite(options.steps) ? options.steps : 20;
  const tickMs = Number.isFinite(options.tickMs) ? options.tickMs : 1000;
  const replay = [];
  for (let i = 0; i < steps; i += 1) {
    runtime.tick(tickMs);
    replay.push({
      seed,
      step: i,
      timeMs: runtime.clock.now(),
      robots: runtime.snapshot().robots
    });
  }
  const replayPath = options.replayPath;
  if (replayPath) {
    const lines = replay.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
    fs.writeFileSync(replayPath, lines);
  }
  return { replay, plans: planResult.plans, seed };
};

const cli = () => {
  const args = parseArgs(process.argv);
  const sceneArg = args.scene || args._[0] || "corridor";
  const baseDir = path.resolve(__dirname, "..", "..", "..");
  const scenePath = path.isAbsolute(sceneArg)
    ? sceneArg
    : path.join(baseDir, "scenes", sceneArg, "scene.json");
  const replayPath = args.replay
    ? path.resolve(args.replay)
    : path.join(baseDir, "e2e", "replays", `replay-${Date.now()}.jsonl`);
  const steps = args.steps ? Number(args.steps) : 20;
  const tickMs = args.tickMs ? Number(args.tickMs) : 1000;
  const strategy = args.strategy || "prioritized";
  const seed = args.seed || "default";

  const result = runSimulation({
    scenePath,
    replayPath,
    steps,
    tickMs,
    strategy,
    seed
  });
  console.log(`Replay written: ${replayPath} (${result.replay.length} steps)`);
};

module.exports = {
  runSimulation,
  cli
};
