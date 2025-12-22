// modbus-sync-worksites.js
//
// Synchronize RDS worksites (FILLED / EMPTY) based on Modbus discrete inputs.
// Implementation using jsmodbus + explicit net.Socket management.
//
// Założenia:
// - jedno połączenie TCP na sterownik (grupę),
// - przy każdym błędzie czytania lub łączenia zamykamy socket i klienta,
// - reconnect tylko po backoffie,
// - debounce per worksite względem stanu domyślnego,
// - DEBUG_LOG steruje gadatliwością logów (debug vs tylko błędy).

const { APIClient } = require("./api-client");
const Modbus = require("jsmodbus");
const net = require("net");

// --- DEBUG LOGGING -----------------------------------------------------------

const DEBUG_LOG = false;

function dlog(...args) {
  if (DEBUG_LOG) console.log(...args);
}

// --- GLOBAL ERROR HANDLERS ---------------------------------------------------

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err && err.stack ? err.stack : err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err && err.stack ? err.stack : err);
});

// --- RDS CONFIG --------------------------------------------------------------

const RDS_HOST = "http://127.0.0.1:8080";
const RDS_USER = "admin";
const RDS_PASS = "123456";
const RDS_LANG = "en";

// Throttling logów błędów RDS – nie spamujemy co pętlę
const RDS_ERROR_LOG_THROTTLE_MS = 5000; // min przerwa między kolejnymi logami błędów RDS
let rdsLastErrorTime = 0;

// Ile kolejnych błędów RDS tolerujemy zanim zrobimy twardy exit (opcjonalnie)
const ENABLE_RDS_FATAL_ON_ERRORS = true;
const RDS_MAX_CONSECUTIVE_ERRORS = 200;
let rdsConsecutiveErrors = 0;

// --- MODBUS CONFIG -----------------------------------------------------------

// Timeout socketu (ms) – NIE ZMIENIAMY
const MODBUS_SOCKET_TIMEOUT_MS = 1000;

// Jak często wykonujemy pełny sync (ms)
const POLL_INTERVAL_MS = 500;

// Backoff pomiędzy próbami reconnectu (ms)
const RECONNECT_BACKOFF_MS = 5000;

// Ile kolejnych błędów Modbus tolerujemy zanim zrobimy twardy exit (opcjonalnie)
const ENABLE_MODBUS_FATAL_ON_ERRORS = true;
const MODBUS_MAX_CONSECUTIVE_ERRORS = 100;

// --- DEBOUNCE CONFIG ---------------------------------------------------------

const FILL_DEBOUNCE_MS = 2000;

// --- LOGICAL STATES ----------------------------------------------------------

const EMPTY  = "EMPTY";
const FILLED = "FILLED";

// --- WORKSITE -> MODBUS MAPPING ---------------------------------------------
//
// offset = adres wejścia dyskretnego (bit).
//
// default:
//   - stan przy błędach komunikacji,
//   - stan bazowy dla debounca (zawsze do niego wracamy, jeśli sygnał nie jest stabilnie przeciwny).

const SITES = [
  { siteId: "PICK-01", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  0, default: EMPTY },
  { siteId: "PICK-02", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  1, default: EMPTY },
  { siteId: "PICK-03", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  2, default: EMPTY },
  { siteId: "PICK-04", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  3, default: EMPTY },
  { siteId: "PICK-05", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  4, default: EMPTY },
  { siteId: "PICK-06", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  5, default: EMPTY },
  { siteId: "PICK-07", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  6, default: EMPTY },
  { siteId: "PICK-08", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  7, default: EMPTY },
  { siteId: "PICK-09", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  8, default: EMPTY },
  { siteId: "PICK-10", ip: "10.6.44.70", port: 502, slaveId: 255, offset:  9, default: EMPTY },
  { siteId: "PICK-11", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 10, default: EMPTY },
  { siteId: "PICK-12", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 11, default: EMPTY },
  { siteId: "PICK-13", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 12, default: EMPTY },
  { siteId: "PICK-14", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 13, default: EMPTY },
  { siteId: "PICK-15", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 14, default: EMPTY },
  { siteId: "PICK-16", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 15, default: EMPTY },
];

