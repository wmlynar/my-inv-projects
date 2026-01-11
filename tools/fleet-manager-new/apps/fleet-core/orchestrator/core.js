const {
  normalizeRobot,
  normalizeTask,
  cloneTask
} = require('./model');
const { buildGraph, planRoute, concatRoutes } = require('./graph');
const { buildMapIndex } = require('./map_index');
const { buildRoutePlan } = require('./route_plan');
const { estimateProgress } = require('./progress');
const { buildCorridorRequest } = require('./corridor_requests');
const { lockManagerTick } = require('./lock_manager_dcl');
const { computeHoldPoint } = require('./hold_point');
const { selectRollingTarget } = require('./rtp_controller');
const { buildCommandForStep } = require('./adapter');

const DEFAULT_OPTIONS = {
  speedMps: 1.0,
  lockLookaheadM: 3.0,
  lockLookbackM: 0.5,
  stopDistanceM: 0.0,
  holdSafetyBufferM: 0.0,
  telemetryTimeoutMs: null
};

class Orchestrator {
  constructor(compiledMap, options = {}) {
    this.graph = buildGraph(compiledMap);
    this.mapIndex = buildMapIndex(compiledMap);
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.logSink = options.logSink || null;
  }

  serializeLocks(locks) {
    if (!locks || typeof locks !== 'object') return null;
    const snapshot = locks.snapshot || {};
    const corridorDirState = [];
    const cellOwners = [];

    if (snapshot.corridorDirState instanceof Map) {
      snapshot.corridorDirState.forEach((value, corridorId) => {
        corridorDirState.push({
          corridorId,
          dir: value?.dir || null,
          holders: Array.from(value?.holders || []).sort()
        });
      });
      corridorDirState.sort((a, b) => a.corridorId.localeCompare(b.corridorId));
    } else if (Array.isArray(snapshot.corridorDirState)) {
      corridorDirState.push(...snapshot.corridorDirState);
    }

    if (snapshot.cellOwners instanceof Map) {
      snapshot.cellOwners.forEach((robotId, cellId) => {
        cellOwners.push({ cellId, robotId });
      });
      cellOwners.sort((a, b) => a.cellId.localeCompare(b.cellId));
    } else if (Array.isArray(snapshot.cellOwners)) {
      cellOwners.push(...snapshot.cellOwners);
    }

    return {
      grants: locks.grants || [],
      snapshot: {
        corridorDirState,
        cellOwners
      }
    };
  }

