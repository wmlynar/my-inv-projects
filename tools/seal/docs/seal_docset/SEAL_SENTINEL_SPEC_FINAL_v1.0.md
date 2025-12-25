# SEAL‑SENTINEL — specyfikacja finalna (MVP‑ready)

Wersja: **1.0**  
Data: **2025‑12‑25**  
Status: **finalna do implementacji MVP**  
Dotyczy: **SEAL v0.6+**, builder/packager **`thin`** (launcher ELF)

Ta wersja jest spójną konsolidacją wszystkich dotychczasowych specyfikacji (v0.1–v0.6) i recenzji (Thinking + Pro).  
Jeśli jakiś element musiał wypaść dla spójności, jest to opisane w sekcji **„Z czego zrezygnowaliśmy”**.

---

## 0. Najkrótszy opis idei

**SEAL‑SENTINEL** to lokalny znacznik instalacji (binarny blob), który:

- jest **instalowany w `--bootstrap`** (po stronie deployera, przez SSH + sudo),
- jest **weryfikowany w runtime przez thin launcher** (zanim wystartuje Node/payload),
- jest trzymany **poza** `<installDir>` (żeby zwykłe „skopiuj katalog aplikacji” nie wystarczało),
- przy awarii daje **opaque failure**: użytkownik widzi błąd typu „runtime invalid / missing component”, a nie „sentinel missing”.

Mechanizm jest **anti‑casual**, nie DRM: root + RE/debug może obejść. Celem jest usunięcie „łatwych kopiowań”, a nie absolutna niełamalność.

Dodatkowo (opcjonalnie) jest poziom **Level 4 (anti‑clone)**, który utrudnia uruchomienie po **pełnym klonowaniu VM/dysku**, w tym przeniesienie VirtualBox VM na inny komputer nawet przy `--cpuidremoveall "1"` — bo L4 nie opiera się o CPUID, tylko o **zewnętrzną kotwicę (external anchor)**.

---

## 1. Słownik i normatywność

- **MUST**: wymagane (inaczej spec nie jest spełniona)
- **SHOULD**: zalecane (można odstąpić świadomie i z uzasadnieniem)
- **MAY**: opcjonalne

**Pojęcia:**
- `<installDir>` — katalog instalacji aplikacji (releases/runtime/payload itd.)
- **thin launcher** — ELF uruchamiany przez systemd (to on robi weryfikację)
- **deployer** — osoba/pipeline wykonująca bootstrap przez SSH
- **blob** — plik sentinela (76 bajtów)
- **namespaceId** — 16‑bajtowy sekret po stronie deployera (anchor do ścieżek)
- **appId** — stabilny identyfikator usługi (anty‑kolizyjny, normalizowany)

---

## 2. Cele, ograniczenia, threat model

### 2.1 Cele (MUST)
1) **Kopiowanie samego `<installDir>` nie działa**  
   Start na innym hoście/VM ma się wysypać, bo brakuje elementu poza `<installDir>`.

2) **Stealth / OPSEC**  
   - brak zdradzających nazw (`seal`, `sentinel`, `license`, `guard`, itp.) na serwerze,  
   - brak zdradzających logów i komunikatów,  
   - awarie mają wyglądać jak zwykłe „runtime invalid / missing component”.

3) **Update‑safe**  
   Mechanizm ma przeżyć `apt upgrade`, redeploy payloadu, rollback release — o ile host nie zmienił tożsamości wg wybranego levelu.

4) **Brak restart‑storm**  
   Sentinel failure nie może powodować pętli restartów systemd.

5) **Uninstall sprząta**  
   `seal uninstall` usuwa sentinel (blob i ewentualny xattr).

### 2.2 Non‑goals (świadomie)
- To **nie jest DRM**.
- Nie bronimy przed root + RE/debug.
- Poziomy 0–3 **nie bronią** przed pełnym klonem dysku/VM (bo klon przenosi też machine‑id/RID i blob).  
  Do tego służy **Level 4** (external anchor).

---

## 3. Zakres: gdzie sentinel działa

### 3.1 Tylko `thin` (MUST)
Sentinel jest weryfikowany **wyłącznie** w **thin launcherze (ELF)**, zanim uruchomi się runtime/payload.

Dla innych builderów/packagerów:
- sentinel jest pomijany (**MAY**: całkowicie wyłączony).

