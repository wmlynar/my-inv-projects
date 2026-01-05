const { resolveStrategy, getRobotPosition } = require('./robot_strategies');
const { resolveRoutePolicy } = require('./route_policies');
const { ROBOKIT_TASK_STATUS } = require('@fleet-manager/core-types');

function nowMs() {
  return Date.now();
}

function findNearestNodeId(nodesById, pos) {
  if (!pos || !nodesById || nodesById.size === 0) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  for (const node of nodesById.values()) {
    const dx = node.pos.x - pos.x;
    const dy = node.pos.y - pos.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  }
  return best ? best.id : null;
}

function resolveStatusStation(status, nodesById) {
  if (!status || !nodesById) {
    return null;
  }
  if (status.current_station && nodesById.has(status.current_station)) {
    return status.current_station;
  }
  if (Number.isFinite(status.x) && Number.isFinite(status.y)) {
    return findNearestNodeId(nodesById, { x: status.x, y: status.y });
  }
  if (status.last_station && nodesById.has(status.last_station)) {
    return status.last_station;
  }
  return null;
}

class Scheduler {
  constructor({
    robokitClients,
    state,
    strategy,
    routePolicy,
    routePolicyOptions,
    offlineTimeoutMs,
    stallTimeoutMs
  }) {
    this.robokitClients = robokitClients;
    this.state = state;
    this.graph = state.graph;
    this.workflow = state.workflow;
    this.worksiteStore = state.worksiteStore;
    this.taskStore = state.taskStore;
    this.robots = state.robots || [];
    this.parkAssignments = state.assignments || {};
    this.strategyName = strategy || 'closest_idle';
    this.strategy = resolveStrategy(this.strategyName);
    this.routePolicyName = routePolicy || this.workflow.route_policy || 'none';
    this.routePolicyOptions = routePolicyOptions || {};
    this.routePolicy = resolveRoutePolicy(this.routePolicyName, this.routePolicyOptions);
    this.offlineTimeoutMs = Number.isFinite(offlineTimeoutMs) ? offlineTimeoutMs : 0;
    this.stallTimeoutMs = Number.isFinite(stallTimeoutMs) ? stallTimeoutMs : 0;
    this.lastOkByRobot = new Map();
    this.lastProgressByRobot = new Map();
    this.lastPoseByRobot = new Map();

    this.worksites = state.worksites;
    this.groupSites = state.groupSites;
    this.stream = state.stream;
    this.pickGroups = state.pickGroups;
    this.dropGroups = state.dropGroups;
    this.defaultParkPoint = state.defaultParkPoint;

    this.nodesById = state.nodesById;

    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    this.sortAsc = (a, b) => collator.compare(a.id, b.id);

    this.tasks = state.tasks;
    this.taskCounter = this.tasks.reduce((max, task) => {
      const match = String(task.id || '').match(/task-(\d+)/);
      if (match) {
        return Math.max(max, Number.parseInt(match[1], 10));
      }
      return max;
    }, 0) + 1;

    this.lastTickAt = null;
    this.lastError = null;
    this.lastRobots = [];
    this.lastRobotStatus = null;
    this.lastRobotStatusMap = {};
    this.tickRunning = false;
    this.isFleet = this.robots.length > 1;
    this.strategyState = { lastIndex: -1 };
    this.pendingActions = new Map();
    this.pendingActionsList = [];
    this.robotOverrides = new Map();
  }

  getReservedPickIds() {
    return new Set(this.tasks.filter((task) => task.status === 'in_progress').map((task) => task.pickId));
  }

  getReservedDropIds() {
    return new Set(this.tasks.filter((task) => task.status === 'in_progress').map((task) => task.dropId));
  }

  getPickCandidate() {
    const pickGroupName = this.stream ? this.stream.pick_group : null;
    if (!pickGroupName) {
      return null;
    }
    const pickSites = this.groupSites[pickGroupName] || [];
    const reservedPicks = this.getReservedPickIds();
    const sorted = [...pickSites].sort(this.sortAsc);
    for (const site of sorted) {
      const state = this.worksiteStore.get(site.id);
      if (state.blocked || !state.filled || reservedPicks.has(site.id)) {
        continue;
      }
      return site;
    }
    return null;
  }

  getDropCandidate() {
    if (!this.stream) {
      return null;
    }
    const reservedDrops = this.getReservedDropIds();
    for (const groupName of this.stream.drop_group_order || []) {
      const dropSites = this.groupSites[groupName] || [];
      let candidate = null;
      let blocked = false;
      for (const site of dropSites) {
        const state = this.worksiteStore.get(site.id);
        if (state.blocked || state.filled || reservedDrops.has(site.id)) {
          blocked = true;
          candidate = null;
          break;
        }
        candidate = site;
        break;
      }
      if (!blocked && candidate) {
        return candidate;
      }
    }
    return null;
  }

