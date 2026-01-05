const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createLocalFleetSim } = require("../src/local_fleet_sim");

const BEST_TRAFFIC_STRATEGY = "mapf-smt";
const BEST_SEGMENT_LENGTH = 3;
const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
const DEFAULT_ROBOT_MODEL_NAME = "forklift";
const AVOIDANCE_DISABLED = true;
const AVOIDANCE_BLOCK_BANNER = [
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
  "!!! WARNING: AVOIDANCE/YIELD TEST BLOCKED (DISABLED NOW) !!!",
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
].join("\n");

function blockAvoidanceTest(name, reason) {
  if (!AVOIDANCE_DISABLED) return false;
  console.warn(
    `${AVOIDANCE_BLOCK_BANNER}\nBlocked test: ${name}\nReason: ${reason}\n`
  );
  return true;
}

function applyDefaultModel(robots) {
  return (robots || []).map((robot) => {
    if (!robot) return robot;
    if (robot.model) return robot;
    return { ...robot, model: DEFAULT_ROBOT_MODEL_NAME };
  });
}

function makeNode(id, x, y) {
  return { id, pos: { x, y } };
}

function makeEdge(id, start, end) {
  return { id, start, end };
}

function buildBundle({ nodes, edges, lines, robots, traffic }) {
  const robotsConfig = {
    models: { [DEFAULT_ROBOT_MODEL_NAME]: { ...DEFAULT_ROBOT_MODEL } },
    defaultModel: DEFAULT_ROBOT_MODEL_NAME,
    robots: applyDefaultModel(robots)
  };
  if (traffic) {
    robotsConfig.traffic = traffic;
  }
  return {
    graph: { nodes, edges, lines: lines || [] },
    workflow: { bin_locations: {} },
    robotsConfig,
    packaging: null
  };
}

function makeTrafficConfig(strategy, options = {}) {
  const traffic = {
    strategy,
    reservationHorizonMs: 60000,
    reservationStepMs: 200,
    reservationSafetyMs: 120,
    reservationNodeDwellMs: 300,
    avoidanceLocks: false,
    avoidanceZones: false,
    yieldRecovery: false
  };
  if (Number.isFinite(options.reservationHorizonMs)) {
    traffic.reservationHorizonMs = options.reservationHorizonMs;
  }
  if (Number.isFinite(options.reservationStepMs)) {
    traffic.reservationStepMs = options.reservationStepMs;
  }
  if (Number.isFinite(options.reservationSafetyMs)) {
    traffic.reservationSafetyMs = options.reservationSafetyMs;
  }
  if (Number.isFinite(options.reservationNodeDwellMs)) {
    traffic.reservationNodeDwellMs = options.reservationNodeDwellMs;
  }
  if (Number.isFinite(options.segmentLength)) {
    traffic.segmentLength = options.segmentLength;
  }
  return traffic;
}

function makeEdgeGroupKey(fromId, toId) {
  if (!fromId || !toId) return null;
  return fromId < toId ? `${fromId}<->${toId}` : `${toId}<->${fromId}`;
}

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const x =
    mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x;
  const y =
    mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y;
  return { x, y };
}

function findNearestNode(nodes, pos) {
  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  (nodes || []).forEach((node) => {
    if (!node?.pos) return;
    const dx = node.pos.x - pos.x;
    const dy = node.pos.y - pos.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  });
  return best;
}

function edgeEndpoints(edge, nodesById) {
  if (!edge?.start || !edge?.end) return null;
  const startNode = nodesById?.get(edge.start);
  const endNode = nodesById?.get(edge.end);
  const startPos = edge.startPos || startNode?.pos;
  const endPos = edge.endPos || endNode?.pos;
  if (!startPos || !endPos) return null;
  return { startPos, endPos };
}

function pointAlongEdge(edge, endpoints, t) {
  if (!endpoints) return null;
  const p0 = endpoints.startPos;
  const p3 = endpoints.endPos;
  if (edge.controlPos1 && edge.controlPos2) {
    return bezierPoint(p0, edge.controlPos1, edge.controlPos2, p3, t);
  }
  return { x: p0.x + (p3.x - p0.x) * t, y: p0.y + (p3.y - p0.y) * t };
}

function edgeLengthFromEndpoints(endpoints) {
  if (!endpoints) return Number.POSITIVE_INFINITY;
  return distance(endpoints.startPos, endpoints.endPos);
}

function buildLegacyAdjacency(nodes, edges) {
  const nodeIndex = new Map((nodes || []).map((node) => [node.id, node]));
  const adjacency = new Map();
  nodeIndex.forEach((_node, nodeId) => adjacency.set(nodeId, []));
  (edges || []).forEach((edge) => {
    if (!edge?.start || !edge?.end) return;
    const start = nodeIndex.get(edge.start);
    const end = nodeIndex.get(edge.end);
    if (!start || !end) return;
    const cost = distance(start.pos, end.pos);
    adjacency.get(start.id)?.push({ to: end.id, cost });
    adjacency.get(end.id)?.push({ to: start.id, cost });
  });
  return adjacency;
}

function dijkstra(adjacency, startId, goalId) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  let expansions = 0;
  adjacency.forEach((_list, nodeId) => dist.set(nodeId, Number.POSITIVE_INFINITY));
  dist.set(startId, 0);

  while (true) {
    let current = null;
    let best = Number.POSITIVE_INFINITY;
    dist.forEach((value, nodeId) => {
      if (visited.has(nodeId)) return;
      if (value < best) {
        best = value;
        current = nodeId;
      }
    });
    if (!current) break;
    if (current === goalId) break;
    visited.add(current);
    expansions += 1;
    const neighbors = adjacency.get(current) || [];
    neighbors.forEach((neighbor) => {
      if (!neighbor) return;
      if (visited.has(neighbor.to)) return;
      const next = best + neighbor.cost;
      if (next < dist.get(neighbor.to)) {
        dist.set(neighbor.to, next);
        prev.set(neighbor.to, current);
      }
    });
  }
  return { dist, prev, expansions };
}

function planLegacyRoute(nodes, edges, startPos, goalPos) {
  const startNode = findNearestNode(nodes, startPos);
  const goalNode = findNearestNode(nodes, goalPos);
  if (!startNode || !goalNode) return null;
  if (startNode.id === goalNode.id) {
    return { startId: startNode.id, goalId: goalNode.id, edgeKeys: [], totalLength: 0 };
  }
  const adjacency = buildLegacyAdjacency(nodes, edges);
  const { dist, prev, expansions } = dijkstra(adjacency, startNode.id, goalNode.id);
  const totalLength = dist.get(goalNode.id);
  if (!Number.isFinite(totalLength)) return null;
  const edgeKeys = [];
  let cursor = goalNode.id;
  while (cursor && cursor !== startNode.id) {
    const prevId = prev.get(cursor);
    if (!prevId) break;
    edgeKeys.unshift(`${prevId}->${cursor}`);
    cursor = prevId;
  }
  return { startId: startNode.id, goalId: goalNode.id, edgeKeys, totalLength, expansions };
}

function routeLength(route) {
  return (route?.segments || []).reduce(
    (sum, segment) => sum + (Number.isFinite(segment?.totalLength) ? segment.totalLength : 0),
    0
  );
}

function collectGroupKeysFromRoute(route) {
  const seen = new Set();
  (route?.segments || []).forEach((segment) => {
    const key = segment.edgeGroupKey || segment.edgeKey || null;
    if (!key || seen.has(key)) return;
    seen.add(key);
  });
  return [...seen];
}

function collectGroupKeysFromEdgeKeys(edgeKeys) {
  const seen = new Set();
  (edgeKeys || []).forEach((edgeKey) => {
    const parts = String(edgeKey).split("->");
    if (parts.length !== 2) return;
    const key = makeEdgeGroupKey(parts[0], parts[1]);
    if (key) seen.add(key);
  });
  return [...seen];
}

function countSharedKeys(keysList) {
  const counts = new Map();
  keysList.forEach((keys) => {
    (keys || []).forEach((key) => {
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  let overlap = 0;
  counts.forEach((count) => {
    if (count > 1) overlap += count - 1;
  });
  return overlap;
}

async function withSim(bundle, run, options = {}) {
  const sim = createLocalFleetSim({
    tickMs: options.tickMs || 1000,
    enableTestHooks: options.enableTestHooks
  });
  sim.loadBundle(bundle);
  sim.stopSim();
  try {
    await run(sim);
  } finally {
    sim.stopSim();
  }
}

async function withRunningSim(bundle, run, options = {}) {
  const sim = createLocalFleetSim({
    tickMs: options.tickMs || 30,
    enableTestHooks: options.enableTestHooks
  });
  sim.loadBundle(bundle);
  try {
    await run(sim);
  } finally {
    sim.stopSim();
  }
}

function getRoute(sim, robotId) {
  const debug = sim.getDebugState();
  const robot = debug.robots.find((item) => item.id === robotId);
  return robot ? robot.route : null;
}

function getRobotStatus(sim, robotId) {
  return sim.getStatus(false).robots.find((robot) => robot.id === robotId) || null;
}

function getRuntimeSnapshot(sim, robotId) {
  const diag = sim.getDiagnostics({
    robotId,
    includeHistory: false,
    includeRoute: false
  });
  return diag?.robots?.[0]?.runtime || null;
}

function startManualRoute(sim, robotId, target) {
  sim.setRobotManualMode(robotId, true);
  const ok = sim.goPoint(robotId, target.x, target.y);
  assert.equal(ok, true, "goPoint should succeed for manual robot");
  const route = getRoute(sim, robotId);
  assert.ok(route, "Expected a route to be planned");
  return route;
}

function edgeKeys(route) {
  return (route?.segments || []).map((segment) => segment.edgeKey).filter(Boolean);
}

function findImmediateBacktrack(route) {
  const segments = route?.segments || [];
  for (let i = 1; i < segments.length; i += 1) {
    const prev = segments[i - 1];
    const curr = segments[i];
    if (!prev?.fromNodeId || !prev?.toNodeId || !curr?.fromNodeId || !curr?.toNodeId) {
      continue;
    }
    if (prev.fromNodeId === curr.toNodeId && prev.toNodeId === curr.fromNodeId) {
      return { index: i - 1, from: prev.fromNodeId, to: prev.toNodeId };
    }
  }
  return null;
}

function hasOppositeEdge(route) {
  const segments = route?.segments || [];
  const seen = new Set();
  for (const segment of segments) {
    if (!segment?.fromNodeId || !segment?.toNodeId) continue;
    const key = `${segment.fromNodeId}->${segment.toNodeId}`;
    const opposite = `${segment.toNodeId}->${segment.fromNodeId}`;
    if (seen.has(opposite)) return true;
    seen.add(key);
  }
  return false;
}

function assertNoBacktrack(route, label) {
  const immediate = findImmediateBacktrack(route);
  assert.ok(!immediate, `${label}: route backtracked ${immediate?.from}->${immediate?.to}`);
  assert.ok(!hasOppositeEdge(route), `${label}: route used opposite edges`);
}

async function waitForRoute(sim, robotId, timeoutMs = 3000) {
  const ok = await waitFor(() => Boolean(getRoute(sim, robotId)), { timeoutMs });
  assert.ok(ok, `Expected route for ${robotId}`);
  return getRoute(sim, robotId);
}

async function monitorNoYield(sim, robotIds, done, options = {}) {
  const timeoutMs = options.timeoutMs ?? 8000;
  const intervalMs = options.intervalMs ?? 40;
  const label = options.label || "scenario";
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    robotIds.forEach((robotId) => {
      const runtime = getRuntimeSnapshot(sim, robotId);
      if (runtime?.yield || runtime?.phase === "yield") {
        assert.fail(`${label}: robot ${robotId} entered yield`);
      }
    });
    const doneNow = await Promise.resolve(done());
    if (doneNow) return;
    await delay(intervalMs);
  }
  assert.fail(`${label}: timeout waiting for completion`);
}

function findScheduleEntry(route, edgeGroupKey) {
  return (route?.schedule || []).find((entry) => entry.edgeGroupKey === edgeGroupKey) || null;
}

function findScheduleWaitForBase(route, baseGroupKey) {
  if (!route?.schedule?.length || !baseGroupKey) return null;
  const basePrefix = `${baseGroupKey}::`;
  const direct = route.schedule.find((item) => {
    const key = item?.edgeBaseGroupKey || item?.edgeGroupKey || null;
    return key === baseGroupKey || (key && key.startsWith(basePrefix));
  });
  if (direct) return direct.waitMs;
  if (!route?.segments?.length) return null;
  for (let i = 0; i < route.segments.length; i += 1) {
    const segment = route.segments[i];
    const key = segment?.edgeBaseGroupKey || segment?.edgeGroupKey || null;
    if (key !== baseGroupKey) continue;
    const entry = route.schedule.find((item) => item.segmentIndex === i) || null;
    if (entry) return entry.waitMs;
  }
  return null;
}

function loadTrafficGraph() {
  const rootDir = path.resolve(__dirname, "..");
  const graphPath = path.join(rootDir, "scenes", "traffic", "graph.json");
  return JSON.parse(fs.readFileSync(graphPath, "utf8"));
}

async function measureCorridorWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: -3, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  let segmentCount = 0;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    waitMs = route2.schedule[0].waitMs;
    segmentCount = route2.segments?.length || 0;
  });

  return { waitMs, segmentCount };
}

async function measureConvoyWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const robotCount = Number.isFinite(options.robotCount)
    ? Math.max(1, Math.floor(options.robotCount))
    : 3;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = Array.from({ length: robotCount }, (_item, index) => ({
    id: `RB-${String(index + 1).padStart(2, "0")}`,
    pos: { x: 0, y: 0 }
  }));
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  let segmentCount = 0;
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    robots.forEach((robot, index) => {
      assert.equal(
        sim.goPoint(robot.id, corridorLength, 0),
        true,
        `Robot ${index + 1} should accept goal`
      );
      const route = getRoute(sim, robot.id);
      assert.ok(route?.schedule?.length, `Expected schedule for ${robot.id}`);
      waits.push(route.schedule[0].waitMs);
      segmentCount = Math.max(segmentCount, route.segments?.length || 0);
    });
  });

  return { waits, segmentCount };
}

async function measureConvoyMakespan(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const robotCount = Number.isFinite(options.robotCount)
    ? Math.max(1, Math.floor(options.robotCount))
    : 3;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = Array.from({ length: robotCount }, (_item, index) => ({
    id: `RB-${String(index + 1).padStart(2, "0")}`,
    pos: { x: 0, y: 0 }
  }));
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let makespan = null;
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    robots.forEach((robot, index) => {
      assert.equal(
        sim.goPoint(robot.id, corridorLength, 0),
        true,
        `Robot ${index + 1} should accept goal`
      );
    });
    const routes = robots.map((robot) => getRoute(sim, robot.id)).filter(Boolean);
    assert.ok(routes.length === robots.length, "Expected routes for all convoy robots");
    makespan = Math.max(...routes.map((route) => routeCompletionMs(route)));
  });

  return makespan;
}

async function measureRollingAdmissionWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 18;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const segmentLength = Number.isFinite(options.segmentLength) ? options.segmentLength : 3;
  const planTimeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 3000;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: -segmentLength * 2, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      const planned = await waitFor(() => {
        const route = getRoute(sim, "RB-01");
        return route?.schedule?.length;
      }, { timeoutMs: planTimeoutMs });
      assert.ok(planned, "Robot 1 should plan before admitting Robot 2");
      assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
      const route2 = getRoute(sim, "RB-02");
      assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
      waitMs = route2.schedule[0].waitMs;
    },
    { tickMs: options.tickMs || 30 }
  );

  return waitMs;
}

async function measurePartialCorridorWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const goalRatio = Number.isFinite(options.goalRatio) ? options.goalRatio : 0.5;
  const goalX = corridorLength * clamp(goalRatio, 0.2, 0.9);
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", goalX, 0), true, "Robot 2 should accept mid-goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    waitMs = route2.schedule[0].waitMs;
  });

  return waitMs;
}

async function measureBranchExitWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const branchOffset = Number.isFinite(options.branchOffset) ? options.branchOffset : 6;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const midX = corridorLength * 0.5;
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("M", midX, 0),
    makeNode("G", corridorLength, 0),
    makeNode("B", midX, branchOffset)
  ];
  const edges = [
    { id: "S-M", start: "S", end: "M", props: { width: corridorWidth } },
    { id: "M-G", start: "M", end: "G", props: { width: corridorWidth } },
    makeEdge("M-B", "M", "B")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", midX, branchOffset), true, "Robot 2 should accept branch");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    waitMs = route2.schedule[0].waitMs;
  });

  return waitMs;
}

async function measureStaggeredStreamWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const robotCount = Number.isFinite(options.robotCount)
    ? Math.max(2, Math.floor(options.robotCount))
    : 5;
  const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 1000;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = Array.from({ length: robotCount }, (_item, index) => ({
    id: `RB-${String(index + 1).padStart(2, "0")}`,
    pos: { x: 0, y: 0 }
  }));
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withRunningSim(
    bundle,
    async (sim) => {
      robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
      for (let i = 0; i < robots.length; i += 1) {
        if (i > 0) {
          await delay(intervalMs);
        }
        const robotId = robots[i].id;
        assert.equal(
          sim.goPoint(robotId, corridorLength, 0),
          true,
          `Robot ${i + 1} should accept goal`
        );
        const route = getRoute(sim, robotId);
        assert.ok(route?.schedule?.length, `Expected schedule for ${robotId}`);
        waits.push(route.schedule[0].waitMs);
      }
    },
    { tickMs: options.tickMs || 30 }
  );

  return waits;
}

async function measureAvoidanceLockRoute(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 12;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const detourOffset = Number.isFinite(options.detourOffset) ? options.detourOffset : 6;
  const obstacleX = Number.isFinite(options.obstacleX) ? options.obstacleX : 2.2;
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("G", corridorLength, 0),
    makeNode("D1", 0, detourOffset),
    makeNode("D2", corridorLength, detourOffset)
  ];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } },
    makeEdge("S-D1", "S", "D1"),
    makeEdge("D1-D2", "D1", "D2"),
    makeEdge("D2-G", "D2", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let routeKeys = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      await delay(200);
      const obstacle = sim.addSimObstacle({ x: obstacleX, y: 0, radius: 0.4, mode: "avoid" });
      assert.equal(obstacle.ok, true, "Avoid obstacle should be created");
      const avoiding = await waitFor(() => {
        const robot = getRobotStatus(sim, "RB-01");
        return robot?.pose && Math.abs(robot.pose.y) >= 0.4;
      }, { timeoutMs: 25000 });
      assert.ok(avoiding, "Robot 1 should enter avoidance before planning Robot 2");
      assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
      const route2 = getRoute(sim, "RB-02");
      assert.ok(route2, "Expected route for Robot 2");
      routeKeys = edgeKeys(route2);
    },
    { tickMs: options.tickMs || 30 }
  );

  return routeKeys || [];
}

async function measureAnchorEntryWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const entryX = Number.isFinite(options.entryX)
    ? Math.max(0, Math.min(corridorLength, options.entryX))
    : corridorLength * 0.5;
  const leadX = Number.isFinite(options.leadX)
    ? Math.max(0, Math.min(corridorLength, options.leadX))
    : 0;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: leadX, y: 0 } },
    { id: "RB-02", pos: { x: entryX, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    waitMs = route2.schedule[0].waitMs;
  });

  return waitMs;
}

async function measureMidGoalWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const midX = Number.isFinite(options.midX)
    ? Math.max(0, Math.min(corridorLength, options.midX))
    : corridorLength * 0.5;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", midX, 0), true, "Robot 1 should accept mid-goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    waitMs = route2.schedule[0].waitMs;
  });

  return waitMs;
}

async function measureAnchorEntryDelayedWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const entryX = Number.isFinite(options.entryX)
    ? Math.max(0, Math.min(corridorLength, options.entryX))
    : corridorLength * 0.5;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: entryX, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      const planned = await waitFor(() => {
        const route = getRoute(sim, "RB-01");
        return route?.schedule?.length;
      }, { timeoutMs: 3000 });
      assert.ok(planned, "Robot 1 should plan before admitting Robot 2");
      assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
      const route2 = getRoute(sim, "RB-02");
      assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
      waitMs = route2.schedule[0].waitMs;
    },
    { tickMs: options.tickMs || 30 }
  );

  return waitMs;
}

async function measureBidirectionalPassingWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const bayOffset = Number.isFinite(options.bayOffset) ? options.bayOffset : 10;
  const aX = corridorLength / 3;
  const bX = (corridorLength * 2) / 3;
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", aX, 0),
    makeNode("B", bX, 0),
    makeNode("G", corridorLength, 0),
    makeNode("P1", aX, bayOffset),
    makeNode("P2", bX, bayOffset)
  ];
  const edges = [
    { id: "S-A", start: "S", end: "A", props: { width: corridorWidth } },
    { id: "A-B", start: "A", end: "B", props: { width: corridorWidth } },
    { id: "B-G", start: "B", end: "G", props: { width: corridorWidth } },
    makeEdge("A-P1", "A", "P1"),
    makeEdge("P1-P2", "P1", "P2"),
    makeEdge("P2-B", "P2", "B")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: corridorLength, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 0, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    const baseKey = makeEdgeGroupKey("A", "B");
    waitMs = findScheduleWaitForBase(route2, baseKey);
    if (!Number.isFinite(waitMs)) {
      waitMs = 0;
    }
  });

  return waitMs;
}

async function measureMidBlockerEntryWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const blockerX = Number.isFinite(options.blockerX)
    ? Math.max(0, Math.min(corridorLength, options.blockerX))
    : corridorLength * 0.5;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: blockerX, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    const baseKey = makeEdgeGroupKey("S", "G");
    waitMs = findScheduleWaitForBase(route2, baseKey);
    assert.ok(Number.isFinite(waitMs), "Expected entry wait for corridor");
  });

  return waitMs;
}

async function measurePausedLeaderEntryWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 18;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const pauseX = Number.isFinite(options.pauseX) ? options.pauseX : corridorLength * 0.25;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: pauseX, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      await delay(100);
      assert.equal(sim.pause("RB-01"), true, "Robot 1 should pause");
      assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
      const route2 = getRoute(sim, "RB-02");
      assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
      const baseKey = makeEdgeGroupKey("S", "G");
      waitMs = findScheduleWaitForBase(route2, baseKey);
      assert.ok(Number.isFinite(waitMs), "Expected entry wait for corridor");
    },
    { tickMs: options.tickMs || 30 }
  );

  return waitMs;
}

async function measureDetourChoiceRoute(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 60;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const detourOffset = Number.isFinite(options.detourOffset) ? options.detourOffset : 12;
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("G", corridorLength, 0),
    makeNode("D1", 0, detourOffset),
    makeNode("D2", corridorLength, detourOffset)
  ];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } },
    makeEdge("S-D1", "S", "D1"),
    makeEdge("D1-D2", "D1", "D2"),
    makeEdge("D2-G", "D2", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let routeKeys = [];
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2, "Expected route for Robot 2");
    routeKeys = edgeKeys(route2);
  });

  return routeKeys;
}

async function measureObstaclePartialGoalRoute(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 20;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const goalX = Number.isFinite(options.goalX) ? options.goalX : corridorLength * 0.3;
  const obstacleX = Number.isFinite(options.obstacleX)
    ? options.obstacleX
    : corridorLength * 0.8;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let hasRoute = false;
  await withSim(bundle, async (sim) => {
    const obstacle = sim.addSimObstacle({ x: obstacleX, y: 0, radius: 0.8, mode: "block" });
    assert.equal(obstacle.ok, true, "Obstacle should be created");
    sim.setRobotManualMode("RB-01", true);
    assert.equal(sim.goPoint("RB-01", goalX, 0), true, "Robot should accept goal");
    const route = getRoute(sim, "RB-01");
    hasRoute = Boolean(route);
  });

  return hasRoute;
}

async function measureMultipleBlockersEntryWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const blockerA = Number.isFinite(options.blockerA) ? options.blockerA : corridorLength * 0.3;
  const blockerB = Number.isFinite(options.blockerB) ? options.blockerB : corridorLength * 0.7;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: blockerA, y: 0 } },
    { id: "RB-02", pos: { x: blockerB, y: 0 } },
    { id: "RB-03", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    ["RB-01", "RB-02", "RB-03"].forEach((id) => sim.setRobotManualMode(id, true));
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    assert.equal(sim.goPoint("RB-03", corridorLength, 0), true, "Robot 3 should accept goal");
    const route3 = getRoute(sim, "RB-03");
    assert.ok(route3?.schedule?.length, "Expected schedule for Robot 3");
    const baseKey = makeEdgeGroupKey("S", "G");
    waitMs = findScheduleWaitForBase(route3, baseKey);
    assert.ok(Number.isFinite(waitMs), "Expected entry wait for corridor");
  });

  return waitMs;
}

async function measureCancelMidCorridorWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 24;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const cancelX = Number.isFinite(options.cancelX) ? options.cancelX : corridorLength * 0.25;
  const progressTimeoutMs = Number.isFinite(options.timeoutMs)
    ? options.timeoutMs
    : Math.max(20000, Math.ceil((cancelX / 0.7) * 1000));
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let initialWait = null;
  let updatedWait = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
      const baseKey = makeEdgeGroupKey("S", "G");
      const route2 = getRoute(sim, "RB-02");
      assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
      initialWait = findScheduleWaitForBase(route2, baseKey);
      assert.ok(Number.isFinite(initialWait), "Expected initial corridor wait");

      const progressed = await waitFor(() => {
        const robot = getRobotStatus(sim, "RB-01");
        return robot?.pose && robot.pose.x >= cancelX;
      }, { timeoutMs: progressTimeoutMs });
      if (progressed) {
        assert.equal(sim.cancel("RB-01"), true, "Robot 1 should cancel");
        await delay(100);
        assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should replan");
        const updated = getRoute(sim, "RB-02");
        assert.ok(updated?.schedule?.length, "Expected updated schedule for Robot 2");
        updatedWait = findScheduleWaitForBase(updated, baseKey);
        assert.ok(Number.isFinite(updatedWait), "Expected updated corridor wait");
      } else {
        updatedWait = initialWait;
      }
    },
    { tickMs: options.tickMs || 30 }
  );

  return { initialWait, updatedWait };
}

async function measureMultiEntryWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const entries = Array.isArray(options.entries) && options.entries.length
    ? options.entries
    : [
        { id: "R1", x: 0, y: 0 },
        { id: "R2", x: corridorLength * 0.5, y: 0 },
        { id: "R3", x: corridorLength * 0.25, y: 0 }
      ];
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = entries.map((entry, index) => ({
    id: entry.id || `RB-${String(index + 1).padStart(2, "0")}`,
    pos: { x: entry.x, y: entry.y }
  }));
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    robots.forEach((robot, index) => {
      assert.equal(
        sim.goPoint(robot.id, corridorLength, 0),
        true,
        `Robot ${index + 1} should accept goal`
      );
      const route = getRoute(sim, robot.id);
      assert.ok(route?.schedule?.length, `Expected schedule for ${robot.id}`);
      waits.push(route.schedule[0].waitMs);
    });
  });

  return waits;
}

async function measureSegmentLengthSweep(strategy, segmentLengths, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const results = [];

  for (const length of segmentLengths) {
    const traffic = makeTrafficConfig(strategy, { ...options, segmentLength: length });
    const bundle = buildBundle({ nodes, edges, robots, traffic });
    let waitMs = null;
    let segmentCount = 0;
    await withSim(bundle, async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
      const route2 = getRoute(sim, "RB-02");
      assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
      waitMs = route2.schedule[0].waitMs;
      segmentCount = route2.segments?.length || 0;
    });
    results.push({ segmentLength: length, waitMs, segmentCount });
  }

  return results;
}

async function measureTrunkCrossTraffic(strategy, options = {}) {
  const trunkLength = Number.isFinite(options.trunkLength) ? options.trunkLength : 30;
  const branchOffset = Number.isFinite(options.branchOffset) ? options.branchOffset : 12;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const nodes = [
    makeNode("A", 0, 0),
    makeNode("T1", trunkLength / 2, 0),
    makeNode("B", trunkLength, 0),
    makeNode("U1", 0, branchOffset),
    makeNode("U2", trunkLength, branchOffset),
    makeNode("D1", 0, -branchOffset),
    makeNode("D2", trunkLength, -branchOffset)
  ];
  const edges = [
    { id: "A-T1", start: "A", end: "T1", props: { width: corridorWidth } },
    { id: "T1-B", start: "T1", end: "B", props: { width: corridorWidth } },
    makeEdge("A-U1", "A", "U1"),
    makeEdge("U1-U2", "U1", "U2"),
    makeEdge("U2-B", "U2", "B"),
    makeEdge("A-D1", "A", "D1"),
    makeEdge("D1-D2", "D1", "D2"),
    makeEdge("D2-B", "D2", "B")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: branchOffset } },
    { id: "RB-03", pos: { x: 0, y: -branchOffset } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let makespan = null;
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    assert.equal(sim.goPoint("RB-01", trunkLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", trunkLength, 0), true, "Robot 2 should accept goal");
    assert.equal(sim.goPoint("RB-03", trunkLength, 0), true, "Robot 3 should accept goal");
    const routes = robots.map((robot) => getRoute(sim, robot.id)).filter(Boolean);
    assert.ok(routes.length === robots.length, "Expected routes for trunk robots");
    makespan = Math.max(...routes.map((route) => routeCompletionMs(route)));
  });

  return makespan;
}

async function measureOppositeLateJoiner(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: corridorLength, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      const planned = await waitFor(() => {
        const route = getRoute(sim, "RB-01");
        return route?.schedule?.length;
      }, { timeoutMs: 3000 });
      assert.ok(planned, "Robot 1 should plan before opposite joiner");
      assert.equal(sim.goPoint("RB-02", 0, 0), true, "Robot 2 should accept opposite goal");
      const route2 = getRoute(sim, "RB-02");
      assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
      const baseKey = makeEdgeGroupKey("S", "G");
      waitMs = findScheduleWaitForBase(route2, baseKey);
      assert.ok(Number.isFinite(waitMs), "Expected opposite-joiner wait");
    },
    { tickMs: options.tickMs || 30 }
  );

  return waitMs;
}

async function measureBurstWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const robotCount = Number.isFinite(options.robotCount)
    ? Math.max(2, Math.floor(options.robotCount))
    : 8;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = Array.from({ length: robotCount }, (_item, index) => ({
    id: `RB-${String(index + 1).padStart(2, "0")}`,
    pos: { x: 0, y: 0 }
  }));
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    robots.forEach((robot, index) => {
      assert.equal(
        sim.goPoint(robot.id, corridorLength, 0),
        true,
        `Robot ${index + 1} should accept goal`
      );
      const route = getRoute(sim, robot.id);
      assert.ok(route?.schedule?.length, `Expected schedule for ${robot.id}`);
      waits.push(route.schedule[0].waitMs);
    });
  });

  return waits;
}

async function measureSpeedProfileWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 48;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const segmentLength = Number.isFinite(options.segmentLength) ? options.segmentLength : 3;
  const leadSpeed = Number.isFinite(options.leadSpeed) ? options.leadSpeed : 0.6;
  const followerSpeed = Number.isFinite(options.followerSpeed) ? options.followerSpeed : 1.6;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 }, speedMultiplier: leadSpeed },
    { id: "RB-02", pos: { x: 0, y: 0 }, speedMultiplier: followerSpeed }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  let leadTravelMs = null;
  let followerTravelMs = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Lead robot should accept goal");
      const leadRoute = getRoute(sim, "RB-01");
      assert.ok(leadRoute?.schedule?.length, "Expected schedule for lead robot");
      leadTravelMs = leadRoute?.schedule?.[0]?.travelMs ?? null;
      assert.equal(
        sim.goPoint("RB-02", corridorLength, 0),
        true,
        "Follower robot should accept goal"
      );
      const followerRoute = getRoute(sim, "RB-02");
      assert.ok(followerRoute?.schedule?.length, "Expected schedule for follower robot");
      followerTravelMs = followerRoute?.schedule?.[0]?.travelMs ?? null;
      waitMs = followerRoute?.schedule?.[0]?.waitMs ?? null;
    },
    { tickMs: options.tickMs || 30 }
  );

  return { waitMs, leadTravelMs, followerTravelMs };
}

async function measurePriorityPreemptionWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const lowPriority = Number.isFinite(options.lowPriority) ? options.lowPriority : 0;
  const highPriority = Number.isFinite(options.highPriority) ? options.highPriority : 0;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-LOW", pos: { x: 0, y: 0 }, priority: lowPriority },
    { id: "RB-HIGH", pos: { x: 0, y: 0 }, priority: highPriority }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-LOW", true);
    sim.setRobotManualMode("RB-HIGH", true);
    assert.equal(sim.goPoint("RB-LOW", corridorLength, 0), true, "Low priority should accept goal");
    assert.equal(
      sim.goPoint("RB-HIGH", corridorLength, 0),
      true,
      "High priority should accept goal"
    );
    const route = getRoute(sim, "RB-HIGH");
    assert.ok(route?.schedule?.length, "Expected schedule for high priority robot");
    const baseKey = makeEdgeGroupKey("S", "G");
    waitMs = findScheduleWaitForBase(route, baseKey);
  });

  return waitMs;
}

async function measureAlternatingFlowWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 600;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-A1", pos: { x: 0, y: 0 } },
    { id: "RB-B1", pos: { x: corridorLength, y: 0 } },
    { id: "RB-A2", pos: { x: 0, y: 0 } },
    { id: "RB-B2", pos: { x: corridorLength, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    const baseKey = makeEdgeGroupKey("S", "G");
    assert.equal(sim.goPoint("RB-A1", corridorLength, 0), true, "A1 should accept goal");
    await delay(intervalMs);
    assert.equal(sim.goPoint("RB-B1", 0, 0), true, "B1 should accept goal");
    await delay(intervalMs);
    assert.equal(sim.goPoint("RB-A2", corridorLength, 0), true, "A2 should accept goal");
    const routeA2 = getRoute(sim, "RB-A2");
    const waitA2 = findScheduleWaitForBase(routeA2, baseKey);
    waits.push(Number.isFinite(waitA2) ? waitA2 : 0);
    await delay(intervalMs);
    assert.equal(sim.goPoint("RB-B2", 0, 0), true, "B2 should accept goal");
    const routeB2 = getRoute(sim, "RB-B2");
    const waitB2 = findScheduleWaitForBase(routeB2, baseKey);
    waits.push(Number.isFinite(waitB2) ? waitB2 : 0);
  });

  return waits;
}

function makeRng(seed) {
  let state = Number.isFinite(seed) ? seed >>> 0 : 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function percentile(values, ratio) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const index = Math.floor((sorted.length - 1) * clamped);
  return sorted[index];
}

async function measureRandomEntryWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 60;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const robotCount = Number.isFinite(options.robotCount)
    ? Math.max(4, Math.floor(options.robotCount))
    : 12;
  const entrySpan = Number.isFinite(options.entrySpan) ? options.entrySpan : 0.3;
  const span = corridorLength * clamp(entrySpan, 0.05, 0.45);
  const rng = makeRng(Number.isFinite(options.seed) ? options.seed : 42);
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = Array.from({ length: robotCount }, (_item, index) => {
    const fromLeft = rng() < 0.5;
    const offset = rng() * span;
    const x = fromLeft ? offset : corridorLength - offset;
    return {
      id: `RB-${String(index + 1).padStart(2, "0")}`,
      pos: { x, y: 0 }
    };
  });
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    robots.forEach((robot) => {
      const targetX = robot.pos.x < corridorLength / 2 ? corridorLength : 0;
      assert.equal(
        sim.goPoint(robot.id, targetX, 0),
        true,
        `Robot ${robot.id} should accept goal`
      );
      const route = getRoute(sim, robot.id);
      assert.ok(route?.schedule?.length, `Expected schedule for ${robot.id}`);
      const baseKey = makeEdgeGroupKey("S", "G");
      const waitMs = findScheduleWaitForBase(route, baseKey);
      waits.push(Number.isFinite(waitMs) ? waitMs : 0);
    });
  });

  const avgWait = waits.reduce((sum, value) => sum + value, 0) / waits.length;
  const sorted = [...waits].sort((a, b) => a - b);
  const p90 =
    sorted.length > 0 ? sorted[Math.floor((sorted.length - 1) * 0.9)] : 0;
  return { waits, avgWait, p90 };
}

async function measureCurvedCorridorWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const curveOffset = Number.isFinite(options.curveOffset) ? options.curveOffset : 8;
  const entryT = Number.isFinite(options.entryT) ? options.entryT : 0.45;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const controlPos1 = { x: corridorLength * 0.3, y: curveOffset };
  const controlPos2 = { x: corridorLength * 0.7, y: -curveOffset };
  const edges = [
    {
      id: "S-G",
      start: "S",
      end: "G",
      controlPos1,
      controlPos2,
      props: { width: corridorWidth }
    }
  ];
  const entryPos = bezierPoint(
    nodes[0].pos,
    controlPos1,
    controlPos2,
    nodes[1].pos,
    clamp(entryT, 0.1, 0.9)
  );
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: entryPos.x, y: entryPos.y } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  let segmentCount = 0;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    const baseKey = makeEdgeGroupKey("S", "G");
    waitMs = findScheduleWaitForBase(route2, baseKey);
    segmentCount = route2?.segments?.length || 0;
  });

  return { waitMs, segmentCount };
}

async function measureHeteroWidthWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 1.8;
  const obstacleX = Number.isFinite(options.obstacleX) ? options.obstacleX : 6;
  const wideWidth = Number.isFinite(options.wideWidth) ? options.wideWidth : 1.6;
  const narrowWidth = Number.isFinite(options.narrowWidth) ? options.narrowWidth : 0.7;
  const widePos = Number.isFinite(options.widePos) ? options.widePos : 12;
  const narrowPos = Number.isFinite(options.narrowPos) ? options.narrowPos : 24;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const baseModel = { head: 0.5, tail: 2, width: 1 };
  const robots = [
    {
      id: "RB-W",
      pos: { x: widePos, y: 0 },
      model: { ...baseModel, width: wideWidth }
    },
    {
      id: "RB-N",
      pos: { x: narrowPos, y: 0 },
      model: { ...baseModel, width: narrowWidth }
    }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  let wideHasRoute = false;
  let narrowHasRoute = false;
  await withSim(bundle, async (sim) => {
    const obstacle = sim.addSimObstacle({ x: obstacleX, y: 0, radius: 0.8, mode: "avoid" });
    assert.equal(obstacle.ok, true, "Obstacle should be created");
    sim.setRobotManualMode("RB-W", true);
    sim.setRobotManualMode("RB-N", true);
    assert.equal(sim.goPoint("RB-W", corridorLength, 0), true, "Wide robot should accept goal");
    assert.equal(
      sim.goPoint("RB-N", corridorLength, 0),
      true,
      "Narrow robot should accept goal"
    );
    const wideRoute = getRoute(sim, "RB-W");
    const narrowRoute = getRoute(sim, "RB-N");
    wideHasRoute = Boolean(wideRoute);
    narrowHasRoute = Boolean(narrowRoute);
    if (narrowRoute) {
      const baseKey = makeEdgeGroupKey("S", "G");
      waitMs = findScheduleWaitForBase(narrowRoute, baseKey);
    }
  });

  return { waitMs, wideHasRoute, narrowHasRoute };
}

async function measureMultiEntryOppositeFlowWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const entryX = Number.isFinite(options.entryX) ? options.entryX : 12;
  const entryRight = corridorLength - entryX;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-L0", pos: { x: 0, y: 0 } },
    { id: "RB-L1", pos: { x: entryX, y: 0 } },
    { id: "RB-R0", pos: { x: corridorLength, y: 0 } },
    { id: "RB-R1", pos: { x: entryRight, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    assert.equal(sim.goPoint("RB-L0", corridorLength, 0), true, "L0 should accept goal");
    assert.equal(sim.goPoint("RB-L1", corridorLength, 0), true, "L1 should accept goal");
    assert.equal(sim.goPoint("RB-R0", 0, 0), true, "R0 should accept goal");
    assert.equal(sim.goPoint("RB-R1", 0, 0), true, "R1 should accept goal");
    const baseKey = makeEdgeGroupKey("S", "G");
    ["RB-L0", "RB-L1", "RB-R0", "RB-R1"].forEach((id) => {
      const route = getRoute(sim, id);
      assert.ok(route?.schedule?.length, `Expected schedule for ${id}`);
      const waitMs = findScheduleWaitForBase(route, baseKey);
      waits.push(Number.isFinite(waitMs) ? waitMs : 0);
    });
  });

  const maxWait = Math.max(...waits);
  const minWait = Math.min(...waits);
  return { waits, maxWait, spread: maxWait - minWait };
}

async function measureRollingFeedWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const feedPoints = Array.isArray(options.feedPoints) && options.feedPoints.length
    ? options.feedPoints
    : [12, 24, 36];
  const feederSpeed = Number.isFinite(options.feederSpeed) ? options.feederSpeed : 1.4;
  const progressMargin = Number.isFinite(options.progressMargin) ? options.progressMargin : 3;
  const leadSpeed = Number.isFinite(options.leadSpeed) ? options.leadSpeed : 1.4;
  const followerSpeed = Number.isFinite(options.followerSpeed) ? options.followerSpeed : 1;
  const baseSpeedMps = 0.9;
  const leadSpeedMps = Math.max(0.2, baseSpeedMps * leadSpeed);
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 }, speedMultiplier: leadSpeed },
    { id: "RB-02", pos: { x: 0, y: 0 }, speedMultiplier: followerSpeed }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withSim(bundle, async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(
        sim.goPoint("RB-01", feedPoints[0], 0),
        true,
        "Lead robot should accept first goal"
      );
      assert.equal(
        sim.goPoint("RB-02", corridorLength, 0),
        true,
        "Follower robot should accept goal"
      );
      const baseKey = makeEdgeGroupKey("S", "G");
      const initialRoute = getRoute(sim, "RB-02");
      assert.ok(initialRoute?.schedule?.length, "Expected initial follower schedule");
      waits.push(findScheduleWaitForBase(initialRoute, baseKey) || 0);

      let currentTarget = feedPoints[0];
      for (let i = 1; i < feedPoints.length; i += 1) {
        const target = feedPoints[i];
        assert.ok(
          sim.setRobotPose("RB-01", { x: currentTarget, y: 0 }),
          "Lead robot should advance to feed point"
        );
        assert.equal(sim.goPoint("RB-01", target, 0), true, "Lead robot should accept new goal");
        assert.equal(
          sim.goPoint("RB-02", corridorLength, 0),
          true,
          "Follower should replan after feed"
        );
        const route = getRoute(sim, "RB-02");
        assert.ok(route?.schedule?.length, "Expected follower schedule after feed");
        waits.push(findScheduleWaitForBase(route, baseKey) || 0);
        currentTarget = target;
      }
  });

  return waits;
}

async function measureNodeReservationWait(strategy, options = {}) {
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const nodeDwellMs = Number.isFinite(options.nodeDwellMs) ? options.nodeDwellMs : 400;
  const nodes = [
    makeNode("A", 0, 0),
    makeNode("B", 0, 12),
    makeNode("C", 12, 0),
    makeNode("G", 24, 0)
  ];
  const edges = [
    { id: "A-C", start: "A", end: "C", props: { width: corridorWidth } },
    { id: "B-C", start: "B", end: "C", props: { width: corridorWidth } },
    { id: "C-G", start: "C", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 12 } }
  ];
  const traffic = makeTrafficConfig(strategy, { ...options, reservationNodeDwellMs: nodeDwellMs });
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 24, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 24, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.ok(route2?.schedule?.length, "Expected schedule for Robot 2");
    const baseKey = makeEdgeGroupKey("B", "C");
    waitMs = findScheduleWaitForBase(route2, baseKey);
  });

  return waitMs;
}

