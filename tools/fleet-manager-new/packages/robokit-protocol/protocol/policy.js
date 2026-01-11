const CONTROL_APIS = new Set([2000, 2002, 2010]);
const NAV_APIS = new Set([3050, 3051, 3053, 3066, 3068]);
const FORK_APIS = new Set([6040, 6041]);

function createControlPolicy(options = {}) {
  const requireControl = options.requireControl !== false;
  const requireNav = options.requireNav !== false;
  const requireFork = options.requireFork !== false;

  function requiresLock(apiNo) {
    if (CONTROL_APIS.has(apiNo)) {
      return requireControl;
    }
    if (NAV_APIS.has(apiNo)) {
      return requireNav;
    }
    if (FORK_APIS.has(apiNo)) {
      return requireFork;
    }
    return false;
  }

  return {
    requiresLock
  };
}

module.exports = {
  createControlPolicy,
  CONTROL_APIS,
  NAV_APIS,
  FORK_APIS
};