---

## 4. Konfiguracja (tylko po stronie deployera)

### 4.1 Zasada „no meta on server” (MUST)
Na serwerze **nie przechowujemy** jawnie:
- ścieżki sentinela,
- levelu,
- namespaceId,
- ustawień external anchor,
- itp.

Na serwerze istnieje tylko:
- blob sentinela w nieopisowej lokalizacji,
- opcjonalnie xattr na tym blobie.

### 4.2 Schema (propozycja)
`seal-config/project.json5`:

```json5
{
  build: {
    packager: "thin",
    sentinel: {
      enabled: "auto",           // auto | true | false

      // auto | 0 | 1 | 2 | 3 | 4
      level: "auto",

      // stabilny identyfikator usługi (anty-kolizje)
      appId: "auto",

      // sekret 16B (hex32)
      namespaceId: "auto",

      // CPU ID source (opcjonalne)
      cpuIdSource: "auto",       // auto | off | proc | asm | both

      // storage
      storage: {
        baseDir: "/var/lib",     // default
        mode: "file"             // file | file+xattr
      },

      // systemd / exit policy
      exitCodeBlock: 200,        // zarezerwowany kod dla "fatal pre-launch" (patrz §11)

      // anti-clone (Level 4)
      externalAnchor: { type: "none" } // none | usb | file | lease | tpm2
    }
  }
}
```

`seal-config/targets/<target>.json5` MAY nadpisywać `build.sentinel.*` (np. level, storage.mode, externalAnchor).

### 4.3 Merge configu (MUST)
Efektywna konfiguracja:

1) start od `project.json5`  
2) nałóż override z `targets/<target>.json5`  
3) rozwiąż `auto`:
   - `enabled:auto` → `true` tylko gdy builder = `thin`, inaczej `false`
   - `appId:auto` → `serviceName` targetu (po normalizacji)
   - `namespaceId:auto` → patrz §4.5
   - `level:auto` → patrz §8.3
   - `cpuIdSource:auto` → `both`
4) waliduj i normalizuj `appId` (§4.4)

### 4.4 Normalizacja `appId` (MUST)
`appId` MUST spełniać:
- ASCII: `[a-z0-9._-]`
- lower‑case
- bez spacji
- bez `\0`
- długość 1..64

Inaczej: config error po stronie deployera.

### 4.5 `namespaceId:auto` — generowanie i trwałe przechowywanie (MUST)
`namespaceId` to sekret (16 bajtów), który ma być **stabilny** w czasie.

MUST:
- jeśli `namespaceId=auto`, wygeneruj **raz** przez CSPRNG (16 bajtów),
- zapisz w prywatnym store po stronie deployera,
- kolejne deploy/build używają tej samej wartości.

Rekomendowany store (deployer, gitignored):
- `seal-config/.private/targets/<target>.json5`  
albo w systemie CI jako secret (np. env var) z mapowaniem na target.

**Nie używamy** przykładowych ścieżek typu `.seal/...` (żeby nie sugerować takiej nazwy na serwerze).

### 4.6 Które pola muszą trafić do thin launchera (MUST)
Thin launcher **musi** znać (w runtime):
- `namespaceId` (16B),
- `appId` (znormalizowane),
- `storage.baseDir`,
- `cpuIdSource` (off/proc/asm/both),
- `exitCodeBlock`,
- jeśli Level 4: konfigurację externalAnchor.

To są parametry „security/deploy” — nie trafiają do Node configów i nie są jawnie wypisywane na serwerze.

---

## 5. Lokalizacja i nazewnictwo sentinela (storage)

### 5.1 Wymagania lokalizacji (MUST)
- blob **nie może leżeć w `<installDir>`**
- nazwy plików/katalogów **nie mogą zdradzać przeznaczenia**
- uninstall potrafi wyliczyć ścieżkę **bez metadanych na serwerze**

### 5.2 `baseDir` (domyślnie `/var/lib`)
Domyślnie:
- `baseDir=/var/lib`

Override jest dopuszczalny (**MAY**) jako „fixed folder”, ale:
- `baseDir` musi być znane thin launcherowi (patrz §4.6).

