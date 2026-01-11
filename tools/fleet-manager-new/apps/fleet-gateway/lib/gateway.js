const crypto = require('crypto');
const { validateCommand } = require('./codec');
const { createProviderForRobot } = require('./providers');

function nowMs() {
  return Date.now();
}

function createId(prefix) {
  const rand = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function buildCommandKey(commandId) {
  return commandId || createId('cmd');
}

function toProviderStatus(entry, nowMsValue) {
  return entry.provider.getSnapshot(nowMsValue);
}

function buildRobotResponse(entry, nowMsValue) {
  const provider = toProviderStatus(entry, nowMsValue);
  return {
    robotId: entry.robotId,
    provider,
    raw: entry.raw || undefined,
    normalized: entry.normalized || undefined
  };
}

function normalizeCommand(command, robotId) {
  if (!command || typeof command !== 'object') {
    return null;
  }
  const merged = { ...command };
  if (!merged.robotId) {
    merged.robotId = robotId;
  }
  return merged;
}

function createGateway(config = {}, deps = {}) {
  const robots = new Map();
  const commandDedupTtlMs = Number.isFinite(config.commandDedupTtlMs)
    ? config.commandDedupTtlMs
    : 60000;

  const createProvider = deps.createProvider || ((robot) => createProviderForRobot(robot, config, deps));

  const robotList = Array.isArray(config.robots) ? config.robots : [];
  robotList.forEach((robot) => {
    if (!robot?.robotId) {
      return;
    }
    const provider = createProvider(robot);
    robots.set(robot.robotId, {
      robotId: robot.robotId,
      robotConfig: { ...robot },
      provider,
      raw: null,
      normalized: null,
      commandDedup: new Map()
    });
  });

  function pruneDedup(entry, nowMsValue) {
    if (!commandDedupTtlMs) {
      return;
    }
    for (const [key, item] of entry.commandDedup.entries()) {
      if (nowMsValue - item.firstSeenTsMs > commandDedupTtlMs) {
        entry.commandDedup.delete(key);
      }
    }
  }

  async function refreshRobot(entry, nowMsValue) {
    if (!entry) return null;
    const status = await entry.provider.getStatus({ nowMs: nowMsValue, refresh: true });
    if (status?.raw) {
      entry.raw = status.raw;
    }
    if (status?.normalized) {
      entry.normalized = status.normalized;
    }
    return entry;
  }

  async function listRobots() {
    const now = nowMs();
    await Promise.all(
      Array.from(robots.values()).map((entry) => refreshRobot(entry, now))
    );
    return Array.from(robots.values()).map((entry) => buildRobotResponse(entry, now));
  }

  async function getRobotStatus(robotId) {
    const entry = robots.get(robotId);
    if (!entry) {
      return null;
    }
    await refreshRobot(entry, nowMs());
    return {
      robotId,
      normalized: entry.normalized || null
    };
  }

  async function sendCommand(robotId, command, nowMsValue = nowMs()) {
    const entry = robots.get(robotId);
    if (!entry) {
      return { ok: false, httpStatus: 404, error: 'robot_not_found' };
    }

    const normalized = normalizeCommand(command, robotId);
    if (!normalized) {
      return { ok: false, httpStatus: 400, error: 'invalid_command' };
    }
    if (normalized.robotId && normalized.robotId !== robotId) {
      return { ok: false, httpStatus: 400, error: 'robot_mismatch' };
    }

    const validation = validateCommand(normalized);
    if (!validation.ok) {
      return { ok: false, httpStatus: 400, error: validation.error };
    }

    const commandId = buildCommandKey(normalized.commandId);
    normalized.commandId = commandId;

    pruneDedup(entry, nowMsValue);
    if (entry.commandDedup.has(commandId)) {
      return { ok: true, httpStatus: 200, ack: entry.commandDedup.get(commandId).lastResult };
    }

    const providerSnapshot = toProviderStatus(entry, nowMsValue);
    if (providerSnapshot.status !== 'online') {
      const reason = providerSnapshot.status === 'connecting'
        ? 'PROVIDER_SWITCHING'
        : 'PROVIDER_OFFLINE';
      const ack = {
        commandId,
        transport: {
          status: 'failed',
          acceptedTsMs: nowMsValue,
          providerKind: providerSnapshot.kind
        },
        robotAck: { status: 'notSupported' },
        statusReasonCode: reason,
        providerCommand: null
      };
      entry.commandDedup.set(commandId, { firstSeenTsMs: nowMsValue, lastResult: ack });
      return { ok: false, httpStatus: 503, ack };
    }

    let result = null;
    try {
      result = await entry.provider.sendCommand(normalized, nowMsValue);
    } catch (err) {
      result = {
        ok: false,
        statusReasonCode: 'FAILED',
        httpStatus: 500,
        providerCommand: null,
        robotAck: { status: 'failed' }
      };
    }

    const ack = {
      commandId,
      transport: {
        status: result.ok ? 'accepted' : 'failed',
        acceptedTsMs: nowMsValue,
        providerKind: providerSnapshot.kind
      },
      robotAck: result.robotAck || { status: result.ok ? 'received' : 'failed' },
      statusReasonCode: result.statusReasonCode || 'NONE',
      providerCommand: result.providerCommand || null
    };

    entry.commandDedup.set(commandId, { firstSeenTsMs: nowMsValue, lastResult: ack });

    return {
      ok: result.ok,
      httpStatus: result.httpStatus || (result.ok ? 200 : 503),
      ack
    };
  }

  async function switchProvider(robotId, targetProvider) {
    const entry = robots.get(robotId);
    if (!entry) {
      return { ok: false, httpStatus: 404, error: 'robot_not_found' };
    }

    if (!targetProvider || typeof targetProvider !== 'string') {
      return { ok: false, httpStatus: 400, error: 'invalid_provider' };
    }

    if (entry.provider?.kind === targetProvider) {
      return { ok: true, httpStatus: 200, provider: entry.provider.getSnapshot(nowMs()) };
    }

    if (entry.provider?.disconnect) {
      await entry.provider.disconnect();
    }

    entry.robotConfig.provider = targetProvider;
    try {
      entry.provider = createProvider(entry.robotConfig);
    } catch (err) {
      return { ok: false, httpStatus: 400, error: err.code || 'unknown_provider' };
    }

    entry.provider.connectionStatus = 'connecting';
    try {
      if (entry.provider.connect) {
        await entry.provider.connect();
      }
    } catch (err) {
      entry.provider.markError?.(err);
    }

    return { ok: true, httpStatus: 200, provider: entry.provider.getSnapshot(nowMs()) };
  }

  return {
    listRobots,
    getRobotStatus,
    sendCommand,
    switchProvider
  };
}

module.exports = {
  createGateway
};
