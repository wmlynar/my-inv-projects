"use strict";

const { asId } = require("@fleet-manager/core-types");
const { loadMapGraph, loadMapGraphLight } = require("./map_loader");
const { MapApi } = require("./map_api");

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeNode = (node) => {
  if (!node) throw new Error("node_missing");
  const id = asId(node.id, "node");
  const pos = node.pos || {};
  return {
    id,
    pos: {
      x: toNumber(pos.x),
      y: toNumber(pos.y)
    },
    props: node.props || {}
  };
};

const normalizeEdge = (edge) => {
  if (!edge) throw new Error("edge_missing");
  const start = asId(edge.start, "edge_start");
  const end = asId(edge.end, "edge_end");
  const id = edge.id ? asId(edge.id, "edge") : `${start}->${end}`;
  return {
    id,
    start,
    end,
    props: edge.props || {}
  };
};

const buildGraph = (data = {}) => {
  const nodes = (data.nodes || []).map(normalizeNode);
  const edges = (data.edges || []).map(normalizeEdge);
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
  const nodeById = new Map(sortedNodes.map((node) => [node.id, node]));
  const edgeById = new Map(sortedEdges.map((edge) => [edge.id, edge]));
  const outgoing = new Map();
  const incoming = new Map();
  sortedEdges.forEach((edge) => {
    const out = outgoing.get(edge.start) || [];
    out.push(edge);
    outgoing.set(edge.start, out);
    const inc = incoming.get(edge.end) || [];
    inc.push(edge);
    incoming.set(edge.end, inc);
  });
  return {
    nodes: sortedNodes,
    edges: sortedEdges,
    nodeById,
    edgeById,
    outgoing,
    incoming
  };
};

const distance = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dx = toNumber(a.x) - toNumber(b.x);
  const dy = toNumber(a.y) - toNumber(b.y);
  return Math.hypot(dx, dy);
};

module.exports = {
  buildGraph,
  normalizeNode,
  normalizeEdge,
  distance,
  loadMapGraph,
  loadMapGraphLight,
  MapApi
};
