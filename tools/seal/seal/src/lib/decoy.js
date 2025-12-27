"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DECOY_MODES = new Set(["none", "soft", "wrapper"]);
const DECOY_SCOPES = new Set(["backend", "full"]);
const DECOY_GENERATORS = new Set(["off", "basic"]);

function normalizeDecoyConfig(raw) {
  if (raw === undefined || raw === null) {
    return {
      enabled: false,
      mode: "none",
      scope: "backend",
      sourceDir: "decoy",
      overwrite: false,
      generator: "off",
      seed: null,
    };
  }
  if (typeof raw === "string") {
    return normalizeDecoyConfig({ mode: raw });
  }
  if (typeof raw === "boolean") {
    return normalizeDecoyConfig({ enabled: raw });
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid build.decoy: expected string|boolean|object");
  }
  if (Object.prototype.hasOwnProperty.call(raw, "profile")) {
    throw new Error("build.decoy.profile has been removed; use build.decoy.sourceDir with AI-generated decoy files");
  }
  const enabled = raw.enabled === undefined ? null : !!raw.enabled;
  const modeRaw = raw.mode || (enabled === true ? "soft" : (enabled === false ? "none" : null));
  const mode = modeRaw ? String(modeRaw).toLowerCase() : "none";
  if (!DECOY_MODES.has(mode)) {
    throw new Error(`Invalid build.decoy.mode: ${raw.mode} (expected none|soft|wrapper)`);
  }
  const scopeRaw = raw.scope ? String(raw.scope).toLowerCase() : "backend";
  const scope = (scopeRaw === "backend-only" ? "backend" : scopeRaw);
  if (!DECOY_SCOPES.has(scope)) {
    throw new Error(`Invalid build.decoy.scope: ${raw.scope} (expected backend|full)`);
  }
  const sourceDir = raw.sourceDir !== undefined && raw.sourceDir !== null ? String(raw.sourceDir) : "decoy";
  const overwrite = raw.overwrite !== undefined
    ? !!raw.overwrite
    : (raw.overlay !== undefined ? !!raw.overlay : false);
  let generator = "off";
  if (raw.generator !== undefined) {
    if (typeof raw.generator === "boolean") {
      generator = raw.generator ? "basic" : "off";
    } else {
      generator = String(raw.generator).toLowerCase();
    }
  }
  if (!DECOY_GENERATORS.has(generator)) {
    throw new Error(`Invalid build.decoy.generator: ${raw.generator} (expected off|basic)`);
  }
  const seedRaw = raw.seed !== undefined && raw.seed !== null ? String(raw.seed) : null;
  return { enabled: mode !== "none", mode, scope, sourceDir, overwrite, generator, seed: seedRaw };
}

function buildProfile() {
  const base = {
    id: "basic",
    title: "Service Console",
    tagline: "Internal operational dashboard",
    apiPrefix: "/api",
    items: [],
    alerts: [],
    features: [],
    theme: {
      primary: "#2563eb",
      accent: "#f59e0b",
      bg: "#0f172a",
    },
  };

  base.title = "Service Console";
  base.tagline = "Internal status and API console";
  base.items = ["Overview", "Health", "Metrics", "Ops"];
  base.alerts = ["Latency elevated", "Queue delay", "Retry loop"];
  base.features = ["healthz", "status", "audit"];
  base.theme = { primary: "#1d4ed8", accent: "#f97316", bg: "#0f172a" };
  return base;
}

function renderPackageJson(title) {
  const pkg = {
    name: "service-console",
    version: "0.1.0",
    private: true,
    description: `${title} - internal service`,
    main: "server.js",
    scripts: {
      start: "node server.js",
      dev: "node server.js",
    },
    dependencies: {
      express: "^4.19.2",
      cors: "^2.8.5",
      helmet: "^7.1.0",
      compression: "^1.7.4",
      dotenv: "^16.4.5",
      morgan: "^1.10.0",
      pino: "^9.0.0",
    },
  };
  return JSON.stringify(pkg, null, 2) + "\n";
}

