const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, 'public');
const SHARED_PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'packages', 'robokit-map-ui', 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, 'mock-config.json');
const CONFIG_PATH = process.env.FLEET_UI_MOCK_CONFIG || DEFAULT_CONFIG_PATH;
const DEFAULT_PORT = 8091;
const PORT = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const HOST = process.env.HOST || '0.0.0.0';
const URL_BASE = 'http://localhost';
const DEFAULT_STREAM_MS = 200;
const DEFAULT_SPEED_MPS = 0.6;
const MAX_STEP_S = 0.5;
const STATION_EPS_T = 0.12;
const STATION_EPS_DIST = 0.4;
const MOTION_EPS = 1e-4;
const BODY_LIMIT = 1_000_000;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.json5': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return fallback;
  }
}

const mockConfig = loadJson(CONFIG_PATH, {});
const dataConfig = mockConfig && typeof mockConfig === 'object' ? mockConfig.data || {} : {};
const simConfig = mockConfig && typeof mockConfig === 'object' ? mockConfig.sim || {} : {};
const scenesConfig = mockConfig && typeof mockConfig === 'object' ? mockConfig.scenes || {} : {};

function resolveDataPath(value, fallback) {
  if (!value) return fallback;
  if (path.isAbsolute(value)) return value;
  if (value.includes('/') || value.includes('\\')) return path.join(ROOT_DIR, value);
  return path.join(DATA_DIR, value);
}

const DATA_PATH_DEFAULTS = {
  graph: resolveDataPath(dataConfig.graph, path.join(DATA_DIR, 'graph.json')),
  workflow: resolveDataPath(dataConfig.workflow, path.join(DATA_DIR, 'workflow.json5')),
  packaging: resolveDataPath(dataConfig.packaging, path.join(DATA_DIR, 'packaging.json')),
  robots: resolveDataPath(dataConfig.robots, path.join(DATA_DIR, 'robots.json'))
};

const streamIntervalMs = Number.isFinite(simConfig.pollMs) ? simConfig.pollMs : DEFAULT_STREAM_MS;
const defaultSpeed = Number.isFinite(simConfig.speed) ? simConfig.speed : DEFAULT_SPEED_MPS;
const simModeValue = typeof simConfig.simMode === 'string' ? simConfig.simMode.toLowerCase() : 'robokit';
const simMode = ['local', 'robokit'].includes(simModeValue) ? simModeValue : 'robokit';
const simModeMutable = Boolean(simConfig.simModeMutable);

let activeDataPaths = { ...DATA_PATH_DEFAULTS };
let graphData = loadJson(activeDataPaths.graph, { nodes: [], edges: [] });
let workflowData = loadJson(activeDataPaths.workflow, null);
let packagingConfig = loadJson(activeDataPaths.packaging, null);
let robotsConfig = loadJson(activeDataPaths.robots, { robots: [] });
const scenesState = {
  activeSceneId: scenesConfig.activeSceneId || null,
  scenes: Array.isArray(scenesConfig.scenes) ? scenesConfig.scenes : []
};

let nodesById = new Map();
let edges = [];

function resolveStartNodeId(robot) {
  const candidate = robot.ref || robot.point || robot.start;
  if (candidate && nodesById.has(candidate)) return candidate;
  return edges[0]?.start || null;
}

function findEdgeIndexForNode(nodeId) {
  if (!nodeId) return 0;
  const index = edges.findIndex((edge) => edge.start === nodeId || edge.end === nodeId);
  return index >= 0 ? index : 0;
}

function buildSimRobots(config) {
  const list = Array.isArray(config?.robots) ? config.robots : [];
  if (!list.length && edges.length > 0) {
    return [
      {
        id: 'RB-01',
        speed: defaultSpeed,
        battery: 80,
        edgeIndex: 0,
        t: 0,
        dir: 1,
        heading: 0,
        pos: { ...edges[0].startPos },
        currentStation: edges[0].start || null,
        lastStation: edges[0].start || null,
        manualMode: false,
        dispatchable: true,
        controlled: true,
        navPaused: false,
        target: null,
        manualMotion: null
      }
    ];
  }

  return list.map((robot, index) => {
    const nodeId = resolveStartNodeId(robot);
    const edgeIndex = findEdgeIndexForNode(nodeId);
    const edge = edges[edgeIndex];
    const startPos = robot.pos || nodesById.get(nodeId) || edge?.startPos || { x: 0, y: 0 };
    const speed = Number.isFinite(robot.speed) ? robot.speed : defaultSpeed + index * 0.05;
    const battery = Number.isFinite(robot.battery) ? robot.battery : 80;
    return {
      id: robot.id || `RB-${String(index + 1).padStart(2, '0')}`,
      speed,
      battery,
      edgeIndex,
      t: 0,
      dir: 1,
      heading: Number.isFinite(robot.heading) ? robot.heading : 0,
      pos: { ...startPos },
      currentStation: nodeId,
      lastStation: nodeId,
      manualMode: Boolean(robot.manualMode),
      dispatchable: robot.dispatchable !== false,
      controlled: robot.controlled !== false,
      navPaused: false,
      target: null,
      manualMotion: null
    };
  });
}

