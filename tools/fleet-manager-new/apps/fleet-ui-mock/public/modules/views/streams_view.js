(() => {
  const init = ({ elements = {}, state = {}, helpers = {} } = {}) => {
    const {
      streamsList,
      fieldsList,
      tasksList,
      trafficLocksList,
      trafficQueuesList,
      trafficNodesList,
      trafficStallsList
    } = elements;
    const getPackagingConfig = state.getPackagingConfig || (() => null);
    const getWorkflowData = state.getWorkflowData || (() => null);
    const getLineRequests = state.getLineRequests || (() => []);
    const getWorksites = state.getWorksites || (() => []);
    const getWorksiteState = state.getWorksiteState || (() => ({ occupancy: "empty", blocked: false }));
    const getTasks = state.getTasks || (() => []);
    const getCurrentView = state.getCurrentView || (() => null);
    const getFleetCoreAvailable = state.getFleetCoreAvailable || (() => false);
    const sortWorksites = helpers.sortWorksites || ((list) => list);
    const ORDER_ASC = helpers.orderAsc || "asc";
    const ORDER_DESC = helpers.orderDesc || "desc";

    const getGroupWorksites = (groupId) => {
      const worksites = getWorksites();
      return worksites.filter((site) => site.group === groupId);
    };

    const getDropOrder = (stream) => {
      const order = stream?.drop_policy?.order;
      if (order === "asc" || order === "ascending") return ORDER_ASC;
      if (order === "desc" || order === "descending") return ORDER_DESC;
      return ORDER_DESC;
    };

    const getDropAccessRule = (stream) => {
      const rule = stream?.drop_policy?.access_rule;
      if (rule === "any_free" || rule === "first_free") return "any_free";
      return "preceding_empty";
    };

    const getNextPickCandidate = (pickGroupId, order, reserved) => {
      const groupSites = sortWorksites(getGroupWorksites(pickGroupId), order);
      for (const site of groupSites) {
        const state = getWorksiteState(site.id);
        if (reserved?.has(site.id)) continue;
        if (state.blocked) continue;
        if (state.occupancy === "filled") {
          return site;
        }
      }
      return null;
    };

    const getNextDropCandidate = (dropGroups, order, reserved, accessRule) => {
      const allowShadowed = accessRule === "any_free";
      for (const groupId of dropGroups) {
        const groupSites = sortWorksites(getGroupWorksites(groupId), order);
        let blockedAhead = false;
        for (const site of groupSites) {
          const state = getWorksiteState(site.id);
          if (state.blocked || state.occupancy === "filled" || reserved?.has(site.id)) {
            if (allowShadowed) {
              continue;
            }
            blockedAhead = true;
            break;
          }
          return { site, groupId };
        }
        if (blockedAhead) {
          continue;
        }
      }
      return null;
    };

    const renderStreams = () => {
      if (!streamsList) return;
      const packagingConfig = getPackagingConfig();
      const workflowData = getWorkflowData();
      const lineRequests = getLineRequests();

      if (packagingConfig?.streams?.length) {
        const streams = packagingConfig.streams;
        streamsList.innerHTML = "";
        streams.forEach((stream) => {
          const routeCount = stream.routes?.length || 0;
          const activeCount = lineRequests.filter((req) => req[stream.trigger]?.active).length;
          const card = document.createElement("div");
          card.className = "stream-card";
          card.innerHTML = `
          <div class="stream-header">
            <div>
              <div class="stream-title">${stream.id} - ${stream.name}</div>
              <div class="stream-meta">Trigger: ${stream.trigger}</div>
            </div>
            <span class="stream-pill">${routeCount} routes</span>
          </div>
          <div class="stream-section">
            <div class="stream-step-title">Stan</div>
            <div class="stream-grid">
              <div>
                <div class="stream-label">Aktywne zgloszenia</div>
                <div class="stream-value">${activeCount}</div>
              </div>
              <div>
                <div class="stream-label">Goods type</div>
                <div class="stream-value">${stream.goodsType || stream.goodsTypeMode || "--"}</div>
              </div>
            </div>
          </div>
        `;
          streamsList.appendChild(card);
        });
        return;
      }

      const streams = workflowData?.streams || [];
      if (!streams.length) {
        streamsList.innerHTML = "<div class=\"card\">Brak streamow.</div>";
        return;
      }
      streamsList.innerHTML = "";
      streams.forEach((stream) => {
        const dropGroups = stream.drop_group_order || [];
        const dropOrder = getDropOrder(stream);
        const dropRule = getDropAccessRule(stream);
        const orderLabel = dropOrder === ORDER_DESC ? "alphabetical descending" : "alphabetical ascending";
        const ruleLabel = dropRule === "any_free" ? "any_free" : "first_free_not_shadowed";
        const nextPick = getNextPickCandidate(stream.pick_group, ORDER_ASC);
        const nextDrop = getNextDropCandidate(dropGroups, dropOrder, null, dropRule);
        const dropGroupLabel = dropGroups.join(", ") || "--";

        const card = document.createElement("div");
        card.className = "stream-card";
        card.innerHTML = `
        <div class="stream-header">
          <div>
            <div class="stream-title">${stream.id}</div>
            <div class="stream-meta">Transfer between groups</div>
          </div>
          <span class="stream-pill">1 step</span>
        </div>
        <div class="stream-section">
          <div class="stream-step-title">Step 1</div>
          <div class="stream-grid">
            <div>
              <div class="stream-label">Pick group</div>
              <div class="stream-value">${stream.pick_group || "--"}</div>
            </div>
            <div>
              <div class="stream-label">Drop groups</div>
              <div class="stream-value">${dropGroupLabel}</div>
            </div>
            <div>
              <div class="stream-label">Order</div>
              <div class="stream-value">${orderLabel}</div>
            </div>
            <div>
              <div class="stream-label">Rule</div>
              <div class="stream-value">${ruleLabel}</div>
            </div>
            <div>
              <div class="stream-label">Next pick candidate</div>
              <div class="stream-value">${nextPick ? nextPick.id : "--"}</div>
            </div>
            <div>
              <div class="stream-label">Next drop candidate</div>
              <div class="stream-value">${nextDrop ? `${nextDrop.site.id} (${nextDrop.groupId})` : "--"}</div>
            </div>
          </div>
        </div>
      `;
        streamsList.appendChild(card);
      });
    };

    const renderFields = () => {
      if (!fieldsList) return;
      const worksites = getWorksites();
      if (!worksites.length) {
        fieldsList.innerHTML = "<div class=\"card\">Brak worksite.</div>";
        return;
      }
      const rows = sortWorksites(worksites, ORDER_ASC)
        .map((site) => {
          const state = getWorksiteState(site.id);
          const occupancyLabel = state.occupancy === "filled" ? "Filled" : "Unfilled";
          const blockedLabel = state.blocked ? "Blocked" : "Unblocked";
          return `
          <tr>
            <td>${site.id}</td>
            <td>${site.group || "--"}</td>
            <td><span class="robot-pill ${state.occupancy === "filled" ? "clear" : "blocked"}">${occupancyLabel}</span></td>
            <td><span class="robot-pill ${state.blocked ? "blocked" : "clear"}">${blockedLabel}</span></td>
          </tr>
        `;
        })
        .join("");

      fieldsList.innerHTML = `
      <div class="table-wrap">
        <table class="robot-table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Grupa</th>
              <th>Filled</th>
              <th>Blocked</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
    };

    const renderTasks = () => {
      if (!tasksList) return;
      const tasks = getTasks();
      if (!tasks.length) {
        tasksList.innerHTML = "<div class=\"card\">Brak aktywnych zadan.</div>";
        return;
      }
      tasksList.innerHTML = "";
      tasks.forEach((task) => {
        const card = document.createElement("div");
        card.className = "card";
        const statusClass =
          task.status === "Completed" ? "task-done" : task.status === "Failed" ? "task-failed" : "task-active";
        const phaseLabel = task.phase ? ` - ${task.phase}` : "";
        const goodsLabel = task.meta?.goodsType ? `Towar: ${task.meta.goodsType}` : "";
        const lineLabel = task.meta?.lineId ? `Linia: ${task.meta.lineId}` : "";
        const kindLabel = task.kind ? `Typ: ${task.kind}` : "";
        const extraLine = [kindLabel, goodsLabel, lineLabel].filter(Boolean).join(" | ");
        card.innerHTML = `
        <div class=\"card-title\">${task.id}</div>
        <div class=\"card-meta\">Stream: ${task.streamId || "--"} - Robot: ${task.robotId || "--"}</div>
        <div class=\"card-meta\">Pick: ${task.pickId || "--"} -> Drop: ${task.dropId || "--"}</div>
        ${extraLine ? `<div class=\"card-meta\">${extraLine}</div>` : ""}
        <div class=\"badge ${statusClass}\">${task.status}${phaseLabel}</div>
      `;
        tasksList.appendChild(card);
      });
    };

    const renderTrafficDiagnostics = () => {
      if (!trafficLocksList || !trafficQueuesList || !trafficNodesList || !trafficStallsList) {
        return;
      }
      if (getCurrentView() !== "traffic") return;
      const label = getFleetCoreAvailable()
        ? "Diagnostyka dostepna po stronie backendu."
        : "Brak diagnostyki (backend niedostepny).";
      trafficLocksList.innerHTML = `<div class="traffic-empty">${label}</div>`;
      trafficQueuesList.innerHTML = `<div class="traffic-empty">${label}</div>`;
      trafficNodesList.innerHTML = `<div class="traffic-empty">${label}</div>`;
      trafficStallsList.innerHTML = `<div class="traffic-empty">${label}</div>`;
    };

    return {
      render: renderStreams,
      renderStreams,
      renderFields,
      renderTasks,
      renderTrafficDiagnostics
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.StreamsView = { init };
})();
