"use strict";

const { interval, duration, toTimeMs } = require("@fleet-manager/core-time");
const legacyScheduler = require("./legacy_scheduler");
const { CriticalSectionTable } = require("./critical_sections");
const {
  resolveRobustnessProfile,
  applyReservationProfile,
  ROBUSTNESS_PROFILES
} = require("./robustness_profile");

const defaultSpeedMps = 1.0;

const buildSchedule = (route, options = {}) => {
  const segments = route?.segments || [];
  const timingModel = options.timingModel || null;
  const safetyMs = toTimeMs(options.safetyMs ?? 0, "safetyMs");
  const dwellMs = toTimeMs(options.dwellMs ?? 0, "dwellMs");
  const turnTimeMs = toTimeMs(options.turnTimeMs ?? 0, "turnTimeMs");
  const startTime = toTimeMs(options.startTimeMs ?? 0, "startTimeMs");

  let cursor = startTime;
  const schedule = [];
  segments.forEach((segment) => {
    const length = Number(segment.length) || 0;
    const speed = Number(segment.speedMps) || defaultSpeedMps;
    const travelMs = Number.isFinite(segment.travelMs)
      ? toTimeMs(segment.travelMs, "travelMs")
      : Math.max(1, Math.round((length / Math.max(speed, 0.01)) * 1000));
    const slackMs = timingModel ? timingModel.getSlack(segment.id) : 0;
    const turnMs = Number.isFinite(segment.turnMs) ? toTimeMs(segment.turnMs, "turnMs") : turnTimeMs;

    cursor += turnMs;
    const slotStart = cursor;
    const slotEnd = slotStart + travelMs + slackMs + safetyMs;
    schedule.push({
      segmentId: segment.id,
      startTime: slotStart,
      endTime: slotEnd,
      travelMs,
      slackMs,
      safetyMs,
      turnMs
    });
    cursor = slotEnd + dwellMs;
  });
  return schedule;
};

const repairSchedule = (schedule, table, resourceId, options = {}) => {
  const maxAttempts = Number.isFinite(options.maxAttempts)
    ? Math.max(1, Math.floor(options.maxAttempts))
    : 100;
  if (!table || typeof table.beginTransaction !== "function") {
    return { ok: false, error: "invalid_reservation_table" };
  }
  const resourceSelector =
    typeof resourceId === "function" ? resourceId : () => resourceId;
  const tx = table.beginTransaction();
  const repaired = [];
  let cursor = null;

  for (const entry of schedule) {
    const slotDuration = duration({ start: entry.startTime, end: entry.endTime });
    let start = entry.startTime;
    if (cursor !== null) {
      start = Math.max(start, cursor);
    }
    let attempt = interval(start, start + slotDuration);
    let attemptCount = 0;
    while (attemptCount < maxAttempts) {
      const key = resourceSelector(entry);
      if (!key) {
        tx.rollback();
        return { ok: false, error: "resource_missing" };
      }
      const reserved = tx.reserve(key, attempt, { segmentId: entry.segmentId });
      if (reserved.ok) {
        repaired.push({ ...entry, startTime: attempt.start, endTime: attempt.end });
        cursor = attempt.end;
        break;
      }
      const conflict = reserved.error?.conflict;
      const shiftTo = conflict?.range?.end ?? (attempt.start + slotDuration + 1);
      attempt = interval(shiftTo, shiftTo + slotDuration);
      attemptCount += 1;
    }
    if (attemptCount >= maxAttempts) {
      tx.rollback();
      return { ok: false, error: "repair_failed" };
    }
  }

  tx.commit();
  return { ok: true, schedule: repaired };
};

module.exports = {
  buildSchedule,
  repairSchedule,
  CriticalSectionTable,
  resolveRobustnessProfile,
  applyReservationProfile,
  ROBUSTNESS_PROFILES,
  ...legacyScheduler
};
