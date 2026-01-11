function createChargeController(options = {}) {
  const {
    robot,
    chargeStationIds,
    approachValue,
    clampBattery,
    isStopped,
    constants
  } = options;
  if (!robot) {
    throw new Error('charge: missing robot');
  }
  const stationSet = chargeStationIds instanceof Set ? chargeStationIds : new Set();
  const safeIsStopped = typeof isStopped === 'function' ? isStopped : () => true;
  const safeApproach = typeof approachValue === 'function' ? approachValue : (v) => v;
  const safeClamp = typeof clampBattery === 'function' ? clampBattery : (v) => v;

  const {
    AUTO_CHARGE_DELAY_MS = 0,
    CHARGE_START_CURRENT_A,
    CHARGE_START_HOLD_MS = 0,
    CHARGE_CURRENT_A = 0,
    CHARGE_CURRENT_RAMP_A_S = 0,
    CHARGE_VOLTAGE_V = 0,
    CHARGE_VOLTAGE_RAMP_V_S = 0,
    IDLE_CURRENT_A = 0,
    IDLE_VOLTAGE_V = 0
  } = constants || {};

  function isChargeStationId(id) {
    return Boolean(id && stationSet.has(id));
  }

  function setChargeTarget(targetId) {
    const nextId = isChargeStationId(targetId) ? targetId : null;
    if (robot.chargeTargetId === nextId) {
      return;
    }
    robot.chargeTargetId = nextId;
    robot.chargeEngageAt = null;
    robot.chargeActiveAt = null;
    if (!nextId) {
      robot.charging = false;
    }
  }

  function updateCharging(now, dt) {
    if (!Number.isFinite(dt) || dt <= 0) {
      return;
    }
    const chargeTargetId = robot.chargeTargetId;
    const atChargePoint =
      chargeTargetId &&
      robot.currentStation === chargeTargetId &&
      isChargeStationId(chargeTargetId) &&
      safeIsStopped();

    if (atChargePoint) {
      if (!robot.chargeEngageAt) {
        robot.chargeEngageAt = now + Math.max(0, AUTO_CHARGE_DELAY_MS);
      }
      if (now >= robot.chargeEngageAt) {
        if (!robot.charging) {
          robot.charging = true;
          robot.chargeActiveAt = now;
          if (Number.isFinite(CHARGE_START_CURRENT_A)) {
            robot.current = CHARGE_START_CURRENT_A;
          }
        }
      }
    } else {
      robot.chargeEngageAt = null;
      robot.chargeActiveAt = null;
      if (robot.charging) {
        robot.charging = false;
      }
    }

    const holdMs = Math.max(0, CHARGE_START_HOLD_MS || 0);
    const holdActive =
      robot.charging &&
      Number.isFinite(robot.chargeActiveAt) &&
      holdMs > 0 &&
      now - robot.chargeActiveAt < holdMs;
    const useStartCurrent = holdActive && Number.isFinite(CHARGE_START_CURRENT_A);
    const targetCurrent = robot.charging
      ? useStartCurrent
        ? CHARGE_START_CURRENT_A
        : CHARGE_CURRENT_A
      : IDLE_CURRENT_A;
    const targetVoltage = robot.charging
      ? holdActive
        ? IDLE_VOLTAGE_V
        : CHARGE_VOLTAGE_V
      : IDLE_VOLTAGE_V;
    if (Number.isFinite(targetCurrent)) {
      robot.current = safeApproach(
        robot.current,
        targetCurrent,
        CHARGE_CURRENT_RAMP_A_S,
        CHARGE_CURRENT_RAMP_A_S,
        dt
      );
    }
    if (Number.isFinite(targetVoltage)) {
      robot.voltage = safeApproach(
        robot.voltage,
        targetVoltage,
        CHARGE_VOLTAGE_RAMP_V_S,
        CHARGE_VOLTAGE_RAMP_V_S,
        dt
      );
    }
  }

  function applyOdo(distance) {
    if (!Number.isFinite(distance) || distance <= 0) {
      return;
    }
    robot.odo += distance;
    robot.todayOdo += distance;
    robot.battery = safeClamp(robot.battery - distance * 0.02);
    if (Array.isArray(robot.motors)) {
      for (const motor of robot.motors) {
        motor.position += distance;
      }
    }
  }

  return {
    isChargeStationId,
    setChargeTarget,
    updateCharging,
    applyOdo
  };
}

module.exports = {
  createChargeController
};