  getRobotOverride(robotId) {
    if (!robotId) return null;
    return this.robotOverrides.get(robotId) || null;
  }

  setRobotManualMode(robotId, enabled) {
    if (!robotId) return null;
    const current = this.getRobotOverride(robotId) || {};
    const manualMode = Boolean(enabled);
    const dispatchable = manualMode ? false : current.dispatchable !== false;
    const next = { ...current, manualMode, dispatchable };
    this.robotOverrides.set(robotId, next);
    return next;
  }

  setRobotDispatchable(robotId, dispatchable) {
    if (!robotId) return null;
    const current = this.getRobotOverride(robotId) || {};
    const next = { ...current, dispatchable: Boolean(dispatchable) };
    this.robotOverrides.set(robotId, next);
    return next;
  }

  robotAvailable(robotId, status) {
    const override = this.getRobotOverride(robotId);
    if (override && override.dispatchable === false) {
      return false;
    }
    if (!status || status.ret_code !== 0) {
      return false;
    }
    if (status.blocked) {
      return false;
    }
    if (status.task_status === ROBOKIT_TASK_STATUS.running) {
      return false;
    }
    return true;
  }

  buildRobotSnapshot(robotId, status) {
    if (!status || status.ret_code !== 0) {
      return null;
    }
    const override = this.getRobotOverride(robotId) || {};
    return {
      id: robotId,
      online: true,
      dispatchable: override.dispatchable !== false,
      controlled: override.manualMode ? false : true,
      manualMode: Boolean(override.manualMode),
      blocked: Boolean(status.blocked),
      battery: Number.isFinite(status.battery_level) ? Math.round(status.battery_level) : null,
      pose: {
        x: Number.isFinite(status.x) ? status.x : null,
        y: Number.isFinite(status.y) ? status.y : null,
        angle: Number.isFinite(status.angle) ? status.angle : null
      },
      currentStation: status.current_station || null,
      lastStation: status.last_station || null,
      taskStatus: status.task_status || null
    };
  }

  queueAction(action, actions) {
    this.pendingActions.set(action.robotId, action);
    actions.push(action);
  }

  refreshRobotHealth(statusMap, now) {
    for (const [robotId, status] of Object.entries(statusMap || {})) {
      if (status && status.ret_code === 0) {
        this.lastOkByRobot.set(robotId, now);
      }
    }
  }

  failOfflineTasks(statusMap, now) {
    if (!this.offlineTimeoutMs) {
      return;
    }
    const inProgress = this.tasks.filter((task) => task.status === 'in_progress');
    for (const task of inProgress) {
      if (this.pendingActions.has(task.robotId)) {
        continue;
      }
      const status = statusMap[task.robotId];
      if (status && status.ret_code === 0) {
        continue;
      }
      const lastOk = this.lastOkByRobot.get(task.robotId);
      if (!lastOk) {
        continue;
      }
      if (now - lastOk < this.offlineTimeoutMs) {
        continue;
      }
      this.finalizeTask(task, 'failed');
    }
  }

  refreshRobotProgress(statusMap, now) {
    const minDistance = 0.05;
    for (const [robotId, status] of Object.entries(statusMap || {})) {
      if (!status || status.ret_code !== 0) {
        continue;
      }
      const station = status.current_station || null;
      const hasPose = Number.isFinite(status.x) && Number.isFinite(status.y);
      const pose = hasPose ? { x: status.x, y: status.y } : null;
      const prev = this.lastPoseByRobot.get(robotId) || null;
      let progressed = false;
      if (station && (!prev || prev.station !== station)) {
        progressed = true;
      }
      if (pose && prev && Number.isFinite(prev.x) && Number.isFinite(prev.y)) {
        const dist = Math.hypot(pose.x - prev.x, pose.y - prev.y);
        if (dist >= minDistance) {
          progressed = true;
        }
      }
      if (pose && !prev) {
        progressed = true;
      }
      if (progressed) {
        this.lastProgressByRobot.set(robotId, now);
      }
      if (pose) {
        this.lastPoseByRobot.set(robotId, { x: pose.x, y: pose.y, station });
      } else if (!prev) {
        this.lastPoseByRobot.set(robotId, { x: null, y: null, station });
      } else if (station && prev.station !== station) {
        this.lastPoseByRobot.set(robotId, { ...prev, station });
      }
      if (!this.lastProgressByRobot.has(robotId)) {
        this.lastProgressByRobot.set(robotId, now);
      }
    }
  }

