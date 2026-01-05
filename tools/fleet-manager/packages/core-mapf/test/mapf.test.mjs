import { describe, it, expect } from "vitest";
import * as coreGraph from "@fleet-manager/core-graph";
import * as mapf from "../src/index.js";

const { buildGraph } = coreGraph;
const { planMultiAgent, listStrategies } = mapf;

describe("core-mapf", () => {
  it("plans intents for multiple robots", () => {
    const graph = buildGraph({
      nodes: [
        { id: "A", pos: { x: 0, y: 0 } },
        { id: "B", pos: { x: 1, y: 0 } }
      ],
      edges: [{ id: "A-B", start: "A", end: "B" }]
    });
    const robots = [
      { id: "R1", start: "A", goal: "B" },
      { id: "R2", start: "A", goal: "B" }
    ];
    const plans = planMultiAgent(graph, robots, { strategy: "roundRobin" });
    expect(plans.length).toBe(2);
    expect(listStrategies()).toContain("prioritized");
  });
});
