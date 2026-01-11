(() => {
  const formatAgeLabel = (value) => {
    if (!Number.isFinite(value)) return "--";
    if (value < 1000) return `${Math.round(value)}ms`;
    return `${(value / 1000).toFixed(1)}s`;
  };

  const formatRobotActivity = (robot, isRemote) => {
    if (robot.blocked) {
      if (robot.activity) {
        const normalized = String(robot.activity);
        const key = normalized.toLowerCase();
        const blockedLabels = {
          blocked_obstacle: "Blocked by obstacle",
          blocked_pick: "Pick blocked",
          blocked_no_route: "No route",
          blocked_collision: "Collision",
          blocked: "Blocked"
        };
        if (blockedLabels[key]) {
          return blockedLabels[key];
        }
      }
      return "Blocked";
    }
    if (isRemote) {
      if (robot.taskStatus === 3) return "Paused";
      if (robot.activity) {
        const normalized = String(robot.activity);
        const activityMap = {
          manual_move: "Manual: Enroute",
          manual_action: "Manual: Action",
          manual_idle: "Manual idle",
          manual_override: "Manual override",
          manual_drive: "Manual drive",
          to_pick: "To pick",
          picking: "Picking",
          to_drop: "To drop",
          dropping: "Dropping",
          to_park: "Parking",
          reroute_drop: "Rerouting drop",
          blocked_pick: "Pick blocked",
          blocked_obstacle: "Blocked by obstacle",
          blocked_collision: "Collision",
          blocked: "Blocked",
          idle: "Idle",
          in_progress: "In progress"
        };
        const key = normalized.toLowerCase();
        return activityMap[key] || normalized;
      }
      if (robot.taskStatus === 2) return "In progress";
    }
    if (robot.activity) return robot.activity;
    if (robot.manualMode) return "Manual idle";
    return "Idle";
  };

  const formatRobotDiagnosticsBadge = (diagnostics) => {
    if (!diagnostics) {
      return { label: "--", className: "clear" };
    }
    const reasonLabels = {
      no_motion: "Brak ruchu",
      no_updates: "Brak aktualizacji",
      blocked_obstacle: "Blokada: przeszkoda",
      blocked_no_route: "Blokada: brak trasy",
      blocked_pick: "Blokada: pobranie",
      blocked_collision: "Kolizja",
      blocked: "Blokada",
      paused: "Pauza",
      yield: "Ustepuje",
      avoidance: "Omijanie",
      avoidance_hold: "Hold omijania",
      avoidance_zone: "Strefa omijania",
      node_lock: "Blokada wezla",
      edge_lock: "Blokada krawedzi",
      reservation_wait: "Czeka na rezerwacje",
      reservation_entry: "Czeka na wjazd",
      traffic: "Zablokowany ruchem",
      traffic_overlap: "Kolizja (overlap)",
      action_wait: "Czeka na akcje",
      manual: "Manual",
      stuck: "Stuck",
      offline: "Offline",
      idle: "Idle",
      moving: "Ruch"
    };
    const baseLabel = reasonLabels[diagnostics.reason] || diagnostics.reason || "--";
    let label = baseLabel;
    if (
      (diagnostics.reason === "reservation_wait" || diagnostics.reason === "reservation_entry") &&
      diagnostics.detail?.waitMs
    ) {
      label = `${baseLabel} ${formatAgeLabel(diagnostics.detail.waitMs)}`;
      if (diagnostics.detail?.conflict?.holder) {
        label = `${label} vs ${diagnostics.detail.conflict.holder}`;
      }
    }
    if (
      (diagnostics.reason === "traffic" || diagnostics.reason === "traffic_overlap") &&
      diagnostics.detail?.blockingId
    ) {
      label = `${baseLabel} vs ${diagnostics.detail.blockingId}`;
    }
    if (diagnostics.reason === "edge_lock" && diagnostics.detail?.holder) {
      label = `${baseLabel} vs ${diagnostics.detail.holder}`;
    }
    const ageMs = Number.isFinite(diagnostics.since) ? Date.now() - diagnostics.since : null;
    if (
      diagnostics.state === "stalled" ||
      diagnostics.state === "holding" ||
      diagnostics.state === "stale" ||
      diagnostics.state === "offline"
    ) {
      if (Number.isFinite(ageMs)) {
        label = `${label} · ${formatAgeLabel(ageMs)}`;
      }
    }
    let className = "clear";
    if (diagnostics.state === "stalled") {
      className = "stalled";
    } else if (diagnostics.state === "holding") {
      className = "holding";
    } else if (diagnostics.state === "stale" || diagnostics.state === "offline") {
      className = "stale";
    }
    return { label, className };
  };

  const init = ({ elements = {}, state = {}, handlers = {} } = {}) => {
    const { robotsList, faultRobotSelect } = elements;
    const getRobots = state.getRobots || (() => []);
    const getDiagnostics = state.getDiagnostics || (() => null);
    const isRobokitSim = state.isRobokitSim || (() => false);
    const isRemoteSim = state.isRemoteSim || (() => false);
    let actionsBound = false;

    const syncFaultRobotSelect = () => {
      if (!faultRobotSelect) return;
      const robots = getRobots();
      const current = faultRobotSelect.value;
      faultRobotSelect.innerHTML = robots
        .map((robot) => `<option value="${robot.id}">${robot.name}</option>`)
        .join("");
      if (current && robots.some((robot) => robot.id === current)) {
        faultRobotSelect.value = current;
        return;
      }
      if (robots[0]) {
        faultRobotSelect.value = robots[0].id;
      }
    };

    const handleRobotActionClick = (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const id = button.dataset.id;
      if (!id) return;
      const action = button.dataset.action;
      if (handlers.onAction) {
        handlers.onAction(action, id);
      }
    };

    const bindRobotActions = () => {
      if (actionsBound || !robotsList) return;
      robotsList.addEventListener("click", handleRobotActionClick);
      actionsBound = true;
    };

    const render = () => {
      if (!robotsList) return;
      const robots = getRobots();
      if (!robots.length) {
        robotsList.innerHTML = "<div class=\"card\">Brak robotow.</div>";
        syncFaultRobotSelect();
        return;
      }
      const robokitMode = isRobokitSim();
      const remote = isRemoteSim();
      const rows = robots
        .map((robot) => {
          const remotePaused = robot.taskStatus === 3;
          const remoteActive = robot.taskStatus === 2 || robot.taskStatus === 3;
          const isNavigating = remoteActive;
          const pauseLabel = remotePaused ? "Wznow" : "Pauzuj";
          const dispatchDisabled = !robot.online || robokitMode ? "disabled" : "";
          const controlDisabled = robokitMode ? "disabled" : "";
          const manualDisabled = robot.online ? "" : "disabled";
          const navDisabled = robot.online && isNavigating ? "" : "disabled";
          const status = robot.dispatchable && robot.online
            ? "Dispatchable"
            : robot.online
              ? "Undispatchable (online)"
              : "Undispatchable (offline)";
          const controlLabel = robot.controlled ? "Release control" : "Seize control";
          const dispatchLabel = robot.dispatchable ? "Dispatchable" : "Undispatchable";
          const manualLabel = robot.manualMode ? "Manual on" : "Manual off";
          const battery = Number.isFinite(robot.battery) ? robot.battery : 0;
          const taskLabel = robot.task || "--";
          const activityLabel = formatRobotActivity(robot, remote);
          const diagnostics = getDiagnostics(robot.id);
          const diagBadge = formatRobotDiagnosticsBadge(diagnostics);
          return `
          <tr>
            <td>
              <div class="robot-name">${robot.name}</div>
              <div class="robot-meta">${robot.id}</div>
            </td>
            <td>
              <span class="status-badge ${robot.online ? "online" : "offline"}">${status}</span>
            </td>
            <td>
              <span class="activity-text">${activityLabel}</span>
            </td>
            <td>
              <button class="toggle-btn ${robot.dispatchable ? "on" : "off"}" data-action="toggle-dispatchable" data-id="${robot.id}" ${dispatchDisabled}>
                ${dispatchLabel}
              </button>
            </td>
            <td>
              <button class="control-btn ${robot.controlled ? "active" : ""}" data-action="toggle-control" data-id="${robot.id}" ${controlDisabled}>
                ${controlLabel}
              </button>
            </td>
            <td>
              <button class="toggle-btn ${robot.manualMode ? "on" : "off"}" data-action="toggle-manual" data-id="${robot.id}" ${manualDisabled}>
                ${manualLabel}
              </button>
            </td>
            <td>
              <div class="nav-actions">
                <button class="nav-btn" data-action="toggle-nav-pause" data-id="${robot.id}" ${navDisabled}>
                  ${pauseLabel}
                </button>
                <button class="nav-btn danger" data-action="stop-nav" data-id="${robot.id}" ${navDisabled}>
                  Zakoncz
                </button>
              </div>
            </td>
            <td>
              <div class="battery">
                <div class="battery-bar">
                  <div class="battery-fill" style="width: ${battery}%"></div>
                </div>
                <span>${battery}%</span>
              </div>
            </td>
            <td>
              <span class="robot-pill ${robot.blocked ? "blocked" : "clear"}">${robot.blocked ? "Blocked" : "Clear"}</span>
            </td>
            <td>
              <span class="robot-pill ${diagBadge.className}">${diagBadge.label}</span>
            </td>
            <td class="task-cell">${taskLabel}</td>
          </tr>
        `;
        })
        .join("");

      robotsList.innerHTML = `
      <div class="table-wrap">
        <table class="robot-table">
          <thead>
            <tr>
              <th>Robot</th>
              <th>Status</th>
              <th>Activity</th>
              <th>Dispatchable</th>
              <th>Control</th>
              <th>Manual</th>
              <th>Nav</th>
              <th>Battery</th>
              <th>Blocked</th>
              <th>Diag</th>
              <th>Task</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
      syncFaultRobotSelect();
      bindRobotActions();
    };

    return {
      render,
      syncFaultRobotSelect
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.RobotsView = { init };
})();
