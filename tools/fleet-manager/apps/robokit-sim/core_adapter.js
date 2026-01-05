const { createFleetSim } = require("@fleet-manager/sim-runtime");
const {
  normalizeRobokitTaskStatus,
  isRobokitTaskActive,
  isRobokitTaskPaused
} = require("@fleet-manager/core-types");

function findRobotSnapshot(status, robotId) {
  if (!status || !Array.isArray(status.robots)) {
    return null;
  }
  return status.robots.find((robot) => robot && robot.id === robotId) || null;
}

function findRobotDebug(debugState, robotId) {
  if (!debugState || !Array.isArray(debugState.robots)) {
    return null;
  }
  return debugState.robots.find((robot) => robot && robot.id === robotId) || null;
}

function normalizeRobotModel(model) {
  if (!model || typeof model !== 'object') return null;
  const head = Number(model.head);
  const tail = Number(model.tail);
  const width = Number(model.width);
  if (!Number.isFinite(head) || !Number.isFinite(tail) || !Number.isFinite(width)) {
    return null;
  }
  if (head <= 0 || tail <= 0 || width <= 0) return null;
  return { head, tail, width };
}

function createRobokitCoreAdapter({
  graph,
  robotId,
  startPose,
  tickMs,
  traffic,
  robotRadius,
  robotModel
}) {
  const sim = createFleetSim({ tickMs });
  const robot = {
    id: robotId,
    pos: { x: startPose.x, y: startPose.y },
    heading: Number.isFinite(startPose.angle) ? startPose.angle : 0,
    manualMode: true,
    dispatchable: false,
    controlled: true,
    online: true
  };
  const model = normalizeRobotModel(robotModel);
  if (model) {
    robot.model = model;
  }
  if (Number.isFinite(robotRadius)) {
    robot.radius = robotRadius;
  }
  const robotsConfig = { robots: [robot] };
  if (traffic) {
    robotsConfig.traffic = traffic;
  }
  const bundle = {
    graph,
    workflow: { bin_locations: {} },
    robotsConfig,
    packaging: null
  };

  sim.loadBundle(bundle);
  sim.setRobotManualMode(robotId, true);
  sim.setRobotDispatchable(robotId, false);
  sim.setRobotControlled(robotId, true);

  const taskState = { current: null, last: null, counter: 1 };

  const snapshotRobot = () => findRobotSnapshot(sim.getStatus(false), robotId);
  const debugRobot = () => findRobotDebug(sim.getDebugState(), robotId);

  const buildTask = (targetId, targetPoint) => ({
    id: `move-${taskState.counter++}`,
    targetId,
    targetPoint: targetPoint || null,
    taskType: 0,
    pathNodes: [],
    visitedNodes: [],
    pathIndex: 0,
    startedAt: Date.now(),
    completedAt: null
  });

  const updateTaskProgress = (task, currentStation) => {
    if (!task || !currentStation || !Array.isArray(task.pathNodes)) {
      return;
    }
    const idx = task.pathNodes.indexOf(currentStation);
    if (idx < 0) {
      return;
    }
    const nextIndex = Math.max(task.pathIndex || 0, idx + 1);
    task.pathIndex = nextIndex;
    task.visitedNodes = task.pathNodes.slice(0, nextIndex);
  };

  const resolvePathNodes = () => {
    const debug = debugRobot();
    const nodes = debug?.route?.pathNodes;
    return Array.isArray(nodes) ? nodes : [];
  };

  const goTarget = (targetId, nodesById) => {
    if (!targetId) {
      return { ok: false, error: 'missing_target' };
    }
    if (nodesById && !nodesById.has(targetId)) {
      return { ok: false, error: 'unknown_target' };
    }
    const ok = sim.goTarget(robotId, targetId, null);
    if (!ok) {
      return { ok: false, error: 'plan_failed' };
    }
    const targetNode = nodesById?.get(targetId) || null;
    const targetPoint = targetNode?.pos
      ? { x: targetNode.pos.x, y: targetNode.pos.y, angle: 0 }
      : null;
    const task = buildTask(targetId, targetPoint);
    const pathNodes = resolvePathNodes();
    task.pathNodes = pathNodes.length ? pathNodes : [targetId];
    task.pathIndex = task.pathNodes.length > 1 ? 1 : task.pathNodes.length;
    task.visitedNodes = task.pathNodes.length ? [task.pathNodes[0]] : [];
    taskState.current = task;
    return { ok: true, task };
  };

  const goPoint = (x, y, angle, nodesById) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { ok: false, error: 'missing_target' };
    }
    const ok = sim.goPoint(robotId, x, y, angle);
    if (!ok) {
      return { ok: false, error: 'plan_failed' };
    }
    let targetId = null;
    let targetPoint = { x, y, angle: Number.isFinite(angle) ? angle : 0 };
    if (nodesById) {
      let best = null;
      let bestDist = Infinity;
      for (const node of nodesById.values()) {
        const dx = node.pos.x - x;
        const dy = node.pos.y - y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = node;
        }
      }
      if (best) {
        targetId = best.id;
      }
    }
    const task = buildTask(targetId, targetPoint);
    const pathNodes = resolvePathNodes();
    task.pathNodes = pathNodes.length ? pathNodes : targetId ? [targetId] : [];
    task.pathIndex = task.pathNodes.length > 1 ? 1 : task.pathNodes.length;
    task.visitedNodes = task.pathNodes.length ? [task.pathNodes[0]] : [];
    taskState.current = task;
    return { ok: true, task };
  };

  const pause = () => sim.pause(robotId);
  const resume = () => sim.resume(robotId);

  const cancel = () => {
    const ok = sim.cancel(robotId);
    if (ok && taskState.current) {
      taskState.last = { ...taskState.current, completedAt: Date.now() };
      taskState.current = null;
    }
    return ok;
  };

  const stop = () => cancel();
  const motion = (payload) => sim.motion(robotId, payload);
  const translate = (dist, vx, vy) => sim.translate(robotId, dist, vx, vy);
  const turn = (angle) => sim.turn(robotId, angle);
  const reloc = (pose) => {
    cancel();
    return sim.setRobotPose(robotId, pose);
  };

  const addObstacle = (payload) => sim.addSimObstacle(payload);
  const clearObstacles = () => sim.clearObstacles();
  const removeObstacleById = (id) => sim.removeObstacleById(id);
  const listObstacles = () => sim.listObstacles();

  const syncRobot = (robotState, nodesById, opts = {}) => {
    const snapshot = snapshotRobot();
    if (!snapshot) {
      return null;
    }
    if (snapshot.pose && Number.isFinite(snapshot.pose.x) && Number.isFinite(snapshot.pose.y)) {
      robotState.pose = {
        x: snapshot.pose.x,
        y: snapshot.pose.y,
        angle: Number.isFinite(snapshot.pose.angle)
          ? snapshot.pose.angle
          : robotState.pose.angle
      };
    }
    const heading = Number.isFinite(robotState.pose.angle) ? robotState.pose.angle : 0;
    const speed = Number.isFinite(snapshot.speed) ? snapshot.speed : 0;
    robotState.velocity = {
      vx: Math.cos(heading) * speed,
      vy: Math.sin(heading) * speed,
      w: 0,
      steer: 0,
      spin: 0,
      r_vx: 0,
      r_vy: 0,
      r_w: 0,
      r_steer: 0,
      r_spin: 0
    };
    robotState.blocked = Boolean(snapshot.blocked);
    robotState.updatedAt = Date.now();

    if (nodesById && robotState.pose) {
      let nearest = null;
      let bestDist = Infinity;
      for (const node of nodesById.values()) {
        const dx = node.pos.x - robotState.pose.x;
        const dy = node.pos.y - robotState.pose.y;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = node;
        }
      }
      const threshold = Number.isFinite(opts.currentPointDist) ? opts.currentPointDist : null;
      if (nearest && (threshold === null || bestDist <= threshold)) {
        if (robotState.currentStation !== nearest.id) {
          robotState.lastStation = robotState.currentStation;
          robotState.currentStation = nearest.id;
        }
      }
    }

    const normalizedStatus = normalizeRobokitTaskStatus(snapshot.taskStatus);
    const active = isRobokitTaskActive(normalizedStatus);
    const paused = isRobokitTaskPaused(normalizedStatus);
    robotState.taskStatus = normalizedStatus;
    robotState.paused = paused;
    if (!active && taskState.current) {
      taskState.current.completedAt = taskState.current.completedAt || Date.now();
      taskState.last = taskState.current;
      taskState.current = null;
    }
    robotState.currentTask = taskState.current;
    robotState.lastTask = taskState.last;
    if (robotState.currentTask && robotState.currentStation) {
      updateTaskProgress(robotState.currentTask, robotState.currentStation);
    }
    return snapshot;
  };

  return {
    sim,
    taskState,
    goTarget,
    goPoint,
    pause,
    resume,
    cancel,
    stop,
    motion,
    translate,
    turn,
    reloc,
    addObstacle,
    clearObstacles,
    removeObstacleById,
    listObstacles,
    syncRobot
  };
}

module.exports = { createRobokitCoreAdapter };
