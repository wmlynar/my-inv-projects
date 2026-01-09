#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const dgram = require('dgram');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { once } = require('events');
const { START_MARK, RbkParser } = require('../../../packages/robokit-lib/rbk');
const {
  readFileSafe,
  readJson5,
  sanitizeSessionName,
  ensureDir,
  dirSize,
  humanSize
} = require('../lib/helpers');

const HEADER = '\nUsage: proxy-recorder <command> [--flags]\nCommands: start, stop, list-sessions, status, archive, replay\n';

function parseArgs(args) {
  const result = { command: null, options: {} };
  if (args.length === 0) return result;
  result.command = args[0];
  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      i += 1;
      continue;
    }
    const [key, raw] = arg.slice(2).split('=', 2);
    if (raw !== undefined) {
      result.options[key] = raw;
      i += 1;
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      result.options[key] = next;
      i += 2;
      continue;
    }
    result.options[key] = 'true';
    i += 1;
  }
  return result;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0' || text === '') return false;
  return fallback;
}

function padNumber(value, width) {
  const text = String(value);
  if (text.length >= width) return text;
  return `${'0'.repeat(width - text.length)}${text}`;
}

function expandHome(input) {
  if (!input) return input;
  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function resolveRootDir(input) {
  const base = input || path.join(os.homedir(), 'robokit_logs');
  return path.resolve(expandHome(base));
}

function formatSessionTimestampPrefix(date = new Date()) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1, 2);
  const day = padNumber(date.getDate(), 2);
  const hours = padNumber(date.getHours(), 2);
  const minutes = padNumber(date.getMinutes(), 2);
  return `${year}-${month}-${day}_${hours}_${minutes}`;
}