function renderEnvExample() {
  const port = resolvePort();
  return `PORT=${port}
LOG_LEVEL=info
APP_LISTEN=0
`;
}

function renderReadme(title) {
  return `# ${title}

Internal service for operational UI and API endpoints.

## Run (development)

\`\`\`bash
npm install
npm run dev
\`\`\`

## Configuration

- \`PORT\` (default: 3000)
- \`LOG_LEVEL\` (default: info)
- \`APP_LISTEN\` (0/1; when 0 only logs "listening" without binding)
`;
}

function resolvePort() {
  return 3000;
}

function renderConfig(profile) {
  const port = resolvePort();
  const cfg = {
    port,
    ui: {
      title: profile.title,
      theme: profile.theme,
    },
    features: profile.features,
  };
  return JSON.stringify(cfg, null, 2) + "\n";
}

function renderUiConfig(profile) {
  const cfg = {
    title: profile.title,
    tagline: profile.tagline,
    sections: profile.items,
    theme: profile.theme,
    features: profile.features,
  };
  return JSON.stringify(cfg, null, 2) + "\n";
}

function renderServerJs(profile, mode) {
  const enableNative = mode === "wrapper";
  return `const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
require("dotenv").config();
const morgan = require("morgan");
const pino = require("pino");
const { spawn } = require("child_process");

const log = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();

const configPath = path.join(__dirname, "config", "default.json");
const cfg = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
const port = Number(process.env.PORT || cfg.port || 3000);
const uiConfigPath = path.join(__dirname, "config", "ui.json");

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "256kb" }));
app.use(morgan("combined", { stream: { write: (msg) => log.info(msg.trim()) } }));
app.use("/assets", express.static(path.join(__dirname, "public")));

function statusPayload() {
  return {
    ok: true,
    service: ${JSON.stringify(profile.title)},
    now: new Date().toISOString(),
    features: ${JSON.stringify(profile.features)},
  };
}

app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/status", (_req, res) => res.json(statusPayload()));
app.get("/ui/config", (_req, res) => {
  if (!fs.existsSync(uiConfigPath)) return res.status(404).json({ ok: false });
  res.type("application/json").send(fs.readFileSync(uiConfigPath, "utf8"));
});

const api = require("./src/routes");
app.use("/api", api);

${enableNative ? `function startNativeWorker() {
  const workerPath = path.join(__dirname, "bin", "worker.js");
  if (!fs.existsSync(workerPath)) {
    log.warn({ workerPath }, "native worker missing");
    return;
  }
  const child = spawn(process.execPath, [workerPath], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, WORKER_MODE: "background" },
  });
  child.unref();
  log.info({ pid: child.pid }, "native worker started");
}

if (process.env.NATIVE_WORKER === "1") {
  startNativeWorker();
}
` : ""}

if (String(process.env.APP_LISTEN || "0") === "1") {
  app.listen(port, () => {
    log.info({ port }, "server.listen");
  });
} else {
  log.info({ port }, "server.listen (simulated)");
}
`;
}

function renderWorkerJs(profile) {
  return `const pino = require("pino");
const log = pino({ level: process.env.LOG_LEVEL || "info" });

function pulse() {
  log.info({ service: ${JSON.stringify(profile.title)} }, "worker.heartbeat");
}

setInterval(pulse, 30000).unref();
pulse();
`;
}

function hashToNumber(text) {
  const h = crypto.createHash("sha256").update(String(text)).digest();
  return h.readUInt32LE(0);
}

