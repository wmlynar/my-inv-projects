const express = require("express");
const path = require("path");
require("dotenv").config();

const fetch = global.fetch || require("node-fetch");

const PORT = Number(process.env.PORT || 3000);
const RDS_API_HOST = String(process.env.RDS_API_HOST || "http://127.0.0.1:8080").replace(/\/+$/, "");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const slotToWorksite = {
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

async function rdsPost(pathname, payload) {
  const resp = await fetch(`${RDS_API_HOST}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {})
  });

  const text = await resp.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { _raw: text }; }

  if (!resp.ok) throw new Error(`RDS HTTP ${resp.status}: ${text}`);
  if (data && typeof data === "object" && "code" in data && data.code !== 200) {
    throw new Error(`RDS code=${data.code} msg=${data.msg || ""}`);
  }
  return data;
}

app.get("/api/state", async (req, res) => {
  try {
    const raw = await rdsPost("/api/work-sites/sites", {});
    const list = Array.isArray(raw?.data) ? raw.data : [];

    const bySiteId = {};
    for (const ws of list) {
      if (ws?.siteId != null) bySiteId[String(ws.siteId)] = !!ws.filled;
    }

    const slots = Object.entries(slotToWorksite).map(([slotId, siteId]) => ({
      slotId,
      filled: !!bySiteId[String(siteId)]
    }));

    res.json({ slots });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/slots/:slotId/set-filled", async (req, res) => {
  try {
    const slotId = String(req.params.slotId || "");
    const siteId = slotToWorksite[slotId];
    if (!siteId) return res.status(400).json({ error: "Unknown slotId", slotId });

    const filled = !!req.body?.filled;

    await rdsPost("/api/work-sites/updateFilledStatus", {
      siteId,
      filled: filled ? 1 : 0
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`http://127.0.0.1:${PORT}/`);
});
