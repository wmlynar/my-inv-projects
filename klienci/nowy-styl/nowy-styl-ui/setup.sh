#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/opt/nowy-styl-ui"

echo "Tworzę strukturę projektu w: $BASE_DIR"
mkdir -p "$BASE_DIR/public"

################################
# package.json
################################
cat > "$BASE_DIR/package.json" << 'EOF'
{
  "name": "nowy-styl-ui",
  "version": "1.0.0",
  "description": "UI tabletów A/B dla Nowy Styl, proxy do RDS",
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "body-parser": "^1.20.3",
    "express": "^4.21.2"
  }
}
EOF

################################
# server.js
################################
cat > "$BASE_DIR/server.js" << 'EOF'
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

// TODO: dostosuj ścieżkę/eksport zgodnie z Twoim api-client.js
// Zakładam, że api-client robi: module.exports = ApiClient;
let ApiClient;
try {
  ApiClient = require("./api-client");
} catch (e) {
  console.warn("Uwaga: nie znaleziono api-client.js lub exportu ApiClient. Uzupełnij to ręcznie.");
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// serwujemy statyczny frontend
app.use(express.static(path.join(__dirname, "public")));

// jeśli jest dostępny ApiClient, tworzymy klienta RDS
let rdsClient = null;
if (ApiClient) {
  rdsClient = new ApiClient({
    apiHost: process.env.RDS_API_HOST || "http://localhost:19200",
    login: process.env.RDS_LOGIN || "user",
    password: process.env.RDS_PASSWORD || "password"
  });
}

// proste mapowanie slotId -> siteId w RDS (PLACEHOLDER – uzupełnij realnymi ID)
const slotToSiteId = {
  // Przykładowo:
  // A01: "WORKSITE_A01",
  // A02: "WORKSITE_A02",
  // ...
  // B24: "WORKSITE_B24"
};

// endpoint: ustawienie filled dla danego slotu
app.post("/api/slots/:slotId/set-filled", async (req, res) => {
  const slotId = req.params.slotId;
  const { filled } = req.body;

  console.log("Żądanie ustawienia slotu", slotId, "-> filled =", filled);

  const siteId = slotToSiteId[slotId];
  if (!siteId) {
    console.warn("Brak mapowania siteId dla slotId", slotId);
    return res.status(400).json({ error: "Unknown slotId", slotId });
  }

  // tryb „mock” gdy api-client nie jest gotowy
  if (!rdsClient) {
    console.log("[MOCK RDS] siteId:", siteId, "filled:", !!filled);
    return res.json({ ok: true, mock: true });
  }

  try {
    if (filled) {
      // nazwy metod dostosuj do swojego api-client.js
      if (typeof rdsClient.worksiteFiled === "function") {
        await rdsClient.worksiteFiled(siteId);
      } else {
        // fallback – jeśli masz tylko apiCall
        await rdsClient.apiCall("/api/work-sites/worksiteFiled", {
          method: "POST",
          body: JSON.stringify({ siteId })
        });
      }
    } else {
      if (typeof rdsClient.worksiteUnFiled === "function") {
        await rdsClient.worksiteUnFiled(siteId);
      } else {
        await rdsClient.apiCall("/api/work-sites/worksiteUnFiled", {
          method: "POST",
          body: JSON.stringify({ siteId })
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Błąd RDS dla slotu", slotId, err);
    res.status(500).json({ error: "RDS error" });
  }
});

app.listen(PORT, () => {
  console.log(`Nowy Styl UI listening on port ${PORT}`);
  console.log(`Otwórz: http://<adres-serwera>:${PORT}/`);
});
EOF

################################
# public/index.html
################################
cat > "$BASE_DIR/public/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <title>Tablety A i B – pola odkładcze</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #020617; /* bardzo ciemne tło */
      color: #e5e7eb;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
        sans-serif;
    }

    .app {
      background: #0f172a;
      border-radius: 16px;
      padding: 16px 20px 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);

      /* wspólny "tabletowy" format */
      width: min(100vw - 32px, 1160px);
      height: min(100vh - 32px, 720px);

      display: flex;
      flex-direction: column;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    header h1 {
      font-size: 18px;
      margin: 0;
    }

    header .hint {
      font-size: 12px;
      color: #9ca3af;
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: stretch;
      align-items: stretch;
      gap: 8px;
      padding-top: 4px;
    }

    /* Taby A/B */

    .tabs {
      display: inline-flex;
      align-self: flex-start;
      background: #020617;
      border-radius: 999px;
      padding: 4px;
      gap: 4px;
      border: 1px solid #1f2937;
    }

    .tab-button {
      all: unset;
      cursor: pointer;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      color: #e5e7eb;
      background: transparent;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .tab-button:hover {
      background: #111827;
    }

    .tab-button.active {
      background: #f59e0b;
      color: #111827;
      font-weight: 600;
    }

    /* Wspólne cechy korytarzy */

    .corridor-a,
    .corridor-b {
      flex: 1 1 auto;
      display: flex;
      justify-content: center;
      align-items: stretch;
      padding: 24px 32px;
      border-radius: 16px;
      background: #020617;
      margin: 0 auto;
      width: 100%;
      max-width: 1100px;
    }

    /* --- TABLET A + B: rząd kolumn i słupków --- */

    .column-slot {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      margin: 0 4px;
    }

    .column-slot-narrow {
      flex: 0 0 54px;
      max-width: 54px;
    }

    .column-slot-wide {
      flex: 0 0 90px;   /* szerokie sloty, dopasowane żeby się mieściły */
      max-width: 90px;
    }

    .column-pillar {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 16px;
      flex: 0 0 40px;
    }

    .pillar-square {
      width: 26px;
      height: 26px;
      border-radius: 4px;
      background: #d1d5db;
    }

    .column-gap {
      flex: 0 0 40px;
      max-width: 40px;
      margin: 0 16px; /* wizualna przerwa w układzie */
    }

    /* --- Sloty wspólne dla A i B --- */

    .slot {
      all: unset;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 8px 4px;
      min-height: 80px;
      margin: 2px 3px;
      border-radius: 8px;
      border: 2px solid #4b5563;
      box-sizing: border-box;
      cursor: pointer;
      user-select: none;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        transform 0.05s ease;
      font-size: 11px;
      flex: 1 1 0;
      width: 100%;
    }

    .slot:hover {
      transform: translateY(-1px);
    }

    .slot-empty {
      background: #111827;
      border-color: #4b5563;
      color: #e5e7eb;
    }

    .slot-filled {
      background: #f59e0b;
      border-color: #fbbf24;
      color: #111827;
      font-weight: 600;
    }

    .slot-label {
      font-size: 12px;
      margin-bottom: 2px;
    }

    .slot-type {
      font-size: 9px;
      opacity: 0.8;
      text-transform: none;
    }

    .slot-status {
      font-size: 11px;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <h1>Pola odkładcze – tablety A / B</h1>
      <div class="hint">Kliknięcie pola = zmiana stanu Wolne / Zajęte</div>
    </header>

    <div class="main">
      <div class="tabs">
        <button class="tab-button active" data-target="A">Tablet A</button>
        <button class="tab-button" data-target="B">Tablet B</button>
      </div>

      <!-- Widok tabletu A -->
      <section class="corridor-a" id="corridor-a"></section>

      <!-- Widok tabletu B -->
      <section class="corridor-b" id="corridor-b" style="display: none;"></section>
    </div>
  </div>

  <script>
    // --- KONFIGURACJA TABLETU A ---
    // Sekwencja: wide, słupek, wide, wide, wide, wide, słupek, wide, przerwa, wide, wide

    const columnsA = [
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "A01", filled: 0 },
          { id: "A09", filled: 0 }
        ]
      },
      { kind: "pillar" },
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "A02", filled: 0 },
          { id: "A10", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "A03", filled: 0 },
          { id: "A11", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "A04", filled: 0 },
          { id: "A12", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "A05", filled: 0 },
          { id: "A13", filled: 0 }
        ]
      },
      { kind: "pillar" },
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "A06", filled: 0 },
          { id: "A14", filled: 0 }
        ]
      },
      { kind: "gap" },
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "A07", filled: 0 },
          { id: "A15", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "A08", filled: 0 },
          { id: "A16", filled: 0 }
        ]
      }
    ];

    // --- LAYOUT TABLETU B (oryginalny) ---

    const columnsB = [
      // Blok 1: szeroka + 4 wąskie
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "B01", filled: 0 },
          { id: "B13", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B02", filled: 0 },
          { id: "B14", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B03", filled: 0 },
          { id: "B15", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B04", filled: 0 },
          { id: "B16", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B05", filled: 0 },
          { id: "B17", filled: 0 }
        ]
      },

      // Słupek między blokami
      { kind: "pillar" },

      // Blok 2: szeroka + 4 wąskie
      {
        kind: "slot",
        width: "WIDE",
        slots: [
          { id: "B06", filled: 0 },
          { id: "B18", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B07", filled: 0 },
          { id: "B19", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B08", filled: 0 },
          { id: "B20", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B09", filled: 0 },
          { id: "B21", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B10", filled: 0 },
          { id: "B22", filled: 0 }
        ]
      },

      // Drugi słupek
      { kind: "pillar" },

      // Blok 3: 2 wąskie
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B11", filled: 0 },
          { id: "B23", filled: 0 }
        ]
      },
      {
        kind: "slot",
        width: "NARROW",
        slots: [
          { id: "B12", filled: 0 },
          { id: "B24", filled: 0 }
        ]
      }
    ];

    const allSlots = [];

    async function syncSlotToRds(slotId, filled) {
      try {
        const resp = await fetch(
          `/api/slots/${encodeURIComponent(slotId)}/set-filled`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filled: !!filled })
          }
        );
        if (!resp.ok) {
          console.error("Błąd /api/slots:", await resp.text());
        }
      } catch (e) {
        console.error("Błąd fetch do /api/slots:", e);
      }
    }

    function createSlotButton(slot, slotType) {
      const btn = document.createElement("button");
      btn.className = "slot " + (slot.filled ? "slot-filled" : "slot-empty");
      btn.dataset.id = slot.id;
      btn.dataset.type = slotType;

      btn.innerHTML = `
        <div class="slot-label">${slot.id}</div>
        <div class="slot-type">${slotType === "WIDE" ? "szeroka" : "wąska"}</div>
        <div class="slot-status">${slot.filled ? "Zajęte" : "Wolne"}</div>
      `;

      btn.addEventListener("click", () => {
        const s = allSlots.find((x) => x.id === slot.id);
        if (!s) return;

        // optymistyczna zmiana w UI
        s.filled = s.filled ? 0 : 1;

        btn.classList.toggle("slot-filled", !!s.filled);
        btn.classList.toggle("slot-empty", !s.filled);
        btn.querySelector(".slot-status").textContent = s.filled
          ? "Zajęte"
          : "Wolne";

        syncSlotToRds(s.id, s.filled);
      });

      return btn;
    }

    function renderCorridorA() {
      const container = document.getElementById("corridor-a");
      container.innerHTML = "";

      columnsA.forEach((col) => {
        if (col.kind === "pillar") {
          const pillarCol = document.createElement("div");
          pillarCol.className = "column-pillar";
          const square = document.createElement("div");
          square.className = "pillar-square";
          pillarCol.appendChild(square);
          container.appendChild(pillarCol);
          return;
        }

        if (col.kind === "gap") {
          const gapCol = document.createElement("div");
          gapCol.className = "column-gap";
          container.appendChild(gapCol);
          return;
        }

        const colEl = document.createElement("div");
        colEl.className =
          "column-slot column-slot-" +
          (col.width === "WIDE" ? "wide" : "narrow");

        col.slots.forEach((slotDef) => {
          const slot = {
            id: slotDef.id,
            filled: slotDef.filled,
            slotType: col.width
          };
          allSlots.push(slot);

          const btn = createSlotButton(slot, col.width);
          colEl.appendChild(btn);
        });

        container.appendChild(colEl);
      });
    }

    function renderCorridorB() {
      const container = document.getElementById("corridor-b");
      container.innerHTML = "";

      columnsB.forEach((col) => {
        if (col.kind === "pillar") {
          const pillarCol = document.createElement("div");
          pillarCol.className = "column-pillar";
          const square = document.createElement("div");
          square.className = "pillar-square";
          pillarCol.appendChild(square);
          container.appendChild(pillarCol);
          return;
        }

        const colEl = document.createElement("div");
        colEl.className =
          "column-slot column-slot-" +
          (col.width === "WIDE" ? "wide" : "narrow");

        col.slots.forEach((slotDef) => {
          const slot = {
            id: slotDef.id,
            filled: slotDef.filled,
            slotType: col.width
          };
          allSlots.push(slot);

          const btn = createSlotButton(slot, col.width);
          colEl.appendChild(btn);
        });

        container.appendChild(colEl);
      });
    }

    function setupTabs() {
      const tabs = document.querySelectorAll(".tab-button");
      const corridorA = document.getElementById("corridor-a");
      const corridorB = document.getElementById("corridor-b");

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");

          const target = tab.dataset.target;
          if (target === "A") {
            corridorA.style.display = "flex";
            corridorB.style.display = "none";
          } else {
            corridorA.style.display = "none";
            corridorB.style.display = "flex";
          }
        });
      });
    }

    renderCorridorA();
    renderCorridorB();
    setupTabs();
  </script>
</body>
</html>
EOF

echo
echo "Projekt nowy-styl-ui utworzony w: $BASE_DIR"
echo "Następne kroki:"
echo "  cd $BASE_DIR"
echo "  npm install"
echo "  # skopiuj swój api-client.js do $BASE_DIR/api-client.js"
echo "  node server.js"
echo
echo "Potem otwórz w przeglądarce:  http://<adres-serwera>:3000/"