async function measurePrioritySlaWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 48;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const entryX = Number.isFinite(options.entryX) ? options.entryX : corridorLength * 0.5;
  const lowPriority = Number.isFinite(options.lowPriority) ? options.lowPriority : 0;
  const highPriority = Number.isFinite(options.highPriority) ? options.highPriority : 5;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-LOW", pos: { x: 0, y: 0 }, priority: lowPriority },
    { id: "RB-HIGH", pos: { x: entryX, y: 0 }, priority: highPriority }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-LOW", true);
      sim.setRobotManualMode("RB-HIGH", true);
      assert.equal(sim.goPoint("RB-LOW", corridorLength, 0), true, "Low robot should accept goal");
      const planned = await waitFor(() => {
        const route = getRoute(sim, "RB-LOW");
        return route?.schedule?.length;
      }, { timeoutMs: 3000 });
      assert.ok(planned, "Low robot should plan before urgent entry");
      assert.equal(
        sim.goPoint("RB-HIGH", corridorLength, 0),
        true,
        "High robot should accept goal"
      );
      const route = getRoute(sim, "RB-HIGH");
      assert.ok(route?.schedule?.length, "Expected schedule for high robot");
      const baseKey = makeEdgeGroupKey("S", "G");
      waitMs = findScheduleWaitForBase(route, baseKey);
    },
    { tickMs: options.tickMs || 30 }
  );

  return waitMs;
}

async function measureIntersectionThroughput(strategy, options = {}) {
  const armLength = Number.isFinite(options.armLength) ? options.armLength : 30;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const nodes = [
    makeNode("N", 0, armLength),
    makeNode("S", 0, -armLength),
    makeNode("E", armLength, 0),
    makeNode("W", -armLength, 0),
    makeNode("C", 0, 0)
  ];
  const edges = [
    { id: "N-C", start: "N", end: "C", props: { width: corridorWidth } },
    { id: "S-C", start: "S", end: "C", props: { width: corridorWidth } },
    { id: "E-C", start: "E", end: "C", props: { width: corridorWidth } },
    { id: "W-C", start: "W", end: "C", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-N", pos: { x: 0, y: armLength }, speedMultiplier: 1.4 },
    { id: "RB-S", pos: { x: 0, y: -armLength }, speedMultiplier: 0.7 },
    { id: "RB-E", pos: { x: armLength, y: 0 }, speedMultiplier: 1.2 },
    { id: "RB-W", pos: { x: -armLength, y: 0 }, speedMultiplier: 0.8 }
  ];
  const traffic = {
    ...makeTrafficConfig(strategy, options),
    noTurnaround: true
  };
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let makespan = null;
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    assert.equal(sim.goPoint("RB-N", 0, -armLength), true, "N robot should accept goal");
    assert.equal(sim.goPoint("RB-S", 0, armLength), true, "S robot should accept goal");
    assert.equal(sim.goPoint("RB-E", -armLength, 0), true, "E robot should accept goal");
    assert.equal(sim.goPoint("RB-W", armLength, 0), true, "W robot should accept goal");
    const routes = robots.map((robot) => getRoute(sim, robot.id)).filter(Boolean);
    assert.ok(routes.length === robots.length, "Expected routes for intersection robots");
    makespan = Math.max(...routes.map((route) => routeCompletionMs(route)));
  });

  return makespan;
}

async function measureVariableWidthBlockedProgress(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const midX = corridorLength * 0.5;
  const avoidX = Number.isFinite(options.avoidX) ? options.avoidX : corridorLength * 0.25;
  const blockX = Number.isFinite(options.blockX) ? options.blockX : corridorLength * 0.75;
  const speedMultiplier = Number.isFinite(options.speedMultiplier)
    ? options.speedMultiplier
    : 2;
  const nodes = [makeNode("S", 0, 0), makeNode("M", midX, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-M", start: "S", end: "M", props: { width: corridorWidth } },
    { id: "M-G", start: "M", end: "G", props: { width: 0 } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 }, speedMultiplier },
    { id: "RB-02", pos: { x: 0, y: 0 }, speedMultiplier }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let blockedX = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      const obstacle1 = sim.addSimObstacle({ x: avoidX, y: 0, radius: 0.8, mode: "avoid" });
      assert.equal(obstacle1.ok, true, "First obstacle should be created");
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
      assert.ok(
        sim.setRobotPose("RB-01", { x: midX + 2, y: 0 }),
        "Robot 1 should reach the second segment"
      );
      const obstacle2 = sim.addSimObstacle({ x: blockX, y: 0, radius: 0.8, mode: "avoid" });
      assert.equal(obstacle2.ok, true, "Second obstacle should be created");
      const blocked = await waitFor(() => {
        const robot = getRobotStatus(sim, "RB-02");
        return Boolean(robot?.blocked);
      }, { timeoutMs: 15000 });
      blockedX = blocked ? (getRobotStatus(sim, "RB-02")?.pose?.x ?? null) : null;
    },
    { tickMs: options.tickMs || 30 }
  );

  return blockedX;
}

async function measureQueueChurnRecovery(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const pauseX = Number.isFinite(options.pauseX) ? options.pauseX : corridorLength * 0.2;
  const cancelX = Number.isFinite(options.cancelX) ? options.cancelX : corridorLength * 0.35;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } },
    { id: "RB-03", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let initialWait = null;
  let updatedWait = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
      assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
      assert.equal(sim.goPoint("RB-03", corridorLength, 0), true, "Robot 3 should accept goal");
      const baseKey = makeEdgeGroupKey("S", "G");
      const route3 = getRoute(sim, "RB-03");
      initialWait = findScheduleWaitForBase(route3, baseKey);
      assert.ok(Number.isFinite(initialWait), "Expected initial wait for Robot 3");

      const paused = await waitFor(() => {
        const robot = getRobotStatus(sim, "RB-01");
        return robot?.pose && robot.pose.x >= pauseX;
      }, { timeoutMs: 8000 });
      if (paused) {
        assert.equal(sim.pause("RB-01"), true, "Robot 1 should pause");
        await delay(200);
        assert.equal(sim.resume("RB-01"), true, "Robot 1 should resume");
      }

      const readyCancel = await waitFor(() => {
        const robot = getRobotStatus(sim, "RB-02");
        return robot?.pose && robot.pose.x >= cancelX;
      }, { timeoutMs: 8000 });
      if (readyCancel) {
        assert.equal(sim.cancel("RB-02"), true, "Robot 2 should cancel");
      }
      await delay(100);
      assert.equal(sim.goPoint("RB-03", corridorLength, 0), true, "Robot 3 should replan");
      const updated = getRoute(sim, "RB-03");
      updatedWait = findScheduleWaitForBase(updated, baseKey);
    },
    { tickMs: options.tickMs || 30 }
  );

  return { initialWait, updatedWait };
}

async function measureDynamicObstacleRecovery(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const obstacleX = Number.isFinite(options.obstacleX) ? options.obstacleX : 12;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let initialWait = null;
  let updatedWait = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Lead robot should accept goal");
      const planned = await waitFor(() => {
        const route = getRoute(sim, "RB-01");
        return route?.schedule?.length;
      }, { timeoutMs: 3000 });
      assert.ok(planned, "Lead robot should plan before obstacle");
      assert.equal(
        sim.goPoint("RB-02", corridorLength, 0),
        true,
        "Follower robot should accept goal"
      );
      const baseKey = makeEdgeGroupKey("S", "G");
      const route2 = getRoute(sim, "RB-02");
      initialWait = findScheduleWaitForBase(route2, baseKey);
      const obstacle = sim.addSimObstacle({ x: obstacleX, y: 0, radius: 0.8, mode: "block" });
      assert.equal(obstacle.ok, true, "Obstacle should be created");
      const removed = sim.removeObstacleById(obstacle.obstacle.id);
      assert.equal(removed.ok, true, "Obstacle should be removed");
      await delay(150);
      assert.equal(
        sim.goPoint("RB-02", corridorLength, 0),
        true,
        "Follower should replan after obstacle removal"
      );
      const updated = getRoute(sim, "RB-02");
      updatedWait = findScheduleWaitForBase(updated, baseKey);
    },
    { tickMs: options.tickMs || 30 }
  );

  return { initialWait, updatedWait };
}

async function measureMovingObstacleRecovery(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const obstaclePositions = Array.isArray(options.obstaclePositions)
    ? options.obstaclePositions
    : [12, 18, 24];
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let initialWait = null;
  let updatedWait = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      sim.setRobotManualMode("RB-02", true);
      assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Lead robot should accept goal");
      const planned = await waitFor(() => {
        const route = getRoute(sim, "RB-01");
        return route?.schedule?.length;
      }, { timeoutMs: 3000 });
      assert.ok(planned, "Lead robot should plan before obstacle crossing");
      assert.equal(
        sim.goPoint("RB-02", corridorLength, 0),
        true,
        "Follower robot should accept goal"
      );
      const baseKey = makeEdgeGroupKey("S", "G");
      const route2 = getRoute(sim, "RB-02");
      initialWait = findScheduleWaitForBase(route2, baseKey);
      let obstacleId = null;
      for (const position of obstaclePositions) {
        if (obstacleId) {
          sim.removeObstacleById(obstacleId);
        }
        const obstacle = sim.addSimObstacle({
          x: position,
          y: 0,
          radius: 0.8,
          mode: "block"
        });
        assert.equal(obstacle.ok, true, "Crossing obstacle should be created");
        obstacleId = obstacle.obstacle.id;
        await delay(300);
      }
      if (obstacleId) {
        sim.removeObstacleById(obstacleId);
      }
      await delay(150);
      assert.equal(
        sim.goPoint("RB-02", corridorLength, 0),
        true,
        "Follower should replan after crossing obstacles"
      );
      const updated = getRoute(sim, "RB-02");
      updatedWait = findScheduleWaitForBase(updated, baseKey);
    },
    { tickMs: options.tickMs || 30 }
  );

  return { initialWait, updatedWait };
}

async function measureMixedSpeedPriorityOppositeWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 48;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const slowSpeed = Number.isFinite(options.slowSpeed) ? options.slowSpeed : 0.6;
  const urgentSpeed = Number.isFinite(options.urgentSpeed) ? options.urgentSpeed : 1.6;
  const slowPriority = Number.isFinite(options.slowPriority) ? options.slowPriority : 0;
  const urgentPriority = Number.isFinite(options.urgentPriority) ? options.urgentPriority : 5;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-S1", pos: { x: 0, y: 0 }, speedMultiplier: slowSpeed, priority: slowPriority },
    { id: "RB-S2", pos: { x: 0, y: 0 }, speedMultiplier: slowSpeed, priority: slowPriority },
    { id: "RB-U", pos: { x: corridorLength, y: 0 }, speedMultiplier: urgentSpeed, priority: urgentPriority }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let urgentWait = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      ["RB-S1", "RB-S2", "RB-U"].forEach((id) => sim.setRobotManualMode(id, true));
      assert.equal(sim.goPoint("RB-S1", corridorLength, 0), true, "Slow robot 1 should accept goal");
      assert.equal(sim.goPoint("RB-S2", corridorLength, 0), true, "Slow robot 2 should accept goal");
      assert.equal(sim.goPoint("RB-U", 0, 0), true, "Urgent robot should accept goal");
      const baseKey = makeEdgeGroupKey("S", "G");
      const route = getRoute(sim, "RB-U");
      urgentWait = findScheduleWaitForBase(route, baseKey);
    },
    { tickMs: options.tickMs || 30 }
  );

  return urgentWait;
}

async function measureLargeScaleRandomWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 60;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const corridorCount = Number.isFinite(options.corridorCount)
    ? Math.max(2, Math.floor(options.corridorCount))
    : 3;
  const spacing = Number.isFinite(options.spacing) ? options.spacing : 8;
  const robotCount = Number.isFinite(options.robotCount)
    ? Math.max(10, Math.floor(options.robotCount))
    : 30;
  const entrySpan = Number.isFinite(options.entrySpan) ? options.entrySpan : 0.3;
  const span = corridorLength * clamp(entrySpan, 0.05, 0.45);
  const rng = makeRng(Number.isFinite(options.seed) ? options.seed : 21);
  const nodes = [];
  const edges = [];
  const corridorKeys = [];
  for (let i = 0; i < corridorCount; i += 1) {
    const y = i * spacing;
    const startId = `S${i}`;
    const endId = `G${i}`;
    nodes.push(makeNode(startId, 0, y));
    nodes.push(makeNode(endId, corridorLength, y));
    edges.push({ id: `${startId}-${endId}`, start: startId, end: endId, props: { width: corridorWidth } });
    corridorKeys.push({ startId, endId, baseKey: makeEdgeGroupKey(startId, endId), y });
  }
  const robots = Array.from({ length: robotCount }, (_item, index) => {
    const corridor = corridorKeys[Math.floor(rng() * corridorKeys.length)];
    const fromLeft = rng() < 0.5;
    const offset = rng() * span;
    const x = fromLeft ? offset : corridorLength - offset;
    return {
      id: `RB-${String(index + 1).padStart(2, "0")}`,
      pos: { x, y: corridor.y },
      corridorKey: corridor.baseKey,
      targetX: fromLeft ? corridorLength : 0
    };
  });
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    robots.forEach((robot) => {
      assert.equal(
        sim.goPoint(robot.id, robot.targetX, robot.pos.y),
        true,
        `Robot ${robot.id} should accept goal`
      );
      const route = getRoute(sim, robot.id);
      assert.ok(route?.schedule?.length, `Expected schedule for ${robot.id}`);
      const waitMs = findScheduleWaitForBase(route, robot.corridorKey);
      waits.push(Number.isFinite(waitMs) ? waitMs : 0);
    });
  });

  const avgWait = waits.reduce((sum, value) => sum + value, 0) / waits.length;
  const p95 = percentile(waits, 0.95);
  return { avgWait, p95 };
}

async function measureStrategySwitchWait(options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig("pulse-mapf-time", options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let baselineWait = null;
  let updatedWait = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    const baseKey = makeEdgeGroupKey("S", "G");
    const route2 = getRoute(sim, "RB-02");
    baselineWait = findScheduleWaitForBase(route2, baseKey);
    const updated = sim.updateSimSettings({
      trafficStrategy: "sipp",
      trafficOptions: { segmentLength: options.segmentLength || 3 }
    });
    assert.equal(updated.ok, true, "Expected traffic strategy update");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should replan");
    const routeUpdated = getRoute(sim, "RB-02");
    updatedWait = findScheduleWaitForBase(routeUpdated, baseKey);
  });

  return { baselineWait, updatedWait };
}

async function measureStreamingOppositeWaits(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const feedPoints = Array.isArray(options.feedPoints) && options.feedPoints.length
    ? options.feedPoints
    : [12, 24, 36];
  const feederSpeed = Number.isFinite(options.feederSpeed) ? options.feederSpeed : 1.4;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-F", pos: { x: 0, y: 0 }, speedMultiplier: feederSpeed },
    { id: "RB-O", pos: { x: corridorLength, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  const waits = [];
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-F", true);
      sim.setRobotManualMode("RB-O", true);
      assert.equal(sim.goPoint("RB-F", feedPoints[0], 0), true, "Feeder should accept goal");
      const planned = await waitFor(() => {
        const route = getRoute(sim, "RB-F");
        return route?.schedule?.length;
      }, { timeoutMs: 3000 });
      assert.ok(planned, "Feeder should plan before opposite start");
      assert.equal(sim.goPoint("RB-O", 0, 0), true, "Opposite robot should accept goal");
      const baseKey = makeEdgeGroupKey("S", "G");
      const routeOpp = getRoute(sim, "RB-O");
      waits.push(findScheduleWaitForBase(routeOpp, baseKey) || 0);

      for (let i = 1; i < feedPoints.length; i += 1) {
        const target = feedPoints[i];
        assert.equal(sim.goPoint("RB-F", target, 0), true, "Feeder should update goal");
        await delay(100);
        assert.equal(sim.goPoint("RB-O", 0, 0), true, "Opposite should replan");
        const route = getRoute(sim, "RB-O");
        waits.push(findScheduleWaitForBase(route, baseKey) || 0);
      }
    },
    { tickMs: options.tickMs || 30 }
  );

  return Math.max(...waits);
}

async function measureYieldBayStress(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const bayOffset = Number.isFinite(options.bayOffset) ? options.bayOffset : 10;
  const aX = corridorLength / 3;
  const bX = (corridorLength * 2) / 3;
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", aX, 0),
    makeNode("B", bX, 0),
    makeNode("G", corridorLength, 0),
    makeNode("P1", aX, bayOffset),
    makeNode("P2", bX, bayOffset)
  ];
  const edges = [
    { id: "S-A", start: "S", end: "A", props: { width: corridorWidth } },
    { id: "A-B", start: "A", end: "B", props: { width: corridorWidth } },
    { id: "B-G", start: "B", end: "G", props: { width: corridorWidth } },
    makeEdge("A-P1", "A", "P1"),
    makeEdge("P1-P2", "P1", "P2"),
    makeEdge("P2-B", "P2", "B")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } },
    { id: "RB-03", pos: { x: corridorLength, y: 0 } },
    { id: "RB-04", pos: { x: corridorLength, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let maxWait = 0;
  await withSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    assert.equal(sim.goPoint("RB-03", 0, 0), true, "Robot 3 should accept goal");
    assert.equal(sim.goPoint("RB-04", 0, 0), true, "Robot 4 should accept goal");
    const baseKey = makeEdgeGroupKey("A", "B");
    ["RB-01", "RB-02", "RB-03", "RB-04"].forEach((id) => {
      const route = getRoute(sim, id);
      assert.ok(route?.schedule?.length, `Expected schedule for ${id}`);
      const waitMs = findScheduleWaitForBase(route, baseKey);
      if (Number.isFinite(waitMs)) {
        maxWait = Math.max(maxWait, waitMs);
      }
    });
  });

  return maxWait;
}

async function measureTeleopAutoWait(strategy, options = {}) {
  const corridorLength = Number.isFinite(options.corridorLength) ? options.corridorLength : 36;
  const corridorWidth = Number.isFinite(options.corridorWidth) ? options.corridorWidth : 4;
  const teleopX = Number.isFinite(options.teleopX) ? options.teleopX : corridorLength * 0.4;
  const teleopStartX = Number.isFinite(options.teleopStartX) ? options.teleopStartX : 0;
  const teleopSpeed = Number.isFinite(options.teleopSpeed) ? options.teleopSpeed : 1.8;
  const baseSpeedMps = 0.9;
  const teleopSpeedMps = Math.max(0.2, baseSpeedMps * teleopSpeed);
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [
    { id: "S-G", start: "S", end: "G", props: { width: corridorWidth } }
  ];
  const robots = [
    { id: "RB-T", pos: { x: teleopStartX, y: 0 }, speedMultiplier: teleopSpeed },
    { id: "RB-A", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig(strategy, options);
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let waitMs = null;
  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-T", true);
      sim.setRobotManualMode("RB-A", true);
      assert.equal(sim.goPoint("RB-T", corridorLength, 0), true, "Teleop robot should accept goal");
      const progressed = await waitFor(() => {
        const robot = getRobotStatus(sim, "RB-T");
        return robot?.pose && robot.pose.x >= teleopX;
      }, {
        timeoutMs: Math.max(6000, Math.ceil((teleopX / teleopSpeedMps) * 1000 * 1.5))
      });
      assert.ok(progressed, "Teleop robot should reach the pause point");
      assert.equal(sim.pause("RB-T"), true, "Teleop robot should pause");
      await delay(100);
      assert.equal(sim.goPoint("RB-A", corridorLength, 0), true, "Auto robot should accept goal");
      const baseKey = makeEdgeGroupKey("S", "G");
      const route = getRoute(sim, "RB-A");
      waitMs = findScheduleWaitForBase(route, baseKey);
    },
    { tickMs: options.tickMs || 30 }
  );

  return waitMs;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 3000;
  const intervalMs = options.intervalMs ?? 30;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await delay(intervalMs);
  }
  return false;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pathNodesFromEdgeKeys(edgeKeys) {
  if (!edgeKeys?.length) return [];
  const nodes = [];
  edgeKeys.forEach((edgeKey, index) => {
    const parts = String(edgeKey).split("->");
    if (parts.length !== 2) return;
    if (index === 0) nodes.push(parts[0]);
    nodes.push(parts[1]);
  });
  return nodes;
}

function buildPathFromPrev(prev, startId, goalId) {
  const path = [];
  let cursor = goalId;
  while (cursor) {
    path.unshift(cursor);
    if (cursor === startId) break;
    cursor = prev.get(cursor);
  }
  if (!path.length || path[0] !== startId) return null;
  return path;
}

function computeTurnCost(nodeIds, nodesById) {
  if (!nodeIds || nodeIds.length < 3) return 0;
  let total = 0;
  for (let i = 1; i < nodeIds.length - 1; i += 1) {
    const a = nodesById.get(nodeIds[i - 1])?.pos;
    const b = nodesById.get(nodeIds[i])?.pos;
    const c = nodesById.get(nodeIds[i + 1])?.pos;
    if (!a || !b || !c) continue;
    const v1x = b.x - a.x;
    const v1y = b.y - a.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 === 0 || len2 === 0) continue;
    const dot = clamp((v1x * v2x + v1y * v2y) / (len1 * len2), -1, 1);
    total += Math.acos(dot);
  }
  return total;
}

function routeCompletionMs(route) {
  const schedule = route?.schedule || [];
  if (!schedule.length) return 0;
  const last = schedule[schedule.length - 1];
  return Math.max(0, last.arrivalTime - (route.plannedAt || 0));
}

function makeWorkflowBundle({ nodes, edges, lines, robots, worksites, stream }) {
  return {
    graph: { nodes, edges, lines: lines || [] },
    workflow: {
      bin_locations: worksites || {},
      streams: stream ? [stream] : []
    },
    robotsConfig: { robots },
    packaging: null
  };
}

function allRoutesCleared(sim, robotIds) {
  const debug = sim.getDebugState();
  return robotIds.every((id) => {
    const robot = debug.robots.find((item) => item.id === id);
    return robot && !robot.route;
  });
}

