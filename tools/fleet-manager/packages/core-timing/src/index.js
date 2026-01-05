"use strict";

const { toTimeMs } = require("@fleet-manager/core-time");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const computeQuantile = (samples, quantile) => {
  if (!Array.isArray(samples) || !samples.length) return null;
  const sorted = samples.slice().sort((a, b) => a - b);
  const q = Math.min(1, Math.max(0, Number.isFinite(quantile) ? quantile : 0.5));
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1))));
  return sorted[index];
};

class RollingStats {
  constructor(alpha = 0.3, maxSamples = 20) {
    this.alpha = clamp(alpha, 0.05, 0.95);
    this.maxSamples = Math.max(5, Math.floor(maxSamples));
    this.ewma = null;
    this.samples = [];
    this.lastUpdatedAt = null;
  }

  add(value, nowMs) {
    if (!Number.isFinite(value)) return;
    const next = Math.max(0, value);
    if (Number.isFinite(this.ewma)) {
      this.ewma += this.alpha * (next - this.ewma);
    } else {
      this.ewma = next;
    }
    this.samples.push(next);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    this.lastUpdatedAt = Number.isFinite(nowMs) ? nowMs : Date.now();
  }

  quantile(q) {
    return computeQuantile(this.samples, q);
  }

  p95() {
    return this.quantile(0.95);
  }
}

class TimingModel {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.baseSlackMs = toTimeMs(options.baseSlackMs ?? 120, "baseSlackMs");
    this.minSlackMs = toTimeMs(options.minSlackMs ?? 60, "minSlackMs");
    this.maxSlackMs = toTimeMs(options.maxSlackMs ?? 360, "maxSlackMs");
    const alphaOption = Number.isFinite(options.alpha)
      ? options.alpha
      : Number.isFinite(options.ewmaAlpha)
        ? options.ewmaAlpha
        : 0.3;
    const sampleOption = Number.isFinite(options.sampleSize)
      ? options.sampleSize
      : Number.isFinite(options.p95Window)
        ? options.p95Window
        : 20;
    this.alpha = alphaOption;
    this.percentile = Number.isFinite(options.percentile) ? options.percentile : 0.95;
    this.sampleSize = sampleOption;
    this.edgeStats = new Map();
    this.robotStats = new Map();
    this.robotEdgeStats = new Map();
    this.slipEdgeStats = new Map();
    this.slipRobotStats = new Map();
  }

  _ensureStats(map, key) {
    const id = String(key);
    if (!this.enabled || !id) return null;
    if (!map.has(id)) {
      map.set(id, new RollingStats(this.alpha, this.sampleSize));
    }
    return map.get(id);
  }

  _ensureRobotEdgeStats(robotId, edgeKey) {
    if (!this.enabled || !robotId || !edgeKey) return null;
    const robotKey = String(robotId);
    const edgeId = String(edgeKey);
    if (!this.robotEdgeStats.has(robotKey)) {
      this.robotEdgeStats.set(robotKey, new Map());
    }
    const bucket = this.robotEdgeStats.get(robotKey);
    if (!bucket.has(edgeId)) {
      bucket.set(edgeId, new RollingStats(this.alpha, this.sampleSize));
    }
    return bucket.get(edgeId);
  }

  observeTravel(edgeKey, robotId, travelMs, nowMs) {
    if (!this.enabled || !edgeKey) return;
    this._ensureStats(this.edgeStats, edgeKey)?.add(travelMs, nowMs);
    if (robotId) {
      this._ensureStats(this.robotStats, robotId)?.add(travelMs, nowMs);
      this._ensureRobotEdgeStats(robotId, edgeKey)?.add(travelMs, nowMs);
    }
  }

  observeSlip(edgeKey, robotId, slipMs, nowMs) {
    if (!this.enabled || !Number.isFinite(slipMs)) return;
    const next = Math.max(0, slipMs);
    if (edgeKey) {
      this._ensureStats(this.slipEdgeStats, edgeKey)?.add(next, nowMs);
    }
    if (robotId) {
      this._ensureStats(this.slipRobotStats, robotId)?.add(next, nowMs);
    }
  }

  record(segmentId, durationMs, robotId = null, nowMs = null) {
    this.observeTravel(segmentId, robotId, toTimeMs(durationMs, "durationMs"), nowMs);
    return this.getStats(segmentId);
  }

  getExpectedMs(edgeKey, robotId, baseMs = 0) {
    if (!this.enabled) return baseMs;
    const base = Number.isFinite(baseMs) ? baseMs : 0;
    const byEdge = edgeKey ? this.edgeStats.get(String(edgeKey)) : null;
    const byRobot = robotId ? this.robotStats.get(String(robotId)) : null;
    const byRobotEdge =
      robotId && edgeKey
        ? this.robotEdgeStats.get(String(robotId))?.get(String(edgeKey))
        : null;
    const candidates = [byRobotEdge?.ewma, byEdge?.ewma, byRobot?.ewma].filter(Number.isFinite);
    if (!candidates.length) return base;
    return Math.max(base, ...candidates);
  }

  getUncertaintyMs(edgeKey, robotId, expectedMs = 0) {
    if (!this.enabled) return 0;
    const expected = Number.isFinite(expectedMs) ? expectedMs : 0;
    const byEdge = edgeKey ? this.edgeStats.get(String(edgeKey)) : null;
    const byRobot = robotId ? this.robotStats.get(String(robotId)) : null;
    const byRobotEdge =
      robotId && edgeKey
        ? this.robotEdgeStats.get(String(robotId))?.get(String(edgeKey))
        : null;
    const p95 = [byRobotEdge?.p95(), byEdge?.p95(), byRobot?.p95()]
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0];
    return Number.isFinite(p95) ? Math.max(0, p95 - expected) : 0;
  }

  getSlipP95(edgeKey, robotId) {
    if (!this.enabled) return 0;
    const byEdge = edgeKey ? this.slipEdgeStats.get(String(edgeKey)) : null;
    const byRobot = robotId ? this.slipRobotStats.get(String(robotId)) : null;
    const p95 = [byEdge?.p95(), byRobot?.p95()].filter(Number.isFinite).sort((a, b) => b - a)[0];
    return Number.isFinite(p95) ? p95 : 0;
  }

  getSlack(segmentId, robotId = null) {
    const stats = segmentId ? this.edgeStats.get(String(segmentId)) : null;
    if (!stats || stats.ewma === null) {
      return this.baseSlackMs;
    }
    const expected = this.getExpectedMs(segmentId, robotId, stats.ewma);
    const uncertainty = this.getUncertaintyMs(segmentId, robotId, expected);
    const p95 = expected + uncertainty;
    const raw = Number.isFinite(p95) && p95 > 0 ? p95 * 0.3 : this.baseSlackMs;
    return Math.round(clamp(raw, this.minSlackMs, this.maxSlackMs));
  }

  getStats(segmentId) {
    const stats = segmentId ? this.edgeStats.get(String(segmentId)) : null;
    if (!stats) {
      return { ewma: null, p95: null, samples: [] };
    }
    return {
      ewma: stats.ewma,
      p95: stats.p95(),
      samples: stats.samples.slice()
    };
  }
}

module.exports = {
  computeQuantile,
  RollingStats,
  TimingModel
};
