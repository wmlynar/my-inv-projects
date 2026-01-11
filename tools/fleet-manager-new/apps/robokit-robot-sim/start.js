const { loadProfileFromEnv } = require('../../packages/robokit-sim-profiles/loader');

loadProfileFromEnv();
require('./app/server');
