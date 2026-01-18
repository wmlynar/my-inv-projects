# Sanden Etap 1 - UI buforow alejek (puste / pelne opakowania)

## 1. Cel i zakres

Ten dokument opisuje specyfikacje UI dla tabletu obslugujacego alejki buforowe w Etapie 1
wdrozenia RDS/AGV (puste opakowania + pelne opakowania).

Zakres UI:
- oznaczanie zajetosci 6 miejsc w alejce buforowej dla A2,
- oznaczanie zajetosci 6 miejsc w alejce buforowej dla A1,
- przelaczanie tabami miedzy:
  - buforem pustych opakowan,
  - buforem pelnych opakowan (produkt gotowy).

Poza zakresem:
- UI dla linii produkcyjnych,
- logika doboru opakowan i bufory 3D.

## 2. Referencje i zgodnosc

Zrodla:
- `klienci/sanden/docs/sanden_etap_1.md`
- `klienci/sanden/prod-ui/sanden_etap1_ui_spec.md` (konwencje UI, polaczenia, mock).
- Styl i zachowanie dotyku jak w `klienci/nowy-styl/nowy-styl-ui`.

## 3. Uklad ekranu i nawigacja

Urzadzenie: tablet w orientacji pionowej (portrait).

Uklad:
- Na gorze: taby do przelaczania widoku:
  - "Puste opakowania"
  - "Pelne opakowania"
- Ponizej: dwie kolumny alejek (lewa/prawa).

Rozmieszczenie alejek:
- Lewa kolumna: alejka dla zasilania linii A2.
- Prawa kolumna: alejka dla zasilania linii A1.
- Etykiety kolumn (A2/A1) i podtytuly sa konfigurowalne.

Miejsca:
- Kazda alejka ma tyle miejsc, ile pozycji w konfiguracji.
- Miejsca sa ukladane od gory do dolu (1 na gorze, ostatnie na dole).

## 4. Elementy UI i stany

Kazde miejsce w alejce to przycisk toggle:
- ON (zapalony) = miejsce zajete,
- OFF (zgaszony) = miejsce wolne.

Widoczne informacje:
- Numer miejsca (1-6),
- Opcjonalnie ID worksite (konfigurowalne).

Uwaga (pelne opakowania, A1):
- dla kolumny A1 w tabie "Pelne opakowania" worksite powinny miec nazwy
  `PUT_FULL_A1_1..6` i nalezec do grupy `PUT_FULL_A1` (spojne z taskami).
- nazwy dla A2 pozostaja konfigurowalne; jesli przyjmiemy analogiczna konwencje,
  preferowane `PUT_FULL_A2_1..6`.

## 5. Logika UI

Zasada:
- Klikniecie przelacza stan lokalny (optymistycznie) i wysyla zmiane do backendu.
- Synchronizacja z backendem jest wstrzymana na `localUpdateGraceMs`,
  aby uniknac migania zanim RDS zaktualizuje stan.
- Po grace period cykliczny polling odswieza UI zgodnie z backendem/RDS.
- Szybkie klikanie: kazde klikniecie zmienia stan lokalny i wysyla request,
  a grace period resetuje sie po kazdej zmianie (ostatnie klikniecie wyznacza stan docelowy).

Brak dodatkowych zaleznosci miedzy miejscami (kazde miejsce niezalezne).

Stan poczatkowy:
- brak wymagania, moze byc OFF do czasu pierwszego odswiezenia z backendu.

## 6. Kontrakt API i polaczenie

Analogicznie do UI dla linii produkcyjnych:
- `GET /api/status`
- `GET /api/ui-config`
- `GET /api/worksites?ids=...`
- `POST /api/worksites/:worksiteId/set-filled` z `{ "filled": true/false }`

Parametry polaczenia (domyslne):
- timeout zapytania: 2500 ms,
- status backendu: co 1000 ms,
- grace period dla backend/RDS: 2000 ms.
Opcja reload po powrocie polaczenia:
- `backend.reloadOnReconnect: true` powoduje automatyczny reload UI po powrocie backendu z trybu offline.

Przyklad odpowiedzi statusu:
```json
{ "ok": true, "rdsOk": true, "buildId": "2025-03-18.1234", "ts": 1710771200000 }
```

Przyklad odpowiedzi konfiguracji:
```json
{ "ui": { "title": "Bufory Sanden", "showWorksiteIds": false }, "tabs": [] }
```