function buildWorksites(data) {
  if (!data || typeof data !== 'object') return [];
  const locations = data.bin_locations || {};
  return Object.keys(locations).map((id) => ({
    id,
    filled: false,
    blocked: false
  }));
}

const rebuildGraphCaches = (graph) => {
  nodesById = new Map(
    (graph?.nodes || [])
      .filter((node) => node && node.id && node.pos)
      .map((node) => [node.id, node.pos])
  );

  edges = (graph?.edges || [])
    .map((edge, index) => {
      if (!edge) return null;
      const startPos = edge.startPos || nodesById.get(edge.start);
      const endPos = edge.endPos || nodesById.get(edge.end);
      if (!startPos || !endPos) return null;
      const dx = endPos.x - startPos.x;
      const dy = endPos.y - startPos.y;
      const length = Math.hypot(dx, dy);
      return {
        id: edge.id || `edge-${index}`,
        start: edge.start || null,
        end: edge.end || null,
        startPos,
        endPos,
        length: Math.max(length, 0.001)
      };
    })
    .filter(Boolean);
};

const resolveSceneMap = (scene, mapId) => {
  if (!scene) return null;
  const maps = Array.isArray(scene.maps) ? scene.maps : [];
  if (!maps.length) return null;
  if (mapId) {
    const direct = maps.find((map) => map.id === mapId);
    if (direct) return direct;
  }
  if (scene.activeMapId) {
    const active = maps.find((map) => map.id === scene.activeMapId);
    if (active) return active;
  }
  return maps[0];
};

const resolveSceneDataPaths = (scene, map) => {
  const sceneData = scene?.data || {};
  const mapData = map?.data || {};
  const graphFile = mapData.graph || map?.graph || map?.fileName || sceneData.graph || dataConfig.graph;
  const workflowFile = mapData.workflow || map?.workflow || sceneData.workflow || dataConfig.workflow;
  const robotsFile = mapData.robots || map?.robots || sceneData.robots || dataConfig.robots;
  const packagingFile = mapData.packaging || map?.packaging || sceneData.packaging || dataConfig.packaging;
  return {
    graph: resolveDataPath(graphFile, DATA_PATH_DEFAULTS.graph),
    workflow: resolveDataPath(workflowFile, DATA_PATH_DEFAULTS.workflow),
    robots: resolveDataPath(robotsFile, DATA_PATH_DEFAULTS.robots),
    packaging: resolveDataPath(packagingFile, DATA_PATH_DEFAULTS.packaging)
  };
};

const simState = {
  lastTick: Date.now(),
  robots: [],
  worksites: []
};

const applyActiveDataPaths = (paths) => {
  activeDataPaths = { ...activeDataPaths, ...paths };
  graphData = loadJson(activeDataPaths.graph, { nodes: [], edges: [] });
  workflowData = loadJson(activeDataPaths.workflow, null);
  packagingConfig = loadJson(activeDataPaths.packaging, null);
  robotsConfig = loadJson(activeDataPaths.robots, { robots: [] });
  rebuildGraphCaches(graphData);
  simState.lastTick = Date.now();
  simState.robots = buildSimRobots(robotsConfig);
  simState.worksites = buildWorksites(workflowData);
};

const applySceneSelection = (sceneId, mapId) => {
  let scene = scenesState.scenes.find((item) => item.id === sceneId) || null;
  if (!scene && scenesState.scenes.length) {
    scene = scenesState.scenes[0];
  }
  if (scene) {
    scenesState.activeSceneId = scene.id;
    const map = resolveSceneMap(scene, mapId);
    if (map?.id) {
      scene.activeMapId = map.id;
    }
    const paths = resolveSceneDataPaths(scene, map);
    applyActiveDataPaths(paths);
    return { activeSceneId: scene.id, activeMapId: scene.activeMapId || null };
  }
  scenesState.activeSceneId = null;
  applyActiveDataPaths(DATA_PATH_DEFAULTS);
  return { activeSceneId: null, activeMapId: null };
};

