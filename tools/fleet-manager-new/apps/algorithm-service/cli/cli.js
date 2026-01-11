#!/usr/bin/env node
const path = require('path');
const { loadConfig } = require('../lib/config');
const { startServer } = require('../server');

const DEFAULT_CONFIG = {
  server: { host: '0.0.0.0', port: 8082 }
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

function printHelp() {
  const text = [
    'Usage: algorithm-service --config ./configs/algo.local.json5 [--print-effective-config]',
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

  const configPath = args.config || path.join(__dirname, '..', 'configs', 'algo.local.json5');
  const config = loadConfig(DEFAULT_CONFIG, configPath);

  if (toBool(args['print-effective-config'], false)) {
    console.log(JSON.stringify(config, null, 2));
  }

  startServer(config);
}

main();
