'use strict';

class CriticalSectionTable {
  constructor() {
    this.sections = new Map();
  }

  getReservations(sectionId) {
    return (this.sections.get(sectionId) || []).map((entry) => ({ ...entry }));
  }

  reserve(sectionId, robotId, startMs, endMs, capacity = 1) {
    if (!sectionId || !robotId) return { ok: false, holder: null };
    const start = Number.isFinite(startMs) ? startMs : 0;
    const end = Number.isFinite(endMs) ? endMs : start;
    const windowStart = Math.min(start, end);
    const windowEnd = Math.max(start, end);
    const entries = this.sections.get(sectionId) || [];
    let overlapCount = 0;
    let earliestEnd = null;
    let holder = null;
    for (const entry of entries) {
      if (!entry) continue;
      if (entry.robotId === robotId) continue;
      if (windowEnd <= entry.start || windowStart >= entry.end) continue;
      overlapCount += 1;
      if (earliestEnd == null || entry.end < earliestEnd) {
        earliestEnd = entry.end;
        holder = entry.robotId || null;
      }
      if (overlapCount >= capacity) {
        return { ok: false, holder, end: earliestEnd };
      }
    }
    entries.push({ robotId, start: windowStart, end: windowEnd });
    entries.sort((a, b) => a.start - b.start);
    this.sections.set(sectionId, entries);
    return { ok: true, holder: robotId };
  }

  releaseRobot(robotId) {
    if (!robotId) return;
    for (const [key, entries] of this.sections.entries()) {
      const next = entries.filter((entry) => entry.robotId !== robotId);
      if (next.length) {
        this.sections.set(key, next);
      } else {
        this.sections.delete(key);
      }
    }
  }

  prune(nowMs, horizonMs) {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const horizon = Number.isFinite(horizonMs) ? horizonMs : 0;
    for (const [key, entries] of this.sections.entries()) {
      const next = entries.filter((entry) => entry.end + horizon >= now);
      if (next.length) {
        this.sections.set(key, next);
      } else {
        this.sections.delete(key);
      }
    }
  }
}

module.exports = { CriticalSectionTable };
