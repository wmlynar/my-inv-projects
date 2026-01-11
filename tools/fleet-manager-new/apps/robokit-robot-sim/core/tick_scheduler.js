function createTickScheduler(options = {}) {
  const {
    tickMs,
    mode = 'real',
    onTick,
    onError,
    logger
  } = options;
  if (typeof onTick !== 'function') {
    throw new Error('tick_scheduler: onTick must be a function');
  }
  const log = typeof logger === 'function' ? logger : null;
  let timer = null;
  let paused = false;
  let tickId = 0;

  function runTick() {
    try {
      onTick();
      tickId += 1;
    } catch (err) {
      if (onError) {
        onError(err);
      } else {
        throw err;
      }
    }
  }

  function start() {
    if (timer || mode === 'replay') {
      return;
    }
    timer = setInterval(() => {
      if (!paused) {
        runTick();
      }
    }, tickMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function pause() {
    paused = true;
    if (log) {
      log('tick_paused', { tickId });
    }
  }

  function resume() {
    paused = false;
    if (log) {
      log('tick_resumed', { tickId });
    }
  }

  function step(count = 1) {
    const total = Math.max(1, Number(count) || 1);
    for (let i = 0; i < total; i += 1) {
      runTick();
    }
    if (log) {
      log('tick_step', { tickId, count: total });
    }
  }

  function isPaused() {
    return paused;
  }

  function getTickId() {
    return tickId;
  }

  return {
    start,
    stop,
    pause,
    resume,
    step,
    isPaused,
    getTickId
  };
}

module.exports = {
  createTickScheduler
};
