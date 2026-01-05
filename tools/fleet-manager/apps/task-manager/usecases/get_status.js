function getStatus({ scheduler, config }) {
  const robotStatus = scheduler.isFleet ? scheduler.lastRobotStatusMap : scheduler.lastRobotStatus;
  return {
    tickMs: config.tickMs,
    lastTickAt: scheduler.lastTickAt,
    lastError: scheduler.lastError,
    robots: scheduler.lastRobots,
    tasks: scheduler.tasks,
    robotStatus
  };
}

module.exports = {
  getStatus
};
