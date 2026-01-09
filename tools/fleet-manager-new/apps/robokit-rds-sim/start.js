const fs = require('fs');
const path = require('path');

function loadProfile() {
  const profile = process.env.SIM_PROFILE || process.env.PROFILE;
  if (!profile) {
    return;
  }
  const profilePath = process.env.SIM_PROFILE_PATH || path.resolve(__dirname, 'profiles', `${profile}.json`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  } catch (err) {
    console.error(`robokit-rds-sim failed to load profile ${profilePath}: ${err.message}`);
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
  console.log(`robokit-rds-sim profile: ${profilePath}`);
}

loadProfile();
require('./server');
