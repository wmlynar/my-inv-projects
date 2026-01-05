import { describe, it, expect } from "vitest";
import * as coreGraph from "@fleet-manager/core-graph";
import * as runnerModule from "../src/index.js";

const { buildGraph } = coreGraph;
const { createRunner, listStrategies } = runnerModule;

const buildScenario = () => {
  const graph = buildGraph({
    nodes: [
      { id: "A", pos: { x: 0, y: 0 } },
      { id: "B", pos: { x: 1, y: 0 } },
      { id: "C", pos: { x: 2, y: 0 } }
    ],
    edges: [
      { id: "A-B", start: "A", end: "B" },
      { id: "B-C", start: "B", end: "C" }
    ]
  });
  const robots = [
    { id: "R1", start: "A", goal: "C" },
    { id: "R2", start: "A", goal: "C" }
  ];
  return { graph, robots };
};

const hasOverlap = (list) => {
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i].range;
      const b = list[j].range;
      if (a.start < b.end && b.start < a.end) {
        return true;
      }
    }
  }
  return false;
};

describe("traffic-runner contract", () => {
  listStrategies().forEach((strategy) => {
    it(`plans without overlapping reservations for ${strategy}`, () => {
      const { graph, robots } = buildScenario();
      const runner = createRunner({ graph });
      const result = runner.run({ timeMs: 0, robots }, { strategy });
      expect(result.ok).toBe(true);
      const reservations = runner.reservationTable.list("edge:A-B");
      expect(hasOverlap(reservations)).toBe(false);
      expect(result.plans.length).toBe(2);
    });
  });
});
