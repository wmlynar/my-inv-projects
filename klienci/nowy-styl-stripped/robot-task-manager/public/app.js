async function checkHealth() {
  const el = document.getElementById("health-indicator");
  try {
    const resp = await fetch("/healthz");
    const data = await resp.json().catch(() => null);

    const rdsOk =
      data && typeof data.rdsOk === "boolean"
        ? data.rdsOk
        : (data && typeof data.ok === "boolean" ? data.ok : resp.ok);

    if (rdsOk) {
      el.textContent = "RDS OK";
      el.className = "health health-ok";
    } else {
      el.textContent = "RDS problem";
      el.className = "health health-bad";
    }
  } catch (_err) {
    el.textContent = "Brak odpowiedzi";
    el.className = "health health-bad";
  }
}

function formatDispatchable(row) {
  const status = row.dispatchable_status;
  const desc   = row.dispatchable_status_description || "";
  const disp   = row.dispatchable;

  if (row.connection_status === 0) {
    return { text: "OFFLINE", className: "badge badge-offline" };
  }

  if (status === 0) {
    return {
      text: "Dispatchable",
      className: disp ? "badge badge-good" : "badge badge-weird"
    };
  }
  if (status === 1) {
    return { text: "Undispatchable (online)", className: "badge badge-warn" };
  }
  if (status === 2) {
    return { text: "Undispatchable (offline)", className: "badge badge-error" };
  }
  return { text: desc || "Nieznany", className: "badge" };
}

function formatConnection(row) {
  if (row.connection_status === 1) return "Online";
  if (row.connection_status === 0) return "Offline";
  return String(row.connection_status);
}

// orderId + nazwa taska z RDS (def_label)
function formatTask(row) {
  const orderPart = row.current_order_id
    ? `${row.current_order_id} (${row.current_order_state || "?"})`
    : "—";

  const label = row.current_task_label || "";
  if (!label) return orderPart;

  const st = row.current_task_status_description || row.current_task_status || "";
  const labelPart = st ? `${label} (${st})` : label;

  return `${orderPart} | ${labelPart}`;
}

function formatStations(row) {
  const cur  = row.current_station || "";
  const last = row.last_station || "";
  if (!cur && !last) return "—";
  if (!cur) return `Last: ${last}`;
  if (!last) return `Cur: ${cur}`;
  return `Cur: ${cur}, Last: ${last}`;
}

function setStatus(message, type = "info") {
  const bar = document.getElementById("status-bar");
  if (!bar) return;
  bar.textContent = message || "";
  bar.className = `status-bar status-${type}`;
}

function createActionGroup(title) {
  const group = document.createElement("div");
  group.className = "action-group";

  const t = document.createElement("div");
  t.className = "action-title";
  t.textContent = title;

  const buttons = document.createElement("div");
  buttons.className = "action-buttons";

  group.appendChild(t);
  group.appendChild(buttons);

  return { group, buttons };
}

