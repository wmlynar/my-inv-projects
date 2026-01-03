# SEAL_HOST_BINDING_RUNBOOK – TPM/USB/NIC binding (v0.5)

> **Cel:** praktyczny runbook dla „wiązania” release do hosta bez serwera zewnętrznego.
> Obejmuje `build.thin.payloadProtection` oraz sentinel `externalAnchor`.

---

## 1) Payload protection (thin-split)

### 1.1. `provider=secret` (USB / host‑mount)
**Cel:** payload jest zaszyfrowany, a klucz pochodzi z pliku poza obrazem.

**Konfiguracja (seal.json5):**
```json5
build: {
  thin: {
    payloadProtection: {
      enabled: true,
      provider: "secret",
      secret: { path: "/mnt/secret/seal-key.bin", maxBytes: 4096 }
    }
  }
}
```

**Wymagania (MUST):**
- Plik sekretu **nie** jest w artefakcie (`.tgz`).
- Plik jest dostępny na hoście runtime **przed** startem usługi.
- Uprawnienia: preferuj `0400` lub `0440` (read-only).

**Test manualny:**
- Brak sekretu → `[thin] payload invalid`.
- Zły sekret → `[thin] payload invalid`.

**Recovery:** zmiana sekretu wymaga nowego release (ponownego `seal release`).

---

### 1.2. `provider=tpm2` (sealing klucza w TPM)
**Cel:** klucz odszyfrowuje się tylko na maszynie z konkretnym TPM/PCR.

**Konfiguracja (seal.json5):**
```json5
build: {
  thin: {
    payloadProtection: {
      enabled: true,
      provider: "tpm2",
      tpm2: { bank: "sha256", pcrs: [0, 2, 4, 7] }
    }
  }
}
```

**Wymagania (MUST):**
- TPM device: `/dev/tpm0` lub `/dev/tpmrm0`.
- Narzędzia: `tpm2_*` na buildzie i runtime (`tpm2_load`, `tpm2_unseal`).

**Szybki check:**
```
ls -l /dev/tpm0 /dev/tpmrm0
command -v tpm2_unseal
```

**Uwaga o PCR:** wartości PCR są **specyficzne dla hosta i boot‑chain**.
Zmiana firmware/bootloadera może zmienić PCR → payload nie odszyfruje się.

**Recovery:** jeśli TPM/PCR się zmieniły → zbuduj nowy release na docelowej maszynie.

---

### 1.3. Bind do NIC (MAC/IP)
**Cel:** payload działa tylko na maszynie z określoną kartą sieciową.

**Konfiguracja (seal.json5):**
```json5
build: {
  thin: {
    payloadProtection: {
      enabled: true,
      provider: "secret",
      secret: { path: "/mnt/secret/seal-key.bin" },
      bind: { iface: "eth0", mac: "aa:bb:cc:dd:ee:ff" }
    }
  }
}
```

**Rekomendacje:**
- Preferuj `mac` zamiast `ip` (IP bywa dynamiczne).
- Używaj statycznej konfiguracji sieciowej, jeśli bindujesz do IP.

**Check MAC/IP:**
```
ip link show eth0
ip addr show eth0
```

**Recovery:** zmiana NIC lub MAC/IP → nowy release.

---

## 2) Sentinel: external anchor (USB / file)

**Cel:** blokada uruchomienia bez konkretnego „kotwicy” (L4).

### 2.1. USB (rekomendowany offline)
```json5
build: {
  sentinel: {
    profile: "required",
    level: 4,
    externalAnchor: {
      type: "usb",
      usb: { vid: "05ac", pid: "12a8", serial: "C0FFEE1234" }
    }
  }
}
```

### 2.2. File (host‑mount)
```json5
build: {
  sentinel: {
    profile: "required",
    level: 4,
    externalAnchor: {
      type: "file",
      file: { path: "/mnt/secret/sentinel.anchor" }
    }
  }
}
```

**Uwaga:** external anchor wymaga `level=4` — inaczej fail‑fast.

---

## 3) Operacje i recovery

- Zmiana hosta / TPM / USB / NIC → **nowy release**.
- Jeśli potrzebujesz „czasowej” migracji, zbuduj release z inną konfiguracją bindingu.
- `seal sentinel install` generuje nowy blob; zmiana anchor wymaga reinstall.

---

## 4) Bezpieczeństwo (jawnie)

- To **anti‑casual**, nie DRM. Root z czasem i narzędziami może obejść.
- Sekret/anchor **nie może** być w artefakcie ani w repo (preferuj host‑mount).
- Binding zwiększa koszt kopiowania, ale podnosi ryzyko operacyjne (zmiany sprzętu).

---

## 5) Cross-reference

- `SEAL_PACKAGER_THIN_SPEC_SCALONA.md` — payloadProtection i native bootstrap.
- `SEAL_SENTINEL_SPEC_FINAL_v1.0.md` — sentinel i external anchor.
- `SEAL_ANTI_REVERSE_ENGINEERING.md` — ogólne warstwy ochrony.
