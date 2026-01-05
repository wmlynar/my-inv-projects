const { EdgeLockPolicy } = require('./edge_lock_policy');

function allowAll() {
  return { ok: true };
}

function createNoopPolicy() {
  return {
    allowDispatch: allowAll,
    onArrive: () => {},
    onTick: () => {},
    releaseRobot: () => {}
  };
}

function resolveRoutePolicy(name, options = {}) {
  if (name === 'edge_lock') {
    const edgeLockOptions = options.edgeLock ? options.edgeLock : options;
    return new EdgeLockPolicy(edgeLockOptions);
  }
  return createNoopPolicy();
}

module.exports = {
  resolveRoutePolicy
};
