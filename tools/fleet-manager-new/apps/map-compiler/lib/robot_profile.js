const path = require('path');
const { readJson5 } = require('./config');

function normalizeRobotModel(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const raw = profile.model && typeof profile.model === 'object' ? profile.model : profile;
  const model = {
    head: Number(raw.head),
    tail: Number(raw.tail),
    width: Number(raw.width),
    safetyFront: Number(raw.safetyFront ?? 0),
    safetyRear: Number(raw.safetyRear ?? 0),
    safetySide: Number(raw.safetySide ?? 0),
    stopStandoff: Number(raw.stopStandoff ?? 0),
    poseMargin: Number(raw.poseMargin ?? 0),
    trackingMargin: Number(raw.trackingMargin ?? 0),
    turningExtraMargin: Number(raw.turningExtraMargin ?? 0)
  };
  if (![model.head, model.tail, model.width].every((value) => Number.isFinite(value))) {
    return null;
  }
  return model;
}

function loadRobotProfile(profilePath) {
  if (!profilePath) return { profile: null, model: null };
  const resolved = path.resolve(profilePath);
  const profile = readJson5(resolved);
  const model = normalizeRobotModel(profile);
  return { profile, model, path: resolved };
}

module.exports = {
  loadRobotProfile,
  normalizeRobotModel
};