function parseApiNumberSet(input) {
  if (input === undefined || input === null) return null;
  const candidates = Array.isArray(input) ? input : String(input).split(/[,\s|]+/);
  const numbers = candidates
    .map((chunk) => {
      const trimmed = String(chunk).trim();
      if (!trimmed) return null;
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((value) => value !== null);
  if (numbers.length === 0) return null;
  const set = new Set();
  for (const num of numbers) {
    set.add(num);
  }
  return set;
}

function sanitizeFramePayload(payload, captureOptions) {
  if (!captureOptions || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const sanitized = { ...payload };
  if (captureOptions.omitLasers) {
    delete sanitized.lasers;
    delete sanitized.laser;
  }
  if (captureOptions.omitPointCloud) {
    delete sanitized.pointCloud;
    delete sanitized.point_cloud;
  }
  return sanitized;
}

function captureNotesForOptions(captureOptions) {
  if (!captureOptions) return [];
  const notes = [];
  if (captureOptions.omitLasers) {
    notes.push('laser payload suppressed to reduce log size');
  }
  if (captureOptions.omitPointCloud) {
    notes.push('point cloud data suppressed to reduce log size');
  }
  if (captureOptions.captureComment) {
    notes.push(`capture comment: ${captureOptions.captureComment}`);
  }
  return notes;
}

function sortedArrayFromSet(set) {
  if (!set) return [];
  return Array.from(set).sort((a, b) => a - b);
}

function getSessionPath(rootDir, sessionName, targetKind, timestampPrefix) {
  const prefix = timestampPrefix || formatSessionTimestampPrefix();
  return path.join(rootDir, `${prefix}_${targetKind || 'session'}_${sessionName}`);
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function appendJsonl(filePath, entry) {
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
}

function createRotatingJsonlWriter(dir, baseName, rotateBytes) {
  ensureDir(dir);
  let index = 1;
  let stream = null;
  let currentPath = null;
  let currentSize = 0;

  function openStream() {
    const fileName = `${baseName}_${padNumber(index, 6)}.jsonl`;
    currentPath = path.join(dir, fileName);
    currentSize = fs.existsSync(currentPath) ? fs.statSync(currentPath).size : 0;
    stream = fs.createWriteStream(currentPath, { flags: 'a' });
  }

  function rotateIfNeeded(nextBytes) {
    if (!rotateBytes || rotateBytes <= 0) return;
    if (currentSize + nextBytes <= rotateBytes) return;
    stream.end();
    index += 1;
    openStream();
  }

  function write(entry) {
    if (!stream) openStream();
    const line = `${JSON.stringify(entry)}\n`;
    const bytes = Buffer.byteLength(line);
    rotateIfNeeded(bytes);
    stream.write(line);
    currentSize += bytes;
  }

  function close() {
    if (stream) stream.end();
  }

  return { write, close, path: () => currentPath };
}

function parseHeaders(lines) {
  const headers = {};
  for (const line of lines) {
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    if (headers[key]) {
      headers[key] = `${headers[key]}, ${value}`;
    } else {
      headers[key] = value;
    }
  }
  return headers;
}

function parseChunkedBodyLength(buffer, start) {
  let offset = start;
  while (true) {
    const lineEnd = buffer.indexOf('\r\n', offset);
    if (lineEnd === -1) return null;
    const sizeLine = buffer.slice(offset, lineEnd).toString('ascii').trim();
    const sizeHex = sizeLine.split(';')[0].trim();
    const size = Number.parseInt(sizeHex, 16);
    if (!Number.isFinite(size)) return null;
    offset = lineEnd + 2;
    if (buffer.length < offset + size + 2) return null;
    offset += size;
    if (buffer[offset] !== 13 || buffer[offset + 1] !== 10) return null;
    offset += 2;
    if (size === 0) {
      const trailerEnd = buffer.indexOf('\r\n\r\n', offset);
      if (trailerEnd === -1) return null;
      offset = trailerEnd + 4;
      return offset - start;
    }
  }
}

function parseHttpMessage(buffer, isRequest) {
  const headerEnd = buffer.indexOf('\r\n\r\n');
  if (headerEnd === -1) return null;
  const headerText = buffer.slice(0, headerEnd).toString('utf8');
  const lines = headerText.split('\r\n');
  const startLine = lines.shift();
  if (!startLine) return null;
  const headers = parseHeaders(lines);

  let method = null;
  let url = null;
  let statusCode = null;
  let statusText = null;
  let httpVersion = null;

  if (isRequest) {
    const parts = startLine.split(' ');
    if (parts.length < 2) return null;
    method = parts[0];
    url = parts[1];
    httpVersion = parts[2] || null;
  } else {
    const parts = startLine.split(' ');
    if (parts.length < 2) return null;
    httpVersion = parts[0];
    statusCode = Number.parseInt(parts[1], 10);
    statusText = parts.slice(2).join(' ') || null;
  }

  const bodyStart = headerEnd + 4;
  const contentLength = Number.parseInt(headers['content-length'], 10);
  const transferEncoding = headers['transfer-encoding'];
  let bodyLength = 0;

  if (Number.isFinite(contentLength)) {
    bodyLength = contentLength;
    if (buffer.length < bodyStart + bodyLength) return null;
  } else if (transferEncoding && transferEncoding.toLowerCase().includes('chunked')) {
    const chunkedLen = parseChunkedBodyLength(buffer, bodyStart);
    if (chunkedLen === null) return null;
    bodyLength = chunkedLen;
  }

  if (buffer.length < bodyStart + bodyLength) return null;
  const body = buffer.slice(bodyStart, bodyStart + bodyLength);
  const remaining = buffer.slice(bodyStart + bodyLength);
  return {
    message: {
      method,
      url,
      statusCode,
      statusText,
      httpVersion,
      headers,
      body
    },
    remaining
  };
}

function listSessionDirs(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function normalizeListeners(rawConfig, overrides) {
  const source = Array.isArray(rawConfig.listeners)
    ? rawConfig.listeners
    : Array.isArray(rawConfig.mappings)
      ? rawConfig.mappings
      : [];
  if (source.length === 0) {
    throw new Error('config.listeners must be a non-empty array');
  }

  const bindHost = overrides.bindHost || rawConfig.bindHost || null;
  const upstreamHost = overrides.upstreamHost || rawConfig.upstreamHost || null;
  const listeners = source.map((listener, idx) => {
    const protocol = String(listener.protocol || 'tcp').toLowerCase();
    const name = listener.name || `listener-${idx + 1}`;

    const listenHost =
      bindHost ||
      (listener.listen && listener.listen.host) ||
      listener.listenHost ||
      '0.0.0.0';
    const listenPortRaw = (listener.listen && listener.listen.port) || listener.listenPort;
    const listenPort = Number.parseInt(listenPortRaw, 10);

    const upstreamHostValue =
      upstreamHost ||
      (listener.upstream && listener.upstream.host) ||
      listener.targetHost ||
      null;
    const upstreamPortRaw = (listener.upstream && listener.upstream.port) || listener.targetPort;
    const upstreamPort = Number.parseInt(upstreamPortRaw, 10);

    let decodeKind = null;
    if (listener.decode) {
      decodeKind = typeof listener.decode === 'string' ? listener.decode : listener.decode.kind;
    }
    if (!decodeKind) {
      decodeKind = protocol === 'tcp' ? 'robocore' : 'none';
    }
    if (decodeKind === 'robokit') {
      decodeKind = 'robocore';
    }
    if (decodeKind === 'raw') {
      decodeKind = 'none';
    }

    if (!Number.isFinite(listenPort)) {
      throw new Error(`listener ${name} missing listen.port`);
    }
    if (!upstreamHostValue || !Number.isFinite(upstreamPort)) {
      throw new Error(`listener ${name} missing upstream.host/port`);
    }

    return {
      name,
      protocol,
      listen: { host: listenHost, port: listenPort },
      upstream: { host: upstreamHostValue, port: upstreamPort },
      decode: { kind: decodeKind }
    };
  });

  const nameSet = new Set();
  const portSet = new Set();
  for (const listener of listeners) {
    if (nameSet.has(listener.name)) {
      throw new Error(`duplicate listener name: ${listener.name}`);
    }
    nameSet.add(listener.name);
    if (portSet.has(listener.listen.port)) {
      throw new Error(`duplicate listen.port: ${listener.listen.port}`);
    }
    portSet.add(listener.listen.port);
  }

  return listeners;
}

function buildTargets(session, overrides) {
  const targets = Array.isArray(session.targets) ? session.targets : [];
  if (targets.length > 0) return targets;
  const robotId = overrides.robotId || null;
  const addr = overrides.upstreamHost || null;
  if (!robotId && !addr) return [];
  const entry = { kind: session.targetKind || 'robot' };
  if (robotId) entry.robotId = robotId;
  if (addr) entry.addr = addr;
  return [entry];
}

function buildSessionMeta(sessionName, session, listeners, overrides, startedTsMs) {
  return {
    sessionName,
    description: session.description || '',
    startedTsMs,
    endedTsMs: null,
    operator: session.operator || null,
    targets: buildTargets(session, overrides),
    listeners: listeners.map((listener) => ({
      name: listener.name,
      protocol: listener.protocol,
      listen: `${listener.listen.host}:${listener.listen.port}`,
      upstream: `${listener.upstream.host}:${listener.upstream.port}`,
      decode: listener.decode.kind
    })),
    notes: Array.isArray(session.notes) ? [...session.notes] : []
  };
}

function fatal(code, message) {
  console.error(message);
  process.exit(code);
}

let connCounter = 0;

function nextConnId(prefix = 'c') {
  connCounter += 1;
  return `${prefix}${padNumber(connCounter, 4)}`;
}

function createTcpConnectionLogger(sessionDir, listener, connId, options) {
  const tcpDir = path.join(sessionDir, 'tcp', listener.name);
  ensureDir(tcpDir);
  const captureFrames = options.captureFrames && listener.decode.kind === 'robocore';
  const framesWriter = captureFrames
    ? createRotatingJsonlWriter(tcpDir, `conn_${connId}_frames`, options.rotateBytes)
    : null;
  const captureRaw = options.captureRawBytes || !framesWriter;
  const rawWriter = captureRaw
    ? createRotatingJsonlWriter(tcpDir, `conn_${connId}_raw`, options.rotateBytes)
    : null;
  const parsers = framesWriter
    ? {
        c2s: new RbkParser({ maxBodyLength: options.maxBodyLength }),
        s2c: new RbkParser({ maxBodyLength: options.maxBodyLength })
      }
    : null;

  function logFrames(direction, chunk) {
    if (!framesWriter || !parsers) return;
    const now = Date.now();
    let messages = [];
    try {
      messages = parsers[direction].push(chunk);
    } catch (err) {
      framesWriter.write({
        tsMs: now,
        connId,
        dir: direction,
        decode: { kind: 'robocore', confidence: 'OBSERVED' },
        header: null,
        json: null,
        binaryTailBase64: null,
        rawFrameBase64: options.includeRawFrameBase64 ? chunk.toString('base64') : null,
        parseError: err.message
      });
      parsers[direction] = new RbkParser({ maxBodyLength: options.maxBodyLength });
      return;
    }
    for (const msg of messages) {
      const header = {
        startMarkHex: START_MARK.toString(16).padStart(2, '0'),
        version: msg.version,
        seq: msg.seq,
        apiNo: msg.apiNo,
        bodyLength: msg.bodyLength,
        jsonSizeHeader: msg.jsonSizeHeader
      };
      const binaryTailBase64 = msg.jsonError && msg.rawBody && msg.rawBody.length
        ? msg.rawBody.toString('base64')
        : options.includeBinaryTailBase64 && msg.binary && msg.binary.length
          ? msg.binary.toString('base64')
          : null;
      const capturePayload = msg.jsonError ? null : msg.payload || null;
      const sanitizedJson = sanitizeFramePayload(capturePayload, options.captureOptions);
      const shouldIncludeRaw =
        options.includeRawFrameBase64 ||
        !!(
          options.captureOptions &&
          options.captureOptions.rawFrameApiWhitelist &&
          options.captureOptions.rawFrameApiWhitelist.has(msg.apiNo)
        );
      const rawFrameBase64Value = shouldIncludeRaw && msg.rawFrame
        ? msg.rawFrame.toString('base64')
        : null;
      framesWriter.write({
        tsMs: now,
        connId,
        dir: direction,
        decode: { kind: 'robocore', confidence: 'OBSERVED' },
        header,
        json: sanitizedJson,
        binaryTailBase64,
        rawFrameBase64: rawFrameBase64Value,
        parseError: msg.jsonError || null
      });
    }
  }

  function log(direction, chunk) {
    const now = Date.now();
    if (rawWriter) {
      rawWriter.write({
        tsMs: now,
        connId,
        dir: direction,
        nBytes: chunk.length,
        bytesBase64: chunk.toString('base64'),
        bytesHexPreview: options.hexPreviewBytes
          ? chunk.slice(0, options.hexPreviewBytes).toString('hex')
          : undefined
      });
    }
    logFrames(direction, chunk);
  }

  function close() {
    if (rawWriter) rawWriter.close();
    if (framesWriter) framesWriter.close();
  }

  return { log, close };
}

function createHttpConnectionLogger(sessionDir, listener, connId, options) {
  const httpDir = path.join(sessionDir, 'http', listener.name);
  ensureDir(httpDir);
  const requestsWriter = createRotatingJsonlWriter(httpDir, 'requests', options.rotateBytes);
  let requestBuffer = Buffer.alloc(0);
  let responseBuffer = Buffer.alloc(0);
  const pendingRequests = [];

  function onClientData(chunk) {
    requestBuffer = Buffer.concat([requestBuffer, chunk]);
    while (true) {
      const parsed = parseHttpMessage(requestBuffer, true);
      if (!parsed) break;
      pendingRequests.push(parsed.message);
      requestBuffer = parsed.remaining;
    }
  }

  function onServerData(chunk) {
    responseBuffer = Buffer.concat([responseBuffer, chunk]);
    while (true) {
      const parsed = parseHttpMessage(responseBuffer, false);
      if (!parsed) break;
      const request = pendingRequests.shift() || null;
      const response = parsed.message;
      const captureBodies = options.httpCaptureBodies;
      const entry = {
        tsMs: Date.now(),
        connId,
        method: request ? request.method : null,
        url: request ? request.url : null,
        requestHeaders: request ? request.headers : null,
        requestBodyBytes: request && request.body ? request.body.length : 0,
        requestBodyBase64:
          captureBodies && request && request.body && request.body.length
            ? request.body.toString('base64')
            : null,
        responseStatus: response.statusCode || null,
        responseHeaders: response.headers || null,
        responseBodyBytes: response.body ? response.body.length : 0,
        responseBodyBase64:
          captureBodies && response.body && response.body.length ? response.body.toString('base64') : null
      };
      requestsWriter.write(entry);
      responseBuffer = parsed.remaining;
    }
  }

  function close() {
    requestsWriter.close();
  }

  return { onClientData, onServerData, close };
}

function startSession(opts) {
  const { config, configPath } = (() => {
    const configPathValue =
      opts.configPath || path.join(__dirname, '..', 'configs', `${opts.preset || 'robokit-all'}.json5`);
    if (!fs.existsSync(configPathValue)) {
      fatal(1, `missing config: ${configPathValue}`);
    }
    const configValue = readJson5(configPathValue);
    return { config: configValue, configPath: configPathValue };
  })();

  const overrides = {
    bindHost: opts.bindHost || null,
    upstreamHost: opts.upstreamHost || null,
    robotId: opts.robotId || null
  };
  const captureOverrides = {
    suppressLasers: opts.suppressLasers,
    suppressPointCloud: opts.suppressPointCloud,
    captureComment: opts.captureComment,
    rawFrameApis: opts.rawFrameApis
  };

  const sessionConfig = config.session || {};
  const descriptionValue = opts.description || sessionConfig.description || '';
  let sessionNameValue = opts.session || '';
  if (!sessionNameValue) {
    if (descriptionValue) {
      sessionNameValue = sanitizeSessionName(descriptionValue);
    } else if (sessionConfig.name) {
      sessionNameValue = sanitizeSessionName(sessionConfig.name);
    } else {
      sessionNameValue = 'session';
    }
  }
  const session = {
    name: sessionNameValue,
    description: descriptionValue,
    rootDir: opts.rootDir || sessionConfig.rootDir || '~/robokit_logs',
    targetKind: opts.targetKind || sessionConfig.targetKind || 'robot',
    operator: opts.operator || sessionConfig.operator || null,
    notes: sessionConfig.notes || [],
    targets: sessionConfig.targets || []
  };

  const listeners = normalizeListeners(config, overrides);
  const limits = config.limits || {};
  const captureConfig = config.capture || {};
  const captureOptions = {
    omitLasers: toBool(
      captureOverrides.suppressLasers ?? captureConfig.omitLasers,
      false
    ),
    omitPointCloud: toBool(
      captureOverrides.suppressPointCloud ?? captureConfig.omitPointCloud,
      false
    ),
    captureComment: captureOverrides.captureComment ?? captureConfig.comment ?? null,
    rawFrameApiWhitelist: parseApiNumberSet(
      captureOverrides.rawFrameApis ??
        captureConfig.rawFrameBase64Apis ??
        captureConfig.rawFrameApis ??
        null
    )
  };
  const rawSessionName = sanitizeSessionName(session.name);
  const rootDir = resolveRootDir(session.rootDir);
  const timestampPrefix = formatSessionTimestampPrefix();
  const hasDatePrefix = /^\d{4}-\d{2}-\d{2}(?:_\d{2}_\d{2})?_/.test(rawSessionName);
  const sessionName = hasDatePrefix
    ? rawSessionName
    : path.basename(getSessionPath('', rawSessionName, session.targetKind, timestampPrefix));
  const sessionDir = path.join(rootDir, sessionName);
  if (fs.existsSync(sessionDir)) {
    fatal(1, `session already exists: ${sessionDir}`);
  }

  ensureDir(sessionDir);
  const startedTsMs = Date.now();
  const sessionMeta = buildSessionMeta(sessionName, session, listeners, overrides, startedTsMs);
  sessionMeta.notes = [...sessionMeta.notes, ...captureNotesForOptions(captureOptions)];
  sessionMeta.captureOptions = {
    omitLasers: captureOptions.omitLasers,
    omitPointCloud: captureOptions.omitPointCloud,
    captureComment: captureOptions.captureComment,
    rawFrameBase64Apis: sortedArrayFromSet(captureOptions.rawFrameApiWhitelist)
  };

  writeJson(path.join(sessionDir, 'session.meta.json5'), sessionMeta);
  writeJson(path.join(sessionDir, 'listeners.json5'), listeners);
  writeJson(path.join(sessionDir, 'config.effective.json5'), {
    session: {
      ...session,
      name: sessionName,
      rootDir,
      targetKind: session.targetKind
    },
    limits,
    captureOptions: {
      omitLasers: captureOptions.omitLasers,
      omitPointCloud: captureOptions.omitPointCloud,
      captureComment: captureOptions.captureComment,
      rawFrameBase64Apis: sortedArrayFromSet(captureOptions.rawFrameApiWhitelist)
    },
    listeners,
    configPath
  });
  fs.writeFileSync(path.join(sessionDir, 'session.pid'), `${process.pid}\n`, 'utf8');

  if (opts.printEffectiveConfig) {
    console.log(JSON.stringify({ session, limits, listeners }, null, 2));
  }

  const options = {
    rotateBytes: Number(limits.rotateFileMb || 512) * 1024 * 1024,
    warnSessionSizeGb: Number(limits.warnSessionSizeGb || 5),
    hexPreviewBytes: Number(limits.hexPreviewBytes ?? 0),
    maxBodyLength: Number(limits.maxBodyLength || 1024 * 1024),
    captureRawBytes: toBool(limits.captureRawBytes, false),
    captureFrames: toBool(limits.captureFrames, true),
    includeRawFrameBase64: toBool(limits.includeRawFrameBase64, false),
    includeBinaryTailBase64: toBool(limits.includeBinaryTailBase64, false),
    httpCaptureBodies: toBool(limits.httpCaptureBodies, true),
    failFast: toBool(opts.failFast, false),
    captureOptions
  };

  const stopState = { stopped: false };
  let warnInterval = null;
  const servers = [];

  function finalize(exitCode) {
    if (stopState.stopped) return;
    stopState.stopped = true;
    sessionMeta.endedTsMs = Date.now();
    writeJson(path.join(sessionDir, 'session.meta.json5'), sessionMeta);
    const pidFile = path.join(sessionDir, 'session.pid');
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
    process.exit(exitCode);
  }

  function cleanupAndExit(code, message) {
    if (message) {
      console.error(message);
    }
    if (warnInterval) {
      clearInterval(warnInterval);
    }
    servers.forEach((server) => server.close());
    finalize(code);
  }

  function appendConnection(listener, entry) {
    const filePath = path.join(sessionDir, 'tcp', listener.name, 'connections.jsonl');
    appendJsonl(filePath, entry);
  }

  function startTcpProxy(listener) {
    const server = net.createServer((client) => {
      const connId = nextConnId('c');
      const logger = createTcpConnectionLogger(sessionDir, listener, connId, options);
      const local = `${client.localAddress}:${client.localPort}`;
      const peer = `${client.remoteAddress}:${client.remotePort}`;
      const upstream = `${listener.upstream.host}:${listener.upstream.port}`;

      appendConnection(listener, {
        tsMs: Date.now(),
        event: 'connOpened',
        connId,
        local,
        peer,
        upstream
      });

      let closed = false;
      const closeOnce = (reason) => {
        if (closed) return;
        closed = true;
        appendConnection(listener, {
          tsMs: Date.now(),
          event: 'connClosed',
          connId,
          reason
        });
        logger.close();
      };

      const target = net.connect(listener.upstream.port, listener.upstream.host);

      target.on('data', (chunk) => {
        logger.log('s2c', chunk);
        if (!client.destroyed) client.write(chunk);
      });
      client.on('data', (chunk) => {
        logger.log('c2s', chunk);
        if (!target.destroyed) target.write(chunk);
      });

      target.on('error', (err) => {
        closeOnce(`upstream_error:${err.code || err.message}`);
        if (options.failFast) {
          cleanupAndExit(3, 'upstream unreachable (fail-fast)');
        }
      });
      client.on('error', (err) => closeOnce(`client_error:${err.code || err.message}`));
      client.on('close', () => closeOnce('client_close'));
      target.on('close', () => closeOnce('upstream_close'));
    });

    server.on('error', (err) => {
      const code = err.code;
      if (code === 'EADDRINUSE' || code === 'EACCES') {
        cleanupAndExit(2, `listen failed for ${listener.name}: ${err.message}`);
        return;
      }
      cleanupAndExit(1, `listen failed for ${listener.name}: ${err.message}`);
    });

    ensureDir(path.join(sessionDir, 'tcp', listener.name));
    server.listen(listener.listen.port, listener.listen.host);
    return {
      close: () => server.close()
    };
  }

  function startHttpProxy(listener) {
    const server = net.createServer((client) => {
      const connId = nextConnId('h');
      const logger = createHttpConnectionLogger(sessionDir, listener, connId, options);

      const target = net.connect(listener.upstream.port, listener.upstream.host);

      target.on('data', (chunk) => {
        logger.onServerData(chunk);
        if (!client.destroyed) client.write(chunk);
      });
      client.on('data', (chunk) => {
        logger.onClientData(chunk);
        if (!target.destroyed) target.write(chunk);
      });

      const closeOnce = () => {
        logger.close();
      };
      target.on('error', (err) => {
        closeOnce();
        if (options.failFast) {
          cleanupAndExit(3, 'upstream unreachable (fail-fast)');
        }
      });
      client.on('error', closeOnce);
      client.on('close', closeOnce);
      target.on('close', closeOnce);
    });

    server.on('error', (err) => {
      const code = err.code;
      if (code === 'EADDRINUSE' || code === 'EACCES') {
        cleanupAndExit(2, `listen failed for ${listener.name}: ${err.message}`);
        return;
      }
      cleanupAndExit(1, `listen failed for ${listener.name}: ${err.message}`);
    });

    ensureDir(path.join(sessionDir, 'http', listener.name));
    server.listen(listener.listen.port, listener.listen.host);
    return {
      close: () => server.close()
    };
  }

  function startUdpProxy(listener) {
    const socket = dgram.createSocket('udp4');
    const connId = nextConnId('u');
    const logger = createTcpConnectionLogger(sessionDir, listener, connId, options);
    const clients = new Map();
    const clientTimeoutMs = 60_000;
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, meta] of clients.entries()) {
        if (now - meta.lastSeen >= clientTimeoutMs) {
          clients.delete(key);
        }
      }
    }, 30_000);

    socket.on('message', (msg, rinfo) => {
      const isFromTarget = rinfo.address === listener.upstream.host && rinfo.port === listener.upstream.port;
      if (isFromTarget) {
        logger.log('s2c', msg);
        for (const client of clients.values()) {
          socket.send(msg, client.port, client.address);
          client.lastSeen = Date.now();
        }
        return;
      }
      logger.log('c2s', msg);
      const clientKey = `${rinfo.address}:${rinfo.port}`;
      clients.set(clientKey, { address: rinfo.address, port: rinfo.port, lastSeen: Date.now() });
      socket.send(msg, listener.upstream.port, listener.upstream.host);
    });

    socket.on('error', (err) => {
      console.error(`udp proxy ${listener.name} error: ${err.message}`);
      if (options.failFast) {
        cleanupAndExit(3, 'upstream unreachable (fail-fast)');
      }
    });

    socket.bind(listener.listen.port, listener.listen.host);
    return {
      close: () => {
        socket.close();
        logger.close();
        clearInterval(cleanupTimer);
      }
    };
  }

  servers.push(
    ...listeners.map((listener) => {
      if (listener.protocol === 'http') {
        return startHttpProxy(listener);
      }
      if (listener.protocol === 'udp') {
        return startUdpProxy(listener);
      }
      return startTcpProxy(listener);
    })
  );

  console.log(`Started proxy session ${sessionName} in ${sessionDir}`);
  listeners.forEach((listener) => {
    console.log(
      `listener ${listener.name}: ${listener.protocol} ${listener.listen.host}:${listener.listen.port} -> ${listener.upstream.host}:${listener.upstream.port} decode=${listener.decode.kind}`
    );
  });

  const warnBytes = options.warnSessionSizeGb * 1024 * 1024 * 1024;
  warnInterval = setInterval(() => {
    const size = dirSize(sessionDir);
    if (size >= warnBytes) {
      console.warn(
        `WARNING: session size exceeded ${options.warnSessionSizeGb} GB (current: ${humanSize(size)}).`
      );
    }
  }, 60_000);

  process.on('SIGINT', () => cleanupAndExit(0));
  process.on('SIGTERM', () => cleanupAndExit(0));
}

function stopSession(opts) {
  const rootDir = resolveRootDir(opts.rootDir);
  const sessionDir = path.join(rootDir, opts.session);
  const pidFile = path.join(sessionDir, 'session.pid');
  if (!fs.existsSync(pidFile)) {
    fatal(1, 'session not running (no pid)');
  }
  const pid = Number.parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`signaled ${pid}`);
  } catch (err) {
    if (err.code === 'ESRCH') {
      console.log('session already stopped');
      const metaPath = path.join(sessionDir, 'session.meta.json5');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          if (meta && !meta.endedTsMs) {
            meta.endedTsMs = Date.now();
            writeJson(metaPath, meta);
          }
        } catch (_) {
          // ignore parse errors
        }
      }
    } else {
      console.error(`failed to stop ${pid}: ${err.message}`);
    }
  }
}

