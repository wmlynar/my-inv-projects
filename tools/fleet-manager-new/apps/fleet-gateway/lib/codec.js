const VALID_COMMAND_TYPES = new Set(['goTarget', 'forkHeight', 'stop']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function compactRecord(record) {
  const output = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
}

function buildPose(raw) {
  if (!raw) return null;
  const poseSource = raw.pose || raw.pos || null;
  const x = toNumber(poseSource?.x ?? raw.x);
  const y = toNumber(poseSource?.y ?? raw.y);
  const angle = toNumber(poseSource?.angle ?? poseSource?.heading ?? raw.angle ?? raw.heading);
  if (x == null || y == null || angle == null) {
    return null;
  }
  return { x, y, angle };
}

function normalizeStatus(raw) {
  if (!isPlainObject(raw)) {
    return {};
  }

  const nodeId = raw.nodeId
    ?? raw.currentStation
    ?? raw.current_station
    ?? null;

  const lastNodeId = raw.lastNodeId
    ?? raw.lastStation
    ?? raw.last_station
    ?? null;

  const targetNodeId = raw.targetNodeId
    ?? raw.target_id
    ?? null;

  const forkHeightM = toNumber(raw.forkHeightM ?? raw.fork_height ?? raw.fork?.fork_height);
  const speed = toNumber(raw.speed ?? raw.speed_mps);
  const battery = toNumber(raw.battery ?? raw.battery_pct ?? raw.batteryPercent);
  const blocked = typeof raw.blocked === 'boolean' ? raw.blocked : undefined;
  const manualMode = typeof raw.manualMode === 'boolean'
    ? raw.manualMode
    : (raw.state === 'manual' ? true : undefined);
  const navPaused = typeof raw.navPaused === 'boolean'
    ? raw.navPaused
    : (raw.taskStatus === 3 ? true : undefined);

  let status = raw.status;
  if (!status && typeof raw.online === 'boolean') {
    status = raw.online ? 'online' : 'offline';
  }

  return compactRecord({
    nodeId,
    lastNodeId,
    targetNodeId,
    pose: buildPose(raw) || undefined,
    forkHeightM: forkHeightM ?? undefined,
    speed: speed ?? undefined,
    battery: battery ?? undefined,
    blocked,
    manualMode,
    navPaused,
    status
  });
}

function validateCommand(command) {
  if (!isPlainObject(command)) {
    return { ok: false, error: 'command' };
  }
  if (!VALID_COMMAND_TYPES.has(command.type)) {
    return { ok: false, error: 'type' };
  }
  if (command.type === 'goTarget') {
    const payload = command.payload || {};
    const targetId = payload.targetExternalId || payload.targetRef?.nodeId;
    if (typeof targetId !== 'string' || !targetId.trim()) {
      return { ok: false, error: 'targetRef' };
    }
  }
  if (command.type === 'forkHeight') {
    const toHeightM = toNumber(command.payload?.toHeightM);
    if (toHeightM == null) {
      return { ok: false, error: 'toHeightM' };
    }
  }
  return { ok: true };
}

module.exports = {
  normalizeStatus,
  validateCommand
};