### 5.3 Wymogi bezpieczeństwa dla `baseDir` (MUST)
Bootstrap MUST zweryfikować:
- `baseDir` istnieje i jest katalogiem,
- `baseDir` **nie jest symlinkiem** (`lstat`),
- owner = root,
- `(mode & 0o022) == 0` (nie group‑writable i nie world‑writable),
- `baseDir` jest **searchable (`x`) dla serviceUser** (np. 0755 lub 0711).

SHOULD:
- wykryć ACL dające write (jeśli możliwe) lub przynajmniej ostrzec w `probe`,
- operować przez `open(baseDir, O_DIRECTORY)` + `openat` (anti‑TOCTOU).

### 5.4 Opaque naming (MUST)
Definiujemy:
- `ns = bytes(namespaceId)` (16 bajtów)
- `aid = utf8(appId)` (po normalizacji)
- `anchor = b"n\0" + ns + b"\0" + aid`

**Uwaga:** `"\0"` to bajt 0x00. Operujemy na tablicach bajtów, nie na C‑stringach.

Nazwy:
- `opaque_dir  = "." + hex(sha256(b"d\0" + ns))[0:10]`
- `opaque_file =       hex(sha256(b"f\0" + anchor))[0:12]`

Ścieżka:
- `<baseDir>/<opaque_dir>/<opaque_file>`

To daje:
- **1 katalog per namespaceId** (mniej “szumu” w `/var/lib`),
- wiele plików per `appId` (anty‑kolizje).

### 5.5 Uprawnienia (MUST)
- katalog `<opaque_dir>`:
  - owner: root
  - group: `serviceGroup`
  - mode: **0710**
- plik `<opaque_file>`:
  - owner: root
  - group: `serviceGroup`
  - mode: **0640**

Zalecenie operacyjne (SHOULD):
- `serviceUser` powinien być osobnym kontem usługi (nie tym samym co SSH deploy user), żeby “użytkownik‑kopiujący” nie był w `serviceGroup`.

### 5.6 Skąd `serviceGroup` (MUST)
Źródło prawdy:
1) jeśli generator unita zna `Group=` → użyj tego,
2) jeśli `Group=` brak, ale znasz `User=` → użyj primary group tego usera,
3) jeśli nie potrafisz ustalić → **bootstrap MUST fail** (inaczej będzie “czasem działa”).

---

## 6. Tryby storage: `file` i `file+xattr`

### 6.1 `mode=file` (MVP, MUST)
Runtime wymaga tylko obecności i zgodności blobu.

### 6.2 `mode=file+xattr` (EXT1, SHOULD)
Quorum 2/2:
1) blob plikowy
2) **xattr na tym blobie** (nie na `<installDir>` i nie na `/proc/self/exe`)

To:
- nie zależy od wyliczania installRoot,
- nie “znika” przy redeploy plików w `<installDir>`,
- podnosi próg kopiowania (typowe kopie nie przenoszą xattr bez opcji).

### 6.3 xattr: nazwa i wartość (MUST dla `file+xattr`)
- `xattr_name  = "user." + hex(sha256(b"x\0" + anchor))[0:10]`
- `xattr_value = first16(sha256(b"v\0" + install_id))` (16 bajtów)

Weryfikacja:
- thin wylicza oczekiwaną wartość z `install_id` z blobu
- porównuje z `fgetxattr(blob_fd, xattr_name)`

Jeśli FS nie wspiera `user_xattr` (lub mount ma `nouser_xattr`):
- przy `file+xattr` → fail (opaque)
- przy `file` → ignoruj

`probe` MUST wykrywać wsparcie xattr.

---

## 7. Format bloba (v1) i integralność

### 7.1 Struktura (MUST)
Stała długość: **76 bajtów**

| Offset | Rozmiar | Pole | Opis |
|---:|---:|---|---|
| 0 | 1 | `version` | 1 |
| 1 | 1 | `level` | 0/1/2/3/4 |
| 2 | 2 | `flags` | u16 LE |
| 4 | 4 | `reserved` | u32 LE = 0 |
| 8 | 32 | `install_id` | losowe 256‑bit (per instalacja) |
| 40 | 32 | `fp_hash` | SHA‑256 fingerprint string |
| 72 | 4 | `crc32` | u32 LE (CRC32 po bajtach 0..71) |

