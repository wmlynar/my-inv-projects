"use strict";

const { ReservationTable: CoreReservationTable } = require("./reservation_table");

const normalizeWindow = (startMs, endMs) => {
  const start = Number.isFinite(startMs) ? startMs : 0;
  const end = Number.isFinite(endMs) ? endMs : start;
  return start <= end ? { start, end } : { start: end, end: start };
};

const normalizeMs = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const applySafety = (window, safetyMs) => ({
  start: window.start - safetyMs,
  end: window.end + safetyMs
});

const ensurePositiveInterval = (interval) => {
  if (!interval || !Number.isFinite(interval.start) || !Number.isFinite(interval.end)) {
    return interval;
  }
  return interval.end > interval.start
    ? interval
    : { start: interval.start, end: interval.start + 1 };
};

const edgeResourceId = (edgeKey) => (edgeKey ? `edge:${edgeKey}` : null);
const nodeResourceId = (nodeId) => (nodeId ? `node:${nodeId}` : null);

const toLegacyEntry = (reservation) => ({
  robotId: reservation.ownerId,
  start: reservation.range.start,
  end: reservation.range.end,
  rawStart:
    reservation.meta && Number.isFinite(reservation.meta.rawStart)
      ? reservation.meta.rawStart
      : reservation.range.start,
  rawEnd:
    reservation.meta && Number.isFinite(reservation.meta.rawEnd)
      ? reservation.meta.rawEnd
      : reservation.range.end
});

class ReservationTable {
  constructor(options = {}) {
    this.options = { ...options };
    this.table = CoreReservationTable ? new CoreReservationTable(options) : null;
    this.edge = new Map();
    this.node = new Map();
  }

  getHorizonMs() {
    return Number.isFinite(this.options.horizonMs) ? this.options.horizonMs : 6000;
  }

  getSafetyMs() {
    const safety = Number.isFinite(this.options.safetyMs) ? this.options.safetyMs : 120;
    return Math.max(0, safety);
  }

  reserveEdge(edgeKey, robotId, startMs, endMs) {
    if (!edgeKey || !robotId) return { ok: false, holder: null };
    if (!this.table) return { ok: false, holder: null };
    const raw = normalizeWindow(startMs, endMs);
    const safety = this.getSafetyMs();
    const interval = ensurePositiveInterval(applySafety(raw, safety));
    const resourceId = edgeResourceId(edgeKey);
    const result = this.table.reserve(resourceId, interval, {
      ownerId: robotId,
      rawStart: raw.start,
      rawEnd: raw.end,
      type: "edge",
      edgeKey
    });
    return result.ok
      ? { ok: true, holder: robotId }
      : { ok: false, holder: result.error?.conflict?.ownerId || null };
  }

  forceReserveEdge(edgeKey, robotId, startMs, endMs) {
    if (!edgeKey || !robotId || !this.table?.forceReserve) return { ok: false };
    const raw = normalizeWindow(startMs, endMs);
    const safety = this.getSafetyMs();
    const interval = ensurePositiveInterval(applySafety(raw, safety));
    const resourceId = edgeResourceId(edgeKey);
    return this.table.forceReserve(resourceId, interval, {
      ownerId: robotId,
      rawStart: raw.start,
      rawEnd: raw.end,
      type: "edge",
      edgeKey
    });
  }

  reserveNode(nodeId, robotId, atMs, dwellMs = 0) {
    if (!nodeId || !robotId) return { ok: false, holder: null };
    if (!this.table) return { ok: false, holder: null };
    const start = normalizeMs(atMs, 0);
    const dwell = normalizeMs(dwellMs, 0);
    const raw = normalizeWindow(start, start + dwell);
    const safety = this.getSafetyMs();
    const interval = ensurePositiveInterval(applySafety(raw, safety));
    const resourceId = nodeResourceId(nodeId);
    const result = this.table.reserve(resourceId, interval, {
      ownerId: robotId,
      rawStart: raw.start,
      rawEnd: raw.end,
      type: "node",
      nodeId
    });
    return result.ok
      ? { ok: true, holder: robotId }
      : { ok: false, holder: result.error?.conflict?.ownerId || null };
  }

  forceReserveNode(nodeId, robotId, atMs, dwellMs = 0) {
    if (!nodeId || !robotId || !this.table?.forceReserve) return { ok: false };
    const start = normalizeMs(atMs, 0);
    const dwell = normalizeMs(dwellMs, 0);
    const raw = normalizeWindow(start, start + dwell);
    const safety = this.getSafetyMs();
    const interval = ensurePositiveInterval(applySafety(raw, safety));
    const resourceId = nodeResourceId(nodeId);
    return this.table.forceReserve(resourceId, interval, {
      ownerId: robotId,
      rawStart: raw.start,
      rawEnd: raw.end,
      type: "node",
      nodeId
    });
  }

