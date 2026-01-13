#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startServer } = require('../server');
const { loadConfig } = require('../../map-compiler-visualizer/lib/config');
const { spawn } = require('child_process');

const DEFAULT_CONFIG = {
  server: { host: '127.0.0.1', port: 8093 },
  logs: { dir: './session', stateConn: null, timeFrom: null, timeTo: null },
  map: { dir: './compiled', sceneGraph: null, compiledMap: null, name: null, md5: null },
  viewer: {
    invertY: true,
    maxPoints: 20000,
    stopSpeedMps: 0.05,
    stopHoldMs: 400,
    slowSpeedMps: 0.2
  }
};

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg || !arg.startsWith('--')) continue;
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

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function expandHome(input) {
  if (!input) return input;
  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function resolvePathFromConfig(value, configDir) {
  if (!value) return value;
  const expanded = expandHome(value);
  if (path.isAbsolute(expanded)) return expanded;
  return path.resolve(configDir, expanded);
}

function parseTimeInput(value) {
  if (value === undefined || value === null || value === '') return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const asNum = Number(trimmed);
    return Number.isFinite(asNum) ? asNum : null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function printHelp() {
  const text = [
    'Usage: robokit-obstacle-visualizer --log-dir ./session [options]',
    '',
    'Options:',
    '  --log-dir <path>                Log session directory (proxy-recorder)',
    '  --state-conn <connId>           Force specific state connId (e.g. c0002)',
    '  --map-dir <path>                Directory with sceneGraph.json + compiledMap.json',
    '  --scene-graph <path>            Override path to sceneGraph.json',
    '  --compiled-map <path>           Override path to compiledMap.json',
    '  --time-from <ms|iso>            Filter from timestamp',
    '  --time-to <ms|iso>              Filter to timestamp',
    '  --max-points <int>              Trajectory points limit',
    '  --host <host>                   Server host (default 127.0.0.1)',
    '  --port <port>                   Server port (default 8093)',
    '  --open <true|false>             Open browser after start (default true)',
    '  --config <path>                 Optional JSON5 config file',
    '  --print-effective-config        Print merged config',
    '  --help                          Show help'
  ];
  console.log(text.join('\n'));
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd = null;
  let args = [];
  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.unref();
  } catch (err) {
    console.warn(`failed to open browser: ${err.message}`);
  }
}

function applyOverrides(config, args, configDir) {
  const next = { ...config };
  if (args['log-dir']) {
    next.logs = { ...(next.logs || {}), dir: resolvePathFromConfig(args['log-dir'], configDir) };
  }
  if (args['state-conn']) {
    next.logs = { ...(next.logs || {}), stateConn: args['state-conn'] };
  }
  if (args['time-from']) {
    next.logs = { ...(next.logs || {}), timeFrom: parseTimeInput(args['time-from']) };
  }
  if (args['time-to']) {
    next.logs = { ...(next.logs || {}), timeTo: parseTimeInput(args['time-to']) };
  }
  if (args['max-points']) {
    next.viewer = { ...(next.viewer || {}), maxPoints: Math.max(1, Number.parseInt(args['max-points'], 10)) };
  }
  if (args['map-dir']) {
    next.map = { ...(next.map || {}), dir: resolvePathFromConfig(args['map-dir'], configDir) };
  }
  if (args['scene-graph']) {
    next.map = { ...(next.map || {}), sceneGraph: resolvePathFromConfig(args['scene-graph'], configDir) };
  }
  if (args['compiled-map']) {
    next.map = { ...(next.map || {}), compiledMap: resolvePathFromConfig(args['compiled-map'], configDir) };
  }
  if (args.host) {
    next.server = { ...(next.server || {}), host: args.host };
  }
  if (args.port) {
    next.server = { ...(next.server || {}), port: Number.parseInt(args.port, 10) };
  }
  if (args.open !== undefined) {
    next.open = toBool(args.open, true);
  }
  return next;
}

function resolveConfigPath(args) {
  if (args.config) return path.resolve(expandHome(args.config));
  return null;
}

function ensureConfigPath(configPath) {
  if (!configPath) return;
  if (!fs.existsSync(configPath)) {
    console.error(`config not found: ${configPath}`);
    process.exit(1);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const configPath = resolveConfigPath(args);
  ensureConfigPath(configPath);
  const configDir = configPath ? path.dirname(configPath) : process.cwd();
  const baseConfig = configPath ? loadConfig(DEFAULT_CONFIG, configPath) : { ...DEFAULT_CONFIG };
  const config = applyOverrides(baseConfig, args, configDir);

  if (toBool(args['print-effective-config'], false)) {
    console.log(JSON.stringify(config, null, 2));
  }

  const host = config.server?.host || '127.0.0.1';
  const port = config.server?.port || 8093;
  startServer(config);

  if (toBool(config.open, true)) {
    const url = `http://${host}:${port}`;
    openBrowser(url);
  }
}

main();
