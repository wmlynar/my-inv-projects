import { describe, it, expect } from "vitest";
import * as coreGraph from "@fleet-manager/core-graph";
import * as planning from "../src/index.js";

const { buildGraph } = coreGraph;
const { planRoute } = planning;

describe("core-planning-single", () => {
  it("plans a simple path", () => {
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
    const route = planRoute(graph, "A", "C");
    expect(route.nodes).toEqual(["A", "B", "C"]);
    expect(route.segments.length).toBe(2);
  });
});
