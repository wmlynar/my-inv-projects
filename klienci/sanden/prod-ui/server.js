const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const JSON5 = require("json5");

const DEFAULT_CONFIG = {
  rds: {
    host: "http://127.0.0.1:8080",
    useMock: false
  },
  http: {
    port: 3100
  },
  lineId: "A1",
  ui: {
    title: "Linia A1",
    showWorksiteIds: false,
    flipLeftRight: false
  },
  labels: {
    p1Bring: "Przywolaj puste opakowanie",
    p1Remove: "Zabierz puste opakowanie",
    p3Remove: "Zabierz pelne opakowanie"
  },
  worksites: {
    p1Bring: "A1_P1_BRING",
    p1Remove: "A1_P1_REMOVE",
    p3Remove: "A1_P3_REMOVE"
  },
  backend: {
    pollMs: 500,
    statusPollMs: 1000,
    fetchTimeoutMs: 2500,
    localUpdateGraceMs: 500,
    reloadOnReconnect: true
  }
};

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function str(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeConfig(raw) {
  const cfg = isObject(raw) ? raw : {};
  const rds = isObject(cfg.rds) ? cfg.rds : {};
  const http = isObject(cfg.http) ? cfg.http : {};
  const ui = isObject(cfg.ui) ? cfg.ui : {};
  const labels = isObject(cfg.labels) ? cfg.labels : {};
  const worksites = isObject(cfg.worksites) ? cfg.worksites : {};
  const backend = isObject(cfg.backend) ? cfg.backend : {};

  return {
    rds: {
      host: str(rds.host, DEFAULT_CONFIG.rds.host),
      useMock: bool(rds.useMock, DEFAULT_CONFIG.rds.useMock)
    },
    http: {
      port: num(http.port, DEFAULT_CONFIG.http.port)
    },
    lineId: str(cfg.lineId, DEFAULT_CONFIG.lineId),
    ui: {
      title: str(ui.title, DEFAULT_CONFIG.ui.title),
      showWorksiteIds: bool(ui.showWorksiteIds, DEFAULT_CONFIG.ui.showWorksiteIds),
      flipLeftRight: bool(ui.flipLeftRight, DEFAULT_CONFIG.ui.flipLeftRight)
    },
    labels: {
      p1Bring: str(labels.p1Bring, DEFAULT_CONFIG.labels.p1Bring),
      p1Remove: str(labels.p1Remove, DEFAULT_CONFIG.labels.p1Remove),
      p3Remove: str(labels.p3Remove, DEFAULT_CONFIG.labels.p3Remove)
    },
    worksites: {
      p1Bring: str(worksites.p1Bring, DEFAULT_CONFIG.worksites.p1Bring),
      p1Remove: str(worksites.p1Remove, DEFAULT_CONFIG.worksites.p1Remove),
      p3Remove: str(worksites.p3Remove, DEFAULT_CONFIG.worksites.p3Remove)
    },
    backend: {
      pollMs: num(backend.pollMs, DEFAULT_CONFIG.backend.pollMs),
      statusPollMs: num(backend.statusPollMs, DEFAULT_CONFIG.backend.statusPollMs),
      fetchTimeoutMs: num(backend.fetchTimeoutMs, DEFAULT_CONFIG.backend.fetchTimeoutMs),
      localUpdateGraceMs: num(backend.localUpdateGraceMs, DEFAULT_CONFIG.backend.localUpdateGraceMs),
      reloadOnReconnect: bool(backend.reloadOnReconnect, DEFAULT_CONFIG.backend.reloadOnReconnect)
    }
  };
}

function resolveRuntimeConfigPath() {
  const candidates = [];
  if (process.env.SEAL_RUNTIME_CONFIG) candidates.push(process.env.SEAL_RUNTIME_CONFIG);
  candidates.push(path.join(process.cwd(), "seal-out", "runtime", "config.runtime.json5"));
  candidates.push(path.join(process.cwd(), "config.runtime.json5"));
  for (const cand of candidates) {
    if (cand && fs.existsSync(cand)) return cand;
  }
  return null;
}

function loadConfig() {
  const cfgPath = resolveRuntimeConfigPath();
  if (!cfgPath) {
    console.error("[FATAL] Missing runtime config.");
    console.error("[FATAL] Dev: set SEAL_RUNTIME_CONFIG=./seal-out/runtime/config.runtime.json5 (or run via seal run-local).");
    console.error("[FATAL] Sealed: copy seal-config/configs/<env>.json5 to ./config.runtime.json5 in release dir.");
    process.exit(2);
  }
  let raw;
  try {
    raw = JSON5.parse(fs.readFileSync(cfgPath, "utf-8"));
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(`[FATAL] Invalid runtime config (${cfgPath}): ${msg}`);
    process.exit(2);
  }
  return normalizeConfig(raw);
}

const CFG = loadConfig();

function readBuildId() {
  if (typeof __SEAL_BUILD_ID__ !== "undefined") {
    return __SEAL_BUILD_ID__;
  }
  try {
    const raw = fs.readFileSync(path.join(__dirname, "version.json"), "utf-8");
    const data = JSON.parse(raw);
    return data.buildId || data.build_id || data.build || null;
  } catch {
    return null;
  }
}

const BUILD_ID = readBuildId();

const USE_MOCK_RDS = CFG.rds.useMock;
const RDS_API_HOST = CFG.rds.host;
const RDS_LOGIN = "admin";
const RDS_PASSWORD = "123456";
const RDS_LANG = "pl";

console.log("Sanden Prod UI - konfiguracja:");
console.log("  USE_MOCK_RDS =", USE_MOCK_RDS ? "1 (MOCK)" : "0 (RDS)");
console.log("  RDS_API_HOST  =", RDS_API_HOST);

let rdsClient = null;
let lastRdsOk = USE_MOCK_RDS;

if (!USE_MOCK_RDS) {
  try {
    let APIClient;
    ({ APIClient } = require("./api-client"));

    rdsClient = new APIClient(
      RDS_API_HOST,
      RDS_LOGIN,
      RDS_PASSWORD,
      RDS_LANG
    );

    console.log("Sanden Prod UI: TRYB RDS (APIClient OK)");
  } catch (e) {
    console.warn("Sanden Prod UI: NIE UDALO sie utworzyc APIClient - fallback na MOCK:", e);
  }
} else {
  console.log("Sanden Prod UI: TRYB MOCK (USE_MOCK_RDS=1)");
}

const app = express();
const PORT = CFG.http.port;

app.use(bodyParser.json());
const publicDir = fs.existsSync(path.join(process.cwd(), "public"))
  ? path.join(process.cwd(), "public")
  : path.join(__dirname, "public");
app.use(express.static(publicDir));

const ALLOWED_WORKSITE_IDS = new Set(
  Object.values(CFG.worksites || {}).filter((value) => typeof value === "string" && value.trim())
);

const mockStateByWorksiteId = {};
const lastKnownByWorksiteId = {};

function isAllowedWorksite(worksiteId) {
  if (!ALLOWED_WORKSITE_IDS.size) return true;
  return ALLOWED_WORKSITE_IDS.has(worksiteId);
}

function buildUiConfig() {
  return {
    lineId: CFG.lineId,
    ui: { ...CFG.ui },
    labels: { ...CFG.labels },
    worksites: { ...CFG.worksites },
    backend: { ...CFG.backend }
  };
}

app.get("/api/ui-config", (req, res) => {
  res.json(buildUiConfig());
});

app.get("/api/status", (req, res) => {
  const rdsOk = USE_MOCK_RDS ? true : !!lastRdsOk;
  res.json({ ok: true, rdsOk, buildId: BUILD_ID, ts: Date.now() });
});

app.get("/api/worksites", async (req, res) => {
  const idsRaw = typeof req.query.ids === "string" ? req.query.ids : "";
  const ids = idsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids.length) {
    return res.status(400).json({ error: "Missing ids parameter" });
  }

  const invalidId = ids.find((id) => !isAllowedWorksite(id));
  if (invalidId) {
    return res.status(400).json({ error: "Unknown worksiteId", worksiteId: invalidId });
  }

  if (USE_MOCK_RDS || !rdsClient) {
    const items = ids.map((id) => ({
      worksiteId: id,
      filled: !!mockStateByWorksiteId[id]
    }));
    lastRdsOk = !!USE_MOCK_RDS;
    return res.json({ items, source: USE_MOCK_RDS ? "mock" : "no-rds-client", rdsOk: !!USE_MOCK_RDS });
  }

  try {
    const workSites = await rdsClient.getWorkSiteList();
    const stateById = new Map();

    for (const ws of workSites) {
      if (ws.workSiteName) stateById.set(ws.workSiteName, !!ws.filled);
      if (ws.workSiteId) stateById.set(ws.workSiteId, !!ws.filled);
    }

    const items = ids.map((id) => ({
      worksiteId: id,
      filled: !!stateById.get(id)
    }));

    for (const item of items) {
      lastKnownByWorksiteId[item.worksiteId] = item.filled;
    }

    lastRdsOk = true;
    res.json({ items, source: "rds", rdsOk: true });
  } catch (err) {
    console.error("RDS worksite state error", err);
    const items = ids.map((id) => ({
      worksiteId: id,
      filled: !!lastKnownByWorksiteId[id]
    }));
    lastRdsOk = false;
    res.status(500).json({ items, source: "fallback", rdsOk: false, error: "RDS state error" });
  }
});