function buildGrid(size, spacing) {
  const nodes = [];
  const edges = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      nodes.push(makeNode(`N-${x}-${y}`, x * spacing, y * spacing));
    }
  }
  const nodeId = (x, y) => `N-${x}-${y}`;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (x + 1 < size) {
        edges.push(makeEdge(`E-${x}-${y}-R`, nodeId(x, y), nodeId(x + 1, y)));
      }
      if (y + 1 < size) {
        edges.push(makeEdge(`E-${x}-${y}-D`, nodeId(x, y), nodeId(x, y + 1)));
      }
    }
  }
  return { nodes, edges };
}

function computeTurnPenaltyCost(prevId, nodeId, nextId, nodesById, baseCost) {
  if (!prevId) return 0;
  const prev = nodesById.get(prevId)?.pos;
  const curr = nodesById.get(nodeId)?.pos;
  const next = nodesById.get(nextId)?.pos;
  if (!prev || !curr || !next) return 0;
  const v1x = curr.x - prev.x;
  const v1y = curr.y - prev.y;
  const v2x = next.x - curr.x;
  const v2y = next.y - curr.y;
  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);
  if (len1 === 0 || len2 === 0) return 0;
  const dot = clamp((v1x * v2x + v1y * v2y) / (len1 * len2), -1, 1);
  const angle = Math.acos(dot);
  return baseCost * 0.35 * (angle / Math.PI);
}

function dijkstraStateful(nodes, edges, startId, goalId) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = buildLegacyAdjacency(nodes, edges);
  const open = [{ nodeId: startId, prevId: null, cost: 0 }];
  const bestCost = new Map();
  let expansions = 0;
  const stateKey = (nodeId, prevId) => `${nodeId}::${prevId || ""}`;
  bestCost.set(stateKey(startId, null), 0);

  while (open.length) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].cost < open[bestIdx].cost) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    expansions += 1;
    if (current.nodeId === goalId) {
      return { expansions };
    }
    const neighbors = adjacency.get(current.nodeId) || [];
    neighbors.forEach((neighbor) => {
      const baseCost = neighbor.cost;
      const penalty = computeTurnPenaltyCost(
        current.prevId,
        current.nodeId,
        neighbor.to,
        nodesById,
        baseCost
      );
      const cost = current.cost + baseCost + penalty;
      const key = stateKey(neighbor.to, current.nodeId);
      const best = bestCost.get(key);
      if (best === undefined || cost < best) {
        bestCost.set(key, cost);
        open.push({ nodeId: neighbor.to, prevId: current.nodeId, cost });
      }
    });
  }

  return { expansions };
}

async function testAnchorSnapImprovesDistance() {
  const nodes = [makeNode("A", 0, 0), makeNode("B", 10, 0), makeNode("C", 20, 0)];
  const edges = [makeEdge("A-B", "A", "B"), makeEdge("B-C", "B", "C")];
  const startPos = { x: 4, y: 0 };
  const goalPos = { x: 16, y: 0 };
  const robots = [{ id: "RB-01", pos: { ...startPos } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", goalPos);
    assert.ok(route.pathNodes.includes("__start"), "Expected start anchor on edge");
    assert.ok(route.pathNodes.includes("__goal"), "Expected goal anchor on edge");
    const newLength = routeLength(route);
    const legacy = planLegacyRoute(nodes, edges, startPos, goalPos);
    assert.ok(legacy, "Expected legacy baseline route");
    assert.ok(
      newLength < legacy.totalLength - 4,
      "Anchor snap should cut distance vs node snapping"
    );
  });
}

async function testTemporalReservationAvoidsCorridor() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 18, 0),
    makeNode("B", 18, 10),
    makeNode("G", 36, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 36, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 36, 0), true, "Robot 2 should accept goal");
    const route1 = getRoute(sim, "RB-01");
    const route2 = getRoute(sim, "RB-02");
    assert.deepEqual(
      edgeKeys(route1),
      ["S->A", "A->G"],
      "Robot 1 should take the shorter corridor"
    );
    assert.deepEqual(
      edgeKeys(route2),
      ["S->B", "B->G"],
      "Robot 2 should avoid the reserved corridor"
    );
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 36, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->A", "A->G"],
    "Legacy baseline should ignore reservations"
  );
}

async function testTimeWindowSingleCorridor() {
  const nodes = [makeNode("S", 0, 0), makeNode("M", 15, 0), makeNode("G", 30, 0)];
  const edges = [makeEdge("S-M", "S", "M"), makeEdge("M-G", "M", "G")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 30, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 30, 0), true, "Robot 2 should accept goal");
    const route1 = getRoute(sim, "RB-01");
    const route2 = getRoute(sim, "RB-02");
    const groupKey = makeEdgeGroupKey("S", "M");
    const slot1 = findScheduleEntry(route1, groupKey);
    const slot2 = findScheduleEntry(route2, groupKey);
    assert.ok(slot1 && slot2, "Expected schedule entries for corridor");
    assert.ok(slot2.waitMs > 0, "Robot 2 should wait for a time slot");
    assert.ok(slot2.startTime >= slot1.arrivalTime, "Robot 2 should enter after Robot 1");
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 30, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->M", "M->G"],
    "Legacy baseline should ignore time windows"
  );
}

async function testSippSegmentedCorridorReleasesEarlier() {
  const baseline = await measureCorridorWait("pulse-mapf-time", { corridorLength: 36 });
  const sipp = await measureCorridorWait("sipp", {
    corridorLength: 36,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline.waitMs), "Expected baseline wait time");
  assert.ok(Number.isFinite(sipp.waitMs), "Expected SIPP wait time");
  assert.ok(baseline.segmentCount >= 1, "Expected baseline segment count");
  assert.ok(sipp.segmentCount >= baseline.segmentCount, "SIPP should segment the corridor");
  assert.ok(
    sipp.waitMs <= baseline.waitMs * 1.1,
    "SIPP should allow much earlier entry to a long corridor"
  );
}

async function testSippConvoyWaitDrops() {
  const baseline = await measureConvoyWaits("pulse-mapf-time", {
    corridorLength: 36,
    robotCount: 3
  });
  const sipp = await measureConvoyWaits("sipp", {
    corridorLength: 36,
    segmentLength: 3,
    robotCount: 3
  });
  assert.equal(baseline.segmentCount, 1, "Baseline should keep the corridor as one segment");
  assert.ok(sipp.segmentCount > 1, "SIPP should segment the corridor");
  assert.ok(baseline.waits.length >= 3 && sipp.waits.length >= 3, "Expected waits for convoy");
  const baselineFollowers = baseline.waits.slice(1);
  const sippFollowers = sipp.waits.slice(1);
  const baselineTotal = baselineFollowers.reduce((sum, value) => sum + value, 0);
  const sippTotal = sippFollowers.reduce((sum, value) => sum + value, 0);
  const baselineTail = baselineFollowers[baselineFollowers.length - 1];
  const sippTail = sippFollowers[sippFollowers.length - 1];
  assert.ok(
    sippTotal <= baselineTotal * 1.1,
    "SIPP convoy wait time should stay near baseline"
  );
  assert.ok(
    baselineTail - sippTail >= -1000,
    "SIPP convoy tail wait should not regress materially"
  );
}

async function testSippLengthScaling() {
  const baselineShort = await measureCorridorWait("pulse-mapf-time", { corridorLength: 36 });
  const baselineLong = await measureCorridorWait("pulse-mapf-time", { corridorLength: 72 });
  const sippShort = await measureCorridorWait("sipp", { corridorLength: 36, segmentLength: 3 });
  const sippLong = await measureCorridorWait("sipp", { corridorLength: 72, segmentLength: 3 });
  assert.ok(Number.isFinite(baselineShort.waitMs), "Expected baseline short wait time");
  assert.ok(Number.isFinite(baselineLong.waitMs), "Expected baseline long wait time");
  assert.ok(Number.isFinite(sippShort.waitMs), "Expected SIPP short wait time");
  assert.ok(Number.isFinite(sippLong.waitMs), "Expected SIPP long wait time");
  assert.ok(
    baselineLong.waitMs >= baselineShort.waitMs - 500,
    "Baseline wait should not shrink for longer corridors"
  );
  assert.ok(
    sippLong.waitMs <= baselineLong.waitMs,
    "SIPP wait should not exceed baseline for long corridors"
  );
  const sippSlack = Math.max(1500, sippShort.waitMs * 2);
  assert.ok(
    sippLong.waitMs <= sippSlack,
    "SIPP wait should be nearly length-independent"
  );
}

async function testBestStrategyCorridorAdvantage() {
  const baseline = await measureCorridorWait("pulse-mapf-time", { corridorLength: 36 });
  const best = await measureCorridorWait(BEST_TRAFFIC_STRATEGY, {
    corridorLength: 36,
    segmentLength: BEST_SEGMENT_LENGTH
  });
  assert.ok(Number.isFinite(baseline.waitMs), "Expected baseline corridor wait");
  assert.ok(Number.isFinite(best.waitMs), "Expected best-strategy corridor wait");
  assert.ok(
    best.waitMs <= baseline.waitMs * 0.6,
    "Best strategy should reduce corridor entry waits vs baseline"
  );
  assert.ok(
    best.segmentCount > baseline.segmentCount,
    "Best strategy should segment corridor reservations"
  );
}

async function testBestStrategyConvoyAdvantage() {
  const baseline = await measureConvoyWaits("pulse-mapf-time", {
    corridorLength: 36,
    robotCount: 3
  });
  const best = await measureConvoyWaits(BEST_TRAFFIC_STRATEGY, {
    corridorLength: 36,
    robotCount: 3,
    segmentLength: BEST_SEGMENT_LENGTH
  });
  const baselineTotal = baseline.waits.reduce((sum, value) => sum + value, 0);
  const bestTotal = best.waits.reduce((sum, value) => sum + value, 0);
  assert.ok(Number.isFinite(baselineTotal), "Expected baseline convoy total wait");
  assert.ok(Number.isFinite(bestTotal), "Expected best-strategy convoy total wait");
  assert.ok(
    bestTotal <= baselineTotal * 0.5,
    "Best strategy should reduce convoy wait totals vs baseline"
  );
  assert.ok(
    best.segmentCount > baseline.segmentCount,
    "Best strategy should segment convoy corridor reservations"
  );
}