  ensureRouteLocks(statusMap) {
    if (!this.routePolicy || typeof this.routePolicy.ensureRobotLocks !== 'function') {
      return;
    }
    const inProgress = this.tasks.filter((task) => task.status === 'in_progress');
    for (const task of inProgress) {
      if (!task || !task.robotId || !task.targetId) {
        continue;
      }
      this.routePolicy.ensureRobotLocks({
        robotId: task.robotId,
        targetId: task.targetId,
        graph: this.graph,
        statusMap
      });
    }
  }

  failStalledTasks(statusMap, now) {
    if (!this.stallTimeoutMs) {
      return;
    }
    const inProgress = this.tasks.filter((task) => task.status === 'in_progress');
    for (const task of inProgress) {
      if (this.pendingActions.has(task.robotId)) {
        continue;
      }
      const status = statusMap[task.robotId];
      if (!status || status.ret_code !== 0) {
        continue;
      }
      if (status.task_status !== ROBOKIT_TASK_STATUS.running) {
        continue;
      }
      const lastProgress = this.lastProgressByRobot.get(task.robotId);
      if (!lastProgress) {
        continue;
      }
      if (now - lastProgress < this.stallTimeoutMs) {
        continue;
      }
      this.finalizeTask(task, 'failed');
    }
  }

  applyActionResult(action, response) {
    this.pendingActions.delete(action.robotId);
    if (!action.taskId) {
      return;
    }
    const task = this.tasks.find((item) => item.id === action.taskId);
    if (!task) {
      return;
    }
    if (!response || response.ret_code !== 0) {
      this.lastError = response && response.err_msg ? response.err_msg : 'dispatch_failed';
      this.finalizeTask(task, 'failed');
      return;
    }
    if (action.nextPhase) {
      this.updateTask(task, {
        phase: action.nextPhase,
        targetId: action.targetId,
        robotTaskId: response.task_id || null
      });
      return;
    }
    if (response.task_id) {
      this.updateTask(task, { robotTaskId: response.task_id });
    }
  }

  createTask(robotId, pick, drop, targetId, robotTaskId) {
    const task = {
      id: `task-${this.taskCounter++}`,
      robotId,
      pickId: pick.id,
      dropId: drop.id,
      status: 'in_progress',
      phase: 'to_pick',
      targetId,
      robotTaskId: robotTaskId || null,
      createdAt: nowMs(),
      updatedAt: nowMs(),
      completedAt: null
    };
    this.tasks.push(task);
    this.state.saveTasks(this.tasks);
    return task;
  }

  updateTask(task, updates) {
    Object.assign(task, updates, { updatedAt: nowMs() });
    this.state.saveTasks(this.tasks);
  }

  finalizeTask(task, status) {
    task.status = status;
    task.updatedAt = nowMs();
    if (status === 'completed') {
      task.completedAt = nowMs();
    }
    this.state.saveTasks(this.tasks);
    if (this.routePolicy && typeof this.routePolicy.releaseRobot === 'function') {
      this.routePolicy.releaseRobot(task.robotId);
    }
  }

  updateWorksiteFilled(id, filled) {
    this.state.setWorksiteState(id, { filled });
  }

  getRobotParkPoint(robotId) {
    const assignment = this.parkAssignments && this.parkAssignments[robotId];
    if (assignment && assignment.parkPoints && assignment.parkPoints.length > 0) {
      return assignment.parkPoints[0];
    }
    return this.defaultParkPoint;
  }

