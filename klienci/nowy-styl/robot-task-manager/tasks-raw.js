// tasks-raw.js
//
// Prosty skrypt do podejrzenia surowej listy tasków z RDS.
// Wypisuje JSON na stdout, żeby można było go przeanalizować albo zgrać do pliku.
//
// Użycie:
//   node tasks-raw.js
//   node tasks-raw.js > tasks-raw.json

const { APIClient } = require("./api-client");

// --- KONFIGURACJA ------------------------------------------------------------

const RDS_API_HOST = "http://localhost:8080";
const RDS_LOGIN    = "admin";
const RDS_PASSWORD = "123456";
const RDS_LANG     = "en";

// Jeżeli chcesz ograniczyć do konkretnego LABEL-a, wpisz tutaj string.
// Jeżeli ma być „wszystko”, zostaw null.
const FILTER_TASK_LABEL = null; // np. "nowy_styl_task"

// -----------------------------------------------------------------------------


// Proste logowanie – bez filozofii
function logInfo(...args) {
  console.log("[INFO]", ...args);
}
function logError(...args) {
  console.error("[ERROR]", ...args);
}

async function main() {
  const api = new APIClient(RDS_API_HOST, RDS_LOGIN, RDS_PASSWORD, RDS_LANG);

  logInfo("Connecting to RDS:");
  logInfo("  host =", RDS_API_HOST);
  logInfo("  user =", RDS_LOGIN);
  if (FILTER_TASK_LABEL) {
    logInfo("  filter taskLabel =", FILTER_TASK_LABEL);
  } else {
    logInfo("  filter taskLabel = <none> (all tasks)");
  }

  try {
    await api.login();
    logInfo("Login OK, sessionId =", api.sessionId);
  } catch (err) {
    logError("Login failed:", err && err.message ? err.message : err);
    process.exit(1);
  }

  try {
    // Możemy użyć getTasksRaw() z APIClient, żeby dostać „raw” odpowiedź z queryTaskRecord
    // (bez mapowania na ładny obiekt)
    const requestData = {
      currentPage: 1,
      pageSize: 1000000,
      queryParam: {
        taskRecordId: null,
        outOrderNo: null,
        agvId: null,
        status: null,                              // null => wszystkie statusy
        taskLabel: FILTER_TASK_LABEL,              // null => bez filtra
        startDate: null,
        endDate: null,
        ifParentOrChildOrAll: null,
        ifPeriodTask: 0,
        agvIdList: [],
        stateDescription: null
      }
    };

    logInfo("Requesting /api/queryTaskRecord ...");

    const raw = await api.apiCall("/api/queryTaskRecord", {
      method: "POST",
      body: JSON.stringify(requestData)
    });

    const count =
      raw && raw.data && Array.isArray(raw.data.pageList)
        ? raw.data.pageList.length
        : 0;

    logInfo(`Received response. Tasks count = ${count}`);
    logInfo("Printing full raw JSON below:\n");

    // Wypisujemy CAŁĄ surową odpowiedź (kod + msg + data + pageList itd.)
    console.log(JSON.stringify(raw, null, 2));
  } catch (err) {
    logError("Error while fetching tasks:", err && err.message ? err.message : err);
    process.exit(1);
  }

  try {
    await api.logout();
    logInfo("Logout OK.");
  } catch (err) {
    logError("Logout failed (ignoring):", err && err.message ? err.message : err);
  }
}

main().catch((err) => {
  logError("Fatal error in main():", err && err.stack ? err.stack : err);
  process.exit(1);
});
