#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadConfig } = require('../lib/config');
const { parseSmap } = require('../lib/smap_parser');
const { buildCompiledMap, normalizeSceneGraph } = require('../lib/compiler');
const { loadRobotProfile } = require('../lib/robot_profile');

const DEFAULT_CONFIG = {
  compilerVersion: 'map-compiler-0.0.0',
  compileParams: {
    cellLenM: 0.5,
    arcLutStepM: 0.1,
    sweepSampleStepM: 0.25,
    geomEpsM: 0.000001,
    maxRectsPerCell: 32
  },
  robotProfile: null
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
  return path.join(resolveFleetDataDir(), 'config', 'compiler.local.json5');
}

function ensureConfigPath(configPath) {
  if (fs.existsSync(configPath)) return;
  console.error(`config not found: ${configPath}`);
  console.error('Run: node bin/fleet-init.js');
  process.exit(1);
}

function printHelp() {
  const text = [
    'Usage:',
    '  map-compiler compile --smap <path> --out-dir <dir> [options]',
    '',
    'Options:',
    '  --smap <path>                  Path to .smap file',
    '  --out-dir <dir>                Output directory for artifacts',
    '  --robot-profile <path>         Optional robot profile',
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

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function resolveRobotProfilePath(config, configDir) {
  if (!config.robotProfile || path.isAbsolute(config.robotProfile)) {
    return config;
  }
  const cwdPath = path.resolve(config.robotProfile);
  if (fs.existsSync(cwdPath)) {
    return config;
  }
  const configPath = path.resolve(configDir, config.robotProfile);
  if (fs.existsSync(configPath)) {
    return { ...config, robotProfile: configPath };
  }
  return config;
}

function resolvePathFromConfig(value, configDir) {
  if (!value || path.isAbsolute(value)) return value;
  return path.resolve(configDir, value);
}

function compile(options, config) {
  const smap = options.smap || config.smap;
  const outDir = options['out-dir'] || config.outDir;
  requireValue('smap', smap);
  requireValue('out-dir', outDir);

  const robotProfilePath = options['robot-profile'] || config.robotProfile;
  if (!robotProfilePath) {
    console.error('missing --robot-profile (or config.robotProfile)');
    process.exit(1);
  }

  const { profile: robotProfile, model: robotModel, path: resolvedProfile } =
    loadRobotProfile(robotProfilePath);
  if (!robotModel) {
    console.error(`invalid robot profile: ${robotProfilePath}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  let sceneGraph = null;
  try {
    sceneGraph = normalizeSceneGraph(parseSmap(smap), config.compileParams);
  } catch (err) {
    console.error(`failed to parse smap: ${err.message}`);
    process.exit(1);
  }
  const compiledMap = buildCompiledMap(sceneGraph, {
    smapPath: smap,
    robotModel,
    compileParams: config.compileParams
  });
  const meta = {
    compilerVersion: config.compilerVersion || 'map-compiler-0.0.0',
    source: smap,
    robotProfile: resolvedProfile,
    compileParams: config.compileParams,
    robotModel,
    compiledMapHash: compiledMap?.meta?.compiledMapHash || null,
    paramsHash: compiledMap?.meta?.paramsHash || null,
    compiledTsMs: Date.now(),
    status: 'compiled'
  };
  const sceneGraphPath = path.join(outDir, 'sceneGraph.json');
  const compiledMapPath = path.join(outDir, 'compiledMap.json');
  const metaPath = path.join(outDir, 'meta.json');
  writeJson(sceneGraphPath, sceneGraph);
  writeJson(compiledMapPath, compiledMap);
  writeJson(metaPath, meta);
  console.log(
    JSON.stringify(
      {
        ok: true,
        outDir,
        meta,
        inputs: { smapPath: smap, robotProfile: resolvedProfile },
        outputs: { sceneGraphPath, compiledMapPath, metaPath }
      },
      null,
      2
    )
  );
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const { command, options } = parsed;

  if (options.help || !command) {
    printHelp();
    process.exit(command ? 0 : 1);
  }

  const resolvedConfigPath = resolveConfigPath(options);
  ensureConfigPath(resolvedConfigPath);
  const configDir = path.dirname(resolvedConfigPath);
  let config = loadConfig(DEFAULT_CONFIG, resolvedConfigPath);
  config = {
    ...config,
    smap: resolvePathFromConfig(config.smap, configDir),
    outDir: resolvePathFromConfig(config.outDir, configDir)
  };
  config = resolveRobotProfilePath(config, configDir);

  if (toBool(options['print-effective-config'], false)) {
    console.log(JSON.stringify(config, null, 2));
  }

  if (command !== 'compile') {
    console.error(`unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  compile(options, config);
}

main();
