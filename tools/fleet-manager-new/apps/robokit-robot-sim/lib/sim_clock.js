function createSimClock(options = {}) {
  const mode = String(options.mode || 'real').toLowerCase();
  const stepMs = Number.isFinite(options.stepMs) ? options.stepMs : 100;
  let nowMs = Number.isFinite(options.startMs) ? options.startMs : Date.now();

  function now() {
    if (mode === 'real') {
      return Date.now();
    }
    return nowMs;
  }

  function tick(deltaMs) {
    if (mode === 'real') {
      return now();
    }
    if (mode === 'replay') {
      return nowMs;
    }
    const step = Number.isFinite(deltaMs) ? deltaMs : stepMs;
    nowMs += step;
    return nowMs;
  }

  function setNow(value) {
    if (mode === 'real') {
      return;
    }
    if (Number.isFinite(value)) {
      nowMs = value;
    }
  }

  return {
    mode,
    now,
    tick,
    setNow
  };
}

module.exports = {
  createSimClock
};
