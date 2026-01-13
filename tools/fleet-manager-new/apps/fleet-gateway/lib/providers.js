const { normalizeStatus } = require('./codec');
const { getJson, postJson } = require('./http');
const { RobokitClient } = require('../../../packages/robokit-lib/robokit_client');
const { API, responseApi, buildRobokitCommand } = require('./robokit');

const DEFAULT_TELEMETRY_TIMEOUT_MS = 5000;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toErrorShape(err) {
  if (!err) return null;
  return {
    message: err.message || String(err),
    code: err.code || err.errno || undefined
  };
}

function mapRobokitError(err) {
  const code = err?.code || err?.message;
  if (code === 'rbk_timeout' || code === 'socket_timeout' || code === 'timeout') {
    return { statusReasonCode: 'TIMEOUT', httpStatus: 503 };
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'EPIPE' || code === 'rbk_connection_closed') {
    return { statusReasonCode: 'NETWORK_ERROR', httpStatus: 503 };
  }
  return { statusReasonCode: 'FAILED', httpStatus: 500 };
}

class BaseProvider {
  constructor({ kind, robotId, telemetryTimeoutMs }) {
    this.kind = kind;
    this.robotId = robotId;
    this.telemetryTimeoutMs = Number.isFinite(telemetryTimeoutMs)
      ? telemetryTimeoutMs
      : DEFAULT_TELEMETRY_TIMEOUT_MS;
    this.connectionStatus = 'offline';
    this.lastSeenTsMs = null;
    this.lastError = null;
    this.raw = null;
    this.normalized = null;
  }

  markSeen(nowMs) {
    this.lastSeenTsMs = nowMs;
    this.connectionStatus = 'online';
    this.lastError = null;
  }

  markError(err) {
    this.lastError = toErrorShape(err);
    if (this.connectionStatus !== 'connecting') {
      this.connectionStatus = 'error';
    }
  }

  evaluateConnectionStatus(nowMs) {
    if (this.connectionStatus === 'online' && this.lastSeenTsMs != null) {
      if (nowMs - this.lastSeenTsMs > this.telemetryTimeoutMs) {
        return 'offline';
      }
    }
    return this.connectionStatus;
  }

  getSnapshot(nowMs) {
    return {
      kind: this.kind,
      status: this.evaluateConnectionStatus(nowMs),
      lastSeenTsMs: this.lastSeenTsMs,
      lastError: this.lastError
    };
  }
}

class InternalSimProvider extends BaseProvider {
  constructor({ robotId, config = {}, httpClient }) {
    super({ kind: 'internalSim', robotId, telemetryTimeoutMs: config.telemetryTimeoutMs });
    this.baseUrl = config.baseUrl || 'http://127.0.0.1:8091';
    this.commandPathTemplate = config.commandPathTemplate || '/gateway/v1/robots/:robotId/commands';
    this.statusPath = config.statusPath || '/api/fleet/state';
    this.statusPathTemplate = config.statusPathTemplate || null;
    this.commandEnvelope = config.commandEnvelope || 'raw';
    this.timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 1200;
    this.httpClient = httpClient || { getJson, postJson };
  }

  async connect() {
    this.connectionStatus = 'online';
    return true;
  }

  async disconnect() {
    this.connectionStatus = 'offline';
  }

  buildCommandUrl() {
    const path = this.commandPathTemplate.replace(':robotId', encodeURIComponent(this.robotId));
    return new URL(path, this.baseUrl);
  }

  buildStatusUrl() {
    const template = this.statusPathTemplate || this.statusPath;
    const path = template.replace(':robotId', encodeURIComponent(this.robotId));
    return new URL(path, this.baseUrl);
  }

