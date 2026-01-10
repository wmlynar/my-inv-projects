const assert = require('assert');

const { ControlArbiter } = require('../core/control_arbiter');

function createRobot() {
  return {
    lockInfo: {
      locked: false,
      nick_name: '',
      ip: '',
      port: 0,
      time_t: 0,
      type: 2,
      desc: ''
    },
    lockRequest: null
  };
}

function run() {
  let now = 1000;
  const robot = createRobot();
  const arbiter = new ControlArbiter({
    robot,
    lockTtlMs: 10,
    now: () => now
  });

  let result = arbiter.acquire('client-a', { nick_name: 'a', ip: '1.1.1.1', port: 111 });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(arbiter.getOwner(), 'client-a');
  assert.strictEqual(robot.lockInfo.nick_name, 'a');

  result = arbiter.acquire('client-b', { nick_name: 'b', ip: '2.2.2.2', port: 222 });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.preempted, true);
  assert.strictEqual(arbiter.getOwner(), 'client-b');
  assert.strictEqual(robot.lockInfo.nick_name, 'b');

  result = arbiter.release('client-a');
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error, 'control_locked');
  assert.strictEqual(arbiter.getOwner(), 'client-b');

  result = arbiter.release('client-b');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.released, true);
  assert.strictEqual(arbiter.getOwner(), null);

  result = arbiter.acquire('client-c', { nick_name: 'c', ip: '3.3.3.3', port: 333 });
  assert.strictEqual(result.ok, true);
  now += 20;
  arbiter.releaseIfExpired();
  assert.strictEqual(arbiter.getOwner(), null);
}

run();
console.log('control_arbiter.test ok');