applySceneSelection(scenesState.activeSceneId, null);

function clampDeltaSec(delta) {
  if (!Number.isFinite(delta) || delta < 0) return 0;
  return Math.min(delta, MAX_STEP_S);
}

function calcHeading(edge, dir) {
  if (!edge) return 0;
  const dx = edge.endPos.x - edge.startPos.x;
  const dy = edge.endPos.y - edge.startPos.y;
  const base = Math.atan2(dy, dx);
  return dir >= 0 ? base : base + Math.PI;
}

function lerpPoint(startPos, endPos, t) {
  return {
    x: startPos.x + (endPos.x - startPos.x) * t,
    y: startPos.y + (endPos.y - startPos.y) * t
  };
}

function distance(a, b) {
  if (!a || !b) return Infinity;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function findNearestNode(pos) {
  if (!pos) return null;
  let nearestId = null;
  let nearestDist = Infinity;
  for (const [id, nodePos] of nodesById.entries()) {
    const d = distance(pos, nodePos);
    if (d < nearestDist) {
      nearestDist = d;
      nearestId = id;
    }
  }
  return nearestDist <= STATION_EPS_DIST ? nearestId : null;
}

function applyTargetMotion(robot, deltaSec) {
  if (!robot.target) return false;
  const target = robot.target;
  const dx = target.x - robot.pos.x;
  const dy = target.y - robot.pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= MOTION_EPS) {
    robot.pos = { x: target.x, y: target.y };
    robot.target = null;
    const nearest = findNearestNode(robot.pos);
    if (nearest) {
      robot.currentStation = nearest;
      robot.lastStation = nearest;
    }
    return true;
  }
  const step = robot.speed * deltaSec;
  if (step >= dist) {
    robot.pos = { x: target.x, y: target.y };
    robot.target = null;
    const nearest = findNearestNode(robot.pos);
    if (nearest) {
      robot.currentStation = nearest;
      robot.lastStation = nearest;
    }
    robot.heading = Math.atan2(dy, dx);
    return true;
  }
  const ux = dx / dist;
  const uy = dy / dist;
  robot.pos = {
    x: robot.pos.x + ux * step,
    y: robot.pos.y + uy * step
  };
  robot.heading = Math.atan2(dy, dx);
  robot.currentStation = null;
  return true;
}

function applyManualMotion(robot, deltaSec) {
  const motion = robot.manualMotion;
  if (!motion) return false;
  const vx = Number.isFinite(motion.vx) ? motion.vx : 0;
  const vy = Number.isFinite(motion.vy) ? motion.vy : 0;
  const w = Number.isFinite(motion.w) ? motion.w : 0;
  if (Math.abs(vx) < MOTION_EPS && Math.abs(vy) < MOTION_EPS && Math.abs(w) < MOTION_EPS) {
    return false;
  }
  robot.heading += w * deltaSec;
  const cos = Math.cos(robot.heading);
  const sin = Math.sin(robot.heading);
  robot.pos = {
    x: robot.pos.x + (vx * cos - vy * sin) * deltaSec,
    y: robot.pos.y + (vx * sin + vy * cos) * deltaSec
  };
  robot.currentStation = null;
  return true;
}

function stepRobotAuto(robot, deltaSec) {
  if (!edges.length) return;
  let edge = edges[robot.edgeIndex];
  if (!edge) {
    robot.edgeIndex = 0;
    edge = edges[0];
  }
  let remaining = robot.speed * deltaSec;
  while (remaining > 0 && edge) {
    const edgeLen = edge.length;
    const distanceToEnd = robot.dir >= 0 ? (1 - robot.t) * edgeLen : robot.t * edgeLen;
    if (remaining >= distanceToEnd) {
      remaining -= distanceToEnd;
      robot.t = robot.dir >= 0 ? 0 : 1;
      if (robot.dir >= 0) {
        robot.lastStation = edge.end || robot.lastStation;
        robot.edgeIndex = (robot.edgeIndex + 1) % edges.length;
      } else {
        robot.lastStation = edge.start || robot.lastStation;
        robot.edgeIndex = (robot.edgeIndex - 1 + edges.length) % edges.length;
      }
      edge = edges[robot.edgeIndex];
      continue;
    }
    const deltaT = (remaining / edgeLen) * robot.dir;
    robot.t += deltaT;
    remaining = 0;
  }
  robot.heading = calcHeading(edge, robot.dir);
  robot.pos = lerpPoint(edge.startPos, edge.endPos, robot.t);
  const nearStart = robot.t <= STATION_EPS_T;
  const nearEnd = robot.t >= 1 - STATION_EPS_T;
  robot.currentStation = nearStart ? edge.start : nearEnd ? edge.end : null;
}

