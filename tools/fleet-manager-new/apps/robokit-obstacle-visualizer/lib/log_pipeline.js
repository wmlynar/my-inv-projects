const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { readJson5 } = require('../../map-compiler-visualizer/lib/config');

const STATE_API_NO = 11100;
const TASK_GOTARGET_API = 3051;
const TASK_CANCEL_API = 3003;

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function toNumber(value, fallback = null) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeAlerts(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      return {
        code: item.code ?? item.err_code ?? null,
        desc: item.desc ?? item.message ?? item.msg ?? '',
        dateTime: item.dateTime ?? item.time ?? null,
        timestamp: item.timestamp ?? null
      };
    })
    .filter(Boolean);
}

function parseConnId(fileName) {
  const match = fileName.match(/conn_(c\d+)_frames_\d+\.jsonl$/);
  return match ? match[1] : null;
}

function listConnFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return {};
  const files = fs.readdirSync(dirPath);
  const grouped = {};
  files.forEach((file) => {
    const connId = parseConnId(file);
    if (!connId) return;
    if (!grouped[connId]) grouped[connId] = [];
    grouped[connId].push(path.join(dirPath, file));
  });
  Object.values(grouped).forEach((list) => {
    list.sort();
  });
  return grouped;
}

async function readJsonLines(filePath, onRecord) {
  if (!fs.existsSync(filePath)) return;
  const stream = fs.createReadStream(filePath, 'utf8');
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let record;
    try {
      record = JSON.parse(trimmed);
    } catch (_err) {
      continue;
    }
    await onRecord(record);
  }
}

async function countStateFrames(files) {
  let count = 0;
  for (const filePath of files) {
    await readJsonLines(filePath, (record) => {
      if (record?.dir !== 's2c') return;
      if (record?.header?.apiNo !== STATE_API_NO) return;
      count += 1;
    });
  }
  return count;
}

async function chooseStateConn(logDir, preferredConn) {
  const stateDir = path.join(logDir, 'tcp', 'state');
  const grouped = listConnFiles(stateDir);
  const connIds = Object.keys(grouped);
  if (!connIds.length) {
    throw new Error('no state conn files found');
  }

  if (preferredConn) {
    const normalized = preferredConn.replace(/^conn_/, '');
    if (!grouped[normalized]) {
      throw new Error(`state conn not found: ${preferredConn}`);
    }
    return { connId: normalized, files: grouped[normalized] };
  }

  let best = null;
  let bestCount = -1;
  for (const connId of connIds) {
    const count = await countStateFrames(grouped[connId]);
    if (count > bestCount) {
      bestCount = count;
      best = connId;
    }
  }

  if (!best || bestCount <= 0) {
    throw new Error('no apiNo=11100 frames found');
  }

  return { connId: best, files: grouped[best] };
}

function parseStatePayload(record) {
  if (!record || record.dir !== 's2c' || record?.header?.apiNo !== STATE_API_NO) return null;
  const payload = record.json;
  if (!payload || typeof payload !== 'object') return null;
  const x = toNumber(payload.x);
  const y = toNumber(payload.y);
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  return {
    tsMs: toNumber(record.tsMs, 0),
    create_on: payload.create_on ?? null,
    x,
    y,
    yaw: toNumber(payload.yaw, toNumber(payload.angle, 0)),
    vx: toNumber(payload.vx, 0),
    vy: toNumber(payload.vy, 0),
    w: toNumber(payload.w, 0),
    running_status: toNumber(payload.running_status, null),
    task_status: toNumber(payload.task_status, null),
    target_id: payload.target_id ?? null,
    current_station: payload.current_station ?? null,
    emergency: Boolean(payload.emergency),
    soft_emc: Boolean(payload.soft_emc),
    driver_emc: Boolean(payload.driver_emc),
    manualBlock: Boolean(payload.manualBlock),
    blocked: Boolean(payload.blocked),
    slowed: Boolean(payload.slowed),
    slow_reason: toNumber(payload.slow_reason, 0),
    warnings: normalizeAlerts(payload.warnings),
    errors: normalizeAlerts(payload.errors),
    block_x: toNumber(payload.block_x),
    block_y: toNumber(payload.block_y),
    nearest_obstacles: Array.isArray(payload.nearest_obstacles) ? payload.nearest_obstacles : [],
    current_map: payload.current_map ?? null,
    current_map_md5: payload.current_map_md5 ?? null,
    vehicle_id: payload.vehicle_id ?? null
  };
}

function downsampleTrajectory(points, maxPoints) {
  if (!maxPoints || points.length <= maxPoints) return points;
  const minDist = 0.1;
  const minDt = 200;
  const filtered = [];
  let last = null;
  points.forEach((point) => {
    if (!last) {
      filtered.push(point);
      last = point;
      return;
    }
    const dist = Math.hypot(point.x - last.x, point.y - last.y);
    const dt = point.tsMs - last.tsMs;
    if (dist >= minDist || dt >= minDt) {
      filtered.push(point);
      last = point;
    }
  });
  if (filtered.length <= maxPoints) return filtered;
  const stride = Math.ceil(filtered.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < filtered.length; i += stride) {
    sampled.push(filtered[i]);
  }
  return sampled;
}

