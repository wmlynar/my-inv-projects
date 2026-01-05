'use strict';

const DEFAULT_STEP_MS = 200;
const DEFAULT_HORIZON_MS = 8000;

const findReservationOverlap = (list, startTime, endTime) => {
  if (!Array.isArray(list)) return null;
  for (const entry of list) {
    if (!entry) continue;
    if (endTime <= entry.startTime || startTime >= entry.endTime) continue;
    return entry;
  }
  return null;
};

const findTimeReservationOverlap = (
  list,
  startTime,
  endTime,
  robotId,
  planningPriority,
  getRobotPriorityById
) => {
  if (!Array.isArray(list)) return null;
  for (const entry of list) {
    if (!entry) continue;
    if (entry.robotId === robotId) continue;
    if (
      Number.isFinite(planningPriority) &&
      typeof getRobotPriorityById === 'function' &&
      getRobotPriorityById(entry.robotId) < planningPriority
    ) {
      continue;
    }
    if (endTime <= entry.start || startTime >= entry.end) continue;
    return entry;
  }
  return null;
};

const findReservationSlot = (ctx, options) => {
  const {
    edgeKeys,
    nodeId,
    startTime,
    travelMs,
    profile,
    robotId,
    planningPriority,
    constraints,
    nodeBuffer,
    criticalSection
  } = options || {};
  if (!ctx?.reservationTable || !profile) {
    return { startTime, arrivalTime: startTime + travelMs };
  }
  const safetyMs = Number.isFinite(profile?.safetyMs)
    ? Math.max(0, profile.safetyMs)
    : typeof ctx.reservationTable.getSafetyMs === 'function'
      ? Math.max(0, ctx.reservationTable.getSafetyMs())
      : 0;
  const edgeList = Array.isArray(edgeKeys)
    ? edgeKeys.filter(Boolean)
    : edgeKeys
      ? [edgeKeys]
      : [];
  const nodeWindow = nodeBuffer || { approachMs: 0, clearMs: 0 };
  let start = startTime;
  let conflictInfo = null;
  const stepMs = Math.max(
    20,
    profile.stepMs || ctx.defaults?.stepMs || DEFAULT_STEP_MS
  );
  const horizonMs = Math.max(
    stepMs,
    profile.horizonMs || ctx.defaults?.horizonMs || DEFAULT_HORIZON_MS
  );
  const maxGuard = Math.max(20, Math.ceil(horizonMs / stepMs) + 5);
  let guard = 0;
  let exhausted = false;
  const nodeConstraints = nodeId ? constraints?.nodes?.get(nodeId) : null;
  while (guard < maxGuard) {
    guard += 1;
    if (edgeList.length) {
      let edgeBlocked = false;
      for (const key of edgeList) {
        const edgeConstraints = key ? constraints?.edges?.get(key) : null;
        if (!edgeConstraints) continue;
        const conflict = findReservationOverlap(edgeConstraints, start, start + travelMs);
        if (!conflict) continue;
        if (!conflictInfo) {
          conflictInfo = {
            source: 'constraint',
            type: 'edge',
            key,
            holder: conflict.holder || conflict.robotId || null,
            startTime: conflict.startTime,
            endTime: conflict.endTime
          };
        }
        start = Math.max(start + stepMs, conflict.endTime + stepMs);
        edgeBlocked = true;
        break;
      }
      if (edgeBlocked) continue;
    }
    if (edgeList.length) {
      let edgeBlocked = false;
      for (const key of edgeList) {
        const edgeReservations = ctx.reservationTable.getEdgeReservations(key);
        const conflict = findTimeReservationOverlap(
          edgeReservations,
          start - safetyMs,
          start + travelMs + safetyMs,
          robotId,
          planningPriority,
          ctx.getRobotPriorityById
        );
        if (!conflict) continue;
        if (!conflictInfo) {
          conflictInfo = {
            source: 'reservation',
            type: 'edge',
            key,
            holder: conflict.robotId || null,
            startTime: conflict.start,
            endTime: conflict.end
          };
        }
        start = Math.max(start + stepMs, conflict.end + safetyMs);
        edgeBlocked = true;
        break;
      }
      if (edgeBlocked) continue;
    }
    const arrival = start + travelMs;
    const approachMs = nodeWindow.approachMs || 0;
    const clearMs = nodeWindow.clearMs || 0;
    const nodeStart = arrival - approachMs;
    const nodeEnd = arrival + (profile.nodeDwellMs || 0) + clearMs;
    if (nodeConstraints) {
      const conflict = findReservationOverlap(nodeConstraints, nodeStart, nodeEnd);
      if (conflict) {
        if (!conflictInfo) {
          conflictInfo = {
            source: 'constraint',
            type: 'node',
            key: nodeId,
            holder: conflict.holder || conflict.robotId || null,
            startTime: conflict.startTime,
            endTime: conflict.endTime
          };
        }
        start = Math.max(
          start + stepMs,
          conflict.endTime + approachMs - travelMs + stepMs
        );
        continue;
      }
    }
    if (nodeId) {
      const nodeReservations = ctx.reservationTable.getNodeReservations(nodeId);
      const conflict = findTimeReservationOverlap(
        nodeReservations,
        nodeStart - safetyMs,
        nodeEnd + safetyMs,
        robotId,
        planningPriority,
        ctx.getRobotPriorityById
      );
      if (conflict) {
        if (!conflictInfo) {
          conflictInfo = {
            source: 'reservation',
            type: 'node',
            key: nodeId,
            holder: conflict.robotId || null,
            startTime: conflict.start,
            endTime: conflict.end
          };
        }
        const minStart = conflict.end + approachMs + safetyMs - travelMs;
        start = Math.max(start + stepMs, minStart);
        continue;
      }
    }
    if (criticalSection && ctx.criticalSectionTable) {
      const sectionId = criticalSection.id;
      const windowMs = Number.isFinite(criticalSection.windowMs)
        ? criticalSection.windowMs
        : null;
      const capacity = Number.isFinite(criticalSection.capacity)
        ? Math.max(1, Math.floor(criticalSection.capacity))
        : 1;
      if (sectionId && windowMs != null) {
        const list = ctx.criticalSectionTable.sections.get(sectionId) || [];
        let overlapCount = 0;
        let earliestEnd = null;
        let holder = null;
        let criticalBlocked = false;
        for (const entry of list) {
          if (!entry) continue;
          if (entry.robotId === robotId) continue;
          const end = start + windowMs;
          if (end <= entry.start || start >= entry.end) continue;
          overlapCount += 1;
          if (earliestEnd == null || entry.end < earliestEnd) {
            earliestEnd = entry.end;
            holder = entry.robotId || null;
          }
          if (overlapCount >= capacity) {
            if (!conflictInfo) {
              conflictInfo = {
                source: 'critical_section',
                type: 'section',
                key: sectionId,
                holder,
                startTime: start,
                endTime: earliestEnd
              };
            }
            start = Math.max(start + stepMs, (earliestEnd || start) + stepMs);
            criticalBlocked = true;
            break;
          }
        }
        if (criticalBlocked) {
          continue;
        }
      }
    }
    return { startTime: start, arrivalTime: arrival, conflict: conflictInfo };
  }
  exhausted = true;
  return { startTime: start, arrivalTime: start + travelMs, conflict: conflictInfo, exhausted };
};

