const crypto = require('crypto');
const { Orchestrator } = require('./core');

const DEFAULT_CONFIG = {
  statusAgeMaxMs: 1500,
  commandCooldownMs: 300
};

function createDclRuntime(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  if (!options.compiledMap) {
    throw new Error('compiledMap required for dcl runtime');
  }
  const orchestrator = new Orchestrator(options.compiledMap, {
    ...(options.orchestratorOptions || {}),
    logSink: options.logSink || null
  });

  const robots = new Map();
  const tasks = [];
  const lastCommandByRobot = new Map();

  function createId(prefix) {
    const rand = crypto.randomBytes(6).toString('hex');
    return `${prefix}_${Date.now().toString(36)}_${rand}`;
  }

  function getState() {
    return {
      robots: Array.from(robots.values()).map((robot) => ({ ...robot })),
      tasks: tasks.map((task) => ({ ...task, steps: task.steps ? task.steps.map((s) => ({ ...s })) : null }))
    };
  }

  function upsertRobotStatus(robotId, update, tsMs) {
    if (!robotId) throw new Error('robotId required');
    const now = Number.isFinite(tsMs) ? tsMs : Date.now();
    const robot = robots.get(robotId) || {
      robotId,
      status: 'offline',
      nodeId: null,
      forkHeightM: null,
      pose: null,
      lastSeenTsMs: null,
      blocked: false,
      routeProgress: null
    };
    if (update.status) robot.status = update.status;
    if (update.nodeId !== undefined) robot.nodeId = update.nodeId;
    if (update.forkHeightM !== undefined) robot.forkHeightM = update.forkHeightM;
    if (update.routeProgress && typeof update.routeProgress === 'object') {
      const routeS = Number(update.routeProgress.routeS);
      if (Number.isFinite(routeS)) {
        robot.routeProgress = { routeS };
      }
    }
    if (update.pose && typeof update.pose === 'object') {
      const x = Number(update.pose.x);
      const y = Number(update.pose.y);
      const angle = Number(update.pose.angle);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        robot.pose = {
          x,
          y,
          angle: Number.isFinite(angle) ? angle : robot.pose?.angle ?? 0
        };
      }
    }
    if (update.blocked !== undefined) robot.blocked = Boolean(update.blocked);
    robot.lastSeenTsMs = now;
    robots.set(robotId, robot);
    return robot;
  }

  function createTask(task, tsMs) {
    if (!task || typeof task !== 'object') throw new Error('task required');
    const now = Number.isFinite(tsMs) ? tsMs : Date.now();
    const entry = {
      taskId: task.taskId || createId('task'),
      status: task.status || 'created',
      statusReasonCode: task.statusReasonCode || 'NONE',
      fromNodeId: task.fromNodeId || null,
      toNodeId: task.toNodeId || null,
      parkNodeId: task.parkNodeId || null,
      pickHeightM: task.pickHeightM,
      dropHeightM: task.dropHeightM,
      priority: Number.isFinite(task.priority) ? task.priority : 0,
      assignedRobotId: task.assignedRobotId || null,
      steps: Array.isArray(task.steps) ? task.steps.map((step) => ({ ...step })) : null,
      createdTsMs: now
    };
    tasks.push(entry);
    return entry;
  }

  function tick({ nowMs } = {}) {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const commands = [];
    const holds = [];

    for (const robot of robots.values()) {
      const stale = !Number.isFinite(robot.lastSeenTsMs) || now - robot.lastSeenTsMs > config.statusAgeMaxMs;
      if (stale) {
        robot.status = 'offline';
      }
      if (robot.status !== 'online' || robot.blocked) {
        holds.push({ robotId: robot.robotId, reason: robot.blocked ? 'blocked' : 'offline' });
        const stopCmd = { robotId: robot.robotId, type: 'stop', payload: {} };
        if (shouldSendCommand(robot.robotId, stopCmd, now)) {
          commands.push(stopCmd);
        }
      }
    }

    const decision = orchestrator.step({
      nowMs: now,
      robots: Array.from(robots.values()),
      tasks,
      reservations: []
    });

    tasks.length = 0;
    tasks.push(...decision.tasks);

    for (const cmd of decision.commands) {
      if (shouldSendCommand(cmd.robotId, cmd, now)) {
        commands.push(cmd);
      }
    }

    return {
      nowMs: now,
      commands,
      holds: [...holds, ...decision.holds],
      tasks: tasks.map((task) => ({ ...task, steps: task.steps ? task.steps.map((s) => ({ ...s })) : null })),
      robots: Array.from(robots.values()).map((robot) => ({ ...robot })),
      locks: decision.locks
    };
  }

  function shouldSendCommand(robotId, command, nowMs) {
    const key = buildCommandKey(command);
    const last = lastCommandByRobot.get(robotId);
    if (last && last.key === key && nowMs - last.tsMs < config.commandCooldownMs) {
      return false;
    }
    lastCommandByRobot.set(robotId, { key, tsMs: nowMs });
    return true;
  }

  function buildCommandKey(command) {
    if (!command) return 'none';
    const nodeId = command.payload?.targetRef?.nodeId || '';
    const height = Number.isFinite(command.payload?.toHeightM) ? command.payload.toHeightM : '';
    return `${command.type}|${nodeId}|${height}`;
  }

  return {
    getState,
    upsertRobotStatus,
    createTask,
    tick
  };
}

module.exports = {
  createDclRuntime
};
