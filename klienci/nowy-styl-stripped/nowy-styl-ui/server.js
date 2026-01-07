const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const md5 = require("md5");

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
const RDS_API_HOST = CFG.rds.host;
const RDS_LOGIN = "admin";
const RDS_PASSWORD = "123456";
const RDS_LANG = "pl";

const API_REQUEST_TIMEOUT_MS = 5000;
let sessionId = null;

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

function encryptPassword(password) {
  return md5(password);
}

async function loginToRds() {
  const url = `${RDS_API_HOST}/admin/login`;
  const requestData = {
    username: RDS_LOGIN,
    password: encryptPassword(RDS_PASSWORD)
  };
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData)
  });
  if (!response.ok) {
    throw new Error(`Logowanie nie powiodło się: ${response.status}`);
  }
  const setCookieHeader = response.headers.get("set-cookie");
  const match = setCookieHeader && setCookieHeader.match(/JSESSIONID=([^;]+)/);
  sessionId = match ? match[1] : null;
  if (!sessionId) {
    throw new Error("Nie udało się pobrać JSESSIONID z ciasteczka.");
  }
  await response.json();
}

async function readJsonOrText(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return { json, text };
  } catch {
    return { json: null, text };
  }
}

async function apiCall(path, options = {}, allowRetry = true) {
  if (!sessionId) {
    await loginToRds();
  }
  const doRequest = async () => {
    const headers = {
      "Content-Type": "application/json",
      Language: RDS_LANG,
      ...(options.headers || {}),
      Cookie: `JSESSIONID=${sessionId}`
    };
    const url = `${RDS_API_HOST}${path}`;
    return fetchWithTimeout(url, { ...options, headers });
  };
  let response = await doRequest();
  let { json, text } = await readJsonOrText(response);
  const isInvalidSession = json && json.code === 9005;
  if (isInvalidSession && allowRetry) {
    sessionId = null;
    await loginToRds();
    response = await doRequest();
    ({ json, text } = await readJsonOrText(response));
  }
  if (!response.ok) {
    throw new Error(`Błąd wywołania API: ${response.status}, body: ${text || "<empty>"}`);
  }
  if (json !== null) {
    return json;
  }
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return null;
}

async function getWorkSiteList() {
  const responseJson = await apiCall("/api/work-sites/sites", {
    method: "POST",
    body: JSON.stringify({})
  });
  const sites = Array.isArray(responseJson?.data) ? responseJson.data : [];
  return sites.map((site) => ({
    workSiteId: site.id,
    workSiteName: site.siteId,
    filled: site.filled === 1,
    locked: site.locked === 1,
    lockedBy: site.lockedBy || "",
    content: site.content || "",
    groupName: site.groupName || "",
    tags: site.tags || "",
    displayName: site.siteName || ""
  }));
}

async function setWorkSiteFilled(worksiteName) {
  return apiCall("/api/work-sites/worksiteFiled", {
    method: "POST",
    body: JSON.stringify({ workSiteIds: [worksiteName] })
  });
}

async function setWorkSiteEmpty(worksiteName) {
  return apiCall("/api/work-sites/worksiteUnFiled", {
    method: "POST",
    body: JSON.stringify({ workSiteIds: [worksiteName] })
  });
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
  const { filled } = req.body;
  const siteId = slotToSiteId[slotId];
  if (!siteId) {
    return res.status(400).json({ error: "Unknown slotId", slotId });
  }
  currentFilledBySlotId[slotId] = !!filled;
  if (USE_MOCK_RDS || !rdsEnabled) {
    return res.json({ ok: true, mock: true });
  }
  try {
    if (filled) {
      await setWorkSiteFilled(siteId);
    } else {
      await setWorkSiteEmpty(siteId);
    }
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
    const workSites = await getWorkSiteList();
    const slots = [];
    for (const [slotId, siteId] of Object.entries(slotToSiteId)) {
      const ws = workSites.find(
        (w) => w.workSiteName === siteId || w.workSiteId === siteId
      );
      slots.push({
        slotId,
        filled: ws ? !!ws.filled : false
      });
    }
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
