import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import * as simCli from "../apps/sim-cli/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { runSimulation } = simCli;

describe("sim-cli corridor", () => {
  it("runs deterministic replay and reaches goals", () => {
    const scenePath = path.join(__dirname, "..", "scenes", "corridor", "scene.json");
    const replayPath = path.join(__dirname, "replays", "corridor.jsonl");
    const result = runSimulation({
      scenePath,
      replayPath,
      steps: 25,
      tickMs: 1000,
      strategy: "prioritized"
    });
    expect(result.replay.length).toBe(25);
    expect(fs.existsSync(replayPath)).toBe(true);
    const lines = fs.readFileSync(replayPath, "utf8").trim().split("\n");
    const last = JSON.parse(lines[lines.length - 1]);
    const goalById = { R1: "C", R2: "C" };
    last.robots.forEach((robot) => {
      expect(robot.nodeId).toBe(goalById[robot.id]);
    });
  });
});
