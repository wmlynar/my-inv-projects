const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { RobokitClient } = require('../robokit_client');
const { API, encodeFrame, responseApi, RbkParser } = require('../rbk');

const startServer = () => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
};

test('RobokitClient.goTarget sends proper task API payload', async () => {
  const { server, port } = await startServer();
  const received = [];

  server.on('connection', (socket) => {
    const parser = new RbkParser();
    socket.on('data', (chunk) => {
      const messages = parser.push(chunk);
      messages.forEach((msg) => {
        received.push(msg);
        const reply = encodeFrame(msg.seq, responseApi(msg.apiNo), { ok: true });
        socket.write(reply);
      });
    });
  });

  const client = new RobokitClient({ host: '127.0.0.1', taskPort: port });
  await client.goTarget('LM1');

  server.close();
  assert.equal(received.length, 1);
  assert.equal(received[0].apiNo, API.robot_task_gotarget_req);
  assert.deepEqual(received[0].payload, { id: 'LM1' });
});

test('RobokitClient.connectPush receives push payload', async () => {
  const { server, port } = await startServer();
  const parser = new RbkParser();

  server.on('connection', (socket) => {
    socket.on('data', (chunk) => {
      const messages = parser.push(chunk);
      messages.forEach((msg) => {
        if (msg.apiNo === API.robot_push_config_req) {
          const reply = encodeFrame(msg.seq, responseApi(msg.apiNo), { ok: true });
          socket.write(reply);
          const pushFrame = encodeFrame(1, API.robot_push, { battery: 50 });
          socket.write(pushFrame);
        }
      });
    });
  });

  const client = new RobokitClient({
    host: '127.0.0.1',
    pushPort: port,
    pushReconnect: false
  });

  const payload = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('push timeout')), 1000);
    client.once('push', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
    client.connectPush({ intervalMs: 200 });
  });

  client.disconnectPush();
  server.close();
  assert.deepEqual(payload, { battery: 50 });
});