function countTcpConnections(sessionDir) {
  const tcpRoot = path.join(sessionDir, 'tcp');
  if (!fs.existsSync(tcpRoot)) return 0;
  let total = 0;
  const listeners = fs.readdirSync(tcpRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const listener of listeners) {
    const connectionsFile = path.join(tcpRoot, listener.name, 'connections.jsonl');
    if (!fs.existsSync(connectionsFile)) continue;
    const lines = fs.readFileSync(connectionsFile, 'utf8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.event === 'connOpened') total += 1;
      } catch (err) {
        continue;
      }
    }
  }
  return total;
}

function statusSession(opts) {
  const rootDir = resolveRootDir(opts.rootDir);
  const sessionDir = path.join(rootDir, opts.session);
  if (!fs.existsSync(sessionDir)) {
    fatal(1, 'session directory missing');
  }
  const metaRaw = readFileSafe(path.join(sessionDir, 'session.meta.json5'));
  const listenersRaw = readFileSafe(path.join(sessionDir, 'listeners.json5'));
  const pidFile = path.join(sessionDir, 'session.pid');
  const size = dirSize(sessionDir);
  const connections = countTcpConnections(sessionDir);
  console.log(`session: ${opts.session}`);
  if (metaRaw) console.log(`metadata: ${metaRaw}`);
  if (listenersRaw) console.log(`listeners: ${listenersRaw}`);
  console.log(`connections: ${connections}, captured size: ${humanSize(size)}`);
  if (pidFile && fs.existsSync(pidFile)) {
    const pid = Number.parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
    try {
      process.kill(pid, 0);
      console.log(`running (pid ${pid})`);
    } catch (_) {
      console.log(`stopped (pid ${pid})`);
    }
  }
}

