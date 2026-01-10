const net = require('net');
const { RbkParser, responseApi } = require('../../../packages/robokit-lib/rbk');

function createTcpServer(options) {
  const {
    port,
    bindHost,
    label,
    allowedApis,
    maxBodyLength,
    strictStartMark,
    maxConnections,
    maxConnectionsPerClient,
    maxClientSessions,
    socketIdleTimeoutMs,
    clientRegistry,
    eventLogger,
    onMessage,
    onParseError,
    onConnectionChange,
    encodeFrame,
    encodeFrameRaw
  } = options;

  const server = net.createServer((socket) => {
    const parser = new RbkParser({ maxBodyLength, strictStartMark });
    const context = {
      socket,
      remoteAddress: options.normalizeRemoteAddress
        ? options.normalizeRemoteAddress(socket.remoteAddress)
        : socket.remoteAddress,
      remotePort: socket.remotePort,
      localPort: socket.localPort,
      label
    };

    socket.setNoDelay(true);
    if (socketIdleTimeoutMs) {
      socket.setTimeout(socketIdleTimeoutMs);
    }
    socket.on('error', (err) => {
      if (err && err.code && (err.code === 'ECONNRESET' || err.code === 'EPIPE')) {
        return;
      }
      console.warn(`robokit-robot-sim ${label} socket error`, err);
    });
    socket.on('timeout', () => {
      socket.destroy();
    });

    if (maxConnections && options.getTotalConnections && options.getTotalConnections() >= maxConnections) {
      socket.destroy();
      return;
    }

    const session = clientRegistry.attach(context);
    if (maxClientSessions && clientRegistry.sessions.size > maxClientSessions) {
      clientRegistry.detach(context);
      socket.destroy();
      return;
    }
    if (maxConnectionsPerClient && session.connections.size > maxConnectionsPerClient) {
      clientRegistry.detach(context);
      socket.destroy();
      return;
    }

    if (onConnectionChange) {
      onConnectionChange(1);
    }

    if (eventLogger) {
      eventLogger.log('client_connected', {
        clientId: context.clientId,
        ip: context.remoteAddress,
        port: context.remotePort,
        label
      });
    }

    socket.on('close', () => {
      if (onConnectionChange) {
        onConnectionChange(-1);
      }
      clientRegistry.detach(context);
      if (eventLogger) {
        eventLogger.log('client_disconnected', {
          clientId: context.clientId,
          ip: context.remoteAddress,
          port: context.remotePort,
          label
        });
      }
    });

    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (_err) {
        socket.destroy();
        return;
      }

      for (const msg of messages) {
        clientRegistry.touch(context);
        const responsePayload = msg.jsonError && onParseError
          ? onParseError(msg, context, allowedApis)
          : onMessage(msg, context, allowedApis);
        if (responsePayload === null || responsePayload === undefined) {
          continue;
        }
        const frame = Buffer.isBuffer(responsePayload)
          ? encodeFrameRaw(msg.seq, responseApi(msg.apiNo), responsePayload, {
              reserved: msg.reserved
            })
          : encodeFrame(msg.seq, responseApi(msg.apiNo), responsePayload, {
              reserved: msg.reserved
            });
        socket.write(frame);
      }
    });
  });

  server.listen(port, bindHost || undefined, () => {
    const hostLabel = bindHost || '0.0.0.0';
    console.log(`robokit-robot-sim ${label} listening on tcp://${hostLabel}:${port}`);
  });

  return server;
}

function createPushServer(options) {
  const {
    port,
    bindHost,
    maxBodyLength,
    strictStartMark,
    maxConnections,
    maxPushConnections,
    maxConnectionsPerClient,
    maxClientSessions,
    socketIdleTimeoutMs,
    clientRegistry,
    eventLogger,
    pushConnections,
    onConnectionChange,
    normalizeRemoteAddress,
    encodeFrame,
    apiNo,
    buildErrorResponse,
    buildBaseResponse,
    applyPushConfig,
    startPushTimer,
    createConnection
  } = options;

  const server = net.createServer((socket) => {
    const parser = new RbkParser({ maxBodyLength, strictStartMark });
    const context = {
      socket,
      remoteAddress: normalizeRemoteAddress
        ? normalizeRemoteAddress(socket.remoteAddress)
        : socket.remoteAddress,
      remotePort: socket.remotePort,
      localPort: socket.localPort,
      label: 'push'
    };

    socket.setNoDelay(true);
    if (socketIdleTimeoutMs) {
      socket.setTimeout(socketIdleTimeoutMs);
    }
    socket.on('error', (err) => {
      if (err && err.code && (err.code === 'ECONNRESET' || err.code === 'EPIPE')) {
        return;
      }
      console.warn('robokit-robot-sim push socket error', err);
    });
    socket.on('timeout', () => {
      socket.destroy();
    });

    if (maxPushConnections && pushConnections.size >= maxPushConnections) {
      socket.destroy();
      return;
    }

    if (maxConnections && options.getTotalConnections && options.getTotalConnections() >= maxConnections) {
      socket.destroy();
      return;
    }

    const session = clientRegistry.attach(context);
    if (maxClientSessions && clientRegistry.sessions.size > maxClientSessions) {
      clientRegistry.detach(context);
      socket.destroy();
      return;
    }
    if (maxConnectionsPerClient && session.connections.size > maxConnectionsPerClient) {
      clientRegistry.detach(context);
      socket.destroy();
      return;
    }

    if (onConnectionChange) {
      onConnectionChange(1);
    }

    if (eventLogger) {
      eventLogger.log('client_connected', {
        clientId: context.clientId,
        ip: context.remoteAddress,
        port: context.remotePort,
        label: 'push'
      });
    }

    const conn = createConnection();
    conn.socket = socket;
    pushConnections.set(socket, conn);

    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (_err) {
        socket.destroy();
        return;
      }

      for (const msg of messages) {
        clientRegistry.touch(context);
        if (msg.jsonError) {
          const frame = encodeFrame(msg.seq, responseApi(msg.apiNo), buildErrorResponse('json_parse_error'), {
            reserved: msg.reserved
          });
          socket.write(frame);
          continue;
        }
        if (msg.apiNo !== apiNo) {
          const frame = encodeFrame(
            msg.seq,
            responseApi(msg.apiNo),
            buildErrorResponse(`unsupported_api_${msg.apiNo}`),
            { reserved: msg.reserved }
          );
          socket.write(frame);
          continue;
        }
        const payload = msg.payload || {};
        const result = applyPushConfig(conn, payload);
        const responsePayload = result.ok ? buildBaseResponse({}) : buildErrorResponse(result.error);
        const frame = encodeFrame(msg.seq, responseApi(msg.apiNo), responsePayload, { reserved: msg.reserved });
        socket.write(frame);
        if (result.ok) {
          startPushTimer(conn);
        }
      }
    });

    socket.on('close', () => {
      if (onConnectionChange) {
        onConnectionChange(-1);
      }
      clientRegistry.detach(context);
      if (eventLogger) {
        eventLogger.log('client_disconnected', {
          clientId: context.clientId,
          ip: context.remoteAddress,
          port: context.remotePort,
          label: 'push'
        });
      }
      if (conn.timer) {
        clearInterval(conn.timer);
      }
      pushConnections.delete(socket);
    });
  });

  server.listen(port, bindHost || undefined, () => {
    const hostLabel = bindHost || '0.0.0.0';
    console.log(`robokit-robot-sim push listening on tcp://${hostLabel}:${port}`);
  });

  return server;
}

module.exports = {
  createTcpServer,
  createPushServer
};
