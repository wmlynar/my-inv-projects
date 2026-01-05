"use strict";

const { interval, makeInterval, overlaps, duration } = require("@fleet-manager/core-time");
const { ok, err } = require("@fleet-manager/core-types");

const normalizeOwnerId = (value) => {
  if (value === null || value === undefined) return null;
  const id = String(value).trim();
  return id ? id : null;
};

const normalizeRangeInput = (range) => {
  if (!range || typeof range !== "object") return null;
  const start =
    range.start ??
    range.startMs ??
    range.from ??
    range.begin ??
    null;
  const end =
    range.end ??
    range.endMs ??
    range.to ??
    range.until ??
    null;
  if (start === null || end === null) return null;
  return makeInterval(start, end);
};

const normalizeReserveArgs = (rangeOrOwner, metaOrRange, maybeMeta) => {
  if (typeof rangeOrOwner === "string" || typeof rangeOrOwner === "number") {
    const ownerId = normalizeOwnerId(rangeOrOwner);
    const range = normalizeRangeInput(metaOrRange);
    const meta = maybeMeta && typeof maybeMeta === "object" ? { ...maybeMeta } : {};
    if (ownerId) meta.ownerId = ownerId;
    return { range, meta };
  }
  const range = normalizeRangeInput(rangeOrOwner);
  const meta = metaOrRange && typeof metaOrRange === "object" ? { ...metaOrRange } : {};
  return { range, meta };
};

const insertSorted = (list, reservation) => {
  const next = list.slice();
  const idx = next.findIndex((entry) => entry.range.start > reservation.range.start);
  if (idx === -1) {
    next.push(reservation);
  } else {
    next.splice(idx, 0, reservation);
  }
  return next;
};

const cloneEntry = (entry) => ({
  resourceId: entry.resourceId,
  ownerId: entry.ownerId ?? null,
  range: { ...entry.range },
  meta: entry.meta ? { ...entry.meta } : undefined
});

const sameRange = (a, b) => a.start === b.start && a.end === b.end;

const findOverlapMatch = (list, range, ownerId) => {
  for (const entry of list) {
    if (!overlaps(entry.range, range)) continue;
    if (ownerId && entry.ownerId === ownerId) {
      if (sameRange(entry.range, range)) {
        return { type: "idempotent", entry };
      }
      continue;
    }
    return { type: "conflict", entry };
  }
  return null;
};

class ReservationTable {
  constructor() {
    this._byResource = new Map();
  }

  list(resourceId) {
    const list = this._byResource.get(resourceId);
    return list ? list.map(cloneEntry) : [];
  }

  getSnapshot() {
    const snapshot = new Map();
    this._byResource.forEach((entries, resourceId) => {
      snapshot.set(
        resourceId,
        entries.map(cloneEntry)
      );
    });
    return snapshot;
  }

  reserve(resourceId, range, meta = {}) {
    const { range: normalized, meta: normalizedMeta } = normalizeReserveArgs(
      range,
      meta
    );
    if (!normalized) {
      return err("invalid_range");
    }
    const list = this._byResource.get(resourceId) || [];
    const ownerId = normalizeOwnerId(normalizedMeta?.ownerId);
    const match = findOverlapMatch(list, normalized, ownerId);
    if (match) {
      if (match.type === "idempotent") {
        return ok({ ...cloneEntry(match.entry), idempotent: true });
      }
      return err({ conflict: cloneEntry(match.entry), resourceId, range: normalized });
    }
    const entry = {
      resourceId,
      ownerId,
      range: normalized,
      meta: normalizedMeta && typeof normalizedMeta === "object" ? { ...normalizedMeta } : undefined
    };
    this._byResource.set(resourceId, insertSorted(list, entry));
    return ok(entry);
  }

  forceReserve(resourceId, range, meta = {}) {
    const { range: normalized, meta: normalizedMeta } = normalizeReserveArgs(
      range,
      meta
    );
    if (!normalized) {
      return err("invalid_range");
    }
    const list = this._byResource.get(resourceId) || [];
    const ownerId = normalizeOwnerId(normalizedMeta?.ownerId);
    const entry = {
      resourceId,
      ownerId,
      range: normalized,
      meta: normalizedMeta && typeof normalizedMeta === "object" ? { ...normalizedMeta } : undefined
    };
    this._byResource.set(resourceId, insertSorted(list, entry));
    return ok(entry);
  }

  release(resourceId, ownerId, range = null) {
    const owner = normalizeOwnerId(ownerId);
    if (!owner) {
      return err("invalid_owner");
    }
    const list = this._byResource.get(resourceId) || [];
    if (!list.length) return ok({ removed: 0 });
    const normalized = range ? normalizeRangeInput(range) : null;
    if (range && !normalized) {
      return err("invalid_range");
    }
    const next = list.filter((entry) => {
      if (entry.ownerId !== owner) return true;
      if (!normalized) return false;
      return !sameRange(entry.range, normalized);
    });
    const removed = list.length - next.length;
    if (next.length) {
      this._byResource.set(resourceId, next);
    } else {
      this._byResource.delete(resourceId);
    }
    return ok({ removed });
  }

