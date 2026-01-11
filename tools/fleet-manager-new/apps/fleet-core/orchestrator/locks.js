function hash32Fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function makeReservationId(robotId, corridorId, startTsMs, endTsMs) {
  const seed = `${robotId}|${corridorId}|${startTsMs}|${endTsMs}`;
  return `res_${hash32Fnv1a(seed).toString(16)}`;
}

function overlaps(a, b) {
  return a.startTsMs < b.endTsMs && a.endTsMs > b.startTsMs;
}

function buildReservationRequests(route, startTsMs, speedMps, corridorsById) {
  if (!route || !Array.isArray(route.corridors)) return [];
  const requests = [];
  let cursor = startTsMs;
  const speed = Number.isFinite(speedMps) && speedMps > 0 ? speedMps : 1.0;
  for (const corridorId of route.corridors) {
    const corridor = corridorsById.get(corridorId);
    if (!corridor) continue;
    const durationMs = (corridor.lengthM / speed) * 1000;
    const start = cursor;
    const end = cursor + durationMs;
    requests.push({
      corridorId,
      startTsMs: start,
      endTsMs: end,
      singleLane: corridor.singleLane !== false
    });
    cursor = end;
  }
  return requests;
}

function lockManagerTick(existingReservations, requests, nowMs) {
  const active = Array.isArray(existingReservations) ? existingReservations.slice() : [];
  const granted = [];
  const denied = [];
  if (Number.isFinite(nowMs)) {
    const filtered = active.filter((res) => res.endTsMs > nowMs);
    active.length = 0;
    active.push(...filtered);
  }

  const sorted = (Array.isArray(requests) ? requests : []).slice().sort((a, b) => {
    if (a.robotId !== b.robotId) return a.robotId.localeCompare(b.robotId);
    if (a.corridorId !== b.corridorId) return a.corridorId.localeCompare(b.corridorId);
    return a.startTsMs - b.startTsMs;
  });

  for (const request of sorted) {
    const isSingleLane = request.singleLane !== false;
    let conflict = false;
    if (isSingleLane) {
      for (const res of active) {
        if (res.corridorId !== request.corridorId) continue;
        if (res.robotId === request.robotId) continue;
        if (overlaps(res, request)) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        for (const res of granted) {
          if (res.corridorId !== request.corridorId) continue;
          if (res.robotId === request.robotId) continue;
          if (overlaps(res, request)) {
            conflict = true;
            break;
          }
        }
      }
    }

    if (conflict) {
      denied.push({ ...request, reason: 'conflict' });
      continue;
    }

    const reservation = {
      reservationId: makeReservationId(
        request.robotId,
        request.corridorId,
        request.startTsMs,
        request.endTsMs
      ),
      corridorId: request.corridorId,
      robotId: request.robotId,
      startTsMs: request.startTsMs,
      endTsMs: request.endTsMs,
      status: 'active'
    };
    granted.push(reservation);
    active.push(reservation);
  }

  return { granted, denied, reservations: active };
}

module.exports = {
  buildReservationRequests,
  lockManagerTick
};