### 7.2 Flagi (MUST)
- `0x0001` — `FLAG_REQUIRE_XATTR` (mode=file+xattr)
- `0x0002` — `FLAG_L4_INCLUDE_PUID` (L4 ma uwzględniać `puid` jeśli dostępne)
- `0x0004` — `FLAG_INCLUDE_CPUID` (uwzględnij `cpuid` w fingerprint, jeśli dostępne)

### 7.3 CRC32 — wariant (MUST)
CRC32 = **CRC‑32/ISO‑HDLC** (jak gzip/zlib).  
Test kontrolny:
- CRC32("123456789") == **0xCBF43926**

Pole `crc32` zapisujemy jako **little‑endian**.

### 7.4 Maskowanie (SHOULD)
Żeby `version/level/flags` nie leżały jawnie:

- `maskKey = sha256(b"m\0" + anchor)[0..31]`
- bajty `0..71` XOR z `maskKey[i mod 32]`
- CRC32 liczone po **zamaskowanych** bajtach 0..71
- runtime: najpierw CRC32 verify, potem unmask i parsowanie

### 7.5 HMAC (future, MAY)
Jeśli kiedyś chcecie podnieść próg “edytuję bajty + przeliczam CRC”, można wprowadzić `version=2` z HMAC. Nie jest wymagane do MVP.

---

## 8. Fingerprint hosta (update‑safe) i poziomy (level)

### 8.1 Źródła danych (Ubuntu/Linux) (MUST)
- `mid`: `/etc/machine-id`
- `rid`: §8.4
- `puid`: `/sys/class/dmi/id/product_uuid` (opcjonalne)
- `cpuid`: `/proc/cpuinfo` (opcjonalne), kanonicznie:
  - `vendor_id`, `cpu family`, `model`, `stepping` z **pierwszego** CPU
  - format: `vendor:family:model:stepping` (lower‑case, bez spacji)
- `eah`: external anchor hash (Level 4, §9)

**CPUID jest tylko sygnałem pomocniczym**: używamy go jako dodatkowej kotwicy (gdy dostępne), ale **nigdy** jako jedynego źródła fingerprintu.  
Wirtualizacja może go ukryć/zmienić (np. VirtualBox `--cpuidremoveall "1"`), więc **nie polegamy** na nim dla bezpieczeństwa — jest flagowany w blobie i opcjonalny.

`cpuIdSource` (config):
- `auto` — **domyślnie** `both`
- `off` — CPUID nie jest używane (flaga nie jest ustawiana)
- `proc` — CPUID z `/proc/cpuinfo` (`cpuid=proc:<...>`)
- `asm` — CPUID z instrukcji `cpuid` (x86/x64) (`cpuid=asm:<...>`)
- `both` — **oba** źródła są użyte niezależnie (`cpuid=proc:<...>|asm:<...>`).  
  Zmiana któregokolwiek źródła = mismatch fingerprint.

Jeśli `cpuIdSource` wymaga `asm`, deployer **musi** mieć możliwość pobrania CPUID z hosta (np. przez `cc` podczas instalacji). Brak wsparcia architektury lub brak narzędzi = błąd (bez fallbacku).

CPUID jest używane tylko dla leveli **L1+** (dla L0 nie ma `cpuid` w fingerprint).

Uwaga: na architekturach bez CPUID (np. ARM) ustaw `cpuIdSource=off` (lub świadomie `proc`, jeśli masz własne mapowanie), bo `auto → both` wymaga ścieżki `asm`.

### 8.2 Czego absolutnie nie robić (MUST)
Nie opierać fingerprintu o:
- hash `/usr`, `/lib`, `/bin`,
- listę pakietów `dpkg -l`,
- hash kernela/initramfs.

To nie jest update‑safe.

### 8.3 `level=auto` (MUST)
- jeśli `externalAnchor.type != "none"` i provider dostępny → **L4**
- inaczej:
  - jeśli `rid` jest **stabilny** → **L2**
  - inaczej → **L1**
- L3 jest **opt‑in** (tylko jeśli deployer wybierze `level=3` albo politykę wprost)

### 8.4 `rid` — algorytm (MUST) i stabilność
Algorytm:
1) z `/proc/self/mountinfo` wybierz mountpoint `/`
2) odczytaj `major:minor`
3) znajdź symlink w `/dev/disk/by-uuid/*`, który wskazuje na device o tym samym `major:minor`
   - jeśli znalazłeś: `rid = "uuid:<name>"`
