# Jednolite uruchamianie całego stacku (jedna komenda) + wspólne logi

Ten dokument opisuje konkretną implementację „launcher’a” stacku Fleet Managera: jedna komenda uruchamia wiele usług (UI / Gateway / Core / opcjonalnie Algo), czeka na ich gotowość (health-check), scala logi na ekran i zapisuje je do plików.

> Cel: wejść do root repo i wykonać `node bin/fleet.js up`.

---

## TL;DR

```bash
node bin/fleet.js up
```

Profil „mock” (UI + Core bez osobnego gateway):

```bash
node bin/fleet.js up --profile=mock
```

Własny katalog danych:

```bash
node bin/fleet.js up --data-dir ./.fleet_data
```

Własny katalog logów:

```bash
node bin/fleet.js up --logs-dir ./.fleet_data/logs
```

Bez auto-init:

```bash
node bin/fleet.js up --no-init
```

---

## 1) Minimalne porządki w konfiguracji (żeby „full stack” był spójny)

W repo widać lekką niespójność: `fleet-core.local.json5` wskazuje `gateway.baseUrl` na `8091` (UI), a „prawdziwy” gateway stoi na `8081`.

Jeśli chcesz mieć pełny łańcuch:

**Core → Gateway → UI (provider internalSim)**

ustaw w konfiguracji core:

**`apps/fleet-core/configs/fleet-core.local.json5`**

```json
"gateway": {
  "baseUrl": "http://127.0.0.1:8081"
}
```

Gateway może nadal wskazywać na UI-simulator (np. `http://127.0.0.1:8091`) – to sensowny układ.

> Uwaga: jeśli pliki z rozszerzeniem `.json5` faktycznie używają składni JSON5 (niecytowane klucze, apostrofy), to do poprawnego działania potrzeba prawdziwego parsera JSON5 (np. biblioteka `json5`). W przeciwnym razie start „algo” potrafi polecieć na `JSON.parse()`.

---

## 2) Dodaj launcher: `bin/fleet.js`

Dodaj w root repo plik `bin/fleet.js`.

**`bin/fleet.js`** (wklej 1:1)

```js
#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const os = require('os');
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

function nowStamp() {
  // HH:mm:ss.mmm
  const d = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  const pad3 = (n) => String(n).padStart(3, '0');
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
}

function ansi(colorCode, text) {
  return `\u001b[${colorCode}m${text}\u001b[0m`;
}

const LABEL_COLORS = [36, 35, 34, 33, 32, 31, 90, 92, 94, 96];
function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
}

function resolveRepoRoot() {
  return path.resolve(__dirname, '..');
}

function resolveDataDir(args) {
  const repoRoot = resolveRepoRoot();
  const argDir = args['data-dir'];
  const envDir = process.env.FLEET_DATA_DIR;
  const base = argDir || envDir || path.join(repoRoot, '.fleet_data');
  return path.resolve(expandHome(base));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function httpGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve({ statusCode: res.statusCode || 0 }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });
  });
}

async function waitForHttpOk(url, { timeoutMs = 15000, intervalMs = 250 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const res = await httpGet(url, 1000);
      if (res.statusCode >= 200 && res.statusCode < 300) return true;
      lastErr = new Error(`HTTP ${res.statusCode}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  const msg = lastErr ? (lastErr.message || String(lastErr)) : 'unknown';
  throw new Error(`Service not ready: ${url} (${msg})`);
}

function hookLogs({ name, child, logDir }) {
  const label = name.padEnd(10, ' ').slice(0, 10);
  const colored = ansi(colorFor(name), label);

  const combinedPath = logDir ? path.join(logDir, 'stack.log') : null;
  const servicePath = logDir ? path.join(logDir, `${name}.log`) : null;

  const combinedStream = combinedPath ? fs.createWriteStream(combinedPath, { flags: 'a' }) : null;
  const serviceStream = servicePath ? fs.createWriteStream(servicePath, { flags: 'a' }) : null;

  function writeLine(isErr, line) {
    const ts = nowStamp();
    const stream = isErr ? process.stderr : process.stdout;
    stream.write(`${ts} ${colored} ${line}\n`);

    const raw = `${new Date().toISOString()} ${name} ${isErr ? 'stderr' : 'stdout'} ${line}\n`;
    if (combinedStream) combinedStream.write(raw);
    if (serviceStream) serviceStream.write(raw);
  }

  const out = readline.createInterface({ input: child.stdout });
  out.on('line', (line) => writeLine(false, line));

  const err = readline.createInterface({ input: child.stderr });
  err.on('line', (line) => writeLine(true, line));

  child.on('close', () => {
    if (combinedStream) combinedStream.end();
    if (serviceStream) serviceStream.end();
  });
}

function spawnService({ name, cwd, cmd, args, env, logDir }) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  hookLogs({ name, child, logDir });
  return child;
}

