const http = require('http');
const {
  createId,
  resolveRequestId,
  sendJson,
  sendText,
  sendOptions,
  sendError,
  readJsonBody,
  safeDecode,
  wrapAsync
} = require('../../packages/fleet-kit');
const { createGateway } = require('./lib/gateway');

function nowMs() {
  return Date.now();
}

function buildErrorResponse(err, requestId) {
  if (err && err.code === 'payload_too_large') {
    return {
      code: 'validationError',
      causeCode: 'PAYLOAD_TOO_LARGE',
      message: 'Payload too large',
      status: 413,
      requestId
    };
  }
  if (err && err.code === 'invalid_json') {
    return {
      code: 'validationError',
      causeCode: 'INVALID_JSON',
      message: 'Invalid JSON payload',
      status: 400,
      requestId
    };
  }
  return {
    code: 'internalError',
    causeCode: 'UNKNOWN',
    message: err?.message || 'Internal error',
    status: 500,
    requestId
  };
}

function startServer(config, options = {}) {
  const gateway = options.gateway || createGateway(config, options.deps || {});

  const server = http.createServer(wrapAsync(async (req, res) => {
    const requestId = resolveRequestId(req, res);
    if (req.method === 'OPTIONS') {
      sendOptions(res);
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'GET' && pathname === '/gateway/v1/health') {
      sendJson(res, 200, { status: 'ok', tsMs: nowMs() });
      return;
    }

    if (req.method === 'GET' && pathname === '/gateway/v1/robots') {
      const robots = await gateway.listRobots();
      sendJson(res, 200, { robots });
      return;
    }

    const statusMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/status$/);
    if (req.method === 'GET' && statusMatch) {
      const robotId = safeDecode(statusMatch[1]);
      if (!robotId) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'INVALID_PATH',
          message: 'invalid robotId',
          requestId
        });
        return;
      }
      const status = await gateway.getRobotStatus(robotId);
      if (!status) {
        sendError(res, {
          code: 'notFound',
          causeCode: 'ROBOT_NOT_FOUND',
          message: 'robot not found',
          requestId,
          details: { robotId }
        });
        return;
      }
      sendJson(res, 200, status);
      return;
    }

    const commandMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/commands$/);
    if (req.method === 'POST' && commandMatch) {
      const robotId = safeDecode(commandMatch[1]);
      if (!robotId) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'INVALID_PATH',
          message: 'invalid robotId',
          requestId
        });
        return;
      }
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendError(res, buildErrorResponse(err, requestId));
        return;
      }

      const command = payload?.command || payload || {};
      if (!command.commandId) {
        command.commandId = createId('cmd');
      }
      const result = await gateway.sendCommand(robotId, command);
      if (!result.ok && !result.ack) {
        sendError(res, {
          code: 'dependencyUnavailable',
          causeCode: 'COMMAND_REJECTED',
          message: result.error || 'command failed',
          status: result.httpStatus || 503,
          requestId,
          details: { robotId, commandId: command.commandId }
        });
        return;
      }
      sendJson(res, result.httpStatus || 200, result.ack || { ok: true });
      return;
    }

    const providerMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/provider-switch$/);
    if (req.method === 'POST' && providerMatch) {
      const robotId = safeDecode(providerMatch[1]);
      if (!robotId) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'INVALID_PATH',
          message: 'invalid robotId',
          requestId
        });
        return;
      }
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendError(res, buildErrorResponse(err, requestId));
        return;
      }
      const targetProvider = payload?.targetProvider || payload?.provider || null;
      const result = await gateway.switchProvider(robotId, targetProvider);
      if (!result.ok) {
        sendError(res, {
          code: 'dependencyUnavailable',
          causeCode: 'PROVIDER_SWITCHING',
          message: result.error || 'provider switch failed',
          status: result.httpStatus || 503,
          requestId,
          details: { robotId, targetProvider }
        });
        return;
      }
      sendJson(res, 200, { ok: true, robotId, provider: result.provider });
      return;
    }

    sendError(res, {
      code: 'notFound',
      causeCode: 'NOT_FOUND',
      message: 'not found',
      requestId
    });
  }, (err, req, res) => {
    const requestId = resolveRequestId(req, res);
    sendError(res, buildErrorResponse(err, requestId));
  }));

  const host = config.server?.host || '0.0.0.0';
  const port = Number.isFinite(config.server?.port) ? config.server.port : 8081;
  server.listen(port, host, () => {
    console.log(`fleet-gateway listening on ${host}:${port}`);
  });

  return server;
}

module.exports = {
  startServer
};