const findEarliestSlot = (ctx, options) => {
  const {
    edgeKeys,
    nodeId,
    startTime,
    travelMs,
    reservations,
    constraints,
    nodeBuffer
  } = options || {};
  let start = startTime;
  let guard = 0;
  let conflictInfo = null;
  const marginMs = Number.isFinite(ctx?.reservationMarginMs) ? ctx.reservationMarginMs : 0;
  const defaultNodeDwell = Number.isFinite(ctx?.nodeReservationMs) ? ctx.nodeReservationMs : 0;
  const nodeDwellMs = Number.isFinite(reservations?.nodeDwellMs)
    ? reservations.nodeDwellMs
    : defaultNodeDwell;
  const edgeList = Array.isArray(edgeKeys)
    ? edgeKeys.filter(Boolean)
    : edgeKeys
      ? [edgeKeys]
      : [];
  const nodeReservations = nodeId ? reservations?.nodes?.get(nodeId) : null;
  const nodeConstraints = nodeId ? constraints?.nodes?.get(nodeId) : null;
  while (guard < 50) {
    guard += 1;
    if (edgeList.length) {
      let edgeBlocked = false;
      for (const key of edgeList) {
        const edgeConstraints = key ? constraints?.edges?.get(key) : null;
        if (!edgeConstraints) continue;
        const conflict = findReservationOverlap(edgeConstraints, start, start + travelMs);
        if (!conflict) continue;
        if (!conflictInfo) {
          conflictInfo = {
            source: 'constraint',
            type: 'edge',
            key,
            holder: conflict.holder || conflict.robotId || null,
            startTime: conflict.startTime,
            endTime: conflict.endTime
          };
        }
        start = conflict.endTime + marginMs;
        edgeBlocked = true;
        break;
      }
      if (edgeBlocked) continue;
    }
    if (edgeList.length) {
      let edgeBlocked = false;
      for (const key of edgeList) {
        const edgeReservations = reservations?.edges?.get(key) || null;
        if (!edgeReservations) continue;
        const conflict = findReservationOverlap(edgeReservations, start, start + travelMs);
        if (!conflict) continue;
        if (!conflictInfo) {
          conflictInfo = {
            source: 'reservation',
            type: 'edge',
            key,
            holder: conflict.robotId || null,
            startTime: conflict.startTime,
            endTime: conflict.endTime
          };
        }
        start = conflict.endTime + marginMs;
        edgeBlocked = true;
        break;
      }
      if (edgeBlocked) continue;
    }
    const arrival = start + travelMs;
    const nodeWindow = nodeBuffer || { approachMs: 0, clearMs: 0 };
    const approachMs = nodeWindow.approachMs || 0;
    const clearMs = nodeWindow.clearMs || 0;
    const nodeStart = arrival - approachMs;
    const nodeEnd = arrival + nodeDwellMs + clearMs;
    if (nodeConstraints) {
      const conflict = findReservationOverlap(nodeConstraints, nodeStart, nodeEnd);
      if (conflict) {
        if (!conflictInfo) {
          conflictInfo = {
            source: 'constraint',
            type: 'node',
            key: nodeId,
            holder: conflict.holder || conflict.robotId || null,
            startTime: conflict.startTime,
            endTime: conflict.endTime
          };
        }
        start = Math.max(start, conflict.endTime + approachMs - travelMs);
        continue;
      }
    }
    if (nodeReservations) {
      const conflict = findReservationOverlap(nodeReservations, nodeStart, nodeEnd);
      if (conflict) {
        if (!conflictInfo) {
          conflictInfo = {
            source: 'reservation',
            type: 'node',
            key: nodeId,
            holder: conflict.robotId || null,
            startTime: conflict.startTime,
            endTime: conflict.endTime
          };
        }
        start = Math.max(start, conflict.endTime + approachMs - travelMs);
        continue;
      }
    }
    return { startTime: start, arrivalTime: arrival, conflict: conflictInfo };
  }
  return { startTime: start, arrivalTime: start + travelMs, conflict: conflictInfo };
};

