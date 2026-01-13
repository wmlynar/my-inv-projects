#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadConfig } = require('../lib/config');
const { resolveArtifacts, ensureArtifacts, runValidation, startServer } = require('../server');
const { spawn } = require('child_process');

const DEFAULT_CONFIG = {
  server: { host: '127.0.0.1', port: 8092 },
  artifacts: { dir: './compiled' },
  open: true,
  validate: false,
  viewer: { cellsMinZoom: 1.4, labelMinZoom: 1.0 }
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

function resolveFleetDataDir() {
  const envDir = process.env.FLEET_DATA_DIR;
  const baseDir = envDir ? expandHome(envDir) : path.join(os.homedir(), 'fleet_data');
  return path.resolve(baseDir);
}

function resolveConfigPath(args) {
  if (args.config) return path.resolve(expandHome(args.config));
  if (process.env.FLEET_CONFIG) return path.resolve(expandHome(process.env.FLEET_CONFIG));
  return path.join(resolveFleetDataDir(), 'config', 'visualizer.local.json5');
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

function resolveArtifactsFromConfig(config, configDir) {
  if (!config.artifacts) return config;
  return {
    ...config,
    artifacts: {
      ...config.artifacts,
      dir: resolvePathFromConfig(config.artifacts.dir, configDir),
      sceneGraph: resolvePathFromConfig(config.artifacts.sceneGraph, configDir),
      compiledMap: resolvePathFromConfig(config.artifacts.compiledMap, configDir),
      meta: resolvePathFromConfig(config.artifacts.meta, configDir),
      compareDir: resolvePathFromConfig(config.artifacts.compareDir, configDir)
    }
  };
}

function printHelp() {
  const text = [
    'Usage: map-compiler-visualizer --dir ./compiled [options]',
    '',
    'Options:',
    '  --dir <path>                    Directory with sceneGraph.json + compiledMap.json',
    '  --scene-graph <path>            Override path to sceneGraph.json',
    '  --compiled-map <path>           Override path to compiledMap.json',
    '  --meta <path>                   Override path to meta.json',
    '  --compare-dir <path>            Optional directory for diff view',
    '  --host <host>                   Server host (default 127.0.0.1)',
    '  --port <port>                   Server port (default 8092)',
    '  --open <true|false>             Open browser after start (default true)',
    '  --validate <true|false>         Validate artifacts and write report.json',
    '  --cells-min-zoom <float>        Cells render threshold (default 1.4)',
    '  --label-min-zoom <float>        Node label threshold (default 1.0)',
    '  --config <path>                 JSON5 config file',
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

function applyOverrides(config, args) {
  const next = { ...config };
  if (args.dir) {
    next.artifacts = { ...(next.artifacts || {}), dir: args.dir };
  }
  if (args['scene-graph']) {
    next.artifacts = { ...(next.artifacts || {}), sceneGraph: args['scene-graph'] };
  }
  if (args['compiled-map']) {
    next.artifacts = { ...(next.artifacts || {}), compiledMap: args['compiled-map'] };
  }
  if (args.meta) {
    next.artifacts = { ...(next.artifacts || {}), meta: args.meta };
  }
  if (args['compare-dir']) {
    next.artifacts = { ...(next.artifacts || {}), compareDir: args['compare-dir'] };
  }
  if (args.host) {
    next.server = { ...(next.server || {}), host: args.host };
  }
  if (args.port) {
    next.server = { ...(next.server || {}), port: Number.parseInt(args.port, 10) };
  }
  if (args.open !== undefined) {
    next.open = toBool(args.open, next.open);
  }
  if (args.validate !== undefined) {
    next.validate = toBool(args.validate, next.validate);
  }
  if (args['cells-min-zoom']) {
    next.viewer = { ...(next.viewer || {}), cellsMinZoom: toNumber(args['cells-min-zoom'], next.viewer?.cellsMinZoom) };
  }
  if (args['label-min-zoom']) {
    next.viewer = { ...(next.viewer || {}), labelMinZoom: toNumber(args['label-min-zoom'], next.viewer?.labelMinZoom) };
  }
  return next;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const configPath = resolveConfigPath(args);
  ensureConfigPath(configPath);
  const configDir = path.dirname(configPath);
  let baseConfig = loadConfig(DEFAULT_CONFIG, configPath);
  baseConfig = resolveArtifactsFromConfig(baseConfig, configDir);
  const config = applyOverrides(baseConfig, args);

  if (toBool(args['print-effective-config'], false)) {
    console.log(JSON.stringify(config, null, 2));
  }

  try {
    const paths = resolveArtifacts(config);
    ensureArtifacts(paths);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (config.validate) {
    let report = null;
    try {
      report = runValidation(resolveArtifacts(config));
    } catch (err) {
      console.error(`validation failed: ${err.message}`);
      process.exit(2);
    }
    if (!report.ok) {
      console.error(`validation errors: ${report.errors.length}`);
      process.exit(2);
    }
  }

  const { server } = startServer(config);

  const host = config.server?.host || '127.0.0.1';
  const port = config.server?.port || 8092;
  if (config.open) {
    openBrowser(`http://${host}:${port}/`);
  }

  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

main();