  async sendCommand(command, nowMs, options = {}) {
    const payload = this.commandEnvelope === 'wrapped' ? { command } : command;
    const url = this.buildCommandUrl();
    const requestId = options.requestId;
    const headers = requestId ? { 'X-Request-Id': requestId } : null;
    let response;
    try {
      response = await this.httpClient.postJson(url, payload, { timeoutMs: this.timeoutMs, headers });
    } catch (err) {
      this.markError(err);
      return {
        ok: false,
        statusReasonCode: 'NETWORK_ERROR',
        httpStatus: 503,
        providerCommand: { url: url.toString(), payload, requestId }
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        statusReasonCode: 'HTTP_ERROR',
        httpStatus: response.status || 502,
        providerCommand: { url: url.toString(), payload, requestId }
      };
    }
    this.markSeen(nowMs);
    return {
      ok: true,
      providerCommand: { url: url.toString(), payload, requestId },
      robotAck: { status: 'received', receivedTsMs: nowMs }
    };
  }

  async getStatus({ nowMs, refresh = true } = {}) {
    if (!refresh && this.normalized) {
      return {
        raw: this.raw,
        normalized: this.normalized,
        connectionStatus: this.evaluateConnectionStatus(nowMs),
        lastSeenTsMs: this.lastSeenTsMs,
        lastError: this.lastError
      };
    }

    const url = this.buildStatusUrl();
    let response;
    try {
      response = await this.httpClient.getJson(url, { timeoutMs: this.timeoutMs });
    } catch (err) {
      this.markError(err);
      return {
        raw: this.raw,
        normalized: this.normalized,
        connectionStatus: this.evaluateConnectionStatus(nowMs),
        lastSeenTsMs: this.lastSeenTsMs,
        lastError: this.lastError
      };
    }

    if (response.ok) {
      let payload = response.json;
      if (Array.isArray(payload?.robots)) {
        payload = payload.robots.find((entry) => entry.id === this.robotId || entry.robotId === this.robotId) || null;
      }
      if (payload) {
        this.raw = payload;
        this.normalized = normalizeStatus(payload);
        this.markSeen(nowMs);
      }
    }

    return {
      raw: this.raw,
      normalized: this.normalized,
      connectionStatus: this.evaluateConnectionStatus(nowMs),
      lastSeenTsMs: this.lastSeenTsMs,
      lastError: this.lastError
    };
  }
}

class SimDirectProvider extends BaseProvider {
  constructor({ robotId, config = {}, httpClient }) {
    super({ kind: 'simDirect', robotId, telemetryTimeoutMs: config.telemetryTimeoutMs });
    this.baseUrl = config.baseUrl || 'http://127.0.0.1:8092';
    this.goTargetPath = config.goTargetPath || '/sim/targets';
    this.forkHeightPath = config.forkHeightPath || '/sim/fork';
    this.stopPath = config.stopPath || '/sim/stop';
    this.statusPath = config.statusPath || '/sim/status';
    this.includeRobotId = Boolean(config.includeRobotId);
    this.timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 1200;
    this.httpClient = httpClient || { getJson, postJson };
  }

  async connect() {
    this.connectionStatus = 'online';
    return true;
  }

  async disconnect() {
    this.connectionStatus = 'offline';
  }

  async sendCommand(command, nowMs, options = {}) {
    let path = null;
    let body = null;
    if (command.type === 'goTarget') {
      const targetId = command.payload?.targetExternalId || command.payload?.targetRef?.nodeId;
      path = this.goTargetPath;
      body = { nodeId: targetId };
    } else if (command.type === 'forkHeight') {
      path = this.forkHeightPath;
      body = { height: command.payload?.toHeightM };
    } else if (command.type === 'stop') {
      path = this.stopPath;
      body = {};
    } else {
      return { ok: false, statusReasonCode: 'UNSUPPORTED', httpStatus: 400 };
    }

    if (this.includeRobotId) {
      body.robotId = this.robotId;
    }

    const url = new URL(path, this.baseUrl);
    const requestId = options.requestId;
    const headers = requestId ? { 'X-Request-Id': requestId } : null;
    let response;
    try {
      response = await this.httpClient.postJson(url, body, { timeoutMs: this.timeoutMs, headers });
    } catch (err) {
      this.markError(err);
      return {
        ok: false,
        statusReasonCode: 'NETWORK_ERROR',
        httpStatus: 503,
        providerCommand: { url: url.toString(), payload: body, requestId }
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        statusReasonCode: 'HTTP_ERROR',
        httpStatus: response.status || 502,
        providerCommand: { url: url.toString(), payload: body, requestId }
      };
    }
    this.markSeen(nowMs);
    return {
      ok: true,
      providerCommand: { url: url.toString(), payload: body, requestId },
      robotAck: { status: 'received', receivedTsMs: nowMs }
    };
  }

