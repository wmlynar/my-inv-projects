"use strict";

const { buildGraph, distance } = require("@fleet-manager/core-graph");
const { asId } = require("@fleet-manager/core-types");

const edgeLength = (edge, nodeById) => {
  if (Number.isFinite(edge.length)) return edge.length;
  if (edge.props && Number.isFinite(edge.props.length)) return edge.props.length;
  const start = nodeById.get(edge.start);
  const end = nodeById.get(edge.end);
  if (!start || !end) return 1;
  return distance(start.pos, end.pos);
};

const planRoute = (graphInput, startId, goalId, options = {}) => {
  const graph = graphInput.nodes ? graphInput : buildGraph(graphInput);
  const start = asId(startId, "start");
  const goal = asId(goalId, "goal");
  if (start === goal) {
    return { nodes: [start], segments: [] };
  }
  const nodes = graph.nodes.map((node) => node.id);
  const dist = new Map(nodes.map((id) => [id, Number.POSITIVE_INFINITY]));
  const prev = new Map();
  const prevEdge = new Map();
  const unvisited = new Set(nodes);
  dist.set(start, 0);

  const getMinNode = () => {
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    unvisited.forEach((id) => {
      const value = dist.get(id) ?? Number.POSITIVE_INFINITY;
      if (value < bestDist) {
        bestDist = value;
        best = id;
      }
    });
    return best;
  };

  while (unvisited.size) {
    const current = getMinNode();
    if (!current) break;
    if (current === goal) break;
    unvisited.delete(current);
    const outgoing = graph.outgoing.get(current) || [];
    outgoing.forEach((edge) => {
      if (!unvisited.has(edge.end)) return;
      const len = edgeLength(edge, graph.nodeById);
      const alt = (dist.get(current) ?? Number.POSITIVE_INFINITY) + len;
      if (alt < (dist.get(edge.end) ?? Number.POSITIVE_INFINITY)) {
        dist.set(edge.end, alt);
        prev.set(edge.end, current);
        prevEdge.set(edge.end, edge);
      }
    });
  }

  if (!prev.has(goal)) {
    return { nodes: [start], segments: [] };
  }

  const pathNodes = [];
  const pathEdges = [];
  let cursor = goal;
  while (cursor && cursor !== start) {
    pathNodes.push(cursor);
    const edge = prevEdge.get(cursor);
    if (edge) pathEdges.push(edge);
    cursor = prev.get(cursor);
  }
  pathNodes.push(start);
  pathNodes.reverse();
  pathEdges.reverse();

  const speedMps = Number.isFinite(options.speedMps) ? options.speedMps : 1;
  const segments = pathEdges.map((edge) => ({
    id: edge.id,
    start: edge.start,
    end: edge.end,
    length: edgeLength(edge, graph.nodeById),
    speedMps
  }));

  return { nodes: pathNodes, segments };
};

module.exports = {
  planRoute
};
