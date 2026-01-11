const assert = require('assert');

const { ClientRegistry } = require('../app/client_registry');

function createContext(ip, port) {
  return {
    remoteAddress: ip,
    remotePort: port,
    socket: {
      destroyed: false,
      destroy() {
        this.destroyed = true;
      }
    }
  };
}

function run() {
  let now = 1000;
  let expired = 0;
  const registry = new ClientRegistry({
    strategy: 'ip+nick',
    ttlMs: 0,
    idleMs: 10000,
    now: () => now,
    onSessionExpired: () => {
      expired += 1;
    }
  });

  const ctx1 = createContext('127.0.0.1', 5000);
  const ctx2 = createContext('127.0.0.1', 5001);
  registry.attach(ctx1);
  registry.attach(ctx2);
  assert.strictEqual(registry.sessions.size, 1);

  const migrated = registry.migrateByNick('127.0.0.1', 'roboshop');
  assert.ok(migrated);
  assert.strictEqual(migrated.id, '127.0.0.1:roboshop');
  assert.strictEqual(registry.sessions.size, 1);
  assert.strictEqual(ctx1.clientId, '127.0.0.1:roboshop');
  assert.strictEqual(ctx2.clientId, '127.0.0.1:roboshop');

  registry.detach(ctx1);
  registry.detach(ctx2);
  assert.strictEqual(registry.sessions.size, 0);
  assert.strictEqual(expired, 1);

  const ctx3 = createContext('10.0.0.5', 6000);
  const registryTtl = new ClientRegistry({
    strategy: 'ip',
    ttlMs: 5,
    idleMs: 0,
    now: () => now
  });
  registryTtl.attach(ctx3);
  registryTtl.detach(ctx3);
  assert.strictEqual(registryTtl.sessions.size, 1);
  now += 10;
  registryTtl.sweep();
  assert.strictEqual(registryTtl.sessions.size, 0);
}

run();
console.log('client_registry.test ok');
