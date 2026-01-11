function createPushManager(options = {}) {
  const {
    pushConnections,
    buildPushPayload,
    encodeFrame,
    apiNo,
    minIntervalMs,
    maxIntervalMs,
    maxQueueBytes,
    now,
    log
  } = options;
  if (!pushConnections || typeof pushConnections.forEach !== 'function') {
    throw new Error('push_manager: pushConnections must be a Map');
  }
  if (typeof buildPushPayload !== 'function') {
    throw new Error('push_manager: buildPushPayload must be a function');
  }
  if (typeof encodeFrame !== 'function') {
    throw new Error('push_manager: encodeFrame must be a function');
  }
  let seq = 1;
  const getNow = typeof now === 'function' ? now : () => Date.now();
  const logger = typeof log === 'function' ? log : null;

  function clampInterval(value) {
    if (!Number.isFinite(value)) {
      return Number.isFinite(minIntervalMs) ? minIntervalMs : 0;
    }
    const min = Number.isFinite(minIntervalMs) ? minIntervalMs : 0;
    const max = Number.isFinite(maxIntervalMs) && maxIntervalMs > 0 ? maxIntervalMs : value;
    return Math.max(min, Math.min(value, max));
  }

  function enable(conn) {
    if (!conn) {
      return;
    }
    conn.enabled = true;
    conn.lastSentAt = 0;
  }

  function disable(conn) {
    if (!conn) {
      return;
    }
    conn.enabled = false;
  }

  function tick() {
    const nowMs = getNow();
    for (const conn of pushConnections.values()) {
      if (!conn || !conn.socket || conn.socket.destroyed) {
        continue;
      }
      if (!conn.enabled) {
        continue;
      }
      const interval = clampInterval(Number.parseInt(conn.intervalMs || 0, 10));
      if (conn.lastSentAt && nowMs - conn.lastSentAt < interval) {
        continue;
      }
      if (maxQueueBytes && conn.socket.writableLength > maxQueueBytes) {
        conn.socket.destroy();
        continue;
      }
      conn.trimmed = false;
      const payload = buildPushPayload(conn);
      if (conn.trimmed && !conn.trimNoticeLogged) {
        if (logger) {
          logger('push_payload_trimmed', {});
        } else {
          console.warn('robokit-robot-sim push payload trimmed to PUSH_MAX_FIELDS');
        }
        conn.trimNoticeLogged = true;
      }
      const frame = encodeFrame(seq++, apiNo, payload);
      conn.socket.write(frame);
      conn.lastSentAt = nowMs;
    }
  }

  return {
    enable,
    disable,
    tick
  };
}

module.exports = {
  createPushManager
};
