"use strict";

const DEFAULT_RETENTION = {
  keepReleases: 1,
  cleanupOnSuccess: true,
  neverDeleteCurrent: true,
  keepAtLeastOneRollback: true,
};

function normalizeRetention(policy) {
  const raw = (policy && policy.retention) || {};
  const keepRaw = raw.keepReleases ?? raw.keep_releases;
  let keepReleases = Number(keepRaw);
  if (!Number.isFinite(keepReleases) || keepReleases < 1) {
    keepReleases = DEFAULT_RETENTION.keepReleases;
  }
  keepReleases = Math.floor(keepReleases);

  return {
    keepReleases,
    cleanupOnSuccess: raw.cleanupOnSuccess !== false,
    neverDeleteCurrent: raw.neverDeleteCurrent !== false,
    keepAtLeastOneRollback: raw.keepAtLeastOneRollback !== false,
  };
}

function filterReleaseNames(names, appName) {
  if (!appName) return names;
  const prefix = `${appName}-`;
  return names.filter((name) => name.startsWith(prefix));
}

function computeKeepSet(releasesSorted, current, retention) {
  const keep = new Set();
  const currentName = current || "";

  if (currentName && retention.neverDeleteCurrent !== false) {
    keep.add(currentName);
  }

  let previous = null;
  if (retention.keepAtLeastOneRollback && retention.keepReleases >= 2 && currentName) {
    const idx = releasesSorted.indexOf(currentName);
    if (idx >= 0 && idx < releasesSorted.length - 1) {
      previous = releasesSorted[idx + 1];
      if (previous) keep.add(previous);
    }
  }

  for (const name of releasesSorted) {
    if (keep.size >= retention.keepReleases) break;
    keep.add(name);
  }

  if (keep.size > retention.keepReleases) {
    const required = new Set([currentName, previous].filter(Boolean));
    for (let i = releasesSorted.length - 1; i >= 0 && keep.size > retention.keepReleases; i -= 1) {
      const candidate = releasesSorted[i];
      if (required.has(candidate)) continue;
      if (keep.has(candidate)) keep.delete(candidate);
    }
  }

  return { keep, previous };
}

module.exports = {
  normalizeRetention,
  filterReleaseNames,
  computeKeepSet,
};
