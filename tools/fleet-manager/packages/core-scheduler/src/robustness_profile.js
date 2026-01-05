'use strict';

const DEFAULT_ROBUSTNESS_PROFILE = 'balanced';
const ROBUSTNESS_PROFILES = {
  conservative: {
    name: 'conservative',
    horizonMs: 14000,
    stepMs: 250,
    safetyMs: 180,
    nodeDwellMs: 450,
    baseSlackMs: 220,
    scheduleSlackMinMs: 220,
    scheduleSlackMaxMs: 600,
    scheduleSlackEwmaAlpha: 0.25,
    scheduleSlackPercentile: 0.9,
    scheduleSlackSampleSize: 30,
    adaptiveScheduleSlack: true,
    turnTimeReservations: true,
    dynamicSlack: { enabled: true, k: 1.1, min: 220, max: 600 },
    timingModel: { enabled: true, ewmaAlpha: 0.2, p95Window: 60 },
    repair: {
      enabled: true,
      maxRetimingMs: 14000,
      maxHoldMs: 9000,
      failFastThresholdMs: 250
    },
    criticalSections: {
      enabled: true,
      mode: 'ORDERING',
      maxRobotsPerSection: 1,
      slackMultiplier: 1.4
    }
  },
  balanced: {
    name: 'balanced',
    horizonMs: 10000,
    stepMs: 200,
    safetyMs: 120,
    nodeDwellMs: 300,
    baseSlackMs: 120,
    scheduleSlackMinMs: 120,
    scheduleSlackMaxMs: 360,
    scheduleSlackEwmaAlpha: 0.3,
    scheduleSlackPercentile: 0.9,
    scheduleSlackSampleSize: 20,
    adaptiveScheduleSlack: true,
    turnTimeReservations: true,
    dynamicSlack: { enabled: true, k: 0.8, min: 120, max: 360 },
    timingModel: { enabled: true, ewmaAlpha: 0.2, p95Window: 40 },
    repair: {
      enabled: true,
      maxRetimingMs: 10000,
      maxHoldMs: 6000,
      failFastThresholdMs: 200
    },
    criticalSections: {
      enabled: true,
      mode: 'ORDERING',
      maxRobotsPerSection: 1,
      slackMultiplier: 1.2
    }
  },
  aggressive: {
    name: 'aggressive',
    horizonMs: 6000,
    stepMs: 150,
    safetyMs: 90,
    nodeDwellMs: 220,
    baseSlackMs: 60,
    scheduleSlackMinMs: 60,
    scheduleSlackMaxMs: 220,
    scheduleSlackEwmaAlpha: 0.35,
    scheduleSlackPercentile: 0.85,
    scheduleSlackSampleSize: 16,
    adaptiveScheduleSlack: true,
    turnTimeReservations: false,
    dynamicSlack: { enabled: true, k: 0.6, min: 60, max: 220 },
    timingModel: { enabled: true, ewmaAlpha: 0.3, p95Window: 25 },
    repair: {
      enabled: true,
      maxRetimingMs: 4000,
      maxHoldMs: 4000,
      failFastThresholdMs: 150
    },
    criticalSections: {
      enabled: true,
      mode: 'ORDERING',
      maxRobotsPerSection: 1,
      slackMultiplier: 1.0
    }
  }
};

const normalizeProfileName = (value) => {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  if (!key) return null;
  return ROBUSTNESS_PROFILES[key] ? key : null;
};

const isPlainObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (base, override) => {
  const seed = isPlainObject(base) ? base : {};
  const result = { ...seed };
  if (!isPlainObject(override)) return result;
  Object.keys(override).forEach((key) => {
    const next = override[key];
    if (isPlainObject(next)) {
      result[key] = deepMerge(seed[key], next);
      return;
    }
    if (next !== undefined) {
      result[key] = next;
    }
  });
  return result;
};

const normalizeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const resolveRobustnessProfile = (options = {}) => {
  const profileName =
    normalizeProfileName(
      options.robustnessProfile ||
        options.reservationProfile ||
        options.robustProfile ||
        options.profile ||
        options.robustness?.profile
    ) ||
    DEFAULT_ROBUSTNESS_PROFILE;
  const base = ROBUSTNESS_PROFILES[profileName] || ROBUSTNESS_PROFILES[DEFAULT_ROBUSTNESS_PROFILE];
  let resolved = deepMerge(base, options.robustness);

  const legacyHorizon = normalizeNumber(options.reservationHorizonMs);
  if (legacyHorizon != null) resolved.horizonMs = legacyHorizon;
  const legacyStep = normalizeNumber(options.reservationStepMs);
  if (legacyStep != null) resolved.stepMs = legacyStep;
  const legacySafety = normalizeNumber(options.reservationSafetyMs);
  if (legacySafety != null) resolved.safetyMs = legacySafety;
  const legacyNodeDwell = normalizeNumber(options.reservationNodeDwellMs);
  if (legacyNodeDwell != null) resolved.nodeDwellMs = legacyNodeDwell;
  const legacySlack = normalizeNumber(options.scheduleSlackMs);
  if (legacySlack != null) resolved.baseSlackMs = legacySlack;
  const legacySlackMin = normalizeNumber(options.scheduleSlackMinMs);
  const legacySlackMax = normalizeNumber(options.scheduleSlackMaxMs);
  if (legacySlackMin != null || legacySlackMax != null) {
    const next = {};
    if (legacySlackMin != null) next.min = legacySlackMin;
    if (legacySlackMax != null) next.max = legacySlackMax;
    resolved = deepMerge(resolved, { dynamicSlack: next });
  }
  if (typeof options.adaptiveScheduleSlack === 'boolean') {
    resolved = deepMerge(resolved, { dynamicSlack: { enabled: options.adaptiveScheduleSlack } });
  }
  const legacyAlpha = normalizeNumber(options.scheduleSlackEwmaAlpha);
  if (legacyAlpha != null) {
    resolved = deepMerge(resolved, { timingModel: { ewmaAlpha: legacyAlpha } });
  }
  const legacyPercentile = normalizeNumber(options.scheduleSlackPercentile);
  if (legacyPercentile != null) {
    resolved = deepMerge(resolved, { timingModel: { percentile: legacyPercentile } });
  }
  const legacySamples = normalizeNumber(options.scheduleSlackSampleSize);
  if (legacySamples != null) {
    resolved = deepMerge(resolved, { timingModel: { p95Window: legacySamples } });
  }
  if (typeof options.scheduleRepair === 'boolean') {
    resolved = deepMerge(resolved, { repair: { enabled: options.scheduleRepair } });
  }
  if (isPlainObject(options.dynamicSlack)) {
    resolved = deepMerge(resolved, { dynamicSlack: options.dynamicSlack });
  }
  if (isPlainObject(options.timingModel)) {
    resolved = deepMerge(resolved, { timingModel: options.timingModel });
  }
  if (isPlainObject(options.criticalSections)) {
    resolved = deepMerge(resolved, { criticalSections: options.criticalSections });
  }

  resolved.name = profileName;
  return resolved;
};

const applyReservationProfile = (options = {}) => {
  if (!options || typeof options !== 'object') return options;
  const profile = resolveRobustnessProfile(options);
  const merged = {
    ...options,
    reservationProfile: profile.name,
    robustnessProfile: profile.name,
    robustness: profile
  };
  if (!Number.isFinite(merged.reservationHorizonMs) && Number.isFinite(profile.horizonMs)) {
    merged.reservationHorizonMs = profile.horizonMs;
  }
  if (!Number.isFinite(merged.reservationStepMs) && Number.isFinite(profile.stepMs)) {
    merged.reservationStepMs = profile.stepMs;
  }
  if (!Number.isFinite(merged.reservationSafetyMs) && Number.isFinite(profile.safetyMs)) {
    merged.reservationSafetyMs = profile.safetyMs;
  }
  if (!Number.isFinite(merged.reservationNodeDwellMs) && Number.isFinite(profile.nodeDwellMs)) {
    merged.reservationNodeDwellMs = profile.nodeDwellMs;
  }
  if (!Number.isFinite(merged.scheduleSlackMs) && Number.isFinite(profile.baseSlackMs)) {
    merged.scheduleSlackMs = profile.baseSlackMs;
  }
  if (!Number.isFinite(merged.scheduleSlackMinMs) && Number.isFinite(profile.scheduleSlackMinMs)) {
    merged.scheduleSlackMinMs = profile.scheduleSlackMinMs;
  }
  if (!Number.isFinite(merged.scheduleSlackMaxMs) && Number.isFinite(profile.scheduleSlackMaxMs)) {
    merged.scheduleSlackMaxMs = profile.scheduleSlackMaxMs;
  }
  if (
    !Number.isFinite(merged.scheduleSlackEwmaAlpha) &&
    Number.isFinite(profile.scheduleSlackEwmaAlpha)
  ) {
    merged.scheduleSlackEwmaAlpha = profile.scheduleSlackEwmaAlpha;
  }
  if (
    !Number.isFinite(merged.scheduleSlackPercentile) &&
    Number.isFinite(profile.scheduleSlackPercentile)
  ) {
    merged.scheduleSlackPercentile = profile.scheduleSlackPercentile;
  }
  if (
    !Number.isFinite(merged.scheduleSlackSampleSize) &&
    Number.isFinite(profile.scheduleSlackSampleSize)
  ) {
    merged.scheduleSlackSampleSize = profile.scheduleSlackSampleSize;
  }
  if (typeof merged.adaptiveScheduleSlack !== 'boolean') {
    if (typeof profile.adaptiveScheduleSlack === 'boolean') {
      merged.adaptiveScheduleSlack = profile.adaptiveScheduleSlack;
    }
  }
  if (typeof merged.turnTimeReservations !== 'boolean') {
    if (typeof profile.turnTimeReservations === 'boolean') {
      merged.turnTimeReservations = profile.turnTimeReservations;
    }
  }
  if (typeof merged.scheduleRepair !== 'boolean' && typeof profile?.repair?.enabled === 'boolean') {
    merged.scheduleRepair = profile.repair.enabled;
  }
  return merged;
};

module.exports = {
  DEFAULT_ROBUSTNESS_PROFILE,
  ROBUSTNESS_PROFILES,
  resolveRobustnessProfile,
  applyReservationProfile
};
