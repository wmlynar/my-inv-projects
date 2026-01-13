const crypto = require('crypto');

const DEFAULT_BODY_LIMIT = 1_000_000;
const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-Id'
};

const ERROR_STATUS_BY_CODE = {
  validationError: 400,
  notFound: 404,
  conflict: 409,
  notAllowed: 405,
  unauthorized: 401,
  forbidden: 403,
  rateLimited: 429,
  timeout: 504,
  dependencyUnavailable: 503,
  internalError: 500
};

function nowMs() {
  return Date.now();
}

function createId(prefix = 'id') {
  const value = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return prefix ? `${prefix}_${value}` : value;
}

function resolveRequestId(req, res) {
  const header = req.headers['x-request-id'];
  const requestId = typeof header === 'string' && header.trim() ? header.trim() : createId('req');
  if (res && !res.headersSent) {
    res.setHeader('X-Request-Id', requestId);
  }
  return requestId;
}

function errorEnvelope({ code, message, causeCode, requestId, traceId, details }) {
  return {
    error: {
      code: code || 'internalError',
      message: message || 'Internal error',
      details: details || undefined,
      causeCode: causeCode || 'UNKNOWN',
      traceId: traceId || undefined,
      requestId: requestId || undefined
    }
  };
}

function sendJson(res, statusCode, payload, extraHeaders = null) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...DEFAULT_CORS_HEADERS
  };
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendText(res, statusCode, text, extraHeaders = null) {
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    ...DEFAULT_CORS_HEADERS
  };
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }
  res.writeHead(statusCode, headers);
  res.end(text);
}

function sendOptions(res) {
  res.writeHead(204, {
    ...DEFAULT_CORS_HEADERS,
    'Access-Control-Max-Age': '86400'
  });
  res.end();
}

function sendError(res, options = {}) {
  const status = Number.isFinite(options.status)
    ? options.status
    : ERROR_STATUS_BY_CODE[options.code] || 500;
  const payload = errorEnvelope(options);
  sendJson(res, status, payload);
}

function readJsonBody(req, { limitBytes = DEFAULT_BODY_LIMIT } = {}) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    let done = false;

    const finish = (err, value) => {
      if (done) return;
      done = true;
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      if (err) reject(err);
      else resolve(value);
    };

    const onData = (chunk) => {
      if (done) return;
      total += chunk.length;
      if (total > limitBytes) {
        const err = new Error('payload too large');
        err.code = 'payload_too_large';
        req.resume();
        finish(err);
        return;
      }
      chunks.push(chunk);
    };

    const onEnd = () => {
      if (done) return;
      if (!chunks.length) {
        finish(null, null);
        return;
      }
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) {
        finish(null, null);
        return;
      }
      try {
        finish(null, JSON.parse(text));
      } catch (err) {
        err.code = 'invalid_json';
        finish(err);
      }
    };

    const onError = (err) => finish(err);

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (_err) {
    return null;
  }
}

function wrapAsync(handler, onError) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => {
      if (onError) {
        onError(err, req, res);
        return;
      }
      if (!res.headersSent) {
        const requestId = resolveRequestId(req, res);
        sendError(res, { code: 'internalError', message: 'Unhandled error', requestId });
        return;
      }
      res.end();
    });
  };
}

function createSseHub(options = {}) {
  const eventName = options.eventName || 'message';
  const retryMs = Number.isFinite(options.retryMs) ? options.retryMs : 2000;
  const heartbeatMs = Number.isFinite(options.heartbeatMs) ? options.heartbeatMs : 15000;
  const maxSlowCount = Number.isFinite(options.maxSlowCount) ? options.maxSlowCount : 2;
  const headers = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    ...DEFAULT_CORS_HEADERS,
    ...(options.headers || {})
  };
  const clients = new Set();
  let heartbeatTimer = null;

  const formatMessage = (payload, nameOverride, id) => {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const name = nameOverride || eventName;
    const idLine = id != null ? `id: ${id}\n` : '';
    return `${idLine}event: ${name}\ndata: ${data}\n\n`;
  };

  const removeClient = (client) => {
    clients.delete(client);
    if (!clients.size && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const flushClient = (client) => {
    if (!client.pending) return;
    const payload = client.pending;
    client.pending = null;
    const ok = client.res.write(payload);
    if (!ok) {
      client.blocked = true;
      client.slowCount += 1;
      if (client.slowCount > maxSlowCount) {
        removeClient(client);
        try {
          client.res.end();
        } catch (_err) {
          // ignore
        }
        return;
      }
      client.res.once('drain', () => {
        client.blocked = false;
        flushClient(client);
      });
    }
  };

  const sendToClient = (client, payload) => {
    if (client.blocked) {
      client.pending = payload;
      return;
    }
    const ok = client.res.write(payload);
    if (!ok) {
      client.blocked = true;
      client.slowCount += 1;
      client.pending = payload;
      if (client.slowCount > maxSlowCount) {
        removeClient(client);
        try {
          client.res.end();
        } catch (_err) {
          // ignore
        }
        return;
      }
      client.res.once('drain', () => {
        client.blocked = false;
        flushClient(client);
      });
    }
  };

  const startHeartbeat = () => {
    if (heartbeatTimer || heartbeatMs <= 0) return;
    heartbeatTimer = setInterval(() => {
      if (!clients.size) return;
      const payload = formatMessage({ tsMs: nowMs() }, 'heartbeat');
      clients.forEach((client) => {
        if (client.blocked) return;
        try {
          client.res.write(payload);
        } catch (_err) {
          removeClient(client);
        }
      });
    }, heartbeatMs);
  };

  const addClient = (req, res, initialPayload, initialId) => {
    res.writeHead(200, headers);
    res.write(`retry: ${retryMs}\n\n`);
    res.write(':\n\n');
    const client = {
      res,
      blocked: false,
      pending: null,
      slowCount: 0
    };
    clients.add(client);
    if (initialPayload !== undefined) {
      sendToClient(client, formatMessage(initialPayload, null, initialId));
    }
    startHeartbeat();
    req.on('close', () => removeClient(client));
    res.on('error', () => removeClient(client));
  };

  const send = (payload, nameOverride, id) => {
    if (!clients.size) return;
    const message = formatMessage(payload, nameOverride, id);
    clients.forEach((client) => sendToClient(client, message));
  };

  const size = () => clients.size;

  const close = () => {
    clients.forEach((client) => {
      try {
        client.res.end();
      } catch (_err) {
        // ignore
      }
    });
    clients.clear();
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  return {
    addClient,
    send,
    size,
    close
  };
}

module.exports = {
  createId,
  resolveRequestId,
  errorEnvelope,
  sendJson,
  sendText,
  sendOptions,
  sendError,
  readJsonBody,
  safeDecode,
  wrapAsync,
  createSseHub
};