  releaseRobot(robotId) {
    if (!robotId || !this.table) return;
    this.table.releaseByOwner(robotId);
  }

  prune(nowMs) {
    if (!this.table) return;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const horizon = this.getHorizonMs();
    const snapshot = this.table.getSnapshot();
    const tx = this.table.beginTransaction();
    snapshot.forEach((entries, resourceId) => {
      entries.forEach((entry) => {
        const rawEnd = entry.meta && Number.isFinite(entry.meta.rawEnd)
          ? entry.meta.rawEnd
          : entry.range.end;
        if (rawEnd + horizon < now) {
          tx.release(resourceId, entry.ownerId, entry.range);
        }
      });
    });
    tx.commit();
  }

  getEdgeReservations(edgeKey) {
    if (!this.table) return [];
    const resourceId = edgeResourceId(edgeKey);
    return this.table.list(resourceId).map((entry) => toLegacyEntry(entry));
  }

  getNodeReservations(nodeId) {
    if (!this.table) return [];
    const resourceId = nodeResourceId(nodeId);
    return this.table.list(resourceId).map((entry) => toLegacyEntry(entry));
  }

  getSnapshot() {
    const edge = new Map();
    const node = new Map();
    if (!this.table) return { edge, node };
    const snapshot = this.table.getSnapshot();
    snapshot.forEach((entries, resourceId) => {
      if (resourceId.startsWith("edge:")) {
        edge.set(
          resourceId.slice(5),
          entries.map((entry) => toLegacyEntry(entry))
        );
        return;
      }
      if (resourceId.startsWith("node:")) {
        node.set(
          resourceId.slice(5),
          entries.map((entry) => toLegacyEntry(entry))
        );
      }
    });
    return { edge, node };
  }

  beginTransaction() {
    if (!this.table?.beginTransaction) return null;
    const tx = this.table.beginTransaction();
    if (!tx) return null;
    const safety = this.getSafetyMs();
    const reserveEdge = (edgeKey, robotId, startMs, endMs, meta) => {
      if (!edgeKey || !robotId) return { ok: false, error: "invalid_reservation" };
      const raw = normalizeWindow(startMs, endMs);
      const interval = ensurePositiveInterval(applySafety(raw, safety));
      const resourceId = edgeResourceId(edgeKey);
      return tx.reserve(resourceId, interval, {
        ownerId: robotId,
        rawStart: raw.start,
        rawEnd: raw.end,
        type: "edge",
        edgeKey,
        ...meta
      });
    };
    const forceReserveEdge = (edgeKey, robotId, startMs, endMs, meta) => {
      if (!edgeKey || !robotId || !tx.forceReserve) {
        return { ok: false, error: "invalid_reservation" };
      }
      const raw = normalizeWindow(startMs, endMs);
      const interval = ensurePositiveInterval(applySafety(raw, safety));
      const resourceId = edgeResourceId(edgeKey);
      return tx.forceReserve(resourceId, interval, {
        ownerId: robotId,
        rawStart: raw.start,
        rawEnd: raw.end,
        type: "edge",
        edgeKey,
        ...meta
      });
    };
    const reserveNode = (nodeId, robotId, atMs, dwellMs = 0, meta) => {
      if (!nodeId || !robotId) return { ok: false, error: "invalid_reservation" };
      const start = normalizeMs(atMs, 0);
      const dwell = normalizeMs(dwellMs, 0);
      const raw = normalizeWindow(start, start + dwell);
      const interval = ensurePositiveInterval(applySafety(raw, safety));
      const resourceId = nodeResourceId(nodeId);
      return tx.reserve(resourceId, interval, {
        ownerId: robotId,
        rawStart: raw.start,
        rawEnd: raw.end,
        type: "node",
        nodeId,
        ...meta
      });
    };
    const forceReserveNode = (nodeId, robotId, atMs, dwellMs = 0, meta) => {
      if (!nodeId || !robotId || !tx.forceReserve) {
        return { ok: false, error: "invalid_reservation" };
      }
      const start = normalizeMs(atMs, 0);
      const dwell = normalizeMs(dwellMs, 0);
      const raw = normalizeWindow(start, start + dwell);
      const interval = ensurePositiveInterval(applySafety(raw, safety));
      const resourceId = nodeResourceId(nodeId);
      return tx.forceReserve(resourceId, interval, {
        ownerId: robotId,
        rawStart: raw.start,
        rawEnd: raw.end,
        type: "node",
        nodeId,
        ...meta
      });
    };
    return {
      reserveEdge,
      forceReserveEdge,
      reserveNode,
      forceReserveNode,
      commit: () => tx.commit(),
      rollback: () => tx.rollback()
    };
  }
}

module.exports = { ReservationTable };
