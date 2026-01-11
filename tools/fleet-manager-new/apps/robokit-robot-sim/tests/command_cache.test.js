const assert = require('assert');

const { CommandCache } = require('../../../packages/robokit-protocol/protocol/command_cache');

function run() {
  let now = 1000;
  const cache = new CommandCache({
    ttlMs: 10,
    maxEntries: 2,
    now: () => now
  });

  cache.set('client', 3051, 'cmd-1', { ret_code: 0, ok: true });
  assert.deepStrictEqual(cache.get('client', 3051, 'cmd-1'), { ret_code: 0, ok: true });

  now += 20;
  assert.strictEqual(cache.get('client', 3051, 'cmd-1'), null);

  cache.set('client', 3051, 'cmd-2', { ret_code: 0 });
  cache.set('client', 3051, 'cmd-3', { ret_code: 0 });
  cache.set('client', 3051, 'cmd-4', { ret_code: 0 });
  assert.strictEqual(cache.entries.size <= 2, true);
}

run();
console.log('command_cache.test ok');