function buildWarningEvents(positions, errorEvents) {
  const events = [];
  const errorTs = new Set(errorEvents.map((event) => event.tsMs));
  let lastCodes = new Set();
  positions.forEach((frame) => {
    const warnings = frame.warnings || [];
    if (!warnings.length || errorTs.has(frame.tsMs)) {
      lastCodes = new Set(warnings.map((warn) => warn.code));
      return;
    }
    const nextCodes = new Set();
    warnings.forEach((warn) => {
      nextCodes.add(warn.code);
      if (!lastCodes.has(warn.code)) {
        events.push({
          tsMs: frame.tsMs,
          x: frame.x,
          y: frame.y,
          kind: 'warning',
          detail: {
            code: warn.code ?? null,
            desc: warn.desc ?? '',
            dateTime: warn.dateTime ?? null,
            timestamp: warn.timestamp ?? null
          }
        });
      }
    });
    lastCodes = nextCodes;
  });
  return events;
}

function buildStopSlowEvents(positions, stopSpeedMps, stopHoldMs, slowSpeedMps) {
  const events = [];
  let stopActive = false;
  let slowActive = false;
  let lowSpeedStart = null;

  positions.forEach((frame) => {
    const speed = Math.hypot(frame.vx || 0, frame.vy || 0);
    const runningStatus = Number.isFinite(frame.running_status) ? frame.running_status : null;

    if (speed < stopSpeedMps) {
      if (lowSpeedStart === null) {
        lowSpeedStart = frame.tsMs;
      }
    } else {
      lowSpeedStart = null;
    }

    const stopByRunning = runningStatus === 0;
    const stopBySpeed = lowSpeedStart !== null && frame.tsMs - lowSpeedStart >= stopHoldMs;
    const isStop = stopByRunning || stopBySpeed;

    if (isStop && !stopActive) {
      events.push({
        tsMs: frame.tsMs,
        x: frame.x,
        y: frame.y,
        kind: 'stop',
        detail: {
          speed,
          running_status: runningStatus,
          reason: stopByRunning ? 'running_status' : 'speed'
        }
      });
    }
    stopActive = isStop;

    const slowReason = Number.isFinite(frame.slow_reason) ? frame.slow_reason : 0;
    const isSlow = Boolean(frame.slowed) || slowReason !== 0 || speed < slowSpeedMps;
    if (isSlow && !slowActive) {
      events.push({
        tsMs: frame.tsMs,
        x: frame.x,
        y: frame.y,
        kind: 'slow',
        detail: {
          speed,
          slow_reason: slowReason,
          slowed: Boolean(frame.slowed)
        }
      });
    }
    slowActive = isSlow;
  });

  return events;
}

function buildErrorEvents(errors) {
  return errors.map((event) => ({
    tsMs: event.tsMs,
    x: event.x,
    y: event.y,
    kind: 'error',
    detail: {
      errors: event.errors || [],
      warnings: event.warnings || [],
      emergency: Boolean(event.emergency),
      running_status: event.running_status ?? null,
      task_status: event.task_status ?? null,
      target_id: event.target_id ?? null,
      current_station: event.current_station ?? null
    }
  }));
}

