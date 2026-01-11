const STATES = {
  SOFT_EMC: 'soft_emc',
  PAUSED: 'paused',
  BLOCKED: 'blocked',
  MANUAL: 'manual',
  RELOCATING: 'relocating',
  MOVING: 'moving',
  CHARGING: 'charging',
  IDLE: 'idle'
};

function deriveState(robot) {
  if (!robot) {
    return STATES.IDLE;
  }
  if (robot.softEmc || robot.emergency || robot.driverEmc) {
    return STATES.SOFT_EMC;
  }
  if (robot.paused) {
    return STATES.PAUSED;
  }
  if (robot.blocked) {
    return STATES.BLOCKED;
  }
  if (robot.manual && robot.manual.active) {
    return STATES.MANUAL;
  }
  if (robot.relocStatus === 2) {
    return STATES.RELOCATING;
  }
  if (robot.currentTask) {
    return STATES.MOVING;
  }
  if (robot.charging) {
    return STATES.CHARGING;
  }
  return STATES.IDLE;
}

function createStateMachine(options = {}) {
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const onTransition = typeof options.onTransition === 'function' ? options.onTransition : null;

  function update(robot) {
    if (!robot) {
      return null;
    }
    const prev = robot.state || STATES.IDLE;
    const next = deriveState(robot);
    if (prev === next) {
      return null;
    }
    robot.state = next;
    robot.stateChangedAt = now();
    if (onTransition) {
      onTransition({ from: prev, to: next, at: robot.stateChangedAt });
    }
    return { from: prev, to: next };
  }

  return {
    update,
    deriveState
  };
}

module.exports = {
  STATES,
  createStateMachine,
  deriveState
};
