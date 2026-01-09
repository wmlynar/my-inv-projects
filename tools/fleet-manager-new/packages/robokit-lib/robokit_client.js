const net = require('net');
const { EventEmitter } = require('events');
const { API, PORTS, RbkParser, encodeFrame, responseApi } = require('./rbk');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  if (!err) {
    return false;
  }
  const code = err.code || err.errno || err.message;
  const retryable = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    'rbk_timeout',
    'rbk_connection_closed',
    'socket_timeout'
  ]);
  return retryable.has(code);
}

class RobokitClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = options.id || options.name || null;
    this.name = options.name || null;
    this.host = options.host || '127.0.0.1';
    this.statePort = Number.parseInt(options.statePort || PORTS.STATE, 10);
    this.taskPort = Number.parseInt(options.taskPort || PORTS.TASK, 10);
    this.ctrlPort = Number.parseInt(options.ctrlPort || PORTS.CTRL, 10);
    this.otherPort = Number.parseInt(options.otherPort || PORTS.OTHER, 10);
    this.pushPort = Number.parseInt(options.pushPort || PORTS.PUSH, 10);
    this.timeoutMs = Number.parseInt(options.timeoutMs || 2000, 10);
    this.maxBodyLength = Number.parseInt(options.maxBodyLength || 1048576, 10);
    this.retries = Number.parseInt(options.retries || 0, 10);
    this.retryDelayMs = Number.parseInt(options.retryDelayMs || 200, 10);
    this.retryMaxDelayMs = Number.parseInt(options.retryMaxDelayMs || 2000, 10);
    this.retryBackoffFactor = Number.parseFloat(options.retryBackoffFactor || 2);
    this.retryJitterMs = Number.parseInt(options.retryJitterMs || 50, 10);
    this.payloadTransform = typeof options.payloadTransform === 'function' ? options.payloadTransform : null;
    this.pushReconnect = Boolean(options.pushReconnect);
    this.pushReconnectDelayMs = Number.parseInt(options.pushReconnectDelayMs || 1000, 10);
    this.pushReconnectMaxDelayMs = Number.parseInt(options.pushReconnectMaxDelayMs || 10000, 10);
    this.pushReconnectBackoffFactor = Number.parseFloat(options.pushReconnectBackoffFactor || 2);
    this.maxConcurrent = Number.parseInt(options.maxConcurrent || 4, 10);
    this.failureThreshold = Number.parseInt(options.failureThreshold || 5, 10);
    this.circuitOpenMs = Number.parseInt(options.circuitOpenMs || 5000, 10);
    this.healthCheckIntervalMs = Number.parseInt(options.healthCheckIntervalMs || 0, 10);
    this.offlineThresholdMs = Number.parseInt(options.offlineThresholdMs || 5000, 10);
    this._seq = 1;
    this._push = {
      socket: null,
      options: null,
      reconnectTimer: null,
      reconnectAttempt: 0
    };
    this._queue = [];
    this._inFlight = 0;
    this._failures = 0;
    this._circuit = { state: 'closed', openedAt: 0 };
    this._healthTimer = null;
    this._online = true;
    this._lastSeen = 0;
  }

  nextSeq() {
    this._seq = (this._seq + 1) & 0xffff;
    if (this._seq === 0) {
      this._seq = 1;
    }
    return this._seq;
  }

  async request(port, apiNo, payload) {
    return this._enqueue(() => this._requestWithBreaker(port, apiNo, payload));
  }

  async _requestWithBreaker(port, apiNo, payload) {
    if (this._circuit.state === 'open') {
      const now = Date.now();
      if (now - this._circuit.openedAt >= this.circuitOpenMs) {
        this._circuit.state = 'half';
      } else {
        throw Object.assign(new Error('circuit_open'), { code: 'circuit_open' });
      }
    }

    const attempts = Math.max(1, this.retries + 1);
    let lastError = null;
    for (let i = 0; i < attempts; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await this._requestOnce(port, apiNo, payload);
        this._recordSuccess();
        return response;
      } catch (err) {
        lastError = err;
        if (!isRetryableError(err) || i + 1 >= attempts) {
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        const backoff = Math.min(
          this.retryDelayMs * Math.pow(this.retryBackoffFactor, i),
          this.retryMaxDelayMs
        );
        const jitter = Math.floor(Math.random() * this.retryJitterMs);
        await delay(backoff + jitter);
      }
    }
    this._recordFailure(lastError);
    throw lastError;
  }

  _requestOnce(port, apiNo, payload) {
    const seq = this.nextSeq();
    const transformed = this.payloadTransform && payload ? this.payloadTransform(payload) : payload;
    return new Promise((resolve, reject) => {
      let done = false;
      const socket = net.createConnection({ host: this.host, port }, () => {
        const frame = encodeFrame(seq, apiNo, transformed || null);
        socket.write(frame);
      });
      socket.setTimeout(this.timeoutMs);

      const parser = new RbkParser({ maxBodyLength: this.maxBodyLength });

      const timeout = setTimeout(() => {
        if (done) {
          return;
        }
        done = true;
        socket.destroy();
        reject(new Error('rbk_timeout'));
      }, this.timeoutMs);

      function finalize(error, payloadData) {
        if (done) {
          return;
        }
        done = true;
        clearTimeout(timeout);
        socket.end();
        if (error) {
          reject(error);
        } else {
          resolve(payloadData);
        }
      }

      socket.on('data', (chunk) => {
        let messages = [];
        try {
          messages = parser.push(chunk);
        } catch (err) {
          finalize(err);
          return;
        }

        for (const msg of messages) {
          if (msg.seq !== seq) {
            continue;
          }
          if (msg.apiNo !== responseApi(apiNo)) {
            continue;
          }
          finalize(null, msg.payload || {});
          return;
        }
      });

      socket.on('error', (err) => {
        finalize(err);
      });

      socket.on('timeout', () => {
        finalize(Object.assign(new Error('socket_timeout'), { code: 'socket_timeout' }));
      });

      socket.on('end', () => {
        if (!done) {
          finalize(new Error('rbk_connection_closed'));
        }
      });
    });
  }

  connectPush(options = {}) {
    this._push.options = options;
    if (this._push.socket && !this._push.socket.destroyed) {
      return this._push.socket;
    }

    const socket = net.createConnection({ host: this.host, port: this.pushPort }, () => {
      this._push.reconnectAttempt = 0;
      const seq = this.nextSeq();
      const payload = {
        interval: options.intervalMs || 1000,
        included_fields: Array.isArray(options.fields) ? options.fields : undefined
      };
      const transformed = this.payloadTransform ? this.payloadTransform(payload) : payload;
      const frame = encodeFrame(seq, API.robot_push_config_req, transformed);
      socket.write(frame);
    });

    const parser = new RbkParser({ maxBodyLength: this.maxBodyLength });
    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        socket.destroy();
        return;
      }
      for (const msg of messages) {
        if (msg.apiNo === responseApi(API.robot_push_config_req)) {
          this.emit('push_config', msg.payload || {});
          continue;
        }
        this._markSeen();
        this.emit('push', msg.payload || {}, msg);
      }
    });

    socket.on('error', (err) => {
      this.emit('push_error', err);
    });

    socket.on('close', () => {
      this.emit('push_close');
      this._push.socket = null;
      if (this.pushReconnect) {
        if (this._push.reconnectTimer) {
          clearTimeout(this._push.reconnectTimer);
        }
        const attempt = this._push.reconnectAttempt;
        const baseDelay = this.pushReconnectDelayMs * Math.pow(this.pushReconnectBackoffFactor, attempt);
        const delayMs = Math.min(baseDelay, this.pushReconnectMaxDelayMs);
        this._push.reconnectAttempt += 1;
        this._push.reconnectTimer = setTimeout(() => {
          this.connectPush(this._push.options || {});
        }, delayMs);
      }
    });

    this._push.socket = socket;
    return socket;
  }

  disconnectPush() {
    if (this._push.reconnectTimer) {
      clearTimeout(this._push.reconnectTimer);
      this._push.reconnectTimer = null;
    }
    if (this._push.socket && !this._push.socket.destroyed) {
      this._push.socket.destroy();
    }
    this._push.socket = null;
  }

  _enqueue(fn) {
    return new Promise((resolve, reject) => {
      this._queue.push({ fn, resolve, reject });
      this._drainQueue();
    });
  }

  _drainQueue() {
    while (this._inFlight < this.maxConcurrent && this._queue.length > 0) {
      const job = this._queue.shift();
      this._inFlight += 1;
      job.fn()
        .then(job.resolve)
        .catch(job.reject)
        .finally(() => {
          this._inFlight -= 1;
          this._drainQueue();
        });
    }
  }

  _recordSuccess() {
    this._failures = 0;
    if (this._circuit.state !== 'closed') {
      this._circuit.state = 'closed';
      this.emit('circuit_closed');
    }
    this._markSeen();
  }

  _recordFailure(err) {
    if (!isRetryableError(err)) {
      return;
    }
    this._failures += 1;
    if (this._failures >= this.failureThreshold) {
      this._circuit.state = 'open';
      this._circuit.openedAt = Date.now();
      this.emit('circuit_open', err);
    }
    this._markOfflineIfStale();
  }

  _markSeen() {
    this._lastSeen = Date.now();
    if (!this._online) {
      this._online = true;
      this.emit('online');
    }
  }

  _markOfflineIfStale() {
    const now = Date.now();
    if (this._online && this._lastSeen && now - this._lastSeen > this.offlineThresholdMs) {
      this._online = false;
      this.emit('offline');
    }
  }

  isOnline() {
    this._markOfflineIfStale();
    return this._online;
  }

  getLastSeen() {
    return this._lastSeen || null;
  }

  startHealthCheck() {
    if (this.healthCheckIntervalMs <= 0) {
      return;
    }
    if (this._healthTimer) {
      return;
    }
    this._healthTimer = setInterval(() => {
      this.getStatusLoc().catch(() => {});
    }, this.healthCheckIntervalMs);
  }

  stopHealthCheck() {
    if (this._healthTimer) {
      clearInterval(this._healthTimer);
      this._healthTimer = null;
    }
  }

  static snakeCaseKey(key) {
    return String(key)
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/-/g, '_')
      .toLowerCase();
  }

  static snakeCasePayload(value) {
    if (Array.isArray(value)) {
      return value.map((item) => RobokitClient.snakeCasePayload(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[RobokitClient.snakeCaseKey(key)] = RobokitClient.snakeCasePayload(val);
    }
    return out;
  }

  requestState(apiNo, payload) {
    return this.request(this.statePort, apiNo, payload);
  }

  requestTask(apiNo, payload) {
    return this.request(this.taskPort, apiNo, payload);
  }

  requestControl(apiNo, payload) {
    return this.request(this.ctrlPort, apiNo, payload);
  }

  requestOther(apiNo, payload) {
    return this.request(this.otherPort, apiNo, payload);
  }

  getStatusInfo() {
    return this.requestState(API.robot_status_info_req, {});
  }

  getStatusRun() {
    return this.requestState(API.robot_status_run_req, {});
  }

  getStatusMode() {
    return this.requestState(API.robot_status_mode_req, {});
  }

  getStatusLoc() {
    return this.requestState(API.robot_status_loc_req, {});
  }

  getStatusSpeed() {
    return this.requestState(API.robot_status_speed_req, {});
  }

  getStatusBlock() {
    return this.requestState(API.robot_status_block_req, {});
  }

  getStatusBattery() {
    return this.requestState(API.robot_status_battery_req, {});
  }

  getStatusPath() {
    return this.requestState(API.robot_status_path_req, {});
  }

  getStatusArea() {
    return this.requestState(API.robot_status_area_req, {});
  }

  getStatusEmergency() {
    return this.requestState(API.robot_status_emergency_req, {});
  }

  getStatusIo() {
    return this.requestState(API.robot_status_io_req, {});
  }

  getStatusImu() {
    return this.requestState(API.robot_status_imu_req, {});
  }

  getStatusUltrasonic() {
    return this.requestState(API.robot_status_ultrasonic_req, {});
  }

  getStatusObstacle() {
    return this.requestState(API.robot_status_obstacle_req, {});
  }

  getStatusTask() {
    return this.requestState(API.robot_status_task_req, {});
  }

  getStatusReloc() {
    return this.requestState(API.robot_status_reloc_req, {});
  }

  getStatusLoadMap() {
    return this.requestState(API.robot_status_loadmap_req, {});
  }

  getStatusTaskList() {
    return this.requestState(API.robot_status_tasklist_req, {});
  }

  getStatusFork() {
    return this.requestState(API.robot_status_fork_req, {});
  }

  getStatusAlarm() {
    return this.requestState(API.robot_status_alarm_req, {});
  }

  getStatusAll() {
    return this.requestState(API.robot_status_all1_req, {});
  }

  getStatusMap() {
    return this.requestState(API.robot_status_map_req, {});
  }

  getStatusStations() {
    return this.requestState(API.robot_status_station_req, {});
  }

  getStatusParams() {
    return this.requestState(API.robot_status_params_req, {});
  }

  controlStop() {
    return this.requestControl(API.robot_control_stop_req, {});
  }

  controlReloc(payload) {
    return this.requestControl(API.robot_control_reloc_req, payload || {});
  }

  controlLoadMap(payload) {
    return this.requestControl(API.robot_control_loadmap_req, payload || {});
  }

  controlMotion(payload) {
    return this.requestControl(API.robot_control_motion_req, payload || {});
  }

  goTarget(id) {
    return this.requestTask(API.robot_task_gotarget_req, { id });
  }

  goPoint(x, y, angle) {
    const payload = { x, y };
    if (Number.isFinite(angle)) {
      payload.angle = angle;
    }
    return this.requestTask(API.robot_task_gopoint_req, payload);
  }

  translate(dist, vx, vy, mode) {
    const payload = { dist };
    if (Number.isFinite(vx)) {
      payload.vx = vx;
    }
    if (Number.isFinite(vy)) {
      payload.vy = vy;
    }
    if (Number.isFinite(mode)) {
      payload.mode = mode;
    }
    return this.requestTask(API.robot_task_translate_req, payload);
  }

  turn(angle, vw, mode) {
    const payload = { angle, vw };
    if (Number.isFinite(mode)) {
      payload.mode = mode;
    }
    return this.requestTask(API.robot_task_turn_req, payload);
  }

  goMultiStation(taskList) {
    return this.requestTask(API.robot_task_multistation_req, taskList || []);
  }

  pauseTask() {
    return this.requestTask(API.robot_task_pause_req, {});
  }

  resumeTask() {
    return this.requestTask(API.robot_task_resume_req, {});
  }

  cancelTask() {
    return this.requestTask(API.robot_task_cancel_req, {});
  }

  getTaskPath() {
    return this.requestTask(API.robot_task_target_path_req, {});
  }

  clearTask() {
    return this.requestTask(API.robot_task_clear_task_req, {});
  }

  clearMultiStation() {
    return this.requestTask(API.robot_task_clear_multistation_req, {});
  }

  setDo(payload) {
    return this.requestOther(API.robot_other_setdo_req, payload || {});
  }

  setDoBatch(payload) {
    return this.requestOther(API.robot_other_setdobatch_req, payload || {});
  }

  setDi(payload) {
    return this.requestOther(API.robot_other_setdi_req, payload || {});
  }

  forkHeight(payload) {
    return this.requestOther(API.robot_other_forkheight_req, payload || {});
  }

  forkStop(payload) {
    return this.requestOther(API.robot_other_forkstop_req, payload || {});
  }

  audioPlay(payload) {
    return this.requestOther(API.robot_other_audio_play_req, payload || {});
  }
}

module.exports = { RobokitClient };