function stepRobot(robot, deltaSec) {
  if (robot.navPaused && !robot.manualMode) return;
  if (robot.manualMode) {
    if (applyManualMotion(robot, deltaSec)) return;
    if (applyTargetMotion(robot, deltaSec)) return;
    return;
  }
  if (applyTargetMotion(robot, deltaSec)) return;
  stepRobotAuto(robot, deltaSec);
}

function advanceSim() {
  const now = Date.now();
  const deltaSec = clampDeltaSec((now - simState.lastTick) / 1000);
  simState.lastTick = now;
  simState.robots.forEach((robot) => {
    stepRobot(robot, deltaSec);
    robot.battery = Math.max(0, Math.min(100, robot.battery - deltaSec * 0.005));
  });
}

function buildFleetState() {
  advanceSim();
  return {
    robots: simState.robots.map((robot) => ({
      id: robot.id,
      pose: { x: robot.pos.x, y: robot.pos.y, angle: robot.heading },
      speed: robot.speed,
      battery: robot.battery,
      blocked: false,
      dispatchable: robot.dispatchable,
      online: true,
      controlled: robot.controlled,
      manualMode: robot.manualMode,
      currentStation: robot.currentStation,
      lastStation: robot.lastStation,
      taskStatus: robot.navPaused ? 3 : robot.target ? 2 : null,
      state: robot.manualMode ? 'manual' : null
    })),
    tasks: [],
    worksites: simState.worksites
  };
}

function resolvePath(requestUrl) {
  const parsed = new URL(requestUrl, URL_BASE);
  const decoded = decodeURIComponent(parsed.pathname || '/');
  const safePath = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(ROOT_DIR, safePath);
}

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(body);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  send(res, statusCode, body, { 'Content-Type': 'application/json; charset=utf-8' });
}

function sendOk(res) {
  sendJson(res, 200, { ok: true, result: { ret_code: 0 } });
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    send(res, 200, data, { 'Content-Type': type });
  });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const buffer = await readBody(req, BODY_LIMIT);
  if (!buffer.length) return null;
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (_err) {
    return null;
  }
}

const streamClients = new Set();
let streamTimer = null;

function startStreamTimer() {
  if (streamTimer) return;
  streamTimer = setInterval(() => {
    if (!streamClients.size) {
      clearInterval(streamTimer);
      streamTimer = null;
      return;
    }
    const payload = buildFleetState();
    const data = `event: state\ndata: ${JSON.stringify({ ok: true, ...payload })}\n\n`;
    streamClients.forEach((res) => {
      try {
        res.write(data);
      } catch (_err) {
        streamClients.delete(res);
      }
    });
  }, streamIntervalMs);
}

function handleFleetStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff'
  });
  res.write(':\n\n');
  streamClients.add(res);
  startStreamTimer();
  req.on('close', () => {
    streamClients.delete(res);
  });
}

