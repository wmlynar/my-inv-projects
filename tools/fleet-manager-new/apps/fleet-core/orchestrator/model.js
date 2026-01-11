const TASK_STATUSES = new Set([
  'created',
  'assigned',
  'running',
  'completed',
  'failed',
  'canceled'
]);

const STEP_STATUSES = new Set([
  'pending',
  'running',
  'completed',
  'failed',
  'canceled'
]);

const ROBOT_STATUSES = new Set(['online', 'offline', 'blocked']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateRobot(robot) {
  const errors = [];
  if (!robot || typeof robot !== 'object') {
    return { ok: false, errors: ['robot.invalid'] };
  }
  if (!isNonEmptyString(robot.robotId)) {
    errors.push('robot.robotId');
  }
  if (robot.nodeId != null && !isNonEmptyString(robot.nodeId)) {
    errors.push('robot.nodeId');
  }
  if (robot.status != null && !ROBOT_STATUSES.has(robot.status)) {
    errors.push('robot.status');
  }
  if (robot.speedMps != null && !Number.isFinite(robot.speedMps)) {
    errors.push('robot.speedMps');
  }
  if (robot.routeProgress != null && typeof robot.routeProgress !== 'object') {
    errors.push('robot.routeProgress');
  }
  return { ok: errors.length === 0, errors };
}

function validateTask(task) {
  const errors = [];
  if (!task || typeof task !== 'object') {
    return { ok: false, errors: ['task.invalid'] };
  }
  if (!isNonEmptyString(task.taskId)) {
    errors.push('task.taskId');
  }
  if (task.status != null && !TASK_STATUSES.has(task.status)) {
    errors.push('task.status');
  }
  if (task.fromNodeId != null && !isNonEmptyString(task.fromNodeId)) {
    errors.push('task.fromNodeId');
  }
  if (task.toNodeId != null && !isNonEmptyString(task.toNodeId)) {
    errors.push('task.toNodeId');
  }
  if (task.priority != null && !Number.isFinite(task.priority)) {
    errors.push('task.priority');
  }
  if (task.steps != null && !Array.isArray(task.steps)) {
    errors.push('task.steps');
  }
  return { ok: errors.length === 0, errors };
}

function validateStep(step) {
  const errors = [];
  if (!step || typeof step !== 'object') {
    return { ok: false, errors: ['step.invalid'] };
  }
  if (!isNonEmptyString(step.stepId)) {
    errors.push('step.stepId');
  }
  if (!isNonEmptyString(step.type)) {
    errors.push('step.type');
  }
  if (step.status != null && !STEP_STATUSES.has(step.status)) {
    errors.push('step.status');
  }
  return { ok: errors.length === 0, errors };
}

function validateReservation(reservation) {
  const errors = [];
  if (!reservation || typeof reservation !== 'object') {
    return { ok: false, errors: ['reservation.invalid'] };
  }
  if (!isNonEmptyString(reservation.reservationId)) {
    errors.push('reservation.reservationId');
  }
  if (!isNonEmptyString(reservation.corridorId)) {
    errors.push('reservation.corridorId');
  }
  if (!isNonEmptyString(reservation.robotId)) {
    errors.push('reservation.robotId');
  }
  if (!Number.isFinite(reservation.startTsMs)) {
    errors.push('reservation.startTsMs');
  }
  if (!Number.isFinite(reservation.endTsMs)) {
    errors.push('reservation.endTsMs');
  }
  return { ok: errors.length === 0, errors };
}

function validateCorridorSegment(segment) {
  const errors = [];
  if (!segment || typeof segment !== 'object') {
    return { ok: false, errors: ['segment.invalid'] };
  }
  if (!isNonEmptyString(segment.corridorId)) {
    errors.push('segment.corridorId');
  }
  if (!isNonEmptyString(segment.fromNodeId)) {
    errors.push('segment.fromNodeId');
  }
  if (!isNonEmptyString(segment.toNodeId)) {
    errors.push('segment.toNodeId');
  }
  if (!Number.isFinite(segment.lengthM) || segment.lengthM <= 0) {
    errors.push('segment.lengthM');
  }
  return { ok: errors.length === 0, errors };
}

function normalizeRobot(robot) {
  return {
    robotId: robot.robotId,
    nodeId: robot.nodeId || null,
    status: robot.status || 'online',
    blocked: Boolean(robot.blocked),
    speedMps: Number.isFinite(robot.speedMps) ? robot.speedMps : null,
    assignedTaskId: robot.assignedTaskId || null,
    pendingTasks: Number.isFinite(robot.pendingTasks) ? robot.pendingTasks : 0,
    routeProgress: robot.routeProgress && typeof robot.routeProgress === 'object'
      ? { ...robot.routeProgress }
      : null,
    lastSeenTsMs: Number.isFinite(robot.lastSeenTsMs) ? robot.lastSeenTsMs : null
  };
}

function normalizeTask(task) {
  return {
    taskId: task.taskId,
    status: task.status || 'created',
    fromNodeId: task.fromNodeId || null,
    toNodeId: task.toNodeId || null,
    priority: Number.isFinite(task.priority) ? task.priority : 0,
    assignedRobotId: task.assignedRobotId || null,
    steps: Array.isArray(task.steps) ? task.steps.map(cloneStep) : null,
    meta: task.meta ? { ...task.meta } : undefined
  };
}

function cloneStep(step) {
  return {
    stepId: step.stepId,
    type: step.type,
    status: step.status || 'pending',
    statusReasonCode: step.statusReasonCode || 'NONE',
    targetRef: step.targetRef ? { ...step.targetRef } : null,
    params: step.params ? { ...step.params } : null
  };
}

function cloneTask(task) {
  return {
    ...task,
    steps: Array.isArray(task.steps) ? task.steps.map(cloneStep) : null
  };
}

module.exports = {
  TASK_STATUSES,
  STEP_STATUSES,
  ROBOT_STATUSES,
  validateRobot,
  validateTask,
  validateStep,
  validateReservation,
  validateCorridorSegment,
  normalizeRobot,
  normalizeTask,
  cloneTask
};