4) jeśli brak, spróbuj `/dev/disk/by-partuuid/*`
   - jeśli znalazłeś: `rid = "partuuid:<name>"`
5) fallback:
   - `rid = "dev:<major>:<minor>"`

Stabilność RID:
- `uuid:` i `partuuid:` traktujemy jako **stabilne** (dla auto→L2)
- `dev:` traktujemy jako **niestabilne** (auto MUST spaść do L1)
- jeśli `/` to overlay/tmpfs → RID uznajemy za niestabilny

SHOULD:
- mieć budżet czasu/limit skanowania `/dev/disk` (żeby start nie wisiał na egzotycznych hostach)

---

## 9. Level 4 (anti‑clone): external anchor

### 9.1 Idea (MUST)
L4 dokłada do fingerprintu wartość `eah`, która pochodzi z **zewnętrznej kotwicy** (external anchor) — czegoś, czego typowy klon VM/dysku **nie przenosi**.

MUST (dla L4):
- external anchor musi być **poza** obrazem/FS, który jest klonowany (np. USB passthrough, osobny mount, lease online).

### 9.2 `eah` (MUST)
- `anchor_bytes` — kanoniczny bajtowy opis provider’a (patrz niżej)
- `eah = sha256(anchor_bytes).hexdigest()` (64 znaki hex, lower‑case)

### 9.3 Kanoniczny fingerprint string (MUST)
Fingerprint string jest UTF‑8, z `\n` jako końcem linii i **zawsze kończy się `\n`**.

- L0:
  ```
  v0
  ```
- L1:
  ```
  v1
  mid=<machine-id>
  [cpuid=<cpuid>  jeśli FLAG_INCLUDE_CPUID]
  ```
- L2:
  ```
  v2
  mid=<machine-id>
  rid=<rid>
  [cpuid=<cpuid>  jeśli FLAG_INCLUDE_CPUID]
  ```
- L3 (opt‑in):
  ```
  v3
  mid=<machine-id>
  rid=<rid>
  puid=<product-uuid>
  [cpuid=<cpuid>  jeśli FLAG_INCLUDE_CPUID]
  ```
- L4:
  ```
  v4
  mid=<machine-id>
  rid=<rid>
  [cpuid=<cpuid>  jeśli FLAG_INCLUDE_CPUID]
  [puid=<product-uuid>  jeśli FLAG_L4_INCLUDE_PUID]
  eah=<external-anchor-sha256-hex>
  ```

`fp_hash = sha256(fingerprint_string_bytes)`.

### 9.4 Provider: `usb` (rekomendowany offline dla VM/VirtualBox)
Konfiguracja:
```json5
externalAnchor: {
  type: "usb",
  usb: { vid: "05ac", pid: "12a8", serial: "C0FFEE1234" }
}
```

MUST (Linux sysfs):
- enumeruj katalogi `/sys/bus/usb/devices/*`
- dla każdego device:
  - czytaj `idVendor`, `idProduct` (trim `\n`, lower‑case)
  - jeśli wymagany `serial` → czytaj `serial` (jeśli brak, device nie pasuje)
- match = (vid == cfg.vid && pid == cfg.pid && serial == cfg.serial)

Kanoniczne `anchor_bytes` (UTF‑8, kończy się `\n`):
```
usb
vid=<vid>
pid=<pid>
serial=<serial>
```

Uwagi:
- L4 nie opiera się o CPUID → `--cpuidremoveall "1"` nie pomaga przy klonowaniu.
- To wymaga USB passthrough do VM.

### 9.5 Provider: `file` (offline, ale tylko poza klonowanym dyskiem)
Konfiguracja:
```json5
externalAnchor: { type: "file", file: { path: "/mnt/anchor/.k" } }
```

MUST:
- plik musi leżeć na nośniku/mouncie, który nie jest kopiowany razem z VM (np. USB mount).

`anchor_bytes` = zawartość pliku (limit np. 4KB; większe → hashuj i użyj hash jako bytes).

### 9.6 Provider: `lease` (online policy)
Konfiguracja:
```json5
externalAnchor: { type: "lease", lease: { url: "https://<endpoint>/seal-lease", timeoutMs: 1500 } }
```

MUST:
- TLS + walidacja tożsamości serwera,
- odpowiedź musi być zweryfikowana (np. podpis, format),
- określić politykę offline (MUST): `fail` albo cache z TTL (np. 5 min).

