# SEAL_COMPATIBILITY – Kompatybilność i migracje

> **Cel:** jasno powiedzieć co z czym jest zgodne i jak robić upgrade bez niespodzianek.

---

## 1) Macierz kompatybilności (MUST)

| Docset | CLI (seal) | Status | Uwagi |
| --- | --- | --- | --- |
| aktualny | aktualny | **compatible** | docset opisuje CLI z tego repo |

**Zasada (MUST):** jeśli docset i CLI pochodzą z różnych wersji repo, **nie uruchamiaj deployu**.

---

## 2) Kompatybilność platform i packagerów

### 2.1. Platforma docelowa
- **MVP:** Linux + systemd (x86_64 jako bazowy punkt odniesienia).
- Inne OS/arch są poza zakresem na tym etapie (możliwe tylko jako eksperyment).

### 2.2. Packagery
- `thin-split` (domyślny): wymaga toolchaina C/C++ + `zstd` + `libzstd-dev` na buildzie.
- `sea`: wymaga wersji Node z włączonym SEA i zgodnego toolchaina.
- `bundle/none`: działają bez narzędzi SEA, ale mają słabsze zabezpieczenia.

### 2.3. Runtime
- Runtime binarka jest częścią artefaktu (nie polega na Node z hosta).
- Wersja runtime jest spójna z buildem; mismatch skutkuje full uploadem lub fail‑fast.

---

## 3) Zasady kompatybilności (MUST)

1) **Artefakt jest per OS/arch.** Nie przenoś release między innymi architekturami.
2) **Cross‑build jest nieobsługiwany** na tym etapie (build na tej samej platformie, co target).
3) **Systemd jest wymagany** do deployu jako usługa (local/ssh).
4) **serviceScope=user** wymaga poprawnego środowiska sesji użytkownika (DBus/XDG runtime).

---

## 4) Migracje i upgrade checklist

**Minimalny checklist po upgrade:**
1) Zaktualizuj CLI (`seal`) i upewnij się, że `seal --version` jest zgodny z docsetem.
2) Uruchom `seal check <target>` (toolchain + config).
3) Uruchom `seal config explain <target>` (sprawdź źródła override).
4) Zbuduj i zweryfikuj artefakt: `seal release` + `seal verify --explain`.
5) Jeśli zmieniłeś `systemdHardening` lub `installDir` → wykonaj `seal ship <target> --bootstrap`.
6) Jeśli zmieniasz sentinel/TPM/secret/bind → zrób nowy release i (opcjonalnie) `seal sentinel install`.
7) Uruchom właściwe E2E (minimum: `SEAL_THIN_E2E=1`, a dla SSH: `SEAL_SHIP_E2E=1`).

---

## 5) Legacy / usunięte klucze (FAIL‑FAST)

Te klucze są **nieobsługiwane** i powodują fail‑fast:
- `build.thinMode`, `build.thinVariant`, `build.thinPackager`, `build.thinLevel`, `build.thinChunkSize`, `build.thinZstdLevel`, `build.thinZstdTimeoutMs`, `build.thinEnvMode`, `build.thinRuntimeStore`.
- `target.thinMode`, `target.thinVariant`, `target.thinPackager`, `target.thinLevel`, `target.thinChunkSize`, `target.thinZstdLevel`, `target.thinZstdTimeoutMs`, `target.thinEnvMode`, `target.thinRuntimeStore`.
- `build.bundleFallback`, `build.allowFallback`, `build.packagerFallback` i odpowiedniki w target.
- legacy pola w `build.protection` (np. `packSeaMain`, `stripSymbols`, `upxPack` itd.).

Zastąp je odpowiednikami w `build.thin.*` i `build.protection.*`.

---

## 6) Zasada „bezpiecznego downgrade’u”

Jeśli środowisko nie spełnia wymagań (brak toolchaina, brak systemd, brak TPM):
- **nie** rób cichego fallbacku ochrony,
- użyj jawnego `packager=bundle` lub `build.thin.*` z wyłączonymi guardami,
- loguj powód i źródło override (STD‑024/STD‑036).

---

## 7) Cross-reference

- `SEAL_DEPLOY_SPEC.md` — wymagania i kontrakty.
- `SEAL_CONFIG_SPEC.md` — pełna precedencja i schema.
- `SEAL_PACKAGER_THIN_SPEC_SCALONA.md` — szczegóły packagera thin.
- `SEAL_ANTI_REVERSE_ENGINEERING.md` — profile bezpieczeństwa.
