const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configName = process.env.SIM_CONFIG || process.env.SIM_PROFILE || process.env.PROFILE;
  const configPath =
    process.env.SIM_CONFIG_PATH ||
    process.env.SIM_PROFILE_PATH ||
    (configName ? path.resolve(__dirname, 'configs', `${configName}.json`) : null);
  if (!configPath) {
    return;
  }
  if (!process.env.SIM_CONFIG && !process.env.SIM_CONFIG_PATH && (process.env.SIM_PROFILE || process.env.SIM_PROFILE_PATH)) {
    console.warn('robokit-rds-sim: SIM_PROFILE* is deprecated; use SIM_CONFIG or SIM_CONFIG_PATH.');
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`robokit-rds-sim failed to load config ${configPath}: ${err.message}`);
    process.exit(1);
  }
  if (!data || typeof data !== 'object') {
    return;
  }
  for (const [key, value] of Object.entries(data)) {
    if (process.env[key] === undefined) {
      process.env[key] = String(value);
    }
  }
  console.log(`robokit-rds-sim config: ${configPath}`);
}

loadConfig();
require('./server');
