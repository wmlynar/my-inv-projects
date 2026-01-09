const ROBOKIT_TASK_STATUS = Object.freeze({
  idle: 0,
  running: 2,
  paused: 3,
  completed: 4,
  failed: 6
});

const CORE_TASK_STATUS = Object.freeze({
  inProgress: "in_progress",
  paused: "paused",
  completed: "completed",
  cancelled: "cancelled",
  failed: "failed"
});

const ROBOKIT_STATUS_SET = new Set(Object.values(ROBOKIT_TASK_STATUS));

const normalizeRobokitTaskStatus = (value) => {
  const code = Number.isFinite(value) ? Number(value) : null;
  return ROBOKIT_STATUS_SET.has(code) ? code : ROBOKIT_TASK_STATUS.idle;
};

const CORE_TO_ROBOKIT = {
  [CORE_TASK_STATUS.inProgress]: ROBOKIT_TASK_STATUS.running,
  [CORE_TASK_STATUS.paused]: ROBOKIT_TASK_STATUS.paused,
  [CORE_TASK_STATUS.completed]: ROBOKIT_TASK_STATUS.completed,
  [CORE_TASK_STATUS.failed]: ROBOKIT_TASK_STATUS.failed,
  [CORE_TASK_STATUS.cancelled]: ROBOKIT_TASK_STATUS.failed
};

const coreTaskToRobokitStatus = (status) => {
  if (!status) return ROBOKIT_TASK_STATUS.idle;
  return CORE_TO_ROBOKIT[status] ?? ROBOKIT_TASK_STATUS.idle;
};

const ROBOKIT_TO_CORE = {
  [ROBOKIT_TASK_STATUS.running]: CORE_TASK_STATUS.inProgress,
  [ROBOKIT_TASK_STATUS.paused]: CORE_TASK_STATUS.paused,
  [ROBOKIT_TASK_STATUS.completed]: CORE_TASK_STATUS.completed,
  [ROBOKIT_TASK_STATUS.failed]: CORE_TASK_STATUS.failed
};

const robokitStatusToCoreTaskStatus = (status) => {
  const code = normalizeRobokitTaskStatus(status);
  return ROBOKIT_TO_CORE[code] || null;
};

const isRobokitTaskActive = (status) => {
  const code = normalizeRobokitTaskStatus(status);
  return code === ROBOKIT_TASK_STATUS.running || code === ROBOKIT_TASK_STATUS.paused;
};

const isRobokitTaskPaused = (status) => normalizeRobokitTaskStatus(status) === ROBOKIT_TASK_STATUS.paused;

module.exports = {
  ROBOKIT_TASK_STATUS,
  CORE_TASK_STATUS,
  normalizeRobokitTaskStatus,
  coreTaskToRobokitStatus,
  robokitStatusToCoreTaskStatus,
  isRobokitTaskActive,
  isRobokitTaskPaused
};