  async getStatus({ nowMs, refresh = true } = {}) {
    if (!refresh && this.normalized) {
      return {
        raw: this.raw,
        normalized: this.normalized,
        connectionStatus: this.evaluateConnectionStatus(nowMs),
        lastSeenTsMs: this.lastSeenTsMs,
        lastError: this.lastError
      };
    }

    const url = new URL(this.statusPath, this.baseUrl);
    let response;
    try {
      response = await this.httpClient.getJson(url, { timeoutMs: this.timeoutMs });
    } catch (err) {
      this.markError(err);
      return {
        raw: this.raw,
        normalized: this.normalized,
        connectionStatus: this.evaluateConnectionStatus(nowMs),
        lastSeenTsMs: this.lastSeenTsMs,
        lastError: this.lastError
      };
    }

    if (response.ok && response.json) {
      this.raw = response.json;
      this.normalized = normalizeStatus(response.json);
      this.markSeen(nowMs);
    }

    return {
      raw: this.raw,
      normalized: this.normalized,
      connectionStatus: this.evaluateConnectionStatus(nowMs),
      lastSeenTsMs: this.lastSeenTsMs,
      lastError: this.lastError
    };
  }
}

class RobokitProvider extends BaseProvider {
  constructor({ kind, robotId, config = {}, clientFactory }) {
    super({ kind, robotId, telemetryTimeoutMs: config.telemetryTimeoutMs });
    this.portOverrides = config.ports || {};
    this.statusPoll = config.statusPoll !== false;
    this.timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 1200;
    this.reconnect = config.reconnect || { enabled: false };
    this._reconnectTimer = null;
    this._reconnectAttempt = 0;
    this._pushSocket = null;

    if (clientFactory) {
      this.client = clientFactory();
    } else {
      this.client = new RobokitClient({
        host: config.host || '127.0.0.1',
        statePort: config.ports?.state,
        taskPort: config.ports?.task,
        ctrlPort: config.ports?.ctrl,
        otherPort: config.ports?.other,
        pushPort: config.ports?.push,
        timeoutMs: this.timeoutMs,
        maxConcurrent: Number.isFinite(config.maxConcurrent) ? config.maxConcurrent : 4,
        failureThreshold: Number.isFinite(config.failureThreshold) ? config.failureThreshold : 5,
        circuitOpenMs: Number.isFinite(config.circuitOpenMs) ? config.circuitOpenMs : 5000
      });
    }

    if (this.client && typeof this.client.on === 'function') {
      this.client.on('push', (payload) => {
        this.raw = payload;
        this.normalized = normalizeStatus(payload);
        this.markSeen(Date.now());
      });
      this.client.on('push_error', (err) => this.markError(err));
      this.client.on('push_close', () => this._handleDisconnect());
    }
  }

  async connect() {
    this.connectionStatus = 'connecting';
    if (this.client && typeof this.client.connectPush === 'function') {
      this._pushSocket = this.client.connectPush({ intervalMs: 1000 });
      if (this._pushSocket && typeof this._pushSocket.on === 'function') {
        this._pushSocket.on('close', () => this._handleDisconnect());
        this._pushSocket.on('error', (err) => this._handleDisconnect(err));
      }
    }
    this.connectionStatus = 'online';
    this.markSeen(Date.now());
    return true;
  }

