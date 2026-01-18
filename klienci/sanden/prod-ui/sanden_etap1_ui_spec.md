# Sanden Etap 1 - UI linii produkcyjnej (P1 / P3)

## 1. Cel i zakres

Ten dokument opisuje specyfikacje UI dla tabletu na linii produkcyjnej A1/A2 w Etapie 1 wdrozenia RDS/AGV.

Zakres UI:
- zgloszenie przywolania pustego nosnika/opakowania na miejsce P1,
- cofniecie zgloszenia P1 (bring),
- zgloszenie zabrania pustego nosnika/opakowania z P1,
- cofniecie zgloszenia P1 (remove),
- zgloszenie zabrania pelnego nosnika z produktem gotowym z P3,
- cofniecie zgloszenia P3 (remove).

Poza zakresem:
- UI dla magazynu,
- G1/G2, odpady, materialy dodatkowe,
- logika wyboru opakowan i bufory 3D.

## 2. Referencje i kontekst

Zrodla:
- `klienci/sanden/docs/sanden_etap_1.md` - Etap 1, logika RDS, role i pola.
- Ustalenia z rozmowy (P1/P3 oraz mapowanie worksite).

Kontekst Etapu 1 (skrot):
- AGV realizuje transport miedzy polami produkcji i tymczasowymi buforami magazynu.
- Operator linii generuje proste zgloszenia z tabletu.
- RDS uruchamia zadania na podstawie stanu worksite i stanu buforow.

Kontekst logistyczny:
- Dwie alejki pobierania pustych opakowan (po 6 rzedow), dedykowane osobno dla A1 i A2.
- Dwie osobne alejki odbioru pelnych opakowan z produktem gotowym, rowniez dedykowane osobno dla A1 i A2.

## 3. Terminologia i nazewnictwo

- Nosnik: jednostka transportowa (paleta/kosz/pojemnik) z opakowaniami, produktem gotowym lub odpadami.
- UI uzywa etykiet z wyrazeniem "opakowanie" dla czytelnosci operatora, ale logika w tle operuje na worksite.
- P1: pole zaopatrzenia linii w opakowania (PROD_A*_SUP / A*_IN).
- P3: pole wyrobow gotowych (PROD_A*_OUT / A*_OUT).

## 4. Mapowanie pol i worksite

Przyjmujemy nastepujace mapowanie:
- P1 = pole zaopatrzenia linii w opakowania (PROD_A*_SUP / A*_IN).
- P3 = pole wyrobow gotowych (PROD_A*_OUT / A*_OUT).

Worksite dla A1 (przyklad):
- P1 bring (przywolanie pustego nosnika): `A1_P1_BRING`
- P1 remove (zabranie pustego nosnika): `A1_P1_REMOVE`
- P3 remove (zabranie pelnego nosnika): `A1_P3_REMOVE`

Dla A2 analogicznie: `A2_P1_BRING`, `A2_P1_REMOVE`, `A2_P3_REMOVE`.

Nazwy worksite musza byc w konfiguracji (bez kodowania na sztywno w UI).

## 5. Uklad ekranu

Urzadzenie: tablet w poziomie (landscape).

Podzial ekranu:
- Lewa strona: obsluga P1.
- Prawa strona: obsluga P3.

Opcja ukladu:
- `flipLeftRight` zamienia miejscami lewa i prawa czesc panelu (P1 <-> P3),
- uzywane, gdy numeracja pol na linii idzie od przeciwnej strony.

Lewa strona (P1):
- Dwa duze przyciski typu toggle:
  - "Przywolaj puste opakowanie"
  - "Zabierz puste opakowanie"
- Widoczne stany: aktywne / nieaktywne.
- Informacja pomocnicza: co oznacza dany stan (np. "Zgloszenie aktywne").

Prawa strona (P3):
- Jeden duzy przycisk toggle:
  - "Zabierz pelne opakowanie"
- Widoczne stany: aktywne / nieaktywne.
- Ponowne klikniecie aktywnego przycisku cofa zgloszenie.

Wspolne elementy:
- Naglowek z nazwa linii (A1/A2) i miejsc (P1, P3).
- Stala czytelnosc i wysoki kontrast (obsluga w rekawicach).

