#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadConfig } = require('../lib/config');
const { startServer } = require('../server');

const DEFAULT_CONFIG = {
  server: { host: '0.0.0.0', port: 8080 }
};

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg || !arg.startsWith('--')) {
      continue;
    }
    const [key, raw] = arg.slice(2).split('=', 2);
    if (raw !== undefined) {
      result[key] = raw;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = 'true';
    }
  }
  return result;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0' || text === '') return false;
  return fallback;
}

function expandHome(input) {
  if (!input) return input;
  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function resolveFleetDataDir() {
  const envDir = process.env.FLEET_DATA_DIR;
  const baseDir = envDir ? expandHome(envDir) : path.join(os.homedir(), 'fleet_data');
  return path.resolve(baseDir);
}

function resolveConfigPath(args) {
  if (args.config) return path.resolve(expandHome(args.config));
  if (process.env.FLEET_CONFIG) return path.resolve(expandHome(process.env.FLEET_CONFIG));
  return path.join(resolveFleetDataDir(), 'config', 'fleet-core.local.json5');
}

function ensureConfigPath(configPath) {
  if (fs.existsSync(configPath)) return;
  console.error(`config not found: ${configPath}`);
  console.error('Run: node bin/fleet-init.js');
  process.exit(1);
}

function printHelp() {
  const text = [
    'Usage: fleet-core [--config <path>] [--print-effective-config]',
    'Options:',
    '  --config <path>                 Path to JSON5 config',
    '  --print-effective-config        Print merged config before starting',
    '  --help                          Show help'
  ];
  console.log(text.join('\n'));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const configPath = resolveConfigPath(args);
  ensureConfigPath(configPath);
  const config = loadConfig(DEFAULT_CONFIG, configPath);
  config._configDir = path.dirname(configPath);

  if (toBool(args['print-effective-config'], false)) {
    console.log(JSON.stringify(config, null, 2));
  }

  startServer(config);
}

main();
