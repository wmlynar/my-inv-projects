function isInt(value) {
  return Number.isFinite(value) && Number.isInteger(value);
}

const CONFIG_DEFS = [
  { key: 'PORT', defaultValue: '7071', desc: 'HTTP port for task-manager.' },
  { key: 'TICK_MS', defaultValue: '1000', desc: 'Scheduler tick interval (ms).' },
  { key: 'ROBOKIT_HOST', defaultValue: '127.0.0.1', desc: 'Robokit TCP host.' },
  { key: 'ROBOKIT_HOSTS', defaultValue: '', desc: 'Comma-separated Robokit hosts (multi-robot).' },
  { key: 'ROBOKIT_STATE_PORT', defaultValue: '19204', desc: 'Robokit state port.' },
  { key: 'ROBOKIT_TASK_PORT', defaultValue: '19206', desc: 'Robokit task port.' },
  { key: 'ROBOKIT_TIMEOUT_MS', defaultValue: '2000', desc: 'Robokit request timeout (ms).' },
  { key: 'ROBOT_ID', defaultValue: 'RB-01', desc: 'Default robot id (single-robot mode).' },
  { key: 'GRAPH_PATH', defaultValue: 'scraped/graph.json', desc: 'Path to graph.json or .smap.' },
  { key: 'WORKFLOW_PATH', defaultValue: 'scraped/workflow.json5', desc: 'Path to workflow json5.' },
  { key: 'MAX_BODY_LENGTH', defaultValue: '10485760', desc: 'Max request body (bytes).' },
  { key: 'STATE_DIR', defaultValue: 'apps/task-manager/state', desc: 'State directory.' },
  { key: 'BIND_HOST', defaultValue: '', desc: 'Bind host (blank = all).' },
  { key: 'ROBOT_SELECT_STRATEGY', defaultValue: 'closest_idle', desc: 'Robot selection strategy.' },
  { key: 'ROUTE_POLICY', defaultValue: 'none', desc: 'Route policy (none | edge_lock).' },
  {
    key: 'ROUTE_POLICY_EDGE_LOCK_ALLOW_SAME_DIRECTION',
    defaultValue: 'true',
    desc: 'edge_lock: allow same-direction sharing.'
  },
  {
    key: 'ROUTE_POLICY_EDGE_LOCK_TIMEOUT_MS',
    defaultValue: '15000',
    desc: 'edge_lock: lock timeout in milliseconds.'
  },
  {
    key: 'ROBOT_OFFLINE_TIMEOUT_MS',
    defaultValue: '0',
    desc: 'Fail tasks if robot stays offline longer than this (0 disables).'
  },
  {
    key: 'ROBOT_STALL_TIMEOUT_MS',
    defaultValue: '0',
    desc: 'Fail tasks if robot is online but not moving (0 disables).'
  }
];

function validateConfig(config) {
  const warnings = [];
  if (!isInt(config.port) || config.port <= 0) {
    warnings.push('PORT should be a positive integer.');
  }
  if (!isInt(config.tickMs) || config.tickMs <= 0) {
    warnings.push('TICK_MS should be a positive integer.');
  }
  if (!config.robokitHost) {
    warnings.push('ROBOKIT_HOST should be set.');
  }
  if (!isInt(config.robokitStatePort)) {
    warnings.push('ROBOKIT_STATE_PORT should be an integer.');
  }
  if (!isInt(config.robokitTaskPort)) {
    warnings.push('ROBOKIT_TASK_PORT should be an integer.');
  }
  if (!config.robotId) {
    warnings.push('ROBOT_ID should be set.');
  }
  if (!config.graphPath) {
    warnings.push('GRAPH_PATH should be set.');
  }
  if (!config.workflowPath) {
    warnings.push('WORKFLOW_PATH should be set.');
  }
  if (!isInt(config.maxBodyLength) || config.maxBodyLength <= 0) {
    warnings.push('MAX_BODY_LENGTH should be a positive integer.');
  }
  if (config.robotSelectStrategy && !['closest_idle', 'round_robin'].includes(config.robotSelectStrategy)) {
    warnings.push('ROBOT_SELECT_STRATEGY should be closest_idle or round_robin.');
  }
  if (config.routePolicy && !['none', 'edge_lock'].includes(config.routePolicy)) {
    warnings.push('ROUTE_POLICY should be none or edge_lock.');
  }
  if (typeof config.routePolicyEdgeLockAllowSameDirection !== 'boolean') {
    warnings.push('ROUTE_POLICY_EDGE_LOCK_ALLOW_SAME_DIRECTION should be true or false.');
  }
  if (!isInt(config.routePolicyEdgeLockTimeoutMs) || config.routePolicyEdgeLockTimeoutMs <= 0) {
    warnings.push('ROUTE_POLICY_EDGE_LOCK_TIMEOUT_MS should be a positive integer.');
  }
  if (!isInt(config.robotOfflineTimeoutMs) || config.robotOfflineTimeoutMs < 0) {
    warnings.push('ROBOT_OFFLINE_TIMEOUT_MS should be a non-negative integer.');
  }
  if (!isInt(config.robotStallTimeoutMs) || config.robotStallTimeoutMs < 0) {
    warnings.push('ROBOT_STALL_TIMEOUT_MS should be a non-negative integer.');
  }
  return warnings;
}

function renderEnvExample() {
  return CONFIG_DEFS.map((entry) => `# ${entry.desc}\n${entry.key}=${entry.defaultValue}`).join('\n\n');
}

module.exports = {
  CONFIG_DEFS,
  validateConfig,
  renderEnvExample
};