  releaseByOwner(ownerId) {
    const owner = normalizeOwnerId(ownerId);
    if (!owner) {
      return err("invalid_owner");
    }
    let removed = 0;
    for (const [resourceId, list] of this._byResource.entries()) {
      const next = list.filter((entry) => entry.ownerId !== owner);
      removed += list.length - next.length;
      if (next.length) {
        this._byResource.set(resourceId, next);
      } else {
        this._byResource.delete(resourceId);
      }
    }
    return ok({ removed });
  }

  beginTransaction() {
    return new ReservationTransaction(this);
  }

  findNextFree(resourceId, range, options = {}) {
    const list = this._byResource.get(resourceId) || [];
    const maxIterations = Number.isFinite(options.maxIterations)
      ? Math.max(1, Math.floor(options.maxIterations))
      : 1000;
    let candidate = normalizeRangeInput(range);
    if (!candidate) return null;
    for (let i = 0; i < maxIterations; i += 1) {
      const match = findOverlapMatch(list, candidate, null);
      if (!match) {
        return candidate;
      }
      const shiftBy = Math.max(0, match.entry.range.end - candidate.start);
      candidate = interval(candidate.start + shiftBy, candidate.end + shiftBy);
    }
    return null;
  }
}

class ReservationTransaction {
  constructor(table) {
    this._table = table;
    this._pending = new Map();
    this._releases = [];
    this._committed = false;
  }

  reserve(resourceId, range, meta = {}) {
    if (this._committed) return err("transaction_committed");
    const { range: normalized, meta: normalizedMeta } = normalizeReserveArgs(
      range,
      meta
    );
    if (!normalized) {
      return err("invalid_range");
    }
    const existing = this._table.list(resourceId);
    const pending = this._pending.get(resourceId) || [];
    const ownerId = normalizeOwnerId(normalizedMeta?.ownerId);
    const match =
      findOverlapMatch(existing, normalized, ownerId) ||
      findOverlapMatch(pending, normalized, ownerId);
    if (match) {
      if (match.type === "idempotent") {
        return ok({ ...cloneEntry(match.entry), idempotent: true });
      }
      return err({ conflict: cloneEntry(match.entry), resourceId, range: normalized });
    }
    const entry = {
      resourceId,
      ownerId,
      range: normalized,
      meta: normalizedMeta && typeof normalizedMeta === "object" ? { ...normalizedMeta } : undefined
    };
    this._pending.set(resourceId, insertSorted(pending, entry));
    return ok(entry);
  }

  forceReserve(resourceId, range, meta = {}) {
    if (this._committed) return err("transaction_committed");
    const { range: normalized, meta: normalizedMeta } = normalizeReserveArgs(
      range,
      meta
    );
    if (!normalized) {
      return err("invalid_range");
    }
    const pending = this._pending.get(resourceId) || [];
    const ownerId = normalizeOwnerId(normalizedMeta?.ownerId);
    const entry = {
      resourceId,
      ownerId,
      range: normalized,
      meta: normalizedMeta && typeof normalizedMeta === "object" ? { ...normalizedMeta } : undefined
    };
    this._pending.set(resourceId, insertSorted(pending, entry));
    return ok(entry);
  }

  release(resourceId, ownerId, range = null) {
    if (this._committed) return err("transaction_committed");
    const owner = normalizeOwnerId(ownerId);
    if (!owner) {
      return err("invalid_owner");
    }
    const normalized = range ? normalizeRangeInput(range) : null;
    if (range && !normalized) {
      return err("invalid_range");
    }
    this._releases.push({
      resourceId,
      ownerId: owner,
      range: normalized
    });
    return ok({ removed: 0 });
  }

  commit() {
    if (this._committed) return err("transaction_committed");
    this._releases.forEach((entry) => {
      this._table.release(entry.resourceId, entry.ownerId, entry.range);
    });
    this._pending.forEach((entries, resourceId) => {
      const current = this._table.list(resourceId);
      let merged = current;
      entries.forEach((entry) => {
        merged = insertSorted(merged, entry);
      });
      this._table._byResource.set(resourceId, merged);
    });
    this._committed = true;
    return ok(true);
  }

  rollback() {
    if (this._committed) return err("transaction_committed");
    this._pending.clear();
    this._releases = [];
    this._committed = true;
    return ok(true);
  }
}

module.exports = {
  ReservationTable,
  ReservationTransaction
};