const buildRouteSchedule = (ctx, options) => {
  const { segments, reservations, startTime, robot, constraints } = options || {};
  if (!Array.isArray(segments) || !reservations) return [];
  let cursor = startTime;
  const schedule = [];
  const includeTurnDelay = ctx.useTurnTimeReservations?.();
  segments.forEach((segment, index) => {
    const length = segment?.totalLength;
    if (!Number.isFinite(length) || length <= (ctx.routeProgressEps || 0)) return;
    const turnDelayMs =
      includeTurnDelay && index > 0
        ? ctx.computeTurnDelayMsForSegments?.(segments[index - 1], segment, robot)
        : 0;
    const timing = ctx.resolveSegmentTiming?.(segment, robot, {
      length,
      turnMs: turnDelayMs
    });
    const travelMs = timing?.travelMs || 0;
    const slackMs = timing?.slackMs || 0;
    if (travelMs <= 0) return;
    const primaryEdgeKey =
      ctx.resolveTimeReservationEdgeKey?.(segment, robot) ||
      segment.edgeGroupKey ||
      segment.edgeKey ||
      null;
    const conflictKey = segment.edgeBaseGroupKey || primaryEdgeKey;
    const includeBaseKey =
      Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey) ||
      Boolean(constraints?.edges?.has(conflictKey));
    const edgeKeys =
      ctx.collectEdgeConflictKeys?.(primaryEdgeKey, conflictKey, { includeBaseKey }) || [];
    const nodeId = segment.toNodeId || null;
    const nodeBuffer = nodeId ? ctx.getNodeReservationBufferMs?.(robot, segment) : null;
    const slot = findEarliestSlot(ctx, {
      edgeKeys,
      nodeId,
      startTime: cursor,
      travelMs,
      reservations,
      constraints,
      nodeBuffer
    });
    schedule.push({
      edgeKey: segment.edgeKey || null,
      edgeGroupKey: segment.edgeGroupKey || null,
      edgeBaseGroupKey: segment.edgeBaseGroupKey || segment.edgeGroupKey || null,
      fromNodeId: segment.fromNodeId || null,
      toNodeId: segment.toNodeId || null,
      startTime: slot.startTime,
      arrivalTime: slot.arrivalTime,
      waitMs: Math.max(0, slot.startTime - cursor),
      travelMs,
      slackMs,
      turnMs: turnDelayMs,
      conflict: slot.conflict || null,
      criticalSectionId: segment?.criticalSectionId || null
    });
    cursor = slot.arrivalTime;
  });
  return schedule;
};

