#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

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

function expandHome(input) {
  if (!input) return input;
  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function resolveDataDir(args) {
  const argDir = args['data-dir'];
  const envDir = process.env.FLEET_DATA_DIR;
  const baseDir = argDir || envDir || path.join(os.homedir(), 'fleet_data');
  return path.resolve(expandHome(baseDir));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(sourcePath, destPath, force) {
  if (fs.existsSync(destPath) && !force) {
    return { status: 'skipped', destPath };
  }
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(sourcePath, destPath);
  return { status: fs.existsSync(destPath) ? 'copied' : 'failed', destPath };
}

function listConfigTemplates(appsDir) {
  const entries = fs.readdirSync(appsDir, { withFileTypes: true });
  const templates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configDir = path.join(appsDir, entry.name, 'configs');
    if (!fs.existsSync(configDir)) continue;
    if (!fs.statSync(configDir).isDirectory()) continue;
    const files = fs.readdirSync(configDir);
    for (const file of files) {
      if (!file.endsWith('.json5')) continue;
      templates.push({ module: entry.name, sourcePath: path.join(configDir, file), fileName: file });
    }
  }
  return templates;
}

function printHelp() {
  const text = [
    'Usage: node bin/fleet-init.js [--data-dir <path>] [--force]',
    '',
    'Options:',
    '  --data-dir <path>     Override FLEET_DATA_DIR (default: ~/fleet_data)',
    '  --force               Overwrite existing files',
    '  --help                Show help'
  ];
  console.log(text.join('\n'));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const force = toBool(args.force, false);
  const dataDir = resolveDataDir(args);
  const configDir = path.join(dataDir, 'config');
  const mapsDir = path.join(dataDir, 'maps');
  const compiledDir = path.join(dataDir, 'compiled');
  const scenesDir = path.join(dataDir, 'scenes');
  const exportsDir = path.join(dataDir, 'exports');
  const coreEventsDir = path.join(dataDir, 'core', 'events');
  const coreSnapshotsDir = path.join(dataDir, 'core', 'snapshots');
  const gatewayDir = path.join(dataDir, 'gateway');

  [
    configDir,
    mapsDir,
    compiledDir,
    scenesDir,
    exportsDir,
    coreEventsDir,
    coreSnapshotsDir,
    gatewayDir
  ].forEach(ensureDir);

  const rootDir = path.resolve(__dirname, '..');
  const templates = listConfigTemplates(path.join(rootDir, 'apps'));
  const seenNames = new Set();
  let copied = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const template of templates) {
    if (seenNames.has(template.fileName)) {
      conflicts += 1;
      console.warn(`[fleet-init] duplicate config name "${template.fileName}" from ${template.module}, skipping`);
      continue;
    }
    seenNames.add(template.fileName);
    const result = copyFile(template.sourcePath, path.join(configDir, template.fileName), force);
    if (result.status === 'copied') copied += 1;
    else skipped += 1;
  }

  const mapSources = ['sanden_smalll.smap', 'sanden_smalll_17_58.smap'];
  for (const mapName of mapSources) {
    const sourcePath = path.join(rootDir, 'maps', mapName);
    if (!fs.existsSync(sourcePath)) continue;
    const result = copyFile(sourcePath, path.join(mapsDir, mapName), force);
    if (result.status === 'copied') copied += 1;
    else skipped += 1;
  }

  console.log(`[fleet-init] dataDir: ${dataDir}`);
  console.log(`[fleet-init] configDir: ${configDir}`);
  console.log(`[fleet-init] copied: ${copied}, skipped: ${skipped}, conflicts: ${conflicts}`);
}

main();
