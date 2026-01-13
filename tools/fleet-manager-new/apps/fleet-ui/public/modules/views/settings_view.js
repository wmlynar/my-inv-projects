(() => {
  const AXIS_LABELS = {
    objective: "Objective",
    assignment: "Assignment",
    fairness: "Fairness",
    preemption: "Preemption",
    batching: "Batching",
    replan: "Replan",
    scope: "Scope",
    searchSpace: "Search space",
    timeModel: "Time model",
    optimality: "Optimality",
    kinematics: "Kinematics",
    granularity: "Granularity",
    locking: "Locking",
    release: "Release",
    mechanism: "Mechanism",
    response: "Response",
    clearance: "Clearance",
    control: "Control",
    speedProfile: "Speed profile",
    tracking: "Tracking",
    resolution: "Resolution"
  };

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildSelectOptions = (select, options) => {
    if (!select || !Array.isArray(options)) return;
    select.innerHTML = options
      .map((option) => {
        const value = escapeHtml(option.value);
        const label = escapeHtml(option.label);
        const title = option.title ? ` title="${escapeHtml(option.title)}"` : "";
        return `<option value="${value}"${title}>${label}</option>`;
      })
      .join("");
  };

  const resolveTaxonomyLabel = (taxonomy, group, axis, value) => {
    if (!value) return null;
    const items = taxonomy?.[group]?.[axis];
    if (!Array.isArray(items)) return String(value);
    const match = items.find((item) => item?.name === value);
    return match?.label || String(value);
  };

  const formatAxisLabel = (axis) => AXIS_LABELS[axis] || axis;

  const renderTaxonomyRows = (container, rows, emptyLabel = "Brak danych.") => {
    if (!container) return;
    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = `<div class="taxonomy-empty">${escapeHtml(emptyLabel)}</div>`;
      return;
    }
    container.innerHTML = rows
      .map(
        ([key, value]) =>
          `<div class="taxonomy-row"><span class="taxonomy-key">${escapeHtml(
            key
          )}</span><span class="taxonomy-value">${escapeHtml(value)}</span></div>`
      )
      .join("");
  };

  const buildTaxonomyAxisRows = (taxonomy, groups, includeGroup) => {
    if (!taxonomy || !Array.isArray(groups)) return [];
    const rows = [];
    groups.forEach((group) => {
      const axes = taxonomy?.[group];
      if (!axes) return;
      Object.entries(axes).forEach(([axis, axisEntries]) => {
        if (!Array.isArray(axisEntries) || !axisEntries.length) return;
        const label = formatAxisLabel(axis);
        const values = axisEntries
          .map((entry) => entry?.label || entry?.name)
          .filter(Boolean)
          .join(", ");
        const key = includeGroup ? `${group}.${label}` : label;
        rows.push([key, values]);
      });
    });
    return rows;
  };

  const buildDispatchCurrentRows = (entry, taxonomy) => {
    if (!entry) return [];
    const rows = [["strategy", entry.label || entry.name]];
    const dims = entry?.dimensions || {};
    if (dims.objective) {
      rows.push([formatAxisLabel("objective"), resolveTaxonomyLabel(taxonomy, "dispatch", "objective", dims.objective)]);
    }
    if (dims.assignment) {
      rows.push([formatAxisLabel("assignment"), resolveTaxonomyLabel(taxonomy, "dispatch", "assignment", dims.assignment)]);
    }
    if (dims.fairness) {
      rows.push([formatAxisLabel("fairness"), resolveTaxonomyLabel(taxonomy, "dispatch", "fairness", dims.fairness)]);
    }
    if (dims.preemption) {
      rows.push([formatAxisLabel("preemption"), resolveTaxonomyLabel(taxonomy, "dispatch", "preemption", dims.preemption)]);
    }
    if (dims.batching) {
      rows.push([formatAxisLabel("batching"), resolveTaxonomyLabel(taxonomy, "dispatch", "batching", dims.batching)]);
    }
    if (dims.replan) {
      rows.push([formatAxisLabel("replan"), resolveTaxonomyLabel(taxonomy, "dispatch", "replan", dims.replan)]);
    }
    if (dims.scope) {
      rows.push([formatAxisLabel("scope"), resolveTaxonomyLabel(taxonomy, "dispatch", "scope", dims.scope)]);
    }
    return rows;
  };

  const buildTrafficCurrentRows = (entry, taxonomy) => {
    if (!entry) return [];
    const rows = [["strategy", entry.label || entry.name]];
    const categories = entry?.categories || {};
    if (categories.routePlanner) {
      rows.push([
        "category.route",
        resolveTaxonomyLabel(taxonomy, "routePlanner", "searchSpace", categories.routePlanner)
      ]);
    }
    if (categories.reservation) {
      rows.push([
        "category.reservation",
        resolveTaxonomyLabel(taxonomy, "reservation", "granularity", categories.reservation)
      ]);
    }
    if (categories.avoidance) {
      rows.push([
        "category.avoidance",
        resolveTaxonomyLabel(taxonomy, "avoidance", "mechanism", categories.avoidance)
      ]);
    }
    if (categories.conflictSearch) {
      rows.push([
        "category.conflict",
        resolveTaxonomyLabel(taxonomy, "conflict", "search", categories.conflictSearch)
      ]);
    }

    const dims = entry?.dimensions || {};
    const routeDims = dims.routePlanner || {};
    ["searchSpace", "timeModel", "optimality", "kinematics", "replan"].forEach((axis) => {
      const value = routeDims[axis];
      if (!value) return;
      rows.push([
        `route.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "routePlanner", axis, value)
      ]);
    });

    const reservationDims = dims.reservation || {};
    ["granularity", "locking", "scope", "release"].forEach((axis) => {
      const value = reservationDims[axis];
      if (!value) return;
      rows.push([
        `reservation.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "reservation", axis, value)
      ]);
    });

    const avoidanceDims = dims.avoidance || {};
    ["mechanism", "response", "scope", "clearance"].forEach((axis) => {
      const value = avoidanceDims[axis];
      if (!value) return;
      rows.push([
        `avoidance.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "avoidance", axis, value)
      ]);
    });

    const conflictDims = dims.conflict || {};
    ["search", "resolution"].forEach((axis) => {
      const value = conflictDims[axis];
      if (!value) return;
      rows.push([
        `conflict.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "conflict", axis, value)
      ]);
    });

    const execDims = dims.execution || {};
    ["control", "speedProfile", "tracking"].forEach((axis) => {
      const value = execDims[axis];
      if (!value) return;
      rows.push([
        `execution.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "execution", axis, value)
      ]);
    });

    return rows;
  };

  const buildDispatchOptionTitle = (entry, taxonomy) => {
    const dims = entry?.dimensions || {};
    const parts = [];
    if (dims.objective) {
      parts.push(`objective: ${resolveTaxonomyLabel(taxonomy, "dispatch", "objective", dims.objective)}`);
    }
    if (dims.assignment) {
      parts.push(`assignment: ${resolveTaxonomyLabel(taxonomy, "dispatch", "assignment", dims.assignment)}`);
    }
    if (dims.fairness) {
      parts.push(`fairness: ${resolveTaxonomyLabel(taxonomy, "dispatch", "fairness", dims.fairness)}`);
    }
    if (dims.preemption) {
      parts.push(`preemption: ${resolveTaxonomyLabel(taxonomy, "dispatch", "preemption", dims.preemption)}`);
    }
    if (dims.batching) {
      parts.push(`batching: ${resolveTaxonomyLabel(taxonomy, "dispatch", "batching", dims.batching)}`);
    }
    if (dims.replan) {
      parts.push(`replan: ${resolveTaxonomyLabel(taxonomy, "dispatch", "replan", dims.replan)}`);
    }
    if (dims.scope) {
      parts.push(`scope: ${resolveTaxonomyLabel(taxonomy, "dispatch", "scope", dims.scope)}`);
    }
    return parts.join(" | ");
  };

  const buildTrafficOptionTitle = (entry, taxonomy) => {
    const categories = entry?.categories || {};
    const dims = entry?.dimensions || {};
    const parts = [];
    if (categories.routePlanner) {
      parts.push(`route: ${resolveTaxonomyLabel(taxonomy, "routePlanner", "searchSpace", categories.routePlanner)}`);
    }
    if (categories.reservation) {
      parts.push(`reservation: ${resolveTaxonomyLabel(taxonomy, "reservation", "granularity", categories.reservation)}`);
    }
    if (categories.avoidance) {
      parts.push(`avoidance: ${resolveTaxonomyLabel(taxonomy, "avoidance", "mechanism", categories.avoidance)}`);
    }
    if (categories.conflictSearch) {
      parts.push(
        `conflict: ${resolveTaxonomyLabel(taxonomy, "conflict", "search", categories.conflictSearch)}`
      );
    }
    if (dims.routePlanner?.kinematics) {
      parts.push(
        `kinematics: ${resolveTaxonomyLabel(taxonomy, "routePlanner", "kinematics", dims.routePlanner.kinematics)}`
      );
    }
    if (dims.routePlanner?.optimality) {
      parts.push(
        `optimality: ${resolveTaxonomyLabel(taxonomy, "routePlanner", "optimality", dims.routePlanner.optimality)}`
      );
    }
    return parts.join(" | ");
  };

  const buildDispatchOptionsFromCatalog = (entries, taxonomy, defaults) => {
    if (!Array.isArray(entries)) return [];
    return entries
      .map((entry) => {
        const name = String(entry?.name || "").trim();
        if (!name) return null;
        const label = entry?.label || defaults[name] || name;
        const title = buildDispatchOptionTitle(entry, taxonomy);
        return { value: name, label, title };
      })
      .filter(Boolean);
  };

  const buildTrafficOptionsFromCatalog = (entries, taxonomy, defaults) => {
    if (!Array.isArray(entries)) return [];
    return entries
      .map((entry) => {
        const name = String(entry?.name || "").trim();
        if (!name) return null;
        const label = entry?.label || defaults[name] || name;
        const title = buildTrafficOptionTitle(entry, taxonomy);
        return { value: name, label, title };
      })
      .filter(Boolean);
  };

  const init = ({ elements = {}, state = {}, helpers = {}, options = {} } = {}) => {
    const {
      settingsSimModeSelect,
      settingsDispatchSelect,
      settingsTrafficSelect,
      settingsTrafficStopDistanceInput,
      settingsSimApplyBtn,
      settingsSimNote,
      settingsAlgoNote,
      taxonomyDispatchCurrent,
      taxonomyTrafficCurrent,
      taxonomyDispatchAxes,
      taxonomyTrafficAxes
    } = elements;

    const simModeOptions = options.simModeOptions || [];
    const robokitSimMode = options.robokitSimMode || "robokit";
    const dispatchOptions = options.dispatchOptions || [];
    const trafficOptions = options.trafficOptions || [];
    const defaultDispatchLabels = options.defaultDispatchLabels || {};
    const defaultTrafficLabels = options.defaultTrafficLabels || {};

    const normalizeOption =
      helpers.normalizeOption ||
      ((value, allowed) => (allowed && allowed.includes(value) ? value : null));
    const resolveDispatchStrategy = helpers.resolveDispatchStrategy || (() => null);
    const resolveTrafficStrategyName = helpers.resolveTrafficStrategyName || (() => null);
    const resolveTrafficForwardStopDistance = helpers.resolveTrafficForwardStopDistance || (() => null);
    const isRobokitSim = helpers.isRobokitSim || (() => false);

    let catalogCache = null;

    const getSnapshot = () => ({
      simMode: state.getSimMode?.(),
      fleetSimModeMutable: state.getFleetSimModeMutable?.(),
      fleetCoreAvailable: state.getFleetCoreAvailable?.(),
      settingsState: state.getSettingsState?.() || {},
      robotsConfig: state.getRobotsConfig?.(),
      algorithmCatalog: state.getAlgorithmCatalog?.()
    });

    const getCatalog = () => {
      const snapshot = getSnapshot();
      return snapshot.algorithmCatalog || catalogCache;
    };

    const renderAlgorithmTaxonomy = () => {
      if (
        !taxonomyDispatchCurrent &&
        !taxonomyTrafficCurrent &&
        !taxonomyDispatchAxes &&
        !taxonomyTrafficAxes
      ) {
        return;
      }
      const snapshot = getSnapshot();
      const catalog = getCatalog();
      const taxonomy = catalog?.taxonomy || null;
      const dispatchName =
        normalizeOption(
          snapshot.settingsState.dispatchStrategy,
          dispatchOptions.map((item) => item.value)
        ) || resolveDispatchStrategy();
      const trafficName =
        normalizeOption(
          snapshot.settingsState.trafficStrategy,
          trafficOptions.map((item) => item.value)
        ) || resolveTrafficStrategyName(snapshot.robotsConfig);
      const dispatchEntry = catalog?.dispatchStrategies?.find((entry) => entry?.name === dispatchName);
      const trafficEntry = catalog?.trafficStrategies?.find((entry) => entry?.name === trafficName);
      renderTaxonomyRows(
        taxonomyDispatchCurrent,
        buildDispatchCurrentRows(dispatchEntry, taxonomy),
        "Brak danych dispatch."
      );
      renderTaxonomyRows(
        taxonomyTrafficCurrent,
        buildTrafficCurrentRows(trafficEntry, taxonomy),
        "Brak danych traffic."
      );
      renderTaxonomyRows(
        taxonomyDispatchAxes,
        buildTaxonomyAxisRows(taxonomy, ["dispatch"], false),
        "Brak osi dispatch."
      );
      renderTaxonomyRows(
        taxonomyTrafficAxes,
        buildTaxonomyAxisRows(
          taxonomy,
          ["routePlanner", "reservation", "avoidance", "conflict", "execution"],
          true
        ),
        "Brak osi traffic."
      );
    };

    const applyCatalog = (catalog) => {
      if (!catalog || typeof catalog !== "object") return false;
      const taxonomy = catalog.taxonomy || null;
      const nextDispatch = buildDispatchOptionsFromCatalog(
        catalog.dispatchStrategies,
        taxonomy,
        defaultDispatchLabels
      );
      if (nextDispatch.length) {
        dispatchOptions.length = 0;
        dispatchOptions.push(...nextDispatch);
      }
      const nextTraffic = buildTrafficOptionsFromCatalog(
        catalog.trafficStrategies,
        taxonomy,
        defaultTrafficLabels
      );
      if (nextTraffic.length) {
        trafficOptions.length = 0;
        trafficOptions.push(...nextTraffic);
      }
      catalogCache = catalog;
      renderAlgorithmTaxonomy();
      return true;
    };

    const render = () => {
      const snapshot = getSnapshot();
      if (settingsSimModeSelect) {
        buildSelectOptions(settingsSimModeSelect, simModeOptions);
        settingsSimModeSelect.value = snapshot.simMode;
        settingsSimModeSelect.disabled = !snapshot.fleetSimModeMutable;
        const robokitOption = settingsSimModeSelect.querySelector(
          `option[value="${robokitSimMode}"]`
        );
        if (robokitOption) {
          robokitOption.disabled = !snapshot.fleetCoreAvailable;
        }
        if (settingsSimNote) {
          if (snapshot.simMode === robokitSimMode && !snapshot.fleetCoreAvailable) {
            settingsSimNote.textContent = "Robokit niedostepny w backendzie.";
          } else if (!snapshot.fleetSimModeMutable) {
            settingsSimNote.textContent = "Tryb zablokowany w konfiguracji serwera.";
          } else {
            settingsSimNote.textContent = "Tryb z konfiguracji backendu.";
          }
        }
      }
      if (settingsSimApplyBtn) {
        settingsSimApplyBtn.disabled = !snapshot.fleetSimModeMutable;
      }

      if (settingsDispatchSelect) {
        buildSelectOptions(settingsDispatchSelect, dispatchOptions);
        const dispatchValue =
          normalizeOption(
            snapshot.settingsState.dispatchStrategy,
            dispatchOptions.map((item) => item.value)
          ) || resolveDispatchStrategy();
        settingsDispatchSelect.value = dispatchValue;
      }

      if (settingsTrafficSelect) {
        buildSelectOptions(settingsTrafficSelect, trafficOptions);
        const trafficValue =
          normalizeOption(
            snapshot.settingsState.trafficStrategy,
            trafficOptions.map((item) => item.value)
          ) || resolveTrafficStrategyName(snapshot.robotsConfig);
        settingsTrafficSelect.value = trafficValue;
      }

      if (settingsTrafficStopDistanceInput) {
        const baseDistance = resolveTrafficForwardStopDistance(snapshot.robotsConfig);
        const distance = Number.isFinite(snapshot.settingsState.forwardStopDistanceM)
          ? snapshot.settingsState.forwardStopDistanceM
          : baseDistance;
        settingsTrafficStopDistanceInput.value = Number.isFinite(distance) ? distance : 0;
      }

      if (settingsAlgoNote) {
        settingsAlgoNote.textContent = isRobokitSim()
          ? "Algorytmy beda zastosowane po przelaczeniu na symulator lokalny."
          : "Algorytmy dzialaja w lokalnym symulatorze.";
      }
      renderAlgorithmTaxonomy();
    };

    return {
      applyCatalog,
      render
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.SettingsView = { init };
})();
