const { API, encodeFrame, START_MARK, VERSION, HEADER_LEN } = require('../../../packages/robokit-lib/rbk');
const { createSimulationEngine } = require('../../../packages/robokit-sim-core/core/engine');
const { createApiRouter } = require('../../../packages/robokit-protocol/protocol/router');
const { allowedApisByPort } = require('../../../packages/robokit-protocol/protocol/api_map');
const { createPushManager } = require('./push_manager');
const { createTcpServer, createPushServer } = require('./adapter_tcp');
const { startHttpStub, startAdminServer } = require('./adapter_http');

function startRuntimeServers(options) {
  const {
    robot,
    robotConfigInfo,
    graphPath,
    simClock,
    nowMs,
    diagLog,
    diagLogTickMs,
    diagTeleportThreshold,
    statusBuilder,
    runtimeHandlers,
    taskEngine,
    forkController,
    pushBuilder,
    httpHandlers,
    controlArbiter,
    controlPolicy,
    eventLogger,
    commandCache,
    idempotentApis,
    clientRegistry,
    normalizeRemoteAddress,
    config,
    constants,
    simulationDeps,
    updateState
  } = options;

  const {
    PORTS: ENV_PORTS,
    BIND_HOST,
    TICK_MS,
    SIM_TIME_MODE,
    MAX_BODY_LENGTH,
    SOCKET_IDLE_TIMEOUT_MS,
    MAX_CONNECTIONS,
    MAX_CONNECTIONS_PER_CLIENT,
    MAX_CLIENT_SESSIONS,
    MAX_PUSH_CONNECTIONS,
    PUSH_MIN_INTERVAL_MS,
    PUSH_MAX_INTERVAL_MS,
    PUSH_MAX_QUEUE_BYTES,
    PUSH_MAX_FIELDS,
    PRINT_EFFECTIVE_CONFIG,
    REQUIRE_LOCK_FOR_CONTROL,
    REQUIRE_LOCK_FOR_NAV,
    REQUIRE_LOCK_FOR_FORK,
    LOCK_TTL_MS,
    STRICT_UNLOCK,
    CLIENT_ID_STRATEGY,
    CLIENT_TTL_MS,
    CLIENT_IDLE_MS,
    COMMAND_CACHE_TTL_MS,
    COMMAND_CACHE_MAX_ENTRIES,
    ADMIN_HTTP_HOST,
    ADMIN_HTTP_PORT
  } = config;

  const simulationEngine = createSimulationEngine({
    robot,
    simClock,
    nowMs,
    tickMs: TICK_MS,
    controlArbiter,
    clearManualControl: simulationDeps.clearManualControl,
    tickFork: simulationDeps.tickFork,
    updateCharging: simulationDeps.updateCharging,
    resetVelocity: simulationDeps.resetVelocity,
    shouldBlockForObstacle: simulationDeps.shouldBlockForObstacle,
    segmentPoseAtDistance: simulationDeps.segmentPoseAtDistance,
    updateVelocity: simulationDeps.updateVelocity,
    applyOdo: simulationDeps.applyOdo,
    normalizeAngle: simulationDeps.normalizeAngle,
    toRad: simulationDeps.toRad,
    polylineAtDistance: simulationDeps.polylineAtDistance,
    approachValue: simulationDeps.approachValue,
    findNearestNode: simulationDeps.findNearestNode,
    beginAttachedForkForTask: simulationDeps.beginAttachedForkForTask,
    maybeStartPendingFork: simulationDeps.maybeStartPendingFork,
    constants,
    diagLog,
    diagLogTickMs,
    diagTeleportThreshold,
    updateState
  });

  let shuttingDown = false;
  const intervals = [];
  const servers = [];
  let adminServer = null;
  let httpStub = null;

  const tickScheduler = (() => {
    let timer = null;
    let paused = false;
    let tickId = 0;

    const runTick = () => {
      try {
        simulationEngine.tick();
        pushManager.tick();
        tickId += 1;
      } catch (err) {
        console.error('robokit-robot-sim tick error', err);
        shutdown('tick_error');
      }
    };

    const start = () => {
      if (timer || SIM_TIME_MODE === 'replay') {
        return;
      }
      timer = setInterval(() => {
        if (!paused) {
          runTick();
        }
      }, TICK_MS);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const pause = () => {
      paused = true;
      diagLog('tick_paused', { tickId });
    };

    const resume = () => {
      paused = false;
      diagLog('tick_resumed', { tickId });
    };

    const step = (count = 1) => {
      const total = Math.max(1, Number(count) || 1);
      for (let i = 0; i < total; i += 1) {
        runTick();
      }
      diagLog('tick_step', { tickId, count: total });
    };

    return {
      start,
      stop,
      pause,
      resume,
      step,
      isPaused: () => paused,
      getTickId: () => tickId
    };
  })();

  const apiHandlers = {
    ...statusBuilder,
    handleConfigLock: runtimeHandlers.handleConfigLock,
    handleConfigUnlock: runtimeHandlers.handleConfigUnlock,
    handleReloc: runtimeHandlers.handleReloc,
    handleStopControl: runtimeHandlers.handleStopControl,
    handleConfirmLoc: runtimeHandlers.handleConfirmLoc,
    handleCancelReloc: runtimeHandlers.handleCancelReloc,
    handleMotionControl: runtimeHandlers.handleMotionControl,
    handleGoTarget: taskEngine.handleGoTarget,
    handleGoPoint: taskEngine.handleGoPoint,
    handleMultiStation: taskEngine.handleMultiStation,
    handlePauseTask: taskEngine.handlePauseTask,
    handleResumeTask: taskEngine.handleResumeTask,
    handleCancelTask: taskEngine.handleCancelTask,
    buildTaskPathResponse: statusBuilder.buildTaskPathResponse,
    handleSetDo: runtimeHandlers.handleSetDo,
    handleSetDoBatch: runtimeHandlers.handleSetDoBatch,
    handleSoftEmc: runtimeHandlers.handleSoftEmc,
    handleSetDi: runtimeHandlers.handleSetDi,
    buildAudioList: statusBuilder.buildAudioList,
    handleSetForkHeight: forkController.handleSetForkHeight,
    handleForkStop: forkController.handleForkStop,
    handleClearMultiStation: taskEngine.handleClearMultiStation,
    handleClearTask: taskEngine.handleClearTask,
    buildTaskListStatus: statusBuilder.buildTaskListStatus,
    buildTaskListNames: statusBuilder.buildTaskListNames
  };

  const apiRouter = createApiRouter({
    controlArbiter,
    controlPolicy,
    eventLogger,
    commandCache,
    idempotentApis,
    handlers: apiHandlers
  });

  const handleApiMessage = (msg, context, allowedApis) =>
    apiRouter.handle(msg.apiNo, msg.payload, allowedApis, context);

  const handleParseError = () => statusBuilder.buildErrorResponse('json_parse_error');

  const encodeFrameRaw = (seq, apiNo, bodyBuffer, opts = {}) => {
    const body = Buffer.isBuffer(bodyBuffer) ? bodyBuffer : Buffer.from(bodyBuffer || '');
    const buffer = Buffer.alloc(HEADER_LEN + body.length);
    const reserved = Buffer.alloc(6, 0);
    const reservedOverride = opts.reserved;

    if (reservedOverride) {
      const source = Buffer.isBuffer(reservedOverride)
        ? reservedOverride
        : Buffer.from(reservedOverride);
      source.copy(reserved, 0, 0, Math.min(source.length, reserved.length));
    }

    buffer.writeUInt8(START_MARK, 0);
    buffer.writeUInt8(VERSION, 1);
    buffer.writeUInt16BE(seq & 0xffff, 2);
    buffer.writeUInt32BE(body.length, 4);
    buffer.writeUInt16BE(apiNo & 0xffff, 8);
    reserved.copy(buffer, 10);
    if (body.length > 0) {
      body.copy(buffer, HEADER_LEN);
    }
    return buffer;
  };

  const pushConnections = new Map();
  let totalConnections = 0;
  const getTotalConnections = () => totalConnections;
  const onConnectionChange = (delta) => {
    totalConnections = Math.max(0, totalConnections + delta);
  };

  const pushDefaults = {
    intervalMs: 500,
    includedFields: null,
    excludedFields: null
  };

  const pushManager = createPushManager({
    pushConnections,
    buildPushPayload: pushBuilder.buildPushPayload,
    encodeFrame,
    apiNo: API.robot_push,
    minIntervalMs: PUSH_MIN_INTERVAL_MS,
    maxIntervalMs: PUSH_MAX_INTERVAL_MS,
    maxQueueBytes: PUSH_MAX_QUEUE_BYTES,
    now: () => simClock.now()
  });

  const cloneFieldList = (list) => (Array.isArray(list) ? [...list] : null);

  const applyPushConfig = (target, payload) => {
    if (!payload || typeof payload !== 'object') {
      return { ok: true };
    }
    const included = Array.isArray(payload.included_fields)
      ? payload.included_fields
      : Array.isArray(payload.include_fields)
        ? payload.include_fields
        : null;
    const excluded = Array.isArray(payload.excluded_fields)
      ? payload.excluded_fields
      : Array.isArray(payload.exclude_fields)
        ? payload.exclude_fields
        : null;
    if (included && excluded) {
      return { ok: false, error: 'include_exclude_conflict' };
    }
    const interval = Number.parseInt(payload.interval, 10);
    if (Number.isFinite(interval)) {
      const minInterval = Number.isFinite(PUSH_MIN_INTERVAL_MS) ? PUSH_MIN_INTERVAL_MS : 0;
      const maxInterval = Number.isFinite(PUSH_MAX_INTERVAL_MS) ? PUSH_MAX_INTERVAL_MS : interval;
      target.intervalMs = Math.max(minInterval, Math.min(interval, maxInterval));
    }
    if (included) {
      target.includedFields = cloneFieldList(included);
      target.excludedFields = null;
    }
    if (excluded) {
      target.excludedFields = cloneFieldList(excluded);
      target.includedFields = null;
    }
    return { ok: true };
  };

  const startPushTimer = (conn) => {
    if (!conn) {
      return;
    }
    conn.enabled = true;
    conn.lastSentAt = 0;
  };

  const logEffectiveConfig = () => {
    if (!PRINT_EFFECTIVE_CONFIG) {
      return;
    }
    console.log(
      JSON.stringify(
        {
          ports: ENV_PORTS,
          bindHost: BIND_HOST,
          timeMode: SIM_TIME_MODE,
          lock: {
            requireControl: REQUIRE_LOCK_FOR_CONTROL,
            requireNav: REQUIRE_LOCK_FOR_NAV,
            requireFork: REQUIRE_LOCK_FOR_FORK,
            lockTtlMs: LOCK_TTL_MS,
            strictUnlock: STRICT_UNLOCK
          },
          clients: {
            strategy: CLIENT_ID_STRATEGY,
            ttlMs: CLIENT_TTL_MS,
            idleMs: CLIENT_IDLE_MS,
            commandCacheTtlMs: COMMAND_CACHE_TTL_MS,
            commandCacheMaxEntries: COMMAND_CACHE_MAX_ENTRIES,
            maxConnections: MAX_CONNECTIONS,
            maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
            maxClientSessions: MAX_CLIENT_SESSIONS
          },
          push: {
            minIntervalMs: PUSH_MIN_INTERVAL_MS,
            maxIntervalMs: PUSH_MAX_INTERVAL_MS,
            maxQueueBytes: PUSH_MAX_QUEUE_BYTES,
            maxFields: PUSH_MAX_FIELDS,
            maxConnections: MAX_PUSH_CONNECTIONS
          }
        },
        null,
        2
      )
    );
  };

  const shutdown = (reason) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    if (reason) {
      console.log(`robokit-robot-sim shutting down (${reason})`);
    }
    for (const timer of intervals) {
      clearInterval(timer);
    }
    tickScheduler.stop();
    for (const server of servers) {
      server.close();
    }
    if (httpStub && Array.isArray(httpStub.servers)) {
      httpStub.servers.forEach((server) => server.close());
    }
    if (adminServer) {
      adminServer.close();
    }
    if (eventLogger) {
      eventLogger.close();
    }
    setTimeout(() => process.exit(reason ? 1 : 0), 200).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    console.error('robokit-robot-sim uncaughtException', err);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (err) => {
    console.error('robokit-robot-sim unhandledRejection', err);
    shutdown('unhandledRejection');
  });

  logEffectiveConfig();
  console.log(`robokit-robot-sim time mode: ${SIM_TIME_MODE}`);

  tickScheduler.start();
  intervals.push(
    setInterval(() => {
      clientRegistry.sweep(nowMs());
    }, 5000)
  );

  servers.push(
    createTcpServer({
      port: ENV_PORTS.ROBOD,
      bindHost: BIND_HOST,
      label: 'robod',
      allowedApis: allowedApisByPort.robod,
      maxBodyLength: MAX_BODY_LENGTH,
      strictStartMark: true,
      maxConnections: MAX_CONNECTIONS,
      maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
      maxClientSessions: MAX_CLIENT_SESSIONS,
      socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
      clientRegistry,
      eventLogger,
      onMessage: handleApiMessage,
      onParseError: handleParseError,
      onConnectionChange,
      getTotalConnections,
      encodeFrame,
      encodeFrameRaw,
      normalizeRemoteAddress
    })
  );
  servers.push(
    createTcpServer({
      port: ENV_PORTS.STATE,
      bindHost: BIND_HOST,
      label: 'state',
      allowedApis: allowedApisByPort.state,
      maxBodyLength: MAX_BODY_LENGTH,
      strictStartMark: true,
      maxConnections: MAX_CONNECTIONS,
      maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
      maxClientSessions: MAX_CLIENT_SESSIONS,
      socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
      clientRegistry,
      eventLogger,
      onMessage: handleApiMessage,
      onParseError: handleParseError,
      onConnectionChange,
      getTotalConnections,
      encodeFrame,
      encodeFrameRaw,
      normalizeRemoteAddress
    })
  );
  servers.push(
    createTcpServer({
      port: ENV_PORTS.CTRL,
      bindHost: BIND_HOST,
      label: 'ctrl',
      allowedApis: allowedApisByPort.ctrl,
      maxBodyLength: MAX_BODY_LENGTH,
      strictStartMark: true,
      maxConnections: MAX_CONNECTIONS,
      maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
      maxClientSessions: MAX_CLIENT_SESSIONS,
      socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
      clientRegistry,
      eventLogger,
      onMessage: handleApiMessage,
      onParseError: handleParseError,
      onConnectionChange,
      getTotalConnections,
      encodeFrame,
      encodeFrameRaw,
      normalizeRemoteAddress
    })
  );
  servers.push(
    createTcpServer({
      port: ENV_PORTS.TASK,
      bindHost: BIND_HOST,
      label: 'task',
      allowedApis: allowedApisByPort.task,
      maxBodyLength: MAX_BODY_LENGTH,
      strictStartMark: true,
      maxConnections: MAX_CONNECTIONS,
      maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
      maxClientSessions: MAX_CLIENT_SESSIONS,
      socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
      clientRegistry,
      eventLogger,
      onMessage: handleApiMessage,
      onParseError: handleParseError,
      onConnectionChange,
      getTotalConnections,
      encodeFrame,
      encodeFrameRaw,
      normalizeRemoteAddress
    })
  );
  servers.push(
    createTcpServer({
      port: ENV_PORTS.KERNEL,
      bindHost: BIND_HOST,
      label: 'kernel',
      allowedApis: allowedApisByPort.kernel,
      maxBodyLength: MAX_BODY_LENGTH,
      strictStartMark: true,
      maxConnections: MAX_CONNECTIONS,
      maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
      maxClientSessions: MAX_CLIENT_SESSIONS,
      socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
      clientRegistry,
      eventLogger,
      onMessage: handleApiMessage,
      onParseError: handleParseError,
      onConnectionChange,
      getTotalConnections,
      encodeFrame,
      encodeFrameRaw,
      normalizeRemoteAddress
    })
  );
  servers.push(
    createTcpServer({
      port: ENV_PORTS.OTHER,
      bindHost: BIND_HOST,
      label: 'other',
      allowedApis: allowedApisByPort.other,
      maxBodyLength: MAX_BODY_LENGTH,
      strictStartMark: true,
      maxConnections: MAX_CONNECTIONS,
      maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
      maxClientSessions: MAX_CLIENT_SESSIONS,
      socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
      clientRegistry,
      eventLogger,
      onMessage: handleApiMessage,
      onParseError: handleParseError,
      onConnectionChange,
      getTotalConnections,
      encodeFrame,
      encodeFrameRaw,
      normalizeRemoteAddress
    })
  );
  servers.push(
    createTcpServer({
      port: ENV_PORTS.CONFIG,
      bindHost: BIND_HOST,
      label: 'config',
      allowedApis: allowedApisByPort.config,
      maxBodyLength: MAX_BODY_LENGTH,
      strictStartMark: true,
      maxConnections: MAX_CONNECTIONS,
      maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
      maxClientSessions: MAX_CLIENT_SESSIONS,
      socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
      clientRegistry,
      eventLogger,
      onMessage: handleApiMessage,
      onParseError: handleParseError,
      onConnectionChange,
      getTotalConnections,
      encodeFrame,
      encodeFrameRaw,
      normalizeRemoteAddress
    })
  );
  servers.push(
    createPushServer({
      port: ENV_PORTS.PUSH,
      bindHost: BIND_HOST,
      maxBodyLength: MAX_BODY_LENGTH,
      strictStartMark: true,
      maxConnections: MAX_CONNECTIONS,
      maxPushConnections: MAX_PUSH_CONNECTIONS,
      maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
      maxClientSessions: MAX_CLIENT_SESSIONS,
      socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
      clientRegistry,
      eventLogger,
      pushConnections,
      onConnectionChange,
      normalizeRemoteAddress,
      getTotalConnections,
      encodeFrame,
      apiNo: API.robot_push_config_req,
      buildErrorResponse: statusBuilder.buildErrorResponse,
      buildBaseResponse: statusBuilder.buildBaseResponse,
      applyPushConfig,
      startPushTimer,
      createConnection: () => ({
        socket: null,
        intervalMs: pushDefaults.intervalMs,
        includedFields: cloneFieldList(pushDefaults.includedFields),
        excludedFields: cloneFieldList(pushDefaults.excludedFields),
        timer: null,
        enabled: false,
        lastSentAt: 0,
        trimmed: false,
        trimNoticeLogged: false
      })
    })
  );
  httpStub = startHttpStub({
    onSetOrder: httpHandlers.handleHttpSetOrder,
    onAddObstacle: httpHandlers.handleHttpAddObstacle,
    onClearObstacles: httpHandlers.handleHttpClearObstacles,
    onListObstacles: httpHandlers.handleHttpListObstacles,
    onSetBlocked: httpHandlers.handleHttpSetBlocked,
    onRobotsStatus: httpHandlers.buildRobotsStatusResponse
  });
  adminServer = startAdminServer({
    host: ADMIN_HTTP_HOST,
    port: ADMIN_HTTP_PORT,
    getHealth: () => ({ ok: true, time: nowMs() }),
    getMetrics: () => ({
      clients: clientRegistry.sessions.size,
      connections: totalConnections,
      pushConnections: pushConnections.size,
      lockOwner: controlArbiter ? controlArbiter.getOwner() : null
    }),
    getTickState: () => ({
      paused: tickScheduler.isPaused(),
      tickId: tickScheduler.getTickId(),
      tickMs: TICK_MS,
      mode: SIM_TIME_MODE
    }),
    pauseTick: () => tickScheduler.pause(),
    resumeTick: () => tickScheduler.resume(),
    stepTick: (count) => tickScheduler.step(count),
    getTime: () => simClock.now(),
    setTime: (value) => simClock.setNow(value)
  });

  console.log(`robokit-robot-sim using graph: ${graphPath}`);
  console.log(`robokit-robot-sim start node: ${robot.currentStation}`);
  if (robotConfigInfo) {
    console.log(`robokit-robot-sim robot config: ${robotConfigInfo.path}`);
  }

  return {
    tickScheduler,
    shutdown
  };
}

module.exports = {
  startRuntimeServers
};
