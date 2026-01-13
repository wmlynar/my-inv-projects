const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIGS_DIR = path.resolve(__dirname, 'configs');

function loadConfigFile(configPath) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { error: err };
  }
}

function applyConfigToEnv(config, env) {
  if (!config || typeof config !== 'object') {
    return;
  }
  for (const [key, value] of Object.entries(config)) {
    if (env[key] === undefined) {
      env[key] = String(value);
    }
  }
}

function resolveConfigPath(name, configDir) {
  const baseDir = configDir || DEFAULT_CONFIGS_DIR;
  return path.resolve(baseDir, `${name}.json`);
}

function loadConfigFromEnv(options = {}) {
  const env = options.env || process.env;
  const name = env.SIM_CONFIG || env.SIM_PROFILE || env.PROFILE;
  const configPath =
    env.SIM_CONFIG_PATH || env.SIM_PROFILE_PATH || (name ? resolveConfigPath(name, options.configDir) : null);
  if (!configPath) {
    return null;
  }
  if (!env.SIM_CONFIG && !env.SIM_CONFIG_PATH && (env.SIM_PROFILE || env.SIM_PROFILE_PATH || env.PROFILE)) {
    console.warn('robokit-robot-sim: SIM_PROFILE* is deprecated; use SIM_CONFIG or SIM_CONFIG_PATH.');
  }
  const data = loadConfigFile(configPath);
  if (data && data.error) {
    const message = data.error && data.error.message ? data.error.message : String(data.error);
    if (options.onError) {
      options.onError(configPath, message);
    } else {
      console.error(`robokit-robot-sim failed to load config ${configPath}: ${message}`);
      process.exit(1);
    }
    return null;
  }
  applyConfigToEnv(data, env);
  if (options.onLoad) {
    options.onLoad(configPath, data);
  } else {
    console.log(`robokit-robot-sim config: ${configPath}`);
  }
  return { configPath, data };
}

module.exports = {
  DEFAULT_CONFIGS_DIR,
  resolveConfigPath,
  loadConfigFile,
  applyConfigToEnv,
  loadConfigFromEnv
};