function getRobotById(id) {
  return simState.robots.find((robot) => robot.id === id);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function handleRobotCommand(req, res, robotId, action) {
  const robot = getRobotById(robotId);
  if (!robot) {
    send(res, 404, 'robot not found');
    return;
  }
  const payload = await readJsonBody(req);

  if (action === 'manual') {
    const enabled = Boolean(payload?.enabled);
    robot.manualMode = enabled;
    if (!enabled) {
      robot.manualMotion = null;
      robot.target = null;
    }
    sendOk(res);
    return;
  }

  if (action === 'motion') {
    const vx = toNumber(payload?.vx) ?? 0;
    const vy = toNumber(payload?.vy) ?? 0;
    const w = toNumber(payload?.w) ?? 0;
    robot.manualMode = true;
    robot.manualMotion = { vx, vy, w };
    robot.target = null;
    sendOk(res);
    return;
  }

  if (action === 'go-point') {
    const x = toNumber(payload?.x);
    const y = toNumber(payload?.y);
    if (x == null || y == null) {
      send(res, 400, 'invalid target');
      return;
    }
    robot.manualMode = true;
    robot.manualMotion = null;
    robot.navPaused = false;
    robot.target = { x, y };
    sendOk(res);
    return;
  }

  if (action === 'go-target') {
    const targetId = payload?.id;
    const pos = targetId ? nodesById.get(targetId) : null;
    if (!pos) {
      send(res, 404, 'target not found');
      return;
    }
    robot.manualMode = true;
    robot.manualMotion = null;
    robot.navPaused = false;
    robot.target = { x: pos.x, y: pos.y };
    sendOk(res);
    return;
  }

  if (action === 'pause') {
    robot.navPaused = true;
    sendOk(res);
    return;
  }

  if (action === 'resume') {
    robot.navPaused = false;
    sendOk(res);
    return;
  }

  if (action === 'cancel') {
    robot.target = null;
    robot.manualMotion = null;
    robot.navPaused = false;
    sendOk(res);
    return;
  }

  if (action === 'control') {
    robot.controlled = Boolean(payload?.controlled);
    sendOk(res);
    return;
  }

  if (action === 'dispatchable') {
    robot.dispatchable = Boolean(payload?.dispatchable);
    sendOk(res);
    return;
  }

  send(res, 404, 'unknown action');
}

async function handleWorksiteUpdate(req, res, siteId) {
  const payload = await readJsonBody(req);
  const site = simState.worksites.find((item) => item.id === siteId);
  if (!site) {
    send(res, 404, 'worksite not found');
    return;
  }
  if (payload && typeof payload === 'object') {
    if (typeof payload.filled === 'boolean') {
      site.filled = payload.filled;
    }
    if (typeof payload.blocked === 'boolean') {
      site.blocked = payload.blocked;
    }
  }
  sendOk(res);
}

const DATA_ROUTE_KEYS = new Map([
  ['/data/graph.json', 'graph'],
  ['/data/workflow.json5', 'workflow'],
  ['/data/packaging.json', 'packaging'],
  ['/data/robots.json', 'robots']
]);

const resolveActiveDataPath = (pathname) => {
  const key = DATA_ROUTE_KEYS.get(pathname);
  if (!key) return null;
  return activeDataPaths[key] || DATA_PATH_DEFAULTS[key] || null;
};

async function handleApi(req, res, pathname) {
  if (pathname === '/api/scenes' && req.method === 'GET') {
    sendJson(res, 200, scenesState);
    return;
  }

  if (pathname === '/api/scenes/activate' && req.method === 'POST') {
    const payload = await readJsonBody(req);
    const sceneId = payload?.sceneId || null;
    const mapId = payload?.mapId || null;
    const result = applySceneSelection(sceneId, mapId);
    sendJson(res, 200, result);
    return;
  }

  if (pathname === '/api/fleet/config' && req.method === 'GET') {
    sendJson(res, 200, {
      apiBase: '/api/fleet',
      statePath: '/api/fleet/state',
      streamPath: '/api/fleet/stream',
      pollMs: streamIntervalMs,
      simMode,
      simModeMutable,
      coreConfigured: true
    });
    return;
  }

  if ((pathname === '/api/fleet/state' || pathname === '/api/fleet/status') && req.method === 'GET') {
    sendJson(res, 200, buildFleetState());
    return;
  }

  if (pathname === '/api/fleet/stream' && req.method === 'GET') {
    handleFleetStream(req, res);
    return;
  }

  if (req.method === 'POST') {
    const robotMatch = pathname.match(/^\/api\/fleet\/robots\/([^/]+)\/([^/]+)$/);
    if (robotMatch) {
      const robotId = decodeURIComponent(robotMatch[1]);
      const action = robotMatch[2];
      await handleRobotCommand(req, res, robotId, action);
      return;
    }
    const worksiteMatch = pathname.match(/^\/api\/fleet\/worksites\/([^/]+)$/);
    if (worksiteMatch) {
      const siteId = decodeURIComponent(worksiteMatch[1]);
      await handleWorksiteUpdate(req, res, siteId);
      return;
    }
  }

  send(res, 404, 'not found');
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    send(res, 400, 'bad request');
    return;
  }

  const parsedUrl = new URL(req.url, URL_BASE);
  const pathname = parsedUrl.pathname || '/';

  if (pathname.startsWith('/api/')) {
    await handleApi(req, res, pathname);
    return;
  }

  if (pathname.startsWith('/shared/')) {
    const rel = pathname.replace('/shared/', '');
    const filePath = path.resolve(SHARED_PUBLIC_DIR, rel);
    sendFile(res, filePath);
    return;
  }

  const dataPath = resolveActiveDataPath(pathname);
  if (dataPath) {
    sendFile(res, dataPath);
    return;
  }

  if (req.method !== 'GET') {
    send(res, 405, 'Method not allowed');
    return;
  }

  let filePath = resolvePath(req.url);
  if (!filePath.startsWith(ROOT_DIR)) {
    send(res, 403, 'Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    sendFile(res, path.join(ROOT_DIR, 'index.html'));
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`fleet-ui-mock listening on http://${HOST}:${PORT}`);
  console.log(`serving ${ROOT_DIR}`);
});
