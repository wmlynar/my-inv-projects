const http = require('http');

class RdsHttpClient {
  constructor({
    host = '127.0.0.1',
    port = 8088,
    timeoutMs = 5000,
    maxBodyLength = 10 * 1024 * 1024
  } = {}) {
    this.host = host;
    this.port = port;
    this.timeoutMs = timeoutMs;
    this.maxBodyLength = maxBodyLength;
  }

  request({ method, path, headers = {}, body = null, responseType = 'json' }) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: this.host,
          port: this.port,
          method,
          path,
          headers,
          timeout: this.timeoutMs
        },
        (res) => {
          const chunks = [];
          let total = 0;
          res.on('data', (chunk) => {
            total += chunk.length;
            if (total > this.maxBodyLength) {
              res.destroy();
              reject(new Error('response too large'));
              return;
            }
            chunks.push(chunk);
          });
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if (responseType === 'buffer') {
              resolve({ statusCode: res.statusCode, headers: res.headers, body: buffer });
              return;
            }
            const text = buffer.toString('utf8');
            if (responseType === 'text') {
              resolve({ statusCode: res.statusCode, headers: res.headers, body: text });
              return;
            }
            if (!text) {
              resolve({ statusCode: res.statusCode, headers: res.headers, body: null });
              return;
            }
            try {
              resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(text) });
            } catch (err) {
              reject(err);
            }
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('request timeout'));
      });
      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  getProfiles(file = 'properties.json') {
    const payload = JSON.stringify({ file });
    return this.request({
      method: 'POST',
      path: '/getProfiles',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload)
      },
      body: payload,
      responseType: 'json'
    });
  }

  getRobotsStatus(devices = ['lifts', 'doors', 'terminals', 'windshowers']) {
    const query = encodeURIComponent(devices.join(','));
    return this.request({
      method: 'GET',
      path: `/robotsStatus?devices=${query}`,
      responseType: 'json'
    });
  }

  getCoreParam(payload = { param: '', plugin: '' }) {
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload), 'utf8');
    return this.request({
      method: 'POST',
      path: '/getCoreParam',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length
      },
      body,
      responseType: 'json'
    });
  }

  saveCoreParam(payload = {}) {
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload), 'utf8');
    return this.request({
      method: 'POST',
      path: '/saveCoreParam',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length
      },
      body,
      responseType: 'text'
    });
  }

  setOrder(payload = {}) {
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload), 'utf8');
    return this.request({
      method: 'POST',
      path: '/setOrder',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length
      },
      body,
      responseType: 'json'
    });
  }

  downloadScene() {
    return this.request({
      method: 'GET',
      path: '/downloadScene',
      responseType: 'buffer'
    });
  }

  uploadScene(zipBuffer) {
    if (!Buffer.isBuffer(zipBuffer)) {
      throw new Error('uploadScene expects a Buffer');
    }
    return this.request({
      method: 'POST',
      path: '/uploadScene',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': zipBuffer.length
      },
      body: zipBuffer,
      responseType: 'json'
    });
  }
}

module.exports = {
  RdsHttpClient
};