  async syncTasks(statusMap) {
    const inProgress = this.tasks.filter((task) => task.status === 'in_progress');
    for (const task of inProgress) {
      if (this.pendingActions.has(task.robotId)) {
        continue;
      }
      const status = statusMap[task.robotId];
      if (!status || status.ret_code !== 0) {
        continue;
      }
      if (status.task_status === ROBOKIT_TASK_STATUS.running) {
        continue;
      }
      if (status.task_status === ROBOKIT_TASK_STATUS.paused) {
        continue;
      }
      const station = resolveStatusStation(status, this.nodesById);
      if (!station) {
        continue;
      }
      if (station !== task.targetId) {
        if (
          [
            ROBOKIT_TASK_STATUS.idle,
            ROBOKIT_TASK_STATUS.completed,
            ROBOKIT_TASK_STATUS.failed
          ].includes(status.task_status)
        ) {
          this.finalizeTask(task, 'failed');
        }
        continue;
      }
      if (this.routePolicy && typeof this.routePolicy.onArrive === 'function') {
        this.routePolicy.onArrive({ robotId: task.robotId, targetId: task.targetId, graph: this.graph });
      }

      if (task.phase === 'to_pick') {
        this.updateWorksiteFilled(task.pickId, false);
        const drop = this.worksites.find((site) => site.id === task.dropId);
        if (!drop) {
          this.finalizeTask(task, 'failed');
          continue;
        }
        const allow = this.routePolicy.allowDispatch({
          robotId: task.robotId,
          targetId: drop.point,
          graph: this.graph,
          statusMap
        });
        if (!allow || !allow.ok) {
          continue;
        }
        this.queueAction(
          {
            type: 'go_target',
            robotId: task.robotId,
            targetId: drop.point,
            taskId: task.id,
            nextPhase: 'to_drop'
          },
          this.pendingActionsList
        );
        continue;
      }

      if (task.phase === 'to_drop') {
        this.updateWorksiteFilled(task.dropId, true);
        const parkPoint = this.getRobotParkPoint(task.robotId);
        if (parkPoint) {
          const allow = this.routePolicy.allowDispatch({
            robotId: task.robotId,
            targetId: parkPoint,
            graph: this.graph,
            statusMap
          });
          if (!allow || !allow.ok) {
            continue;
          }
          this.queueAction(
            {
              type: 'go_target',
              robotId: task.robotId,
              targetId: parkPoint,
              taskId: task.id,
              nextPhase: 'to_park'
            },
            this.pendingActionsList
          );
        } else {
          this.finalizeTask(task, 'completed');
        }
        continue;
      }

      if (task.phase === 'to_park') {
        this.finalizeTask(task, 'completed');
      }
    }
  }

  async tick() {
    if (this.tickRunning) {
      return [];
    }
    this.tickRunning = true;
    try {
      this.pendingActionsList = [];
      this.lastTickAt = new Date().toISOString();
      const statusEntries = await Promise.all(
        this.robots.map(async (robot) => {
          const client = this.robokitClients[robot.id];
          try {
            const status = await client.getStatusLoc();
            return [robot.id, status];
          } catch (err) {
            return [robot.id, { ret_code: 1, err_msg: err.message }];
          }
        })
      );

      const statusMap = {};
      const snapshots = [];
      for (const [robotId, status] of statusEntries) {
        statusMap[robotId] = status;
        const snapshot = this.buildRobotSnapshot(robotId, status);
        if (snapshot) {
          snapshots.push(snapshot);
        }
      }
      this.lastRobotStatusMap = statusMap;
      this.lastRobotStatus = this.isFleet ? statusMap : statusMap[this.robots[0]?.id];
      this.lastRobots = snapshots;
      const now = nowMs();
      this.refreshRobotHealth(statusMap, now);
      this.refreshRobotProgress(statusMap, now);
      this.failOfflineTasks(statusMap, now);
      this.failStalledTasks(statusMap, now);
      this.ensureRouteLocks(statusMap);
      if (this.routePolicy && typeof this.routePolicy.onTick === 'function') {
        this.routePolicy.onTick({
          now,
          tasks: this.tasks,
          pendingActions: this.pendingActions
        });
      }

      await this.syncTasks(statusMap);

      let availableRobots = this.robots.filter((robot) => {
        const status = statusMap[robot.id];
        const hasTask = this.tasks.some((task) => task.status === 'in_progress' && task.robotId === robot.id);
        return this.robotAvailable(robot.id, status) && !hasTask && !this.pendingActions.has(robot.id);
      });

      while (availableRobots.length > 0) {
        const pick = this.getPickCandidate();
        const drop = this.getDropCandidate();
        if (!pick || !drop) {
          break;
        }
        const targetNode = this.nodesById.get(pick.point);
        const targetPos = targetNode ? targetNode.pos : pick.pos;
        const chosen = this.strategy({
          robots: availableRobots,
          statusMap,
          targetPos,
          nodesById: this.nodesById,
          state: this.strategyState
        });
        if (!chosen) {
          break;
        }
        const allow = this.routePolicy.allowDispatch({
          robotId: chosen.id,
          targetId: pick.point,
          graph: this.graph,
          statusMap
        });
        if (!allow || !allow.ok) {
          break;
        }
        const task = this.createTask(chosen.id, pick, drop, pick.point, null);
        this.queueAction(
          {
            type: 'go_target',
            robotId: chosen.id,
            targetId: pick.point,
            taskId: task.id,
            nextPhase: 'to_pick'
          },
          this.pendingActionsList
        );
        availableRobots = availableRobots.filter((robot) => robot.id !== chosen.id);
      }
      return this.pendingActionsList;
    } catch (err) {
      this.lastError = err.message;
      return [];
    } finally {
      this.tickRunning = false;
    }
  }
}

module.exports = {
  Scheduler,
  getRobotPosition
};