Tryb mock:
- `rds.useMock: true` oznacza, ze backend nie laczy sie z RDS i zwraca stan z mocka,
  a UI nadal komunikuje sie z backendem.
- `rds.useMock: false` laczy backend z RDS i odzwierciedla rzeczywisty stan.
- W trybie mock nie pokazujemy komunikatu "Brak polaczenia serwera z RDS".

Overlay:
- Blokuje UI przy braku polaczenia z backendem.
- Pokazuje osobny komunikat przy braku polaczenia backendu z RDS.

## 7. Konfiguracja (runtime)

Konfiguracja jest analogiczna do `klienci/sanden/prod-ui` i `nowy-styl-ui`:
- `rds.host`, `rds.useMock`, `rds.username`, `rds.password`, `rds.language`, `http.port`
- parametry UI i backendu
- mapowanie worksite per tab i per alejka

Przykladowy format (JSON5):
```json5
{
  rds: {
    host: "http://127.0.0.1:8080",
    useMock: true,
    username: "admin",
    password: "123456",
    language: "pl"
  },
  http: { port: 3200 },
  ui: {
    title: "Bufory Sanden",
    showWorksiteIds: false,
    aisleLabels: { A2: "A2", A1: "A1" },
    aisleHints: { A2: "Lewa alejka", A1: "Prawa alejka" }
  },
  tabs: [
    {
      id: "empty",
      label: "Puste opakowania",
      aisles: {
        A2: ["A2_EMPTY_01", "A2_EMPTY_02", "A2_EMPTY_03", "A2_EMPTY_04", "A2_EMPTY_05", "A2_EMPTY_06"],
        A1: ["A1_EMPTY_01", "A1_EMPTY_02", "A1_EMPTY_03", "A1_EMPTY_04", "A1_EMPTY_05", "A1_EMPTY_06"]
      }
    },
    {
      id: "full",
      label: "Pelne opakowania",
      aisles: {
        A2: ["A2_FULL_01", "A2_FULL_02", "A2_FULL_03", "A2_FULL_04", "A2_FULL_05", "A2_FULL_06"],
        A1: ["PUT_FULL_A1_1", "PUT_FULL_A1_2", "PUT_FULL_A1_3", "PUT_FULL_A1_4", "PUT_FULL_A1_5", "PUT_FULL_A1_6"]
      }
    }
  ],
  backend: {
    pollMs: 500,
    statusPollMs: 1000,
    fetchTimeoutMs: 2500,
    localUpdateGraceMs: 500,
    reloadOnReconnect: true
  }
}
```

Nazwy worksite musza byc w konfiguracji (bez kodowania na sztywno w UI).

Mapowanie pozycji:
- indeks 0 w tablicy = miejsce na gorze,
- indeks 5 w tablicy = miejsce na dole.

Polling tabow:
- stan miejsc jest odswiezany dla aktywnego taba,
- po przelaczeniu taba UI natychmiast odswieza dane dla nowego taba.

Reload:
- jesli backend zwroci nowe `buildId`, UI wykonuje automatyczny reload.

## 8. Obsluga dotyku

Jak w `nowy-styl-ui`:
- reakcja na dotyk/rysik natychmiast po `pointerdown`,
- ochrona przed "ghost click",
- tolerancja minimalnego przesuniecia palca przy puszczeniu,
- `pointercapture` dla stabilnosci.

## 9. Wymagania niefunkcjonalne

- Duze cele dotykowe (min. 48-60 px).
- Czytelny podzial A2 (lewa) / A1 (prawa).
- Stabilna praca 24/7.
- Konfiguracja i uruchomienie zgodne z `seal.json5` oraz `seal-config/*` (jak w `prod-ui`).

## 10. Kryteria akceptacji

- Przelaczenie taba zmienia zestaw alejek bez utraty stanu w UI.
- Klikniecie miejsca zmienia stan natychmiast i wysyla request do backendu.
- Po `localUpdateGraceMs` UI synchronizuje sie z backendem/RDS.
- Brak polaczenia z backendem powoduje overlay i blokade UI.
- Przy zmianie `buildId` UI przeladowuje sie automatycznie.
- Po powrocie polaczenia z backendem UI wykonuje reload, gdy `backend.reloadOnReconnect` jest wlaczone.
