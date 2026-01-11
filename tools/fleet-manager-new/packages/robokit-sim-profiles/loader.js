const fs = require('fs');
const path = require('path');

const DEFAULT_PROFILES_DIR = path.resolve(__dirname, 'profiles');

function loadProfileFile(profilePath) {
  try {
    const raw = fs.readFileSync(profilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { error: err };
  }
}

function applyProfileToEnv(profile, env) {
  if (!profile || typeof profile !== 'object') {
    return;
  }
  for (const [key, value] of Object.entries(profile)) {
    if (env[key] === undefined) {
      env[key] = String(value);
    }
  }
}

function resolveProfilePath(name, profileDir) {
  const baseDir = profileDir || DEFAULT_PROFILES_DIR;
  return path.resolve(baseDir, `${name}.json`);
}

function loadProfileFromEnv(options = {}) {
  const env = options.env || process.env;
  const name = env.SIM_PROFILE || env.PROFILE;
  if (!name) {
    return null;
  }
  const profilePath = env.SIM_PROFILE_PATH || resolveProfilePath(name, options.profileDir);
  const data = loadProfileFile(profilePath);
  if (data && data.error) {
    const message = data.error && data.error.message ? data.error.message : String(data.error);
    if (options.onError) {
      options.onError(profilePath, message);
    } else {
      console.error(`robokit-robot-sim failed to load profile ${profilePath}: ${message}`);
      process.exit(1);
    }
    return null;
  }
  applyProfileToEnv(data, env);
  if (options.onLoad) {
    options.onLoad(profilePath, data);
  } else {
    console.log(`robokit-robot-sim profile: ${profilePath}`);
  }
  return { profilePath, data };
}

module.exports = {
  DEFAULT_PROFILES_DIR,
  resolveProfilePath,
  loadProfileFile,
  applyProfileToEnv,
  loadProfileFromEnv
};
