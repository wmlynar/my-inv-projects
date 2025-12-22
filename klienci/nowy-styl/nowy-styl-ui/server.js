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
    port: 3000
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

  return {
    rds: {
      host: str(rds.host, DEFAULT_CONFIG.rds.host),
      useMock: bool(rds.useMock, DEFAULT_CONFIG.rds.useMock)
    },
    http: {
      port: num(http.port, DEFAULT_CONFIG.http.port)
    }
  };
}

function loadConfig() {
  const cfgPath = path.join(process.cwd(), "config.runtime.json5");
  if (!fs.existsSync(cfgPath)) {
    console.error(`[FATAL] Missing config.runtime.json5 in ${process.cwd()}.`);
    console.error("[FATAL] Copy config/<env>.json5 to config.runtime.json5 or deploy with SEAL.");
    process.exit(2);
  }
  let raw;
  try {
    raw = JSON5.parse(fs.readFileSync(cfgPath, "utf-8"));
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(`[FATAL] Invalid config.runtime.json5: ${msg}`);
    process.exit(2);
  }
  return normalizeConfig(raw);
}

const CFG = loadConfig();

const USE_MOCK_RDS = CFG.rds.useMock;
const RDS_API_HOST = CFG.rds.host;
const RDS_LOGIN = "admin";
const RDS_PASSWORD = "123456";
const RDS_LANG = "pl";

console.log("Nowy Styl UI – konfiguracja:");
console.log("  USE_MOCK_RDS =", USE_MOCK_RDS ? "1 (MOCK)" : "0 (RDS)");
console.log("  RDS_API_HOST  =", RDS_API_HOST);
// hasła nie logujemy :)

let rdsClient = null;

if (!USE_MOCK_RDS) {
  try {
    // api-client.js eksportuje obiekt { APIClient: class APIClient { ... } }
    let APIClient;
    ({ APIClient } = require("./api-client"));

    rdsClient = new APIClient(
      RDS_API_HOST,  // apiHost
      RDS_LOGIN,     // username
      RDS_PASSWORD,  // password
      RDS_LANG       // language
    );

    console.log("Nowy Styl UI: TRYB RDS (APIClient OK)");
  } catch (e) {
    console.warn("Nowy Styl UI: NIE UDAŁO się utworzyć APIClient – fallback na MOCK:", e);
  }
} else {
  console.log("Nowy Styl UI: TRYB MOCK (USE_MOCK_RDS=1)");
}

const app = express();
const PORT = CFG.http.port;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// mapowanie slotId -> siteId w RDS (częściowe na start)
const slotToSiteId = {
  A01: "DROP-01",
  A02: "DROP-02",
  A03: "DROP-03",
  A04: "DROP-04",
  A05: "DROP-05",
  A06: "DROP-06",
  A07: "DROP-07",
  A08: "DROP-08",
  A09: "DROP-09",
  A10: "DROP-10",
  A11: "DROP-11",
  A12: "DROP-12",
  A13: "DROP-13",
  A14: "DROP-14"
  // kolejne sloty dopiszemy później
};

// prosta pamięć stanu po stronie serwera (mock / fallback)
const currentFilledBySlotId = {};

// endpoint: ustawienie filled dla danego slotu
app.post("/api/slots/:slotId/set-filled", async (req, res) => {
  const slotId = req.params.slotId;
  const { filled } = req.body;

  console.log("Żądanie ustawienia slotu", slotId, "-> filled =", filled);

  const siteId = slotToSiteId[slotId];
  if (!siteId) {
    console.warn("Brak mapowania siteId dla slotId", slotId);
    return res.status(400).json({ error: "Unknown slotId", slotId });
  }

  // zapamiętaj stan po stronie serwera
  currentFilledBySlotId[slotId] = !!filled;

  // TRYB MOCK – na życzenie lub gdy brak klienta RDS
  if (USE_MOCK_RDS || !rdsClient) {
    console.log("[MOCK RDS] siteId:", siteId, "filled:", !!filled);
    return res.json({ ok: true, mock: true });
  }

  // TRYB REAL RDS – używamy metod APIClienta: setWorkSiteFilled / setWorkSiteEmpty
  try {
    if (filled) {
      console.log("[RDS] setWorkSiteFilled(", siteId, ")");
      await rdsClient.setWorkSiteFilled(siteId);
    } else {
      console.log("[RDS] setWorkSiteEmpty(", siteId, ")");
      await rdsClient.setWorkSiteEmpty(siteId);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("RDS error for", slotId, "siteId", siteId, err);
    res.status(500).json({ error: "RDS error" });
  }
});

// endpoint: stan slotów z RDS lub z mocka
app.get("/api/state", async (req, res) => {
  // MOCK lub brak klienta RDS: zwracamy tylko to, co mamy zapisane lokalnie
  if (USE_MOCK_RDS || !rdsClient) {
    const slots = Object.entries(slotToSiteId).map(([slotId]) => ({
      slotId,
      filled: !!currentFilledBySlotId[slotId]
    }));
    return res.json({ slots, source: USE_MOCK_RDS ? "mock" : "no-rds-client" });
  }

  try {
    // Używamy gotowej metody apiClienta – zwraca tablicę workSites
    const workSites = await rdsClient.getWorkSiteList();

    const slots = [];
    for (const [slotId, siteId] of Object.entries(slotToSiteId)) {
      const ws = workSites.find(
        w => w.workSiteName === siteId || w.workSiteId === siteId
      );
      slots.push({
        slotId,
        filled: ws ? !!ws.filled : false
      });
    }

    res.json({ slots, source: "rds" });
  } catch (err) {
    console.error("RDS state error", err);
    const slots = Object.entries(slotToSiteId).map(([slotId]) => ({
      slotId,
      filled: !!currentFilledBySlotId[slotId]
    }));
    res.status(500).json({ slots, source: "fallback", error: "RDS state error" });
  }
});

app.listen(PORT, () => {
  console.log(`Nowy Styl UI listening on port ${PORT}`);
  console.log(`Otwórz: http://<adres-serwera>:${PORT}/`);
});