const buildScheduleFromPlan = (ctx, options) => {
  const { route, moves, nowMs, stepMs } = options || {};
  if (!route?.segments?.length || !Array.isArray(moves)) return [];
  const schedule = [];
  let cursor = Number.isFinite(nowMs) ? nowMs : Date.now();
  let moveIndex = 0;
  route.segments.forEach((segment, index) => {
    const edgeKey = segment.edgeGroupKey || segment.edgeKey || null;
    if (!edgeKey) return;
    let move = null;
    for (let i = moveIndex; i < moves.length; i += 1) {
      const candidate = moves[i];
      if (!candidate) continue;
      if (candidate.fromNodeId === segment.fromNodeId && candidate.toNodeId === segment.toNodeId) {
        move = candidate;
        moveIndex = i + 1;
        break;
      }
    }
    if (!move) return;
    const startTime = nowMs + move.startStep * stepMs;
    const arrivalTime = nowMs + move.arrivalStep * stepMs;
    schedule.push({
      segmentIndex: index,
      edgeKey: segment.edgeKey || null,
      edgeGroupKey: segment.edgeGroupKey || null,
      edgeBaseGroupKey: segment.edgeBaseGroupKey || segment.edgeGroupKey || null,
      fromNodeId: segment.fromNodeId || null,
      toNodeId: segment.toNodeId || null,
      startTime,
      arrivalTime,
      travelMs: Math.max(0, arrivalTime - startTime),
      waitMs: Math.max(0, startTime - cursor),
      conflict: null,
      criticalSectionId: segment?.criticalSectionId || null
    });
    cursor = arrivalTime;
  });
  if (ctx.criticalSections?.enabled && schedule.length) {
    const sectionMeta = ctx.buildCriticalSectionRanges?.(route.segments) || { ranges: [] };
    const sectionMode = ctx.criticalSections?.mode || 'ORDERING';
    const startIndex = Math.max(0, route.segmentIndex || 0);
    const scheduleByIndex = new Map(
      schedule
        .filter((entry) => Number.isFinite(entry.segmentIndex))
        .map((entry) => [entry.segmentIndex, entry])
    );
    if (!(sectionMode === 'ORDERING' && !sectionMeta.ordered)) {
      let reservedSection = false;
      (sectionMeta.ranges || []).forEach((range) => {
        if (!range) return;
        if (range.endIndex < startIndex) return;
        if (sectionMode === 'BANKER' && reservedSection) return;
        const effectiveStart = Math.max(range.startIndex, startIndex);
        const startEntry = scheduleByIndex.get(effectiveStart);
        const endEntry = scheduleByIndex.get(range.endIndex);
        if (!startEntry || !endEntry) return;
        const startTime = startEntry.startTime;
        const endTime = endEntry.arrivalTime;
        if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return;
        const spanId = `${range.id}:${effectiveStart}`;
        for (let i = effectiveStart; i <= range.endIndex; i += 1) {
          const entry = scheduleByIndex.get(i);
          if (!entry) continue;
          entry.criticalSectionId = entry.criticalSectionId || range.id;
          entry.criticalSectionSpanId = spanId;
          entry.criticalSectionStart = startTime;
          entry.criticalSectionEnd = endTime;
        }
        reservedSection = true;
      });
    }
  }
  return schedule;
};