function findNearestPosition(tsMs, positions) {
  if (!positions.length) return null;
  let lo = 0;
  let hi = positions.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (positions[mid].tsMs < tsMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const idx = lo;
  const prev = positions[idx - 1];
  const curr = positions[idx];
  if (!prev) return curr;
  if (!curr) return prev;
  return Math.abs(curr.tsMs - tsMs) < Math.abs(prev.tsMs - tsMs) ? curr : prev;
}

async function loadTaskEvents(logDir, timeFrom, timeTo) {
  const taskDir = path.join(logDir, 'tcp', 'task');
  const grouped = listConnFiles(taskDir);
  const events = [];
  const files = Object.values(grouped).flat();
  if (!files.length) return events;

  for (const filePath of files) {
    await readJsonLines(filePath, (record) => {
      if (!record || record.dir !== 'c2s') return;
      const apiNo = record?.header?.apiNo;
      if (apiNo !== TASK_GOTARGET_API && apiNo !== TASK_CANCEL_API) return;
      const tsMs = toNumber(record.tsMs, 0);
      if (timeFrom && tsMs < timeFrom) return;
      if (timeTo && tsMs > timeTo) return;
      if (apiNo === TASK_GOTARGET_API) {
        events.push({
          tsMs,
          kind: 'gotarget',
          detail: { id: record?.json?.id ?? null }
        });
      }
      if (apiNo === TASK_CANCEL_API) {
        events.push({
          tsMs,
          kind: 'cancel',
          detail: { id: record?.json?.id ?? null }
        });
      }
    });
  }

  events.sort((a, b) => a.tsMs - b.tsMs);
  return events;
}

async function buildDataset(options = {}) {
  const logDir = options.logDir ? path.resolve(options.logDir) : null;
  if (!logDir || !fs.existsSync(logDir)) {
    throw new Error(`log dir not found: ${options.logDir || ''}`);
  }

  const sessionMetaPath = path.join(logDir, 'session.meta.json5');
  const sessionMeta = fs.existsSync(sessionMetaPath) ? readJson5(sessionMetaPath) : null;

  const { connId, files } = await chooseStateConn(logDir, options.stateConn);
  const timeFrom = Number.isFinite(options.timeFrom) ? options.timeFrom : null;
  const timeTo = Number.isFinite(options.timeTo) ? options.timeTo : null;

  const positions = [];
  const blocks = [];
  const nearest = [];
  const errors = [];

  let mapName = null;
  let mapMd5 = null;
  let vehicleId = null;

  for (const filePath of files) {
    await readJsonLines(filePath, (record) => {
      const frame = parseStatePayload(record);
      if (!frame) return;
      const tsMs = frame.tsMs;
      if (timeFrom && tsMs < timeFrom) return;
      if (timeTo && tsMs > timeTo) return;
      positions.push(frame);

      if (isFiniteNumber(frame.block_x) && isFiniteNumber(frame.block_y)) {
        blocks.push({ tsMs, x: frame.block_x, y: frame.block_y });
      }

      if (Array.isArray(frame.nearest_obstacles)) {
        frame.nearest_obstacles.forEach((item) => {
          const ox = toNumber(item?.x);
          const oy = toNumber(item?.y);
          if (isFiniteNumber(ox) && isFiniteNumber(oy)) {
            nearest.push({ tsMs, x: ox, y: oy });
          }
        });
      }

      if (frame.errors.length > 0 || frame.emergency) {
        errors.push({
          tsMs,
          x: frame.x,
          y: frame.y,
          emergency: frame.emergency,
          errors: frame.errors,
          warnings: frame.warnings,
          running_status: frame.running_status,
          task_status: frame.task_status,
          target_id: frame.target_id,
          current_station: frame.current_station,
          create_on: frame.create_on
        });
      }

      if (!mapName && frame.current_map) mapName = frame.current_map;
      if (!mapMd5 && frame.current_map_md5) mapMd5 = frame.current_map_md5;
      if (!vehicleId && frame.vehicle_id) vehicleId = frame.vehicle_id;
    });
  }

  positions.sort((a, b) => a.tsMs - b.tsMs);
  blocks.sort((a, b) => a.tsMs - b.tsMs);
  nearest.sort((a, b) => a.tsMs - b.tsMs);
  errors.sort((a, b) => a.tsMs - b.tsMs);

  const trajectory = downsampleTrajectory(positions, options.maxPoints || 0);

  const errorEvents = buildErrorEvents(errors);
  const warningEvents = buildWarningEvents(positions, errorEvents);
  const stopSlowEvents = buildStopSlowEvents(
    positions,
    options.stopSpeedMps || 0.05,
    options.stopHoldMs || 400,
    options.slowSpeedMps || 0.2
  );
  const taskEvents = await loadTaskEvents(logDir, timeFrom, timeTo);
  const events = [...errorEvents, ...warningEvents, ...stopSlowEvents];

  taskEvents.forEach((event) => {
    const nearestPos = findNearestPosition(event.tsMs, positions);
    events.push({
      tsMs: event.tsMs,
      x: nearestPos?.x ?? null,
      y: nearestPos?.y ?? null,
      kind: event.kind,
      detail: event.detail || {}
    });
  });

  events.sort((a, b) => a.tsMs - b.tsMs);

  const firstTs = positions.length ? positions[0].tsMs : null;
  const lastTs = positions.length ? positions[positions.length - 1].tsMs : null;

  const session = {
    sessionName: sessionMeta?.sessionName ?? null,
    description: sessionMeta?.description ?? null,
    startedTsMs: sessionMeta?.startedTsMs ?? firstTs,
    endedTsMs: sessionMeta?.endedTsMs ?? lastTs,
    operator: sessionMeta?.operator ?? null,
    robotId: sessionMeta?.targets?.[0]?.robotId ?? vehicleId ?? null,
    stateConn: connId,
    mapName,
    mapMd5,
    timeRange: {
      firstTsMs: firstTs,
      lastTsMs: lastTs,
      durationMs: firstTs !== null && lastTs !== null ? lastTs - firstTs : null
    },
    counts: {
      frames: positions.length,
      trajectory: trajectory.length,
      blocks: blocks.length,
      nearest: nearest.length,
      errors: errors.length,
      events: events.length
    }
  };

  return {
    session,
    trajectory,
    blocks,
    nearest,
    errors,
    events
  };
}

module.exports = {
  buildDataset
};
