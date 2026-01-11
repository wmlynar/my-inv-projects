const http = require('http');

function sendJson(url, payload, timeoutMs = 1200) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: timeoutMs
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.write(data);
    req.end();
  });
}

function createGatewayClient(config = {}) {
  const baseUrl = config.baseUrl || 'http://127.0.0.1:8081';
  const timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 1200;

  async function sendCommand(command) {
    if (!command || !command.robotId) {
      throw new Error('command.robotId required');
    }
    const url = new URL(`/gateway/v1/robots/${command.robotId}/commands`, baseUrl);
    const payload = { command };
    return sendJson(url, payload, timeoutMs);
  }

  return {
    sendCommand
  };
}

module.exports = {
  createGatewayClient
};
