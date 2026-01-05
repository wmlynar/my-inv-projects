"use strict";

const toTimeMs = (value, label = "time") => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${label}_not_finite`);
  }
  return Math.round(num);
};

const makeInterval = (start, end) => {
  const s = toTimeMs(start, "start");
  const e = toTimeMs(end, "end");
  return s <= e ? { start: s, end: e } : { start: e, end: s };
};

const interval = (start, end) => {
  const s = toTimeMs(start, "start");
  const e = toTimeMs(end, "end");
  if (e < s) {
    throw new Error("interval_invalid");
  }
  return { start: s, end: e };
};

const duration = (range) => {
  if (!range) return 0;
  return toTimeMs(range.end, "end") - toTimeMs(range.start, "start");
};

const contains = (range, time) => {
  if (!range) return false;
  const t = toTimeMs(time, "time");
  return range.start <= t && t < range.end;
};

const overlaps = (a, b) => {
  if (!a || !b) return false;
  return a.start < b.end && b.start < a.end;
};

const mergeIntervals = (a, b) => {
  if (!a || !b) return null;
  if (!overlaps(a, b)) return null;
  return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) };
};

const shift = (range, deltaMs) => {
  if (!range) return null;
  const delta = toTimeMs(deltaMs, "delta");
  return { start: range.start + delta, end: range.end + delta };
};

const clamp = (range, min, max) => {
  if (!range) return null;
  const minMs = toTimeMs(min, "min");
  const maxMs = toTimeMs(max, "max");
  const start = Math.max(range.start, minMs);
  const end = Math.min(range.end, maxMs);
  return interval(start, Math.max(start, end));
};

class ManualClock {
  constructor(startMs = 0) {
    this._now = toTimeMs(startMs, "start");
  }

  now() {
    return this._now;
  }

  advance(deltaMs) {
    this._now += toTimeMs(deltaMs, "delta");
    return this._now;
  }

  set(timeMs) {
    this._now = toTimeMs(timeMs, "time");
    return this._now;
  }
}

class RealClock {
  now() {
    return Date.now();
  }
}

module.exports = {
  toTimeMs,
  makeInterval,
  interval,
  duration,
  contains,
  overlaps,
  mergeIntervals,
  shift,
  clamp,
  ManualClock,
  RealClock
};
