const path = require('path');

const profile = process.env.PROXY_PROFILE || process.env.PROFILE;
if (profile && !process.env.CONFIG_PATH) {
  process.env.CONFIG_PATH = path.resolve(__dirname, `config-${profile}.json5`);
  console.log(`robokit-proxy profile: ${process.env.CONFIG_PATH}`);
}

require('./server');