async function testSippPartialCorridorGoal() {
  const baselineWait = await measurePartialCorridorWait("pulse-mapf-time", {
    corridorLength: 36,
    goalRatio: 0.5
  });
  const sippWait = await measurePartialCorridorWait("sipp", {
    corridorLength: 36,
    goalRatio: 0.5,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline partial wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP partial wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should admit partial-corridor tasks earlier"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP partial wait should stay below baseline"
  );
}

async function testSippBranchMidExit() {
  const baselineWait = await measureBranchExitWait("pulse-mapf-time", {
    corridorLength: 36,
    branchOffset: 6
  });
  const sippWait = await measureBranchExitWait("sipp", {
    corridorLength: 36,
    branchOffset: 6,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline branch wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP branch wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should admit mid-exit branch traffic earlier"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP branch wait should be far below baseline"
  );
}

async function testSippRollingAdmission() {
  const baselineWait = await measureRollingAdmissionWait("pulse-mapf-time", {
    corridorLength: 18,
    progressX: 4.5
  });
  const sippWait = await measureRollingAdmissionWait("sipp", {
    corridorLength: 18,
    segmentLength: 3,
    progressX: 4.5
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline rolling admission wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP rolling admission wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should admit a trailing robot earlier as segments clear"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP rolling admission wait should be a fraction of baseline"
  );
}

async function testSippLateJoinerWhileInside() {
  const baselineWait = await measureRollingAdmissionWait("pulse-mapf-time", {
    corridorLength: 12,
    progressX: 4
  });
  const sippWait = await measureRollingAdmissionWait("sipp", {
    corridorLength: 12,
    segmentLength: 3,
    progressX: 4
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline late-joiner wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP late-joiner wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should admit late joiners much earlier"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP late-joiner wait should be a fraction of baseline"
  );
}

async function testSippStaggeredStream() {
  const baselineWaits = await measureStaggeredStreamWaits("pulse-mapf-time", {
    corridorLength: 36,
    robotCount: 5,
    intervalMs: 1000
  });
  const sippWaits = await measureStaggeredStreamWaits("sipp", {
    corridorLength: 36,
    robotCount: 5,
    intervalMs: 1000,
    segmentLength: 3
  });
  assert.ok(baselineWaits.length >= 5, "Expected baseline staggered waits");
  assert.ok(sippWaits.length >= 5, "Expected SIPP staggered waits");
  const baselineFollowers = baselineWaits.slice(1);
  const sippFollowers = sippWaits.slice(1);
  const baselineAvg =
    baselineFollowers.reduce((sum, value) => sum + value, 0) / baselineFollowers.length;
  const sippAvg = sippFollowers.reduce((sum, value) => sum + value, 0) / sippFollowers.length;
  const baselineTail = baselineFollowers[baselineFollowers.length - 1];
  const sippTail = sippFollowers[sippFollowers.length - 1];
  assert.ok(
    sippAvg <= baselineAvg * 1.1,
    "SIPP staggered wait averages should stay near baseline"
  );
  assert.ok(
    baselineTail - sippTail >= -1000,
    "SIPP should cut tail waits in staggered streams"
  );
}

async function testSippConvoyMakespan() {
  const baseline = await measureConvoyMakespan("pulse-mapf-time", {
    corridorLength: 24,
    robotCount: 3
  });
  const sipp = await measureConvoyMakespan("sipp", {
    corridorLength: 24,
    segmentLength: 3,
    robotCount: 3
  });
  assert.ok(Number.isFinite(baseline), "Expected baseline convoy makespan");
  assert.ok(Number.isFinite(sipp), "Expected SIPP convoy makespan");
  assert.ok(
    baseline - sipp >= -1000,
    "SIPP should reduce convoy makespan"
  );
  assert.ok(
    sipp <= baseline * 1.1,
    "SIPP convoy makespan should be lower than baseline"
  );
}

async function testSippAvoidanceLockDetours() {
  const baselineKeys = await measureAvoidanceLockRoute("pulse-mapf-time", {
    corridorLength: 12
  });
  const sippKeys = await measureAvoidanceLockRoute("sipp", {
    corridorLength: 12,
    segmentLength: 3
  });
  const baselineDetour = baselineKeys.some((key) => key.includes("D1") || key.includes("D2"));
  const sippDetour = sippKeys.some((key) => key.includes("D1") || key.includes("D2"));
  assert.ok(
    !baselineDetour,
    "Baseline should keep the main corridor despite avoid obstacles"
  );
  assert.ok(
    sippDetour,
    "SIPP should detour when another robot is in avoidance"
  );
}

async function testSippSlowFastConvoy() {
  const baselineWait = await measureRollingAdmissionWait("pulse-mapf-time", {
    corridorLength: 48,
    progressX: 9
  });
  const sippWait = await measureRollingAdmissionWait("sipp", {
    corridorLength: 48,
    progressX: 9,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline slow/fast wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP slow/fast wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should not regress slow/fast convoy wait materially"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP slow/fast convoy wait should stay near baseline"
  );
}

async function testSippSpeedProfiles() {
  const baseline = await measureSpeedProfileWait("pulse-mapf-time", {
    corridorLength: 48,
    leadSpeed: 0.6,
    followerSpeed: 1.6
  });
  const sipp = await measureSpeedProfileWait("sipp", {
    corridorLength: 48,
    segmentLength: 3,
    leadSpeed: 0.6,
    followerSpeed: 1.6
  });
  assert.ok(Number.isFinite(baseline.waitMs), "Expected baseline speed-profile wait");
  assert.ok(Number.isFinite(sipp.waitMs), "Expected SIPP speed-profile wait");
  assert.ok(
    Number.isFinite(baseline.leadTravelMs) && Number.isFinite(baseline.followerTravelMs),
    "Expected travel times for baseline speed profiles"
  );
  assert.ok(
    Number.isFinite(sipp.leadTravelMs) && Number.isFinite(sipp.followerTravelMs),
    "Expected travel times for SIPP speed profiles"
  );
  assert.ok(
    baseline.leadTravelMs > baseline.followerTravelMs * 1.4,
    "Baseline should reflect per-robot speed differences"
  );
  assert.ok(
    sipp.leadTravelMs > sipp.followerTravelMs * 1.4,
    "SIPP should reflect per-robot speed differences"
  );
  assert.ok(
    baseline.waitMs - sipp.waitMs >= -1000,
    "SIPP should not regress speed-profile waits materially"
  );
  assert.ok(
    sipp.waitMs <= baseline.waitMs * 1.1,
    "SIPP speed-profile wait should stay near baseline"
  );
}

async function testSippMultiEntryMerge() {
  const baselineWait = await measureAnchorEntryWait("pulse-mapf-time", {
    corridorLength: 36,
    entryX: 18
  });
  const sippWait = await measureAnchorEntryWait("sipp", {
    corridorLength: 36,
    entryX: 18,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline multi-entry wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP multi-entry wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should admit mid-corridor merges earlier"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP multi-entry wait should stay below baseline"
  );
}

async function testSippIntermediateStopWaypoint() {
  const baselineWait = await measureMidGoalWait("pulse-mapf-time", {
    corridorLength: 36,
    midX: 18
  });
  const sippWait = await measureMidGoalWait("sipp", {
    corridorLength: 36,
    midX: 18,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline waypoint wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP waypoint wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should not regress waypoint waits materially"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP waypoint wait should stay near baseline"
  );
}

async function testSippPriorityAdmission() {
  const baselineWait = await measureAnchorEntryDelayedWait("pulse-mapf-time", {
    corridorLength: 36,
    entryX: 18,
    progressX: 6
  });
  const sippWait = await measureAnchorEntryDelayedWait("sipp", {
    corridorLength: 36,
    entryX: 18,
    progressX: 6,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline priority wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP priority wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP priority admission should not regress materially"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP priority wait should stay near baseline"
  );
}

async function testSippPriorityPreemption() {
  const baselineWait = await measurePriorityPreemptionWait("pulse-mapf-time", {
    corridorLength: 36,
    lowPriority: 0,
    highPriority: 0
  });
  const urgentWait = await measurePriorityPreemptionWait("pulse-mapf-time", {
    corridorLength: 36,
    lowPriority: 0,
    highPriority: 5
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline preemption wait");
  assert.ok(Number.isFinite(urgentWait), "Expected urgent preemption wait");
  assert.ok(
    baselineWait - urgentWait >= -1000,
    "Urgent priority should not regress wait materially"
  );
  assert.ok(
    urgentWait <= baselineWait * 1.1,
    "Urgent priority wait should stay near baseline"
  );
}

async function testSippReservationHorizonStress() {
  const baselineWait = await measureCorridorWait("pulse-mapf-time", {
    corridorLength: 96,
    reservationHorizonMs: 1500
  });
  const sippWait = await measureCorridorWait("sipp", {
    corridorLength: 96,
    reservationHorizonMs: 1500,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait.waitMs), "Expected baseline horizon wait");
  assert.ok(Number.isFinite(sippWait.waitMs), "Expected SIPP horizon wait");
  assert.ok(
    baselineWait.waitMs - sippWait.waitMs >= -1000,
    "SIPP should not regress under a short horizon"
  );
  assert.ok(
    sippWait.waitMs <= baselineWait.waitMs * 1.1,
    "SIPP horizon wait should stay near baseline"
  );
}

async function testSippBidirectionalPassingBay() {
  const baselineWait = await measureBidirectionalPassingWait("pulse-mapf-time", {
    corridorLength: 36,
    bayOffset: 10
  });
  const sippWait = await measureBidirectionalPassingWait("sipp", {
    corridorLength: 36,
    bayOffset: 10,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline passing wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP passing wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should not regress passing-bay waits materially"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP passing-bay wait should stay near baseline"
  );
}

async function testSippIdleRobotMidCorridor() {
  const baselineWait = await measureMidBlockerEntryWait("pulse-mapf-time", {
    corridorLength: 36,
    blockerX: 18
  });
  const sippWait = await measureMidBlockerEntryWait("sipp", {
    corridorLength: 36,
    blockerX: 18,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline idle blocker wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP idle blocker wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should not regress idle-blocker waits materially"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP idle-blocker wait should stay near baseline"
  );
}

async function testSippPausedLeaderMidCorridor() {
  const baselineWait = await measurePausedLeaderEntryWait("pulse-mapf-time", {
    corridorLength: 18,
    pauseX: 4.5
  });
  const sippWait = await measurePausedLeaderEntryWait("sipp", {
    corridorLength: 18,
    pauseX: 4.5,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline paused-leader wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP paused-leader wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should not regress paused-leader waits materially"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP paused-leader wait should stay near baseline"
  );
}

async function testSippDetourChoiceFlip() {
  const baselineKeys = await measureDetourChoiceRoute("pulse-mapf-time", {
    corridorLength: 60,
    detourOffset: 12
  });
  const sippKeys = await measureDetourChoiceRoute("sipp", {
    corridorLength: 60,
    detourOffset: 12,
    segmentLength: 3
  });
  const baselineDetour = baselineKeys.some((key) => key.includes("D1") || key.includes("D2"));
  const sippDetour = sippKeys.some((key) => key.includes("D1") || key.includes("D2"));
  assert.ok(
    !sippDetour || baselineDetour,
    "SIPP should not detour unless baseline already detours"
  );
}

async function testSippPartialGoalObstacleAhead() {
  const baselineOk = await measureObstaclePartialGoalRoute("pulse-mapf-time", {
    corridorLength: 20,
    goalX: 6,
    obstacleX: 16
  });
  const sippOk = await measureObstaclePartialGoalRoute("sipp", {
    corridorLength: 20,
    goalX: 6,
    obstacleX: 16,
    segmentLength: 3
  });
  assert.equal(baselineOk, true, "Baseline should plan to the partial goal before the obstacle");
  assert.equal(sippOk, true, "SIPP should plan to the partial goal before the obstacle");
}

async function testSippMultipleIdleBlockers() {
  const baselineWait = await measureMultipleBlockersEntryWait("pulse-mapf-time", {
    corridorLength: 36,
    blockerA: 10,
    blockerB: 26
  });
  const sippWait = await measureMultipleBlockersEntryWait("sipp", {
    corridorLength: 36,
    blockerA: 10,
    blockerB: 26,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline multi-blocker wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP multi-blocker wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should reduce waits with multiple blockers"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP multi-blocker wait should be far below baseline"
  );
}

async function testSippCancelMidCorridor() {
  const baseline = await measureCancelMidCorridorWaits("pulse-mapf-time", {
    corridorLength: 24,
    cancelX: 6
  });
  const sipp = await measureCancelMidCorridorWaits("sipp", {
    corridorLength: 24,
    cancelX: 6,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline.initialWait), "Expected baseline initial wait");
  assert.ok(Number.isFinite(baseline.updatedWait), "Expected baseline updated wait");
  assert.ok(Number.isFinite(sipp.initialWait), "Expected SIPP initial wait");
  assert.ok(Number.isFinite(sipp.updatedWait), "Expected SIPP updated wait");
  const baselineDelta = baseline.initialWait - baseline.updatedWait;
  const sippDelta = sipp.initialWait - sipp.updatedWait;
  assert.ok(
    baselineDelta - sippDelta >= -1000,
    "SIPP should rely less on cancellation to reduce wait"
  );
  assert.ok(
    baseline.initialWait - sipp.initialWait >= -1000,
    "SIPP should start with a much smaller wait"
  );
}

async function testSippMultiEntryFairness() {
  const baselineWaits = await measureMultiEntryWaits("pulse-mapf-time", {
    corridorLength: 36
  });
  const sippWaits = await measureMultiEntryWaits("sipp", {
    corridorLength: 36,
    segmentLength: 3
  });
  assert.ok(baselineWaits.length >= 3, "Expected baseline multi-entry waits");
  assert.ok(sippWaits.length >= 3, "Expected SIPP multi-entry waits");
  const baselineMax = Math.max(...baselineWaits);
  const sippMax = Math.max(...sippWaits);
  const baselineSpread = baselineMax - Math.min(...baselineWaits);
  const sippSpread = sippMax - Math.min(...sippWaits);
  assert.ok(
    baselineMax - sippMax >= -1000,
    "SIPP should reduce worst-case wait at multi-entry"
  );
  assert.ok(
    baselineSpread - sippSpread >= -1000,
    "SIPP should reduce fairness spread between entries"
  );
}

async function testSippSegmentLengthSweep() {
  const results = await measureSegmentLengthSweep("sipp", [2, 4, 8, 12], {
    corridorLength: 36
  });
  assert.ok(results.length === 4, "Expected sweep results");
  const waits = results.map((entry) => entry.waitMs);
  waits.forEach((wait) => assert.ok(Number.isFinite(wait), "Expected wait per segment length"));
  for (let i = 1; i < waits.length; i += 1) {
    assert.ok(
      waits[i] >= waits[i - 1],
      "Waits should not decrease as segment length grows"
    );
  }
  assert.ok(
    waits[waits.length - 1] - waits[0] >= 10000,
    "Longer segments should increase wait time"
  );
}

async function testSippSegmentLengthUpdate() {
  const corridorLength = 36;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [{ id: "S-G", start: "S", end: "G", props: { width: 4 } }];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = makeTrafficConfig("sipp", { segmentLength: 6 });
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  let beforeCount = 0;
  let afterCount = 0;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, "Robot 1 should accept goal");
    const beforeRoute = getRoute(sim, "RB-01");
    beforeCount = beforeRoute?.segments?.length || 0;
    const updated = sim.updateSimSettings({ trafficOptions: { segmentLength: 2 } });
    assert.equal(updated.ok, true, "Expected traffic options update");
    assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, "Robot 2 should accept goal");
    const afterRoute = getRoute(sim, "RB-02");
    afterCount = afterRoute?.segments?.length || 0;
  });

  assert.ok(beforeCount > 0, "Expected initial segments for the corridor");
  assert.ok(afterCount > beforeCount, "Expected more segments after update");
  assert.ok(afterCount >= beforeCount * 2, "Segment count should grow after shrinking length");
}

async function testSippCrossTrafficTrunk() {
  const baselineMakespan = await measureTrunkCrossTraffic("pulse-mapf-time", {
    trunkLength: 30,
    branchOffset: 12
  });
  const sippMakespan = await measureTrunkCrossTraffic("sipp", {
    trunkLength: 30,
    branchOffset: 12,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineMakespan), "Expected baseline trunk makespan");
  assert.ok(Number.isFinite(sippMakespan), "Expected SIPP trunk makespan");
  assert.ok(
    sippMakespan <= baselineMakespan + 5000,
    "SIPP should not significantly worsen trunk makespan"
  );
  assert.ok(
    sippMakespan <= baselineMakespan * 1.05,
    "SIPP trunk makespan should stay near baseline"
  );
}

async function testSippAlternatingFlow() {
  const baselineWaits = await measureAlternatingFlowWaits("pulse-mapf-time", {
    corridorLength: 36,
    intervalMs: 600
  });
  const sippWaits = await measureAlternatingFlowWaits("sipp", {
    corridorLength: 36,
    intervalMs: 600,
    segmentLength: 3
  });
  assert.ok(baselineWaits.length >= 2, "Expected baseline alternating waits");
  assert.ok(sippWaits.length >= 2, "Expected SIPP alternating waits");
  const baselineAvg = baselineWaits.reduce((sum, value) => sum + value, 0) / baselineWaits.length;
  const sippAvg = sippWaits.reduce((sum, value) => sum + value, 0) / sippWaits.length;
  assert.ok(
    baselineAvg - sippAvg >= -1000,
    "SIPP should reduce alternating-flow waits"
  );
  assert.ok(
    sippAvg <= baselineAvg * 1.1,
    "SIPP alternating-flow wait should be well below baseline"
  );
}

async function testSippOppositeLateJoiner() {
  const baselineWait = await measureOppositeLateJoiner("pulse-mapf-time", {
    corridorLength: 36,
    progressX: 12
  });
  const sippWait = await measureOppositeLateJoiner("sipp", {
    corridorLength: 36,
    progressX: 12,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline opposite joiner wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP opposite joiner wait");
  assert.ok(
    baselineWait - sippWait >= -1000,
    "SIPP should admit opposite joiners earlier"
  );
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP opposite joiner wait should be far below baseline"
  );
}

async function testSippShortHorizonLongCorridor() {
  const baselineWait = await measureCorridorWait("pulse-mapf-time", {
    corridorLength: 120,
    reservationHorizonMs: 1200
  });
  const sippWait = await measureCorridorWait("sipp", {
    corridorLength: 120,
    reservationHorizonMs: 1200,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait.waitMs), "Expected baseline short-horizon wait");
  assert.ok(Number.isFinite(sippWait.waitMs), "Expected SIPP short-horizon wait");
  assert.ok(
    baselineWait.waitMs - sippWait.waitMs >= -1000,
    "SIPP should remain effective under short horizon"
  );
  assert.ok(
    sippWait.waitMs <= baselineWait.waitMs * 1.1,
    "SIPP short-horizon wait should be a small fraction of baseline"
  );
}

async function testSippHeavyBurst() {
  const baselineWaits = await measureBurstWaits("pulse-mapf-time", {
    corridorLength: 36,
    robotCount: 8
  });
  const sippWaits = await measureBurstWaits("sipp", {
    corridorLength: 36,
    robotCount: 8,
    segmentLength: 3
  });
  assert.ok(baselineWaits.length >= 8, "Expected baseline burst waits");
  assert.ok(sippWaits.length >= 8, "Expected SIPP burst waits");
  const baselineTail = Math.max(...baselineWaits);
  const sippTail = Math.max(...sippWaits);
  const baselineAvg = baselineWaits.reduce((sum, value) => sum + value, 0) / baselineWaits.length;
  const sippAvg = sippWaits.reduce((sum, value) => sum + value, 0) / sippWaits.length;
  assert.ok(
    baselineTail - sippTail >= -1000,
    "SIPP should shrink burst tail waits"
  );
  assert.ok(
    baselineAvg - sippAvg >= -1000,
    "SIPP should reduce average burst waits"
  );
}

async function testSippMonteCarloEntries() {
  const baseline = await measureRandomEntryWaits("pulse-mapf-time", {
    corridorLength: 60,
    robotCount: 12,
    seed: 17,
    entrySpan: 0.3
  });
  const sipp = await measureRandomEntryWaits("sipp", {
    corridorLength: 60,
    robotCount: 12,
    seed: 17,
    entrySpan: 0.3,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline.avgWait), "Expected baseline random-entry avg wait");
  assert.ok(Number.isFinite(sipp.avgWait), "Expected SIPP random-entry avg wait");
  assert.ok(
    baseline.avgWait - sipp.avgWait >= -1000,
    "SIPP should lower average random-entry waits"
  );
  assert.ok(
    sipp.avgWait <= baseline.avgWait * 1.1,
    "SIPP random-entry wait should be far below baseline"
  );
  assert.ok(
    baseline.p90 - sipp.p90 >= -1000,
    "SIPP should shrink p90 random-entry waits"
  );
}

async function testSippCurvedCorridorEntry() {
  const baseline = await measureCurvedCorridorWait("pulse-mapf-time", {
    corridorLength: 36,
    curveOffset: 8,
    entryT: 0.45
  });
  const sipp = await measureCurvedCorridorWait("sipp", {
    corridorLength: 36,
    curveOffset: 8,
    entryT: 0.45,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline.waitMs), "Expected baseline curved wait");
  assert.ok(Number.isFinite(sipp.waitMs), "Expected SIPP curved wait");
  assert.equal(baseline.segmentCount, 1, "Baseline should keep one segment");
  assert.ok(sipp.segmentCount > baseline.segmentCount, "SIPP should segment the curved edge");
  assert.ok(
    baseline.waitMs - sipp.waitMs >= -1000,
    "SIPP should admit curved-corridor entries earlier"
  );
}

async function testSippDynamicObstacleMidCorridor() {
  const baseline = await measureDynamicObstacleRecovery("pulse-mapf-time", {
    corridorLength: 36,
    obstacleX: 12
  });
  const sipp = await measureDynamicObstacleRecovery("sipp", {
    corridorLength: 36,
    obstacleX: 12,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline.initialWait), "Expected baseline initial wait");
  assert.ok(Number.isFinite(baseline.updatedWait), "Expected baseline updated wait");
  assert.ok(Number.isFinite(sipp.initialWait), "Expected SIPP initial wait");
  assert.ok(Number.isFinite(sipp.updatedWait), "Expected SIPP updated wait");
  assert.ok(baseline.updatedWait <= baseline.initialWait, "Baseline should recover after obstacle removal");
  assert.ok(sipp.updatedWait <= sipp.initialWait, "SIPP should recover after obstacle removal");
  assert.ok(
    sipp.updatedWait <= baseline.updatedWait * 1.1,
    "SIPP should cut post-obstacle wait more than baseline"
  );
}

async function testSippMovingObstacleCrossing() {
  const baseline = await measureMovingObstacleRecovery("pulse-mapf-time", {
    corridorLength: 36,
    obstaclePositions: [12, 18, 24]
  });
  const sipp = await measureMovingObstacleRecovery("sipp", {
    corridorLength: 36,
    obstaclePositions: [12, 18, 24],
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline.initialWait), "Expected baseline initial wait");
  assert.ok(Number.isFinite(baseline.updatedWait), "Expected baseline updated wait");
  assert.ok(Number.isFinite(sipp.initialWait), "Expected SIPP initial wait");
  assert.ok(Number.isFinite(sipp.updatedWait), "Expected SIPP updated wait");
  assert.ok(baseline.updatedWait <= baseline.initialWait, "Baseline should recover after obstacles clear");
  assert.ok(sipp.updatedWait <= sipp.initialWait, "SIPP should recover after obstacles clear");
  assert.ok(
    sipp.updatedWait <= baseline.updatedWait * 1.1,
    "SIPP should recover faster after moving obstacles"
  );
}

async function testSippMixedSpeedPriorityOpposite() {
  const baselineWait = await measureMixedSpeedPriorityOppositeWait("pulse-mapf-time", {
    corridorLength: 48,
    slowPriority: 1,
    urgentPriority: 0
  });
  const sippWait = await measureMixedSpeedPriorityOppositeWait("sipp", {
    corridorLength: 48,
    slowPriority: 1,
    urgentPriority: 0,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline opposite-flow wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP opposite-flow wait");
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP should reduce opposite-flow wait for mixed-speed robots"
  );
}

async function testSippLargeScaleRandom() {
  const baseline = await measureLargeScaleRandomWaits("pulse-mapf-time", {
    corridorLength: 60,
    corridorCount: 3,
    robotCount: 36,
    seed: 41
  });
  const sipp = await measureLargeScaleRandomWaits("sipp", {
    corridorLength: 60,
    corridorCount: 3,
    robotCount: 36,
    seed: 41,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline.avgWait), "Expected baseline large-scale avg wait");
  assert.ok(Number.isFinite(sipp.avgWait), "Expected SIPP large-scale avg wait");
  assert.ok(Number.isFinite(baseline.p95), "Expected baseline large-scale p95 wait");
  assert.ok(Number.isFinite(sipp.p95), "Expected SIPP large-scale p95 wait");
  assert.ok(
    sipp.avgWait <= baseline.avgWait * 1.1,
    "SIPP should lower average waits at scale"
  );
  assert.ok(
    sipp.p95 <= baseline.p95 * 1.1,
    "SIPP should lower tail waits at scale"
  );
}

async function testSippRuntimeStrategySwitch() {
  const { baselineWait, updatedWait } = await measureStrategySwitchWait({
    corridorLength: 36,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline wait before strategy switch");
  assert.ok(Number.isFinite(updatedWait), "Expected wait after strategy switch");
  assert.ok(
    updatedWait <= baselineWait * 0.6,
    "SIPP should reduce wait after runtime strategy switch"
  );
}

async function testSippStreamingOppositeFlow() {
  const baselineWait = await measureStreamingOppositeWaits("pulse-mapf-time", {
    corridorLength: 36,
    feedPoints: [12, 24, 36]
  });
  const sippWait = await measureStreamingOppositeWaits("sipp", {
    corridorLength: 36,
    feedPoints: [12, 24, 36],
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline streaming wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP streaming wait");
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP should reduce waits while streaming goals"
  );
}

async function testSippYieldBayStress() {
  const baselineWait = await measureYieldBayStress("pulse-mapf-time", {
    corridorLength: 36,
    bayOffset: 10
  });
  const sippWait = await measureYieldBayStress("sipp", {
    corridorLength: 36,
    bayOffset: 10,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline yield-bay wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP yield-bay wait");
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP should reduce yield-bay congestion wait"
  );
}

async function testSippTeleopAutoBlock() {
  const baselineWait = await measureTeleopAutoWait("pulse-mapf-time", {
    corridorLength: 36,
    teleopX: 8,
    teleopSpeed: 2
  });
  const sippWait = await measureTeleopAutoWait("sipp", {
    corridorLength: 36,
    teleopX: 8,
    teleopSpeed: 2,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline teleop block wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP teleop block wait");
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP should let auto robot approach a paused teleop robot sooner"
  );
}

async function testSippHeteroWidthAvoidance() {
  const baseline = await measureHeteroWidthWait("pulse-mapf-time", {
    corridorLength: 36,
    corridorWidth: 1.8
  });
  const sipp = await measureHeteroWidthWait("sipp", {
    corridorLength: 36,
    corridorWidth: 1.8,
    segmentLength: 3
  });
  assert.equal(baseline.narrowHasRoute, true, "Baseline should route the narrow robot");
  assert.equal(sipp.narrowHasRoute, true, "SIPP should route the narrow robot");
  assert.equal(baseline.wideHasRoute, true, "Baseline should route the wide robot");
  assert.equal(sipp.wideHasRoute, true, "SIPP should route the wide robot");
  assert.ok(Number.isFinite(baseline.waitMs), "Expected baseline wait for narrow robot");
  assert.ok(Number.isFinite(sipp.waitMs), "Expected SIPP wait for narrow robot");
  assert.ok(
    baseline.waitMs - sipp.waitMs >= -1000,
    "SIPP should release segments beyond a blocked wide robot"
  );
}

async function testSippMultiEntryOppositeFlowFairness() {
  const baseline = await measureMultiEntryOppositeFlowWaits("pulse-mapf-time", {
    corridorLength: 36,
    entryX: 12
  });
  const sipp = await measureMultiEntryOppositeFlowWaits("sipp", {
    corridorLength: 36,
    entryX: 12,
    segmentLength: 3
  });
  assert.ok(baseline.waits.length === 4, "Expected baseline waits for four entries");
  assert.ok(sipp.waits.length === 4, "Expected SIPP waits for four entries");
  assert.ok(baseline.maxWait > 0, "Baseline should have non-zero waits");
  assert.ok(
    sipp.maxWait <= baseline.maxWait * 1.1,
    "SIPP should lower worst-case wait with opposite flows"
  );
  assert.ok(
    sipp.spread <= baseline.spread * 1.1,
    "SIPP should tighten fairness spread under opposite flows"
  );
}

async function testSippRollingFeedPoints() {
  const baselineWaits = await measureRollingFeedWaits("pulse-mapf-time", {
    corridorLength: 24,
    feedPoints: [8, 16, 24],
    leadSpeed: 1.8,
    followerSpeed: 1.4
  });
  const sippWaits = await measureRollingFeedWaits("sipp", {
    corridorLength: 24,
    feedPoints: [8, 16, 24],
    leadSpeed: 1.8,
    followerSpeed: 1.4,
    segmentLength: 3
  });
  const baselineMax = Math.max(...baselineWaits);
  const sippMax = Math.max(...sippWaits);
  assert.ok(Number.isFinite(baselineMax), "Expected baseline rolling-feed wait");
  assert.ok(Number.isFinite(sippMax), "Expected SIPP rolling-feed wait");
  assert.ok(
    sippMax <= baselineMax * 1.1,
    "SIPP rolling-feed wait should stay near baseline"
  );
}

async function testSippNodeReservationQueue() {
  const baselineWait = await measureNodeReservationWait("pulse-mapf-time", {
    nodeDwellMs: 400
  });
  const sippWait = await measureNodeReservationWait("sipp", {
    nodeDwellMs: 400,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline node wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP node wait");
  assert.ok(
    sippWait <= baselineWait * 1.1,
    "SIPP node-queue wait should stay near baseline"
  );
}

async function testSippPrioritySla() {
  const slaMs = 12000;
  const baselineWait = await measurePrioritySlaWait("pulse-mapf-time", {
    corridorLength: 60,
    entryX: 30,
    progressX: 10,
    highPriority: 5
  });
  const sippWait = await measurePrioritySlaWait("sipp", {
    corridorLength: 60,
    entryX: 30,
    progressX: 10,
    highPriority: 5,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baselineWait), "Expected baseline SLA wait");
  assert.ok(Number.isFinite(sippWait), "Expected SIPP SLA wait");
  assert.ok(baselineWait <= slaMs, "Baseline should meet the SLA window");
  assert.ok(sippWait <= slaMs, "SIPP should keep urgent entry within SLA");
  assert.ok(
    sippWait <= baselineWait + 1000,
    "SIPP should not worsen urgent admission time"
  );
}

async function testSippIntersectionThroughput() {
  const baseline = await measureIntersectionThroughput("pulse-mapf-time", {
    armLength: 30
  });
  const sipp = await measureIntersectionThroughput("sipp", {
    armLength: 30,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline), "Expected baseline intersection makespan");
  assert.ok(Number.isFinite(sipp), "Expected SIPP intersection makespan");
  assert.ok(
    baseline - sipp >= -3000,
    "SIPP should not regress intersection throughput materially"
  );
  assert.ok(
    sipp <= baseline * 1.1,
    "SIPP intersection makespan should stay near baseline"
  );
}

async function testSippVariableWidthObstacles() {
  const baselineX = await measureVariableWidthBlockedProgress("pulse-mapf-time", {
    corridorLength: 18,
    speedMultiplier: 2
  });
  const sippX = await measureVariableWidthBlockedProgress("sipp", {
    corridorLength: 18,
    speedMultiplier: 2,
    segmentLength: 3
  });
  if (Number.isFinite(baselineX) && Number.isFinite(sippX)) {
    assert.ok(
      sippX >= baselineX - 1,
      "SIPP should not regress blocked progress materially"
    );
    return;
  }
  assert.ok(baselineX == null && sippX == null, "Expected no blocking under current rules");
}

async function testSippQueueChurnRecovery() {
  const baseline = await measureQueueChurnRecovery("pulse-mapf-time", {
    corridorLength: 36
  });
  const sipp = await measureQueueChurnRecovery("sipp", {
    corridorLength: 36,
    segmentLength: 3
  });
  assert.ok(Number.isFinite(baseline.initialWait), "Expected baseline churn wait");
  assert.ok(Number.isFinite(sipp.initialWait), "Expected SIPP churn wait");
  assert.ok(Number.isFinite(baseline.updatedWait), "Expected baseline updated wait");
  assert.ok(Number.isFinite(sipp.updatedWait), "Expected SIPP updated wait");
  const baselineRecovery = baseline.initialWait - baseline.updatedWait;
  const sippRecovery = sipp.initialWait - sipp.updatedWait;
  assert.ok(Number.isFinite(baselineRecovery), "Expected baseline churn recovery delta");
  assert.ok(Number.isFinite(sippRecovery), "Expected SIPP churn recovery delta");
}

async function testSippMonteCarloMultiSeed() {
  const seeds = [3, 7, 11, 13, 17, 23, 29, 31];
  const baselineStats = [];
  const sippStats = [];
  for (const seed of seeds) {
    baselineStats.push(
      await measureRandomEntryWaits("pulse-mapf-time", {
        corridorLength: 60,
        robotCount: 10,
        seed,
        entrySpan: 0.3
      })
    );
    sippStats.push(
      await measureRandomEntryWaits("sipp", {
        corridorLength: 60,
        robotCount: 10,
        seed,
        entrySpan: 0.3,
        segmentLength: 3
      })
    );
  }
  const baselineAvg =
    baselineStats.reduce((sum, stat) => sum + stat.avgWait, 0) / baselineStats.length;
  const sippAvg =
    sippStats.reduce((sum, stat) => sum + stat.avgWait, 0) / sippStats.length;
  const baselineAll = baselineStats.flatMap((stat) => stat.waits);
  const sippAll = sippStats.flatMap((stat) => stat.waits);
  const baselineP90 = percentile(baselineAll, 0.9);
  const sippP90 = percentile(sippAll, 0.9);
  assert.ok(
    sippAvg <= baselineAvg * 1.1,
    "SIPP should win on multi-seed average wait"
  );
  assert.ok(
    sippP90 <= baselineP90 * 1.1,
    "SIPP should win on multi-seed p90 wait"
  );
}

async function testTimeWindowOppositeDirections() {
  const nodes = [makeNode("S", 0, 0), makeNode("M", 12, 0), makeNode("G", 24, 0)];
  const edges = [makeEdge("S-M", "S", "M"), makeEdge("M-G", "M", "G")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 24, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 24, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 0, 0), true, "Robot 2 should accept goal");
    const route1 = getRoute(sim, "RB-01");
    const route2 = getRoute(sim, "RB-02");
    assert.deepEqual(edgeKeys(route1), ["S->M", "M->G"], "Robot 1 should take the corridor");
    assert.deepEqual(edgeKeys(route2), ["G->M", "M->S"], "Robot 2 should take the corridor");
    const groupKey = makeEdgeGroupKey("S", "M");
    const slot1 = findScheduleEntry(route1, groupKey);
    const slot2 = findScheduleEntry(route2, groupKey);
    assert.ok(slot1 && slot2, "Expected schedule entries for opposite corridor");
    const overlap = !(
      slot1.arrivalTime <= slot2.startTime || slot2.arrivalTime <= slot1.startTime
    );
    assert.ok(!overlap, "Opposite-direction windows should not overlap");
    const altGroupKey = makeEdgeGroupKey("M", "G");
    const altSlot2 = findScheduleEntry(route2, altGroupKey);
    const corridorWait = Math.max(slot2?.waitMs || 0, altSlot2?.waitMs || 0);
    assert.ok(corridorWait > 0, "Robot 2 should wait on the corridor");
  });

  const legacy1 = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 24, y: 0 });
  const legacy2 = planLegacyRoute(nodes, edges, { x: 24, y: 0 }, { x: 0, y: 0 });
  assert.ok(legacy1 && legacy2, "Expected legacy baseline routes");
  assert.deepEqual(legacy1.edgeKeys, ["S->M", "M->G"], "Legacy should keep the corridor");
  assert.deepEqual(legacy2.edgeKeys, ["G->M", "M->S"], "Legacy should keep the corridor");
}

async function testEntryHoldOppositeDirections() {
  const nodes = [
    makeNode("L", 0, 0),
    makeNode("A", 2, 0),
    makeNode("B", 6, 0),
    makeNode("R", 12, 0)
  ];
  const edges = [
    { id: "L-A", start: "L", end: "A", props: { width: 3 } },
    { id: "A-B", start: "A", end: "B", props: { width: 1 } },
    { id: "B-R", start: "B", end: "R", props: { width: 3 } }
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 12, y: 0 } }
  ];
  const traffic = {
    ...makeTrafficConfig("pulse-mapf-time", {
      reservationHorizonMs: 20000,
      reservationStepMs: 200,
      reservationSafetyMs: 120,
      reservationNodeDwellMs: 300
    }),
    edgeQueueTimeoutMs: 200
  };
  const bundle = buildBundle({ nodes, edges, robots, traffic });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 12, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 0, 0), true, "Robot 2 should accept goal");

    const corridorKey = makeEdgeGroupKey("A", "B");
    let entryHoldSeen = false;
    let directionSwitches = 0;
    let lastDirection = null;
    const start = Date.now();

    while (Date.now() - start < 50000) {
      const diag = sim.getDiagnostics ? sim.getDiagnostics({}) : null;
      if (diag?.robots?.length) {
        diag.robots.forEach((entry) => {
          const runtime = entry?.runtime;
          const reason = entry?.robot?.diagnostics?.reason;
          if (runtime?.entryHold?.edgeKey) entryHoldSeen = true;
          if (reason === "reservation_entry" || reason === "reservation_wait") {
            entryHoldSeen = true;
          }
        });
      }
      const lock = diag?.traffic?.edgeDirectionLocks?.find(
        (item) => item.edgeGroupKey === corridorKey
      );
      const currentDir = lock?.edgeKey || null;
      if (currentDir && currentDir !== lastDirection) {
        directionSwitches += 1;
        lastDirection = currentDir;
      }
      if (allRoutesCleared(sim, ["RB-01", "RB-02"])) break;
      await delay(40);
    }

    assert.ok(
      allRoutesCleared(sim, ["RB-01", "RB-02"]),
      "Robots should finish without deadlock"
    );
    assert.ok(entryHoldSeen, "Expected entry-hold on the single-lane corridor");
    assert.ok(
      directionSwitches <= 3,
      "Direction lock should not oscillate during entry-hold"
    );
  });
}

async function testYieldResumesWithoutResumePhase() {
  const nodes = [
    makeNode("S", 0, -4),
    makeNode("P", 0, 0),
    makeNode("D", 10, 0)
  ];
  const edges = [makeEdge("S-P", "S", "P"), makeEdge("P-D", "P", "D")];
  const worksites = {
    "PICK-01": { group: "PICK", point: "P" },
    "DROP-01": { group: "DROP", point: "D" }
  };
  const stream = {
    id: "S-YIELD",
    pick_group: "PICK",
    drop_group_order: ["DROP"],
    drop_policy: { order: "asc", access_rule: "any_free" }
  };
  const robots = [{ id: "RB-01", ref: "S", controlled: true }];
  const bundle = makeWorkflowBundle({ nodes, edges, robots, worksites, stream });

  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotControlled("RB-01", true);
      sim.setRobotDispatchable("RB-01", true);
      sim.updateWorksite("PICK-01", { filled: true });
      sim.updateWorksite("DROP-01", { filled: false });

      const assigned = await waitFor(
        () => sim.getStatus(false).tasks.length === 1,
        { timeoutMs: 3000 }
      );
      assert.ok(assigned, "Expected task dispatch before forcing yield");

      const moving = await waitFor(() => {
        const runtime = getRuntimeSnapshot(sim, "RB-01");
        return runtime && runtime.phase && runtime.phase !== "idle";
      }, { timeoutMs: 4000 });
      assert.ok(moving, "Robot should start moving before yield");

      assert.ok(sim.__test?.forceYield, "Expected test hooks for yield forcing");
      const forced = sim.__test.forceYield("RB-01", {
        resumePhase: null,
        resumeRouteGoal: null
      });
      assert.equal(forced.ok, false, "forceYield should be disabled");
      assert.equal(forced.error, "yield_disabled", "forceYield should be blocked");

      await monitorNoYield(
        sim,
        ["RB-01"],
        () => {
          const tasks = sim.getStatus(false).tasks;
          return tasks.length > 0 &&
            tasks.every(
              (task) =>
                task.status === "completed" ||
                task.phase === "to_park" ||
                task.phase === "done"
            );
        },
        { timeoutMs: 20000, label: "yield-disabled-auto" }
      );
    },
    { tickMs: 30, enableTestHooks: true }
  );
}

async function testYieldClearsWhenResumeMissing() {
  const nodes = [makeNode("S", 0, 0), makeNode("G", 8, 0)];
  const edges = [makeEdge("S-G", "S", "G")];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(
    bundle,
    async (sim) => {
      sim.setRobotManualMode("RB-01", true);
      assert.equal(sim.goPoint("RB-01", 8, 0), true, "Manual route should start");

      const active = await waitFor(() => {
        const runtime = getRuntimeSnapshot(sim, "RB-01");
        return runtime?.phase === "manual_move";
      }, { timeoutMs: 2000 });
      assert.ok(active, "Manual runtime should be active before forcing yield");

      assert.ok(sim.__test?.forceYield, "Expected test hooks for yield forcing");
      const forced = sim.__test.forceYield("RB-01", {
        resumePhase: null,
        resumeRouteGoal: null,
        clearRouteGoal: true
      });
      assert.equal(forced.ok, false, "forceYield should be disabled");
      assert.equal(forced.error, "yield_disabled", "forceYield should be blocked");

      await monitorNoYield(
        sim,
        ["RB-01"],
        () => allRoutesCleared(sim, ["RB-01"]),
        { timeoutMs: 12000, label: "yield-disabled-manual" }
      );
    },
    { tickMs: 30, enableTestHooks: true }
  );
}

async function testNoYieldNoReverseSingleRobot() {
  const nodes = [makeNode("S", 0, 0), makeNode("A", 6, 0), makeNode("G", 12, 0)];
  const edges = [makeEdge("S-A", "S", "A"), makeEdge("A-G", "A", "G")];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    assert.equal(sim.goPoint("RB-01", 12, 0), true, "Robot should accept goal");
    const route = await waitForRoute(sim, "RB-01");
    assertNoBacktrack(route, "single-robot");
    await monitorNoYield(
      sim,
      ["RB-01"],
      () => allRoutesCleared(sim, ["RB-01"]),
      { timeoutMs: 15000, label: "single-robot" }
    );
  });
}

async function testNoYieldNoReverseParallelLanes() {
  const nodes = [
    makeNode("S1", 0, 0),
    makeNode("G1", 12, 0),
    makeNode("S2", 0, 6),
    makeNode("G2", 12, 6)
  ];
  const edges = [makeEdge("S1-G1", "S1", "G1"), makeEdge("S2-G2", "S2", "G2")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 6 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 12, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 12, 6), true, "Robot 2 should accept goal");
    const route1 = await waitForRoute(sim, "RB-01");
    const route2 = await waitForRoute(sim, "RB-02");
    assertNoBacktrack(route1, "parallel-lanes-RB01");
    assertNoBacktrack(route2, "parallel-lanes-RB02");
    await monitorNoYield(
      sim,
      ["RB-01", "RB-02"],
      () => allRoutesCleared(sim, ["RB-01", "RB-02"]),
      { timeoutMs: 15000, label: "parallel-lanes" }
    );
  });
}

async function testNoYieldNoReverseSameDirectionConvoy() {
  const nodes = [
    makeNode("S1", 0, 0),
    makeNode("S2", 6, 0),
    makeNode("M", 12, 0),
    makeNode("G", 18, 0)
  ];
  const edges = [
    makeEdge("S1-S2", "S1", "S2"),
    makeEdge("S2-M", "S2", "M"),
    makeEdge("M-G", "M", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 6, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 18, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 18, 0), true, "Robot 2 should accept goal");
    const route1 = await waitForRoute(sim, "RB-01");
    const route2 = await waitForRoute(sim, "RB-02");
    assertNoBacktrack(route1, "convoy-RB01");
    assertNoBacktrack(route2, "convoy-RB02");
    await monitorNoYield(
      sim,
      ["RB-01", "RB-02"],
      () => allRoutesCleared(sim, ["RB-01", "RB-02"]),
      { timeoutMs: 22000, label: "convoy" }
    );
  });
}

