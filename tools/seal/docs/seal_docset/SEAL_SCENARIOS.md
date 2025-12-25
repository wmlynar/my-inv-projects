# SEAL_SCENARIOS – Scenariusze użytkownika (v0.5)

> Ten dokument to „ściąga”: typowe sytuacje i minimalne komendy.
> Zasada: jeśli nie wiesz co dalej, wpisz `seal` – CLI podpowie następny krok.

---

## S1) Start nowego projektu pod SEAL
**Cel:** dodać minimalne pliki SEAL i mieć dev-ready konfigurację.

```bash
seal init
node <entrypoint>
```

---

## S2) Podłączenie istniejącego projektu pod SEAL (ADOPT)
**Cel:** dołożyć SEAL do już działającej aplikacji bez zmiany sposobu dev-run.

```bash
cd istniejący-projekt
seal init
node <entrypoint>   # lub: npm run dev
```

Checklist (jeśli coś nie działa):
- aplikacja musi umieć czytać `config.runtime.json5`,
- logi na stdout/stderr,
- `/healthz` i `/status` zgodnie z SEAL_STANDARD.

---

## S3) Uruchomienie lokalne w dev (bez sealingu)
**Cel:** normalny development.

```bash
node <entrypoint>
# albo:
npm run dev
```

---

## S4) Szybki preflight przed sealingiem
**Cel:** wykryć „miny” bundlowania/SEA zanim wejdziesz w obfuskację.

```bash
seal check
```

---

## S5) Sealing: zbuduj artefakt i przejrzyj go
**Cel:** zobaczyć, co faktycznie powstaje i czy jest „sealed”.

```bash
seal release
seal verify --explain
ls -la seal-out
ls -la seal-out/release
```

**TL;DR review checklist (przed zamknięciem zadania):**
1) Bledy/reguly dopisane do `SEAL_PITFALLS.md`.
2) Reguly ogolne dopisane do `SEAL_STANDARD.md`.
3) E2E ma timeouty per‑test/per‑krok.
4) Subprocessy obsluguja `error` i nie wisza.
5) Procesy w testach maja drenaz stdout/stderr.
6) UI testy zamykaja browser/page w `finally`.

---

## S6) Uruchomienie lokalne po obfuskacji (sealed)
**Cel:** przetestować działanie w trybie „po sealingu”, bez deployu.

```bash
seal release
seal run-local
```

Fallback (ręczny):
```bash
# utwórz config.runtime.json5 z seal-config/configs/local.json5 (kopiuj treść)
./seal-out/release/<app>
```

---

## S7) Test deployu na localhost (bez „prawdziwego” serwera)
**Cel:** przetestować ścieżkę serwerową, ale na maszynie dev.

```bash
seal deploy local --bootstrap
seal deploy local
seal restart local
seal status local
```

---

## S8) Deploy na localhost jako usługa + restart
**Cel:** przetestować systemd i cykl życia.

```bash
seal deploy local
seal restart local
seal logs local
```

---

## S9) Dodanie nowego środowiska serwerowego (target + config)
**Cel:** dodać nowy serwer jako „cel deployu”.

```bash
seal target add robot-01
seal config add robot-01
seal explain robot-01
```

---

## S10) Przygotowanie środowiska pod SEAL (bootstrap przez SSH)
**Cel:** jednorazowo przygotować serwer (katalogi, appctl, unit).

```bash
seal deploy robot-01 --bootstrap
```

---

## S11) Aktualizacja konfiguracji (deploy + runtime)
**Cel:** zmienić config i mieć kontrolę nad driftem.

```bash
seal config diff robot-01
seal config pull robot-01 --apply     # serwer → repo (świadome)
seal deploy robot-01 --push-config    # repo → serwer (świadome)
```

---

## S12) Deploy sealed aplikacji na zdalny serwer (test)
**Cel:** standardowy deploy.

```bash
seal deploy robot-01
seal restart robot-01
seal status robot-01
seal logs robot-01
```

---

## S13) Ręczne uruchomienie aplikacji na zdalnym serwerze (foreground)
**Cel:** diagnostyka „na żywo”.

```bash
seal run robot-01
```

---

## S14) Instalacja jako usługa + restart / one-click update
**Cel:** nowe wydanie i restart usługi jednym krokiem.

```bash
seal deploy robot-01 --restart
```

---

## S15) Lista release i rollback ręczny
**Cel:** zobaczyć wersje i cofnąć się.

```bash
seal releases robot-01
seal rollback robot-01
# lub precyzyjnie:
seal rollback robot-01 --to <buildId>
```

---

## S16) Build-only vs deploy-only (CI / airgap)
**Cel:** build robisz tam, gdzie masz źródła; deploy robisz tam, gdzie masz tylko artefakt.

Build (na maszynie z kodem):
```bash
seal release --artifact-only
# wynik: seal-out/<app>-<buildId>.tgz
```

Deploy (na maszynie „deploy-only”):
```bash
seal deploy robot-01 --artifact seal-out/<app>-<buildId>.tgz
```

---

## S17) Deploy na wiele targetów (fleet)
**Cel:** jedno wydanie na wiele robotów/hostów.

```bash
seal deploy robot-01 robot-02 robot-03
```

---

## S17b) Deploy na wiele projektów (monorepo)
**Cel:** jedna komenda dla wielu projektów pod wspólnym folderem.

```bash
seal batch deploy prod --root klienci/nowy-styl
```

Przydatne opcje:
- `--filter <text>` – ogranicz listę po ścieżce/nazwie aplikacji
- `--dry-run` – tylko wypisz listę projektów
- `--keep-going` – kontynuuj mimo błędów

---

## S18) Diagnostyka po awarii
**Cel:** gdy coś padło, mieć komplet materiału do analizy.

```bash
seal doctor
# artefakty diagnostyczne:
ls -la seal-out/run
```

---

## S19) Odinstalowanie / cleanup na serwerze
**Cel:** usunąć usługę i pliki (np. po testach).

```bash
seal uninstall robot-01
# opcjonalnie:
seal uninstall robot-01 --keep-config
```

---

## S20) Toolchain: instalacja / aktualizacja / prefetch offline
**Cel:** przygotować środowisko dev bez niespodzianek.

```bash
seal toolchain status
seal toolchain install
```

---
