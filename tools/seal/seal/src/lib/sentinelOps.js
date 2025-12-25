"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const { spawnSyncSafe } = require("./spawn");
const { sshExec, scpTo, scpFrom, normalizeStrictHostKeyChecking, normalizeSshPort } = require("./ssh");
const { ensureDir, fileExists } = require("./fsextra");
const { packBlobV1, unpackBlobV1 } = require("./sentinelCore");
const { buildFingerprintHash, resolveAutoLevel, normalizeCpuIdSource } = require("./sentinelConfig");

const FLAG_REQUIRE_XATTR = 0x0001;
const FLAG_L4_INCLUDE_PUID = 0x0002;
const FLAG_INCLUDE_CPUID = 0x0004;

function shQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function sshUserHost(targetCfg) {
  const user = targetCfg.user || "root";
  const host = targetCfg.host;
  if (!host) throw new Error("target.host missing");
  if (/\s/.test(user)) {
    throw new Error(`Invalid user: ${user} (whitespace not allowed)`);
  }
  return { user, host };
}

function sshExecTarget(targetCfg, params) {
  return sshExec({
    ...params,
    strictHostKeyChecking: normalizeStrictHostKeyChecking(targetCfg.sshStrictHostKeyChecking),
    sshPort: normalizeSshPort(targetCfg.sshPort),
  });
}

function scpToTarget(targetCfg, params) {
  return scpTo({
    ...params,
    strictHostKeyChecking: normalizeStrictHostKeyChecking(targetCfg.sshStrictHostKeyChecking),
    sshPort: normalizeSshPort(targetCfg.sshPort),
  });
}

function scpFromTarget(targetCfg, params) {
  return scpFrom({
    ...params,
    strictHostKeyChecking: normalizeStrictHostKeyChecking(targetCfg.sshStrictHostKeyChecking),
    sshPort: normalizeSshPort(targetCfg.sshPort),
  });
}

function serviceUserGroup(targetCfg, fallbackUser) {
  const user = targetCfg.serviceUser || fallbackUser || "root";
  const group = targetCfg.serviceGroup || user;
  return { user, group };
}

function parseKeyValueOutput(text) {
  const out = {};
  String(text || "").split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf("=");
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) out[key] = val;
  });
  return out;
}

function decodeBase64(value) {
  if (!value) return "";
  try {
    return Buffer.from(String(value), "base64").toString("utf8");
  } catch {
    return "";
  }
}

function decodeMountPath(value) {
  return String(value || "").replace(/\\([0-7]{3})/g, (_, oct) => {
    const code = parseInt(oct, 8);
    if (!Number.isFinite(code)) return _;
    return String.fromCharCode(code);
  });
}

function parseMounts(text) {
  const mounts = [];
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    const device = parts[0];
    const mountpoint = decodeMountPath(parts[1]);
    const fstype = parts[2];
    const opts = parts[3] || "";
    mounts.push({ device, mountpoint, fstype, opts });
  }
  return mounts;
}

function parseUsbDevices(text) {
  const rows = [];
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("|");
    const [vid, pid, serial, product, manufacturer, usbClass, path] = parts;
    if (!vid || !pid) continue;
    rows.push({
      vid: String(vid || "").toLowerCase(),
      pid: String(pid || "").toLowerCase(),
      serial: serial || "",
      product: product || "",
      manufacturer: manufacturer || "",
      usbClass: usbClass || "",
      path: path || "",
    });
  }
  return rows;
}

function flattenLsblk(node, parent) {
  const out = [];
  if (!node) return out;
  const item = { ...node };
  if (parent) {
    item.parent = {
      name: parent.name,
      tran: parent.tran,
      rm: parent.rm,
      type: parent.type,
    };
  }
  out.push(item);
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) out.push(...flattenLsblk(child, node));
  return out;
}

function extractUsbMounts(lsblk) {
  if (!lsblk || !Array.isArray(lsblk.blockdevices)) return [];
  const rows = [];
  for (const dev of lsblk.blockdevices) {
    rows.push(...flattenLsblk(dev, null));
  }
  const out = [];
  for (const row of rows) {
    const mountpointsRaw = row.mountpoint !== undefined ? row.mountpoint : row.mountpoints;
    const mountpoints = Array.isArray(mountpointsRaw)
      ? mountpointsRaw
      : (mountpointsRaw ? [mountpointsRaw] : []);
    if (!mountpoints.length) continue;
    const tran = (row.tran || row.parent && row.parent.tran || "").toLowerCase();
    const rm = row.rm !== undefined ? String(row.rm) : (row.parent && row.parent.rm !== undefined ? String(row.parent.rm) : "");
    const isUsb = tran === "usb";
    const isRemovable = rm === "1" || rm.toLowerCase() === "true";
    if (!isUsb && !isRemovable) continue;
    out.push({
      name: row.name || "",
      mountpoint: mountpoints.join(","),
      mountpoints,
      tran,
      rm,
      type: row.type || "",
    });
  }
  return out;
}

function extractHostShares(mounts) {
  const hostFs = new Set([
    "vboxsf",
    "vmhgfs",
    "vmhgfs-fuse",
    "fuse.vmhgfs-fuse",
    "9p",
    "virtiofs",
    "cifs",
    "smbfs",
    "nfs",
    "nfs4",
  ]);
  return mounts.filter((m) => hostFs.has((m.fstype || "").toLowerCase()));
}

function findMountForPath(mounts, targetPath) {
  if (!targetPath || !mounts || !mounts.length) return null;
  const pathNorm = targetPath.endsWith("/") ? targetPath.slice(0, -1) : targetPath;
  let best = null;
  let bestLen = -1;
  for (const m of mounts) {
    const mp = m.mountpoint || "";
    if (!mp) continue;
    if (pathNorm === mp || pathNorm.startsWith(mp.endsWith("/") ? mp : mp + "/")) {
      if (mp.length > bestLen) {
        best = m;
        bestLen = mp.length;
      }
    }
  }
  return best;
}

