const path = require('path');

const { PORTS } = require('@fleet-manager/adapters-robokit');
const { validateConfig } = require('./config_schema');

function resolvePath(value, fallback) {
  if (!value) {
    return fallback ? path.resolve(fallback) : null;
  }
  return path.resolve(value);
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  return fallback;
}

function splitHosts(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const robokitHostRaw = process.env.ROBOKIT_HOSTS || process.env.ROBOKIT_HOST || '127.0.0.1';
const robokitHosts = splitHosts(robokitHostRaw);
const robokitHost = robokitHosts[0] || '127.0.0.1';

const config = {
  port: Number.parseInt(process.env.PORT || '7071', 10),
  tickMs: Number.parseInt(process.env.TICK_MS || '1000', 10),
  robokitHost,
  robokitHosts,
  robokitStatePort: Number.parseInt(process.env.ROBOKIT_STATE_PORT || String(PORTS.STATE), 10),
  robokitTaskPort: Number.parseInt(process.env.ROBOKIT_TASK_PORT || String(PORTS.TASK), 10),
  robokitTimeoutMs: Number.parseInt(process.env.ROBOKIT_TIMEOUT_MS || '2000', 10),
  robotId: process.env.ROBOT_ID || 'RB-01',
  graphPath: resolvePath(process.env.GRAPH_PATH, path.join(__dirname, 'scraped', 'graph.json')),
  workflowPath: resolvePath(process.env.WORKFLOW_PATH, path.join(__dirname, 'scraped', 'workflow.json5')),
  bindHost: process.env.BIND_HOST || '',
  stateDir: resolvePath(process.env.STATE_DIR, path.join(__dirname, 'state')),
  maxBodyLength: Number.parseInt(process.env.MAX_BODY_LENGTH || '10485760', 10),
  robotSelectStrategy: process.env.ROBOT_SELECT_STRATEGY || 'closest_idle',
  routePolicy: process.env.ROUTE_POLICY || 'none',
  routePolicyEdgeLockAllowSameDirection: parseBool(
    process.env.ROUTE_POLICY_EDGE_LOCK_ALLOW_SAME_DIRECTION,
    true
  ),
  routePolicyEdgeLockTimeoutMs: Number.parseInt(
    process.env.ROUTE_POLICY_EDGE_LOCK_TIMEOUT_MS || '15000',
    10
  ),
  robotOfflineTimeoutMs: Number.parseInt(process.env.ROBOT_OFFLINE_TIMEOUT_MS || '0', 10),
  robotStallTimeoutMs: Number.parseInt(process.env.ROBOT_STALL_TIMEOUT_MS || '0', 10)
};

module.exports = {
  config,
  configWarnings: validateConfig(config)
};
