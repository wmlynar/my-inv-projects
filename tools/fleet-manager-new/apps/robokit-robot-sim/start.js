const { loadConfigFromEnv } = require('./config_loader');

loadConfigFromEnv();
require('./app/server');