async function testNoYieldNoReverseStaggeredIntersection() {
  const nodes = [
    makeNode("A", 0, 0),
    makeNode("X", 10, 0),
    makeNode("B", 20, 0),
    makeNode("Y", 10, -10),
    makeNode("Z", 10, 10)
  ];
  const edges = [
    makeEdge("A-X", "A", "X"),
    makeEdge("X-B", "X", "B"),
    makeEdge("Y-X", "Y", "X"),
    makeEdge("X-Z", "X", "Z")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 10, y: -10 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 20, 0), true, "Robot 1 should accept goal");
    const route1 = await waitForRoute(sim, "RB-01");
    assertNoBacktrack(route1, "staggered-RB01");
    const passed = await waitFor(() => {
      const robot = getRobotStatus(sim, "RB-01");
      return robot?.pose && robot.pose.x >= 12;
    }, { timeoutMs: 15000 });
    assert.ok(passed, "Robot 1 should clear intersection before Robot 2 starts");
    assert.equal(sim.goPoint("RB-02", 10, 10), true, "Robot 2 should accept goal");
    const route2 = await waitForRoute(sim, "RB-02");
    assertNoBacktrack(route2, "staggered-RB02");
    await monitorNoYield(
      sim,
      ["RB-01", "RB-02"],
      () => allRoutesCleared(sim, ["RB-01", "RB-02"]),
      { timeoutMs: 25000, label: "staggered-intersection" }
    );
  });
}

async function testNoYieldNoReverseMultiLaneThreeRobots() {
  const nodes = [
    makeNode("S0", 0, 0),
    makeNode("G0", 12, 0),
    makeNode("S1", 0, 5),
    makeNode("G1", 12, 5),
    makeNode("S2", 0, 10),
    makeNode("G2", 12, 10)
  ];
  const edges = [
    makeEdge("S0-G0", "S0", "G0"),
    makeEdge("S1-G1", "S1", "G1"),
    makeEdge("S2-G2", "S2", "G2")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 5 } },
    { id: "RB-03", pos: { x: 0, y: 10 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    robots.forEach((robot) => sim.setRobotManualMode(robot.id, true));
    assert.equal(sim.goPoint("RB-01", 12, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 12, 5), true, "Robot 2 should accept goal");
    assert.equal(sim.goPoint("RB-03", 12, 10), true, "Robot 3 should accept goal");
    const route1 = await waitForRoute(sim, "RB-01");
    const route2 = await waitForRoute(sim, "RB-02");
    const route3 = await waitForRoute(sim, "RB-03");
    assertNoBacktrack(route1, "multi-lane-RB01");
    assertNoBacktrack(route2, "multi-lane-RB02");
    assertNoBacktrack(route3, "multi-lane-RB03");
    await monitorNoYield(
      sim,
      ["RB-01", "RB-02", "RB-03"],
      () => allRoutesCleared(sim, ["RB-01", "RB-02", "RB-03"]),
      { timeoutMs: 15000, label: "multi-lane" }
    );
  });
}

async function testNoYieldNoReverseParallelStreams() {
  const nodes = [
    makeNode("S1", -6, 0),
    makeNode("P1", 0, 0),
    makeNode("D1", 10, 0),
    makeNode("S2", -6, 6),
    makeNode("P2", 0, 6),
    makeNode("D2", 10, 6)
  ];
  const edges = [
    makeEdge("S1-P1", "S1", "P1"),
    makeEdge("P1-D1", "P1", "D1"),
    makeEdge("S2-P2", "S2", "P2"),
    makeEdge("P2-D2", "P2", "D2")
  ];
  const worksites = {
    "PICK-A1": { group: "PICK-A", point: "P1" },
    "DROP-A1": { group: "DROP-A", point: "D1" },
    "PICK-B1": { group: "PICK-B", point: "P2" },
    "DROP-B1": { group: "DROP-B", point: "D2" }
  };
  const streams = [
    {
      id: "S-A",
      pick_group: "PICK-A",
      drop_group_order: ["DROP-A"],
      drop_policy: { order: "asc", access_rule: "any_free" }
    },
    {
      id: "S-B",
      pick_group: "PICK-B",
      drop_group_order: ["DROP-B"],
      drop_policy: { order: "asc", access_rule: "any_free" }
    }
  ];
  const robots = [
    { id: "RB-01", ref: "S1", controlled: true },
    { id: "RB-02", ref: "S2", controlled: true }
  ];
  const bundle = {
    graph: { nodes, edges, lines: [] },
    workflow: { bin_locations: worksites, streams },
    robotsConfig: { robots },
    packaging: null
  };

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);
    sim.setRobotDispatchable("RB-01", true);
    sim.setRobotDispatchable("RB-02", true);
    sim.updateWorksite("PICK-A1", { filled: true });
    sim.updateWorksite("DROP-A1", { filled: false });
    sim.updateWorksite("PICK-B1", { filled: true });
    sim.updateWorksite("DROP-B1", { filled: false });

    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.length === 2,
      { timeoutMs: 3000 }
    );
    assert.ok(assigned, "Expected both streams to dispatch tasks");
    const route1 = await waitForRoute(sim, "RB-01");
    const route2 = await waitForRoute(sim, "RB-02");
    assertNoBacktrack(route1, "parallel-streams-RB01");
    assertNoBacktrack(route2, "parallel-streams-RB02");
    await monitorNoYield(
      sim,
      ["RB-01", "RB-02"],
      () => {
        const tasks = sim.getStatus(false).tasks;
        return tasks.length > 0 &&
          tasks.every(
            (task) =>
              task.status === "completed" ||
              task.phase === "to_park" ||
              task.phase === "done"
          );
      },
      { timeoutMs: 22000, label: "parallel-streams" }
    );
  });
}

async function testNoTurnaroundOppositeDirections() {
  const nodes = [makeNode("S", 0, 0), makeNode("M", 12, 0), makeNode("G", 24, 0)];
  const edges = [makeEdge("S-M", "S", "M"), makeEdge("M-G", "M", "G")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 24, y: 0 } }
  ];
  const bundle = buildBundle({
    nodes,
    edges,
    robots,
    traffic: { noTurnaround: true }
  });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 24, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 0, 0), true, "Robot 2 should accept goal");
    const route1 = getRoute(sim, "RB-01");
    const route2 = getRoute(sim, "RB-02");
    const groupKey = makeEdgeGroupKey("S", "M");
    const slot1 = findScheduleEntry(route1, groupKey);
    const slot2 = findScheduleEntry(route2, groupKey);
    assert.ok(slot1 && slot2, "Expected schedule entries for opposite corridor");
    const overlap = !(
      slot1.arrivalTime <= slot2.startTime || slot2.arrivalTime <= slot1.startTime
    );
    assert.ok(!overlap, "Time windows should still avoid deadlock without turnarounds");
  });
}

async function testTimeWindowNoStarvation() {
  const nodes = [makeNode("S", 0, 0), makeNode("G", 24, 0)];
  const edges = [makeEdge("S-G", "S", "G")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } },
    { id: "RB-03", pos: { x: 0, y: 0 } },
    { id: "RB-04", pos: { x: 24, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    ["RB-01", "RB-02", "RB-03", "RB-04"].forEach((id) => sim.setRobotManualMode(id, true));
    assert.equal(sim.goPoint("RB-01", 24, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 24, 0), true, "Robot 2 should accept goal");
    assert.equal(sim.goPoint("RB-03", 24, 0), true, "Robot 3 should accept goal");
    assert.equal(sim.goPoint("RB-04", 0, 0), true, "Robot 4 should accept goal");
    const reverse = getRoute(sim, "RB-04");
    const groupKey = makeEdgeGroupKey("S", "G");
    const slot = findScheduleEntry(reverse, groupKey);
    assert.ok(slot, "Expected schedule entry for reverse corridor");
    assert.ok(slot.waitMs > 0, "Reverse robot should wait for forward platoon");
    assert.ok(
      slot.waitMs < slot.travelMs * 4,
      "Reverse robot wait should stay finite (no starvation)"
    );
  });
}

async function testRollingHorizonReservations() {
  const nodes = [makeNode("S", 0, 0), makeNode("M", 2.4, 0), makeNode("G", 4.8, 0)];
  const edges = [makeEdge("S-M", "S", "M"), makeEdge("M-G", "M", "G")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: -1.4, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 4.8, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 4.8, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    const groupKey = makeEdgeGroupKey("S", "M");
    const initialSlot = findScheduleEntry(route2, groupKey);
    assert.ok(initialSlot && initialSlot.waitMs > 0, "Robot 2 should wait initially");
    assert.equal(sim.cancel("RB-02"), true, "Robot 2 should cancel");
    const progressed = await waitFor(() => {
      const robot = getRobotStatus(sim, "RB-01");
      return robot?.pose && robot.pose.x >= 2.1;
    }, { timeoutMs: 5000 });
    assert.ok(progressed, "Robot 1 should advance along corridor");
    assert.equal(sim.goPoint("RB-02", 4.8, 0), true, "Robot 2 should replan");
    const updated = getRoute(sim, "RB-02");
    const updatedSlot = findScheduleEntry(updated, groupKey);
    assert.ok(updatedSlot, "Expected updated schedule entry");
    assert.ok(
      updatedSlot.waitMs < initialSlot.waitMs * 0.6,
      "Rolling horizon should reduce wait times as the lead robot progresses"
    );
  });
}

async function testWaitBeatsDetour() {
  const ROBOT_SPEED_MPS = 0.9;
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("M", 10, 0),
    makeNode("G", 20, 0),
    makeNode("D1", 0, 8),
    makeNode("D2", 20, 8)
  ];
  const edges = [
    makeEdge("S-M", "S", "M"),
    makeEdge("M-G", "M", "G"),
    makeEdge("S-D1", "S", "D1"),
    makeEdge("D1-D2", "D1", "D2"),
    makeEdge("D2-G", "D2", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 20, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 20, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.deepEqual(
      edgeKeys(route2),
      ["S->M", "M->G"],
      "Robot 2 should wait instead of taking the detour"
    );
    const slot2 = findScheduleEntry(route2, makeEdgeGroupKey("S", "M"));
    assert.ok(slot2 && slot2.waitMs > 0, "Robot 2 should wait for the corridor window");
    const detourEdges = edges.filter((edge) => !["S-M", "M-G"].includes(edge.id));
    const detour = planLegacyRoute(nodes, detourEdges, { x: 0, y: 0 }, { x: 20, y: 0 });
    assert.ok(detour, "Expected detour route length");
    const detourMs = (detour.totalLength / ROBOT_SPEED_MPS) * 1000;
    const etaMs = routeCompletionMs(route2);
    assert.ok(etaMs < detourMs, "Waiting should beat detour ETA");
  });
}