function listSessions(opts) {
  const rootDir = resolveRootDir(opts.rootDir || opts.dir);
  const sessions = listSessionDirs(rootDir);
  if (sessions.length === 0) {
    console.log('no sessions found');
    return;
  }
  sessions.forEach((name) => {
    const pidFile = path.join(rootDir, name, 'session.pid');
    let status = 'stopped';
    if (fs.existsSync(pidFile)) {
      const pid = Number.parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      try {
        process.kill(pid, 0);
        status = `running (pid ${pid})`;
      } catch (_) {
        status = 'stopped';
      }
    }
    console.log(`${name} - ${status}`);
  });
}

function archiveSession(opts) {
  const rootDir = resolveRootDir(opts.rootDir);
  const sessionDir = path.join(rootDir, opts.session);
  if (!fs.existsSync(sessionDir)) {
    fatal(1, 'session missing');
  }
  const archiveDir = path.join(sessionDir, 'archive');
  ensureDir(archiveDir);
  const archiveName = `${opts.session}.zip`;
  const archivePath = path.join(archiveDir, archiveName);

  const zipResult = spawnSync(
    'zip',
    ['-r', archivePath, '.', '-x', 'archive/*', 'manifest.json'],
    { cwd: sessionDir }
  );
  if (zipResult.error) {
    fatal(1, `archive failed: ${zipResult.error.message}`);
  }
  if (zipResult.status !== 0) {
    const stderr = zipResult.stderr ? zipResult.stderr.toString() : 'unknown error';
    fatal(1, `archive failed: ${stderr}`);
  }

  const manifest = {
    sessionName: opts.session,
    createdTsMs: Date.now(),
    files: []
  };

  function gather(dir, base = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'archive' || entry.name === 'manifest.json') {
        continue;
      }
      const full = path.join(dir, entry.name);
      const rel = path.join(base, entry.name);
      if (entry.isDirectory()) {
        gather(full, rel);
      } else if (entry.isFile()) {
        const sha = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
        manifest.files.push({ path: rel, sha256: sha });
      }
    }
  }

  gather(sessionDir);
  writeJson(path.join(sessionDir, 'manifest.json'), manifest);

  if (toBool(opts.deleteRaw, false)) {
    const removeTargets = ['tcp', 'http', 'captures', 'summary.json', 'session.pid'];
    for (const target of removeTargets) {
      const full = path.join(sessionDir, target);
      if (!fs.existsSync(full)) continue;
      if (fs.statSync(full).isDirectory()) {
        fs.rmSync(full, { recursive: true, force: true });
      } else {
        fs.rmSync(full, { force: true });
      }
    }
    console.log('raw session data removed');
  }

  console.log(`archived to ${archivePath}`);
}