function getCpuIdAsmSsh(targetCfg, opts = {}) {
  const allowUnsupported = !!opts.allowUnsupported;
  const { user, host } = sshUserHost(targetCfg);
  const script = `
set -euo pipefail
umask 077
arch="$(uname -m 2>/dev/null || true)"
case "$arch" in
  x86_64|amd64|i386|i486|i586|i686) ;;
  *) echo "__SEAL_NO_CPUID__"; exit 4 ;;
esac
if ! command -v cc >/dev/null 2>&1; then
  echo "__SEAL_NO_CC__"
  exit 3
fi

TMP="$(mktemp -d /tmp/.seal-cpuid-XXXXXX)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

cat > "$TMP/cpuid.c" <<'C'
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <ctype.h>
#if !defined(__x86_64__) && !defined(__i386__)
int main(void) { return 2; }
#else
#include <cpuid.h>
static void to_lower(char *s) { for (; *s; s++) *s = (char)tolower((unsigned char)*s); }
int main(void) {
  unsigned int eax = 0, ebx = 0, ecx = 0, edx = 0;
  if (!__get_cpuid(0, &eax, &ebx, &ecx, &edx)) return 3;
  char vendor[13];
  memcpy(vendor + 0, &ebx, 4);
  memcpy(vendor + 4, &edx, 4);
  memcpy(vendor + 8, &ecx, 4);
  vendor[12] = 0;
  if (!__get_cpuid(1, &eax, &ebx, &ecx, &edx)) return 4;
  unsigned int family = (eax >> 8) & 0x0f;
  unsigned int model = (eax >> 4) & 0x0f;
  unsigned int stepping = eax & 0x0f;
  unsigned int ext_family = (eax >> 20) & 0xff;
  unsigned int ext_model = (eax >> 16) & 0x0f;
  if (family == 0x0f) family += ext_family;
  if (family == 0x06 || family == 0x0f) model |= (ext_model << 4);
  to_lower(vendor);
  printf("%s:%u:%u:%u\\n", vendor, family, model, stepping);
  return 0;
}
#endif
C

cc -O2 "$TMP/cpuid.c" -o "$TMP/cpuid" >/dev/null 2>&1
"$TMP/cpuid"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  const out = `${res.stdout}\n${res.stderr}`.trim();
  if (out.includes("__SEAL_NO_CC__")) {
    throw new Error("sentinel cpuid asm requires cc on target (install build-essential)");
  }
  if (out.includes("__SEAL_NO_CPUID__")) {
    if (allowUnsupported) return { value: "", unsupported: true };
    throw new Error("sentinel cpuid asm not supported on this architecture");
  }
  if (!res.ok) {
    throw new Error(`sentinel cpuid asm failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  const line = (out.split(/\r?\n/).find((l) => l.trim()) || "").trim();
  if (!line) {
    throw new Error("sentinel cpuid asm failed: empty output");
  }
  return { value: line, unsupported: false };
}

function resolveCpuIdSsh({ targetCfg, cpuIdSource, hostInfo, require }) {
  const mode = normalizeCpuIdSource(cpuIdSource || "proc");
  if (mode === "off") {
    if (require) throw new Error("sentinel cpuid required but cpuIdSource=off");
    return "";
  }
  const needProc = mode === "proc" || mode === "both";
  const needAsm = mode === "asm" || mode === "both";
  const proc = hostInfo.cpuidProc || "";
  const procOk = !!proc;
  if (mode === "proc" && !procOk) {
    if (require) throw new Error("sentinel cpuid(proc) missing");
    return "";
  }
  let asm = "";
  let asmUnsupported = false;
  let asmOk = false;
  if (needAsm) {
    const res = getCpuIdAsmSsh(targetCfg, { allowUnsupported: mode === "both" });
    asm = res.value || "";
    asmUnsupported = !!res.unsupported;
    asmOk = !!asm;
  }
  if (mode === "asm") {
    if (!asmOk) throw new Error("sentinel cpuid(asm) missing");
    return `asm:${asm}`;
  }
  if (mode === "both") {
    if (procOk && asmOk) return `proc:${proc}|asm:${asm}`;
    if (procOk) return `proc:${proc}`;
    if (asmOk) return `asm:${asm}`;
    return "";
  }
  return procOk ? `proc:${proc}` : "";
}

function describeSentinelInstallError(out, baseDir) {
  if (out.includes("__SEAL_BASE_MISSING__")) {
    return `sentinel install failed: baseDir missing (${baseDir})`;
  }
  if (out.includes("__SEAL_BASE_SYMLINK__")) {
    return "sentinel install failed: baseDir is a symlink (use --insecure or fix baseDir)";
  }
  if (out.includes("__SEAL_BASE_INSECURE__")) {
    return "sentinel install failed: baseDir must be root-owned and not group/other-writable (use --insecure to override)";
  }
  if (out.includes("__SEAL_BASE_NOEXEC__")) {
    return "sentinel install failed: service user cannot access baseDir (missing execute permission)";
  }
  if (out.includes("__SEAL_LOCK_MISSING__")) {
    return "sentinel install failed: flock not found (install util-linux)";
  }
  if (out.includes("__SEAL_LOCK_BUSY__")) {
    return "sentinel install failed: lock busy (another install/uninstall in progress)";
  }
  if (out.includes("__SEAL_SENTINEL_MISMATCH__")) {
    return "sentinel install failed: existing sentinel mismatch (use --force to replace)";
  }
  return null;
}

function describeSentinelUninstallError(out) {
  if (out.includes("__SEAL_LOCK_MISSING__")) {
    return "sentinel uninstall failed: flock not found (install util-linux)";
  }
  if (out.includes("__SEAL_LOCK_BUSY__")) {
    return "sentinel uninstall failed: lock busy (another install/uninstall in progress)";
  }
  return null;
}

function getHostInfoSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const script = `
set -euo pipefail
MID="$(cat /etc/machine-id 2>/dev/null || true)"
PUID="$(cat /sys/class/dmi/id/product_uuid 2>/dev/null || true)"
CPU_VENDOR="$(awk -F: '/^vendor_id[[:space:]]*:/ {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
CPU_FAMILY="$(awk -F: '/^cpu family[[:space:]]*:/ {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
CPU_MODEL="$(awk -F: '/^model[[:space:]]*:/ {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
CPU_STEP="$(awk -F: '/^stepping[[:space:]]*:/ {gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
CPUID=""
if [ -n "$CPU_VENDOR$CPU_FAMILY$CPU_MODEL$CPU_STEP" ]; then
  CPUID="$(echo "$CPU_VENDOR:$CPU_FAMILY:$CPU_MODEL:$CPU_STEP" | tr 'A-Z' 'a-z')"
fi
LINE="$(awk '$5=="/" {print; exit}' /proc/self/mountinfo)"
MAJMIN=""
FSTYPE=""
if [ -n "$LINE" ]; then
  MAJMIN="$(echo "$LINE" | awk '{print $3}')"
  FSTYPE="$(echo "$LINE" | awk '{for (i=1;i<=NF;i++) if ($i=="-"){print $(i+1); exit}}')"
fi
RID=""
if [ -n "$MAJMIN" ]; then
  for f in /dev/disk/by-uuid/*; do
    [ -e "$f" ] || break
    mm_hex="$(stat -Lc '%t:%T' "$f" 2>/dev/null || true)"
    if [ -n "$mm_hex" ]; then
      maj=$((0x\${mm_hex%%:*}))
      min=$((0x\${mm_hex##*:}))
      if [ "$maj:$min" = "$MAJMIN" ]; then
        RID="uuid:$(basename "$f")"
        break
      fi
    fi
  done
  if [ -z "$RID" ]; then
    for f in /dev/disk/by-partuuid/*; do
      [ -e "$f" ] || break
      mm_hex="$(stat -Lc '%t:%T' "$f" 2>/dev/null || true)"
      if [ -n "$mm_hex" ]; then
        maj=$((0x\${mm_hex%%:*}))
        min=$((0x\${mm_hex##*:}))
        if [ "$maj:$min" = "$MAJMIN" ]; then
          RID="partuuid:$(basename "$f")"
          break
        fi
      fi
    done
  fi
  if [ -z "$RID" ]; then
    RID="dev:$MAJMIN"
  fi
fi
echo "MID=$MID"
echo "RID=$RID"
echo "FSTYPE=$FSTYPE"
echo "PUID=$PUID"
echo "CPUID=$CPUID"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel host probe failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  const kv = parseKeyValueOutput(res.stdout);
  return {
    mid: kv.MID || "",
    rid: kv.RID || "",
    fstype: kv.FSTYPE || "",
    puid: kv.PUID || "",
    cpuidProc: kv.CPUID || "",
  };
}

function probeBaseDirSsh(targetCfg, sentinelCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, user);
  const baseDir = sentinelCfg.storage.baseDir;
  const script = `
set -euo pipefail
BASE=${shQuote(baseDir)}
SVC_USER=${shQuote(serviceUser)}
SVC_GROUP=${shQuote(serviceGroup)}
  if [ ! -d "$BASE" ]; then
    echo "BASE_EXISTS=0"
    exit 0
  fi
if [ -L "$BASE" ]; then
  echo "BASE_SYMLINK=1"
else
  echo "BASE_SYMLINK=0"
fi
statline="$(stat -Lc '%u %g %a' "$BASE" 2>/dev/null || true)"
echo "BASE_STAT=$statline"
BASE_EXEC=1
if [ "$SVC_USER" != "root" ]; then
  if sudo -n -u "$SVC_USER" test -x "$BASE"; then
    BASE_EXEC=1
  else
    BASE_EXEC=0
  fi
fi
echo "BASE_EXEC=$BASE_EXEC"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel baseDir probe failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  const kv = parseKeyValueOutput(res.stdout);
  const statParts = (kv.BASE_STAT || "").split(/\s+/);
  const uid = statParts[0] ? Number(statParts[0]) : null;
  const gid = statParts[1] ? Number(statParts[1]) : null;
  const mode = statParts[2] ? String(statParts[2]) : null;
  return {
    exists: kv.BASE_EXISTS !== "0",
    isSymlink: kv.BASE_SYMLINK === "1",
    uid,
    gid,
    mode,
    execOk: kv.BASE_EXEC !== "0",
    serviceUser,
    serviceGroup,
  };
}

