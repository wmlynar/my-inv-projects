const http = require('http');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const RETRY_STATUS = [502, 503, 504];
const RETRY_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN'
]);

function sendJson(url, payload, timeoutMs = 1200, extraHeaders = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(data)
    };
    if (extraHeaders) {
      Object.assign(headers, extraHeaders);
    }
    const req = http.request(
      url,
      {
        method: 'POST',
        agent: httpAgent,
        headers,
        timeout: timeoutMs
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode || 0, body: text });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
    });
    req.write(data);
    req.end();
  });
}

function createGatewayClient(config = {}) {
  const baseUrl = config.baseUrl || 'http://127.0.0.1:8081';
  const timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 1200;
  const retries = Number.isFinite(config.retries) ? config.retries : 2;
  const retryDelayMs = Number.isFinite(config.retryDelayMs) ? config.retryDelayMs : 100;
  const retryBackoff = Number.isFinite(config.retryBackoffFactor) ? config.retryBackoffFactor : 2;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function sendCommand(command, options = {}) {
    if (!command || !command.robotId) {
      throw new Error('command.robotId required');
    }
    const url = new URL(`/gateway/v1/robots/${command.robotId}/commands`, baseUrl);
    const payload = { command };
    const requestId = options.requestId;
    const headers = requestId ? { 'X-Request-Id': requestId } : null;
    let attempt = 0;
    while (true) {
      try {
        const result = await sendJson(url, payload, timeoutMs, headers);
        if (RETRY_STATUS.includes(result.status) && attempt < retries) {
          const backoff = Math.min(retryDelayMs * Math.pow(retryBackoff, attempt), 5000);
          await delay(backoff);
          attempt += 1;
          continue;
        }
        return result;
      } catch (err) {
        const code = err?.code;
        if (RETRY_ERROR_CODES.has(code) && attempt < retries) {
          const backoff = Math.min(retryDelayMs * Math.pow(retryBackoff, attempt), 5000);
          await delay(backoff);
          attempt += 1;
          continue;
        }
        throw err;
      }
    }
  }

  return {
    sendCommand
  };
}

module.exports = {
  createGatewayClient
};
