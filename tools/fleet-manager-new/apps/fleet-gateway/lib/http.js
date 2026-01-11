const http = require('http');
const https = require('https');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRequestOptions(url, method, headers) {
  return {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    path: `${url.pathname}${url.search || ''}`,
    method,
    headers
  };
}

function requestJson(urlInput, options = {}) {
  const url = urlInput instanceof URL ? urlInput : new URL(urlInput);
  const {
    method = 'GET',
    payload = null,
    timeoutMs = 1200,
    retries = 0,
    retryDelayMs = 100,
    retryBackoffFactor = 2,
    retryStatuses = [502, 503, 504]
  } = options;

  const body = payload == null ? null : JSON.stringify(payload);
  const headers = {
    'Accept': 'application/json'
  };
  if (body != null) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  async function attemptRequest(attempt) {
    const result = await new Promise((resolve, reject) => {
      const transport = url.protocol === 'https:' ? https : http;
      const req = transport.request(buildRequestOptions(url, method, headers), (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          if (text) {
            try {
              json = JSON.parse(text);
            } catch (_err) {
              json = null;
            }
          }
          resolve({
            status: res.statusCode || 0,
            ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
            headers: res.headers || {},
            text,
            json
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy(Object.assign(new Error('timeout'), { code: 'timeout' }));
      });

      if (body != null) {
        req.write(body);
      }
      req.end();
    });

    if (retryStatuses.includes(result.status) && attempt < retries) {
      const backoff = Math.min(retryDelayMs * Math.pow(retryBackoffFactor, attempt), 5000);
      await delay(backoff);
      return attemptRequest(attempt + 1);
    }

    return result;
  }

  return attemptRequest(0);
}

function getJson(urlInput, options = {}) {
  return requestJson(urlInput, { ...options, method: 'GET' });
}

function postJson(urlInput, payload, options = {}) {
  return requestJson(urlInput, { ...options, method: 'POST', payload });
}

module.exports = {
  requestJson,
  getJson,
  postJson
};
