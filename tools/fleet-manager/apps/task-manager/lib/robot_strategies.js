function distance(a, b) {
  if (!a || !b) {
    return Infinity;
  }
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

function getRobotPosition(status, nodesById) {
  if (!status) {
    return null;
  }
  if (status.current_station && nodesById.has(status.current_station)) {
    return nodesById.get(status.current_station).pos;
  }
  if (Number.isFinite(status.x) && Number.isFinite(status.y)) {
    return { x: status.x, y: status.y };
  }
  return null;
}

function closestIdle({ robots, statusMap, targetPos, nodesById }) {
  let best = null;
  let bestDist = Infinity;
  for (const robot of robots) {
    const status = statusMap[robot.id];
    const pos = getRobotPosition(status, nodesById);
    const dist = distance(pos, targetPos);
    if (dist < bestDist) {
      bestDist = dist;
      best = robot;
    }
  }
  return best;
}

function roundRobin({ robots, state }) {
  if (!state) {
    return robots[0] || null;
  }
  const ordered = [...robots].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  state.lastIndex = Number.isFinite(state.lastIndex) ? state.lastIndex : -1;
  const nextIndex = (state.lastIndex + 1) % ordered.length;
  state.lastIndex = nextIndex;
  return ordered[nextIndex] || null;
}

const registry = {
  closest_idle: closestIdle,
  round_robin: roundRobin
};

function resolveStrategy(name) {
  if (!name) {
    return registry.closest_idle;
  }
  return registry[name] || registry.closest_idle;
}

module.exports = {
  resolveStrategy,
  getRobotPosition
};
