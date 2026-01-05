const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { loadMapGraphLight } = require(path.resolve(__dirname, "..", "..", "shared", "map_loader"));

const rootDir = path.resolve(__dirname, "..");
const graphPath = path.join(rootDir, "scenes", "traffic", "graph.json");
const workflowPath = path.join(rootDir, "scenes", "traffic", "workflow.json5");

const rawGraph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const graph = loadMapGraphLight(graphPath);
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

assert.ok(Array.isArray(graph.nodes), "Graph nodes should be array");
assert.ok(Array.isArray(graph.edges), "Graph edges should be array");
assert.equal(graph.nodes.length, rawGraph.nodes.length, "Graph node count should match raw");
assert.equal(graph.edges.length, rawGraph.edges.length, "Graph edge count should match raw");

const nodeIds = new Set();
graph.nodes.forEach((node) => {
  assert.ok(node && node.id, "Node should have id");
  assert.ok(!nodeIds.has(node.id), `Duplicate node id ${node.id}`);
  nodeIds.add(node.id);
  assert.ok(Number.isFinite(node.pos?.x), `Node ${node.id} should have finite x`);
  assert.ok(Number.isFinite(node.pos?.y), `Node ${node.id} should have finite y`);
});

graph.edges.forEach((edge) => {
  assert.ok(edge.start && edge.end, "Edge should have start/end");
  assert.ok(nodeIds.has(edge.start), `Edge start ${edge.start} should exist`);
  assert.ok(nodeIds.has(edge.end), `Edge end ${edge.end} should exist`);
  assert.notEqual(edge.start, edge.end, "Edge should not be a self-loop");
});

const actionPoints = graph.nodes.filter(
  (node) => node.className === "ActionPoint" || String(node.id).startsWith("AP")
);
const parkingPoints = graph.nodes.filter(
  (node) => node.className === "ParkPoint" || String(node.id).startsWith("PP")
);
assert.ok(actionPoints.length > 0, "Expected at least one action point");
assert.ok(parkingPoints.length > 0, "Expected at least one parking point");

const groups = workflow.groups || {};
Object.entries(groups).forEach(([groupId, points]) => {
  assert.ok(Array.isArray(points), `Group ${groupId} should be an array`);
  points.forEach((point) => {
    assert.ok(nodeIds.has(point), `Group ${groupId} point ${point} should exist in graph`);
  });
});

const binLocations = workflow.bin_locations || {};
Object.entries(binLocations).forEach(([id, entry]) => {
  assert.ok(entry.point, `Worksite ${id} should have point`);
  assert.ok(nodeIds.has(entry.point), `Worksite ${id} point ${entry.point} should exist`);
  assert.ok(Number.isFinite(entry.pos?.x), `Worksite ${id} should have pos.x`);
  assert.ok(Number.isFinite(entry.pos?.y), `Worksite ${id} should have pos.y`);
});

const occupancy = workflow.occupancy || {};
(occupancy.pick_groups || []).forEach((groupId) => {
  assert.ok(groups[groupId], `Pick group ${groupId} should exist in workflow groups`);
});
(occupancy.drop_groups || []).forEach((groupId) => {
  assert.ok(groups[groupId], `Drop group ${groupId} should exist in workflow groups`);
});

console.log("E2E map invariants ok: graph/workflow references are consistent.");