const buildTimeReservationSchedule = (ctx, options) => {
  const { robot, route, nowMs, constraints, profile, planningPriority } = options || {};
  if (!route?.segments?.length) return null;
  const table = ctx?.reservationTable;
  if (!profile || !table) return null;
  const tx = ctx.beginReservationTransaction ? ctx.beginReservationTransaction(table) : null;
  const reserver = tx || table;
  let reservedOk = true;
  const includeTurnDelay = ctx.useTurnTimeReservations?.();
  const sectionMeta = ctx.buildCriticalSectionRanges?.(route.segments) || { ranges: [] };
  const sectionMode = ctx.criticalSections?.mode || 'ORDERING';
  if (ctx.criticalSections?.enabled && !sectionMeta.ordered && sectionMode === 'ORDERING') {
    return null;
  }
  const sectionRangeMap = new Map();
  (sectionMeta.ranges || []).forEach((range) => {
    for (let i = range.startIndex; i <= range.endIndex; i += 1) {
      sectionRangeMap.set(i, range);
    }
  });
  const schedule = [];
  let reservedSection = false;
  let activeSection = null;
  const startIndex = Math.max(0, route.segmentIndex || 0);
  const startProgress = Math.max(0, route.segmentProgress || 0);
  let cursor = Number.isFinite(nowMs) ? nowMs : Date.now();
  for (let index = startIndex; index < route.segments.length; index += 1) {
    if (activeSection && index > activeSection.endIndex) {
      activeSection = null;
    }
    const segment = route.segments[index];
    if (!segment?.totalLength) continue;
    const progress = index === startIndex ? startProgress : 0;
    const remaining = Math.max(0, segment.totalLength - progress);
    if (remaining <= (ctx.routeProgressEps || 0)) continue;
    const turnDelayMs =
      includeTurnDelay && index > startIndex
        ? ctx.computeTurnDelayMsForSegments?.(route.segments[index - 1], segment, robot)
        : 0;
    const timing = ctx.resolveSegmentTiming?.(segment, robot, {
      length: remaining,
      turnMs: turnDelayMs
    });
    const slackMs = index > startIndex ? timing?.slackMs || 0 : 0;
    const travelMs = Math.max(0, (timing?.expectedMs || 0) + slackMs + (timing?.turnMs || 0));
    if (travelMs <= 0) continue;
    const primaryEdgeKey = ctx.resolveTimeReservationEdgeKey?.(segment, robot);
    const conflictKey = segment.edgeBaseGroupKey || segment.edgeGroupKey || primaryEdgeKey;
    const includeBaseKey =
      Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey) ||
      Boolean(constraints?.edges?.has(conflictKey));
    const edgeKeys = ctx.collectEdgeConflictKeys?.(primaryEdgeKey, conflictKey, {
      includeBaseKey
    }) || [];
    const nodeId =
      segment.toNodeId && !String(segment.toNodeId).startsWith('__')
        ? segment.toNodeId
        : null;
    const nodeBuffer = nodeId ? ctx.getNodeReservationBufferMs?.(robot, segment) : null;
    const rangeAtIndex = sectionRangeMap.get(index) || null;
    const shouldReserveSection =
      rangeAtIndex &&
      (rangeAtIndex.startIndex === index || index === startIndex) &&
      (!reservedSection || sectionMode !== 'BANKER');
    const sectionRange = shouldReserveSection
      ? { ...rangeAtIndex, startIndex: index }
      : null;
    const sectionWindowMs = sectionRange
      ? ctx.computeCriticalSectionWindowMs?.(route, sectionRange, robot, index, progress)
      : 0;
    const criticalSection =
      ctx.criticalSections?.enabled && sectionRange
        ? {
            id: sectionRange.id,
            windowMs: sectionWindowMs,
            capacity: ctx.resolveCriticalSectionCapacity?.(sectionRange.id)
          }
        : null;
    const slot = findReservationSlot(ctx, {
      edgeKeys,
      nodeId,
      startTime: cursor,
      travelMs,
      profile,
      robotId: robot?.id,
      planningPriority,
      constraints,
      nodeBuffer,
      criticalSection
    });
    if (criticalSection && Number.isFinite(slot.startTime) && slot.startTime > cursor) {
      ctx.recordCriticalWait?.(slot.startTime - cursor);
    }
    if (criticalSection && sectionRange && sectionWindowMs > 0) {
      const spanId = `${sectionRange.id}:${sectionRange.startIndex}`;
      activeSection = {
        id: sectionRange.id,
        spanId,
        start: slot.startTime,
        end: slot.startTime + sectionWindowMs,
        endIndex: rangeAtIndex.endIndex
      };
      reservedSection = true;
    }
    const sectionId = rangeAtIndex?.id || segment.criticalSectionId || null;
    const sectionSpan =
      activeSection && sectionId && activeSection.id === sectionId ? activeSection : null;
    schedule.push({
      segmentIndex: index,
      edgeKey: segment.edgeKey || null,
      edgeGroupKey: segment.edgeGroupKey || null,
      edgeBaseGroupKey: segment.edgeBaseGroupKey || segment.edgeGroupKey || null,
      fromNodeId: segment.fromNodeId || null,
      toNodeId: segment.toNodeId || null,
      startTime: slot.startTime,
      arrivalTime: slot.arrivalTime,
      travelMs,
      slackMs,
      turnMs: turnDelayMs,
      waitMs: Math.max(0, slot.startTime - cursor),
      conflict: slot.conflict || null,
      criticalSectionId: sectionId,
      criticalSectionSpanId: sectionSpan ? sectionSpan.spanId : null,
      criticalSectionStart: sectionSpan ? sectionSpan.start : null,
      criticalSectionEnd: sectionSpan ? sectionSpan.end : null
    });
    edgeKeys.forEach((edgeKey) => {
      if (!edgeKey || !robot?.id) return;
      const result = reserver.reserveEdge(edgeKey, robot.id, slot.startTime, slot.arrivalTime);
      if (!result.ok) {
        if (
          Number.isFinite(planningPriority) &&
          typeof ctx.getRobotPriorityById === 'function' &&
          ctx.getRobotPriorityById(result.holder) < planningPriority
        ) {
          const forced = typeof reserver.forceReserveEdge === 'function'
            ? reserver.forceReserveEdge(edgeKey, robot.id, slot.startTime, slot.arrivalTime)
            : ctx.forceReserveEdge?.(table, edgeKey, robot.id, slot.startTime, slot.arrivalTime);
          if (!forced?.ok) {
            reservedOk = false;
          }
        } else {
          reservedOk = false;
        }
      }
    });
    if (nodeId && robot?.id) {
      const nodeStart = slot.arrivalTime - (nodeBuffer?.approachMs || 0);
      const nodeDwellMs =
        (profile.nodeDwellMs || 0) + (nodeBuffer?.approachMs || 0) + (nodeBuffer?.clearMs || 0);
      const result = reserver.reserveNode(nodeId, robot.id, nodeStart, nodeDwellMs);
      if (!result.ok) {
        if (
          Number.isFinite(planningPriority) &&
          typeof ctx.getRobotPriorityById === 'function' &&
          ctx.getRobotPriorityById(result.holder) < planningPriority
        ) {
          const forced = typeof reserver.forceReserveNode === 'function'
            ? reserver.forceReserveNode(nodeId, robot.id, nodeStart, nodeDwellMs)
            : ctx.forceReserveNode?.(table, nodeId, robot.id, nodeStart, nodeDwellMs);
          if (!forced?.ok) {
            reservedOk = false;
          }
        } else {
          reservedOk = false;
        }
      }
    }
    if (criticalSection && robot?.id && ctx.criticalSectionTable && sectionWindowMs > 0) {
      ctx.criticalSectionTable.reserve(
        criticalSection.id,
        robot.id,
        slot.startTime,
        slot.startTime + sectionWindowMs,
        criticalSection.capacity
      );
    }
    cursor = slot.arrivalTime;
  }
  if (tx) {
    if (!reservedOk) {
      tx.rollback?.();
      return null;
    }
    const committed = tx.commit();
    if (!committed?.ok) {
      return null;
    }
  }
  return { schedule, profile };
};