async function runInitIfNeeded({ dataDir }) {
  const configDir = path.join(dataDir, 'config');
  const need = [
    path.join(configDir, 'fleet-core.local.json5'),
    path.join(configDir, 'fleet-gateway.local.json5')
  ];

  const missing = need.filter((p) => !exists(p));
  if (!missing.length) return;

  console.log(`[fleet] missing config files -> running fleet-init into ${dataDir}`);
  ensureDir(dataDir);

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(resolveRepoRoot(), 'bin', 'fleet-init.js'), '--data-dir', dataDir], {
      cwd: resolveRepoRoot(),
      env: { ...process.env, FLEET_DATA_DIR: dataDir },
      stdio: 'inherit'
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`fleet-init failed with exit code ${code}`));
    });
  });
}

function printHelp() {
  console.log([
    'Usage:',
    '  node bin/fleet.js up [--profile mock|full] [--data-dir <path>] [--logs-dir <path>] [--no-init]',
    '',
    'Profiles:',
    '  mock  - UI + Core (Core talks to UI mock gateway)',
    '  full  - UI + Gateway + Core (recommended default full stack)',
    '',
    'Examples:',
    '  node bin/fleet.js up',
    '  node bin/fleet.js up --profile=mock',
    '  node bin/fleet.js up --data-dir ./.fleet_data --logs-dir ./.fleet_data/logs'
  ].join('\n'));
}

