const net = require('net');

const DEFAULT_OFFSETS = [0, 4, 5, 6, 7, 8, 10, 11];

function buildRobokitPorts(base) {
  return {
    ROBOD: base,
    STATE: base + 4,
    CTRL: base + 5,
    TASK: base + 6,
    CONFIG: base + 7,
    KERNEL: base + 8,
    OTHER: base + 10,
    PUSH: base + 11
  };
}

function listenOnce(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

async function probePorts(ports, host) {
  const servers = [];
  try {
    for (const port of ports) {
      servers.push(await listenOnce(port, host));
    }
    return servers;
  } catch (err) {
    for (const server of servers) {
      try {
        server.close();
      } catch (_) {
        // Best-effort cleanup.
      }
    }
    throw err;
  }
}

async function findFreeRobokitPorts(options = {}) {
  const {
    host = '127.0.0.1',
    min = 30000,
    max = 65000,
    attempts = 60,
    offsets = DEFAULT_OFFSETS
  } = options;
  const maxOffset = offsets.reduce((acc, value) => Math.max(acc, value), 0);
  const span = Math.max(1, max - min - maxOffset);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const base = min + Math.floor(Math.random() * span);
    const ports = offsets.map((offset) => base + offset);
    try {
      const servers = await probePorts(ports, host);
      await Promise.all(
        servers.map(
          (server) =>
            new Promise((resolve) => {
              server.close(resolve);
            })
        )
      );
      return { base, ports: buildRobokitPorts(base) };
    } catch (_err) {
      // Retry with a different range.
    }
  }
  throw new Error('unable to allocate free robokit port range');
}

module.exports = {
  buildRobokitPorts,
  findFreeRobokitPorts
};
