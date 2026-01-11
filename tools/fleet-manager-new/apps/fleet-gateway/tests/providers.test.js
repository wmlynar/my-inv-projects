const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { createProviderForRobot, InternalSimProvider, SimDirectProvider, RobokitProvider } = require('../lib/providers');

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function readJson(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      resolve(text ? JSON.parse(text) : null);
    });
  });
}

test('providerFactory_selects_internalSim', () => {
  const provider = createProviderForRobot(
    { robotId: 'RB-01' },
    { providers: { internalSim: { enabled: true } } }
  );
  assert.equal(provider.kind, 'internalSim');
});

test('providerFactory_selects_robokitSim', () => {
  const provider = createProviderForRobot(
    { robotId: 'RB-01' },
    {
      defaultProvider: 'robokitSim',
      providers: {
        robokitSim: {
          enabled: true,
          robots: { 'RB-01': { host: '127.0.0.1', ports: { task: 1, ctrl: 2, other: 3, state: 4 } } }
        }
      }
    },
    { robokitClientFactory: () => ({ request: async () => ({}), taskPort: 1, ctrlPort: 2, otherPort: 3, statePort: 4 }) }
  );
  assert.equal(provider.kind, 'robokitSim');
});

test('providerFactory_unknown_provider_errors', () => {
  assert.throws(() => {
    createProviderForRobot(
      { robotId: 'RB-01', provider: 'xyz' },
      { providers: {} }
    );
  }, (err) => err && err.code === 'unknown_provider');
});

test('internalSim.sendCommand_goTarget_posts_http', async () => {
  let received = null;
  const { server, baseUrl } = await startServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/sim/robots/RB-01/command') {
      received = await readJson(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const provider = new InternalSimProvider({
    robotId: 'RB-01',
    config: {
      baseUrl,
      commandPathTemplate: '/sim/robots/:robotId/command',
      commandEnvelope: 'raw'
    }
  });

  const result = await provider.sendCommand({
    type: 'goTarget',
    payload: { targetRef: { nodeId: 'AP1' } }
  }, Date.now());

  server.close();
  assert.equal(result.ok, true);
  assert.equal(received.payload.targetRef.nodeId, 'AP1');
});

test('internalSim.sendCommand_forkHeight_posts_http', async () => {
  let received = null;
  const { server, baseUrl } = await startServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/sim/robots/RB-01/command') {
      received = await readJson(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const provider = new InternalSimProvider({
    robotId: 'RB-01',
    config: {
      baseUrl,
      commandPathTemplate: '/sim/robots/:robotId/command',
      commandEnvelope: 'raw'
    }
  });

  const result = await provider.sendCommand({
    type: 'forkHeight',
    payload: { toHeightM: 1.2 }
  }, Date.now());

  server.close();
  assert.equal(result.ok, true);
  assert.equal(received.payload.toHeightM, 1.2);
});

test('internalSim.status_maps_to_normalized', async () => {
  const { server, baseUrl } = await startServer((req, res) => {
    if (req.method === 'GET' && req.url === '/sim/state') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ robots: [{ id: 'RB-01', nodeId: 'AP1', forkHeightM: 1.2 }] }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const provider = new InternalSimProvider({
    robotId: 'RB-01',
    config: {
      baseUrl,
      statusPath: '/sim/state'
    }
  });

  const status = await provider.getStatus({ nowMs: Date.now() });
  server.close();
  assert.equal(status.normalized.nodeId, 'AP1');
});

test('simDirect.sendCommand_goTarget_maps_to_api', async () => {
  let received = null;
  const { server, baseUrl } = await startServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/sim/targets') {
      received = await readJson(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const provider = new SimDirectProvider({
    robotId: 'RB-01',
    config: { baseUrl }
  });

  const result = await provider.sendCommand({
    type: 'goTarget',
    payload: { targetRef: { nodeId: 'AP1' } }
  }, Date.now());

  server.close();
  assert.equal(result.ok, true);
  assert.equal(received.nodeId, 'AP1');
});

test('simDirect.sendCommand_forkHeight_maps_to_api', async () => {
  let received = null;
  const { server, baseUrl } = await startServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/sim/fork') {
      received = await readJson(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const provider = new SimDirectProvider({
    robotId: 'RB-01',
    config: { baseUrl }
  });

  const result = await provider.sendCommand({
    type: 'forkHeight',
    payload: { toHeightM: 1.2 }
  }, Date.now());

  server.close();
  assert.equal(result.ok, true);
  assert.equal(received.height, 1.2);
});

test('robokit.timeout_fails_command', async () => {
  const client = {
    request: async () => {
      const err = new Error('rbk_timeout');
      err.code = 'rbk_timeout';
      throw err;
    },
    taskPort: 1,
    ctrlPort: 2,
    otherPort: 3,
    statePort: 4
  };

  const provider = new RobokitProvider({
    kind: 'robokitSim',
    robotId: 'RB-01',
    config: { ports: { task: 1, ctrl: 2, other: 3, state: 4 } },
    clientFactory: () => client
  });

  const result = await provider.sendCommand({
    type: 'goTarget',
    payload: { targetRef: { nodeId: 'AP1' } }
  }, Date.now());

  assert.equal(result.ok, false);
  assert.equal(result.statusReasonCode, 'TIMEOUT');
});

test('robocore.reconnects_after_drop', async () => {
  let connectCalls = 0;
  const socket = new EventEmitter();
  const client = new EventEmitter();
  client.connectPush = () => {
    connectCalls += 1;
    return socket;
  };
  client.disconnectPush = () => {};

  const provider = new RobokitProvider({
    kind: 'robocore',
    robotId: 'RB-01',
    config: {
      reconnect: { enabled: true, baseDelayMs: 5, maxDelayMs: 20, backoffFactor: 1 }
    },
    clientFactory: () => client
  });

  await provider.connect();
  assert.equal(connectCalls, 1);

  socket.emit('close');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(connectCalls >= 2);
});

test('robocore.reports_connection_status', async () => {
  const client = {
    request: async () => ({}),
    taskPort: 1,
    ctrlPort: 2,
    otherPort: 3,
    statePort: 4
  };
  const provider = new RobokitProvider({
    kind: 'robocore',
    robotId: 'RB-01',
    config: { telemetryTimeoutMs: 5, statusPoll: false },
    clientFactory: () => client
  });

  provider.connectionStatus = 'online';
  provider.lastSeenTsMs = 0;
  const status = await provider.getStatus({ nowMs: 10, refresh: false });
  assert.equal(status.connectionStatus, 'offline');
});