function installSentinelSsh({ targetCfg, sentinelCfg, force, insecure }) {
  const { user, host } = sshUserHost(targetCfg);
  const hostInfo = getHostInfoSsh(targetCfg);
  const level = sentinelCfg.level === "auto" ? resolveAutoLevel(hostInfo) : Number(sentinelCfg.level);
  if (![0, 1, 2].includes(level)) {
    throw new Error(`sentinel level not supported in MVP: ${level}`);
  }
  if (level >= 1 && !hostInfo.mid) throw new Error("sentinel install failed: missing machine-id");
  if (level >= 2 && !hostInfo.rid) throw new Error("sentinel install failed: missing rid");

  let flags = 0;
  let cpuid = "";
  const wantCpuId = level >= 1 && sentinelCfg.cpuIdSource !== "off";
  if (wantCpuId) {
    cpuid = resolveCpuIdSsh({
      targetCfg,
      cpuIdSource: sentinelCfg.cpuIdSource,
      hostInfo,
      require: true,
    });
  }
  hostInfo.cpuid = cpuid;
  const includeCpuId = level >= 1 && !!hostInfo.cpuid;
  if (includeCpuId) flags |= FLAG_INCLUDE_CPUID;
  const installId = crypto.randomBytes(32);
  const fpHash = buildFingerprintHash(level, hostInfo, { includePuid: false, includeCpuId });
  const blob = packBlobV1({ level, flags, installId, fpHash }, sentinelCfg.anchor);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  const tmpLocal = path.join(tmpDir, "blob");
  fs.writeFileSync(tmpLocal, blob, { mode: 0o600 });

  const remoteTag = String(targetCfg.serviceName || targetCfg.appName || "app").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const tmpSuffix = crypto.randomBytes(4).toString("hex");
  const tmpRemote = `/tmp/.${remoteTag}-s-${Date.now()}-${tmpSuffix}`;
  const up = scpToTarget(targetCfg, { user, host, localPath: tmpLocal, remotePath: tmpRemote });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (!up.ok) throw new Error(`sentinel scp failed (status=${up.status})`);

  const baseDir = sentinelCfg.storage.baseDir;
  const dir = path.posix.join(baseDir, sentinelCfg.opaqueDir);
  const file = path.posix.join(dir, sentinelCfg.opaqueFile);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, user);
  const sudo = user === "root" ? "" : "sudo -n";

  const rootScript = `
set -euo pipefail
umask 077
BASE=${shQuote(baseDir)}
DIR=${shQuote(dir)}
FILE=${shQuote(file)}
TMP=${shQuote(tmpRemote)}
SVC_USER=${shQuote(serviceUser)}
SVC_GROUP=${shQuote(serviceGroup)}
INSECURE=${shQuote(insecure ? "1" : "0")}
FORCE=${shQuote(force ? "1" : "0")}

cleanup() {
  rm -f "$TMP" "$FILE.tmp"
}
trap cleanup EXIT

if [ -f "$TMP" ]; then
  chmod 0600 "$TMP" || true
fi

fsync_path() {
  path="$1"
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$path" <<'PY'
import os, sys
p = sys.argv[1]
fd = os.open(p, os.O_RDONLY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
PY
  elif command -v python >/dev/null 2>&1; then
    python - "$path" <<'PY'
import os, sys
p = sys.argv[1]
fd = os.open(p, os.O_RDONLY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
PY
  else
    sync
  fi
}

check_exec() {
  user="$1"
  base="$2"
  if command -v runuser >/dev/null 2>&1; then
    runuser -u "$user" -- test -x "$base"
  elif command -v su >/dev/null 2>&1; then
    su -s /bin/sh -c "test -x \\"$base\\"" "$user"
  else
    return 1
  fi
}

if [ ! -d "$BASE" ]; then
  echo "__SEAL_BASE_MISSING__"
  exit 2
fi
if [ "$INSECURE" != "1" ]; then
  if [ -L "$BASE" ]; then
    echo "__SEAL_BASE_SYMLINK__"
    exit 2
  fi
  statline="$(stat -Lc '%u %g %a' "$BASE" 2>/dev/null || true)"
  uid="$(echo "$statline" | awk '{print $1}')"
  mode="$(echo "$statline" | awk '{print $3}')"
  if [ "$uid" != "0" ]; then
    echo "__SEAL_BASE_INSECURE__"
    exit 2
  fi
  if [ -n "$mode" ]; then
    mode_dec=$((8#$mode))
    if (( (mode_dec & 022) != 0 )); then
      echo "__SEAL_BASE_INSECURE__"
      exit 2
    fi
  fi
  if [ "$SVC_USER" != "root" ]; then
    if ! check_exec "$SVC_USER" "$BASE"; then
      echo "__SEAL_BASE_NOEXEC__"
      exit 2
    fi
  fi
fi

mkdir -p "$DIR"
chown root:"$SVC_GROUP" "$DIR"
chmod 0710 "$DIR"

if ! command -v flock >/dev/null 2>&1; then
  echo "__SEAL_LOCK_MISSING__"
  exit 4
fi
LOCK="$DIR/.l"
exec 9>"$LOCK"
chmod 0600 "$LOCK" || true
if ! flock -w 10 9; then
  echo "__SEAL_LOCK_BUSY__"
  exit 4
fi

if [ -f "$FILE" ] && [ "$FORCE" != "1" ]; then
  if cmp -s "$FILE" "$TMP"; then
    echo "__SEAL_SENTINEL_OK__"
    exit 0
  fi
  echo "__SEAL_SENTINEL_MISMATCH__"
  exit 3
fi

cp "$TMP" "$FILE.tmp"
chown root:"$SVC_GROUP" "$FILE.tmp"
chmod 0640 "$FILE.tmp"
fsync_path "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
fsync_path "$DIR"
echo "__SEAL_SENTINEL_INSTALLED__"
`;
  const script = sudo ? `${sudo} bash -lc ${shQuote(rootScript)}` : rootScript;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    const hint = describeSentinelInstallError(out, baseDir);
    if (hint) throw new Error(hint);
    throw new Error(`sentinel install failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  return { hostInfo, level, output: res.stdout };
}

function verifySentinelSsh({ targetCfg, sentinelCfg }) {
  const { user, host } = sshUserHost(targetCfg);
  const baseDir = sentinelCfg.storage.baseDir;
  const dir = path.posix.join(baseDir, sentinelCfg.opaqueDir);
  const file = path.posix.join(dir, sentinelCfg.opaqueFile);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, user);
  const script = `
set -euo pipefail
FILE=${shQuote(file)}
if [ ! -f "$FILE" ]; then
  echo "__SEAL_SENTINEL_MISSING__"
  exit 2
fi
statline="$(stat -Lc '%u %g %a' "$FILE" 2>/dev/null || true)"
echo "FILE_STAT=$statline"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel verify failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  if ((res.stdout || "").includes("__SEAL_SENTINEL_MISSING__")) {
    return { ok: false, reason: "missing" };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  const tmpLocal = path.join(tmpDir, "blob");
  const get = scpFromTarget(targetCfg, { user, host, remotePath: file, localPath: tmpLocal });
  if (!get.ok) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(`sentinel scp failed (status=${get.status})`);
  }
  try {
    fs.chmodSync(tmpLocal, 0o600);
  } catch {
    // best-effort
  }
  const blob = fs.readFileSync(tmpLocal);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const parsed = unpackBlobV1(blob, sentinelCfg.anchor);
  if (parsed.version !== 1) {
    return { ok: false, reason: "version", parsed };
  }
  if (![0, 1, 2].includes(parsed.level)) {
    return { ok: false, reason: "level", parsed };
  }

  const hostInfo = getHostInfoSsh(targetCfg);
  const includePuid = !!(parsed.flags & FLAG_L4_INCLUDE_PUID);
  const includeCpuId = !!(parsed.flags & FLAG_INCLUDE_CPUID);
  if (includeCpuId) {
    hostInfo.cpuid = resolveCpuIdSsh({
      targetCfg,
      cpuIdSource: sentinelCfg.cpuIdSource,
      hostInfo,
      require: true,
    });
  }
  const fpHash = buildFingerprintHash(parsed.level, hostInfo, { includePuid, includeCpuId });
  const match = crypto.timingSafeEqual(parsed.fpHash, fpHash);

  const kv = parseKeyValueOutput(res.stdout);
  const statParts = (kv.FILE_STAT || "").split(/\s+/);
  const fileUid = statParts[0] ? Number(statParts[0]) : null;
  const fileGid = statParts[1] ? Number(statParts[1]) : null;
  const fileMode = statParts[2] ? String(statParts[2]) : null;

  return {
    ok: match,
    reason: match ? null : "mismatch",
    parsed,
    hostInfo,
    file: { path: file, uid: fileUid, gid: fileGid, mode: fileMode, serviceUser, serviceGroup },
  };
}

