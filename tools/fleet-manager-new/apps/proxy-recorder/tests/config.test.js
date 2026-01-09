const path = require('path');
const assert = require('assert');
const { readJson5 } = require('../lib/helpers');

const configPath = path.join(__dirname, '..', 'configs', 'robokit-all.json5');
const config = readJson5(configPath);

assert(Array.isArray(config.listeners) && config.listeners.length >= 5, 'expected at least five listeners');
assert(config.session && config.session.name === 'robokit_all', 'session name must be robokit_all');
assert(config.listeners.every((listener) => listener.listen && typeof listener.listen.port === 'number'));
assert(config.listeners.every((listener) => listener.upstream && typeof listener.upstream.port === 'number'));
console.log('config test passed');