  step(input) {
    const nowMs = Number.isFinite(input?.nowMs) ? input.nowMs : Date.now();
    const robots = Array.isArray(input?.robots) ? input.robots.map(normalizeRobot) : [];
    const tasks = Array.isArray(input?.tasks) ? input.tasks.map(normalizeTask) : [];
    const existingReservations = Array.isArray(input?.reservations) ? input.reservations : [];

    const robotById = new Map();
    robots.forEach((robot) => robotById.set(robot.robotId, robot));

    const updatedTasks = tasks.map(cloneTask);
    const taskById = new Map();
    updatedTasks.forEach((task) => taskById.set(task.taskId, task));

    const assignments = [];
    const usedRobots = new Set();

    const availableRobots = robots
      .filter((robot) => robot.status === 'online' && !robot.blocked)
      .sort((a, b) => a.robotId.localeCompare(b.robotId));
    const openTasks = updatedTasks
      .filter((task) => task.status === 'created' && !task.assignedRobotId)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.taskId.localeCompare(b.taskId);
      });

    for (const task of openTasks) {
      let best = null;
      for (const robot of availableRobots) {
        if (usedRobots.has(robot.robotId)) continue;
        const route = computeTaskRoute(this.graph, robot.nodeId, task.fromNodeId, task.toNodeId);
        if (!route) continue;
        const penalty = Number.isFinite(robot.pendingTasks) ? robot.pendingTasks : 0;
        const cost = route.lengthM + penalty * 10;
        if (!best || cost < best.cost || (cost === best.cost && robot.robotId < best.robot.robotId)) {
          best = { robot, cost, route };
        }
      }
      if (!best) continue;
      usedRobots.add(best.robot.robotId);
      assignments.push({ taskId: task.taskId, robotId: best.robot.robotId, cost: best.cost });
      const assigned = taskById.get(task.taskId);
      assigned.assignedRobotId = best.robot.robotId;
      assigned.status = assigned.status === 'created' ? 'assigned' : assigned.status;
    }

    const moveCommands = [];
    const immediateCommands = [];
    const holds = [];
    const diagnostics = [];
    const corridorRequests = [];
    const routePlansByRobot = new Map();

    for (const task of updatedTasks) {
      if (!task.assignedRobotId) continue;
      const robot = robotById.get(task.assignedRobotId);
      if (!robot || robot.status !== 'online' || robot.blocked) continue;

      if (!Array.isArray(task.steps) || task.steps.length === 0) {
        task.steps = buildStepsForTask(task);
      }

      let currentIndex = task.steps.findIndex((step) => step.status !== 'completed');
      if (currentIndex < 0) {
        task.status = 'completed';
        continue;
      }

      const step = task.steps[currentIndex];
      if (step.type === 'moveTo') {
        if (robot.nodeId && step.targetRef?.nodeId && robot.nodeId === step.targetRef.nodeId) {
          step.status = 'completed';
          currentIndex = task.steps.findIndex((entry) => entry.status !== 'completed');
          if (currentIndex < 0) {
            task.status = 'completed';
            continue;
          }
        }
      }

      const activeIndex = task.steps.findIndex((entry) => entry.status !== 'completed');
      const activeStep = activeIndex >= 0 ? task.steps[activeIndex] : null;
      if (!activeStep) {
        task.status = 'completed';
        continue;
      }

      if (task.status === 'assigned') {
        task.status = 'running';
      }

      if (activeStep.status === 'pending') {
        activeStep.status = 'running';
      }

      if (activeStep.type === 'moveTo') {
        const routePlan = buildRoutePlan(this.graph, robot.nodeId, activeStep.targetRef?.nodeId, {
          robotId: robot.robotId
        });
        if (!routePlan) {
          holds.push({ robotId: robot.robotId, reason: 'no_route' });
          diagnostics.push({ taskId: task.taskId, robotId: robot.robotId, reason: 'no_route' });
          continue;
        }
        moveCommands.push({ robot, task, step: activeStep, routePlan });
        routePlansByRobot.set(robot.robotId, routePlan);
      } else {
        const cmd = buildCommandForStep(robot, activeStep);
        if (cmd) immediateCommands.push(cmd);
      }
    }

    for (const entry of moveCommands) {
      const progress = estimateProgress({
        robot: entry.robot,
        routePlan: entry.routePlan,
        nowMs,
        options: { telemetryTimeoutMs: this.options.telemetryTimeoutMs }
      });
      if (!Number.isFinite(progress.routeS)) {
        holds.push({ robotId: entry.robot.robotId, reason: progress.reasonCode || 'no_progress' });
        diagnostics.push({
          taskId: entry.task.taskId,
          robotId: entry.robot.robotId,
          reason: progress.reasonCode || 'no_progress'
        });
        continue;
      }
      const request = buildCorridorRequest({
        robotId: entry.robot.robotId,
        routePlan: entry.routePlan,
        progress,
        mapIndex: this.mapIndex,
        lockLookaheadM: this.options.lockLookaheadM,
        lockLookbackM: this.options.lockLookbackM,
        targetNodeId: entry.step.targetRef?.nodeId
      });
      if (request) {
        corridorRequests.push({ ...request, taskId: entry.task.taskId });
      }
    }

    const lockResult = lockManagerTick({ requests: corridorRequests, mapIndex: this.mapIndex, existingReservations });
    const grantsByRobot = new Map();
    lockResult.grants.forEach((grant) => {
      grantsByRobot.set(grant.robotId, grant);
    });

    const commands = [...immediateCommands];
    for (const entry of moveCommands) {
      const request = corridorRequests.find((req) => req.robotId === entry.robot.robotId);
      const grant = grantsByRobot.get(entry.robot.robotId);
      if (!request || !grant) {
        holds.push({ robotId: entry.robot.robotId, reason: 'no_lock' });
        diagnostics.push({ taskId: entry.task.taskId, robotId: entry.robot.robotId, reason: 'no_lock' });
        continue;
      }
      if (grant.reasonCode && grant.reasonCode !== 'NONE') {
        const hardHold = ['WAIT_NODE_STOP_ZONE', 'WAIT_CORRIDOR_DIR'].includes(grant.reasonCode);
        if (hardHold || !grant.grantedCells || grant.grantedCells.length === 0) {
          holds.push({ robotId: entry.robot.robotId, reason: grant.reasonCode });
          diagnostics.push({
            taskId: entry.task.taskId,
            robotId: entry.robot.robotId,
            reason: grant.reasonCode
          });
          continue;
        }
      }
      const holdPoint = computeHoldPoint({
        request,
        grant,
        stopDistanceM: this.options.stopDistanceM,
        safetyBufferM: this.options.holdSafetyBufferM
      });
      const target = selectRollingTarget({
        routePlan: entry.routePlan,
        targetNodeId: entry.step.targetRef?.nodeId,
        holdPointRouteS: holdPoint
      });

      if (!target || !target.targetNodeId) {
        holds.push({ robotId: entry.robot.robotId, reason: grant.reasonCode || 'hold' });
        diagnostics.push({
          taskId: entry.task.taskId,
          robotId: entry.robot.robotId,
          reason: grant.reasonCode || 'hold'
        });
        continue;
      }

      const cmd = buildCommandForStep(entry.robot, {
        ...entry.step,
        targetRef: { nodeId: target.targetNodeId }
      });
      if (cmd) {
        cmd.payload = {
          ...cmd.payload,
          targetRouteS: target.targetRouteS,
          stopLineRouteS: holdPoint
        };
        commands.push(cmd);
      }
    }

    const decision = {
      nowMs,
      assignments,
      tasks: updatedTasks,
      locks: lockResult,
      commands,
      holds,
      diagnostics
    };
    if (this.logSink?.writeTick) {
      this.logSink.writeTick({
        nowMs,
        assignments,
        tasks: updatedTasks,
        requests: corridorRequests,
        locks: this.serializeLocks(lockResult),
        commands,
        holds,
        diagnostics
      });
    }
    return decision;
  }
}

function buildStepsForTask(task) {
  const steps = [];
  const nodes = [];
  if (task.fromNodeId) nodes.push(task.fromNodeId);
  if (task.toNodeId && task.toNodeId !== task.fromNodeId) nodes.push(task.toNodeId);
  nodes.forEach((nodeId, index) => {
    steps.push({
      stepId: `${task.taskId}:step:${index + 1}`,
      type: 'moveTo',
      status: 'pending',
      statusReasonCode: 'NONE',
      targetRef: { nodeId },
      params: null
    });
  });
  return steps;
}

function computeTaskRoute(graph, robotNodeId, fromNodeId, toNodeId) {
  if (!robotNodeId) return null;
  if (!fromNodeId && !toNodeId) return null;
  const firstTarget = fromNodeId || toNodeId;
  const first = planRoute(graph, robotNodeId, firstTarget);
  if (!first) return null;
  if (fromNodeId && toNodeId && fromNodeId !== toNodeId) {
    const second = planRoute(graph, fromNodeId, toNodeId);
    if (!second) return null;
    return concatRoutes(first, second);
  }
  return first;
}

module.exports = {
  Orchestrator,
  buildStepsForTask,
  computeTaskRoute
};
