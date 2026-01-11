(() => {
  const App = window.FleetUI.App;
  const { state, elements, helpers, services } = App;

  const getPlaceById = (placeId) => services.packagingService?.getPlaceById?.(placeId) || null;

  const resolvePlacePos = (placeId) => {
    const place = getPlaceById(placeId);
    if (!place) return null;
    const resolver = App.map?.resolvePointPosition;
    return (resolver ? resolver(place.point) : null) || place.pos || null;
  };

  const updateBufferOps = (bufferId, goodsType, level, updates, kind) => {
    if (!services.packagingService) return;
    services.packagingService.updateBufferOps(bufferId, goodsType, level, updates, kind).then((changed) => {
      if (changed) {
        renderBufferEditor();
      }
    });
  };

  const updatePlaceOps = (placeId, goodsType, updates, kind) => {
    if (!services.packagingService) return;
    services.packagingService.updatePlaceOps(placeId, goodsType, updates, kind).then((changed) => {
      if (changed) {
        renderPlaceOps();
      }
    });
  };

  const applyPackagingState = (payload) => {
    if (!payload || typeof payload !== "object") return;
    services.packagingService?.applyState?.(payload);
    const nextState = services.packagingService?.getState?.() || {
      bufferState: {},
      lineRequests: []
    };
    const bufferState = nextState.bufferState || {};
    if (state.packagingConfig) {
      if (!state.selectedBufferCell) {
        const firstBufferId = state.packagingConfig.buffers?.[0]?.id || null;
        const firstCell = firstBufferId ? bufferState[firstBufferId]?.[0] : null;
        state.selectedBufferCell = firstCell
          ? { bufferId: firstBufferId, cellId: firstCell.id }
          : null;
      }
      if (!state.selectedPlaceId) {
        const firstPlaceId = state.packagingConfig.places
          ? Object.keys(state.packagingConfig.places)[0]
          : null;
        state.selectedPlaceId = firstPlaceId;
      }
      if (!state.selectedPlaceGoods) {
        state.selectedPlaceGoods = state.packagingConfig.goodsTypes?.[0] || null;
      }
    }
    renderBufferGrid();
    renderBufferEditor();
    renderLineRequests();
    App.ui?.renderStreams?.();
    renderPlaceOps();
  };

  const refreshPackagingState = async () => {
    if (!App.data?.isLocalSim?.() || !state.packagingConfig) return;
    try {
      const payload = await App.data?.fetchJson?.(`${state.fleetApiBase}/packaging`);
      applyPackagingState(payload);
    } catch (error) {
      console.warn("Packaging refresh failed", error);
    }
  };

  const initPackagingState = () => {
    if (!state.packagingConfig || !elements.bufferGrid || !elements.lineRequestsList || !elements.bufferEditor) {
      return;
    }
    if (App.data?.isLocalSim?.()) {
      return;
    }
    if (!services.packagingService) return;
    services.packagingService.setConfig(state.packagingConfig);
    if (!services.packagingService.ensureState()) {
      return;
    }
    const { bufferState } = services.packagingService.getState();
    const firstBufferId = state.packagingConfig.buffers?.[0]?.id || null;
    const firstCell = firstBufferId ? bufferState[firstBufferId]?.[0] : null;
    state.selectedBufferCell = firstCell
      ? { bufferId: firstBufferId, cellId: firstCell.id }
      : null;
    state.selectedBufferLevel = 1;
    const firstPlaceId = state.packagingConfig.places ? Object.keys(state.packagingConfig.places)[0] : null;
    state.selectedPlaceId = firstPlaceId;
    state.selectedPlaceGoods = state.packagingConfig.goodsTypes?.[0] || null;
  };

  const getBufferCell = (bufferId, cellId) =>
    services.packagingService?.getBufferCell?.(bufferId, cellId) || null;

  const updateBufferCell = (bufferId, cellId, updates) => {
    if (!services.packagingService) return;
    services.packagingService.updateBufferCell(bufferId, cellId, updates).then((nextState) => {
      if (nextState) {
        applyPackagingState(nextState);
        return;
      }
      renderBufferGrid();
      renderBufferEditor();
    });
  };

  const updateLineRequest = (lineId, key, updates) => {
    if (!services.packagingService) return;
    services.packagingService.updateLineRequest(lineId, key, updates).then((nextState) => {
      if (nextState) {
        applyPackagingState(nextState);
        return;
      }
      renderLineRequests();
      App.ui?.renderStreams?.();
    });
  };

  const renderBufferGrid = () => {
    if (!elements.bufferGrid || !state.packagingConfig) return;
    const bufferState = services.packagingService?.getBufferState?.() || {};
    const buffers = state.packagingConfig.buffers || [];
    if (!buffers.length) {
      elements.bufferGrid.innerHTML = "<div class=\"card\">Brak buforow.</div>";
      return;
    }
    elements.bufferGrid.innerHTML = "";
    buffers.forEach((buffer) => {
      const card = document.createElement("div");
      card.className = "card buffer-card";
      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = buffer.name || buffer.id;
      card.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "buffer-grid-inner";
      const layout = services.packagingService?.buildBufferLayout?.(buffer) || [];
      layout.forEach((lane) => {
        const row = document.createElement("div");
        row.className = "buffer-row";
        lane.slots.forEach((slot, slotIndex) => {
          const cellId = slot.id;
          const cell = getBufferCell(buffer.id, cellId);
          const cellEl = document.createElement("div");
          cellEl.className = "buffer-cell";
          if (!cell || cell.stack === 0) {
            cellEl.classList.add("empty");
          }
          if (
            state.selectedBufferCell &&
            state.selectedBufferCell.bufferId === buffer.id &&
            state.selectedBufferCell.cellId === cellId
          ) {
            cellEl.classList.add("active");
          }
          cellEl.dataset.cellId = cellId;
          cellEl.dataset.bufferId = buffer.id;
          const pointLabel = slot.point || cell?.point || "--";
          const slotLabel = `${lane.id || `L${lane.laneIndex + 1}`}/D${slotIndex + 1}`;
          cellEl.innerHTML = `
            <div class="cell-title">${slotLabel}</div>
            <div class="cell-meta">${cell?.goodsType || "-"}</div>
            <div class="cell-meta">AP: ${pointLabel}</div>
            <div class="cell-meta">Stack: ${cell?.stack || 0}/${buffer.maxStack || 0}</div>
          `;
          cellEl.addEventListener("click", () => {
            state.selectedBufferCell = { bufferId: buffer.id, cellId };
            renderBufferGrid();
            renderBufferEditor();
          });
          row.appendChild(cellEl);
        });
        grid.appendChild(row);
      });

      const legend = document.createElement("div");
      legend.className = "buffer-legend";
      legend.innerHTML = `
        <span class="buffer-pill empty">Puste</span>
        <span class="buffer-pill filled">Zajete</span>
      `;

      card.appendChild(grid);
      card.appendChild(legend);
      elements.bufferGrid.appendChild(card);
    });
  };

  const renderBufferEditor = () => {
    if (!elements.bufferEditor || !state.packagingConfig) return;
    const cell = state.selectedBufferCell
      ? getBufferCell(state.selectedBufferCell.bufferId, state.selectedBufferCell.cellId)
      : null;
    const buffer = state.selectedBufferCell
      ? state.packagingConfig.buffers.find((item) => item.id === state.selectedBufferCell.bufferId)
      : null;
    if (!cell) {
      elements.bufferEditor.innerHTML = "<div class=\"card-meta\">Wybierz komorke w buforze.</div>";
      return;
    }
    const maxStack = buffer?.maxStack || 0;
    const goodsOptions = [
      `<option value="">--</option>`,
      ...(buffer?.allowedGoods || state.packagingConfig.goodsTypes || []).map(
        (item) => `<option value="${item}">${item}</option>`
      )
    ].join("");
    const levelOptions = Array.from({ length: maxStack }, (_, idx) => {
      const level = idx + 1;
      return `<option value="${level}">${level}</option>`;
    }).join("");
    const ops =
      services.packagingService?.resolveBufferOps?.(buffer, cell.goodsType, state.selectedBufferLevel) || {};
    const loadOps = ops.load || {};
    const unloadOps = ops.unload || {};
    elements.bufferEditor.innerHTML = `
      <div class="buffer-field">
        <label>Komorka</label>
        <div>${cell.id} (${buffer?.name || buffer?.id || "--"})</div>
      </div>
      <div class="buffer-field">
        <label>Action point</label>
        <div>${cell.point || "--"}</div>
      </div>
      <div class="buffer-field">
        <label>Typ opakowania</label>
        <select id="buffer-goods-select">${goodsOptions}</select>
      </div>
      <div class="buffer-field">
        <label>Poziom stacku</label>
        <input id="buffer-stack-input" type="number" min="0" max="${maxStack}" value="${cell.stack}" />
      </div>
      <div class="buffer-field">
        <label>Poziom operacji</label>
        <select id="buffer-level-select">${levelOptions}</select>
      </div>
      <div class="ops-section">
        <div class="ops-title">Pobieranie (load)</div>
        <div class="buffer-field">
          <label>start_height</label>
          <input id="op-load-start" type="number" step="0.01" value="${loadOps.start_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>rec_height</label>
          <input id="op-load-rec" type="number" step="0.01" value="${loadOps.rec_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>end_height</label>
          <input id="op-load-end" type="number" step="0.01" value="${loadOps.end_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recfile</label>
          <input id="op-load-recfile" type="text" value="${loadOps.recfile ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recognize</label>
          <select id="op-load-recognize">
            <option value="">--</option>
            <option value="true" ${loadOps.recognize === true ? "selected" : ""}>true</option>
            <option value="false" ${loadOps.recognize === false ? "selected" : ""}>false</option>
          </select>
        </div>
      </div>
      <div class="ops-section">
        <div class="ops-title">Odkladanie (unload)</div>
        <div class="buffer-field">
          <label>start_height</label>
          <input id="op-unload-start" type="number" step="0.01" value="${unloadOps.start_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>end_height</label>
          <input id="op-unload-end" type="number" step="0.01" value="${unloadOps.end_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recognize</label>
          <select id="op-unload-recognize">
            <option value="">--</option>
            <option value="true" ${unloadOps.recognize === true ? "selected" : ""}>true</option>
            <option value="false" ${unloadOps.recognize === false ? "selected" : ""}>false</option>
          </select>
        </div>
      </div>
    `;
    const select = elements.bufferEditor.querySelector("#buffer-goods-select");
    const input = elements.bufferEditor.querySelector("#buffer-stack-input");
    if (select) {
      select.value = cell.goodsType || "";
      select.addEventListener("change", (event) => {
        updateBufferCell(state.selectedBufferCell.bufferId, cell.id, { goodsType: event.target.value });
      });
    }
    if (input) {
      input.addEventListener("change", (event) => {
        const next = helpers.clamp(Number(event.target.value || 0), 0, maxStack);
        updateBufferCell(state.selectedBufferCell.bufferId, cell.id, { stack: next });
      });
    }
    const levelSelect = elements.bufferEditor.querySelector("#buffer-level-select");
    if (levelSelect) {
      levelSelect.value = String(state.selectedBufferLevel);
      levelSelect.addEventListener("change", (event) => {
        state.selectedBufferLevel = Number(event.target.value || 1);
        renderBufferEditor();
      });
    }

    const bindOpsInput = (id, kind, field, cast) => {
      const el = elements.bufferEditor.querySelector(id);
      if (!el) return;
      el.addEventListener("change", (event) => {
        const rawValue = event.target.value;
        const value = cast ? cast(rawValue) : rawValue;
        updateBufferOps(state.selectedBufferCell.bufferId, cell.goodsType, state.selectedBufferLevel, { [field]: value }, kind);
      });
    };
    bindOpsInput("#op-load-start", "load", "start_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-load-rec", "load", "rec_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-load-end", "load", "end_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-load-recfile", "load", "recfile", (v) => v || null);
    bindOpsInput("#op-load-recognize", "load", "recognize", (v) => (v === "" ? null : v === "true"));
    bindOpsInput("#op-unload-start", "unload", "start_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-unload-end", "unload", "end_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-unload-recognize", "unload", "recognize", (v) => (v === "" ? null : v === "true"));
  };

  const renderLineRequests = () => {
    if (!elements.lineRequestsList || !state.packagingConfig) return;
    const lines = state.packagingConfig.lines || [];
    if (!lines.length) {
      elements.lineRequestsList.innerHTML = "<div class=\"card-meta\">Brak linii.</div>";
      return;
    }
    const lineRequests = services.packagingService?.getLineRequests?.() || [];
    const groups = state.packagingConfig.goodsGroups || {};
    elements.lineRequestsList.innerHTML = "";
    lines.forEach((line) => {
      const request = lineRequests.find((item) => item.id === line.id);
      const packagingOptions = (groups.packaging || state.packagingConfig.goodsTypes || [])
        .map(
          (item) =>
            `<option value="${item}" ${request?.supply?.goodsType === item ? "selected" : ""}>${item}</option>`
        )
        .join("");
      const returnOptions = (groups.return || groups.packaging || state.packagingConfig.goodsTypes || [])
        .map(
          (item) =>
            `<option value="${item}" ${request?.return?.goodsType === item ? "selected" : ""}>${item}</option>`
        )
        .join("");
      const supplyPoint = getPlaceById(line.supplyPoint)?.point || line.supplyPoint || "--";
      const outputPoint = getPlaceById(line.outputPoint)?.point || line.outputPoint || "--";
      const wastePoint = getPlaceById(line.wastePoint)?.point || line.wastePoint || "--";
      const auxPoint = getPlaceById(line.auxPoint)?.point || line.auxPoint || "--";
      const card = document.createElement("div");
      card.className = "line-request";
      card.innerHTML = `
        <div class="line-request-header">
          <div class="line-request-title">${line.name || line.id}</div>
          <div class="line-request-status">Linia ${line.id}</div>
        </div>
        <div class="line-request-actions">
          <div class="buffer-field">
            <label>Opakowania (${supplyPoint})</label>
            <select data-line-id="${line.id}" data-kind="supply">${packagingOptions}</select>
            <button class="${request?.supply?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="supply">
              ${request?.supply?.active ? "Anuluj" : "Zamow"}
            </button>
          </div>
          <div class="buffer-field">
            <label>Materialy dodatkowe (${auxPoint})</label>
            <button class="${request?.aux?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="aux">
              ${request?.aux?.active ? "Anuluj" : "Zamow"}
            </button>
          </div>
          <div class="buffer-field">
            <label>Odbior wyrobu (${outputPoint})</label>
            <button class="${request?.output?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="output">
              ${request?.output?.active ? "Anuluj" : "Odbierz"}
            </button>
          </div>
          <div class="buffer-field">
            <label>Odbior odpadu (${wastePoint})</label>
            <button class="${request?.waste?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="waste">
              ${request?.waste?.active ? "Anuluj" : "Odbierz"}
            </button>
          </div>
          <div class="buffer-field">
            <label>Zwrot opakowan (${supplyPoint})</label>
            <select data-line-id="${line.id}" data-kind="return">${returnOptions}</select>
            <button class="${request?.return?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="return">
              ${request?.return?.active ? "Anuluj" : "Zwroc"}
            </button>
          </div>
        </div>
      `;
      card.querySelectorAll("select").forEach((select) => {
        select.addEventListener("change", (event) => {
          const kind = event.target.dataset.kind;
          updateLineRequest(line.id, kind, { goodsType: event.target.value });
        });
      });
      card.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
          const kind = button.dataset.kind;
          const current = request?.[kind]?.active;
          updateLineRequest(line.id, kind, { active: !current });
        });
      });
      elements.lineRequestsList.appendChild(card);
    });
  };

  const renderPlaceOps = () => {
    if (!elements.placeOpsPanel || !state.packagingConfig) return;
    const placeIds = state.packagingConfig.places ? Object.keys(state.packagingConfig.places) : [];
    if (!placeIds.length) {
      elements.placeOpsPanel.innerHTML = "<div class=\"card-meta\">Brak miejsc.</div>";
      return;
    }
    if (!state.selectedPlaceId || !placeIds.includes(state.selectedPlaceId)) {
      state.selectedPlaceId = placeIds[0];
    }
    if (!state.selectedPlaceGoods) {
      state.selectedPlaceGoods = state.packagingConfig.goodsTypes?.[0] || "";
    }
    const goodsOptions = (state.packagingConfig.goodsTypes || [])
      .map(
        (item) =>
          `<option value="${item}" ${state.selectedPlaceGoods === item ? "selected" : ""}>${item}</option>`
      )
      .join("");
    const placeOptions = placeIds
      .map(
        (id) => `<option value="${id}" ${state.selectedPlaceId === id ? "selected" : ""}>${id}</option>`
      )
      .join("");
    const ops = services.packagingService?.resolvePlaceOps?.(state.selectedPlaceId, state.selectedPlaceGoods) || {};
    const loadOps = ops.load || {};
    const unloadOps = ops.unload || {};
    elements.placeOpsPanel.innerHTML = `
      <div class="buffer-field">
        <label>Miejsce</label>
        <select id="place-select">${placeOptions}</select>
      </div>
      <div class="buffer-field">
        <label>Typ opakowania</label>
        <select id="place-goods">${goodsOptions}</select>
      </div>
      <div class="ops-section">
        <div class="ops-title">Pobieranie (load)</div>
        <div class="buffer-field">
          <label>start_height</label>
          <input id="place-load-start" type="number" step="0.01" value="${loadOps.start_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>rec_height</label>
          <input id="place-load-rec" type="number" step="0.01" value="${loadOps.rec_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>end_height</label>
          <input id="place-load-end" type="number" step="0.01" value="${loadOps.end_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recfile</label>
          <input id="place-load-recfile" type="text" value="${loadOps.recfile ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recognize</label>
          <select id="place-load-recognize">
            <option value="">--</option>
            <option value="true" ${loadOps.recognize === true ? "selected" : ""}>true</option>
            <option value="false" ${loadOps.recognize === false ? "selected" : ""}>false</option>
          </select>
        </div>
      </div>
      <div class="ops-section">
        <div class="ops-title">Odkladanie (unload)</div>
        <div class="buffer-field">
          <label>start_height</label>
          <input id="place-unload-start" type="number" step="0.01" value="${unloadOps.start_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>end_height</label>
          <input id="place-unload-end" type="number" step="0.01" value="${unloadOps.end_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recognize</label>
          <select id="place-unload-recognize">
            <option value="">--</option>
            <option value="true" ${unloadOps.recognize === true ? "selected" : ""}>true</option>
            <option value="false" ${unloadOps.recognize === false ? "selected" : ""}>false</option>
          </select>
        </div>
      </div>
    `;
    const placeSelect = elements.placeOpsPanel.querySelector("#place-select");
    const goodsSelect = elements.placeOpsPanel.querySelector("#place-goods");
    if (placeSelect) {
      placeSelect.addEventListener("change", (event) => {
        state.selectedPlaceId = event.target.value;
        renderPlaceOps();
      });
    }
    if (goodsSelect) {
      goodsSelect.addEventListener("change", (event) => {
        state.selectedPlaceGoods = event.target.value;
        renderPlaceOps();
      });
    }
    const bindPlaceInput = (id, kind, field, cast) => {
      const el = elements.placeOpsPanel.querySelector(id);
      if (!el) return;
      el.addEventListener("change", (event) => {
        const rawValue = event.target.value;
        const value = cast ? cast(rawValue) : rawValue;
        updatePlaceOps(state.selectedPlaceId, state.selectedPlaceGoods, { [field]: value }, kind);
      });
    };
    bindPlaceInput("#place-load-start", "load", "start_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-load-rec", "load", "rec_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-load-end", "load", "end_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-load-recfile", "load", "recfile", (v) => v || null);
    bindPlaceInput("#place-load-recognize", "load", "recognize", (v) => (v === "" ? null : v === "true"));
    bindPlaceInput("#place-unload-start", "unload", "start_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-unload-end", "unload", "end_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-unload-recognize", "unload", "recognize", (v) => (v === "" ? null : v === "true"));
  };

  const renderPackaging = () => {
    if (!elements.bufferGrid || !elements.lineRequestsList || !elements.bufferEditor || !elements.placeOpsPanel) {
      return;
    }
    if (!state.packagingConfig) {
      elements.bufferGrid.innerHTML = "<div class=\"card\">Brak konfiguracji.</div>";
      elements.lineRequestsList.innerHTML = "<div class=\"card\">Brak konfiguracji.</div>";
      elements.bufferEditor.innerHTML = "<div class=\"card-meta\">Brak konfiguracji.</div>";
      elements.placeOpsPanel.innerHTML = "<div class=\"card-meta\">Brak konfiguracji.</div>";
      return;
    }
    initPackagingState();
    renderBufferGrid();
    renderBufferEditor();
    renderLineRequests();
    renderPlaceOps();
    App.ui?.renderStreams?.();
  };

  App.packaging = {
    applyPackagingState,
    getBufferCell,
    getPlaceById,
    initPackagingState,
    refreshPackagingState,
    renderBufferEditor,
    renderBufferGrid,
    renderLineRequests,
    renderPackaging,
    renderPlaceOps,
    resolvePlacePos,
    updateBufferCell,
    updateBufferOps,
    updateLineRequest,
    updatePlaceOps
  };
})();
