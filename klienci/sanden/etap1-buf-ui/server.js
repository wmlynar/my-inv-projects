const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const JSON5 = require("json5");

const DEFAULT_CONFIG = {
  rds: {
    host: "http://127.0.0.1:8080",
    useMock: false,
    username: "admin",
    password: "123456",
    language: "pl"
  },
  http: {
    port: 3200
  },
  ui: {
    title: "Bufory Sanden",
    showWorksiteIds: false,
    aisleLabels: {
      A2: "A2",
      A1: "A1"
    },
    aisleHints: {
      A2: "Lewa alejka",
      A1: "Prawa alejka"
    }
  },
  tabs: [
    {
      id: "empty",
      label: "Puste opakowania",
      aisles: {
        A2: ["A2_EMPTY_01", "A2_EMPTY_02", "A2_EMPTY_03", "A2_EMPTY_04", "A2_EMPTY_05", "A2_EMPTY_06"],
        A1: ["A1_EMPTY_01", "A1_EMPTY_02", "A1_EMPTY_03", "A1_EMPTY_04", "A1_EMPTY_05", "A1_EMPTY_06"]
      }
    },
    {
      id: "full",
      label: "Pelne opakowania",
      aisles: {
        A2: ["A2_FULL_01", "A2_FULL_02", "A2_FULL_03", "A2_FULL_04", "A2_FULL_05", "A2_FULL_06"],
        A1: ["A1_FULL_01", "A1_FULL_02", "A1_FULL_03", "A1_FULL_04", "A1_FULL_05", "A1_FULL_06"]
      }
    }
  ],
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

function normalizeAisleList(value, fallback) {
  const raw = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
  return raw.map((item) => (typeof item === "string" ? item : "")).filter((item) => item.length);
}

function normalizeTab(tab, fallback) {
  const t = isObject(tab) ? tab : {};
  const f = isObject(fallback) ? fallback : {};
  const fAisles = isObject(f.aisles) ? f.aisles : {};
  const tAisles = isObject(t.aisles) ? t.aisles : {};

  return {
    id: str(t.id, str(f.id, "tab")),
    label: str(t.label, str(f.label, "Tab")),
    aisles: {
      A2: normalizeAisleList(tAisles.A2, fAisles.A2),
      A1: normalizeAisleList(tAisles.A1, fAisles.A1)
    }
  };
}

function normalizeConfig(raw) {
  const cfg = isObject(raw) ? raw : {};
  const rds = isObject(cfg.rds) ? cfg.rds : {};
  const http = isObject(cfg.http) ? cfg.http : {};
  const ui = isObject(cfg.ui) ? cfg.ui : {};
  const uiAisleLabels = isObject(ui.aisleLabels) ? ui.aisleLabels : {};
  const uiAisleHints = isObject(ui.aisleHints) ? ui.aisleHints : {};
  const backend = isObject(cfg.backend) ? cfg.backend : {};

  const rawTabs = Array.isArray(cfg.tabs) && cfg.tabs.length ? cfg.tabs : DEFAULT_CONFIG.tabs;
  const fallbackTabs = DEFAULT_CONFIG.tabs;
  const tabs = rawTabs.map((tab, idx) => normalizeTab(tab, fallbackTabs[idx] || fallbackTabs[0]));

  return {
    rds: {
      host: str(rds.host, DEFAULT_CONFIG.rds.host),
      useMock: bool(rds.useMock, DEFAULT_CONFIG.rds.useMock),
      username: str(rds.username, DEFAULT_CONFIG.rds.username),
      password: str(rds.password, DEFAULT_CONFIG.rds.password),
      language: str(rds.language, DEFAULT_CONFIG.rds.language)
    },
    http: {
      port: num(http.port, DEFAULT_CONFIG.http.port)
    },
    ui: {
      title: str(ui.title, DEFAULT_CONFIG.ui.title),
      showWorksiteIds: bool(ui.showWorksiteIds, DEFAULT_CONFIG.ui.showWorksiteIds),
      aisleLabels: {
        A2: str(uiAisleLabels.A2, DEFAULT_CONFIG.ui.aisleLabels.A2),
        A1: str(uiAisleLabels.A1, DEFAULT_CONFIG.ui.aisleLabels.A1)
      },
      aisleHints: {
        A2: str(uiAisleHints.A2, DEFAULT_CONFIG.ui.aisleHints.A2),
        A1: str(uiAisleHints.A1, DEFAULT_CONFIG.ui.aisleHints.A1)
      }
    },
    tabs,
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
const RDS_LOGIN = CFG.rds.username;
const RDS_PASSWORD = CFG.rds.password;
const RDS_LANG = CFG.rds.language;

console.log("Sanden Etap1 Buf UI - konfiguracja:");
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

    console.log("Sanden Etap1 Buf UI: TRYB RDS (APIClient OK)");
  } catch (e) {
    console.warn("Sanden Etap1 Buf UI: NIE UDALO sie utworzyc APIClient - fallback na MOCK:", e);
  }
} else {
  console.log("Sanden Etap1 Buf UI: TRYB MOCK (USE_MOCK_RDS=1)");
}

const app = express();
const PORT = CFG.http.port;

app.use(bodyParser.json());
const publicDir = fs.existsSync(path.join(process.cwd(), "public"))
  ? path.join(process.cwd(), "public")
  : path.join(__dirname, "public");
app.use(express.static(publicDir));

function collectWorksiteIds(tabs) {
  const ids = new Set();
  (tabs || []).forEach((tab) => {
    const aisles = isObject(tab && tab.aisles) ? tab.aisles : {};
    ["A2", "A1"].forEach((key) => {
      const list = Array.isArray(aisles[key]) ? aisles[key] : [];
      list.forEach((id) => {
        if (typeof id === "string" && id.trim()) ids.add(id.trim());
      });
    });
  });
  return ids;
}

const ALLOWED_WORKSITE_IDS = collectWorksiteIds(CFG.tabs);
const mockStateByWorksiteId = {};
const lastKnownByWorksiteId = {};

function isAllowedWorksite(worksiteId) {
  if (!ALLOWED_WORKSITE_IDS.size) return true;
  return ALLOWED_WORKSITE_IDS.has(worksiteId);
}

function buildUiConfig() {
  return {
    ui: { ...CFG.ui },
    tabs: CFG.tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      aisles: {
        A2: [...tab.aisles.A2],
        A1: [...tab.aisles.A1]
      }
    })),
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
  console.log(`Sanden Etap1 Buf UI listening on port ${PORT}`);
  console.log(`Open: http://<server-address>:${PORT}/`);
});