app.post("/api/worksites/:worksiteId/set-filled", async (req, res) => {
  const worksiteId = req.params.worksiteId;
  const filled = !!(req.body && req.body.filled);

  if (!isAllowedWorksite(worksiteId)) {
    return res.status(400).json({ error: "Unknown worksiteId", worksiteId });
  }

  if (USE_MOCK_RDS || !rdsClient) {
    mockStateByWorksiteId[worksiteId] = filled;
    lastKnownByWorksiteId[worksiteId] = filled;
    lastRdsOk = !!USE_MOCK_RDS;
    return res.json({ ok: true, worksiteId, filled, source: USE_MOCK_RDS ? "mock" : "no-rds-client" });
  }

  try {
    if (filled) {
      await rdsClient.setWorkSiteFilled(worksiteId);
    } else {
      await rdsClient.setWorkSiteEmpty(worksiteId);
    }
    lastKnownByWorksiteId[worksiteId] = filled;
    lastRdsOk = true;
    res.json({ ok: true, worksiteId, filled, source: "rds" });
  } catch (err) {
    console.error("RDS worksite update error", worksiteId, err);
    lastRdsOk = false;
    res.status(503).json({ ok: false, worksiteId, filled, error: "RDS update error" });
  }
});

app.listen(PORT, () => {
  console.log(`Sanden Prod UI listening on port ${PORT}`);
  console.log(`Open: http://<server-address>:${PORT}/`);
});
