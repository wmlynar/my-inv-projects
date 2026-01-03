# SEAL_TROUBLESHOOTING – Najczęstsze problemy i naprawy (v0.5)

> **Cel:** szybkie „symptom → przyczyna → fix”. Dokument operacyjny, nie spec.

---

## 0) Szybka checklista (pierwsza pomoc)

1) `seal check <target>` — toolchain + config.
2) `seal config explain <target>` — źródła override.
3) `seal verify --explain` — sanity‑check artefaktu.
4) `seal remote <target> status` + `seal remote <target> logs` — stan usługi.
5) `seal diag <target>` — bundle diagnostyczny.

---

## 1) Build / Release

### 1.1. `pkg-config failed` / brak `zstd` / brak kompilatora
**Symptom:** `seal check` albo build failuje na `pkg-config`, `cc`, `libzstd`.

**Przyczyna:** brak zależności systemowych.

**Fix:**
```
sudo apt-get update
sudo apt-get install -y build-essential pkg-config zstd libzstd-dev
```

### 1.2. `C compiler not found (cc/gcc)`
**Fix:** zainstaluj `build-essential` lub ustaw `--check-cc gcc` w `seal check`.

---

## 2) Deploy / systemd

### 2.1. `deploy lock busy` (SSH)
**Symptom:** `deploy lock busy ... .seal-tmp/...lock`.

**Przyczyna:** równoległy deploy lub poprzedni run nie zwolnił locka.

**Fix:**
- Odczekaj TTL (domyślnie 900s) **albo** usuń lock ręcznie:
```
ssh admin@<host> "rm -rf /home/admin/apps/<app>/.seal-tmp/seal-deploy-<service>.lock"
```

### 2.2. `status=200/CHDIR` / `Failed to patch WorkingDirectory`
**Symptom:** systemd nie startuje, a log mówi o CHDIR.

**Przyczyna:** brak `installDir` lub `run-current.sh`.

**Fix:**
```
seal ship <target> --bootstrap
seal remote <target> restart
```

### 2.3. `Config drift detected` / `Config missing on target`
**Fix:**
- Jeśli chcesz nadpisać config na serwerze:
  `seal config push <target>` albo `seal ship <target> --push-config`.
- Jeśli chcesz tylko uruchomić mimo driftu: `--accept-drift` (świadomie).

### 2.4. Readiness timeout
**Symptom:** `Waiting for readiness` kończy się timeoutem.

**Przyczyny:**
- zły URL health‑check,
- brak `curl/wget/python3` na hoście dla HTTP readiness,
- aplikacja nie startuje.

**Fix:**
- Sprawdź endpoint (`/healthz` lub `/api/status`).
- Zainstaluj `curl`/`wget` lub ustaw `readiness.mode=systemd`.
- Przejrzyj `seal remote <target> logs`.

---

## 3) Runtime / sealed

### 3.1. `[thin] runtime invalid`
**Przyczyny:**
- anti‑debug/anti‑tamper zablokował start,
- sentinel niepoprawny,
- integrity mismatch.

**Fix (kolejność):**
1) `seal sentinel verify <target>`
2) `seal remote <target> logs` (szukaj hintów)
3) Jeśli to test/dev: wyłącz konkretny guard w `build.thin.*` (jawnie!)

### 3.2. `[thin] payload invalid`
**Przyczyny:**
- brak sekretu (`payloadProtection=secret`),
- TPM unseal fail (`payloadProtection=tpm2`),
- mismatch bind (MAC/IP).

**Fix:**
- upewnij się, że sekret/TPM/NIC są dostępne na hoście,
- jeśli zmieniłeś host/bind → zbuduj **nowy release**.

---

## 4) Sentinel

### 4.1. `sentinel missing` / `sentinel verify failed`
**Fix:**
```
seal sentinel install <target>
seal sentinel verify <target>
```

### 4.2. `sentinel expired`
**Fix:**
- Jeśli używasz `timeLimit` → zbuduj nowy blob (`seal sentinel install --force`).
- Sprawdź czas systemowy na hoście (NTP).

---

## 5) SSH / uprawnienia

### 5.1. Brak `sudo` lub `NOPASSWD`
**Symptom:** preflight fails z „passwordless sudo missing”.

**Fix:** skonfiguruj `NOPASSWD` dla deploy usera **albo** ustaw `target.preflight.requireSudo=false`.

### 5.2. `systemctl --user` bez sesji
**Symptom:** błędy DBus/XDG w logach.

**Fix:** użyj `serviceScope=system` (z sudo) albo uruchamiaj w interaktywnej sesji z DBus.

---

## 6) Gdzie szukać dodatkowych wskazówek

- `SEAL_PITFALLS.md` — katalog realnych błędów i wymagań.
- `SEAL_E2E_RUNBOOK.md` — jak uruchamiać E2E i czego potrzebują.
- `SEAL_HOST_BINDING_RUNBOOK.md` — TPM/USB/NIC bind.
