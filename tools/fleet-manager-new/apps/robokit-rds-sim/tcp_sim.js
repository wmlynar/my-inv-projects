const fs = require('fs');
const net = require('net');
const path = require('path');

const { API, encodeFrame, responseApi, RbkParser } = require('../../packages/robokit-lib/rbk');

const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';
const STATE_PORT = Number.parseInt(process.env.STATE_PORT || '19204', 10);
const CONFIG_PORT = Number.parseInt(process.env.CONFIG_PORT || '19207', 10);
const KERNEL_PORT = Number.parseInt(process.env.KERNEL_PORT || '19208', 10);
const MAX_BODY_LENGTH = Number.parseInt(process.env.MAX_BODY_LENGTH || String(1024 * 1024), 10);

const infoPath = path.resolve(__dirname, 'data', 'rds_info.json');
const initPath = path.resolve(__dirname, 'data', 'rds_init.json');
const statusAllPath = path.resolve(__dirname, 'data', 'rds_status_all.json');
const paramsPath = path.resolve(__dirname, 'rds_params.json');
const deviceTypesPath = path.resolve(__dirname, 'rds_device_types.json');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

const infoBase = readJsonSafe(infoPath) || {};
const initBase = readJsonSafe(initPath) || {};
const statusAllBase = readJsonSafe(statusAllPath) || {};
const paramsPayload = readJsonSafe(paramsPath) || {};
const deviceTypesPayload = readJsonSafe(deviceTypesPath) || {};
const echoidType = Number.isFinite(Number(infoBase.echoid_type))
  ? Number(infoBase.echoid_type)
  : Number.parseInt(infoBase.echoid_type, 0) || 2;

function nowIso() {
  return new Date().toISOString();
}

function withUpdatedTimestamp(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  const clone = { ...payload };
  if (Object.prototype.hasOwnProperty.call(clone, 'create_on')) {
    clone.create_on = nowIso();
  }
  return clone;
}

function buildFilePayload(payload) {
  return {
    ret_code: 0,
    file_path: payload && payload.file_path ? payload.file_path : '',
    type: payload && payload.type ? payload.type : '',
    size: 0
  };
}

function buildReserved(apiNo) {
  const value = apiNo & 0xffff;
  return Buffer.from([(value >> 8) & 0xff, value & 0xff, 0x00, 0x00, 0x00, echoidType & 0xff]);
}

function handleRequest(apiNo, payload) {
  switch (apiNo) {
    case API.robot_status_info_req:
      return withUpdatedTimestamp(infoBase);
    case API.robot_status_init_req:
      return withUpdatedTimestamp(initBase);
    case API.robot_status_all1_req:
      return withUpdatedTimestamp(statusAllBase);
    case API.robot_status_params_req:
      return paramsPayload;
    case API.robot_status_device_types_req:
      return deviceTypesPayload;
    case API.robot_status_file_req:
      return buildFilePayload(payload);
    default:
      return { ret_code: 0 };
  }
}

function createServer(port, label) {
  const server = net.createServer((socket) => {
    const parser = new RbkParser({ maxBodyLength: MAX_BODY_LENGTH });
    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (_err) {
        socket.destroy();
        return;
      }
      for (const msg of messages) {
        const responsePayload = handleRequest(msg.apiNo, msg.payload);
        const frame = encodeFrame(msg.seq, responseApi(msg.apiNo), responsePayload, {
          reserved: buildReserved(msg.apiNo)
        });
        socket.write(frame);
      }
    });
  });

  server.listen(port, BIND_HOST, () => {
    console.log(`robokit-rds-sim ${label} listening on tcp://${BIND_HOST}:${port}`);
  });

  return server;
}

function startTcpSim() {
  const ports = [STATE_PORT, CONFIG_PORT, KERNEL_PORT].filter((port) => Number.isFinite(port) && port > 0);
  const unique = Array.from(new Set(ports));
  const servers = unique.map((port) => {
    const label = port === STATE_PORT ? 'state' : port === CONFIG_PORT ? 'config' : 'kernel';
    return createServer(port, label);
  });
  return servers;
}

module.exports = { startTcpSim };