const repairTimeReservationSchedule = (ctx, options) => {
  const {
    robot,
    route,
    nowMs,
    constraints,
    profile,
    planningPriority,
    startIndex,
    startProgress,
    priorSchedule
  } = options || {};
  if (!robot || !route?.segments?.length) return null;
  if (!route.schedule?.length) return null;
  const table = ctx?.reservationTable;
  if (!profile || !table) return null;
  const includeTurnDelay = ctx.useTurnTimeReservations?.();
  const sectionMeta = ctx.buildCriticalSectionRanges?.(route.segments) || { ranges: [] };
  const sectionMode = ctx.criticalSections?.mode || 'ORDERING';
  if (ctx.criticalSections?.enabled && !sectionMeta.ordered && sectionMode === 'ORDERING') {
    return { adjusted: false, failed: true, reason: 'critical_order' };
  }
  const sectionRangeMap = new Map();
  (sectionMeta.ranges || []).forEach((range) => {
    for (let i = range.startIndex; i <= range.endIndex; i += 1) {
      sectionRangeMap.set(i, range);
    }
  });
  const priorByIndex = new Map(
    (priorSchedule || route.schedule || [])
      .filter((entry) => Number.isFinite(entry.segmentIndex))
      .map((entry) => [entry.segmentIndex, entry])
  );
  let cursor = Number.isFinite(nowMs) ? nowMs : Date.now();
  const schedule = [];
  let adjusted = false;
  let reservedSection = false;
  let activeSection = null;

  (route.schedule || []).forEach((entry) => {
    if (!Number.isFinite(entry.segmentIndex)) return;
    if (entry.segmentIndex < startIndex) {
      schedule.push({ ...entry });
      if (Number.isFinite(entry.arrivalTime)) {
        cursor = Math.max(cursor, entry.arrivalTime);
      }
    }
  });

  ctx.releaseReservations?.(robot.id);
  ctx.releaseCriticalSections?.(robot.id);
  const tx = ctx.beginReservationTransaction ? ctx.beginReservationTransaction(table) : null;
  const reserver = tx || table;
  let reservedOk = true;

  for (let index = startIndex; index < route.segments.length; index += 1) {
    if (activeSection && index > activeSection.endIndex) {
      activeSection = null;
    }
    const segment = route.segments[index];
    if (!segment?.totalLength) continue;
    const progress = index === startIndex ? startProgress : 0;
    const remaining = Math.max(0, segment.totalLength - progress);
    if (remaining <= (ctx.routeProgressEps || 0)) continue;
    const turnDelayMs =
      includeTurnDelay && index > startIndex
        ? ctx.computeTurnDelayMsForSegments?.(route.segments[index - 1], segment, robot)
        : 0;
    const timing = ctx.resolveSegmentTiming?.(segment, robot, {
      length: remaining,
      turnMs: turnDelayMs
    });
    const slackMs = index > startIndex ? timing?.slackMs || 0 : 0;
    const travelMs = Math.max(0, (timing?.expectedMs || 0) + slackMs + (timing?.turnMs || 0));
    if (travelMs <= 0) continue;
    const primaryEdgeKey =
      ctx.resolveTimeReservationEdgeKey?.(segment, robot) ||
      segment.edgeGroupKey ||
      segment.edgeKey ||
      null;
    const conflictKey = segment.edgeBaseGroupKey || segment.edgeGroupKey || primaryEdgeKey;
    const includeBaseKey =
      Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey) ||
      Boolean(constraints?.edges?.has(conflictKey));
    const edgeKeys =
      ctx.collectEdgeConflictKeys?.(primaryEdgeKey, conflictKey, { includeBaseKey }) || [];
    const nodeId =
      segment.toNodeId && !String(segment.toNodeId).startsWith('__')
        ? segment.toNodeId
        : null;
    const nodeBuffer = nodeId ? ctx.getNodeReservationBufferMs?.(robot, segment) : null;
    const rangeAtIndex = sectionRangeMap.get(index) || null;
    const shouldReserveSection =
      rangeAtIndex &&
      (rangeAtIndex.startIndex === index || index === startIndex) &&
      (!reservedSection || sectionMode !== 'BANKER');
    const sectionRange = shouldReserveSection
      ? { ...rangeAtIndex, startIndex: index }
      : null;
    const sectionWindowMs = sectionRange
      ? ctx.computeCriticalSectionWindowMs?.(route, sectionRange, robot, index, progress)
      : 0;
    const criticalSection =
      ctx.criticalSections?.enabled && sectionRange
        ? {
            id: sectionRange.id,
            windowMs: sectionWindowMs,
            capacity: ctx.resolveCriticalSectionCapacity?.(sectionRange.id)
          }
        : null;
    const slot = findReservationSlot(ctx, {
      edgeKeys,
      nodeId,
      startTime: cursor,
      travelMs,
      profile,
      robotId: robot?.id,
      planningPriority,
      constraints,
      nodeBuffer,
      criticalSection
    });
    const maxRetimingMs = Number.isFinite(profile?.repair?.maxRetimingMs)
      ? profile.repair.maxRetimingMs
      : null;
    if (slot.exhausted || (maxRetimingMs != null && slot.startTime - cursor > maxRetimingMs)) {
      return { adjusted: false, failed: true, reason: 'retiming_exhausted' };
    }
    if (criticalSection && sectionRange && sectionWindowMs > 0) {
      const spanId = `${sectionRange.id}:${sectionRange.startIndex}`;
      activeSection = {
        id: sectionRange.id,
        spanId,
        start: slot.startTime,
        end: slot.startTime + sectionWindowMs,
        endIndex: rangeAtIndex.endIndex
      };
      reservedSection = true;
    }
    const sectionId = rangeAtIndex?.id || segment?.criticalSectionId || null;
    const sectionSpan =
      activeSection && sectionId && activeSection.id === sectionId ? activeSection : null;
    const nextEntry = {
      segmentIndex: index,
      edgeKey: segment.edgeKey || null,
      edgeGroupKey: segment.edgeGroupKey || null,
      edgeBaseGroupKey: segment.edgeBaseGroupKey || segment.edgeGroupKey || null,
      fromNodeId: segment.fromNodeId || null,
      toNodeId: segment.toNodeId || null,
      startTime: slot.startTime,
      arrivalTime: slot.arrivalTime,
      travelMs,
      slackMs,
      turnMs: turnDelayMs,
      waitMs: Math.max(0, slot.startTime - cursor),
      conflict: slot.conflict || null,
      criticalSectionId: sectionId,
      criticalSectionSpanId: sectionSpan ? sectionSpan.spanId : null,
      criticalSectionStart: sectionSpan ? sectionSpan.start : null,
      criticalSectionEnd: sectionSpan ? sectionSpan.end : null
    };
    const prior = priorByIndex.get(index);
    if (!prior) {
      adjusted = true;
    } else if (
      Math.abs(prior.startTime - nextEntry.startTime) > 1 ||
      Math.abs(prior.arrivalTime - nextEntry.arrivalTime) > 1
    ) {
      adjusted = true;
    }
    schedule.push(nextEntry);
    edgeKeys.forEach((edgeKey) => {
      if (!edgeKey || !robot?.id) return;
      const result = reserver.reserveEdge(edgeKey, robot.id, slot.startTime, slot.arrivalTime);
      if (!result.ok) {
        if (
          Number.isFinite(planningPriority) &&
          typeof ctx.getRobotPriorityById === 'function' &&
          ctx.getRobotPriorityById(result.holder) < planningPriority
        ) {
          const forced = typeof reserver.forceReserveEdge === 'function'
            ? reserver.forceReserveEdge(edgeKey, robot.id, slot.startTime, slot.arrivalTime)
            : ctx.forceReserveEdge?.(table, edgeKey, robot.id, slot.startTime, slot.arrivalTime);
          if (!forced?.ok) {
            reservedOk = false;
          }
        } else {
          reservedOk = false;
        }
      }
    });
    if (nodeId && robot?.id) {
      const nodeStart = slot.arrivalTime - (nodeBuffer?.approachMs || 0);
      const nodeDwellMs =
        (profile.nodeDwellMs || 0) + (nodeBuffer?.approachMs || 0) + (nodeBuffer?.clearMs || 0);
      const result = reserver.reserveNode(nodeId, robot.id, nodeStart, nodeDwellMs);
      if (!result.ok) {
        if (
          Number.isFinite(planningPriority) &&
          typeof ctx.getRobotPriorityById === 'function' &&
          ctx.getRobotPriorityById(result.holder) < planningPriority
        ) {
          const forced = typeof reserver.forceReserveNode === 'function'
            ? reserver.forceReserveNode(nodeId, robot.id, nodeStart, nodeDwellMs)
            : ctx.forceReserveNode?.(table, nodeId, robot.id, nodeStart, nodeDwellMs);
          if (!forced?.ok) {
            reservedOk = false;
          }
        } else {
          reservedOk = false;
        }
      }
    }
    if (criticalSection && robot?.id && ctx.criticalSectionTable && sectionWindowMs > 0) {
      ctx.criticalSectionTable.reserve(
        criticalSection.id,
        robot.id,
        slot.startTime,
        slot.startTime + sectionWindowMs,
        criticalSection.capacity
      );
    }
    cursor = slot.arrivalTime;
  }
  if (tx) {
    if (!reservedOk) {
      tx.rollback?.();
      return { adjusted: false, failed: true, reason: 'reservation_conflict' };
    }
    const committed = tx.commit();
    if (!committed?.ok) {
      return { adjusted: false, failed: true, reason: 'reservation_commit_failed' };
    }
  }
  return { schedule, profile, adjusted };
};

module.exports = {
  findReservationSlot,
  findEarliestSlot,
  buildRouteSchedule,
  buildScheduleFromPlan,
  buildTimeReservationSchedule,
  repairTimeReservationSchedule
};
