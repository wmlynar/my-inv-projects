const { API, encodeFrame, responseApi, RbkParser } = require('../../../packages/robokit-lib/rbk');

function resolveTargetId(command) {
  const payload = command?.payload || {};
  return payload.targetExternalId || payload.targetRef?.nodeId || null;
}

function buildRobokitCommand(command) {
  if (!command || !command.type) {
    return null;
  }
  if (command.type === 'goTarget') {
    const targetId = resolveTargetId(command);
    const extra = command.payload || {};
    const payload = { id: targetId };
    for (const [key, value] of Object.entries(extra)) {
      if (key === 'targetRef' || key === 'targetExternalId') continue;
      if (value !== undefined) {
        payload[key] = value;
      }
    }
    return {
      port: 'task',
      apiNo: API.robot_task_gotarget_req,
      payload
    };
  }
  if (command.type === 'forkHeight') {
    return {
      port: 'other',
      apiNo: API.robot_other_forkheight_req,
      payload: { height: command.payload?.toHeightM }
    };
  }
  if (command.type === 'stop') {
    return {
      port: 'ctrl',
      apiNo: API.robot_control_stop_req,
      payload: {}
    };
  }
  return null;
}

function encodeCommandFrame(seq, command) {
  const mapping = buildRobokitCommand(command);
  if (!mapping) {
    return null;
  }
  return encodeFrame(seq, mapping.apiNo, mapping.payload);
}

function createFrameAssembler(options = {}) {
  const parser = new RbkParser({
    maxBodyLength: options.maxBodyLength,
    strictStartMark: Boolean(options.strictStartMark),
    reportErrors: Boolean(options.reportErrors)
  });

  const state = {
    buffer: Buffer.alloc(0),
    expectedLen: 0,
    lastGoodFrameTsMs: 0,
    resyncCount: 0
  };

  function push(chunk, nowMs = Date.now()) {
    let messages = [];
    try {
      messages = parser.push(chunk);
    } catch (_err) {
      state.resyncCount += 1;
      parser.buffer = Buffer.alloc(0);
      state.buffer = parser.buffer;
      return [];
    }
    state.buffer = parser.buffer;
    if (messages.length) {
      state.lastGoodFrameTsMs = nowMs;
    }
    return messages;
  }

  return { state, push };
}

module.exports = {
  API,
  responseApi,
  resolveTargetId,
  buildRobokitCommand,
  encodeCommandFrame,
  createFrameAssembler
};