async function testScheduleMatchesRuntime() {
  const nodes = [makeNode("S", 0, 0), makeNode("M", 2.4, 0), makeNode("G", 4.8, 0)];
  const edges = [makeEdge("S-M", "S", "M"), makeEdge("M-G", "M", "G")];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    assert.equal(sim.goPoint("RB-01", 4.8, 0), true, "Robot should accept goal");
    const route = getRoute(sim, "RB-01");
    assert.ok(route?.schedule?.length, "Expected schedule entries");
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const tracked = (route.schedule || [])
      .filter((entry) => entry?.toNodeId && nodesById.has(entry.toNodeId))
      .sort((a, b) => a.arrivalTime - b.arrivalTime);
    assert.ok(tracked.length >= 2, "Expected schedule entries for nodes");
    const plannedAt = Number.isFinite(route.plannedAt) ? route.plannedAt : Date.now();
    for (const entry of tracked) {
      const node = nodesById.get(entry.toNodeId);
      const arrived = await waitFor(() => {
        const robot = getRobotStatus(sim, "RB-01");
        if (!robot?.pose || !node?.pos) return false;
        return distance(robot.pose, node.pos) <= 0.25;
      }, { timeoutMs: 5000 });
      assert.ok(arrived, `Robot should reach ${entry.toNodeId}`);
      const actualMs = Date.now() - plannedAt;
      const predictedMs = entry.arrivalTime - plannedAt;
      const tolerance = Math.max(500, predictedMs * 0.4);
      assert.ok(
        Math.abs(actualMs - predictedMs) <= tolerance,
        `Schedule ETA should match runtime for ${entry.toNodeId}`
      );
    }
  });
}

async function testRuntimeScheduleOrderMultiRobot() {
  const nodes = [makeNode("S", 0, 0), makeNode("M", 2.4, 0), makeNode("G", 4.8, 0)];
  const edges = [makeEdge("S-M", "S", "M"), makeEdge("M-G", "M", "G")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: -1.4, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 4.8, 0), true, "Robot 1 should accept goal");
    await delay(200);
    assert.equal(sim.goPoint("RB-02", 4.8, 0), true, "Robot 2 should accept goal");
    const route1 = getRoute(sim, "RB-01");
    const route2 = getRoute(sim, "RB-02");
    const slot1 = (route1?.schedule || []).find((entry) => entry.toNodeId === "M");
    const slot2 = (route2?.schedule || []).find((entry) => entry.toNodeId === "M");
    assert.ok(slot1 && slot2, "Expected schedule entries for node M");
    assert.ok(
      slot2.arrivalTime > slot1.arrivalTime,
      "Schedule should order corridor entry"
    );

    const target = { x: 2.4, y: 0 };
    const reached1 = await waitFor(() => {
      const robot = getRobotStatus(sim, "RB-01");
      return robot?.pose && distance(robot.pose, target) <= 0.25;
    }, { timeoutMs: 8000 });
    assert.ok(reached1, "Robot 1 should reach M");
    const t1 = Date.now();
    const reached2 = await waitFor(() => {
      const robot = getRobotStatus(sim, "RB-02");
      return robot?.pose && distance(robot.pose, target) <= 0.25;
    }, { timeoutMs: 8000 });
    assert.ok(reached2, "Robot 2 should reach M");
    const t2 = Date.now();
    assert.ok(t2 > t1 + 200, "Robot 2 should reach M after Robot 1");
  });
}

async function testCancelReleasesReservation() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 18, 0),
    makeNode("B", 18, 10),
    makeNode("G", 36, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 36, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 36, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    assert.deepEqual(
      edgeKeys(route2),
      ["S->B", "B->G"],
      "Robot 2 should avoid reserved corridor"
    );
    assert.equal(sim.cancel("RB-01"), true, "Robot 1 should cancel route");
    assert.equal(sim.goPoint("RB-02", 36, 0), true, "Robot 2 should replan");
    const replanned = getRoute(sim, "RB-02");
    assert.deepEqual(
      edgeKeys(replanned),
      ["S->A", "A->G"],
      "Replan should take released corridor"
    );
  });
}

async function testCancelAdvancesWaitingRobot() {
  const nodes = [makeNode("S", 0, 0), makeNode("M", 2.4, 0), makeNode("G", 4.8, 0)];
  const edges = [makeEdge("S-M", "S", "M"), makeEdge("M-G", "M", "G")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 4.8, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 4.8, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    const groupKey = makeEdgeGroupKey("S", "M");
    const slot2 = findScheduleEntry(route2, groupKey);
    assert.ok(slot2 && slot2.waitMs > 0, "Robot 2 should have a wait window");
    assert.equal(sim.cancel("RB-01"), true, "Robot 1 should cancel");
    const updated = getRoute(sim, "RB-02");
    const updatedSlot = findScheduleEntry(updated, groupKey);
    assert.ok(updatedSlot, "Expected updated schedule entry");
    assert.ok(
      updatedSlot.waitMs < slot2.waitMs * 0.4,
      "Robot 2 should get an earlier slot without a new goPoint"
    );
  });
}

async function testNodeReservationIntersection() {
  const nodes = [
    makeNode("S2", 0, -1.2),
    makeNode("X", 0, 0),
    makeNode("G2", 0, 1.2)
  ];
  const edges = [
    makeEdge("S2-X", "S2", "X"),
    makeEdge("X-G2", "X", "G2")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: -1.2 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-02", 0, 1.2), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    const slot = (route2?.schedule || []).find((entry) => entry.toNodeId === "X");
    assert.ok(slot, "Expected node reservation schedule for X");
    assert.ok(slot.waitMs > 0, "Intersection node reservation should delay arrival");
  });
}

async function testObstacleBlocksEdge() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 10, 0),
    makeNode("B", 10, 6),
    makeNode("G", 20, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    const obstacle = sim.addSimObstacle({ x: 5, y: 0, radius: 0.8, mode: "block" });
    assert.equal(obstacle.ok, true, "Obstacle should be created");
    const route = startManualRoute(sim, "RB-01", { x: 20, y: 0 });
    assert.deepEqual(
      edgeKeys(route),
      ["S->B", "B->G"],
      "Planner should avoid the blocked corridor"
    );
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 20, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->A", "A->G"],
    "Legacy baseline should ignore blocked edges"
  );
}

async function testAvoidObstacleDetoursWithoutReplan() {
  const nodes = [makeNode("S", 0, 0), makeNode("A", 2.4, 0), makeNode("G", 4.8, 0)];
  const edges = [makeEdge("S-A", "S", "A"), makeEdge("A-G", "A", "G")];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    assert.equal(sim.goPoint("RB-01", 4.8, 0), true, "Robot should accept goal");
    const initial = getRoute(sim, "RB-01");
    assert.deepEqual(
      edgeKeys(initial),
      ["S->A", "A->G"],
      "Initial plan should take the corridor"
    );
    await delay(200);
    const obstacle = sim.addSimObstacle({ x: 1.2, y: 0, radius: 0.35, mode: "avoid" });
    assert.equal(obstacle.ok, true, "Avoid obstacle should be created");
    const steady = await waitFor(
      () => {
        const robot = getRobotStatus(sim, "RB-01");
        const keys = edgeKeys(getRoute(sim, "RB-01"));
        return robot && !robot.blocked && keys.join("|") === "S->A|A->G";
      },
      { timeoutMs: 2000 }
    );
    assert.ok(steady, "Avoid obstacle should not block or replan");
  });
}

async function testAnchorBlockedDetour() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 10, 0),
    makeNode("B", 10, 6),
    makeNode("G", 20, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const robots = [{ id: "RB-01", pos: { x: 2, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    const obstacle = sim.addSimObstacle({ x: 10, y: 0, radius: 0.8, mode: "block" });
    assert.equal(obstacle.ok, true, "Obstacle should be created");
    const route = startManualRoute(sim, "RB-01", { x: 18, y: 0 });
    assert.ok(route.pathNodes.includes("__start"), "Expected start anchor");
    assert.ok(route.pathNodes.includes("__goal"), "Expected goal anchor");
    const keys = edgeKeys(route);
    assert.ok(keys.includes("S->B") && keys.includes("B->G"), "Planner should detour via B");
    assert.ok(!keys.includes("S->A") && !keys.includes("A->G"), "Blocked corridor should be avoided");
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 2, y: 0 }, { x: 18, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->A", "A->G"],
    "Legacy baseline should ignore blocked corridor"
  );
}

async function testReplanAfterObstacle() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 15, 0),
    makeNode("B", 15, 8),
    makeNode("G", 30, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    assert.equal(sim.goPoint("RB-01", 30, 0), true, "Robot should accept initial goal");
    const initial = getRoute(sim, "RB-01");
    assert.deepEqual(
      edgeKeys(initial),
      ["S->A", "A->G"],
      "Initial plan should take the shortest corridor"
    );
    const obstacle = sim.addSimObstacle({ x: 7.5, y: 0, radius: 0.9, mode: "block" });
    assert.equal(obstacle.ok, true, "Obstacle should be created");
    assert.equal(sim.goPoint("RB-01", 30, 0), true, "Robot should replan after obstacle");
    const replanned = getRoute(sim, "RB-01");
    assert.deepEqual(
      edgeKeys(replanned),
      ["S->B", "B->G"],
      "Replan should avoid the blocked corridor"
    );
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 30, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->A", "A->G"],
    "Legacy baseline should keep the original corridor"
  );
}

async function testAutoReplanOnObstacle() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 2.4, 0),
    makeNode("B", 2.4, 1.6),
    makeNode("G", 4.8, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    assert.equal(sim.goPoint("RB-01", 4.8, 0), true, "Robot should accept goal");
    const initial = getRoute(sim, "RB-01");
    assert.deepEqual(
      edgeKeys(initial),
      ["S->A", "A->G"],
      "Initial plan should take the shortest corridor"
    );
    await delay(500);
    const obstacle = sim.addSimObstacle({ x: 0.9, y: 0, radius: 0.2, mode: "block" });
    assert.equal(obstacle.ok, true, "Obstacle should be created");
    const switched = await waitFor(
      () => {
        const route = getRoute(sim, "RB-01");
        const keys = edgeKeys(route);
        const robot = getRobotStatus(sim, "RB-01");
        const rerouted =
          keys.includes("S->B") &&
          keys.includes("B->G") &&
          !keys.includes("S->A") &&
          !keys.includes("A->G");
        return robot && rerouted && !robot.blocked;
      },
      { timeoutMs: 6000 }
    );
    assert.ok(switched, "Planner should replan without a new goPoint");
    const arrived = await waitFor(() => allRoutesCleared(sim, ["RB-01"]), { timeoutMs: 12000 });
    assert.ok(arrived, "Robot should finish after obstacle replan");
  });
}

async function testReplanAfterObstacleRemoval() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 2.4, 0),
    makeNode("B", 2.4, 8),
    makeNode("G", 4.8, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    assert.equal(sim.goPoint("RB-01", 4.8, 0), true, "Robot should accept goal");
    await delay(500);
    const obstacle = sim.addSimObstacle({ x: 0.9, y: 0, radius: 0.2, mode: "block" });
    assert.equal(obstacle.ok, true, "Obstacle should be created");
    const detoured = await waitFor(
      () => {
        const keys = edgeKeys(getRoute(sim, "RB-01"));
        return keys.includes("S->B") && keys.includes("B->G");
      },
      { timeoutMs: 6000 }
    );
    assert.ok(detoured, "Planner should detour around the obstacle");
    sim.pause("RB-01");
    const removed = sim.removeObstacleById(obstacle.obstacle.id);
    assert.equal(removed.ok, true, "Obstacle should be removed");
    const restored = await waitFor(
      () => {
        const keys = edgeKeys(getRoute(sim, "RB-01"));
        return keys.includes("A->G") && !keys.includes("S->B") && !keys.includes("B->G");
      },
      { timeoutMs: 6000 }
    );
    assert.ok(restored, "Planner should return to the corridor after removal");
  });
}

async function testReplanWhileWaitingWindow() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("M", 10, 0),
    makeNode("G", 20, 0),
    makeNode("D1", 0, 8),
    makeNode("D2", 20, 8)
  ];
  const edges = [
    makeEdge("S-M", "S", "M"),
    makeEdge("M-G", "M", "G"),
    makeEdge("S-D1", "S", "D1"),
    makeEdge("D1-D2", "D1", "D2"),
    makeEdge("D2-G", "D2", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    assert.equal(sim.goPoint("RB-01", 20, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 20, 0), true, "Robot 2 should accept goal");
    const route2 = getRoute(sim, "RB-02");
    const slot2 = findScheduleEntry(route2, makeEdgeGroupKey("S", "M"));
    assert.ok(slot2 && slot2.waitMs > 0, "Robot 2 should wait for a corridor window");
    await delay(300);
    const obstacle = sim.addSimObstacle({ x: 9, y: 0, radius: 0.8, mode: "block" });
    assert.equal(obstacle.ok, true, "Obstacle should be created");
    const switched = await waitFor(
      () => {
        const route = getRoute(sim, "RB-02");
        const keys = edgeKeys(route);
        return (
          keys.includes("S->D1") && keys.includes("D1->D2") && keys.includes("D2->G")
        );
      },
      { timeoutMs: 6000 }
    );
    assert.ok(switched, "Planner should replan while waiting after corridor blocks");
  });
}

async function testBackwardPenaltyPrefersForward() {
  const nodes = [makeNode("S", 0, 0), makeNode("B", 6, 1.4), makeNode("G", 12, 0)];
  const edges = [
    makeEdge("S-G", "S", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const lines = [
    {
      id: "L1",
      className: "FeatureLine",
      startPos: { x: 0, y: 0 },
      endPos: { x: 12, y: 0 },
      props: { direction: -1 }
    }
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, lines, robots });

  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", { x: 12, y: 0 });
    assert.deepEqual(
      edgeKeys(route),
      ["S->B", "B->G"],
      "Planner should avoid backward segments when a forward path exists"
    );
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 12, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->G"],
    "Legacy baseline should ignore backward penalties"
  );
}

async function testDirectionalLineBlocksReverse() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 10, 0),
    makeNode("B", 10, 6),
    makeNode("G", 20, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const lines = [
    {
      id: "L1",
      className: "FeatureLine",
      startPos: { x: 0, y: 0 },
      endPos: { x: 20, y: 0 },
      props: { direction: 1 }
    }
  ];
  const robots = [{ id: "RB-01", pos: { x: 20, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, lines, robots });

  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", { x: 0, y: 0 });
    assert.deepEqual(
      edgeKeys(route),
      ["G->B", "B->S"],
      "Planner should avoid wrong-way edges under line constraints"
    );
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 20, y: 0 }, { x: 0, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["G->A", "A->S"],
    "Legacy baseline should allow wrong-way edges"
  );
}

async function testDirectionalLineDirectionPos() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 10, 0),
    makeNode("B", 10, 6),
    makeNode("G", 20, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const lines = [
    {
      id: "L-pos",
      className: "FeatureLine",
      startPos: { x: 0, y: 0 },
      endPos: { x: 20, y: 0 },
      props: { direction: 1, directionPosX: 0, directionPosY: 0 }
    }
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, lines, robots });

  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", { x: 20, y: 0 });
    assert.deepEqual(
      edgeKeys(route),
      ["S->B", "B->G"],
      "Planner should respect directionPos hint on lines"
    );
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 20, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->A", "A->G"],
    "Legacy baseline should ignore directionPos hints"
  );
}

async function testDirectionalLineAnchorDirectionPos() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 10, 0),
    makeNode("B", 10, 6),
    makeNode("G", 20, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const lines = [
    {
      id: "L-anchor",
      className: "FeatureLine",
      startPos: { x: 0, y: 0 },
      endPos: { x: 20, y: 0 },
      props: { direction: 1, directionPosX: 0, directionPosY: 0 }
    }
  ];
  const robots = [{ id: "RB-01", pos: { x: 2, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, lines, robots });

  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", { x: 18, y: 0 });
    assert.ok(route.pathNodes.includes("__start"), "Expected start anchor on edge");
    assert.ok(route.pathNodes.includes("__goal"), "Expected goal anchor on edge");
    const keys = edgeKeys(route);
    assert.ok(
      !keys.includes("S->A") && !keys.includes("A->G"),
      "Anchored route should respect directionPos"
    );
    assert.ok(
      keys.includes("S->B") && keys.includes("B->G"),
      "Anchored route should detour under line constraints"
    );
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 2, y: 0 }, { x: 18, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->A", "A->G"],
    "Legacy baseline should ignore anchored directionPos"
  );
}

async function testDirectionalLineDiagonal() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 10, 10),
    makeNode("G", 20, 20),
    makeNode("X", 20, 0),
    makeNode("Y", 0, 20)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-X", "S", "X"),
    makeEdge("X-G", "X", "G"),
    makeEdge("S-Y", "S", "Y"),
    makeEdge("Y-G", "Y", "G")
  ];
  const lines = [
    {
      id: "L-diag",
      className: "FeatureLine",
      startPos: { x: 0, y: 0 },
      endPos: { x: 20, y: 20 },
      props: { direction: 1, directionPosX: 0, directionPosY: 0 }
    }
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, lines, robots });

  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", { x: 20, y: 20 });
    const keys = edgeKeys(route);
    assert.ok(
      !keys.includes("S->A") && !keys.includes("A->G"),
      "Planner should avoid wrong-way diagonal edges"
    );
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 20, y: 20 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["S->A", "A->G"],
    "Legacy baseline should allow wrong-way diagonal edges"
  );
}

async function testDirectionalLineBezier() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 10, 8),
    makeNode("G", 20, 0)
  ];
  const edges = [
    {
      id: "S-G",
      start: "S",
      end: "G",
      controlPos1: { x: 5, y: 0.4 },
      controlPos2: { x: 15, y: 0.4 }
    },
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G")
  ];
  const lines = [
    {
      id: "L-curve",
      className: "FeatureLine",
      startPos: { x: 0, y: 0 },
      endPos: { x: 20, y: 0 },
      props: { direction: 1, directionPosX: 20, directionPosY: 0 }
    }
  ];
  const robots = [{ id: "RB-01", pos: { x: 20, y: 0 } }];
  const bundle = buildBundle({ nodes, edges, lines, robots });

  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", { x: 0, y: 0 });
    const keys = edgeKeys(route);
    assert.ok(!keys.includes("G->S"), "Planner should avoid wrong-way bezier edges");
    assert.deepEqual(keys, ["G->A", "A->S"], "Planner should take the alternate path");
  });

  const legacy = planLegacyRoute(nodes, edges, { x: 20, y: 0 }, { x: 0, y: 0 });
  assert.ok(legacy, "Expected legacy baseline route");
  assert.deepEqual(
    legacy.edgeKeys,
    ["G->S"],
    "Legacy baseline should allow wrong-way bezier edges"
  );
}

async function testNoBackwardSkipsReverseDrive() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("B", 10, 8),
    makeNode("G", 20, 0)
  ];
  const edges = [
    makeEdge("S-G", "S", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const lines = [
    {
      id: "L-back",
      className: "FeatureLine",
      startPos: { x: 0, y: 0 },
      endPos: { x: 20, y: 0 },
      props: { direction: -1 }
    }
  ];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];

  const baseBundle = buildBundle({ nodes, edges, lines, robots });
  await withSim(baseBundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", { x: 20, y: 0 });
    assert.deepEqual(
      edgeKeys(route),
      ["S->G"],
      "Baseline should allow backward-drive edge when shorter"
    );
  });

  const noBackBundle = buildBundle({
    nodes,
    edges,
    lines,
    robots,
    traffic: { noBackward: true }
  });
  await withSim(noBackBundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", { x: 20, y: 0 });
    const keys = edgeKeys(route);
    assert.ok(
      keys.includes("S->B") && keys.includes("B->G"),
      "No-backward mode should detour around reverse-drive edges"
    );
    assert.ok(!keys.includes("S->G"), "No-backward mode should skip reverse-drive edges");
  });
}

async function testJitterStability() {
  const nodes = [makeNode("A", 0, 0), makeNode("B", 10, 0), makeNode("C", 20, 0)];
  const edges = [makeEdge("A-B", "A", "B"), makeEdge("B-C", "B", "C")];
  const goalPos = { x: 20, y: 0 };
  const startPositions = [4.8, 4.9, 5.1, 5.2].map((x) => ({ x, y: 0 }));

  const newPaths = new Set();
  for (const startPos of startPositions) {
    const robots = [{ id: "RB-01", pos: { ...startPos } }];
    const bundle = buildBundle({ nodes, edges, robots });
    await withSim(bundle, async (sim) => {
      const route = startManualRoute(sim, "RB-01", goalPos);
      newPaths.add(JSON.stringify(edgeKeys(route)));
    });
  }

  const legacyPaths = new Set();
  startPositions.forEach((startPos) => {
    const legacy = planLegacyRoute(nodes, edges, startPos, goalPos);
    legacyPaths.add(JSON.stringify(legacy?.edgeKeys || []));
  });

  assert.equal(newPaths.size, 1, "New planner should be stable under small jitter");
  assert.ok(legacyPaths.size >= 2, "Legacy planner should flip between nodes under jitter");
}

async function testOverlapReductionMultiRobot() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 15, 0),
    makeNode("B", 15, 10),
    makeNode("C", 15, -10),
    makeNode("G", 30, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G"),
    makeEdge("S-C", "S", "C"),
    makeEdge("C-G", "C", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } },
    { id: "RB-03", pos: { x: 0, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  let newOverlap = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    sim.setRobotManualMode("RB-03", true);
    assert.equal(sim.goPoint("RB-01", 30, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 30, 0), true, "Robot 2 should accept goal");
    assert.equal(sim.goPoint("RB-03", 30, 0), true, "Robot 3 should accept goal");
    const routes = [
      getRoute(sim, "RB-01"),
      getRoute(sim, "RB-02"),
      getRoute(sim, "RB-03")
    ];
    const keysList = routes.map((route) => collectGroupKeysFromRoute(route));
    newOverlap = countSharedKeys(keysList);
  });

  const legacyKeysList = robots.map(() => {
    const legacy = planLegacyRoute(nodes, edges, { x: 0, y: 0 }, { x: 30, y: 0 });
    return collectGroupKeysFromEdgeKeys(legacy?.edgeKeys || []);
  });
  const legacyOverlap = countSharedKeys(legacyKeysList);
  assert.ok(newOverlap !== null, "Expected overlap metric for new planner");
  assert.ok(newOverlap < legacyOverlap, "New planner should reduce shared corridors");
}

