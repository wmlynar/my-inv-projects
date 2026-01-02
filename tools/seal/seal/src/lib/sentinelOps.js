"use strict";

const fs = require("fs");
const os = require("os");
const { resolveTmpBase } = require("./tmp");
const path = require("path");
const crypto = require("crypto");

const { spawnSyncSafe } = require("./spawn");
const {
  sshExec,
  scpTo,
  scpFrom,
  normalizeStrictHostKeyChecking,
  normalizeSshPort,
  formatSshFailure,
} = require("./ssh");
const { ensureDir, fileExists } = require("./fsextra");
const { packBlob, unpackBlob } = require("./sentinelCore");
const { buildFingerprintHash, resolveAutoLevel, normalizeCpuIdSource } = require("./sentinelConfig");

const FLAG_REQUIRE_XATTR = 0x0001;
const FLAG_L4_INCLUDE_PUID = 0x0002;
const FLAG_INCLUDE_CPUID = 0x0004;
const TMPDIR_EXPR = "${SEAL_TMPDIR:-${TMPDIR:-$PWD}}";
const MAX_ANCHOR_FILE_BYTES = 4096;

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

function resolveInstallDir(targetCfg) {
  if (targetCfg && targetCfg.installDir) return targetCfg.installDir;
  const appName = targetCfg && (targetCfg.appName || targetCfg.serviceName) ? (targetCfg.appName || targetCfg.serviceName) : "app";
  return `/home/admin/apps/${appName}`;
}

function resolveRemoteTmpDir(targetCfg) {
  const cfg = targetCfg && targetCfg.preflight && typeof targetCfg.preflight === "object"
    ? targetCfg.preflight.tmpDir
    : null;
  const tmpDir = cfg !== undefined && cfg !== null ? String(cfg).trim() : "";
  if (tmpDir) return tmpDir;
  const installDir = targetCfg && targetCfg.installDir ? String(targetCfg.installDir) : "";
  return installDir ? `${installDir}/.seal-tmp` : ".seal-tmp";
}

function resolveLauncherPath(targetCfg) {
  return path.posix.join(resolveInstallDir(targetCfg), "b", "a");
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

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function normalizeHexDigest(value, label) {
  const hex = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error(`${label} invalid: ${value}`);
  }
  return hex;
}

function buildUsbAnchorBytes(usbCfg) {
  const serial = usbCfg.serial || "";
  const text = `usb\nvid=${usbCfg.vid}\npid=${usbCfg.pid}\nserial=${serial}\n`;
  return Buffer.from(text, "utf8");
}