`anchor_bytes` = zweryfikowany token lease (raw bytes).

### 9.7 Provider: `tpm2` (opcjonalny)
MAY:
- użyć TPM2 do sealed secret lub EK (zależnie od platformy).

---

## 10. Bootstrap / install / uninstall / verify (deployer)

### 10.1 Komendy (MUST)
- `seal sentinel probe <target>`
- `seal sentinel install <target> [--force] [--insecure]`
- `seal sentinel verify <target> [--json]`
- `seal sentinel uninstall <target>`

### 10.2 Probe (MUST)
`probe` ma:
- sprawdzić dostęp do `mid`, stabilność `rid`, dostęp do `puid` (informacyjnie),
- sprawdzić `baseDir` (symlink, owner, writable, searchable),
- sprawdzić wsparcie xattr (jeśli mode=file+xattr),
- sprawdzić dostępność external anchor (jeśli L4),
- wypisać diagnozę **tylko deployerowi**.

### 10.3 Install (MUST)
Install jest idempotentny:
- jeśli blob brak → utwórz
- jeśli blob istnieje i pasuje → no‑op
- jeśli nie pasuje → fail, chyba że `--force`

Atomowość:
- tmp → fsync → rename
- `umask 077`

Lock (MUST):
- `flock` na pliku w `<opaque_dir>` podczas install/uninstall (żeby uniknąć race).

### 10.4 `--force` (rebind) (MUST)
`--force` regeneruje `install_id` i fingerprint dla aktualnego hosta.

MUST:
- tylko deployer (bootstrap pipeline) może to zrobić,
- logowanie operacji po stronie deployera (audyt),
- runtime nigdy nie robi auto‑rebind.

### 10.5 Uninstall (MUST)
`seal uninstall` usuwa:
- blob
- xattr (jeśli użyty)
- lock file
- katalog `<opaque_dir>` jeśli pusty

---

## 11. Runtime weryfikacja w thin launcherze

### 11.1 Moment (MUST)
Weryfikacja sentinela MUSI wykonać się **przed** uruchomieniem runtime/payload.

### 11.2 Odczyt i hardening (MUST)
- użyj `open(baseDir, O_DIRECTORY)` + `openat` dla katalogu i pliku (SHOULD, ale w MVP mocno zalecane)
- `open(..., O_RDONLY|O_CLOEXEC|O_NOFOLLOW)`
- `fstat`: regular file, size==76
- verify CRC32
- (MUST) fail jeśli katalog lub plik są group‑writable/world‑writable (insecure bypass)

### 11.3 Porównanie (MUST)
- odczytaj blob, CRC ok
- unmaskuj i parsuj
- wylicz `fp_hash_now` wg level z blobu:
  - L1/L2/L3: mid/rid/puid
  - L4: + eah (external anchor)
- porównaj `fp_hash_now` z `fp_hash` z blobu
- jeśli `FLAG_REQUIRE_XATTR`: sprawdź xattr 2/2

### 11.4 Stealth / “opaque failure” (MUST)
Sentinel failure (missing/corrupt/mismatch/xattr missing/external anchor missing) ma być **nierozróżnialny** od innych fatalnych pre‑launch błędów thin:

- ten sam komunikat (lub brak komunikatu)  
- ten sam exit code: `exitCodeBlock`  
- brak ścieżek, brak słów-kluczy “sentinel/license/seal”  
- diagnostyka szczegółowa tylko w `seal sentinel verify`

Timing side‑channel (SHOULD):
- unikać bardzo szybkiej ścieżki „blob missing”: np. policzyć fingerprint i wykonać stałą liczbę hashy zanim się zakończy.

### 11.5 Exit code (MUST)
`exitCodeBlock` jest zarezerwowany dla fatal pre‑launch (np. runtime invalid, payload invalid, sentinel fail).  
Default: **200**.

Zalecenie:
- thin powinien używać **tego samego** `exitCodeBlock` dla wszystkich fatalnych pre‑Node błędów, żeby sentinel nie miał własnego „odcisku”.

---

## 12. systemd: brak restart‑storm (MUST)

Unit musi zawierać co najmniej:

```
RestartPreventExitStatus=<exitCodeBlock>
StartLimitIntervalSec=60
StartLimitBurst=3
```