## 6. Zachowanie przyciskow (logika UI)

### 6.1 Stany i wizualizacja

Kazdy przycisk ma stan:
- OFF = brak zgloszenia (worksite empty),
- ON = zgloszenie aktywne (worksite filled).

### 6.2 Zasady sterowania

P1:
- Przyciski "Przywolaj puste opakowanie" i "Zabierz puste opakowanie" sa wzajemnie rozlaczne.
- Wlaczenie jednego automatycznie wylacza drugi (najpierw OFF dla drugiego, potem ON dla wybranego).
- Ponowne klikniecie aktywnego przycisku wylacza zgloszenie.
- Szybkie klikanie: kazde klikniecie zmienia stan lokalnie i wysyla request,
  a grace period resetuje sie po kazdej zmianie (ostatnie klikniecie wyznacza stan docelowy),
  zasada dotyczy wszystkich przyciskow.

P3:
- Przycisk "Zabierz pelne opakowanie" dziala niezaleznie od P1.
- Ponowne klikniecie aktywnego przycisku wylacza zgloszenie.

### 6.3 Synchronizacja i zrodlo prawdy

Zrodlem prawdy jest stan zwracany przez backend/RDS.
UI dziala optymistycznie:
- po kliknieciu przycisku stan zmienia sie lokalnie od razu,
- request jest natychmiast wysylany do backendu,
- przez krotki czas (grace period) wstrzymujemy synchronizacje z backendem,
  aby uniknac "migania" zanim RDS zaktualizuje stan,
- po grace period cykliczny polling odswieza UI zgodnie z backendem/RDS.

Stan poczatkowy:
- brak wymagania, moze byc OFF do czasu pierwszego odswiezenia z backendu.

## 7. Kontrakt API i synchronizacja stanu

Backend odpowiada za komunikacje z RDS i udostepnia prosty kontrakt dla UI.
Konfiguracja backendu jest analogiczna do `klienci/nowy-styl/nowy-styl-ui`
(`config.runtime.json5` z `rds.host`, `rds.useMock`, `http.port`).
Zalecany zestaw endpointow:

### 7.1 Status backendu

`GET /api/status`

Przyklad odpowiedzi:
```json
{ "ok": true, "rdsOk": true, "buildId": "2025-03-18.1234", "ts": 1710771200000 }
```

Zastosowanie:
- `ok` potwierdza dzialanie backendu,
- `rdsOk=false` informuje o braku polaczenia backendu z RDS.

### 7.2 Odczyt stanu worksite

`GET /api/worksites?ids=A1_P1_BRING,A1_P1_REMOVE,A1_P3_REMOVE`

Przyklad odpowiedzi:
```json
{
  "items": [
    { "worksiteId": "A1_P1_BRING", "filled": true },
    { "worksiteId": "A1_P1_REMOVE", "filled": false },
    { "worksiteId": "A1_P3_REMOVE", "filled": false }
  ],
  "rdsOk": true,
  "source": "rds"
}
```

### 7.3 Zmiana stanu worksite

`POST /api/worksites/:worksiteId/set-filled`

Body:
```json
{ "filled": true }
```

Zasady:
- endpoint jest idempotentny (ponowne ustawienie tego samego stanu nie powoduje bledu),
- w przypadku braku worksite backend zwraca 400,
- w przypadku problemu z RDS backend zwraca 503.

### 7.4 Czestotliwosc odpytywania (domyslne)

Domyslne parametry (konfigurowalne):
- odczyt stanu worksite: co 500 ms,
- status backendu: co 1000 ms,
- timeout zapytania: 2500 ms,
- lokalny grace period po zmianie: 500 ms.
Opcja reload po powrocie polaczenia:
- `backend.reloadOnReconnect: true` powoduje automatyczny reload UI po powrocie backendu z trybu offline.

## 8. Obsluga dotyku i responsywnosc

