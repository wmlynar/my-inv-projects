#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadConfig } = require('../lib/config');

const DEFAULT_CONFIG = {
  coreUrl: 'http://localhost:8080/api/v1',
  activate: true
};

function parseArgs(argv) {
  const result = { command: null, options: {} };
  if (!argv.length) return result;
  if (!argv[0].startsWith('--')) {
    result.command = argv[0];
    argv = argv.slice(1);
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg || !arg.startsWith('--')) {
      continue;
    }
    const [key, raw] = arg.slice(2).split('=', 2);
    if (raw !== undefined) {
      result.options[key] = raw;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      result.options[key] = next;
      i += 1;
    } else {
      result.options[key] = 'true';
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

function resolveConfigPath(options) {
  if (options.config) return path.resolve(expandHome(options.config));
  if (process.env.FLEET_CONFIG) return path.resolve(expandHome(process.env.FLEET_CONFIG));
  return path.join(resolveFleetDataDir(), 'config', 'roboshop-bridge.local.json5');
}

function ensureConfigPath(configPath) {
  if (fs.existsSync(configPath)) return;
  console.error(`config not found: ${configPath}`);
  console.error('Run: node bin/fleet-init.js');
  process.exit(1);
}

function resolvePathFromConfig(value, configDir) {
  if (!value || path.isAbsolute(value)) return value;
  return path.resolve(configDir, value);
}

function printHelp() {
  const text = [
    'Usage:',
    '  roboshop-bridge import-scene --scene-name <name> --smap <path> --core-url <url> [options]',
    '',
    'Options:',
    '  --scene-name <name>            Scene name',
    '  --smap <path>                  Path to .smap file',
    '  --worksites <path>             Path to worksites.json5',
    '  --streams <path>               Path to streams.json5',
    '  --robots <path>                Path to robots.json5',
    '  --core-url <url>               Fleet Core base URL',
    '  --activate <true|false>        Activate after import',
    '  --lease-id <id>                Optional ControlLease id',
    '  --config <path>                Path to JSON5 config',
    '  --print-effective-config       Print merged config',
    '  --help                         Show help'
  ];
  console.log(text.join('\n'));
}

function requireValue(name, value) {
  if (!value) {
    console.error(`missing --${name}`);
    process.exit(1);
  }
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const { command, options } = parsed;

  if (options.help || !command) {
    printHelp();
    process.exit(command ? 0 : 1);
  }

  const configPath = resolveConfigPath(options);
  ensureConfigPath(configPath);
  const configDir = path.dirname(configPath);
  let config = loadConfig(DEFAULT_CONFIG, configPath);
  config = {
    ...config,
    smap: resolvePathFromConfig(config.smap, configDir),
    worksites: resolvePathFromConfig(config.worksites, configDir),
    streams: resolvePathFromConfig(config.streams, configDir),
    robots: resolvePathFromConfig(config.robots, configDir)
  };

  if (toBool(options['print-effective-config'], false)) {
    console.log(JSON.stringify(config, null, 2));
  }

  if (command !== 'import-scene') {
    console.error(`unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  const input = {
    sceneName: options['scene-name'] || config.sceneName,
    smap: options.smap || config.smap,
    worksites: options.worksites || config.worksites,
    streams: options.streams || config.streams,
    robots: options.robots || config.robots,
    coreUrl: options['core-url'] || config.coreUrl,
    activate: toBool(options.activate, config.activate),
    leaseId: options['lease-id'] || config.leaseId || null
  };

  requireValue('scene-name', input.sceneName);
  requireValue('smap', input.smap);
  requireValue('core-url', input.coreUrl);

  const result = {
    ok: true,
    status: 'not_implemented',
    input
  };
  console.log(JSON.stringify(result, null, 2));
}

main();