  async disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.client && typeof this.client.disconnectPush === 'function') {
      this.client.disconnectPush();
    }
    this._pushSocket = null;
    this.connectionStatus = 'offline';
  }

  _handleDisconnect(err) {
    if (err) {
      this.markError(err);
    } else {
      this.connectionStatus = 'offline';
    }
    if (this.reconnect?.enabled) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }
    const baseDelay = Number.isFinite(this.reconnect.baseDelayMs)
      ? this.reconnect.baseDelayMs
      : 500;
    const maxDelay = Number.isFinite(this.reconnect.maxDelayMs)
      ? this.reconnect.maxDelayMs
      : 10000;
    const factor = Number.isFinite(this.reconnect.backoffFactor)
      ? this.reconnect.backoffFactor
      : 2;
    const delayMs = Math.min(baseDelay * Math.pow(factor, this._reconnectAttempt), maxDelay);
    this._reconnectAttempt += 1;
    this._reconnectTimer = setTimeout(() => {
      this.connect().catch((err) => this.markError(err));
    }, delayMs);
  }

  _resolvePort(key) {
    if (this.portOverrides[key]) return this.portOverrides[key];
    if (!this.client) return null;
    if (key === 'task') return this.client.taskPort;
    if (key === 'ctrl') return this.client.ctrlPort;
    if (key === 'other') return this.client.otherPort;
    if (key === 'state') return this.client.statePort;
    return null;
  }

  async sendCommand(command, nowMs) {
    const mapping = buildRobokitCommand(command);
    if (!mapping) {
      return { ok: false, statusReasonCode: 'UNSUPPORTED', httpStatus: 400 };
    }
    if (command.type === 'goTarget' && !mapping.payload?.id) {
      return { ok: false, statusReasonCode: 'INVALID_TARGET', httpStatus: 400 };
    }
    if (command.type === 'forkHeight' && toNumber(mapping.payload?.height) == null) {
      return { ok: false, statusReasonCode: 'INVALID_HEIGHT', httpStatus: 400 };
    }

    const port = this._resolvePort(mapping.port);
    if (!port) {
      return { ok: false, statusReasonCode: 'NO_PORT', httpStatus: 500 };
    }

    try {
      const response = await this.client.request(port, mapping.apiNo, mapping.payload);
      this.markSeen(nowMs);
      const retCode = response?.ret_code ?? response?.retCode;
      if (retCode && retCode !== 0) {
        return {
          ok: false,
          statusReasonCode: 'COMMAND_REJECTED',
          httpStatus: 409,
          providerCommand: { port, apiNo: mapping.apiNo, payload: mapping.payload },
          robotAck: {
            status: 'failed',
            receivedTsMs: nowMs,
            apiNo: mapping.apiNo,
            responseApiNo: responseApi(mapping.apiNo),
            lastErrorCauseCode: 'COMMAND_REJECTED'
          }
        };
      }
      return {
        ok: true,
        providerCommand: { port, apiNo: mapping.apiNo, payload: mapping.payload },
        robotAck: {
          status: 'received',
          receivedTsMs: nowMs,
          apiNo: mapping.apiNo,
          responseApiNo: responseApi(mapping.apiNo),
          lastErrorCauseCode: 'NONE'
        }
      };
    } catch (err) {
      this.markError(err);
      const mapped = mapRobokitError(err);
      return {
        ok: false,
        statusReasonCode: mapped.statusReasonCode,
        httpStatus: mapped.httpStatus,
        providerCommand: { port, apiNo: mapping.apiNo, payload: mapping.payload },
        robotAck: {
          status: 'failed',
          receivedTsMs: nowMs,
          apiNo: mapping.apiNo,
          responseApiNo: responseApi(mapping.apiNo),
          lastErrorCauseCode: mapped.statusReasonCode
        }
      };
    }
  }

  async getStatus({ nowMs, refresh = true } = {}) {
    if (!refresh && this.normalized) {
      return {
        raw: this.raw,
        normalized: this.normalized,
        connectionStatus: this.evaluateConnectionStatus(nowMs),
        lastSeenTsMs: this.lastSeenTsMs,
        lastError: this.lastError
      };
    }

    if (!this.statusPoll) {
      return {
        raw: this.raw,
        normalized: this.normalized,
        connectionStatus: this.evaluateConnectionStatus(nowMs),
        lastSeenTsMs: this.lastSeenTsMs,
        lastError: this.lastError
      };
    }

    const locPort = this._resolvePort('state');
    if (!locPort) {
      return {
        raw: this.raw,
        normalized: this.normalized,
        connectionStatus: this.evaluateConnectionStatus(nowMs),
        lastSeenTsMs: this.lastSeenTsMs,
        lastError: this.lastError
      };
    }

    try {
      const loc = await this.client.request(locPort, API.robot_status_loc_req, {});
      let fork = null;
      try {
        fork = await this.client.request(locPort, API.robot_status_fork_req, {});
      } catch (_err) {
        fork = null;
      }
      const merged = { ...loc };
      if (fork) {
        merged.fork_height = fork.fork_height ?? fork.forkHeight ?? fork.fork_height_m;
      }
      this.raw = merged;
      this.normalized = normalizeStatus(merged);
      this.markSeen(nowMs);
    } catch (err) {
      this.markError(err);
    }

    return {
      raw: this.raw,
      normalized: this.normalized,
      connectionStatus: this.evaluateConnectionStatus(nowMs),
      lastSeenTsMs: this.lastSeenTsMs,
      lastError: this.lastError
    };
  }
}