UI powinien zachowywac sie tak jak w `klienci/nowy-styl/nowy-styl-ui`:
- reakcja na dotyk/rysik natychmiast po `pointerdown`,
- ochrona przed "ghost click" po dotyku,
- tolerancja minimalnego przesuniecia palca przy puszczeniu (slop),
- `pointercapture` dla stabilnosci,
- obsluga klawiatury (Enter/Space) jako fallback.

Long press:
- brak akcji w Etapie 1 (zarezerwowane pod przyszle rozszerzenia).

## 9. Obsluga polaczenia i bledow

Brak polaczenia z backendem:
- overlay blokuje ekran po przekroczeniu grace period,
- komunikat: "Brak polaczenia z serwerem aplikacji".

Brak polaczenia backendu z RDS:
- overlay blokuje ekran,
- komunikat: "Brak polaczenia serwera z RDS".

Bledy zmian stanu (POST):
- UI nie utrzymuje osobnego stanu bledu,
- pozostaje w stanie optymistycznym do czasu kolejnego odswiezenia,
- przy kolejnym odswiezeniu stan jest korygowany zgodnie z backendem/RDS.

Brak aktualizacji stanu (GET):
- UI utrzymuje ostatni znany stan,
- overlay kontroluje ogolny stan polaczenia.

## 10. Konfiguracja (runtime)

UI powinien miec latwa konfiguracje nazw worksite i etykiet bez zmian w kodzie.
Rekomendowany plik: `klienci/sanden/prod-ui/config.runtime.json5` (ladowany na starcie UI).

Przykladowy format (JSON/JSON5):
```json5
{
  "rds": {
    "host": "http://127.0.0.1:8080",
    "useMock": false
  },
  "http": {
    "port": 3000
  },
  "lineId": "A1",
  "ui": {
    "title": "Linia A1",
    "showWorksiteIds": false,
    "flipLeftRight": false
  },
  "labels": {
    "p1Bring": "Przywolaj puste opakowanie",
    "p1Remove": "Zabierz puste opakowanie",
    "p3Remove": "Zabierz pelne opakowanie"
  },
  "worksites": {
    "p1Bring": "A1_P1_BRING",
    "p1Remove": "A1_P1_REMOVE",
    "p3Remove": "A1_P3_REMOVE"
  },
  "backend": {
    "pollMs": 500,
    "statusPollMs": 1000,
    "fetchTimeoutMs": 2500,
    "localUpdateGraceMs": 500,
    "reloadOnReconnect": true
  }
}
```

Konfiguracja powinna pozwalac na szybka zmiane nazw worksite (np. A1/A2).

Tryb mock:
- `rds.useMock: true` oznacza, ze backend nie laczy sie z RDS i zwraca stan z mocka,
  a UI nadal komunikuje sie z backendem.
- `rds.useMock: false` laczy backend z RDS i odzwierciedla rzeczywisty stan.
- W trybie mock nie pokazujemy komunikatu "Brak polaczenia serwera z RDS".

## 11. Wymagania niefunkcjonalne

- Duze cele dotykowe (min. 48-60 px).
- Stabilna praca w trybie 24/7.
- Czytelne oznaczenia stanu.
- Szybka reakcja (odczuwalna natychmiast po dotyku).
- Idempotentne operacje po stronie backendu.

## 12. Kryteria akceptacji

- Klikniecie "Przywolaj puste opakowanie" ustawia ON i wysyla `filled=true` dla `A*_P1_BRING`.
- Klikniecie aktywnego "Przywolaj puste opakowanie" wysyla `filled=false` i wraca do OFF.
- Klikniecie "Zabierz puste opakowanie" wylacza "Przywolaj..." i aktywuje "Zabierz...".
- Klikniecie "Zabierz pelne opakowanie" dziala niezaleznie od P1 i jest odwracalne.
- Po kliknieciu stan zmienia sie natychmiast, a synchronizacja z backendem jest wstrzymana na `localUpdateGraceMs`.
- Po utracie polaczenia z backendem pojawia sie overlay w <= 2 s i blokuje UI.
- Po powrocie polaczenia overlay znika, a stany odswiezaja sie z backendu.
- Po powrocie polaczenia z backendem UI wykonuje reload, gdy `backend.reloadOnReconnect` jest wlaczone.
