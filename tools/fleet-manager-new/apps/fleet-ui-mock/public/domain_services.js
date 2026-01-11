(() => {
  const root = (window.FleetDomain = window.FleetDomain || {});

  class RobotService {
    constructor(robotRepo) {
      this.robotRepo = robotRepo;
    }

    setDispatchable(robotId, dispatchable) {
      const robot = this.robotRepo.getById(robotId);
      if (!robot) return null;
      const next = robot.online ? Boolean(dispatchable) : false;
      return this.robotRepo.update(robotId, { dispatchable: next });
    }

    setControlled(robotId, controlled) {
      const robot = this.robotRepo.getById(robotId);
      if (!robot) return null;
      if (!robot.online) return this.robotRepo.update(robotId, { controlled: false });
      return this.robotRepo.update(robotId, { controlled: Boolean(controlled) });
    }

    setOnline(robotId, online) {
      const robot = this.robotRepo.getById(robotId);
      if (!robot) return null;
      const isOnline = Boolean(online);
      const updates = {
        online: isOnline,
        dispatchable: isOnline ? robot.dispatchable : false,
        controlled: isOnline ? robot.controlled : false
      };
      return this.robotRepo.update(robotId, updates);
    }

    setManualMode(robotId, manualMode) {
      return this.robotRepo.update(robotId, { manualMode: Boolean(manualMode) });
    }
  }

  class RobotDiagnosticsService {
    constructor({ staleMinMs = 0, staleMultiplier = 1, getFleetPollMs, getLastFleetUpdateAt } = {}) {
      this.staleMinMs = staleMinMs;
      this.staleMultiplier = staleMultiplier;
      this.getFleetPollMs = getFleetPollMs || (() => 0);
      this.getLastFleetUpdateAt = getLastFleetUpdateAt || (() => null);
      this.cache = new Map();
    }

    getStaleThresholdMs() {
      const pollMs = Number(this.getFleetPollMs?.() || 0);
      return Math.max(this.staleMinMs, pollMs * this.staleMultiplier);
    }

    ensureEntry(robotId) {
      if (!robotId) return null;
      let entry = this.cache.get(robotId);
      if (!entry) {
        entry = {
          lastPose: null,
          lastMoveAt: null,
          state: "idle",
          stateSince: Date.now(),
          reason: "idle",
          detail: null,
          snapshot: null
        };
        this.cache.set(robotId, entry);
      }
      return entry;
    }

    normalizeBackendDiagnostics(diag, now, stale) {
      if (!diag || typeof diag !== "object") return null;
      if (stale) {
        return {
          state: "stale",
          reason: "no_updates",
          detail: null,
          since: this.getLastFleetUpdateAt?.(),
          lastMoveAt: diag.lastMoveAt || null,
          source: "stale"
        };
      }
      return {
        state: diag.state || "unknown",
        reason: diag.reason || null,
        detail: diag.detail || null,
        since: Number.isFinite(diag.since) ? diag.since : null,
        lastMoveAt: Number.isFinite(diag.lastMoveAt) ? diag.lastMoveAt : null,
        source: "backend"
      };
    }

    refresh(robots = []) {
      const now = Date.now();
      const staleThreshold = this.getStaleThresholdMs();
      const lastUpdateAt = this.getLastFleetUpdateAt?.();
      const stale = Number.isFinite(lastUpdateAt) ? now - lastUpdateAt > staleThreshold : false;
      const activeIds = new Set();
      robots.forEach((robot) => {
        if (!robot?.id) return;
        activeIds.add(robot.id);
        const entry = this.ensureEntry(robot.id);
        if (!entry) return;
        const backend = robot.diagnostics ? this.normalizeBackendDiagnostics(robot.diagnostics, now, stale) : null;
        const snapshot =
          backend ||
          (stale
            ? {
                state: "stale",
                reason: "no_updates",
                detail: null,
                since: lastUpdateAt,
                lastMoveAt: entry.lastMoveAt,
                source: "stale"
              }
            : null);
        if (!snapshot) {
          entry.snapshot = null;
          return;
        }
        const prevState = entry.state;
        entry.state = snapshot.state || entry.state;
        if (Number.isFinite(snapshot.since)) {
          entry.stateSince = snapshot.since;
        } else if (entry.state !== prevState) {
          entry.stateSince = now;
        } else if (!Number.isFinite(entry.stateSince)) {
          entry.stateSince = now;
        }
        entry.reason = snapshot.reason || entry.reason;
        entry.detail = snapshot.detail || null;
        if (Number.isFinite(snapshot.lastMoveAt)) {
          entry.lastMoveAt = snapshot.lastMoveAt;
        }
        entry.snapshot = {
          ...snapshot,
          since: snapshot.since || entry.stateSince
        };
      });
      this.cache.forEach((_entry, id) => {
        if (!activeIds.has(id)) this.cache.delete(id);
      });
    }

    get(robotId) {
      if (!robotId) return null;
      const entry = this.cache.get(robotId);
      return entry?.snapshot || null;
    }

    reset() {
      this.cache.clear();
    }
  }

  class ManualDriveService {
    constructor({
      speedMps = 0,
      turnRateRadS = 0,
      tickMs = 100,
      getRobotById,
      updateRobotState,
      sendRobotCommand,
      stopNavigation,
      isRemoteSim,
      onStateChange,
      logger
    } = {}) {
      this.speedMps = speedMps;
      this.turnRateRadS = turnRateRadS;
      this.tickMs = tickMs;
      this.getRobotById = getRobotById || (() => null);
      this.updateRobotState = updateRobotState || (() => {});
      this.sendRobotCommand = sendRobotCommand || (() => Promise.resolve(null));
      this.stopNavigation = stopNavigation || (() => {});
      this.isRemoteSim = isRemoteSim || (() => false);
      this.onStateChange = onStateChange || null;
      this.logger = logger || null;
      this.state = {
        enabled: false,
        robotId: null,
        driving: false,
        keys: new Set()
      };
      this.timer = null;
      this.lastTick = null;
      this.remoteInFlight = false;
      this.remotePending = null;
    }

    notify() {
      if (typeof this.onStateChange === "function") {
        this.onStateChange(this.state);
      }
    }

    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    getState() {
      return this.state;
    }

    enabledFor(robotId) {
      return Boolean(this.state.enabled && robotId && this.state.robotId === robotId);
    }

    setTarget(robotId) {
      if (!robotId || this.state.robotId === robotId) return;
      if (this.state.enabled && this.state.robotId) {
        const previous = this.getRobotById(this.state.robotId);
        if (previous?.manualMode) {
          this.updateRobotState(previous.id, { activity: "Manual idle" });
        }
      }
      this.state.robotId = robotId;
      this.state.keys.clear();
      this.state.driving = false;
      this.notify();
    }

    setDriving(robotId, driving) {
      if (this.state.driving === driving) return;
      this.state.driving = driving;
      const robot = this.getRobotById(robotId);
      if (!robot?.manualMode) return;
      this.updateRobotState(robotId, { activity: driving ? "Manual drive" : "Manual idle" });
    }

    setEnabled(robotId, enabled) {
      const robot = this.getRobotById(robotId);
      if (!robot || !robot.manualMode) return;
      if (enabled) {
        this.stopNavigation(robotId);
        this.state.enabled = true;
        this.setTarget(robotId);
        this.updateRobotState(robotId, { activity: "Manual idle" });
      } else {
        this.state.enabled = false;
        this.state.keys.clear();
        this.state.driving = false;
        if (robot.manualMode) {
          this.updateRobotState(robotId, { activity: "Manual idle" });
        }
        if (this.isRemoteSim()) {
          this.queueRemoteMotion(robotId, { vx: 0, vy: 0, w: 0 });
        }
      }
      this.notify();
    }

    setKey(key, pressed) {
      if (!key) return;
      if (pressed) {
        this.state.keys.add(key);
      } else {
        this.state.keys.delete(key);
      }
    }

    clearKeys() {
      if (!this.state.keys.size) return;
      this.state.keys.clear();
    }

    getInput() {
      let forward = 0;
      let turn = 0;
      if (this.state.keys.has("up")) forward += 1;
      if (this.state.keys.has("down")) forward -= 1;
      if (this.state.keys.has("left")) turn += 1;
      if (this.state.keys.has("right")) turn -= 1;
      if (!forward && !turn) return null;
      return {
        forward: this.clamp(forward, -1, 1),
        turn: this.clamp(turn, -1, 1)
      };
    }

    flushRemoteMotion() {
      if (this.remoteInFlight || !this.remotePending) return;
      const { robotId, payload } = this.remotePending;
      this.remotePending = null;
      this.remoteInFlight = true;
      this.sendRobotCommand(robotId, "motion", payload)
        .then((response) => {
          const retCode = Number(response?.result?.ret_code);
          if (Number.isFinite(retCode) && retCode !== 0) {
            if (this.logger?.warn) {
              this.logger.warn("Manual drive rejected", response);
            } else {
              console.warn("Manual drive rejected", response);
            }
            if (this.state.driving) {
              this.setDriving(robotId, false);
            }
            this.state.enabled = false;
            this.state.keys.clear();
            this.notify();
          }
        })
        .catch((error) => {
          if (this.logger?.warn) {
            this.logger.warn("Manual drive failed", error);
          } else {
            console.warn("Manual drive failed", error);
          }
        })
        .finally(() => {
          this.remoteInFlight = false;
          if (this.remotePending) {
            this.flushRemoteMotion();
          }
        });
    }

    queueRemoteMotion(robotId, payload) {
      if (!robotId) return;
      this.remotePending = { robotId, payload };
      this.flushRemoteMotion();
    }

    applyRemoteManualDrive(robot, dt) {
      if (!robot || !Number.isFinite(dt) || dt <= 0) return;
      if (!robot.online || robot.blocked) {
        if (this.state.driving) {
          this.queueRemoteMotion(robot.id, { vx: 0, vy: 0, w: 0 });
          this.setDriving(robot.id, false);
        }
        return;
      }
      const input = this.getInput();
      if (!input) {
        if (this.state.driving) {
          this.queueRemoteMotion(robot.id, { vx: 0, vy: 0, w: 0 });
          this.setDriving(robot.id, false);
        }
        return;
      }
      const vx = this.speedMps * input.forward;
      const w = this.turnRateRadS * input.turn;
      this.queueRemoteMotion(robot.id, { vx, vy: 0, w });
      if (!this.state.driving) {
        this.setDriving(robot.id, true);
      }
    }

    tick(deltaMs) {
      if (!this.state.enabled || !this.state.robotId) return;
      const robot = this.getRobotById(this.state.robotId);
      if (!robot || !robot.manualMode) return;
      const dt = deltaMs / 1000;
      if (!Number.isFinite(dt) || dt <= 0) return;
      this.applyRemoteManualDrive(robot, dt);
    }

    start() {
      if (!this.isRemoteSim() || this.timer) return;
      this.lastTick = Date.now();
      this.timer = window.setInterval(() => {
        const now = Date.now();
        const deltaMs = this.lastTick ? now - this.lastTick : this.tickMs;
        this.lastTick = now;
        this.tick(deltaMs);
      }, this.tickMs);
    }

    stop() {
      if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
      this.lastTick = null;
      this.remoteInFlight = false;
      this.remotePending = null;
    }

    reset() {
      this.stop();
      this.state.enabled = false;
      this.state.robotId = null;
      this.state.driving = false;
      this.state.keys.clear();
      this.notify();
    }

    syncRobotAvailability() {
      if (!this.state.robotId) return;
      const robot = this.getRobotById(this.state.robotId);
      if (robot && robot.manualMode) return;
      this.state.enabled = false;
      this.state.keys.clear();
      this.state.driving = false;
      this.state.robotId = null;
      this.notify();
    }
  }

  class PackagingService {
    constructor({
      engine,
      storage,
      isLocalSim,
      postFleetJson,
      logger,
      storageKeys = {}
    } = {}) {
      this.engine = engine || null;
      this.storage = storage || (typeof window !== "undefined" ? window.localStorage : null);
      this.isLocalSim = isLocalSim || (() => false);
      this.postFleetJson = postFleetJson || (() => Promise.resolve(null));
      this.logger = logger || null;
      this.storageKeys = {
        state: storageKeys.state || "",
        signature: storageKeys.signature || "",
        lineRequests: storageKeys.lineRequests || "",
        ops: storageKeys.ops || ""
      };
      this.config = null;
      this.bufferState = {};
      this.lineRequests = [];
      this.opsOverrides = { buffers: {}, places: {} };
    }

    setConfig(config) {
      this.config = config || null;
    }

    getConfig() {
      return this.config;
    }

    getState() {
      return {
        bufferState: this.bufferState,
        lineRequests: this.lineRequests,
        opsOverrides: this.opsOverrides
      };
    }

    getBufferState() {
      return this.bufferState;
    }

    getLineRequests() {
      return this.lineRequests;
    }

    getOpsOverrides() {
      return this.opsOverrides;
    }

    hasState() {
      return Object.keys(this.bufferState).length > 0 || this.lineRequests.length > 0;
    }

    readStorage(key) {
      if (!this.storage || !key) return null;
      try {
        return JSON.parse(this.storage.getItem(key));
      } catch (_err) {
        return null;
      }
    }

    writeStorage(key, value) {
      if (!this.storage || !key) return;
      this.storage.setItem(key, JSON.stringify(value));
    }

    loadOpsOverrides() {
      const raw = this.readStorage(this.storageKeys.ops);
      if (!raw || typeof raw !== "object") {
        this.opsOverrides = { buffers: {}, places: {} };
        return this.opsOverrides;
      }
      this.opsOverrides = {
        buffers: raw.buffers || {},
        places: raw.places || {}
      };
      return this.opsOverrides;
    }

    persistOpsOverrides() {
      if (this.isLocalSim()) return;
      this.writeStorage(this.storageKeys.ops, this.opsOverrides);
    }

    buildBufferLayout(buffer) {
      if (!this.engine) return [];
      return this.engine.buildBufferLayout(buffer);
    }

    buildBufferSignature(config) {
      if (!this.engine) return "";
      return this.engine.buildBufferSignature(config);
    }

    loadBufferState(config) {
      if (!this.engine) return {};
      const raw = this.readStorage(this.storageKeys.state);
      const savedSignature = this.storage && this.storageKeys.signature
        ? this.storage.getItem(this.storageKeys.signature)
        : null;
      const result = this.engine.loadBufferState(config, raw, savedSignature);
      if (this.storage && this.storageKeys.signature) {
        this.storage.setItem(this.storageKeys.signature, result.signature);
      }
      return result.state;
    }

    persistBufferState() {
      if (this.isLocalSim()) return;
      this.writeStorage(this.storageKeys.state, this.bufferState);
      if (this.config && this.storage && this.storageKeys.signature) {
        this.storage.setItem(this.storageKeys.signature, this.buildBufferSignature(this.config));
      }
    }

    loadLineRequests(config) {
      if (!this.engine) return [];
      const raw = this.readStorage(this.storageKeys.lineRequests);
      return this.engine.createLineRequests(config, raw);
    }

    persistLineRequests() {
      if (this.isLocalSim()) return;
      this.writeStorage(this.storageKeys.lineRequests, this.lineRequests);
    }

    ensureState() {
      if (!this.config || this.isLocalSim()) return false;
      if (this.hasState()) return false;
      this.bufferState = this.loadBufferState(this.config);
      this.lineRequests = this.loadLineRequests(this.config);
      this.loadOpsOverrides();
      return true;
    }

    applyState(payload) {
      if (!payload || typeof payload !== "object") return false;
      if (payload.bufferState && typeof payload.bufferState === "object") {
        this.bufferState = payload.bufferState;
      }
      if (Array.isArray(payload.lineRequests)) {
        this.lineRequests = payload.lineRequests;
      }
      if (payload.opsOverrides && typeof payload.opsOverrides === "object") {
        this.opsOverrides = payload.opsOverrides;
      }
      return true;
    }

    getBufferCell(bufferId, cellId) {
      return (this.bufferState[bufferId] || []).find((cell) => cell.id === cellId);
    }

    updateBufferCell(bufferId, cellId, updates) {
      if (!bufferId || !cellId) return Promise.resolve(null);
      if (this.isLocalSim()) {
        return this.postFleetJson("/packaging/buffer", { bufferId, cellId, updates })
          .then((payload) => {
            if (payload?.state) {
              this.applyState(payload.state);
            }
            return payload?.state || null;
          })
          .catch((error) => {
            if (this.logger?.warn) {
              this.logger.warn("Buffer update failed", error);
            } else {
              console.warn("Buffer update failed", error);
            }
            return null;
          });
      }
      this.bufferState = {
        ...this.bufferState,
        [bufferId]: (this.bufferState[bufferId] || []).map((cell) =>
          cell.id === cellId ? { ...cell, ...updates } : cell
        )
      };
      this.persistBufferState();
      return Promise.resolve(null);
    }

    updateLineRequest(lineId, key, updates) {
      if (!lineId) return Promise.resolve(null);
      if (this.isLocalSim()) {
        return this.postFleetJson("/packaging/line", { lineId, kind: key, updates })
          .then((payload) => {
            if (payload?.state) {
              this.applyState(payload.state);
            }
            return payload?.state || null;
          })
          .catch((error) => {
            if (this.logger?.warn) {
              this.logger.warn("Line request update failed", error);
            } else {
              console.warn("Line request update failed", error);
            }
            return null;
          });
      }
      this.lineRequests = this.lineRequests.map((req) => {
        if (req.id !== lineId) return req;
        if (!key) {
          return { ...req, ...updates };
        }
        return { ...req, [key]: { ...req[key], ...updates } };
      });
      this.persistLineRequests();
      return Promise.resolve(null);
    }

    resolveBufferOps(buffer, goodsType, level) {
      if (!buffer || !goodsType || !this.config) return null;
      const levelKey = String(level);
      const override = this.opsOverrides.buffers?.[buffer.id]?.[goodsType]?.levels?.[levelKey];
      if (override) return override;
      const byGoods = buffer.opsByGoods?.[goodsType]?.levels?.[levelKey];
      if (byGoods) return byGoods;
      const defaults = this.config?.operations?.bufferDefaults?.[goodsType]?.levels?.[levelKey];
      return defaults || null;
    }

    updateBufferOps(bufferId, goodsType, level, updates, kind) {
      if (!bufferId || !goodsType) return Promise.resolve(false);
      if (this.isLocalSim()) {
        return this.postFleetJson("/packaging/ops/buffer", { bufferId, goodsType, level, updates, kind })
          .then((payload) => {
            if (payload?.ops) {
              this.opsOverrides = payload.ops;
              return true;
            }
            return false;
          })
          .catch((error) => {
            if (this.logger?.warn) {
              this.logger.warn("Buffer ops update failed", error);
            } else {
              console.warn("Buffer ops update failed", error);
            }
            return false;
          });
      }
      const levelKey = String(level);
      const current = this.opsOverrides.buffers?.[bufferId]?.[goodsType]?.levels?.[levelKey] || {};
      const next = {
        ...current,
        [kind]: { ...(current[kind] || {}), ...updates }
      };
      this.opsOverrides = {
        ...this.opsOverrides,
        buffers: {
          ...this.opsOverrides.buffers,
          [bufferId]: {
            ...(this.opsOverrides.buffers?.[bufferId] || {}),
            [goodsType]: {
              ...(this.opsOverrides.buffers?.[bufferId]?.[goodsType] || {}),
              levels: {
                ...(this.opsOverrides.buffers?.[bufferId]?.[goodsType]?.levels || {}),
                [levelKey]: next
              }
            }
          }
        }
      };
      this.persistOpsOverrides();
      return Promise.resolve(true);
    }

    getPlaceById(placeId) {
      return this.config?.places?.[placeId] || null;
    }

    resolvePlaceOps(placeId, goodsType) {
      if (!placeId || !goodsType) return null;
      const override = this.opsOverrides.places?.[placeId]?.[goodsType];
      if (override) return override;
      const place = this.getPlaceById(placeId);
      const byGoods = place?.opsByGoods?.[goodsType];
      if (byGoods) return byGoods;
      return this.config?.operations?.placeDefaults?.[goodsType] || null;
    }

    updatePlaceOps(placeId, goodsType, updates, kind) {
      if (!placeId || !goodsType) return Promise.resolve(false);
      if (this.isLocalSim()) {
        return this.postFleetJson("/packaging/ops/place", { placeId, goodsType, updates, kind })
          .then((payload) => {
            if (payload?.ops) {
              this.opsOverrides = payload.ops;
              return true;
            }
            return false;
          })
          .catch((error) => {
            if (this.logger?.warn) {
              this.logger.warn("Place ops update failed", error);
            } else {
              console.warn("Place ops update failed", error);
            }
            return false;
          });
      }
      const current = this.opsOverrides.places?.[placeId]?.[goodsType] || {};
      const next = {
        ...current,
        [kind]: { ...(current[kind] || {}), ...updates }
      };
      this.opsOverrides = {
        ...this.opsOverrides,
        places: {
          ...this.opsOverrides.places,
          [placeId]: {
            ...(this.opsOverrides.places?.[placeId] || {}),
            [goodsType]: next
          }
        }
      };
      this.persistOpsOverrides();
      return Promise.resolve(true);
    }

    reset() {
      this.bufferState = {};
      this.lineRequests = [];
      this.opsOverrides = { buffers: {}, places: {} };
    }
  }

  root.RobotService = RobotService;
  root.RobotDiagnosticsService = RobotDiagnosticsService;
  root.ManualDriveService = ManualDriveService;
  root.PackagingService = PackagingService;
})();