async function replaySession(opts) {
  const rootDir = resolveRootDir(opts.rootDir);
  const sessionDir = path.join(rootDir, opts.session);
  if (!fs.existsSync(sessionDir)) {
    fatal(1, `session ${opts.session} not found`);
  }
  const listenerName = opts.listener;
  if (!listenerName) {
    fatal(1, 'missing --listener');
  }
  const listenerDir = path.join(sessionDir, 'tcp', listenerName);
  if (!fs.existsSync(listenerDir)) {
    fatal(1, `listener ${listenerName} not found`);
  }

  const rawFiles = fs.readdirSync(listenerDir).filter((name) => name.includes('_raw_'));
  if (rawFiles.length === 0) {
    fatal(1, `no raw logs found for ${listenerName} (enable limits.captureRawBytes=true to support replay)`);
  }

  const connIds = Array.from(
    new Set(
      rawFiles
        .map((name) => {
          const match = name.match(/^conn_(.+?)_raw_/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    )
  ).sort();

  let connId = opts.conn || connIds[connIds.length - 1];
  if (!connId || !connIds.includes(connId)) {
    fatal(1, `conn ${connId} not found`);
  }

  const selectedFiles = rawFiles
    .filter((name) => name.startsWith(`conn_${connId}_raw_`))
    .sort();
  const entries = [];
  for (const file of selectedFiles) {
    const full = path.join(listenerDir, file);
    const lines = fs.readFileSync(full, 'utf8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry && entry.bytesBase64) {
          entries.push(entry);
        }
      } catch (err) {
        continue;
      }
    }
  }
  const dirFilter = opts.dir || 'c2s';
  const filtered = entries.filter((entry) => entry.dir === dirFilter && entry.bytesBase64);
  if (!filtered.length) {
    fatal(1, `no entries for dir ${dirFilter}`);
  }

  const targetHost = opts.targetHost;
  const targetPort = Number.parseInt(opts.targetPort, 10);
  if (!targetHost || !targetPort) {
    fatal(1, 'target host/port must be specified via --target-host and --target-port');
  }

  filtered.sort((a, b) => (a.tsMs || 0) - (b.tsMs || 0));
  const socket = net.createConnection({ host: targetHost, port: targetPort });
  await once(socket, 'connect');
  console.log(`replaying ${filtered.length} ${dirFilter} chunks to ${targetHost}:${targetPort}`);
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  let lastTs = filtered[0].tsMs || Date.now();
  const parser = opts.decode ? new RbkParser({ maxBodyLength: 1024 * 1024 }) : null;

  for (const entry of filtered) {
    const chunk = Buffer.from(entry.bytesBase64, 'base64');
    const delta = entry.tsMs ? Math.max(0, entry.tsMs - lastTs) : 0;
    if (delta > 0) await wait(delta);
    socket.write(chunk);
    lastTs = entry.tsMs || lastTs;
    if (parser) {
      const msgs = parser.push(chunk);
      const apiNos = msgs.map((msg) => msg.apiNo).filter(Number.isFinite);
      console.log(`apiNos=${apiNos.join(',') || 'n/a'}`);
    }
  }
  socket.end();
  await once(socket, 'close');
  console.log('replay finished');
}

function ensureSession(options) {
  if (!options.session) {
    fatal(1, 'missing --session');
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command) {
    process.stdout.write(HEADER);
    process.exit(0);
  }
  switch (command) {
    case 'start':
      startSession({
        session: options.session,
        description: options.description,
        preset: options.preset,
        configPath: options.config,
        rootDir: options['root-dir'],
        targetKind: options['target-kind'],
        operator: options.operator,
        bindHost: options['bind-host'],
        upstreamHost: options['upstream-host'],
        robotId: options['robot-id'],
        captureComment: options['capture-comment'],
        suppressLasers: options['suppress-lasers'],
        suppressPointCloud: options['suppress-point-cloud'],
        rawFrameApis: options['raw-frame-apis'],
        printEffectiveConfig: toBool(options['print-effective-config'], false),
        failFast: options['fail-fast']
      });
      break;
    case 'stop':
      ensureSession(options);
      stopSession({ session: options.session, rootDir: options['root-dir'] });
      break;
    case 'list-sessions':
      listSessions({ rootDir: options['root-dir'], dir: options.dir });
      break;
    case 'status':
      ensureSession(options);
      statusSession({ session: options.session, rootDir: options['root-dir'] });
      break;
    case 'archive':
      ensureSession(options);
      archiveSession({
        session: options.session,
        rootDir: options['root-dir'],
        deleteRaw: options['delete-raw']
      });
      break;
    case 'replay':
      ensureSession(options);
      await replaySession({
        session: options.session,
        rootDir: options['root-dir'],
        listener: options.listener,
        conn: options.conn,
        dir: options.dir,
        decode: toBool(options.decode, false),
        targetHost: options['target-host'],
        targetPort: options['target-port']
      });
      break;
    default:
      console.error(`unknown command ${command}`);
      process.stdout.write(HEADER);
  }
}

main().catch((err) => {
  console.error('error:', err.message);
  process.exit(10);
});
