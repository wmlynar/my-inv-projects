#!/usr/bin/env node
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const readline = require('readline');

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
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return input;
}

function resolveDataDir(args) {
  const argDir = args['data-dir'];
  const envDir = process.env.FLEET_DATA_DIR;
  const baseDir = argDir || envDir || path.join(os.homedir(), 'fleet_data');
  return path.resolve(expandHome(baseDir));
}

function resolveLogsDir(args, dataDir) {
  const argDir = args['logs-dir'];
  if (argDir) return path.resolve(expandHome(argDir));
  return path.join(dataDir, 'logs');
}

function resolveStackFile(args, rootDir) {
  const argFile = args['stack'];
  if (argFile) return path.resolve(expandHome(argFile));
  return path.join(rootDir, 'fleet-stack.json');
}

function nowStamp() {
  const d = new Date();
  const pad2 = (value) => String(value).padStart(2, '0');
  const pad3 = (value) => String(value).padStart(3, '0');
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function substitute(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => vars[key] ?? '');
}

async function isPortFree(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function waitForReady(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            resolve();
            return;
          }
          reject(new Error(`status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1500, () => req.destroy(new Error('timeout')));
      });
      return true;
    } catch (_err) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return false;
}

function attachLogger(stream, name, logStream, level) {
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    const prefix = `[${nowStamp()}] [${name}]${level ? ` ${level}` : ''}`;
    const output = `${prefix} ${line}`;
    console.log(output);
    if (logStream) logStream.write(`${output}\n`);
  });
  return rl;
}

async function run() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const command = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'up';
  if (command !== 'up') {
    console.log('Usage: node bin/fleet.js up [--profile full|mock] [--data-dir <dir>] [--logs-dir <dir>] [--no-init]');
    process.exit(1);
  }

  const rootDir = path.resolve(__dirname, '..');
  const dataDir = resolveDataDir(args);
  const logsDir = resolveLogsDir(args, dataDir);
  const stackFile = resolveStackFile(args, rootDir);
  const profileName = args.profile || 'full';
  const skipInit = toBool(args['no-init'], false);

  if (!fs.existsSync(stackFile)) {
    console.error(`[fleet] stack config not found: ${stackFile}`);
    process.exit(1);
  }

  if (!skipInit) {
    const initResult = spawn('node', [path.join(rootDir, 'bin', 'fleet-init.js'), '--data-dir', dataDir], {
      stdio: 'inherit'
    });
    await new Promise((resolve) => initResult.on('exit', resolve));
  }

  fs.mkdirSync(logsDir, { recursive: true });
  const logFile = path.join(logsDir, 'stack.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  const stackConfig = readJson(stackFile);
  const services = stackConfig?.profiles?.[profileName];
  if (!Array.isArray(services) || !services.length) {
    console.error(`[fleet] profile "${profileName}" not found in ${stackFile}`);
    process.exit(1);
  }

  const configDir = path.join(dataDir, 'config');
  const vars = { dataDir, configDir, logsDir };

  const resolvedServices = services.map((svc) => {
    const cwd = path.resolve(rootDir, svc.cwd || '.');
    const argsList = (svc.args || []).map((arg) => substitute(String(arg), vars));
    const env = { ...process.env };
    const svcEnv = svc.env || {};
    Object.keys(svcEnv).forEach((key) => {
      env[key] = substitute(String(svcEnv[key]), vars);
    });
    return {
      ...svc,
      cwd,
      args: argsList,
      env,
      readyUrl: svc.readyUrl ? substitute(String(svc.readyUrl), vars) : null
    };
  });

  const portsToCheck = resolvedServices
    .map((svc) => {
      if (!svc.readyUrl) return null;
      try {
        const url = new URL(svc.readyUrl);
        return { host: url.hostname, port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)) };
      } catch (_err) {
        return null;
      }
    })
    .filter(Boolean);

  for (const { host, port } of portsToCheck) {
    const free = await isPortFree(host, port);
    if (!free) {
      console.error(`[fleet] port ${host}:${port} is already in use`);
      process.exit(1);
    }
  }

  const children = [];
  const stopAll = () => {
    children.forEach((child) => {
      if (child.killed) return;
      child.kill('SIGTERM');
    });
  };

  process.on('SIGINT', () => {
    console.log('[fleet] shutting down');
    stopAll();
  });
  process.on('SIGTERM', () => {
    console.log('[fleet] shutting down');
    stopAll();
  });

  for (const svc of resolvedServices) {
    console.log(`[fleet] starting ${svc.name} (${svc.cmd} ${svc.args.join(' ')})`);
    const child = spawn(svc.cmd, svc.args, {
      cwd: svc.cwd,
      env: svc.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    children.push(child);
    attachLogger(child.stdout, svc.name, logStream, '');
    attachLogger(child.stderr, svc.name, logStream, 'err');
    child.on('exit', (code) => {
      console.log(`[fleet] ${svc.name} exited with code ${code}`);
      stopAll();
    });
    if (svc.readyUrl) {
      const ok = await waitForReady(svc.readyUrl, 15000);
      if (!ok) {
        console.error(`[fleet] ${svc.name} failed readiness check: ${svc.readyUrl}`);
        stopAll();
        process.exit(1);
      }
      console.log(`[fleet] ${svc.name} ready (${svc.readyUrl})`);
    }
  }

  console.log(`[fleet] stack ready (profile: ${profileName})`);
  console.log(`[fleet] logs: ${logFile}`);
}

run().catch((err) => {
  console.error(`[fleet] failed: ${err?.message || err}`);
  process.exit(1);
});