function uninstallSentinelSsh({ targetCfg, sentinelCfg }) {
  const { user, host } = sshUserHost(targetCfg);
  const baseDir = sentinelCfg.storage.baseDir;
  const dir = path.posix.join(baseDir, sentinelCfg.opaqueDir);
  const file = path.posix.join(dir, sentinelCfg.opaqueFile);
  const sudo = user === "root" ? "" : "sudo -n";
  const rootScript = `
set -euo pipefail
umask 077
BASE=${shQuote(baseDir)}
DIR=${shQuote(dir)}
FILE=${shQuote(file)}

fsync_path() {
  path="$1"
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$path" <<'PY'
import os, sys
p = sys.argv[1]
fd = os.open(p, os.O_RDONLY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
PY
  elif command -v python >/dev/null 2>&1; then
    python - "$path" <<'PY'
import os, sys
p = sys.argv[1]
fd = os.open(p, os.O_RDONLY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
PY
  else
    sync
  fi
}

if [ ! -d "$DIR" ]; then
  echo "__SEAL_SENTINEL_REMOVED__"
  exit 0
fi

if ! command -v flock >/dev/null 2>&1; then
  echo "__SEAL_LOCK_MISSING__"
  exit 4
fi

LOCK="$DIR/.l"
exec 9>"$LOCK"
chmod 0600 "$LOCK" || true
if ! flock -w 10 9; then
  echo "__SEAL_LOCK_BUSY__"
  exit 4
fi

rm -f "$FILE" || true
fsync_path "$DIR"
rm -f "$LOCK" || true
if [ -d "$DIR" ]; then
  if [ -z "$(ls -A "$DIR" 2>/dev/null)" ]; then
    rmdir "$DIR" || true
  fi
fi
if [ -d "$BASE" ]; then
  fsync_path "$BASE"
fi
echo "__SEAL_SENTINEL_REMOVED__"
`;
  const script = sudo ? `${sudo} bash -lc ${shQuote(rootScript)}` : rootScript;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    const hint = describeSentinelUninstallError(out);
    if (hint) throw new Error(hint);
    throw new Error(`sentinel uninstall failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  return { ok: true };
}

function probeSentinelSsh({ targetCfg, sentinelCfg }) {
  const hostInfo = getHostInfoSsh(targetCfg);
  const base = probeBaseDirSsh(targetCfg, sentinelCfg);
  return { hostInfo, base };
}

function inspectSentinelSsh({ targetCfg, sentinelCfg }) {
  const { user, host } = sshUserHost(targetCfg);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, user);
  const extCfg = (sentinelCfg && sentinelCfg.externalAnchor) ? sentinelCfg.externalAnchor : {};
  const extType = String(extCfg.type || "none").toLowerCase();
  const extFilePath = extType === "file" && extCfg.file && extCfg.file.path ? String(extCfg.file.path) : "";
  const extLeaseUrl = extType === "lease" && extCfg.lease && extCfg.lease.url ? String(extCfg.lease.url) : "";
  const extLeaseTimeoutMs = extType === "lease" && extCfg.lease && extCfg.lease.timeoutMs ? Number(extCfg.lease.timeoutMs) : 1500;
  const baseDir = sentinelCfg && sentinelCfg.storage && sentinelCfg.storage.baseDir ? String(sentinelCfg.storage.baseDir) : "";
  const script = `
set -euo pipefail
MID="$(cat /etc/machine-id 2>/dev/null || true)"
PUID="$(cat /sys/class/dmi/id/product_uuid 2>/dev/null || true)"
CPU_VENDOR="$(awk -F: '/^vendor_id[[:space:]]*:/ {gsub(/^[ \\t]+|[ \\t]+$/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
CPU_FAMILY="$(awk -F: '/^cpu family[[:space:]]*:/ {gsub(/^[ \\t]+|[ \\t]+$/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
CPU_MODEL="$(awk -F: '/^model[[:space:]]*:/ {gsub(/^[ \\t]+|[ \\t]+$/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
CPU_STEP="$(awk -F: '/^stepping[[:space:]]*:/ {gsub(/^[ \\t]+|[ \\t]+$/, "", $2); print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
CPUID=""
if [ -n "$CPU_VENDOR$CPU_FAMILY$CPU_MODEL$CPU_STEP" ]; then
  CPUID="$(echo "$CPU_VENDOR:$CPU_FAMILY:$CPU_MODEL:$CPU_STEP" | tr 'A-Z' 'a-z')"
fi
LINE="$(awk '$5=="/" {print; exit}' /proc/self/mountinfo)"
MAJMIN=""
FSTYPE=""
if [ -n "$LINE" ]; then
  MAJMIN="$(echo "$LINE" | awk '{print $3}')"
  FSTYPE="$(echo "$LINE" | awk '{for (i=1;i<=NF;i++) if ($i=="-"){print $(i+1); exit}}')"
fi
RID=""
if [ -n "$MAJMIN" ]; then
  for f in /dev/disk/by-uuid/*; do
    [ -e "$f" ] || break
    mm_hex="$(stat -Lc '%t:%T' "$f" 2>/dev/null || true)"
    if [ -n "$mm_hex" ]; then
      maj=$((0x\${mm_hex%%:*}))
      min=$((0x\${mm_hex##*:}))
      if [ "$maj:$min" = "$MAJMIN" ]; then
        RID="uuid:$(basename "$f")"
        break
      fi
    fi
  done
  if [ -z "$RID" ]; then
    for f in /dev/disk/by-partuuid/*; do
      [ -e "$f" ] || break
      mm_hex="$(stat -Lc '%t:%T' "$f" 2>/dev/null || true)"
      if [ -n "$mm_hex" ]; then
        maj=$((0x\${mm_hex%%:*}))
        min=$((0x\${mm_hex##*:}))
        if [ "$maj:$min" = "$MAJMIN" ]; then
          RID="partuuid:$(basename "$f")"
          break
        fi
      fi
    done
  fi
  if [ -z "$RID" ]; then
    RID="dev:$MAJMIN"
  fi
fi
echo "MID=$MID"
echo "RID=$RID"
echo "FSTYPE=$FSTYPE"
echo "PUID=$PUID"
echo "CPUID=$CPUID"

BASE64_OK=0
if command -v base64 >/dev/null 2>&1; then
  BASE64_OK=1
fi
echo "BASE64=$BASE64_OK"

EXT_TYPE=${shQuote(extType)}
EXT_FILE_PATH=${shQuote(extFilePath)}
EXT_LEASE_URL=${shQuote(extLeaseUrl)}
EXT_LEASE_TIMEOUT_MS=${shQuote(Number.isFinite(extLeaseTimeoutMs) ? String(extLeaseTimeoutMs) : "1500")}
BASE_DIR=${shQuote(baseDir)}
SVC_USER=${shQuote(serviceUser)}
SVC_GROUP=${shQuote(serviceGroup)}

BASE_EXISTS=0
BASE_SYMLINK=0
BASE_STAT=""
BASE_EXEC=0
if [ -n "$BASE_DIR" ] && [ -d "$BASE_DIR" ]; then
  BASE_EXISTS=1
  if [ -L "$BASE_DIR" ]; then
    BASE_SYMLINK=1
  fi
  BASE_STAT="$(stat -Lc '%u %g %a' "$BASE_DIR" 2>/dev/null || true)"
  BASE_EXEC=1
  if [ "$SVC_USER" != "root" ]; then
    if command -v sudo >/dev/null 2>&1; then
      if sudo -n -u "$SVC_USER" test -x "$BASE_DIR"; then
        BASE_EXEC=1
      else
        BASE_EXEC=0
      fi
    else
      BASE_EXEC=0
    fi
  fi
fi
echo "BASE_EXISTS=$BASE_EXISTS"
echo "BASE_SYMLINK=$BASE_SYMLINK"
echo "BASE_STAT=$BASE_STAT"
echo "BASE_EXEC=$BASE_EXEC"

if [ "$BASE64_OK" = "1" ]; then
  b64() { base64 | tr -d '\\r\\n'; }

  mounts="$(cat /proc/mounts 2>/dev/null || true)"
  echo "MOUNTS_B64=$(printf '%s' "$mounts" | b64)"

  if command -v lsblk >/dev/null 2>&1; then
    lsblk_json="$(lsblk -J -o NAME,TYPE,TRAN,RM,MOUNTPOINT 2>/dev/null || true)"
    echo "LSBLK_B64=$(printf '%s' "$lsblk_json" | b64)"
  else
    echo "LSBLK_B64="
  fi

  usb_list=""
  if [ -d /sys/bus/usb/devices ]; then
    for d in /sys/bus/usb/devices/*; do
      [ -d "$d" ] || continue
      vid="$(cat "$d/idVendor" 2>/dev/null || true)"
      pid="$(cat "$d/idProduct" 2>/dev/null || true)"
      [ -n "$vid" ] || continue
      serial="$(cat "$d/serial" 2>/dev/null || true)"
      product="$(cat "$d/product" 2>/dev/null || true)"
      manufacturer="$(cat "$d/manufacturer" 2>/dev/null || true)"
      cls="$(cat "$d/bDeviceClass" 2>/dev/null || true)"
      usb_list="$usb_list$vid|$pid|$serial|$product|$manufacturer|$cls|$d"$'\n'
    done
  fi
  echo "USB_B64=$(printf '%s' "$usb_list" | b64)"
else
  echo "MOUNTS_B64="
  echo "LSBLK_B64="
  echo "USB_B64="
fi

XATTR_OK=0
XATTR_ERR=""
XATTR_PATH=""
XATTR_NOTE=""
XATTR_SUDO=0
if [ -n "$BASE_DIR" ] && [ -d "$BASE_DIR" ]; then
  if [ -w "$BASE_DIR" ]; then
    XATTR_PATH="$BASE_DIR"
  else
    if command -v sudo >/dev/null 2>&1 && sudo -n test -w "$BASE_DIR" >/dev/null 2>&1; then
      XATTR_PATH="$BASE_DIR"
      XATTR_SUDO=1
    else
      XATTR_NOTE="baseDir_not_writable"
      XATTR_PATH="/tmp"
    fi
  fi
else
  XATTR_NOTE="baseDir_missing"
  XATTR_PATH="/tmp"
fi
if command -v python3 >/dev/null 2>&1; then
  if [ "$XATTR_SUDO" = "1" ]; then
    sudo -n python3 - "$XATTR_PATH" <<'PY'
import os, tempfile, sys
base = sys.argv[1]
fd, path = tempfile.mkstemp(prefix=".seal-xattr-", dir=base)
os.close(fd)
try:
    os.setxattr(path, b"user.seal_test", b"1")
    val = os.getxattr(path, b"user.seal_test")
    ok = (val == b"1")
    print("XATTR_OK=1" if ok else "XATTR_OK=0")
    print("XATTR_PATH=%s" % base)
    print("XATTR_SUDO=1")
except Exception as e:
    print("XATTR_OK=0")
    print("XATTR_ERR=%s" % (e.__class__.__name__,))
    print("XATTR_PATH=%s" % base)
    print("XATTR_SUDO=1")
finally:
    try:
        os.unlink(path)
    except Exception:
        pass
PY
  else
    python3 - "$XATTR_PATH" <<'PY'
import os, tempfile, sys
base = sys.argv[1]
fd, path = tempfile.mkstemp(prefix=".seal-xattr-", dir=base)
os.close(fd)
try:
    os.setxattr(path, b"user.seal_test", b"1")
    val = os.getxattr(path, b"user.seal_test")
    ok = (val == b"1")
    print("XATTR_OK=1" if ok else "XATTR_OK=0")
    print("XATTR_PATH=%s" % base)
except Exception as e:
    print("XATTR_OK=0")
    print("XATTR_ERR=%s" % (e.__class__.__name__,))
    print("XATTR_PATH=%s" % base)
finally:
    try:
        os.unlink(path)
    except Exception:
        pass
PY
  fi
elif command -v setfattr >/dev/null 2>&1 && command -v getfattr >/dev/null 2>&1; then
  if [ "$XATTR_SUDO" = "1" ]; then
    sudo -n sh -lc '
set -e
XATTR_OK=0
XATTR_ERR=""
tmp="$(mktemp "'"$XATTR_PATH"'/.seal-xattr-XXXXXX")" || tmp="$(mktemp /tmp/.seal-xattr-XXXXXX)"
if setfattr -n user.seal_test -v 1 "$tmp" 2>/dev/null; then
  if getfattr -n user.seal_test --only-values "$tmp" 2>/dev/null | tr -d "\\r\\n" | grep -qx "1"; then
    XATTR_OK=1
  else
    XATTR_OK=0
    XATTR_ERR="getfattr_failed"
  fi
else
  XATTR_OK=0
  XATTR_ERR="setfattr_failed"
fi
rm -f "$tmp"
echo "XATTR_OK=$XATTR_OK"
echo "XATTR_PATH='"$XATTR_PATH"'"
[ -n "$XATTR_ERR" ] && echo "XATTR_ERR=$XATTR_ERR"
'
  else
    tmp="$(mktemp "$XATTR_PATH/.seal-xattr-XXXXXX")" || tmp="$(mktemp /tmp/.seal-xattr-XXXXXX)"
    if setfattr -n user.seal_test -v 1 "$tmp" 2>/dev/null; then
      if getfattr -n user.seal_test --only-values "$tmp" 2>/dev/null | tr -d '\\r\\n' | grep -qx "1"; then
        XATTR_OK=1
      else
        XATTR_OK=0
        XATTR_ERR="getfattr_failed"
      fi
    else
      XATTR_OK=0
      XATTR_ERR="setfattr_failed"
    fi
    rm -f "$tmp"
    echo "XATTR_OK=$XATTR_OK"
    echo "XATTR_PATH=$XATTR_PATH"
    [ -n "$XATTR_ERR" ] && echo "XATTR_ERR=$XATTR_ERR"
  fi
else
  echo "XATTR_OK=0"
  echo "XATTR_PATH=$XATTR_PATH"
  echo "XATTR_ERR=no_xattr_tool"
fi
echo "XATTR_NOTE=$XATTR_NOTE"

EXT_FILE_EXISTS=0
EXT_FILE_READ=0
EXT_FILE_READ_SUDO=0
EXT_FILE_STAT=""
if [ -n "$EXT_FILE_PATH" ]; then
  if [ -e "$EXT_FILE_PATH" ]; then
    EXT_FILE_EXISTS=1
  fi
  if [ -r "$EXT_FILE_PATH" ]; then
    EXT_FILE_READ=1
  else
    if [ "$(id -u)" != "0" ]; then
      if command -v sudo >/dev/null 2>&1; then
        if sudo -n test -r "$EXT_FILE_PATH" >/dev/null 2>&1; then
          EXT_FILE_READ=1
          EXT_FILE_READ_SUDO=1
        fi
      fi
    fi
  fi
  EXT_FILE_STAT="$(stat -Lc '%u %g %a %s' "$EXT_FILE_PATH" 2>/dev/null || true)"
fi
echo "EXT_FILE_EXISTS=$EXT_FILE_EXISTS"
echo "EXT_FILE_READ=$EXT_FILE_READ"
echo "EXT_FILE_READ_SUDO=$EXT_FILE_READ_SUDO"
echo "EXT_FILE_STAT=$EXT_FILE_STAT"

LEASE_OK=0
LEASE_STATUS=""
LEASE_TOOL=""
LEASE_ERR=""
LEASE_BODY_B64=""
LEASE_BODY_LEN=0
LEASE_BODY_TRUNC=0
if [ -n "$EXT_LEASE_URL" ]; then
  tm_ms="$EXT_LEASE_TIMEOUT_MS"
  if [ -z "$tm_ms" ] || [ "$tm_ms" -le 0 ] 2>/dev/null; then
    tm_ms=1500
  fi
  tm_s=$(( (tm_ms + 999) / 1000 ))
  if command -v curl >/dev/null 2>&1; then
    LEASE_TOOL="curl"
    tmp="$(mktemp /tmp/.seal-lease-XXXXXX)"
    code="$(curl -sS -o "$tmp" -w "%{http_code}" --max-time "$tm_s" "$EXT_LEASE_URL" 2>/dev/null || true)"
    if [ -n "$code" ]; then
      LEASE_STATUS="$code"
      if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
        LEASE_OK=1
      fi
      if [ -f "$tmp" ]; then
        size="$(stat -Lc '%s' "$tmp" 2>/dev/null || echo 0)"
        LEASE_BODY_LEN="$size"
        if [ "$size" -gt 4096 ]; then
          LEASE_BODY_TRUNC=1
          if [ "$BASE64_OK" = "1" ]; then
            LEASE_BODY_B64="$(head -c 4096 "$tmp" | b64)"
          fi
        else
          if [ "$BASE64_OK" = "1" ]; then
            LEASE_BODY_B64="$(cat "$tmp" | b64)"
          fi
        fi
      fi
    else
      LEASE_ERR="curl_failed"
    fi
    rm -f "$tmp"
  elif command -v wget >/dev/null 2>&1; then
    LEASE_TOOL="wget"
    tmp="$(mktemp /tmp/.seal-lease-XXXXXX)"
    if wget -q -O "$tmp" --timeout="$tm_s" "$EXT_LEASE_URL" 2>/dev/null; then
      LEASE_OK=1
      LEASE_STATUS="ok"
      if [ -f "$tmp" ]; then
        size="$(stat -Lc '%s' "$tmp" 2>/dev/null || echo 0)"
        LEASE_BODY_LEN="$size"
        if [ "$size" -gt 4096 ]; then
          LEASE_BODY_TRUNC=1
          if [ "$BASE64_OK" = "1" ]; then
            LEASE_BODY_B64="$(head -c 4096 "$tmp" | b64)"
          fi
        else
          if [ "$BASE64_OK" = "1" ]; then
            LEASE_BODY_B64="$(cat "$tmp" | b64)"
          fi
        fi
      fi
    else
      LEASE_ERR="wget_failed"
    fi
    rm -f "$tmp"
  else
    LEASE_TOOL="missing"
    LEASE_ERR="no_http_tool"
  fi
fi
echo "LEASE_OK=$LEASE_OK"
echo "LEASE_STATUS=$LEASE_STATUS"
echo "LEASE_TOOL=$LEASE_TOOL"
echo "LEASE_ERR=$LEASE_ERR"
echo "LEASE_BODY_LEN=$LEASE_BODY_LEN"
echo "LEASE_BODY_TRUNC=$LEASE_BODY_TRUNC"
echo "LEASE_BODY_B64=$LEASE_BODY_B64"

TPM=0
if [ -e /dev/tpm0 ] || [ -d /sys/class/tpm/tpm0 ]; then
  TPM=1
fi
echo "TPM=$TPM"
TPM_TOOL=0
if command -v tpm2_getcap >/dev/null 2>&1 || command -v tpm2_pcrread >/dev/null 2>&1; then
  TPM_TOOL=1
fi
echo "TPM_TOOL=$TPM_TOOL"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel inspect failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }

  const kv = parseKeyValueOutput(res.stdout);
  const notes = [];
  const hasBase64 = kv.BASE64 === "1";
  if (!hasBase64) notes.push("base64 not available on target; mount inspection limited");

  const mounts = parseMounts(decodeBase64(kv.MOUNTS_B64));
  let lsblk = null;
  const lsblkText = decodeBase64(kv.LSBLK_B64);
  if (lsblkText) {
    try {
      lsblk = JSON.parse(lsblkText);
    } catch {
      notes.push("lsblk JSON parse failed; usb mount detection limited");
    }
  } else {
    notes.push("lsblk not available; usb mount detection limited");
  }
  const usbDevices = parseUsbDevices(decodeBase64(kv.USB_B64));
  const usbMounts = extractUsbMounts(lsblk);
  const hostShares = extractHostShares(mounts);
  const tpm = { present: kv.TPM === "1", tools: kv.TPM_TOOL === "1" };
  const xattr = {
    ok: kv.XATTR_OK === "1",
    error: kv.XATTR_ERR || null,
    path: kv.XATTR_PATH || null,
    sudo: kv.XATTR_SUDO === "1",
    note: kv.XATTR_NOTE || null,
  };

  const hostInfo = {
    mid: kv.MID || "",
    rid: kv.RID || "",
    fstype: kv.FSTYPE || "",
    puid: kv.PUID || "",
    cpuidProc: kv.CPUID || "",
  };
  let cpuIdAsm = { available: false, unsupported: false };
  try {
    const resAsm = getCpuIdAsmSsh(targetCfg, { allowUnsupported: true });
    cpuIdAsm = { available: !!resAsm.value, unsupported: !!resAsm.unsupported };
  } catch (e) {
    cpuIdAsm = { available: false, error: e.message };
  }

  let base = null;
  if (sentinelCfg && sentinelCfg.storage && sentinelCfg.storage.baseDir) {
    const statParts = (kv.BASE_STAT || "").split(/\s+/);
    const uid = statParts[0] ? Number(statParts[0]) : null;
    const gid = statParts[1] ? Number(statParts[1]) : null;
    const mode = statParts[2] ? String(statParts[2]) : null;
    base = {
      exists: kv.BASE_EXISTS !== "0",
      isSymlink: kv.BASE_SYMLINK === "1",
      uid,
      gid,
      mode,
      execOk: kv.BASE_EXEC !== "0",
      serviceUser,
      serviceGroup,
    };
  }

  const externalAnchor = { type: extType, configured: extType !== "none" };
  if (extType === "usb") {
    const cfg = extCfg.usb || {};
    const vid = String(cfg.vid || "").toLowerCase();
    const pid = String(cfg.pid || "").toLowerCase();
    const serial = String(cfg.serial || "");
    const matches = usbDevices.filter((d) => {
      if (!vid || !pid) return false;
      if (d.vid !== vid || d.pid !== pid) return false;
      if (serial && d.serial !== serial) return false;
      return true;
    });
    externalAnchor.usb = {
      vid,
      pid,
      serial,
      matches: matches.map((m) => ({ vid: m.vid, pid: m.pid, serial: m.serial, product: m.product, manufacturer: m.manufacturer })),
      ok: matches.length > 0,
    };
  } else if (extType === "file") {
    const stat = kv.EXT_FILE_STAT || "";
    const parts = stat.split(/\s+/);
    const mount = extFilePath ? findMountForPath(mounts, extFilePath) : null;
    const hostShare = !!(mount && extractHostShares([mount]).length);
    const usbMount = !!(usbMounts && mount && usbMounts.find((m) => {
      const points = Array.isArray(m.mountpoints)
        ? m.mountpoints
        : (m.mountpoint ? String(m.mountpoint).split(",").map((s) => s.trim()).filter(Boolean) : []);
      return points.includes(mount.mountpoint);
    }));
    externalAnchor.file = {
      path: extFilePath,
      exists: kv.EXT_FILE_EXISTS === "1",
      readable: kv.EXT_FILE_READ === "1",
      readableViaSudo: kv.EXT_FILE_READ_SUDO === "1",
      stat: stat ? { uid: parts[0] || null, gid: parts[1] || null, mode: parts[2] || null, size: parts[3] || null } : null,
      mount: mount ? { mountpoint: mount.mountpoint || null, fstype: mount.fstype || null, device: mount.device || null, hostShare, usb: usbMount } : null,
    };
  } else if (extType === "lease") {
    const bodyRaw = decodeBase64(kv.LEASE_BODY_B64);
    let bodySha256 = null;
    if (bodyRaw) {
      try {
        bodySha256 = crypto.createHash("sha256").update(bodyRaw).digest("hex");
      } catch {
        bodySha256 = null;
      }
    }
    externalAnchor.lease = {
      url: extLeaseUrl,
      timeoutMs: Number.isFinite(extLeaseTimeoutMs) ? extLeaseTimeoutMs : null,
      ok: kv.LEASE_OK === "1",
      status: kv.LEASE_STATUS || null,
      tool: kv.LEASE_TOOL || null,
      error: kv.LEASE_ERR || null,
      bodyBytes: kv.LEASE_BODY_LEN ? Number(kv.LEASE_BODY_LEN) : null,
      bodyTruncated: kv.LEASE_BODY_TRUNC === "1",
      bodySha256,
    };
  } else if (extType === "tpm2") {
    externalAnchor.tpm2 = { present: tpm.present, tools: tpm.tools };
  }

  return {
    host: hostInfo,
    base,
    options: {
      cpuId: {
        proc: !!hostInfo.cpuidProc,
        asm: cpuIdAsm,
      },
      usbDevices,
      usbMounts,
      hostShares,
      tpm,
      xattr,
      externalAnchor,
      notes,
    },
  };
}

module.exports = {
  FLAG_REQUIRE_XATTR,
  FLAG_L4_INCLUDE_PUID,
  FLAG_INCLUDE_CPUID,
  getHostInfoSsh,
  probeSentinelSsh,
  inspectSentinelSsh,
  installSentinelSsh,
  verifySentinelSsh,
  uninstallSentinelSsh,
};
