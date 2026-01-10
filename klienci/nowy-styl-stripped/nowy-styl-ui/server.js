const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const PROD_CONFIG = {
  rds: {
    host: "http://127.0.0.1:8080",
    useMock: false
  },
  http: {
    port: 3000
  }
};

const CFG = PROD_CONFIG;

function readBuildId() {
  const candidates = [
    path.join(process.cwd(), "version.json"),
    path.join(__dirname, "version.json"),
    path.join(process.cwd(), "package.json")
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const raw = fs.readFileSync(candidate, "utf-8");
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        return data.buildId || data.build_id || data.build || data.version || null;
      }
    } catch {
    }
  }
  return null;
}

const BUILD_ID = readBuildId();
const USE_MOCK_RDS = CFG.rds.useMock;
const RDS_API_HOST = String(CFG.rds.host || "").replace(/\/+$/, "");
const API_REQUEST_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === "AbortError") {
      const e = new Error(`Request timeout after ${API_REQUEST_TIMEOUT_MS}ms`);
      e.code = "ETIMEDOUT";
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function rdsPost(pathname, payload) {
  const resp = await fetchWithTimeout(`${RDS_API_HOST}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {})
  });

  const text = await resp.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }

  if (!resp.ok) throw new Error(`RDS HTTP ${resp.status}: ${text}`);
  if (data && typeof data === "object" && "code" in data && data.code !== 200) {
    throw new Error(`RDS code=${data.code} msg=${data.msg || ""}`);
  }
  return data;
}

const rdsEnabled = !USE_MOCK_RDS;
const app = express();
const PORT = CFG.http.port;
app.use(bodyParser.json());
const publicDir = fs.existsSync(path.join(process.cwd(), "public"))
  ? path.join(process.cwd(), "public")
  : path.join(__dirname, "public");
app.use(express.static(publicDir));
app.get("/api/status", (req, res) => {
  res.json({ ok: true, buildId: BUILD_ID, ts: Date.now() });
});
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
};
const currentFilledBySlotId = {};
app.post("/api/slots/:slotId/set-filled", async (req, res) => {
  const slotId = req.params.slotId;
  const filled = !!req.body?.filled;
  const siteId = slotToSiteId[slotId];
  if (!siteId) {
    return res.status(400).json({ error: "Unknown slotId", slotId });
  }
  currentFilledBySlotId[slotId] = !!filled;
  if (USE_MOCK_RDS || !rdsEnabled) {
    return res.json({ ok: true, mock: true });
  }
  try {
    await rdsPost("/api/work-sites/updateFilledStatus", {
      siteId,
      filled: filled ? 1 : 0
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("RDS error for", slotId, "siteId", siteId, err);
    res.status(500).json({ error: "RDS error" });
  }
});
app.get("/api/state", async (req, res) => {
  if (USE_MOCK_RDS || !rdsEnabled) {
    const slots = Object.entries(slotToSiteId).map(([slotId]) => ({
      slotId,
      filled: !!currentFilledBySlotId[slotId]
    }));
    return res.json({
      slots,
      source: USE_MOCK_RDS ? "mock" : "no-rds-client",
      rdsOk: !!USE_MOCK_RDS
    });
  }
  try {
    const raw = await rdsPost("/api/work-sites/sites", {});
    const list = Array.isArray(raw?.data) ? raw.data : [];
    const bySiteId = {};
    for (const ws of list) {
      if (ws?.siteId != null) bySiteId[String(ws.siteId)] = !!ws.filled;
    }
    const slots = Object.entries(slotToSiteId).map(([slotId, siteId]) => ({
      slotId,
      filled: !!bySiteId[String(siteId)]
    }));
    res.json({ slots, source: "rds", rdsOk: true });
  } catch (err) {
    console.error("RDS state error", err);
    const slots = Object.entries(slotToSiteId).map(([slotId]) => ({
      slotId,
      filled: !!currentFilledBySlotId[slotId]
    }));
    res.status(500).json({
      slots,
      source: "fallback",
      rdsOk: false,
      error: "RDS state error"
    });
  }
});
app.listen(PORT);
