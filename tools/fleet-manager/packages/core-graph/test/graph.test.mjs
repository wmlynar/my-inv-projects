import { describe, it, expect } from "vitest";
import * as coreGraph from "../src/index.js";

const { buildGraph, normalizeNode, normalizeEdge, distance } = coreGraph;

describe("core-graph", () => {
  it("builds deterministic node/edge maps", () => {
    const graph = buildGraph({
      nodes: [{ id: "B", pos: { x: 1, y: 0 } }, { id: "A", pos: { x: 0, y: 0 } }],
      edges: [{ start: "B", end: "A" }, { start: "A", end: "B" }]
    });
    expect(graph.nodes[0].id).toBe("A");
    expect(graph.edges[0].id).toBe("A->B");
    expect(graph.nodeById.get("B").pos.x).toBe(1);
    expect(graph.outgoing.get("A").length).toBe(1);
  });

  it("normalizes edge ids and node positions", () => {
    const node = normalizeNode({ id: "N1", pos: { x: "2", y: "3" } });
    expect(node.pos).toEqual({ x: 2, y: 3 });
    const edge = normalizeEdge({ start: "N1", end: "N2" });
    expect(edge.id).toBe("N1->N2");
  });

  it("handles missing points in distance calculation", () => {
    expect(distance(null, { x: 0, y: 0 })).toBe(Infinity);
    expect(distance({ x: 0, y: 0 }, null)).toBe(Infinity);
  });
});