function probeUsbAnchorSsh(targetCfg, usbCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const script = `
set -euo pipefail
VID=${shQuote(usbCfg.vid)}
PID=${shQuote(usbCfg.pid)}
SER=${shQuote(usbCfg.serial || "")}
FOUND=0
MATCH_SERIAL=""
for d in /sys/bus/usb/devices/*; do
  [ -d "$d" ] || continue
  vid="$(cat "$d/idVendor" 2>/dev/null || true)"
  pid="$(cat "$d/idProduct" 2>/dev/null || true)"
  [ -n "$vid$pid" ] || continue
  vid="$(echo "$vid" | tr 'A-Z' 'a-z' | tr -d '\\r\\n\\t ')"
  pid="$(echo "$pid" | tr 'A-Z' 'a-z' | tr -d '\\r\\n\\t ')"
  if [ "$vid" != "$VID" ] || [ "$pid" != "$PID" ]; then
    continue
  fi
  serial="$(cat "$d/serial" 2>/dev/null || true)"
  serial="$(echo "$serial" | tr -d '\\r\\n')"
  if [ -n "$SER" ] && [ "$serial" != "$SER" ]; then
    continue
  fi
  FOUND=1
  MATCH_SERIAL="$serial"
  break
done
echo "FOUND=$FOUND"
echo "SERIAL=$MATCH_SERIAL"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel usb anchor probe failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
  }
  const kv = parseKeyValueOutput(res.stdout);
  return { found: kv.FOUND === "1", serial: kv.SERIAL || "" };
}

function probeFileAnchorSsh(targetCfg, filePath) {
  const { user, host } = sshUserHost(targetCfg);
  const script = `
set -euo pipefail
FILE=${shQuote(filePath)}
SUDO=""
if [ ! -e "$FILE" ]; then
  echo "__SEAL_FILE_MISSING__"
  exit 2
fi
if [ -L "$FILE" ]; then
  echo "__SEAL_FILE_SYMLINK__"
  exit 2
fi
if [ ! -r "$FILE" ]; then
  if command -v sudo >/dev/null 2>&1 && sudo -n test -r "$FILE" >/dev/null 2>&1; then
    SUDO="sudo -n"
  else
    echo "__SEAL_FILE_NO_READ__"
    exit 3
  fi
fi
if [ ! -f "$FILE" ]; then
  echo "__SEAL_FILE_NOT_FILE__"
  exit 2
fi
HASH_TOOL=""
if command -v sha256sum >/dev/null 2>&1; then
  HASH_TOOL="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH_TOOL="shasum -a 256"
elif command -v openssl >/dev/null 2>&1; then
  HASH_TOOL="openssl dgst -sha256"
fi
if [ -z "$HASH_TOOL" ]; then
  echo "__SEAL_HASH_TOOL_MISSING__"
  exit 4
fi
SIZE="$($SUDO stat -Lc '%s' "$FILE" 2>/dev/null || true)"
if [ -z "$SIZE" ]; then
  echo "__SEAL_FILE_STAT__"
  exit 4
fi
HASH="$($SUDO $HASH_TOOL "$FILE" 2>/dev/null | awk '{print $NF}')"
if [ -z "$HASH" ]; then
  echo "__SEAL_HASH_FAIL__"
  exit 4
fi
echo "SIZE=$SIZE"
echo "SHA256=$HASH"
echo "SUDO=\${SUDO:+1}"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  const out = `${res.stdout}\n${res.stderr}`.trim();
  if (!res.ok) {
    if (out.includes("__SEAL_FILE_MISSING__")) throw new Error(`sentinel file anchor missing: ${filePath}`);
    if (out.includes("__SEAL_FILE_SYMLINK__")) throw new Error(`sentinel file anchor is symlink: ${filePath}`);
    if (out.includes("__SEAL_FILE_NOT_FILE__")) throw new Error(`sentinel file anchor is not a file: ${filePath}`);
    if (out.includes("__SEAL_FILE_NO_READ__")) throw new Error(`sentinel file anchor not readable: ${filePath}`);
    if (out.includes("__SEAL_HASH_TOOL_MISSING__")) throw new Error("sentinel file anchor requires sha256sum/shasum/openssl");
    if (out.includes("__SEAL_HASH_FAIL__")) throw new Error("sentinel file anchor hash failed");
    if (out.includes("__SEAL_FILE_STAT__")) throw new Error("sentinel file anchor stat failed");
    throw new Error(`sentinel file anchor probe failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
  }
  const kv = parseKeyValueOutput(res.stdout);
  const size = Number(kv.SIZE || "");
  if (!Number.isFinite(size) || size < 0) {
    throw new Error(`sentinel file anchor size invalid: ${kv.SIZE}`);
  }
  const shaHex = normalizeHexDigest(kv.SHA256, "sentinel file anchor sha256");
  return { size, sha256: shaHex, sudo: kv.SUDO === "1" };
}

function probeLeaseAnchorSsh(targetCfg, leaseCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const url = leaseCfg && leaseCfg.url ? String(leaseCfg.url) : "";
  const timeoutMs = leaseCfg && Number.isFinite(Number(leaseCfg.timeoutMs)) ? Number(leaseCfg.timeoutMs) : 1500;
  const maxBytes = leaseCfg && Number.isFinite(Number(leaseCfg.maxBytes)) ? Number(leaseCfg.maxBytes) : MAX_ANCHOR_FILE_BYTES;
  const script = `
set -euo pipefail
URL=${shQuote(url)}
TIMEOUT_MS=${shQuote(timeoutMs)}
MAX_BYTES=${shQuote(maxBytes)}

if [ -z "$URL" ]; then
  echo "__SEAL_LEASE_URL_EMPTY__"
  exit 4
fi

tmp_root="\${TMPDIR:-/tmp}"
DIR="$(mktemp -d "$tmp_root/.seal-lease-XXXXXX")"
FILE="$DIR/lease"
cleanup() {
  rm -rf "$DIR"
}
trap cleanup EXIT

tm_ms="$TIMEOUT_MS"
tm_s="$((tm_ms / 1000))"
if [ "$tm_s" -le 0 ]; then tm_s=1; fi

STATUS=""
if command -v curl >/dev/null 2>&1; then
  STATUS="$(curl -sS -o "$FILE" -w "%{http_code}" --max-time "$tm_s" "$URL" 2>/dev/null || true)"
elif command -v wget >/dev/null 2>&1; then
  if wget -q -O "$FILE" --timeout="$tm_s" "$URL" 2>/dev/null; then
    STATUS="200"
  else
    STATUS="000"
  fi
else
  echo "__SEAL_LEASE_TOOL_MISSING__"
  exit 4
fi

if [ -z "$STATUS" ] || [ "$STATUS" = "000" ]; then
  echo "__SEAL_LEASE_FETCH__"
  exit 4
fi
if [ "$STATUS" -lt 200 ] || [ "$STATUS" -ge 300 ]; then
  echo "__SEAL_LEASE_STATUS__:$STATUS"
  exit 4
fi

SIZE="$(stat -Lc '%s' "$FILE" 2>/dev/null || true)"
if [ -z "$SIZE" ]; then
  echo "__SEAL_LEASE_STAT__"
  exit 4
fi
if [ "$SIZE" -le 0 ]; then
  echo "__SEAL_LEASE_EMPTY__"
  exit 4
fi
if [ "$MAX_BYTES" -gt 0 ] && [ "$SIZE" -gt "$MAX_BYTES" ]; then
  echo "__SEAL_LEASE_TOO_LARGE__:$SIZE"
  exit 4
fi

HASH_TOOL=""
if command -v sha256sum >/dev/null 2>&1; then
  HASH_TOOL="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH_TOOL="shasum"
elif command -v openssl >/dev/null 2>&1; then
  HASH_TOOL="openssl"
fi
if [ -z "$HASH_TOOL" ]; then
  echo "__SEAL_HASH_TOOL_MISSING__"
  exit 4
fi

HASH=""
if [ "$HASH_TOOL" = "sha256sum" ]; then
  HASH="$(sha256sum "$FILE" 2>/dev/null | awk '{print $1}')"
elif [ "$HASH_TOOL" = "shasum" ]; then
  HASH="$(shasum -a 256 "$FILE" 2>/dev/null | awk '{print $1}')"
else
  HASH="$(openssl dgst -sha256 "$FILE" 2>/dev/null | awk '{print $NF}')"
fi
if [ -z "$HASH" ]; then
  echo "__SEAL_HASH_FAIL__"
  exit 4
fi
echo "SIZE=$SIZE"
echo "SHA256=$HASH"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  const out = `${res.stdout}\n${res.stderr}`.trim();
  if (!res.ok) {
    if (out.includes("__SEAL_LEASE_URL_EMPTY__")) throw new Error("sentinel lease url empty");
    if (out.includes("__SEAL_LEASE_TOOL_MISSING__")) throw new Error("sentinel lease requires curl or wget");
    if (out.includes("__SEAL_LEASE_FETCH__")) throw new Error("sentinel lease fetch failed");
    if (out.includes("__SEAL_LEASE_STATUS__")) {
      const match = out.match(/__SEAL_LEASE_STATUS__:(\d+)/);
      const code = match ? match[1] : "?";
      throw new Error(`sentinel lease HTTP error (${code})`);
    }
    if (out.includes("__SEAL_LEASE_STAT__")) throw new Error("sentinel lease stat failed");
    if (out.includes("__SEAL_LEASE_EMPTY__")) throw new Error("sentinel lease empty body");
    if (out.includes("__SEAL_LEASE_TOO_LARGE__")) {
      const match = out.match(/__SEAL_LEASE_TOO_LARGE__:(\d+)/);
      const size = match ? match[1] : "?";
      throw new Error(`sentinel lease too large (${size} bytes)`);
    }
    if (out.includes("__SEAL_HASH_TOOL_MISSING__")) throw new Error("sentinel lease requires sha256sum/shasum/openssl");
    if (out.includes("__SEAL_HASH_FAIL__")) throw new Error("sentinel lease hash failed");
    throw new Error(`sentinel lease probe failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
  }
  const kv = parseKeyValueOutput(res.stdout);
  const size = Number(kv.SIZE || "");
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`sentinel lease size invalid: ${kv.SIZE}`);
  }
  const shaHex = normalizeHexDigest(kv.SHA256, "sentinel lease sha256");
  return { size, sha256: shaHex };
}

function probeTpm2AnchorSsh(targetCfg, tpm2Cfg) {
  const { user, host } = sshUserHost(targetCfg);
  const bank = tpm2Cfg && tpm2Cfg.bank ? String(tpm2Cfg.bank) : "sha256";
  const pcrs = tpm2Cfg && Array.isArray(tpm2Cfg.pcrs) ? tpm2Cfg.pcrs : [0, 2, 4, 7];
  const pcrList = pcrs.map((p) => String(p)).join(",");
  const script = `
set -euo pipefail
BANK=${shQuote(bank)}
PCRS=${shQuote(pcrList)}

if ! command -v tpm2_pcrread >/dev/null 2>&1; then
  echo "__SEAL_TPM_TOOL_MISSING__"
  exit 4
fi
if [ ! -e /dev/tpm0 ] && [ ! -d /sys/class/tpm/tpm0 ]; then
  echo "__SEAL_TPM_MISSING__"
  exit 4
fi

OUT="$(tpm2_pcrread "$BANK:$PCRS" 2>/dev/null || true)"
if [ -z "$OUT" ]; then
  echo "__SEAL_TPM_READ_FAIL__"
  exit 4
fi

HASHES="$(echo "$OUT" | grep -o '0x[0-9a-fA-F]\\{32,\\}' | sed 's/^0x//')"
if [ -z "$HASHES" ]; then
  echo "__SEAL_TPM_PARSE_FAIL__"
  exit 4
fi
COMBINED="$(echo "$HASHES" | tr -d '\\n')"
if [ -z "$COMBINED" ]; then
  echo "__SEAL_TPM_PARSE_FAIL__"
  exit 4
fi

HASH_TOOL=""
if command -v sha256sum >/dev/null 2>&1; then
  HASH_TOOL="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH_TOOL="shasum"
elif command -v openssl >/dev/null 2>&1; then
  HASH_TOOL="openssl"
fi
if [ -z "$HASH_TOOL" ]; then
  echo "__SEAL_HASH_TOOL_MISSING__"
  exit 4
fi

HASH=""
if [ "$HASH_TOOL" = "sha256sum" ]; then
  HASH="$(printf '%s' "$COMBINED" | sha256sum 2>/dev/null | awk '{print $1}')"
elif [ "$HASH_TOOL" = "shasum" ]; then
  HASH="$(printf '%s' "$COMBINED" | shasum -a 256 2>/dev/null | awk '{print $1}')"
else
  HASH="$(printf '%s' "$COMBINED" | openssl dgst -sha256 2>/dev/null | awk '{print $NF}')"
fi
if [ -z "$HASH" ]; then
  echo "__SEAL_HASH_FAIL__"
  exit 4
fi
echo "PCRS=$PCRS"
echo "SHA256=$HASH"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  const out = `${res.stdout}\n${res.stderr}`.trim();
  if (!res.ok) {
    if (out.includes("__SEAL_TPM_TOOL_MISSING__")) throw new Error("sentinel tpm2 requires tpm2_pcrread");
    if (out.includes("__SEAL_TPM_MISSING__")) throw new Error("sentinel tpm2 device missing");
    if (out.includes("__SEAL_TPM_READ_FAIL__")) throw new Error("sentinel tpm2 read failed");
    if (out.includes("__SEAL_TPM_PARSE_FAIL__")) throw new Error("sentinel tpm2 parse failed");
    if (out.includes("__SEAL_HASH_TOOL_MISSING__")) throw new Error("sentinel tpm2 requires sha256sum/shasum/openssl");
    if (out.includes("__SEAL_HASH_FAIL__")) throw new Error("sentinel tpm2 hash failed");
    throw new Error(`sentinel tpm2 probe failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
  }
  const kv = parseKeyValueOutput(res.stdout);
  const shaHex = normalizeHexDigest(kv.SHA256, "sentinel tpm2 sha256");
  return { bank, pcrs: pcrs.slice(), sha256: shaHex };
}

function resolveExternalAnchorEahSsh({ targetCfg, sentinelCfg }) {
  const ext = sentinelCfg && sentinelCfg.externalAnchor ? sentinelCfg.externalAnchor : { type: "none" };
  const type = String(ext.type || "none").toLowerCase();
  if (type === "none") return { type: "none", eah: "" };
  if (type === "usb") {
    const usbCfg = ext.usb || {};
    const probe = probeUsbAnchorSsh(targetCfg, usbCfg);
    if (!probe.found) {
      throw new Error(`sentinel usb anchor not found (vid=${usbCfg.vid}, pid=${usbCfg.pid})`);
    }
    const anchorBytes = buildUsbAnchorBytes(usbCfg);
    return { type: "usb", eah: sha256Hex(anchorBytes) };
  }
  if (type === "file") {
    const fileCfg = ext.file || {};
    const info = probeFileAnchorSsh(targetCfg, fileCfg.path);
    let eah = info.sha256;
    if (info.size > MAX_ANCHOR_FILE_BYTES) {
      eah = sha256Hex(Buffer.from(info.sha256, "hex"));
    }
    return { type: "file", eah, size: info.size, sudo: info.sudo };
  }
  if (type === "lease") {
    const leaseCfg = ext.lease || {};
    const info = probeLeaseAnchorSsh(targetCfg, leaseCfg);
    return { type: "lease", eah: info.sha256, size: info.size };
  }
  if (type === "tpm2") {
    const tpm2Cfg = ext.tpm2 || {};
    const info = probeTpm2AnchorSsh(targetCfg, tpm2Cfg);
    return { type: "tpm2", eah: info.sha256, bank: info.bank, pcrs: info.pcrs };
  }
  throw new Error(`sentinel externalAnchor not supported: ${type}`);
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
    const mountpoints = (Array.isArray(mountpointsRaw) ? mountpointsRaw : (mountpointsRaw ? [mountpointsRaw] : []))
      .map((item) => (item === null || item === undefined ? "" : String(item)))
      .map((item) => item.trim())
      .filter(Boolean);
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

TMPDIR_SAFE="${TMPDIR_EXPR}"
if [ ! -d "$TMPDIR_SAFE" ] || [ ! -w "$TMPDIR_SAFE" ] || [ ! -x "$TMPDIR_SAFE" ]; then
  TMPDIR_SAFE="$PWD"
fi
TMP="$(mktemp -d "$TMPDIR_SAFE/.seal-cpuid-XXXXXX")"
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
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  const out = `${res.stdout}\n${res.stderr}`.trim();
  if (out.includes("__SEAL_NO_CC__")) {
    throw new Error("sentinel cpuid asm requires cc on target (install build-essential)");
  }
  if (out.includes("__SEAL_NO_CPUID__")) {
    if (allowUnsupported) return { value: "", unsupported: true };
    throw new Error("sentinel cpuid asm not supported on this architecture");
  }
  if (!res.ok) {
    throw new Error(`sentinel cpuid asm failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
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
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel host probe failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
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

function getEpochSecondsSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", "date +%s"], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel time probe failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
  }
  const raw = String(res.stdout || "").trim();
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`sentinel time probe failed: invalid epoch "${raw}"`);
  }
  return Math.trunc(num);
}

function resolveExpiresAtSec({ sentinelCfg, nowSec }) {
  const timeLimit = sentinelCfg && sentinelCfg.timeLimit ? sentinelCfg.timeLimit : { mode: "off" };
  if (!timeLimit || timeLimit.mode === "off") return 0;
  if (timeLimit.mode === "absolute") {
    const exp = Number(timeLimit.expiresAtSec || 0);
    if (!Number.isFinite(exp) || exp <= 0) {
      throw new Error("sentinel timeLimit.expiresAt is invalid");
    }
    if (nowSec && exp <= nowSec) {
      throw new Error("sentinel timeLimit.expiresAt is in the past");
    }
    return Math.trunc(exp);
  }
  if (timeLimit.mode === "relative") {
    const dur = Number(timeLimit.durationSec || 0);
    if (!Number.isFinite(dur) || dur <= 0) {
      throw new Error("sentinel timeLimit duration is invalid");
    }
    if (!Number.isFinite(nowSec) || nowSec <= 0) {
      throw new Error("sentinel timeLimit requires current time");
    }
    return Math.trunc(nowSec + dur);
  }
  throw new Error(`sentinel timeLimit mode unsupported: ${timeLimit.mode}`);
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
CUR_USER="$(id -un 2>/dev/null || true)"
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
  if [ -n "$CUR_USER" ] && [ "$CUR_USER" = "$SVC_USER" ]; then
    if test -x "$BASE"; then
      BASE_EXEC=1
    else
      BASE_EXEC=0
    fi
  elif command -v sudo >/dev/null 2>&1; then
    if sudo -n -u "$SVC_USER" test -x "$BASE"; then
      BASE_EXEC=1
    else
      BASE_EXEC=0
    fi
  else
    BASE_EXEC=0
  fi
fi
echo "BASE_EXEC=$BASE_EXEC"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel baseDir probe failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
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

function verifySentinelRuntimeSsh({ targetCfg }) {
  const { user, host } = sshUserHost(targetCfg);
  const launcher = resolveLauncherPath(targetCfg);
  const { user: serviceUser } = serviceUserGroup(targetCfg, user);
  const script = `
set -euo pipefail
BIN=${shQuote(launcher)}
if [ ! -x "$BIN" ]; then
  echo "__SEAL_SENTINEL_VERIFY_NO_LAUNCHER__"
  exit 4
fi
SVC_USER=${shQuote(serviceUser)}
IS_ROOT=0
if [ "$(id -u)" -eq 0 ]; then
  IS_ROOT=1
fi
run_as() {
  if [ "$SVC_USER" = "root" ]; then
    "$@"
    return $?
  fi
  if [ "$IS_ROOT" = "1" ] && command -v runuser >/dev/null 2>&1; then
    runuser -u "$SVC_USER" -- "$@"
    return $?
  fi
  if [ "$IS_ROOT" = "1" ] && command -v su >/dev/null 2>&1; then
    su -s /bin/sh -c "$(printf '%q ' "$@")" "$SVC_USER"
    return $?
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo -n -u "$SVC_USER" -- "$@"
    return $?
  fi
  return 127
}
set +e
run_as env SEAL_SENTINEL_VERIFY=1 "$BIN" >/dev/null 2>&1
code=$?
set -e
if [ "$code" -eq 0 ]; then
  echo "__SEAL_SENTINEL_VERIFY_OK__"
  exit 0
fi
if [ "$code" -eq 127 ]; then
  echo "__SEAL_SENTINEL_VERIFY_RUNAS__"
  exit 6
fi
echo "__SEAL_SENTINEL_VERIFY_FAIL__:$code"
exit 5
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  const out = String(res.stdout || "");
  if (!res.ok) {
    if (out.includes("__SEAL_SENTINEL_VERIFY_OK__")) {
      return { ok: true, launcher };
    }
    const combined = `${res.stdout}\n${res.stderr}`.trim();
    if (out.includes("__SEAL_SENTINEL_VERIFY_NO_LAUNCHER__")) {
      return { ok: false, reason: "missing_launcher", launcher };
    }
    if (out.includes("__SEAL_SENTINEL_VERIFY_RUNAS__")) {
      return { ok: false, reason: "runas_unavailable", launcher };
    }
    const match = out.match(/__SEAL_SENTINEL_VERIFY_FAIL__:(\d+)/);
    const exitCode = match ? Number(match[1]) : null;
    if (exitCode !== null) {
      return { ok: false, reason: "runtime_invalid", exitCode, launcher };
    }
    throw new Error(`sentinel runtime verify failed (status=${res.status})${formatSshFailure(res) || (combined ? `: ${combined}` : "")}`);
  }
  if (out.includes("__SEAL_SENTINEL_VERIFY_NO_LAUNCHER__")) {
    return { ok: false, reason: "missing_launcher", launcher };
  }
  if (out.includes("__SEAL_SENTINEL_VERIFY_RUNAS__")) {
    return { ok: false, reason: "runas_unavailable", launcher };
  }
  if (out.includes("__SEAL_SENTINEL_VERIFY_OK__")) {
    return { ok: true, launcher };
  }
  const match = out.match(/__SEAL_SENTINEL_VERIFY_FAIL__:(\d+)/);
  const exitCode = match ? Number(match[1]) : null;
  return { ok: false, reason: "runtime_invalid", exitCode, launcher };
}

function installSentinelSsh({ targetCfg, sentinelCfg, force, insecure, skipVerify }) {
  const { user, host } = sshUserHost(targetCfg);
  if (!force) {
    const existing = verifySentinelSsh({ targetCfg, sentinelCfg });
    if (existing && existing.ok) {
      if (!skipVerify) {
        const verifyRes = verifySentinelRuntimeSsh({ targetCfg });
        if (!verifyRes.ok) {
          const detail = verifyRes.reason === "missing_launcher"
            ? `launcher missing: ${verifyRes.launcher}`
            : (verifyRes.reason === "runas_unavailable"
              ? "cannot switch to service user"
              : `runtime invalid (exit=${verifyRes.exitCode ?? "?"})`);
          throw new Error(`sentinel verify failed: ${detail} (use --skip-verify or --skip-sentinel-verify to ignore)`);
        }
      }
      return {
        hostInfo: existing.hostInfo || null,
        level: existing.parsed ? existing.parsed.level : null,
        output: "__SEAL_SENTINEL_OK__",
      };
    }
  }
  const hostInfo = getHostInfoSsh(targetCfg);
  const timeLimit = sentinelCfg && sentinelCfg.timeLimit ? sentinelCfg.timeLimit : { mode: "off" };
  const needsNow = timeLimit.mode && timeLimit.mode !== "off";
  const nowSec = needsNow ? getEpochSecondsSsh(targetCfg) : null;
  const externalAnchor = sentinelCfg.externalAnchor || { type: "none" };
  const hasExternalAnchor = externalAnchor.type && externalAnchor.type !== "none";
  let level = sentinelCfg.level === "auto" ? resolveAutoLevel(hostInfo) : Number(sentinelCfg.level);
  if (sentinelCfg.level === "auto" && hasExternalAnchor) {
    level = 4;
  }
  if (hasExternalAnchor && level !== 4) {
    throw new Error("sentinel externalAnchor requires level=4");
  }
  if (!hasExternalAnchor && level === 4) {
    throw new Error("sentinel level=4 requires externalAnchor");
  }
  if (![0, 1, 2, 3, 4].includes(level)) {
    throw new Error(`sentinel level not supported: ${level}`);
  }
  if (level >= 1 && !hostInfo.mid) throw new Error("sentinel install failed: missing machine-id");
  if (level >= 2 && !hostInfo.rid) throw new Error("sentinel install failed: missing rid");
  if (level === 3 && !hostInfo.puid) throw new Error("sentinel install failed: missing puid");
  if (level === 4) {
    const ext = resolveExternalAnchorEahSsh({ targetCfg, sentinelCfg });
    hostInfo.eah = ext.eah;
  }

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
  const includePuid = level === 4 && !!sentinelCfg.l4IncludePuid;
  if (includePuid) {
    if (!hostInfo.puid) throw new Error("sentinel install failed: missing puid for l4IncludePuid");
    flags |= FLAG_L4_INCLUDE_PUID;
  }
  const installId = crypto.randomBytes(32);
  const fpHash = buildFingerprintHash(level, hostInfo, { includePuid, includeCpuId });
  const expiresAtSec = resolveExpiresAtSec({ sentinelCfg, nowSec });
  const blob = packBlob({ level, flags, installId, fpHash, expiresAtSec }, sentinelCfg.anchor);

  const tmpDir = fs.mkdtempSync(path.join(resolveTmpBase(), "seal-sentinel-"));
  const tmpLocal = path.join(tmpDir, "blob");
  fs.writeFileSync(tmpLocal, blob, { mode: 0o600 });

  const remoteTag = String(targetCfg.serviceName || targetCfg.appName || "app").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const tmpSuffix = crypto.randomBytes(4).toString("hex");
  const tmpRemote = `${resolveRemoteTmpDir(targetCfg)}/.${remoteTag}-s-${Date.now()}-${tmpSuffix}`;
  const up = scpToTarget(targetCfg, { user, host, localPath: tmpLocal, remotePath: tmpRemote });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (!up.ok) throw new Error(`sentinel scp failed (status=${up.status})${formatSshFailure(up)}`);

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
chmod 0750 "$DIR"

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
  const script = sudo ? `${sudo} bash -c ${shQuote(rootScript)}` : rootScript;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    const hint = describeSentinelInstallError(out, baseDir);
    if (hint) throw new Error(hint);
    throw new Error(`sentinel install failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
  }
  if (!skipVerify) {
    const verifyRes = verifySentinelRuntimeSsh({ targetCfg });
    if (!verifyRes.ok) {
      const detail = verifyRes.reason === "missing_launcher"
        ? `launcher missing: ${verifyRes.launcher}`
        : (verifyRes.reason === "runas_unavailable"
          ? "cannot switch to service user"
          : `runtime invalid (exit=${verifyRes.exitCode ?? "?"})`);
      throw new Error(`sentinel verify failed: ${detail} (use --skip-verify or --skip-sentinel-verify to ignore)`);
    }
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
echo "NOW_EPOCH=$(date +%s)"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  const out = `${res.stdout || ""}\n${res.stderr || ""}`;
  if (out.includes("__SEAL_SENTINEL_MISSING__")) {
    return { ok: false, reason: "missing" };
  }
  if (!res.ok) {
    throw new Error(`sentinel verify failed (status=${res.status})${formatSshFailure(res) || (out.trim() ? `: ${out.trim()}` : "")}`);
  }

  const tmpDir = fs.mkdtempSync(path.join(resolveTmpBase(), "seal-sentinel-"));
  const tmpLocal = path.join(tmpDir, "blob");
  const get = scpFromTarget(targetCfg, { user, host, remotePath: file, localPath: tmpLocal });
  if (!get.ok) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(`sentinel scp failed (status=${get.status})${formatSshFailure(get)}`);
  }
  try {
    fs.chmodSync(tmpLocal, 0o600);
  } catch {
    // best-effort
  }
  const blob = fs.readFileSync(tmpLocal);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const parsed = unpackBlob(blob, sentinelCfg.anchor);
  if (![1, 2].includes(parsed.version)) {
    return { ok: false, reason: "version", parsed };
  }
  if (![0, 1, 2, 3, 4].includes(parsed.level)) {
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
  if (parsed.level === 3 && !hostInfo.puid) {
    return { ok: false, reason: "puid_missing", parsed, hostInfo };
  }
  if (parsed.level === 4) {
    const ext = sentinelCfg && sentinelCfg.externalAnchor ? sentinelCfg.externalAnchor : { type: "none" };
    if (!ext || ext.type === "none") {
      return { ok: false, reason: "external_anchor_missing", parsed, hostInfo };
    }
    try {
      hostInfo.eah = resolveExternalAnchorEahSsh({ targetCfg, sentinelCfg }).eah;
    } catch (e) {
      return { ok: false, reason: "external_anchor_missing", error: e.message, parsed, hostInfo };
    }
    if (includePuid && !hostInfo.puid) {
      return { ok: false, reason: "puid_missing", parsed, hostInfo };
    }
  }
  const fpHash = buildFingerprintHash(parsed.level, hostInfo, { includePuid, includeCpuId });
  const match = crypto.timingSafeEqual(parsed.fpHash, fpHash);

  let expired = false;
  const kv = parseKeyValueOutput(res.stdout);
  const nowEpoch = Number(kv.NOW_EPOCH || "");
  if (parsed.expiresAtSec && nowEpoch > 0) {
    const exp = typeof parsed.expiresAtSec === "bigint" ? parsed.expiresAtSec : BigInt(parsed.expiresAtSec || 0);
    if (exp > 0n && BigInt(nowEpoch) > exp) {
      expired = true;
    }
  }

  const statParts = (kv.FILE_STAT || "").split(/\s+/);
  const fileUid = statParts[0] ? Number(statParts[0]) : null;
  const fileGid = statParts[1] ? Number(statParts[1]) : null;
  const fileMode = statParts[2] ? String(statParts[2]) : null;

  return {
    ok: match && !expired,
    reason: expired ? "expired" : (match ? null : "mismatch"),
    parsed,
    hostInfo,
    file: { path: file, uid: fileUid, gid: fileGid, mode: fileMode, serviceUser, serviceGroup },
    nowEpoch: Number.isFinite(nowEpoch) ? nowEpoch : null,
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
  const script = sudo ? `${sudo} bash -c ${shQuote(rootScript)}` : rootScript;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    const hint = describeSentinelUninstallError(out);
    if (hint) throw new Error(hint);
    throw new Error(`sentinel uninstall failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
  }
  return { ok: true };
}

function probeSentinelSsh({ targetCfg, sentinelCfg }) {
  const hostInfo = getHostInfoSsh(targetCfg);
  const base = probeBaseDirSsh(targetCfg, sentinelCfg);
  let externalAnchor = null;
  if (sentinelCfg && sentinelCfg.externalAnchor && sentinelCfg.externalAnchor.type !== "none") {
    try {
      const res = resolveExternalAnchorEahSsh({ targetCfg, sentinelCfg });
      externalAnchor = { type: res.type, ok: true };
    } catch (e) {
      externalAnchor = { type: sentinelCfg.externalAnchor.type, ok: false, error: e.message };
    }
  }
  return { hostInfo, base, externalAnchor };
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
CUR_USER="$(id -un 2>/dev/null || true)"

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
    if [ -n "$CUR_USER" ] && [ "$CUR_USER" = "$SVC_USER" ]; then
      if test -x "$BASE_DIR"; then
        BASE_EXEC=1
      else
        BASE_EXEC=0
      fi
    elif command -v sudo >/dev/null 2>&1; then
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
TMPDIR_SAFE="${TMPDIR_EXPR}"
if [ ! -d "$TMPDIR_SAFE" ] || [ ! -w "$TMPDIR_SAFE" ] || [ ! -x "$TMPDIR_SAFE" ]; then
  TMPDIR_SAFE="$PWD"
fi
if [ -n "$BASE_DIR" ] && [ -d "$BASE_DIR" ]; then
  if [ -w "$BASE_DIR" ] && [ -x "$BASE_DIR" ]; then
    XATTR_PATH="$BASE_DIR"
  else
    if command -v sudo >/dev/null 2>&1 && sudo -n test -w "$BASE_DIR" -a -x "$BASE_DIR" >/dev/null 2>&1; then
      XATTR_PATH="$BASE_DIR"
      XATTR_SUDO=1
    else
      XATTR_NOTE="baseDir_not_writable"
      XATTR_PATH="$TMPDIR_SAFE"
    fi
  fi
else
  XATTR_NOTE="baseDir_missing"
  XATTR_PATH="$TMPDIR_SAFE"
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
    TMPDIR_SAFE="${TMPDIR_EXPR}"
    if [ ! -d "$TMPDIR_SAFE" ] || [ ! -w "$TMPDIR_SAFE" ] || [ ! -x "$TMPDIR_SAFE" ]; then
      TMPDIR_SAFE="$PWD"
    fi
    sudo -n env TMPDIR="$TMPDIR_SAFE" sh -lc '
set -e
XATTR_OK=0
XATTR_ERR=""
TMPDIR_SAFE="${TMPDIR_EXPR}"
if [ ! -d "$TMPDIR_SAFE" ] || [ ! -w "$TMPDIR_SAFE" ] || [ ! -x "$TMPDIR_SAFE" ]; then
  TMPDIR_SAFE="$PWD"
fi
tmp="$(mktemp "'"$XATTR_PATH"'/.seal-xattr-XXXXXX")" || tmp="$(mktemp "$TMPDIR_SAFE/.seal-xattr-XXXXXX")"
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
    TMPDIR_SAFE="${TMPDIR_EXPR}"
    if [ ! -d "$TMPDIR_SAFE" ] || [ ! -w "$TMPDIR_SAFE" ] || [ ! -x "$TMPDIR_SAFE" ]; then
      TMPDIR_SAFE="$PWD"
    fi
    tmp="$(mktemp "$XATTR_PATH/.seal-xattr-XXXXXX")" || tmp="$(mktemp "$TMPDIR_SAFE/.seal-xattr-XXXXXX")"
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
  TMPDIR_SAFE="${TMPDIR_EXPR}"
  if [ ! -d "$TMPDIR_SAFE" ] || [ ! -w "$TMPDIR_SAFE" ] || [ ! -x "$TMPDIR_SAFE" ]; then
    TMPDIR_SAFE="$PWD"
  fi
  tm_ms="$EXT_LEASE_TIMEOUT_MS"
  if [ -z "$tm_ms" ] || [ "$tm_ms" -le 0 ] 2>/dev/null; then
    tm_ms=1500
  fi
  tm_s=$(( (tm_ms + 999) / 1000 ))
  if command -v curl >/dev/null 2>&1; then
    LEASE_TOOL="curl"
    tmp="$(mktemp "$TMPDIR_SAFE/.seal-lease-XXXXXX")"
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
    tmp="$(mktemp "$TMPDIR_SAFE/.seal-lease-XXXXXX")"
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
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel inspect failed (status=${res.status})${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
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