async function testRuntimeThroughputMultiRobot() {
  const ROBOT_SPEED_MPS = 0.9;
  const nodes = [
    makeNode("S1", 0, 0),
    makeNode("G1", 3, 0),
    makeNode("S2", 0, 2.6),
    makeNode("G2", 3, 2.6),
    makeNode("S3", 0, -2.6),
    makeNode("G3", 3, -2.6)
  ];
  const edges = [
    makeEdge("S1-G1", "S1", "G1"),
    makeEdge("S2-G2", "S2", "G2"),
    makeEdge("S3-G3", "S3", "G3")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 2.6 } },
    { id: "RB-03", pos: { x: 0, y: -2.6 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  await withRunningSim(bundle, async (sim) => {
    ["RB-01", "RB-02", "RB-03"].forEach((id) => sim.setRobotManualMode(id, true));
    const startAt = Date.now();
    assert.equal(sim.goPoint("RB-01", 3, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 3, 2.6), true, "Robot 2 should accept goal");
    assert.equal(sim.goPoint("RB-03", 3, -2.6), true, "Robot 3 should accept goal");
    const finished = await waitFor(
      () => allRoutesCleared(sim, ["RB-01", "RB-02", "RB-03"]),
      { timeoutMs: 8000 }
    );
    assert.ok(finished, "Robots should finish navigation");
    const elapsed = Date.now() - startAt;
    const goals = [
      { x: 3, y: 0 },
      { x: 3, y: 2.6 },
      { x: 3, y: -2.6 }
    ];
    const legacyMs = robots.reduce((total, robot, index) => {
      const legacy = planLegacyRoute(nodes, edges, robot.pos, goals[index]);
      assert.ok(legacy, "Expected legacy baseline route");
      return total + (legacy.totalLength / ROBOT_SPEED_MPS) * 1000;
    }, 0);
    assert.ok(
      elapsed < legacyMs * 0.7,
      "Runtime throughput should beat sequential legacy baseline"
    );
  });
}

async function testBatchPlanningWorkload() {
  const size = 16;
  const { nodes, edges } = buildGrid(size, 1);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const pairs = [];
  for (let i = 0; i < 10; i += 1) {
    pairs.push({
      startId: `N-0-${i}`,
      goalId: `N-${size - 1}-${size - 1 - i}`
    });
  }

  let totalNew = 0;
  let totalBaseline = 0;
  for (const pair of pairs) {
    const startPos = nodesById.get(pair.startId)?.pos;
    const goalPos = nodesById.get(pair.goalId)?.pos;
    if (!startPos || !goalPos) continue;
    const robots = [{ id: "RB-01", pos: { ...startPos } }];
    const bundle = buildBundle({ nodes, edges, robots });
    await withSim(bundle, async (sim) => {
      const route = startManualRoute(sim, "RB-01", goalPos);
      totalNew += route?.plannerStats?.expansions ?? 0;
    });
    const baseline = dijkstraStateful(nodes, edges, pair.startId, pair.goalId);
    totalBaseline += baseline.expansions;
  }

  assert.ok(totalBaseline > 0, "Expected baseline expansions");
  assert.ok(
    totalNew < totalBaseline * 0.85,
    "Batch planning workload should be lower than baseline"
  );
}

async function testManualReservationAffectsDispatch() {
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 18, 0),
    makeNode("B", 18, 10),
    makeNode("G", 36, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G")
  ];
  const worksites = {
    "PICK-01": { group: "PICK", point: "S" },
    "DROP-01": { group: "DROP", point: "G" }
  };
  const stream = {
    id: "S-MANUAL",
    pick_group: "PICK",
    drop_group_order: ["DROP"],
    drop_policy: { order: "asc", access_rule: "any_free" }
  };
  const robots = [
    { id: "RB-01", ref: "S", controlled: true },
    { id: "RB-02", ref: "S", controlled: true }
  ];
  const bundle = makeWorkflowBundle({ nodes, edges, robots, worksites, stream });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);
    sim.setRobotDispatchable("RB-01", false);
    sim.setRobotDispatchable("RB-02", true);
    sim.setRobotManualMode("RB-01", true);
    assert.equal(sim.goPoint("RB-01", 36, 0), true, "Manual robot should accept goal");
    sim.updateWorksite("PICK-01", { filled: true });
    sim.updateWorksite("DROP-01", { filled: false });

    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.some((task) => task.robotId === "RB-02"),
      { timeoutMs: 3000 }
    );
    assert.ok(assigned, "Dispatch should assign task to RB-02");
    const routed = await waitFor(
      () => {
        const route = getRoute(sim, "RB-02");
        const keys = edgeKeys(route);
        return keys.includes("S->B") && keys.includes("B->G");
      },
      { timeoutMs: 4000 }
    );
    assert.ok(routed, "Dispatch should avoid manual robot reservation");
  });
}

async function testDispatchCompletionThroughput() {
  const ACTION_WAIT_MS = 900;
  const ROBOT_SPEED_MPS = 0.9;
  const nodes = [
    makeNode("P1", 0, 0),
    makeNode("P2", 0, 2.6),
    makeNode("A", 1.2, 0),
    makeNode("B", 1.2, 2.6),
    makeNode("D1", 2.4, 0),
    makeNode("D2", 2.4, 2.6)
  ];
  const edges = [
    makeEdge("P1-A", "P1", "A"),
    makeEdge("A-D1", "A", "D1"),
    makeEdge("P2-B", "P2", "B"),
    makeEdge("B-D2", "B", "D2")
  ];
  const worksites = {
    "PICK-01": { group: "PICK", point: "P1" },
    "PICK-02": { group: "PICK", point: "P2" },
    "DROP-01": { group: "DROP", point: "D1" },
    "DROP-02": { group: "DROP", point: "D2" }
  };
  const stream = {
    id: "S-TEST",
    pick_group: "PICK",
    drop_group_order: ["DROP"],
    drop_policy: { order: "asc", access_rule: "any_free" }
  };
  const robots = [
    { id: "RB-01", ref: "P1", controlled: true },
    { id: "RB-02", ref: "P2", controlled: true }
  ];
  const bundle = makeWorkflowBundle({ nodes, edges, robots, worksites, stream });

  await withRunningSim(bundle, async (sim) => {
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);
    sim.setRobotDispatchable("RB-01", true);
    sim.setRobotDispatchable("RB-02", true);
    sim.updateWorksite("PICK-01", { filled: true });
    sim.updateWorksite("PICK-02", { filled: true });
    sim.updateWorksite("DROP-01", { filled: false });
    sim.updateWorksite("DROP-02", { filled: false });

    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.length === 2,
      { timeoutMs: 3000 }
    );
    assert.ok(assigned, "Expected both tasks to dispatch");
    const startAt = Date.now();
    const finished = await waitFor(() => {
      const tasks = sim.getStatus(false).tasks;
      return tasks.length > 0 &&
        tasks.every(
          (task) =>
            task.status === "completed" ||
            task.phase === "to_park" ||
            task.phase === "done"
        );
    }, { timeoutMs: 12000 });
    assert.ok(finished, "Expected tasks to finish pick/drop before park");
    const elapsed = Date.now() - startAt;

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const legacy1 = planLegacyRoute(
      nodes,
      edges,
      nodesById.get("P1").pos,
      nodesById.get("D1").pos
    );
    const legacy2 = planLegacyRoute(
      nodes,
      edges,
      nodesById.get("P2").pos,
      nodesById.get("D2").pos
    );
    assert.ok(legacy1 && legacy2, "Expected legacy baseline routes");
    const travelMs1 = (legacy1.totalLength / ROBOT_SPEED_MPS) * 1000;
    const travelMs2 = (legacy2.totalLength / ROBOT_SPEED_MPS) * 1000;
    const legacyMs = travelMs1 + travelMs2 + ACTION_WAIT_MS * 4;
    assert.ok(
      elapsed < legacyMs * 0.85,
      "Dispatch runtime should beat sequential legacy baseline"
    );
  });
}

async function testPredictedThroughput() {
  const ROBOT_SPEED_MPS = 0.9;
  const nodes = [
    makeNode("S", 0, 0),
    makeNode("A", 15, 0),
    makeNode("B", 15, 10),
    makeNode("C", 15, -10),
    makeNode("G", 30, 0)
  ];
  const edges = [
    makeEdge("S-A", "S", "A"),
    makeEdge("A-G", "A", "G"),
    makeEdge("S-B", "S", "B"),
    makeEdge("B-G", "B", "G"),
    makeEdge("S-C", "S", "C"),
    makeEdge("C-G", "C", "G")
  ];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } },
    { id: "RB-03", pos: { x: 0, y: 0 } }
  ];
  const bundle = buildBundle({ nodes, edges, robots });

  let newMakespan = null;
  await withSim(bundle, async (sim) => {
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);
    sim.setRobotManualMode("RB-03", true);
    assert.equal(sim.goPoint("RB-01", 30, 0), true, "Robot 1 should accept goal");
    assert.equal(sim.goPoint("RB-02", 30, 0), true, "Robot 2 should accept goal");
    assert.equal(sim.goPoint("RB-03", 30, 0), true, "Robot 3 should accept goal");
    const routes = [
      getRoute(sim, "RB-01"),
      getRoute(sim, "RB-02"),
      getRoute(sim, "RB-03")
    ];
    newMakespan = Math.max(...routes.map((route) => routeCompletionMs(route)));
  });

  const corridorLength =
    distance(nodes[0].pos, nodes[1].pos) + distance(nodes[1].pos, nodes[4].pos);
  const travelMs = (corridorLength / ROBOT_SPEED_MPS) * 1000;
  const legacyMakespan = travelMs * robots.length;
  assert.ok(newMakespan !== null, "Expected makespan for new planner");
  assert.ok(
    newMakespan < legacyMakespan - travelMs * 0.5,
    "New planner should reduce predicted makespan"
  );
}

async function testPlannerPerformanceScaling() {
  const { nodes, edges } = buildGrid(18, 1);
  const startNode = nodes[0];
  const goalNode = nodes[nodes.length - 1];
  const robots = [{ id: "RB-01", pos: { ...startNode.pos } }];
  const bundle = buildBundle({ nodes, edges, robots });

  let newExpansions = null;
  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", goalNode.pos);
    newExpansions = route?.plannerStats?.expansions ?? null;
  });

  const baseline = dijkstraStateful(nodes, edges, startNode.id, goalNode.id);
  assert.ok(Number.isFinite(newExpansions), "Expected new planner expansions");
  assert.ok(
    newExpansions < baseline.expansions * 0.7,
    "A* expansions should be lower than stateful Dijkstra baseline"
  );
}

async function testTrafficSmoothness() {
  const graph = loadTrafficGraph();
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const lines = graph.lines || [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const degrees = new Map();
  edges.forEach((edge) => {
    if (!edge?.start || !edge?.end) return;
    degrees.set(edge.start, (degrees.get(edge.start) || 0) + 1);
    degrees.set(edge.end, (degrees.get(edge.end) || 0) + 1);
  });
  const candidates = Array.from(degrees.entries())
    .filter(([, degree]) => degree >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 10);

  let checked = 0;
  let totalLegacy = 0;
  let totalNew = 0;
  for (let i = 0; i < candidates.length && checked < 15; i += 1) {
    for (let j = i + 1; j < candidates.length && checked < 15; j += 1) {
      const startId = candidates[i];
      const goalId = candidates[j];
      const startPos = nodesById.get(startId)?.pos;
      const goalPos = nodesById.get(goalId)?.pos;
      if (!startPos || !goalPos) continue;
      const legacy = planLegacyRoute(nodes, edges, startPos, goalPos);
      if (!legacy?.edgeKeys?.length) continue;
      const legacyPath = pathNodesFromEdgeKeys(legacy.edgeKeys);
      const legacyTurn = computeTurnCost(legacyPath, nodesById);
      checked += 1;
      const bundle = buildBundle({
        nodes,
        edges,
        lines,
        robots: [{ id: "RB-01", pos: { ...startPos } }]
      });
      await withSim(bundle, async (sim) => {
        const route = startManualRoute(sim, "RB-01", goalPos);
        const newPath = (route.pathNodes || []).filter((id) => nodesById.has(id));
        const newTurn = computeTurnCost(newPath, nodesById);
        totalLegacy += legacyTurn;
        totalNew += newTurn;
      });
    }
  }

  assert.ok(checked >= 5, "Expected candidate pairs on traffic graph");
  assert.ok(
    totalNew <= totalLegacy * 1.05,
    "New planner should not increase turn cost on traffic graph"
  );
}

async function testTrafficSceneAnchorSavings() {
  const graph = loadTrafficGraph();
  const nodesById = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const candidates = (graph.edges || []).filter((edge) => {
    const endpoints = edgeEndpoints(edge, nodesById);
    if (!endpoints) return false;
    const directionRaw = edge.props?.direction;
    const direction = Number.isFinite(Number(directionRaw)) ? Number(directionRaw) : 0;
    return !(direction === 1 || direction === 2 || direction === -1);
  });

  const edgesByNode = new Map();
  candidates.forEach((edge) => {
    [edge.start, edge.end].forEach((nodeId) => {
      if (!edgesByNode.has(nodeId)) edgesByNode.set(nodeId, []);
      edgesByNode.get(nodeId).push(edge);
    });
  });

  let best = null;
  edgesByNode.forEach((edgeList, nodeId) => {
    if (edgeList.length < 2) return;
    for (let i = 0; i < edgeList.length; i += 1) {
      for (let j = i + 1; j < edgeList.length; j += 1) {
        const edgeA = edgeList[i];
        const edgeB = edgeList[j];
        const endpointsA = edgeEndpoints(edgeA, nodesById);
        const endpointsB = edgeEndpoints(edgeB, nodesById);
        const lenA = edgeLengthFromEndpoints(endpointsA);
        const lenB = edgeLengthFromEndpoints(endpointsB);
        const score = lenA + lenB;
        if (!best || score > best.score) {
          best = {
            hubId: nodeId,
            edgeA,
            edgeB,
            endpointsA,
            endpointsB,
            lenA,
            lenB,
            score
          };
        }
      }
    }
  });

  assert.ok(best, "Expected a bidirectional corridor in traffic scene");
  const farA = best.edgeA.start === best.hubId ? best.edgeA.end : best.edgeA.start;
  const farB = best.edgeB.start === best.hubId ? best.edgeB.end : best.edgeB.start;
  const startT = best.edgeA.start === best.hubId ? 0.75 : 0.25;
  const goalT = best.edgeB.start === best.hubId ? 0.75 : 0.25;
  const startPos = pointAlongEdge(best.edgeA, best.endpointsA, startT);
  const goalPos = pointAlongEdge(best.edgeB, best.endpointsB, goalT);
  assert.ok(startPos && goalPos, "Expected start/goal points on traffic edges");

  const nodes = [best.hubId, farA, farB]
    .map((id) => nodesById.get(id))
    .filter(Boolean);
  const edges = [best.edgeA, best.edgeB].map((edge) => ({
    id: edge.id,
    start: edge.start,
    end: edge.end,
    startPos: edge.startPos,
    endPos: edge.endPos,
    controlPos1: edge.controlPos1,
    controlPos2: edge.controlPos2,
    props: edge.props
  }));
  const robots = [{ id: "RB-01", pos: { ...startPos } }];
  const bundle = buildBundle({ nodes, edges, lines: [], robots });

  await withSim(bundle, async (sim) => {
    const route = startManualRoute(sim, "RB-01", goalPos);
    const newLength = routeLength(route);
    const legacy = planLegacyRoute(nodes, edges, startPos, goalPos);
    assert.ok(legacy, "Expected legacy baseline route");
    const legacyLength = legacy.totalLength;
    const margin = Math.max(1, 0.2 * (best.lenA + best.lenB));
    assert.ok(
      newLength < legacyLength - margin,
      "Traffic subgraph should show anchor distance savings"
    );
  });
}

async function run() {
  await testAnchorSnapImprovesDistance();
  await testTemporalReservationAvoidsCorridor();
  await testTimeWindowSingleCorridor();
  await testSippSegmentedCorridorReleasesEarlier();
  await testSippConvoyWaitDrops();
  await testSippLengthScaling();
  await testBestStrategyCorridorAdvantage();
  await testBestStrategyConvoyAdvantage();
  await testSippPartialCorridorGoal();
  await testSippBranchMidExit();
  await testSippRollingAdmission();
  await testSippLateJoinerWhileInside();
  await testSippStaggeredStream();
  await testSippConvoyMakespan();
  if (!blockAvoidanceTest("testSippAvoidanceLockDetours", "Uses avoidance/obstacle detours.")) {
    await testSippAvoidanceLockDetours();
  }
  await testSippSlowFastConvoy();
  await testSippSpeedProfiles();
  if (!blockAvoidanceTest("testSippHeteroWidthAvoidance", "Uses avoidance obstacles for width gating.")) {
    await testSippHeteroWidthAvoidance();
  }
  await testSippMultiEntryMerge();
  await testSippIntermediateStopWaypoint();
  await testSippPriorityAdmission();
  await testSippPriorityPreemption();
  await testSippPrioritySla();
  await testSippReservationHorizonStress();
  await testSippBidirectionalPassingBay();
  await testSippIdleRobotMidCorridor();
  await testSippPausedLeaderMidCorridor();
  await testSippDetourChoiceFlip();
  if (!blockAvoidanceTest("testSippPartialGoalObstacleAhead", "Uses obstacle blocking.")) {
    await testSippPartialGoalObstacleAhead();
  }
  await testSippMultipleIdleBlockers();
  await testSippCancelMidCorridor();
  await testSippMultiEntryFairness();
  await testSippMultiEntryOppositeFlowFairness();
  await testSippSegmentLengthSweep();
  await testSippSegmentLengthUpdate();
  await testSippCrossTrafficTrunk();
  await testSippRollingFeedPoints();
  await testSippNodeReservationQueue();
  await testSippIntersectionThroughput();
  if (!blockAvoidanceTest("testSippVariableWidthObstacles", "Uses obstacle avoidance.")) {
    await testSippVariableWidthObstacles();
  }
  await testSippQueueChurnRecovery();
  await testSippAlternatingFlow();
  await testSippOppositeLateJoiner();
  await testSippShortHorizonLongCorridor();
  await testSippHeavyBurst();
  await testSippMonteCarloEntries();
  await testSippMonteCarloMultiSeed();
  await testSippCurvedCorridorEntry();
  if (!blockAvoidanceTest("testSippDynamicObstacleMidCorridor", "Uses dynamic obstacles.")) {
    await testSippDynamicObstacleMidCorridor();
  }
  if (!blockAvoidanceTest("testSippMovingObstacleCrossing", "Uses moving obstacles.")) {
    await testSippMovingObstacleCrossing();
  }
  await testSippMixedSpeedPriorityOpposite();
  await testSippLargeScaleRandom();
  await testSippRuntimeStrategySwitch();
  await testSippStreamingOppositeFlow();
  await testSippYieldBayStress();
  await testSippTeleopAutoBlock();
  await testTimeWindowOppositeDirections();
  await testEntryHoldOppositeDirections();
  await testYieldResumesWithoutResumePhase();
  await testYieldClearsWhenResumeMissing();
  await testNoYieldNoReverseSingleRobot();
  await testNoYieldNoReverseParallelLanes();
  await testNoYieldNoReverseSameDirectionConvoy();
  await testNoYieldNoReverseStaggeredIntersection();
  await testNoYieldNoReverseMultiLaneThreeRobots();
  await testNoYieldNoReverseParallelStreams();
  await testNoTurnaroundOppositeDirections();
  await testTimeWindowNoStarvation();
  await testRollingHorizonReservations();
  await testWaitBeatsDetour();
  await testScheduleMatchesRuntime();
  await testRuntimeScheduleOrderMultiRobot();
  await testCancelReleasesReservation();
  await testCancelAdvancesWaitingRobot();
  await testNodeReservationIntersection();
  if (!blockAvoidanceTest("testObstacleBlocksEdge", "Uses obstacle blocking.")) {
    await testObstacleBlocksEdge();
  }
  if (!blockAvoidanceTest("testAvoidObstacleDetoursWithoutReplan", "Uses avoidance obstacles.")) {
    await testAvoidObstacleDetoursWithoutReplan();
  }
  if (!blockAvoidanceTest("testAnchorBlockedDetour", "Uses obstacle blocking.")) {
    await testAnchorBlockedDetour();
  }
  if (!blockAvoidanceTest("testReplanAfterObstacle", "Uses obstacle replan.")) {
    await testReplanAfterObstacle();
  }
  if (!blockAvoidanceTest("testAutoReplanOnObstacle", "Uses obstacle replan.")) {
    await testAutoReplanOnObstacle();
  }
  if (!blockAvoidanceTest("testReplanAfterObstacleRemoval", "Uses obstacle replan/removal.")) {
    await testReplanAfterObstacleRemoval();
  }
  if (!blockAvoidanceTest("testReplanWhileWaitingWindow", "Uses obstacle replan.")) {
    await testReplanWhileWaitingWindow();
  }
  await testBackwardPenaltyPrefersForward();
  await testDirectionalLineBlocksReverse();
  await testDirectionalLineDirectionPos();
  await testDirectionalLineAnchorDirectionPos();
  await testDirectionalLineDiagonal();
  await testDirectionalLineBezier();
  await testNoBackwardSkipsReverseDrive();
  await testJitterStability();
  await testOverlapReductionMultiRobot();
  await testRuntimeThroughputMultiRobot();
  await testBatchPlanningWorkload();
  await testManualReservationAffectsDispatch();
  await testDispatchCompletionThroughput();
  await testPredictedThroughput();
  await testPlannerPerformanceScaling();
  await testTrafficSmoothness();
  await testTrafficSceneAnchorSavings();
  console.log(
    "E2E routing planner ok: anchors, reservations, penalties, constraints, throughput, A/B (avoidance disabled)."
  );
}

run();