function renderRoutesJs(profile, sampleId) {
  const endpoints = profile.items.map((name, idx) => ({
    path: `/list/${idx + 1}`,
    label: name,
  }));
  return `const express = require("express");
const router = express.Router();
const data = require("../services/data");
const metrics = require("../services/metrics");

router.get("/overview", (_req, res) => {
  res.json({
    ok: true,
    id: ${sampleId},
    title: ${JSON.stringify(profile.title)},
    items: data.modules,
    alerts: data.alerts,
  });
});

router.get("/alerts", (_req, res) => {
  res.json({ ok: true, alerts: data.alerts });
});

router.get("/features", (_req, res) => {
  res.json({ ok: true, features: data.features });
});

router.get("/ui-config", (_req, res) => {
  res.json({
    ok: true,
    title: ${JSON.stringify(profile.title)},
    sections: data.modules,
  });
});

router.get("/ping", (_req, res) => res.json({ ok: true }));

router.get("/metrics", (_req, res) => {
  res.json({ ok: true, data: metrics.snapshot() });
});

${endpoints.map((e) => `router.get("${e.path}", (_req, res) => res.json({ label: ${JSON.stringify(e.label)} }));`).join("\n")}

module.exports = router;
`;
}

function renderPublicHtml(profile) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${profile.title}</title>
  <link rel="stylesheet" href="/assets/styles.css" />
</head>
<body>
  <div class="app">
    <header>
      <h1>${profile.title}</h1>
      <p>${profile.tagline}</p>
    </header>
    <main>
      <section class="card">
        <h2>Modules</h2>
        <ul id="modules"></ul>
      </section>
      <section class="card">
        <h2>Alerts</h2>
        <ul id="alerts"></ul>
      </section>
    </main>
  </div>
  <script type="module" src="/assets/app.mjs"></script>
</body>
</html>
`;
}

function renderPublicJs(profile) {
  return `const modules = ${JSON.stringify(profile.items)};
const alerts = ${JSON.stringify(profile.alerts)};

function fillList(id, items) {
  const root = document.getElementById(id);
  if (!root) return;
  root.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    root.appendChild(li);
  });
}

fillList("modules", modules);
fillList("alerts", alerts);

fetch("/status")
  .then((r) => r.json())
  .then((data) => {
    console.log("status", data);
  })
  .catch(() => {});

fetch("/ui/config")
  .then((r) => r.json())
  .then((data) => {
    console.log("ui-config", data);
  })
  .catch(() => {});
`;
}

function renderPublicCss(profile) {
  return `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: ${profile.theme.bg};
  color: #e2e8f0;
}
.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
}
header {
  margin-bottom: 24px;
}
h1 {
  margin: 0 0 8px;
}
.card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
ul {
  padding-left: 18px;
}
a {
  color: ${profile.theme.accent};
}
`;
}

function renderDataService(profile) {
  return `const modules = ${JSON.stringify(profile.items)};
const alerts = ${JSON.stringify(profile.alerts)};
const features = ${JSON.stringify(profile.features)};

module.exports = {
  modules,
  alerts,
  features,
};
`;
}

function renderCacheService() {
  return `const store = new Map();

function get(key) {
  return store.get(key);
}

function set(key, value) {
  store.set(key, value);
}

function del(key) {
  store.delete(key);
}

module.exports = { get, set, del };
`;
}

function renderMetricsService(profile) {
  return `const os = require("os");

function snapshot() {
  return {
    service: ${JSON.stringify(profile.title)},
    uptimeSec: Math.floor(process.uptime()),
    mem: process.memoryUsage(),
    load: os.loadavg ? os.loadavg() : [],
    ts: new Date().toISOString(),
  };
}