Gdzie `<exitCodeBlock>` to wartość z configu (default 200) embedded w thin/generatorze unita.

---

## 13. Tabela awarii i zabezpieczenia (MUST)

| Scenariusz | Objaw | Restart‑storm | Ochrona | Naprawa (deployer) |
|---|---|---:|---|---|
| Brak blobu | fatal pre‑launch, exitCodeBlock | nie | sentinel poza installDir | `sentinel install` |
| Blob uszkodzony | jw. | nie | CRC32 + size | reinstall |
| Fingerprint mismatch | jw. | nie | L1/L2/L3/L4 | `--force` (rebind) |
| `baseDir` writable/symlink | potencjalny bypass | — | MUST check baseDir | popraw baseDir, reinstall |
| Brak perms do odczytu | jw. | nie | 0710/0640 + serviceGroup | popraw unit/group |
| `file+xattr`: brak xattr | jw. | nie | quorum 2/2 | reinstall + setxattr |
| L4: external anchor missing | jw. | nie | externalAnchor | dołącz USB / mount / lease |
| Równoległy bootstrap/uninstall | “losowe” awarie | — | lock (flock) | retry |

---

## 14. Test plan (MVP) i kryteria akceptacji

### 14.1 MUST (MVP)
1) Host A: `seal deploy --bootstrap` → start OK  
2) Host B: skopiuj **tylko `<installDir>`** → start FAIL (opaque, exitCodeBlock)  
3) Host A: usuń blob → start FAIL (opaque, exitCodeBlock)  
4) Host A: zmień `machine-id` → start FAIL  
5) systemd: brak restart‑storm (unit ma RestartPreventExitStatus + StartLimit)  
6) `seal uninstall` usuwa blob (i xattr jeśli włączony)

### 14.2 SHOULD
- `apt upgrade` → nadal OK (jeśli mid/rid nie zmieniły się)
- redeploy payloadu/runtime bez bootstrap → nadal OK
- rollback release → nadal OK
- `file+xattr`: kopia bloba bez xattr częściej FAIL

### 14.3 L4 (anti‑clone) — jeśli używasz Level 4
- uruchom bez external anchor → FAIL  
- uruchom z external anchor → OK  
- VirtualBox (`--cpuidremoveall "1"`):
  - przenieś/klonuj VM na inną maszynę **bez** przeniesienia external anchor → FAIL  
  - uruchom z poprawnym anchor → OK

---

## 15. Appendix A — Test vectors (GENEROWANE, MUST zgodność)

**Zasada:** test vectors są „źródłem prawdy” dla implementacji.  
Nie edytujemy ręcznie. W repo powinien istnieć generator (`tools/sentinel-testvec.*`) i test CI.

### A.1 Parametry wejściowe
- `namespaceId` (hex32): `00112233445566778899aabbccddeeff`
- `appId`: `acme-api`
- `mid`: `0123456789abcdef0123456789abcdef`
- `rid`: `uuid:deadbeef-dead-beef-dead-beefdeadbeef`
- `install_id` (32B): `00 01 02 ... 1f`
- `flags`: `0x0001` (require_xattr) w tym wektorze: **NIE** (czyli 0)

### A.2 Opaque naming
- `opaque_dir`  = `.2ef701f162`
- `opaque_file` = `188256513a35`

### A.3 Fingerprint L2
Fingerprint string (UTF‑8, kończy się `\n`):
```
v2
mid=0123456789abcdef0123456789abcdef
rid=uuid:deadbeef-dead-beef-dead-beefdeadbeef
```

`fp_hash` (hex):
`7154c50b7e998673356f23c141719171f48b236c55f3bee588211620d6d51e03`

### A.4 xattr (dla mode=file+xattr)
- `xattr_name`  = `user.c446df9bf8`
- `xattr_value` (hex16) = `115fbb05c92623dc32a822263ce3edb8`

### A.5 Blob (76B, zamaskowany, CRC32 LE na końcu)
`blob_hex`:
```
14ec44d7cb8242c936e1cd442a71475c30b19ca31008d28a4eee0f11de9bea7c
0df75eccd79f5cd647b40a4c50edc7280dd7b5695d744df4aa743e6e9f7d428e
9dcf52f71d575cca3b865821
```

---