function createButton(text, className, onClick) {
  const b = document.createElement("button");
  b.className = className;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

async function callRobotAction(robotId, url, actionLabel, btn, opts = {}) {
  const {
    confirmText = null,
    onOkMessage = null,
    reloadAfter = true
  } = opts;

  if (!robotId) return;

  if (confirmText) {
    const ok = window.confirm(confirmText);
    if (!ok) return;
  }

  const prevText = btn.textContent;
  btn.disabled = true;
  btn.textContent = `${actionLabel}...`;

  try {
    setStatus(`${actionLabel} dla robota ${robotId}...`, "info");

    const resp = await fetch(url, { method: "POST" });
    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      throw new Error(data && data.error ? data.error : `HTTP ${resp.status}`);
    }

    const okMsg = onOkMessage ? onOkMessage(data) : `${actionLabel} OK`;
    setStatus(okMsg, "ok");

    if (reloadAfter) {
      await loadRobots();
    }

    return data;
  } catch (err) {
    console.error("[UI] action error:", err);
    setStatus(`Błąd: ${actionLabel}: ${err.message || err}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
}

async function loadRobots() {
  const tbody = document.querySelector("#robots-table tbody");
  const lastUpdateEl = document.getElementById("last-update");

  try {
    setStatus("Wczytywanie listy robotów...", "info");
    const resp = await fetch("/api/robots");
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status} ${txt}`);
    }
    const data = await resp.json();
    const robots = data.robots || [];

    tbody.innerHTML = "";

    if (!robots.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "placeholder";
      td.textContent = "Brak robotów w systemie.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      robots.forEach((row) => {
        const robotId = row.vehicle_id;
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        tdId.textContent = row.vehicle_id || "—";
        tr.appendChild(tdId);

        const tdDisp = document.createElement("td");
        const disp = formatDispatchable(row);
        const span = document.createElement("span");
        span.className = disp.className;
        span.textContent = disp.text;
        tdDisp.appendChild(span);
        tr.appendChild(tdDisp);

        const tdConn = document.createElement("td");
        tdConn.textContent = formatConnection(row);
        tr.appendChild(tdConn);

        const tdTask = document.createElement("td");
        tdTask.textContent = formatTask(row);
        tr.appendChild(tdTask);

        const tdStations = document.createElement("td");
        tdStations.textContent = formatStations(row);
        tr.appendChild(tdStations);

        // --- ACTIONS ---
        const tdActions = document.createElement("td");
        tdActions.className = "actions-cell";

        const stack = document.createElement("div");
        stack.className = "action-stack";

        // Problem przy pobieraniu
        const pick = createActionGroup("Problem przy pobieraniu");
        const btnTemp = createButton(
          "Zablokuj tymczasowo",
          "btn btn-secondary btn-sm",
          () => callRobotAction(
            robotId,
            `/api/robots/${encodeURIComponent(robotId)}/temp-block-from`,
            "TEMP-BLOCK",
            btnTemp,
            {
              onOkMessage: (d) => `TEMP-BLOCK OK (fromSite=${d?.fromSite || "-"})`
            }
          )
        );
        const btnPerm = createButton(
          "Zablokuj na stałe",
          "btn btn-danger btn-sm",
          () => callRobotAction(
            robotId,
            `/api/robots/${encodeURIComponent(robotId)}/block-from-perm`,
            "PERM-BLOCK",
            btnPerm,
            {
              confirmText:
                "Zablokować pole pobierania NA STAŁE?\n\nTo wyłączy to pole z użycia (locked) i ubije taski robota.",
              onOkMessage: (d) => `PERM-BLOCK OK (fromSite=${d?.fromSite || "-"})`
            }
          )
        );
        pick.buttons.appendChild(btnTemp);
        pick.buttons.appendChild(btnPerm);
        stack.appendChild(pick.group);

        // Problem przy jeździe
        const drive = createActionGroup("Problem przy jeździe");
        const btnStopDisable = createButton(
          "Zatrzymaj + wyłącz z ruchu",
          "btn btn-danger btn-sm",
          () => callRobotAction(
            robotId,
            `/api/robots/${encodeURIComponent(robotId)}/stop-and-disable`,
            "STOP+DISABLE",
            btnStopDisable,
            {
              confirmText:
                "Zatrzymać taski i wyłączyć robota z ruchu (undispatchable online)?\n\nRobot nie będzie dostawał nowych zadań, dopóki go nie przywrócisz na Dispatchable.",
              onOkMessage: (d) => {
                const k = d?.kill;
                if (k) return `STOP+DISABLE OK (killed ${k.succeeded}/${k.requested})`;
                return "STOP+DISABLE OK";
              }
            }
          )
        );
        drive.buttons.appendChild(btnStopDisable);
        stack.appendChild(drive.group);

        // Problem przy odkładaniu
        const put = createActionGroup("Problem przy odkładaniu");
        const btnPutDown = createButton(
          "Oznacz jako zajęte i odłóż ponownie",
          "btn btn-primary btn-sm",
          () => callRobotAction(
            robotId,
            `/api/robots/${encodeURIComponent(robotId)}/put-down`,
            "PUT-DOWN",
            btnPutDown,
            {
              onOkMessage: (d) => `PUT-DOWN OK (dispatchRestored=${d?.dispatchRestored})`
            }
          )
        );
        put.buttons.appendChild(btnPutDown);
        stack.appendChild(put.group);

        // Zaawansowane sterowanie (zwijane)
        const adv = document.createElement("details");
        adv.className = "actions-advanced";
        const summary = document.createElement("summary");
        summary.textContent = "Sterowanie: dispatchable / pauza / kontrola";
        adv.appendChild(summary);

        const dispGrp = createActionGroup("Dispatchable");
        const bD0 = createButton(
          "Dispatchable",
          "btn btn-secondary btn-sm",
          () => callRobotAction(robotId, `/api/robots/${encodeURIComponent(robotId)}/set-dispatchable`, "Dispatchable", bD0)
        );
        const bD1 = createButton(
          "Undisp. online",
          "btn btn-secondary btn-sm",
          () => callRobotAction(robotId, `/api/robots/${encodeURIComponent(robotId)}/set-undispatchable-online`, "Undisp online", bD1)
        );
        const bD2 = createButton(
          "Undisp. offline",
          "btn btn-secondary btn-sm",
          () => callRobotAction(robotId, `/api/robots/${encodeURIComponent(robotId)}/set-undispatchable-offline`, "Undisp offline", bD2)
        );
        dispGrp.buttons.appendChild(bD0);
        dispGrp.buttons.appendChild(bD1);
        dispGrp.buttons.appendChild(bD2);

        const pauseGrp = createActionGroup("Pauza");
        const bP = createButton(
          "Pauza",
          "btn btn-secondary btn-sm",
          () => callRobotAction(robotId, `/api/robots/${encodeURIComponent(robotId)}/pause`, "Pauza", bP, {
            onOkMessage: () => "Pauza OK"
          })
        );
        const bR = createButton(
          "Wznów",
          "btn btn-secondary btn-sm",
          () => callRobotAction(robotId, `/api/robots/${encodeURIComponent(robotId)}/resume`, "Wznów", bR, {
            onOkMessage: () => "Wznów OK"
          })
        );
        pauseGrp.buttons.appendChild(bP);
        pauseGrp.buttons.appendChild(bR);

        const controlGrp = createActionGroup("Kontrola");
        const bSeize = createButton(
          "Przejmij kontrolę",
          "btn btn-secondary btn-sm",
          () => callRobotAction(robotId, `/api/robots/${encodeURIComponent(robotId)}/seize-control`, "Seize control", bSeize)
        );
        const bRelease = createButton(
          "Zwolnij kontrolę",
          "btn btn-secondary btn-sm",
          () => callRobotAction(robotId, `/api/robots/${encodeURIComponent(robotId)}/release-control`, "Release control", bRelease)
        );
        controlGrp.buttons.appendChild(bSeize);
        controlGrp.buttons.appendChild(bRelease);

        adv.appendChild(dispGrp.group);
        adv.appendChild(pauseGrp.group);
        adv.appendChild(controlGrp.group);

        stack.appendChild(adv);

        tdActions.appendChild(stack);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
    }

    const now = new Date();
    if (lastUpdateEl) {
      lastUpdateEl.textContent = "Ostatnie odświeżenie: " + now.toLocaleString();
    }
    setStatus("Lista robotów odświeżona.", "ok");
  } catch (err) {
    console.error("[UI] loadRobots error:", err);
    tbody.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "placeholder placeholder-error";
    td.textContent = "Błąd pobierania listy robotów. Sprawdź logi.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    setStatus("Błąd pobierania listy robotów: " + (err.message || err), "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadRobots());
  }

  checkHealth();
  loadRobots();

  setInterval(() => {
    checkHealth();
    loadRobots();
  }, 5000);
});