module.exports = { snapshot };
`;
}

function buildDecoyFiles({ appName, buildId, decoy }) {
  const profile = buildProfile();
  const sampleSeed = `${appName}:${buildId}:${profile.id}`;
  const sampleId = (hashToNumber(sampleSeed) % 9000) + 1000;
  const files = new Map();

  files.set("package.json", renderPackageJson(profile.title));
  files.set("README.md", renderReadme(profile.title));
  files.set(".env.example", renderEnvExample());
  files.set("config/default.json", renderConfig(profile));
  files.set("config/ui.json", renderUiConfig(profile));
  files.set("server.js", renderServerJs(profile, decoy.mode));
  files.set("src/routes/index.js", renderRoutesJs(profile, sampleId));
  files.set("src/services/data.js", renderDataService(profile));
  files.set("src/services/cache.js", renderCacheService());
  files.set("src/services/metrics.js", renderMetricsService(profile));
  if (decoy.scope === "full") {
    files.set("public/index.html", renderPublicHtml(profile));
    files.set("public/app.mjs", renderPublicJs(profile));
    files.set("public/styles.css", renderPublicCss(profile));
  }

  if (decoy.mode === "wrapper") {
    files.set("bin/worker.js", renderWorkerJs(profile));
  }

  return { files };
}

function normalizePathInput(root, relOrAbs) {
  if (!relOrAbs) return null;
  if (path.isAbsolute(relOrAbs)) return relOrAbs;
  return path.join(root, relOrAbs);
}

function copyDirFiltered(srcDir, dstDir, shouldCopy, rootDir) {
  if (!fs.existsSync(srcDir)) return;
  const baseRoot = rootDir || srcDir;
  fs.mkdirSync(dstDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, ent.name);
    const d = path.join(dstDir, ent.name);
    const rel = path.relative(baseRoot, s).replace(/\\/g, "/");
    if (!shouldCopy(rel, ent)) continue;
    if (ent.isDirectory()) {
      copyDirFiltered(s, d, shouldCopy, baseRoot);
    } else if (ent.isFile()) {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

function applyDecoy({ projectRoot, outDir, releaseDir, appName, buildId, decoy }) {
  const cfg = normalizeDecoyConfig(decoy);
  if (!cfg.enabled) return { enabled: false, mode: "none" };

  const sourceAbs = normalizePathInput(projectRoot, cfg.sourceDir);
  const hasSource = sourceAbs && fs.existsSync(sourceAbs);
  if (hasSource) {
    const stat = fs.statSync(sourceAbs);
    if (!stat.isDirectory()) {
      throw new Error(`Decoy sourceDir is not a directory: ${sourceAbs}`);
    }
  }

  let decoyRoot = sourceAbs;
  let source = "source";
  let decoyFiles = [];

  if (!hasSource) {
    if (cfg.generator === "off") {
      throw new Error(`Decoy sourceDir not found: ${sourceAbs}. Create it or set build.decoy.generator=basic.`);
    }
    const genRoot = path.join(outDir, "decoy", `${appName}-${buildId}`);
    fs.rmSync(genRoot, { recursive: true, force: true });
    const { files } = buildDecoyFiles({ appName, buildId, decoy: cfg });
    for (const [rel, content] of files.entries()) {
      const abs = path.join(genRoot, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content, "utf8");
    }
    decoyRoot = genRoot;
    source = "generated";
    decoyFiles = Array.from(files.keys());
  }

  const skipPublic = cfg.scope === "backend";
  const shouldCopy = (rel) => {
    if (!rel) return true;
    const top = rel.split("/")[0];
    if (skipPublic && top === "public") return false;
    return true;
  };

  if (!cfg.overwrite) {
    const conflicts = [];
    const stack = [decoyRoot];
    while (stack.length) {
      const dir = stack.pop();
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const s = path.join(dir, ent.name);
        const rel = path.relative(decoyRoot, s).replace(/\\/g, "/");
        if (!shouldCopy(rel)) continue;
        const dst = path.join(releaseDir, rel);
        if (ent.isDirectory()) {
          stack.push(s);
        } else if (ent.isFile() && fs.existsSync(dst)) {
          conflicts.push(rel);
        }
      }
    }
    if (conflicts.length) {
      const list = conflicts.map((c) => `- ${c}`).join("\n");
      throw new Error(`Decoy install blocked: release already has conflicting paths.\n${list}\nRename/remove these paths or set build.decoy.overwrite=true.`);
    }
  }

  copyDirFiltered(decoyRoot, releaseDir, shouldCopy, decoyRoot);

  return {
    enabled: true,
    mode: cfg.mode,
    scope: cfg.scope,
    source,
    sourceDir: cfg.sourceDir,
    overwrite: cfg.overwrite,
    decoyDir: decoyRoot,
    files: decoyFiles.length ? decoyFiles : undefined,
  };
}

module.exports = {
  normalizeDecoyConfig,
  applyDecoy,
};