async function up() {
  const args = parseArgs(process.argv.slice(2));
  const profile = String(args.profile || 'full').trim();
  const dataDir = resolveDataDir(args);
  const doInit = !toBool(args['no-init'], false);

  const logsDirArg = args['logs-dir'];
  const logDir = logsDirArg
    ? path.resolve(expandHome(logsDirArg))
    : path.join(dataDir, 'logs');

  ensureDir(logDir);

  if (doInit) {
    await runInitIfNeeded({ dataDir });
  }

  const repoRoot = resolveRepoRoot();
  const configDir = path.join(dataDir, 'config');

  const servicesByProfile = {
    mock: [
      {
        name: 'ui',
        cwd: path.join(repoRoot, 'apps', 'fleet-ui'),
        cmd: process.execPath,
        args: ['server.js'],
        env: { PORT: '8091', HOST: '0.0.0.0' },
        readyUrl: 'http://127.0.0.1:8091/'
      },
      {
        name: 'core',
        cwd: path.join(repoRoot, 'apps', 'fleet-core'),
        cmd: process.execPath,
        args: ['cli/cli.js', '--config', path.join(configDir, 'fleet-core.local.json5')],
        env: { FLEET_DATA_DIR: dataDir },
        readyUrl: 'http://127.0.0.1:8080/api/v1/health'
      }
    ],
    full: [
      {
        name: 'ui',
        cwd: path.join(repoRoot, 'apps', 'fleet-ui'),
        cmd: process.execPath,
        args: ['server.js'],
        env: { PORT: '8091', HOST: '0.0.0.0' },
        readyUrl: 'http://127.0.0.1:8091/'
      },
      {
        name: 'gateway',
        cwd: path.join(repoRoot, 'apps', 'fleet-gateway'),
        cmd: process.execPath,
        args: ['cli/cli.js', '--config', path.join(configDir, 'fleet-gateway.local.json5')],
        env: { FLEET_DATA_DIR: dataDir },
        readyUrl: 'http://127.0.0.1:8081/gateway/v1/health'
      },
      {
        name: 'core',
        cwd: path.join(repoRoot, 'apps', 'fleet-core'),
        cmd: process.execPath,
        args: ['cli/cli.js', '--config', path.join(configDir, 'fleet-core.local.json5')],
        env: { FLEET_DATA_DIR: dataDir },
        readyUrl: 'http://127.0.0.1:8080/api/v1/health'
      }
      // opcjonalnie algo (po naprawie JSON5)
      // {
      //   name: 'algo',
      //   cwd: path.join(repoRoot, 'apps', 'algorithm-service'),
      //   cmd: process.execPath,
      //   args: ['cli/cli.js', '--config', path.join(configDir, 'algo.local.json5')],
      //   env: { FLEET_DATA_DIR: dataDir },
      //   readyUrl: 'http://127.0.0.1:8082/algo/v1/health'
      // }
    ]
  };

  const services = servicesByProfile[profile];
  if (!services) {
    console.error(`[fleet] unknown profile: ${profile}`);
    printHelp();
    process.exit(2);
  }

  console.log(`[fleet] profile=${profile}`);
  console.log(`[fleet] dataDir=${dataDir}`);
  console.log(`[fleet] logsDir=${logDir}`);

  const children = [];
  let shuttingDown = false;

  const killAll = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children) {
      try {
        child.kill('SIGTERM');
      } catch {}
    }
    setTimeout(() => {
      for (const child of children) {
        try {
          child.kill('SIGKILL');
        } catch {}
      }
    }, 2000).unref();
  };

  process.on('SIGINT', () => {
    console.log('\n[fleet] SIGINT -> stopping stack...');
    killAll();
  });
  process.on('SIGTERM', () => {
    console.log('\n[fleet] SIGTERM -> stopping stack...');
    killAll();
  });

  for (const svc of services) {
    const child = spawnService({ ...svc, logDir });
    children.push(child);

    child.on('exit', (code, signal) => {
      if (shuttingDown) return;
      const why = signal ? `signal=${signal}` : `exit=${code}`;
      console.error(`[fleet] service "${svc.name}" stopped (${why}) -> stopping stack`);
      killAll();
      process.exitCode = code && code !== 0 ? code : 1;
    });

    if (svc.readyUrl) {
      try {
        await waitForHttpOk(svc.readyUrl, { timeoutMs: 15000, intervalMs: 250 });
        console.log(`[fleet] ready: ${svc.name} (${svc.readyUrl})`);
      } catch (err) {
        console.error(`[fleet] failed to start: ${svc.name} -> ${err.message}`);
        killAll();
        process.exit(1);
      }
    }
  }

  console.log('[fleet] stack is up (Ctrl+C to stop)');
  await new Promise(() => {});
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'up';
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp();
    process.exit(0);
  }
  if (cmd !== 'up') {
    console.error(`[fleet] unknown command: ${cmd}`);
    printHelp();
    process.exit(2);
  }
  up().catch((err) => {
    console.error(`[fleet] fatal: ${err.stack || err.message || String(err)}`);
    process.exit(1);
  });
}

main();
```

Opcjonalnie na Linux/macOS:

```bash
chmod +x bin/fleet.js
```

---

## 3) Jak to zbiera logi ze wszystkich modułów?

Launcher uruchamia moduły jako **child processy** i:

- czyta `stdout` i `stderr` każdego procesu
- dzieli strumień na linie (readline)
- dopisuje prefiks: `HH:mm:ss.mmm <service>`
- wypisuje na ekran
- równolegle zapisuje:
  - `logs/stack.log` – wszystko razem
  - `logs/<service>.log` – osobny plik per usługa

Przykład na ekranie:

```
12:41:03.112 ui         Server listening on 0.0.0.0:8091
12:41:03.401 gateway    listening on 0.0.0.0:8081
12:41:03.622 core       listening on 0.0.0.0:8080
```

---

## 4) Co to daje „produkcyjnie” już na MVP

- **Jedna komenda** uruchamia stack.
- **Wspólne logi** ułatwiają debug: widzisz timeline cross-service.
- **Health-check**: jeśli usługa nie wstanie, launcher wywala błąd i sprząta resztę.
- **Graceful stop**: Ctrl+C gasi wszystkie usługi.
- **Auto-init**: jeśli brakuje configów w `FLEET_DATA_DIR`, odpala `fleet-init`.

---

## 5) Minimalny plan dalszego dopracowania

- Zrobić `up`/`down`/`status`.
- Dodać kontrolę konfliktu portów (preflight).
- Dodać restart policy (np. restartuj UI, ale nie core).
- Zrobić ustrukturyzowane logi (JSON lines) i ładny „pretty print” po stronie launchera.
- Naprawić wspieranie JSON5 (biblioteka `json5`) – szczególnie pod algo.

