const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGateway } = require('../lib/gateway');
const { startServer } = require('../server');
const { requestJson } = require('../lib/http');

function createStubProvider() {
  return {
    kind: 'internalSim',
    calls: 0,
    getSnapshot() {
      return { kind: 'internalSim', status: 'online', lastSeenTsMs: Date.now(), lastError: null };
    },
    async getStatus() {
      return { raw: { nodeId: 'AP1' }, normalized: { nodeId: 'AP1' } };
    },
    async sendCommand() {
      this.calls += 1;
      return { ok: true, robotAck: { status: 'received' } };
    }
  };
}

async function startGatewayServer() {
  const provider = createStubProvider();
  const gateway = createGateway(
    { server: { host: '127.0.0.1', port: 0 }, robots: [{ robotId: 'RB-01' }] },
    { createProvider: () => provider }
  );
  const server = startServer({ server: { host: '127.0.0.1', port: 0 } }, { gateway });
  await new Promise((resolve) => server.on('listening', resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}`, provider };
}

test('http.get_robots_returns_normalized', async () => {
  const { server, baseUrl } = await startGatewayServer();
  const response = await requestJson(`${baseUrl}/gateway/v1/robots`);
  server.close();
  assert.equal(response.status, 200);
  assert.equal(response.json.robots.length, 1);
  assert.equal(response.json.robots[0].normalized.nodeId, 'AP1');
});

test('http.get_robot_status_returns_404', async () => {
  const { server, baseUrl } = await startGatewayServer();
  const response = await requestJson(`${baseUrl}/gateway/v1/robots/NO/status`);
  server.close();
  assert.equal(response.status, 404);
});

test('http.post_commands_dedup', async () => {
  const { server, baseUrl, provider } = await startGatewayServer();
  const payload = {
    commandId: 'cmd_1',
    robotId: 'RB-01',
    type: 'stop'
  };
  const first = await requestJson(`${baseUrl}/gateway/v1/robots/RB-01/commands`, {
    method: 'POST',
    payload
  });
  const second = await requestJson(`${baseUrl}/gateway/v1/robots/RB-01/commands`, {
    method: 'POST',
    payload
  });
  server.close();
  assert.equal(provider.calls, 1);
  assert.deepEqual(first.json, second.json);
});
