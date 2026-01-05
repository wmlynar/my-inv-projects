"use strict";

const { buildGraph } = require("@fleet-manager/core-graph");

const buildCorridorGraph = () =>
  buildGraph({
    nodes: [
      { id: "A", pos: { x: 0, y: 0 } },
      { id: "B", pos: { x: 5, y: 0 } },
      { id: "C", pos: { x: 10, y: 0 } }
    ],
    edges: [
      { id: "A-B", start: "A", end: "B" },
      { id: "B-C", start: "B", end: "C" }
    ]
  });

module.exports = {
  buildCorridorGraph
};
