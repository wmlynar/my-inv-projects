const { EventEmitter } = require('events');
const { RobokitClient } = require('./robokit_client');

class RobokitFleet extends EventEmitter {
  constructor() {
    super();
    this.robots = new Map();
  }

  addRobot(id, options) {
    const robotId = id || (options && (options.id || options.name));
    if (!robotId) {
      throw new Error('robot id required');
    }
    if (this.robots.has(robotId)) {
      return this.robots.get(robotId);
    }
    const client = new RobokitClient({ ...options, id: robotId });
    client.on('push', (payload, msg) => this.emit('push', robotId, payload, msg));
    client.on('push_config', (payload) => this.emit('push_config', robotId, payload));
    client.on('push_error', (err) => this.emit('push_error', robotId, err));
    client.on('push_close', () => this.emit('push_close', robotId));
    client.on('online', () => this.emit('online', robotId));
    client.on('offline', () => this.emit('offline', robotId));
    client.on('circuit_open', (err) => this.emit('circuit_open', robotId, err));
    client.on('circuit_closed', () => this.emit('circuit_closed', robotId));
    this.robots.set(robotId, client);
    return client;
  }

  removeRobot(id) {
    const client = this.robots.get(id);
    if (!client) {
      return false;
    }
    client.disconnectPush();
    this.robots.delete(id);
    return true;
  }

  getRobot(id) {
    return this.robots.get(id) || null;
  }

  listRobots() {
    return Array.from(this.robots.keys());
  }

  connectPushAll(options) {
    for (const client of this.robots.values()) {
      client.connectPush(options);
    }
  }

  disconnectPushAll() {
    for (const client of this.robots.values()) {
      client.disconnectPush();
    }
  }

  startHealthCheckAll() {
    for (const client of this.robots.values()) {
      client.startHealthCheck();
    }
  }

  stopHealthCheckAll() {
    for (const client of this.robots.values()) {
      client.stopHealthCheck();
    }
  }

  async requestAll(fnName, ...args) {
    const results = {};
    await Promise.all(
      Array.from(this.robots.entries()).map(async ([id, client]) => {
        if (typeof client[fnName] !== 'function') {
          results[id] = { error: 'method_not_found' };
          return;
        }
        try {
          results[id] = await client[fnName](...args);
        } catch (err) {
          results[id] = { error: err.message };
        }
      })
    );
    return results;
  }
}

module.exports = { RobokitFleet };