## 16. Appendix B — Plan implementacji inkrementalnej (MVP → rozszerzenia)

### B.1 Etapy
**Krok 0 (fundament):** `sentinel-core` + generator test vectors + testy CI  
**Krok 1 (MVP):** mode=file + L1/L2 + thin verify + CLI (probe/install/verify/uninstall) + systemd policy  
**Krok 2:** hardening I/O (openat/dirfd, perms checks) + lock + timing mitigation  
**Krok 3 (EXT1):** file+xattr (xattr na blobie, flag w blobie)  
**Krok 4 (EXT2):** Level 4 external anchor (zacząć od `usb`)

### B.2 Prompt dla Codexa (pierwszy PR: core + test vectors)
```text
Zaimplementuj SEAL-SENTINEL MVP zgodnie z docs/SEAL_SENTINEL_SPEC_FINAL_v1.0.md.

Zakres TEGO PR (tylko Krok 0):
1) Dodaj moduł "sentinel-core" (TS/JS) z czystymi funkcjami:
   - normalizeAppId()
   - deriveOpaqueDir(namespaceId)
   - deriveOpaqueFile(namespaceId, appId)
   - buildFingerprintString(level, mid, rid, puid?, eah?, flags?)
   - sha256(), crc32()
   - packBlobV1({version=1, level, flags, install_id, fp_hash}, anchor) z masking+CRC32
   - unpackBlobV1(blob, anchor) z CRC32 verify + unmask

2) Dodaj testy jednostkowe:
   - CRC32("123456789") == 0xCBF43926
   - deriveOpaqueDir/deriveOpaqueFile, fp_hash L2 i blob_hex dokładnie wg Appendix A
   - blob ma 76B, CRC OK, roundtrip pack->unpack działa

3) Dodaj tools/sentinel_testvec.* generujący Appendix A (opaque_dir/file, fingerprint, fp_hash, xattr, blob_hex).
   Appendix ma być generowany, nie edytowany ręcznie.

Wymagania:
- Minimalny PR (tylko nowy moduł + testy + tool).
- Testy i lint muszą przechodzić.
- Nie implementuj jeszcze integracji z thin launcherem ani komend CLI.
Na końcu podaj listę plików i komendy uruchomienia testów.
```

---

## 17. Z czego zrezygnowaliśmy (dla spójności, ale nic nie “ginie”)

Poniżej są elementy, które pojawiały się w poprzednich wersjach lub recenzjach, ale zostały świadomie zmienione/wycofane w finalu:

1) **Sentinel w `<installDir>` (`<installDir>/.seal/...`)**  
   Wycofane: łamie główny cel “kopiuję katalog i działa”. Dodatkowo `.seal` jest zdradzające.

2) **Nazwy zdradzające (`.seal`, `sentinel.bin`, `license`)**  
   Wycofane: stealth wymaga nazw opaque.

3) **Losowana ścieżka sentinela zapisywana jako meta na serwerze**  
   Wycofane: konflikt z “no meta on server”. Zastąpione przez deterministyczny `namespaceId` (sekret deployera).

4) **xattr na `<installDir>` albo na `/proc/self/exe`**  
   Wycofane: zależność od `installRoot` lub ryzyko “xattr znika po redeploy”. Finalnie xattr jest na blobie.

5) **Jawne kody błędów `E_SENTINEL_*` w runtime**  
   Wycofane: stealth. Reason‑codes istnieją tylko w narzędziach deployera (`seal sentinel verify`).

6) **Oparcie fingerprintu wyłącznie o CPUID / cechy CPU**  
   Wycofane: podatne na `--cpuidremoveall "1"` i kruche. CPUID może być **tylko dodatkiem**, nigdy jedyną kotwicą. L4 używa external anchor.

7) **Fingerprint oparty o hash systemu / listę pakietów**  
   Wycofane: nie update‑safe.

8) **Automatyczna migracja sentinela**  
   Wycofane na MVP: zamiast tego jest `--force` (rebind) kontrolowany przez deployera.

9) **Stałe `exit=12` jako blokada restartów**  
   Zmienione: zamiast tego używamy `exitCodeBlock` (default 200) i rekomendacji, aby wszystkie pre‑launch fatale thin kończyły tym samym kodem (mniejsze ryzyko kolizji z exit code payloadu).

---

Koniec specyfikacji.
