const { RobokitClient } = require('@fleet-manager/adapters-robokit');

function buildDefaultRobots(config) {
  const hosts =
    Array.isArray(config.robokitHosts) && config.robokitHosts.length
      ? config.robokitHosts
      : [config.robokitHost];
  if (hosts.length === 1) {
    return [{ id: config.robotId, ip: hosts[0] }];
  }
  return hosts.map((host, index) => ({
    id: `RB-${String(index + 1).padStart(2, '0')}`,
    ip: host
  }));
}

function buildRobokitClients({ robots, config }) {
  const clients = {};
  for (const robot of robots) {
    const host = robot.ip || config.robokitHost;
    clients[robot.id] = new RobokitClient({
      host,
      statePort: config.robokitStatePort,
      taskPort: config.robokitTaskPort,
      timeoutMs: config.robokitTimeoutMs,
      maxBodyLength: config.maxBodyLength
    });
  }
  return clients;
}

function createRobotContext({ config }) {
  const robots = buildDefaultRobots(config);
  const robokitClients = buildRobokitClients({ robots, config });
  return {
    robots,
    robokitClients,
    parkAssignments: null
  };
}

module.exports = {
  createRobotContext
};