// --- CONFIG VALIDATION -------------------------------------------------------

function validateConfig() {
  const ids = new Set();
  for (const s of SITES) {
    if (!s.siteId || typeof s.siteId !== "string") {
      throw new Error(`Invalid siteId in SITES: ${JSON.stringify(s)}`);
    }
    if (ids.has(s.siteId)) {
      throw new Error(`Duplicate siteId in SITES: ${s.siteId}`);
    }
    ids.add(s.siteId);

    if (!Number.isInteger(s.offset) || s.offset < 0) {
      throw new Error(`Invalid offset for ${s.siteId}: ${s.offset}`);
    }

    if (![EMPTY, FILLED].includes(s.default)) {
      throw new Error(`Invalid default state for ${s.siteId}: ${s.default}`);
    }
  }
}

validateConfig();

// --- GROUP SITES BY MODBUS CONNECTION ---------------------------------------
//
// group = { key, ip, port, slaveId, sites[], minOffset, length }

function groupSitesByConnection(sites) {
  const map = new Map();

  for (const s of sites) {
    const key = `${s.ip}:${s.port}:${s.slaveId}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        ip: s.ip,
        port: s.port,
        slaveId: s.slaveId,
        sites: [],
        minOffset: s.offset,
        maxOffset: s.offset,
      };
      map.set(key, g);
    }
    g.sites.push(s);
    if (s.offset < g.minOffset) g.minOffset = s.offset;
    if (s.offset > g.maxOffset) g.maxOffset = s.offset;
  }

  return Array.from(map.values()).map((g) => ({
    key: g.key,
    ip: g.ip,
    port: g.port,
    slaveId: g.slaveId,
    sites: g.sites,
    minOffset: g.minOffset,
    length: g.maxOffset - g.minOffset + 1,
  }));
}

const GROUPS = groupSitesByConnection(SITES);

// --- MODBUS CONNECTION STATE -------------------------------------------------
//
// modbusConnections[group.key] = {
//   socket: net.Socket | null,
//   client: Modbus.client.TCP | null,
//   lastAttemptMs: number
// }

const modbusConnections = new Map();

// Ile kolejnych błędów Modbus na grupę
const modbusConsecutiveErrors = new Map();

// --- DEBOUNCE STATE PER WORKSITE --------------------------------------------
//
// debounceStates[siteId] = {
//   lastOppositeStartTs: number | null,
//   effectiveVal: boolean (true=FILLED, false=EMPTY)
// }

const debounceStates = new Map();

// --- HELPERS -----------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultToBool(def) {
  return def === FILLED;
}

function nowMs() {
  return Date.now();
}

// Update debounced value for one site.
// rawVal = raw sensor bit (true/false).
function updateDebouncedState(site, rawVal, now) {
  const siteId     = site.siteId;
  const defaultVal = defaultToBool(site.default);
  const opposite   = !defaultVal;

  let st = debounceStates.get(siteId);
  if (!st) {
    st = { lastOppositeStartTs: null, effectiveVal: defaultVal };
    debounceStates.set(siteId, st);
  }

  if (rawVal === defaultVal) {
    // Sensor agrees with default -> immediately back to default.
    st.lastOppositeStartTs = null;
    st.effectiveVal = defaultVal;
  } else {
    // Sensor suggests opposite state.
    if (st.lastOppositeStartTs === null) {
      // First time we see opposite signal.
      st.lastOppositeStartTs = now;
      st.effectiveVal = defaultVal; // still default until delay passes
    } else if (now - st.lastOppositeStartTs >= FILL_DEBOUNCE_MS) {
      // Opposite signal held long enough -> accept change.
      st.effectiveVal = opposite;
    }
  }

  return st.effectiveVal;
}

function resetDebounceForSites(sites) {
  for (const s of sites) {
    debounceStates.delete(s.siteId);
  }
}

// Extract boolean array of discrete inputs from jsmodbus response.
function extractInputsFromResponse(resp) {
  if (!resp || !resp.response) return null;
  const body = resp.response.body || resp.response._body;
  if (!body) return null;
  if (Array.isArray(body.valuesAsArray)) return body.valuesAsArray;
  if (Array.isArray(body._valuesAsArray)) return body._valuesAsArray;
  return null;
}

// --- RDS ERROR LOGGING WITH THROTTLING + COUNTER ----------------------------

function logRdsError(message) {
  const now = nowMs();
  rdsConsecutiveErrors++;

  if (rdsLastErrorTime === 0 || now - rdsLastErrorTime >= RDS_ERROR_LOG_THROTTLE_MS) {
    console.error(
      `${message} (consecutive RDS errors: ${rdsConsecutiveErrors})`
    );
    rdsLastErrorTime = now;
  } else {
    dlog(`[RDS] Suppressed repeated error: ${message}`);
  }

  if (ENABLE_RDS_FATAL_ON_ERRORS && rdsConsecutiveErrors >= RDS_MAX_CONSECUTIVE_ERRORS) {
    console.error(
      `[RDS] Too many consecutive errors (${rdsConsecutiveErrors}). ` +
      `Exiting process so systemd can restart the service.`
    );
    process.exit(1);
  }
}

// --- MODBUS ERROR COUNTER ----------------------------------------------------

function registerModbusError(groupKey) {
  const prev = modbusConsecutiveErrors.get(groupKey) || 0;
  const next = prev + 1;
  modbusConsecutiveErrors.set(groupKey, next);
  return next;
}

function resetModbusError(groupKey) {
  modbusConsecutiveErrors.set(groupKey, 0);
}

// --- SAFE CLOSE OF SOCKET + CLIENT ------------------------------------------
//
// Hard-close connection for given group, so PLC clearly sees client gone.

async function safeCloseConnection(groupKey) {
  const state = modbusConnections.get(groupKey);
  if (!state || !state.socket) return;

  const socket = state.socket;

  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      state.socket = null;
      state.client = null;
      state.lastAttemptMs = nowMs();
      dlog(`[Modbus] Closed connection for group ${groupKey}`);
      resolve();
    };

    try {
      socket.end(() => {
        finish();
      });
      // Fallback in case 'end' callback is not called.
      setTimeout(finish, 200);
    } catch (_) {
      finish();
    }
  });
}

// --- CREATE CONNECTION FOR GROUP --------------------------------------------

async function ensureConnectionForGroup(group) {
  let state = modbusConnections.get(group.key);
  const now = nowMs();

  if (!state) {
    state = { socket: null, client: null, lastAttemptMs: 0 };
    modbusConnections.set(group.key, state);
  }

  // If we already have a client, nothing to do.
  if (state.client && state.socket) {
    return { state, status: "ok" };
  }

  const sinceLast = now - state.lastAttemptMs;
  if (state.lastAttemptMs !== 0 && sinceLast < RECONNECT_BACKOFF_MS) {
    // Backoff in progress.
    dlog(
      `[Modbus] Group ${group.key}: reconnect backoff ${sinceLast}ms < ${RECONNECT_BACKOFF_MS}ms`
    );
    return { state, status: "backoff" };
  }

  state.lastAttemptMs = now;

  // Create new socket + client.
  const socket = new net.Socket();

  // Ustawiamy timeout na socket – ale obsługujemy go jawnie w promisie connect.
  socket.setTimeout(MODBUS_SOCKET_TIMEOUT_MS);

  socket.on("close", (hadError) => {
    dlog(`[Modbus] Socket closed for group ${group.key} (hadError=${hadError})`);
  });

  const client = new Modbus.client.TCP(socket, group.slaveId);

  state.socket = socket;
  state.client = client;

  try {
    await new Promise((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        dlog(`[Modbus] Connected to ${group.key}`);
        resolve();
      };
      const onError = (err) => {
        cleanup();
        const msg = err && err.message ? err.message : err;
        reject(new Error(msg));
      };
      const onTimeout = () => {
        cleanup();
        dlog(`[Modbus] Socket timeout for group ${group.key} during connect`);
        reject(new Error("Socket timeout during connect"));
        socket.destroy();
      };
      const cleanup = () => {
        socket.removeListener("connect", onConnect);
        socket.removeListener("error", onError);
        socket.removeListener("timeout", onTimeout);
      };

      socket.on("connect", onConnect);
      socket.on("error", onError);
      socket.on("timeout", onTimeout);

      socket.connect(group.port, group.ip);
    });

    return { state, status: "ok" };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);

    // Connection failed -> hard close.
    await safeCloseConnection(group.key);

    return { state, status: "error", message: `connect failed: ${msg}` };
  }
}

// --- MODBUS: READ DISCRETE INPUTS FOR GROUP ---------------------------------
//
// Returns:
//   { status: "ok", inputs: boolean[] }
//   { status: "backoff" }
//   { status: "error", message: string }

async function readInputsForGroup(group) {
  const { state, status, message } = await ensureConnectionForGroup(group);

  if (status === "backoff") {
    return { status: "backoff" };
  }

  if (status === "error") {
    return { status: "error", message };
  }

  // At this point we should have a connected client.
  if (!state.client || !state.socket) {
    return {
      status: "error",
      message: "no active Modbus client/socket after ensureConnection",
    };
  }

  try {
    const startAddr  = group.minOffset;
    const readLength = group.sites.length === 1 ? 1 : group.length;

    dlog(
      `[MODBUS-REQ] ${group.key} readDiscreteInputs(addr=${startAddr}, len=${readLength})`
    );

    const resp = await state.client.readDiscreteInputs(startAddr, readLength);
    const inputs = extractInputsFromResponse(resp);

    if (!inputs) {
      return {
        status: "error",
        message: "invalid readDiscreteInputs response format",
      };
    }

    const maxAddr = startAddr + inputs.length - 1;
    dlog(
      `[MODBUS-RESP] ${group.key} len=${inputs.length} inputs[${startAddr}..${maxAddr}] =`,
      inputs
    );

    return { status: "ok", inputs };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);

    // Read failed -> hard close connection, so PLC clearly sees client gone.
    await safeCloseConnection(group.key);

    return {
      status: "error",
      message: `readDiscreteInputs failed: ${msg}`,
    };
  }
}

// --- RDS: WRITE WORKSITE STATE ----------------------------------------------
//
// filledBool: true = FILLED, false = EMPTY

async function writeWorksiteState(api, site, filledBool, context) {
  try {
    if (filledBool) {
      await api.setWorkSiteFilled(site.siteId);
    } else {
      await api.setWorkSiteEmpty(site.siteId);
    }

    // Sukces – zerujemy licznik błędów RDS.
    rdsConsecutiveErrors = 0;

    dlog(
      `[RDS] Worksite ${site.siteId} => ${filledBool ? "FILLED" : "EMPTY"} (${context})`
    );
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    logRdsError(
      `[RDS] Failed to update worksite ${site.siteId} (${context}): ${msg}`
    );
  }
}

// --- Apply default state (used on Modbus error / missing value) --------------

async function setSitesDefault(api, sites, context) {
  for (const s of sites) {
    const assumeFilled = defaultToBool(s.default);
    const why = `set to default (${s.default}) because ${context}`;
    await writeWorksiteState(api, s, assumeFilled, why);
  }
}

// --- ONE SYNC CYCLE ----------------------------------------------------------

async function syncOnce(api) {
  dlog("[SYNC] syncOnce start");

  if (!api.sessionId) {
    try {
      await api.login();
      dlog("[RDS] Initial login succeeded.");
      rdsConsecutiveErrors = 0;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      logRdsError(`[RDS] Initial login failed: ${msg}`);
      // Nie przerywamy całej pętli – Modbus może dalej działać,
      // a kolejne wywołania RDS będą nadal próbowały (ale z throttlem logowania).
    }
  }

  for (const group of GROUPS) {
    const { sites, minOffset } = group;

    const result = await readInputsForGroup(group);

    if (result.status === "backoff") {
      dlog(`[SYNC] Group ${group.key}: Modbus backoff, skipping this cycle`);
      continue;
    }

    if (result.status === "error") {
      const count = registerModbusError(group.key);

      console.error(
        `[Modbus] Group ${group.key}: communication error, using default states. ` +
        `Details: ${result.message} (consecutive Modbus errors: ${count})`
      );

      resetDebounceForSites(sites);
      await setSitesDefault(
        api,
        sites,
        `Modbus error for group ${group.key}: ${result.message}`
      );

      if (ENABLE_MODBUS_FATAL_ON_ERRORS && count >= MODBUS_MAX_CONSECUTIVE_ERRORS) {
        console.error(
          `[Modbus] Group ${group.key}: too many consecutive errors (${count}). ` +
          `Exiting process so systemd can restart the service.`
        );
        await closeAllModbusConnections();
        process.exit(1);
      }

      continue;
    }

    // status === "ok"
    resetModbusError(group.key);

    const inputs = result.inputs;

    if (!Array.isArray(inputs)) {
      console.error(
        `[Modbus] Group ${group.key}: inputs is not an array, using defaults for all sites.`
      );
      resetDebounceForSites(sites);
      await setSitesDefault(api, sites, "invalid inputs array from Modbus");
      continue;
    }

    for (const s of sites) {
      const idx = s.offset - minOffset;
      const rawVal = inputs[idx];

      if (typeof rawVal === "undefined") {
        const ctx =
          `Missing Modbus input value (idx=${idx}) for site ${s.siteId}, ` +
          `probable configuration error (offset=${s.offset}). Using default state (${s.default}).`;
        console.error(ctx);
        resetDebounceForSites([s]);
        await setSitesDefault(api, [s], ctx);
        continue;
      }

      const ts = nowMs();
      const effectiveBool = updateDebouncedState(s, !!rawVal, ts);

      dlog(
        `[DEBOUNCE] siteId=${s.siteId} raw=${!!rawVal} default=${s.default} -> debounced=${effectiveBool ? "FILLED" : "EMPTY"}`
      );

      await writeWorksiteState(
        api,
        s,
        effectiveBool,
        "based on debounced Modbus signal"
      );
    }
  }

  dlog("[SYNC] syncOnce end");
}

// --- CLEANUP ON EXIT ---------------------------------------------------------

function closeAllModbusConnections() {
  const closes = [];
  for (const [key] of modbusConnections.entries()) {
    closes.push(safeCloseConnection(key));
  }
  return Promise.all(closes);
}

process.on("SIGINT", async () => {
  console.log("SIGINT – closing Modbus connections and exiting...");
  await closeAllModbusConnections();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM – closing Modbus connections and exiting...");
  await closeAllModbusConnections();
  process.exit(0);
});

// --- MAIN LOOP ---------------------------------------------------------------

async function mainLoop() {
  const api = new APIClient(RDS_HOST, RDS_USER, RDS_PASS, RDS_LANG);

  console.log(`Starting synchronization loop (every ${POLL_INTERVAL_MS} ms)`);
  console.log(`Number of Modbus groups: ${GROUPS.length}`);

  while (true) {
    const start = nowMs();

    try {
      await syncOnce(api);
    } catch (err) {
      const msg = err && err.stack ? err.stack : err;
      console.error("Global error in syncOnce:", msg);
    }

    const elapsed = nowMs() - start;
    const wait = Math.max(POLL_INTERVAL_MS - elapsed, 0);
    if (wait > 0) {
      await sleep(wait);
    }
  }
}

// --- START -------------------------------------------------------------------

mainLoop().catch(async (err) => {
  const msg = err && err.stack ? err.stack : err;
  console.error("Fatal error in mainLoop:", msg);
  await closeAllModbusConnections();
  process.exit(1);
});