function selectProviderKind(robot, config) {
  const explicit = robot?.provider || robot?.providerKind || null;
  if (explicit) return explicit;
  if (config.defaultProvider) return config.defaultProvider;
  const providers = config.providers || {};
  if (providers.internalSim?.enabled) return 'internalSim';
  if (providers.simDirect?.enabled) return 'simDirect';
  if (providers.robokitSim?.enabled) return 'robokitSim';
  if (providers.robocore?.enabled) return 'robocore';
  return 'internalSim';
}

function createProviderForRobot(robot, config = {}, deps = {}) {
  const kind = selectProviderKind(robot, config);
  const providers = config.providers || {};

  if (kind === 'internalSim') {
    if (providers.internalSim && providers.internalSim.enabled === false) {
      const err = new Error('provider_disabled');
      err.code = 'provider_disabled';
      throw err;
    }
    return new InternalSimProvider({
      robotId: robot.robotId,
      config: providers.internalSim || {},
      httpClient: deps.httpClient
    });
  }

  if (kind === 'simDirect') {
    if (providers.simDirect && providers.simDirect.enabled === false) {
      const err = new Error('provider_disabled');
      err.code = 'provider_disabled';
      throw err;
    }
    return new SimDirectProvider({
      robotId: robot.robotId,
      config: providers.simDirect || {},
      httpClient: deps.httpClient
    });
  }

  if (kind === 'robokitSim' || kind === 'robocore') {
    const providerConfig = providers[kind] || {};
    if (providerConfig.enabled === false) {
      const err = new Error('provider_disabled');
      err.code = 'provider_disabled';
      throw err;
    }
    const robotConfig = providerConfig.robots?.[robot.robotId] || {};
    const clientOptions = {
      host: robotConfig.host,
      ports: robotConfig.ports || {},
      telemetryTimeoutMs: providerConfig.telemetryTimeoutMs,
      timeoutMs: providerConfig.tcp?.requestTimeoutMs,
      maxConcurrent: providerConfig.tcp?.maxConcurrentPerRobot,
      failureThreshold: providerConfig.tcp?.circuitBreaker?.failureThreshold,
      circuitOpenMs: providerConfig.tcp?.circuitBreaker?.openMs,
      reconnect: providerConfig.tcp?.reconnect
    };
    return new RobokitProvider({
      kind,
      robotId: robot.robotId,
      config: {
        host: clientOptions.host,
        ports: clientOptions.ports,
        telemetryTimeoutMs: clientOptions.telemetryTimeoutMs,
        timeoutMs: clientOptions.timeoutMs,
        maxConcurrent: clientOptions.maxConcurrent,
        failureThreshold: clientOptions.failureThreshold,
        circuitOpenMs: clientOptions.circuitOpenMs,
        reconnect: clientOptions.reconnect,
        statusPoll: providerConfig.statusPoll
      },
      clientFactory: deps.robokitClientFactory
    });
  }

  const err = new Error('unknown_provider');
  err.code = 'unknown_provider';
  throw err;
}

module.exports = {
  BaseProvider,
  InternalSimProvider,
  SimDirectProvider,
  RobokitProvider,
  createProviderForRobot
};
