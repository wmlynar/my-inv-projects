const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');

const { RbkParser } = require('@fleet-manager/adapters-robokit');

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, 'config.json5');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return null;
  }
}

function stripJsonComments(input) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        output += ch;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      output += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      stringChar = ch;
      output += ch;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    output += ch;
  }

  return output;
}

function stripTrailingCommas(input) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let escape = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      output += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      stringChar = ch;
      output += ch;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) {
        j += 1;
      }
      if (input[j] === '}' || input[j] === ']') {
        continue;
      }
    }

    output += ch;
  }

  return output;
}

function readJson5(filePath) {
  const raw = readFileSafe(filePath);
  if (!raw) {
    throw new Error(`missing config: ${filePath}`);
  }
  const withoutComments = stripJsonComments(raw);
  const clean = stripTrailingCommas(withoutComments);
  return JSON.parse(clean);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function asciiPreview(buffer, limit) {
  const max = Math.min(limit, buffer.length);
  let out = '';
  for (let i = 0; i < max; i += 1) {
    const code = buffer[i];
    out += code >= 32 && code <= 126 ? String.fromCharCode(code) : '.';
  }
  if (buffer.length > limit) {
    out += '...';
  }
  return out;
}

let connCounter = 1;

function createLogger(baseDir, mapping, clientSocket, serverSocket, options) {
  const {
    asciiPreviewLimit,
    logBinary,
    logBase64,
    logAscii,
    logSha256,
    splitLogs,
    throttle
  } = options;
  const connId = `${Date.now()}-${connCounter++}`;
  const startedAtMs = Date.now();
  let seq = 0;
  const mappingName = mapping.name || `port-${mapping.listenPort}`;
  const connDir = path.join(baseDir, mappingName, connId);
  ensureDir(connDir);

  const meta = {
    id: connId,
    mapping: {
      name: mappingName,
      listenPort: mapping.listenPort,
      targetHost: mapping.targetHost,
      targetPort: mapping.targetPort
    },
    options: {
      logBinary: Boolean(logBinary),
      logBase64: Boolean(logBase64),
      logAscii: Boolean(logAscii),
      logSha256: Boolean(logSha256),
      splitLogs: Boolean(splitLogs),
      asciiPreviewLimit
    },
    startedAt: new Date().toISOString(),
    client: {
      address: clientSocket.remoteAddress,
      port: clientSocket.remotePort
    },
    server: {
      address: serverSocket.remoteAddress,
      port: serverSocket.remotePort
    }
  };

  fs.writeFileSync(path.join(connDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  const trafficStream = fs.createWriteStream(path.join(connDir, 'traffic.jsonl'), { flags: 'a' });
  const splitStreams = splitLogs
    ? {
        c2s: fs.createWriteStream(path.join(connDir, 'c2s.jsonl'), { flags: 'a' }),
        s2c: fs.createWriteStream(path.join(connDir, 's2c.jsonl'), { flags: 'a' })
      }
    : null;
  const binaryStreams = logBinary
    ? {
        c2s: fs.createWriteStream(path.join(connDir, 'c2s.bin'), { flags: 'a' }),
        s2c: fs.createWriteStream(path.join(connDir, 's2c.bin'), { flags: 'a' })
      }
    : null;
  const offsets = { c2s: 0, s2c: 0 };

  function nextSeq() {
    seq += 1;
    return seq;
  }

  const parserByDir = {
    c2s: new RbkParser({ maxBodyLength: throttle.maxBodyLength }),
    s2c: new RbkParser({ maxBodyLength: throttle.maxBodyLength })
  };
  const apiCounts = new Map();
  const throttledNotified = new Set();
  const throttleDirections = new Set(throttle.directions);

  function parseApiNos(direction, buffer) {
    const parser = parserByDir[direction];
    if (!parser) {
      return [];
    }
    try {
      const messages = parser.push(buffer);
      return messages.map((msg) => msg.apiNo).filter((apiNo) => Number.isFinite(apiNo));
    } catch (err) {
      return [];
    }
  }

  function shouldLog(direction, buffer) {
    if (!throttle.enabled || !throttleDirections.has(direction)) {
      return { log: true, apiNos: [] };
    }
    const apiNos = parseApiNos(direction, buffer);
    if (apiNos.length === 0) {
      return { log: true, apiNos: [] };
    }
    const overLimit = apiNos.every((apiNo) => {
      if (throttle.excludeApis.has(apiNo)) {
        return false;
      }
      return (apiCounts.get(apiNo) || 0) >= throttle.maxPerApi;
    });
    if (overLimit) {
      if (throttle.logSuppressed) {
        for (const apiNo of apiNos) {
          if (throttle.excludeApis.has(apiNo)) {
            continue;
          }
          if (throttledNotified.has(apiNo)) {
            continue;
          }
          throttledNotified.add(apiNo);
          logInfo(`throttle: api ${apiNo} reached limit ${throttle.maxPerApi}`);
        }
      }
      return { log: false, apiNos };
    }
    return { log: true, apiNos };
  }

  function logEvent(direction, buffer) {
    const now = Date.now();
    const decision = shouldLog(direction, buffer);
    if (!decision.log) {
      return;
    }
    const entry = {
      seq: nextSeq(),
      ts: new Date(now).toISOString(),
      t_rel_ms: now - startedAtMs,
      dir: direction,
      len: buffer.length
    };
    if (decision.apiNos && decision.apiNos.length > 0) {
      entry.api_nos = decision.apiNos;
    }
    if (logBinary && binaryStreams && (direction === 'c2s' || direction === 's2c')) {
      entry.offset = offsets[direction];
      offsets[direction] += buffer.length;
      binaryStreams[direction].write(buffer);
    }
    if (logBase64) {
      entry.base64 = buffer.toString('base64');
    }
    if (logAscii) {
      entry.ascii = asciiPreview(buffer, asciiPreviewLimit);
    }
    if (logSha256) {
      entry.sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    }
    trafficStream.write(`${JSON.stringify(entry)}\n`);
    if (splitStreams && (direction === 'c2s' || direction === 's2c')) {
      splitStreams[direction].write(`${JSON.stringify(entry)}\n`);
    }
    if (decision.apiNos && decision.apiNos.length > 0) {
      for (const apiNo of decision.apiNos) {
        if (throttle.excludeApis.has(apiNo)) {
          continue;
        }
        apiCounts.set(apiNo, (apiCounts.get(apiNo) || 0) + 1);
      }
    }
  }

  function logInfo(message) {
    const now = Date.now();
    const entry = {
      seq: nextSeq(),
      ts: new Date(now).toISOString(),
      t_rel_ms: now - startedAtMs,
      dir: 'info',
      message
    };
    trafficStream.write(`${JSON.stringify(entry)}\n`);
  }

  function close() {
    trafficStream.end();
    if (splitStreams) {
      splitStreams.c2s.end();
      splitStreams.s2c.end();
    }
    if (binaryStreams) {
      binaryStreams.c2s.end();
      binaryStreams.s2c.end();
    }
  }

  return { logEvent, logInfo, close, connDir };
}

function startProxy(mapping, config) {
  const server = net.createServer((clientSocket) => {
    const targetSocket = net.connect(mapping.targetPort, mapping.targetHost);
    const logger = createLogger(config.logDir, mapping, clientSocket, targetSocket, {
      asciiPreviewLimit: config.asciiPreviewLimit,
      logBinary: config.logBinary,
      logBase64: config.logBase64,
      logAscii: config.logAscii,
      logSha256: config.logSha256,
      splitLogs: config.splitLogs,
      throttle: config.throttle
    });

    logger.logInfo('connection_open');

    clientSocket.on('data', (chunk) => {
      logger.logEvent('c2s', chunk);
      if (!targetSocket.destroyed) {
        targetSocket.write(chunk);
      }
    });

    targetSocket.on('data', (chunk) => {
      logger.logEvent('s2c', chunk);
      if (!clientSocket.destroyed) {
        clientSocket.write(chunk);
      }
    });

    const shutdown = (reason) => {
      logger.logInfo(reason);
      if (!clientSocket.destroyed) {
        clientSocket.destroy();
      }
      if (!targetSocket.destroyed) {
        targetSocket.destroy();
      }
      logger.close();
    };

    clientSocket.on('error', () => shutdown('client_error'));
    targetSocket.on('error', () => shutdown('server_error'));
    clientSocket.on('end', () => shutdown('client_end'));
    targetSocket.on('end', () => shutdown('server_end'));
  });

  server.on('error', (err) => {
    console.error(`[proxy:${mapping.listenPort}] error: ${err.message}`);
  });

  server.listen(mapping.listenPort, config.bindHost, () => {
    console.log(`[proxy:${mapping.listenPort}] ${config.bindHost}:${mapping.listenPort} -> ${mapping.targetHost}:${mapping.targetPort}`);
  });
}

function loadConfig() {
  const config = readJson5(CONFIG_PATH);
  if (!config.mappings || !Array.isArray(config.mappings) || config.mappings.length === 0) {
    throw new Error('config.mappings must be a non-empty array');
  }
  const baseDir = path.resolve(path.dirname(CONFIG_PATH), config.logDir || './logs');
  ensureDir(baseDir);
  return {
    bindHost: config.bindHost || '0.0.0.0',
    asciiPreviewLimit: Number.isFinite(config.asciiPreviewLimit) ? config.asciiPreviewLimit : 160,
    logBinary: config.logBinary !== false,
    logBase64: config.logBase64 !== false,
    logAscii: config.logAscii !== false,
    logSha256: config.logSha256 === true,
    splitLogs: config.splitLogs === true,
    logDir: baseDir,
    throttle: {
      enabled: Boolean(config.throttle && config.throttle.enabled),
      maxPerApi: Number.parseInt((config.throttle && config.throttle.maxPerApi) || 100, 10),
      logSuppressed: config.throttle ? config.throttle.logSuppressed !== false : true,
      directions: Array.isArray(config.throttle && config.throttle.directions)
        ? config.throttle.directions
        : ['c2s'],
      excludeApis: new Set(
        Array.isArray(config.throttle && config.throttle.excludeApis) ? config.throttle.excludeApis : []
      ),
      maxBodyLength: Number.parseInt((config.throttle && config.throttle.maxBodyLength) || 1048576, 10)
    },
    mappings: config.mappings.map((mapping) => ({
      name: mapping.name,
      listenPort: Number.parseInt(mapping.listenPort, 10),
      targetHost: mapping.targetHost,
      targetPort: Number.parseInt(mapping.targetPort, 10)
    }))
  };
}

const config = loadConfig();

for (const mapping of config.mappings) {
  if (!mapping.listenPort || !mapping.targetHost || !mapping.targetPort) {
    throw new Error(`invalid mapping: ${JSON.stringify(mapping)}`);
  }
  startProxy(mapping, config);
}

console.log(`robokit-proxy using config: ${CONFIG_PATH}`);
