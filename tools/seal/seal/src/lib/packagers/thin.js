"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const { spawnSyncSafe } = require("../spawn");
const { ensureDir, fileExists } = require("../fsextra");
const { info, warn } = require("../ui");

const THIN_VERSION = 1;
const THIN_FOOTER_LEN = 32;
const THIN_AIO_FOOTER_LEN = 64;
const THIN_INDEX_ENTRY_LEN = 24;
const THIN_CHUNK_SIZE = 64 * 1024;
const CODEC_BIN_MAGIC = Buffer.from("SLCB");
const CODEC_BIN_VERSION = 1;
const CODEC_BIN_HASH_LEN = 32;
const CODEC_BIN_LEN = 4 + 1 + 1 + 2 + CODEC_BIN_HASH_LEN;
const THIN_LEVELS = {
  low: { chunkSize: 2 * 1024 * 1024, zstdLevel: 1 },
  high: { chunkSize: 64 * 1024, zstdLevel: 3 },
};

const DEFAULT_CODEC_CACHE_LIMIT = 2;

const DEFAULT_LIMITS = {
  maxChunks: 1_000_000,
  maxChunkRaw: 8 * 1024 * 1024,
  maxIndexBytes: 128 * 1024 * 1024,
  maxTotalRaw: 4 * 1024 * 1024 * 1024,
};

function randomU32() {
  return crypto.randomBytes(4).readUInt32LE(0);
}

function normalizeTargetName(name) {
  return String(name || "default").replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function getCodecCachePath(projectRoot, targetName) {
  const safe = normalizeTargetName(targetName);
  return path.join(projectRoot, "seal-thin", "cache", safe, "codec_state.json");
}

function getCodecCacheLimit() {
  const raw = process.env.SEAL_THIN_CACHE_LIMIT || process.env.SEAL_THIN_CACHE_MAX;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 0) return n;
  return DEFAULT_CODEC_CACHE_LIMIT;
}

function pruneCodecCache(projectRoot, keepTargetName) {
  const limit = getCodecCacheLimit();
  if (!projectRoot || limit <= 0) return;
  const cacheRoot = path.join(projectRoot, "seal-thin", "cache");
  if (!fileExists(cacheRoot)) return;

  let entries = [];
  try {
    entries = fs.readdirSync(cacheRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return;
  }

  const items = entries.map((d) => {
    const dirPath = path.join(cacheRoot, d.name);
    const statePath = path.join(dirPath, "codec_state.json");
    if (!fileExists(statePath)) return null;
    try {
      const stat = fs.statSync(statePath);
      return { name: d.name, dirPath, mtime: stat.mtimeMs };
    } catch {
      return null;
    }
  }).filter(Boolean);

  if (items.length <= limit) return;

  items.sort((a, b) => b.mtime - a.mtime);
  const keep = new Set();
  const keepSafe = keepTargetName ? normalizeTargetName(keepTargetName) : null;
  if (keepSafe) keep.add(keepSafe);

  for (const item of items) {
    if (keep.has(item.name)) continue;
    if (keep.size >= limit) continue;
    keep.add(item.name);
  }

  const removed = [];
  for (const item of items) {
    if (!keep.has(item.name)) {
      try {
        fs.rmSync(item.dirPath, { recursive: true, force: true });
        removed.push(item.name);
      } catch {
        // best-effort cleanup
      }
    }
  }

  if (removed.length > 0) {
    warn(
      `Thin cache pruned: kept=${keep.size}/${items.length} limit=${limit}. ` +
      "This often happens when switching targets/levels/builders. " +
      "Increase SEAL_THIN_CACHE_LIMIT to keep more."
    );
  }
}

function loadCodecState(projectRoot, targetName) {
  if (!projectRoot) return null;
  const p = getCodecCachePath(projectRoot, targetName);
  if (!fileExists(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
    const fields = ["codecId", "seed", "rot", "add", "indexNonce", "footerNonce", "aioFooterNonce"];
    for (const f of fields) {
      if (typeof raw[f] !== "number" || !Number.isFinite(raw[f])) return null;
    }
    if (raw.rot < 1 || raw.rot > 7) return null;
    if (raw.add < 1 || raw.add > 255) return null;
    return raw;
  } catch {
    return null;
  }
}

function saveCodecState(projectRoot, targetName, state) {
  if (!projectRoot) return;
  const p = getCodecCachePath(projectRoot, targetName);
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(state, null, 2) + "\n", "utf-8");
  pruneCodecCache(projectRoot, targetName);
}

function writeCodecBin(dir, codecState) {
  const meta = {
    version: THIN_VERSION,
    codecId: codecState.codecId,
    seed: codecState.seed,
    rot: codecState.rot,
    add: codecState.add,
    indexNonce: codecState.indexNonce,
    footerNonce: codecState.footerNonce,
    aioFooterNonce: codecState.aioFooterNonce,
  };
  const metaJson = JSON.stringify(meta);
  const codecHash = crypto.createHash("sha256").update(metaJson).digest();
  const buf = Buffer.alloc(CODEC_BIN_LEN);
  CODEC_BIN_MAGIC.copy(buf, 0);
  buf[4] = CODEC_BIN_VERSION;
  buf[5] = CODEC_BIN_HASH_LEN;
  buf.writeUInt16BE(0, 6);
  codecHash.copy(buf, 8);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "c"), buf);
  return codecHash.toString("hex");
}

function hasCommand(cmd) {
  const res = spawnSyncSafe("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`], { stdio: "pipe" });
  return !!res.ok;
}

function spawnBinary(cmd, args, input, opts = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : undefined;
  const maxBuffer = Number.isFinite(opts.maxBuffer) && opts.maxBuffer > 0 ? opts.maxBuffer : 1024 * 1024 * 200;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutLen = 0;
    let stderrLen = 0;
    let finished = false;
    let timeout = null;
    let killTimer = null;
    let errObj = null;
    let timedOut = false;

    if (timeoutMs) {
      timeout = setTimeout(() => {
        timedOut = true;
        errObj = Object.assign(new Error("ETIMEDOUT"), { code: "ETIMEDOUT" });
        child.kill("SIGKILL");
        killTimer = setTimeout(() => {
          if (finished) return;
          finished = true;
          stdoutLen = outLen.value;
          stderrLen = errLen.value;
          resolve({
            ok: false,
            status: null,
            signal: "SIGKILL",
            stdout: stdoutChunks.length ? Buffer.concat(stdoutChunks, stdoutLen) : null,
            stderr: stderrChunks.length ? Buffer.concat(stderrChunks, stderrLen) : null,
            error: errObj,
          });
        }, 2000);
      }, timeoutMs);
    }

    const onData = (chunks, lenRef, chunk) => {
      chunks.push(chunk);
      lenRef.value += chunk.length;
      if (lenRef.value > maxBuffer && !timedOut) {
        errObj = Object.assign(new Error("EMAXBUFFER"), { code: "EMAXBUFFER" });
        child.kill("SIGKILL");
      }
    };

    const outLen = { value: 0 };
    const errLen = { value: 0 };

    child.stdout.on("data", (c) => onData(stdoutChunks, outLen, c));
    child.stderr.on("data", (c) => onData(stderrChunks, errLen, c));

    child.on("error", (err) => {
      if (finished) return;
      errObj = err;
      finished = true;
      if (timeout) clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      resolve({
        ok: false,
        status: null,
        signal: null,
        stdout: stdoutChunks.length ? Buffer.concat(stdoutChunks, stdoutLen) : null,
        stderr: stderrChunks.length ? Buffer.concat(stderrChunks, stderrLen) : null,
        error: errObj,
      });
    });

    child.on("close", (code, signal) => {
      if (finished) return;
      finished = true;
      if (timeout) clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      stdoutLen = outLen.value;
      stderrLen = errLen.value;
      resolve({
        ok: code === 0 && !timedOut && !errObj,
        status: code,
        signal,
        stdout: stdoutChunks.length ? Buffer.concat(stdoutChunks, stdoutLen) : null,
        stderr: stderrChunks.length ? Buffer.concat(stderrChunks, stderrLen) : null,
        error: errObj,
      });
    });

    child.stdin.on("error", () => {});
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

async function zstdCompress(buf) {
  const args = ["-q", "-c", "-"];
  if (typeof zstdCompress.level === "number") {
    args.unshift(`-${zstdCompress.level}`);
  }
  const res = await spawnBinary("zstd", args, buf, { timeoutMs: zstdCompress.timeoutMs });
  if (!res.ok || !Buffer.isBuffer(res.stdout)) {
    const timeoutMs = zstdCompress.timeoutMs;
    if (timeoutMs && (res.error && res.error.code === "ETIMEDOUT")) {
      throw new Error(`zstd compress timed out after ${timeoutMs}ms`);
    }
    if (timeoutMs && res.signal === "SIGKILL") {
      throw new Error(`zstd compress timed out after ${timeoutMs}ms`);
    }
    if (res.error && String(res.error).toLowerCase().includes("timed out")) {
      const ms = zstdCompress.timeoutMs ? `${zstdCompress.timeoutMs}ms` : "timeout";
      throw new Error(`zstd compress timed out after ${ms}`);
    }
    const stderrMsg = res.stderr ? res.stderr.toString("utf-8").trim() : "";
    const errMsg = res.error ? (res.error.message || String(res.error)) : "";
    const statusMsg = res.status !== null && res.status !== undefined ? `status=${res.status}` : "";
    const signalMsg = res.signal ? `signal=${res.signal}` : "";
    const msg = [errMsg, stderrMsg, statusMsg, signalMsg].filter(Boolean).join("; ") || "zstd failed";
    throw new Error(`zstd compress failed: ${msg}`);
  }
  return res.stdout;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function xorshift32(state) {
  let x = state >>> 0;
  x ^= (x << 13) >>> 0;
  x ^= (x >>> 17) >>> 0;
  x ^= (x << 5) >>> 0;
  return x >>> 0;
}

function rotl8(value, rot) {
  return ((value << rot) | (value >>> (8 - rot))) & 0xff;
}

function encodeBytes(buf, seed, rot, add) {
  const out = Buffer.allocUnsafe(buf.length);
  let s = seed >>> 0;
  for (let i = 0; i < buf.length; i++) {
    s = xorshift32(s);
    const k = s & 0xff;
    let x = buf[i] ^ k;
    x = rotl8(x, rot);
    x = (x + add) & 0xff;
    x = ((x & 0x0f) << 4) | ((x & 0xf0) >> 4);
    out[i] = x;
  }
  return out;
}

function writeU64LE(buf, offset, value) {
  buf.writeBigUInt64LE(BigInt(value), offset);
}

function normalizeThinLevel(level) {
  const lvl = String(level || "low").toLowerCase();
  if (!THIN_LEVELS[lvl]) {
    throw new Error(`Unknown thinLevel: ${lvl}`);
  }
  return lvl;
}

function resolveChunkSize(level, chunkSizeOpt) {
  const raw = chunkSizeOpt ?? process.env.SEAL_THIN_CHUNK_SIZE;
  if (raw !== undefined && raw !== null && raw !== "") {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid thinChunkSize: ${raw}`);
    }
    const size = Math.floor(value);
    if (size > DEFAULT_LIMITS.maxChunkRaw) {
      throw new Error(`thinChunkSize too large (${size} > ${DEFAULT_LIMITS.maxChunkRaw})`);
    }
    return size;
  }
  return THIN_LEVELS[level].chunkSize || THIN_CHUNK_SIZE;
}

function resolveZstdLevel(level, zstdLevelOpt) {
  const raw = zstdLevelOpt ?? process.env.SEAL_THIN_ZSTD_LEVEL;
  if (raw !== undefined && raw !== null && raw !== "") {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 1 || value > 19) {
      throw new Error(`Invalid thinZstdLevel: ${raw} (expected 1..19)`);
    }
    return Math.floor(value);
  }
  return THIN_LEVELS[level].zstdLevel;
}

function resolveZstdTimeout(timeoutOpt) {
  const raw = timeoutOpt ?? process.env.SEAL_THIN_ZSTD_TIMEOUT_MS;
  if (raw !== undefined && raw !== null && raw !== "") {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid thinZstdTimeoutMs: ${raw} (expected >= 0)`);
    }
    return Math.floor(value);
  }
  return 300000;
}

async function encodeContainer(rawBuf, codecState, chunkSize, zstdLevel, opts = {}) {
  if (!rawBuf || rawBuf.length === 0) {
    throw new Error("raw buffer is empty");
  }
  const progress = opts.progress;
  let lastLog = 0;
  const chunks = [];
  const entries = [];
  let rawTotal = 0;
  let offset = 0;

  const size = chunkSize || THIN_CHUNK_SIZE;
  const chunkCount = Math.ceil(rawBuf.length / size) || 1;
  if (chunkCount > DEFAULT_LIMITS.maxChunks) {
    throw new Error(`Too many chunks (${chunkCount} > ${DEFAULT_LIMITS.maxChunks})`);
  }

  for (let i = 0; i < chunkCount; i++) {
    const start = i * size;
    const end = Math.min(start + size, rawBuf.length);
    const rawChunk = rawBuf.subarray(start, end);
    rawTotal += rawChunk.length;

    if (rawChunk.length > DEFAULT_LIMITS.maxChunkRaw) {
      throw new Error(`Chunk too large (${rawChunk.length} > ${DEFAULT_LIMITS.maxChunkRaw})`);
    }

    const nonce = randomU32();
    zstdCompress.level = zstdLevel;
    const comp = await zstdCompress(rawChunk);
    const seed = (codecState.seed ^ i ^ nonce) >>> 0;
    const masked = encodeBytes(comp, seed, codecState.rot, codecState.add);

    const entry = {
      offset,
      compLen: masked.length,
      rawLen: rawChunk.length,
      crc32: crc32(rawChunk),
      nonce,
    };

    chunks.push(masked);
    entries.push(entry);
    offset += masked.length;

    if (progress && chunkCount > 1) {
      const now = Date.now();
      if (now - lastLog > 2000) {
        progress(i + 1, chunkCount);
        lastLog = now;
      }
    }
  }
  if (progress && chunkCount > 1) {
    progress(chunkCount, chunkCount, true);
  }

  const indexLen = entries.length * THIN_INDEX_ENTRY_LEN;
  if (indexLen > DEFAULT_LIMITS.maxIndexBytes) {
    throw new Error(`Index too large (${indexLen} > ${DEFAULT_LIMITS.maxIndexBytes})`);
  }

  const indexBuf = Buffer.allocUnsafe(indexLen);
  entries.forEach((entry, idx) => {
    const off = idx * THIN_INDEX_ENTRY_LEN;
    writeU64LE(indexBuf, off, entry.offset);
    indexBuf.writeUInt32LE(entry.compLen >>> 0, off + 8);
    indexBuf.writeUInt32LE(entry.rawLen >>> 0, off + 12);
    indexBuf.writeUInt32LE(entry.crc32 >>> 0, off + 16);
    indexBuf.writeUInt32LE(entry.nonce >>> 0, off + 20);
  });

  const footer = Buffer.allocUnsafe(THIN_FOOTER_LEN);
  footer.writeUInt32LE(THIN_VERSION, 0);
  footer.writeUInt32LE(codecState.codecId >>> 0, 4);
  footer.writeUInt32LE(indexLen >>> 0, 8);
  footer.writeUInt32LE(entries.length >>> 0, 12);
  writeU64LE(footer, 16, rawTotal);
  writeU64LE(footer, 24, 0);

  const indexSeed = (codecState.seed ^ codecState.indexNonce) >>> 0;
  const footerSeed = (codecState.seed ^ codecState.footerNonce) >>> 0;

  const maskedIndex = encodeBytes(indexBuf, indexSeed, codecState.rot, codecState.add);
  const maskedFooter = encodeBytes(footer, footerSeed, codecState.rot, codecState.add);

  return Buffer.concat([...chunks, maskedIndex, maskedFooter]);
}

function buildAioFooter({ codecState, runtimeOff, runtimeLen, payloadOff, payloadLen }) {
  const footer = Buffer.allocUnsafe(THIN_AIO_FOOTER_LEN);
  footer.writeUInt32LE(THIN_VERSION, 0);
  footer.writeUInt32LE(codecState.codecId >>> 0, 4);
  writeU64LE(footer, 8, runtimeOff);
  writeU64LE(footer, 16, runtimeLen);
  writeU64LE(footer, 24, payloadOff);
  writeU64LE(footer, 32, payloadLen);
  writeU64LE(footer, 40, 0);
  writeU64LE(footer, 48, 0);
  writeU64LE(footer, 56, 0);

  const footerSeed = (codecState.seed ^ codecState.aioFooterNonce) >>> 0;
  return encodeBytes(footer, footerSeed, codecState.rot, codecState.add);
}

function resolveCc() {
  const envCc = process.env.CC;
  if (envCc) return envCc;
  if (hasCommand("cc")) return "cc";
  if (hasCommand("gcc")) return "gcc";
  return null;
}

function getZstdFlags() {
  if (!hasCommand("pkg-config")) return [];
  const res = spawnSyncSafe("pkg-config", ["--cflags", "--libs", "libzstd"], { stdio: "pipe" });
  if (!res.ok) return [];
  const out = `${res.stdout} ${res.stderr}`.trim();
  return out ? out.split(/\s+/).filter(Boolean) : [];
}

function renderLauncherSource(codecState, limits, allowBootstrap) {
  const bootstrapJs = `"use strict";
const fs = require("fs");
const path = require("path");
const Module = require("module");

const fd = Number(process.env.SEAL_BUNDLE_FD || 4);
const entry = process.env.SEAL_VIRTUAL_ENTRY || path.join(process.cwd(), "app.bundle.cjs");

const code = fs.readFileSync(fd, "utf8");
process.argv[1] = entry;

const m = new Module(entry, module);
m.filename = entry;
m.paths = Module._nodeModulePaths(path.dirname(entry));
m._compile(code, entry);
`;

  const jsLiteral = bootstrapJs
    .split("\n")
    .map((line) => line.replace(/\\/g, "\\\\").replace(/"/g, '\\"'))
    .map((line) => `"${line}\\n"`)
    .join("\n");

  return `#include <errno.h>
#include <dirent.h>
#include <fcntl.h>
#include <limits.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <zstd.h>

extern char **environ;

#ifndef MFD_CLOEXEC
#define MFD_CLOEXEC 0x0001
#endif
#ifndef MFD_ALLOW_SEALING
#define MFD_ALLOW_SEALING 0x0002
#endif
#ifndef F_DUPFD_CLOEXEC
#define F_DUPFD_CLOEXEC F_DUPFD
#endif

#define THIN_VERSION ${THIN_VERSION}
#define THIN_FOOTER_LEN ${THIN_FOOTER_LEN}
#define THIN_AIO_FOOTER_LEN ${THIN_AIO_FOOTER_LEN}
#define THIN_INDEX_ENTRY_LEN ${THIN_INDEX_ENTRY_LEN}

#define THIN_CODEC_ID ${codecState.codecId}u
#define THIN_CODEC_SEED ${codecState.seed}u
#define THIN_CODEC_ROT ${codecState.rot}u
#define THIN_CODEC_ADD ${codecState.add}u
#define THIN_INDEX_NONCE ${codecState.indexNonce}u
#define THIN_FOOTER_NONCE ${codecState.footerNonce}u
#define THIN_AIO_FOOTER_NONCE ${codecState.aioFooterNonce}u
#define THIN_BOOTSTRAP_ALLOWED ${allowBootstrap ? 1 : 0}

#define MAX_CHUNKS ${limits.maxChunks}u
#define MAX_CHUNK_RAW ${limits.maxChunkRaw}u
#define MAX_INDEX_BYTES ${limits.maxIndexBytes}u
#define MAX_TOTAL_RAW ${limits.maxTotalRaw}ull

static const char *BOOTSTRAP_JS =
${jsLiteral}
;

static uint32_t crc_table[256];
static int crc_inited = 0;

static void crc_init(void) {
  if (crc_inited) return;
  for (uint32_t i = 0; i < 256; i++) {
    uint32_t c = i;
    for (int k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320u ^ (c >> 1);
      else c = c >> 1;
    }
    crc_table[i] = c;
  }
  crc_inited = 1;
}

static uint32_t crc32_buf(const uint8_t *buf, size_t len) {
  crc_init();
  uint32_t crc = 0xffffffffu;
  for (size_t i = 0; i < len; i++) {
    crc = crc_table[(crc ^ buf[i]) & 0xff] ^ (crc >> 8);
  }
  return crc ^ 0xffffffffu;
}

static inline uint32_t xorshift32(uint32_t x) {
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return x;
}

static inline uint8_t rotl8(uint8_t x, uint8_t r) {
  return (uint8_t)((x << r) | (x >> (8 - r)));
}

static inline uint8_t rotr8(uint8_t x, uint8_t r) {
  return (uint8_t)((x >> r) | (x << (8 - r)));
}

static inline uint8_t swap_nibbles(uint8_t x) {
  return (uint8_t)((x << 4) | (x >> 4));
}

static void decode_bytes(uint8_t *buf, size_t len, uint32_t seed) {
  uint32_t s = seed;
  for (size_t i = 0; i < len; i++) {
    s = xorshift32(s);
    uint8_t k = (uint8_t)(s & 0xff);
    uint8_t x = buf[i];
    x = swap_nibbles(x);
    x = (uint8_t)(x - THIN_CODEC_ADD);
    x = rotr8(x, THIN_CODEC_ROT);
    x ^= k;
    buf[i] = x;
  }
}

static inline uint32_t read_u32_le(const uint8_t *p) {
  return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static inline uint64_t read_u64_le(const uint8_t *p) {
  return (uint64_t)p[0]
    | ((uint64_t)p[1] << 8)
    | ((uint64_t)p[2] << 16)
    | ((uint64_t)p[3] << 24)
    | ((uint64_t)p[4] << 32)
    | ((uint64_t)p[5] << 40)
    | ((uint64_t)p[6] << 48)
    | ((uint64_t)p[7] << 56);
}

static int read_exact(int fd, void *buf, size_t len, off_t off) {
  uint8_t *p = (uint8_t *)buf;
  size_t got = 0;
  while (got < len) {
    ssize_t r = pread(fd, p + got, len - got, off + (off_t)got);
    if (r <= 0) return -1;
    got += (size_t)r;
  }
  return 0;
}

static int get_file_size(int fd, uint64_t *out) {
  struct stat st;
  if (fstat(fd, &st) != 0) return -1;
  if (st.st_size < 0) return -1;
  *out = (uint64_t)st.st_size;
  return 0;
}

static int write_all(int fd, const uint8_t *buf, size_t len) {
  size_t done = 0;
  while (done < len) {
    ssize_t w = write(fd, buf + done, len - done);
    if (w <= 0) return -1;
    done += (size_t)w;
  }
  return 0;
}

static int make_memfd(const char *name) {
  int fd = -1;
#ifdef SYS_memfd_create
  fd = (int)syscall(SYS_memfd_create, name, MFD_CLOEXEC | MFD_ALLOW_SEALING);
  if (fd < 0 && errno == EINVAL) {
    fd = (int)syscall(SYS_memfd_create, name, MFD_CLOEXEC);
  }
  if (fd >= 0) return fd;
#endif
  char tmp[64];
  snprintf(tmp, sizeof(tmp), "/tmp/.seal-thin-%d-XXXXXX", getpid());
  fd = mkstemp(tmp);
  if (fd >= 0) {
    unlink(tmp);
  }
  return fd;
}

static int set_no_cloexec(int fd) {
  int flags = fcntl(fd, F_GETFD);
  if (flags < 0) return -1;
  return fcntl(fd, F_SETFD, flags & ~FD_CLOEXEC);
}

static int set_cloexec(int fd) {
  int flags = fcntl(fd, F_GETFD);
  if (flags < 0) return -1;
  return fcntl(fd, F_SETFD, flags | FD_CLOEXEC);
}

static int ensure_fd_min(int fd, int min_fd) {
  if (fd < 0) return -1;
  if (fd >= min_fd) return fd;
  int dupfd = fcntl(fd, F_DUPFD_CLOEXEC, min_fd);
  if (dupfd < 0) return -1;
  close(fd);
  return dupfd;
}

static int move_fd(int fd, int target_fd) {
  if (fd < 0) return -1;
  if (fd == target_fd) return fd;
  int dupfd = dup2(fd, target_fd);
  if (dupfd < 0) return -1;
  close(fd);
  return dupfd;
}

static void seal_memfd(int fd) {
#ifdef F_ADD_SEALS
  int seals = F_SEAL_SEAL | F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE;
  fcntl(fd, F_ADD_SEALS, seals);
#else
  (void)fd;
#endif
}

static int open_regular(const char *path) {
  int flags = O_RDONLY | O_CLOEXEC;
#ifdef O_NOFOLLOW
  flags |= O_NOFOLLOW;
#endif
  int fd = open(path, flags);
  if (fd < 0) return -1;
  struct stat st;
  if (fstat(fd, &st) != 0 || !S_ISREG(st.st_mode)) {
    close(fd);
    errno = EINVAL;
    return -1;
  }
  return fd;
}

static int dir_exists(const char *path) {
  struct stat st;
  return stat(path, &st) == 0 && S_ISDIR(st.st_mode);
}

static void close_extra_fds(int keep_a, int keep_b) {
#ifdef SYS_close_range
  if (keep_a <= 4 && keep_b <= 4) {
    if (syscall(SYS_close_range, 5, ~0U, 0) == 0) return;
  }
#endif
  DIR *dir = opendir("/proc/self/fd");
  if (!dir) return;
  int dir_fd = dirfd(dir);
  struct dirent *ent;
  while ((ent = readdir(dir)) != NULL) {
    if (ent->d_name[0] == '.') continue;
    int fd = atoi(ent->d_name);
    if (fd < 0) continue;
    if (fd == dir_fd || fd == keep_a || fd == keep_b) continue;
    if (fd <= 4) continue;
    close(fd);
  }
  closedir(dir);
}

static int decode_container(int src_fd, uint64_t off, uint64_t len, int out_fd) {
  if (len < THIN_FOOTER_LEN) return -2;
  uint8_t footer_enc[THIN_FOOTER_LEN];
  if (read_exact(src_fd, footer_enc, THIN_FOOTER_LEN, (off_t)(off + len - THIN_FOOTER_LEN)) != 0) return -3;

  uint32_t footer_seed = THIN_CODEC_SEED ^ THIN_FOOTER_NONCE;
  decode_bytes(footer_enc, THIN_FOOTER_LEN, footer_seed);

  uint32_t version = read_u32_le(footer_enc + 0);
  uint32_t codec_id = read_u32_le(footer_enc + 4);
  uint32_t index_len = read_u32_le(footer_enc + 8);
  uint32_t chunk_count = read_u32_le(footer_enc + 12);
  uint64_t raw_total = read_u64_le(footer_enc + 16);

  if (version != THIN_VERSION) return -4;
  if (codec_id != THIN_CODEC_ID) return -5;
  if (chunk_count == 0 || chunk_count > MAX_CHUNKS) return -6;
  if (index_len == 0 || index_len > MAX_INDEX_BYTES) return -7;
  if (raw_total > MAX_TOTAL_RAW) return -8;
  if (index_len != (uint32_t)(chunk_count * THIN_INDEX_ENTRY_LEN)) return -9;

  uint64_t index_off = off + len - THIN_FOOTER_LEN - index_len;
  if (index_off < off) return -10;

  uint8_t *index_buf = (uint8_t *)malloc(index_len);
  if (!index_buf) return -11;
  if (read_exact(src_fd, index_buf, index_len, (off_t)index_off) != 0) {
    free(index_buf);
    return -12;
  }

  uint32_t index_seed = THIN_CODEC_SEED ^ THIN_INDEX_NONCE;
  decode_bytes(index_buf, index_len, index_seed);

  uint64_t raw_written = 0;
  for (uint32_t i = 0; i < chunk_count; i++) {
    size_t base = (size_t)i * THIN_INDEX_ENTRY_LEN;
    if (base + THIN_INDEX_ENTRY_LEN > index_len) {
      free(index_buf);
      return -13;
    }

    uint64_t chunk_off = read_u64_le(index_buf + base + 0);
    uint32_t comp_len = read_u32_le(index_buf + base + 8);
    uint32_t raw_len = read_u32_le(index_buf + base + 12);
    uint32_t crc = read_u32_le(index_buf + base + 16);
    uint32_t nonce = read_u32_le(index_buf + base + 20);

    if (raw_len == 0 || raw_len > MAX_CHUNK_RAW) {
      free(index_buf);
      return -14;
    }

    if (comp_len == 0) {
      free(index_buf);
      return -15;
    }

    if (chunk_off + comp_len > (len - THIN_FOOTER_LEN - index_len)) {
      free(index_buf);
      return -16;
    }

    uint8_t *comp_buf = (uint8_t *)malloc(comp_len);
    uint8_t *raw_buf = (uint8_t *)malloc(raw_len);
    if (!comp_buf || !raw_buf) {
      free(comp_buf);
      free(raw_buf);
      free(index_buf);
      return -17;
    }

    if (read_exact(src_fd, comp_buf, comp_len, (off_t)(off + chunk_off)) != 0) {
      free(comp_buf);
      free(raw_buf);
      free(index_buf);
      return -18;
    }

    uint32_t seed = THIN_CODEC_SEED ^ (uint32_t)i ^ nonce;
    decode_bytes(comp_buf, comp_len, seed);

    size_t dsize = ZSTD_decompress(raw_buf, raw_len, comp_buf, comp_len);
    free(comp_buf);
    if (ZSTD_isError(dsize) || dsize != raw_len) {
      free(raw_buf);
      free(index_buf);
      return -19;
    }

    uint32_t got_crc = crc32_buf(raw_buf, raw_len);
    if (got_crc != crc) {
      free(raw_buf);
      free(index_buf);
      return -20;
    }

    if (write_all(out_fd, raw_buf, raw_len) != 0) {
      free(raw_buf);
      free(index_buf);
      return -21;
    }
    free(raw_buf);
    raw_written += raw_len;
  }

  free(index_buf);
  if (raw_written != raw_total) return -22;
  return 0;
}

static int resolve_root(char *out, size_t out_len) {
  char self_path[PATH_MAX + 1];
  ssize_t len = readlink("/proc/self/exe", self_path, PATH_MAX);
  if (len <= 0) return -1;
  self_path[len] = 0;

  char *slash = strrchr(self_path, '/');
  if (!slash) return -1;
  char *fname = slash + 1;
  *slash = 0;

  if (strcmp(fname, "a") == 0) {
    char *parent = strrchr(self_path, '/');
    if (parent && strcmp(parent + 1, "b") == 0) {
      *parent = 0;
    }
  }

  if (snprintf(out, out_len, "%s", self_path) < 0) return -1;
  return 0;
}

static int set_virtual_entry(const char *root) {
  char entry[PATH_MAX + 64];
  snprintf(entry, sizeof(entry), "%s/app.bundle.cjs", root);
  return setenv("SEAL_VIRTUAL_ENTRY", entry, 1);
}

static char *dup_env_value(const char *name) {
  const char *val = getenv(name);
  if (!val) return NULL;
  size_t len = strlen(val);
  char *copy = (char *)malloc(len + 1);
  if (!copy) return NULL;
  memcpy(copy, val, len + 1);
  return copy;
}

static void set_env_paths(const char *root) {
  char buf[PATH_MAX + 64];
  setenv("SEAL_APP_DIR", root, 1);
  snprintf(buf, sizeof(buf), "%s/shared", root);
  setenv("SEAL_SHARED_DIR", buf, 1);
  snprintf(buf, sizeof(buf), "%s/var", root);
  if (dir_exists(buf)) setenv("SEAL_VAR_DIR", buf, 1);
  snprintf(buf, sizeof(buf), "%s/data", root);
  if (dir_exists(buf)) setenv("SEAL_DATA_DIR", buf, 1);
  setenv("SEAL_BUNDLE_FD", "4", 1);
  set_virtual_entry(root);
}

static void harden_env(void) {
  const char *strict = getenv("SEAL_THIN_ENV_STRICT");
  int strict_mode = (strict && strcmp(strict, "1") == 0);

  const char *existing_path = getenv("PATH");

  if (strict_mode) {
    char *lang = dup_env_value("LANG");
    char *lc_all = dup_env_value("LC_ALL");
    char *lc_ctype = dup_env_value("LC_CTYPE");
    char *tz = dup_env_value("TZ");
    char *term = dup_env_value("TERM");
    char *home = dup_env_value("HOME");
    char *user = dup_env_value("USER");
    char *logname = dup_env_value("LOGNAME");
    char *ssl_file = dup_env_value("SSL_CERT_FILE");
    char *ssl_dir = dup_env_value("SSL_CERT_DIR");

    if (clearenv() != 0) {
      // If clearenv fails, fall back to a denylist below.
      strict_mode = 0;
    } else {
      if (lang) setenv("LANG", lang, 1);
      if (lc_all) setenv("LC_ALL", lc_all, 1);
      if (lc_ctype) setenv("LC_CTYPE", lc_ctype, 1);
      if (tz) setenv("TZ", tz, 1);
      if (term) setenv("TERM", term, 1);
      if (home) setenv("HOME", home, 1);
      if (user) setenv("USER", user, 1);
      if (logname) setenv("LOGNAME", logname, 1);
      if (ssl_file) setenv("SSL_CERT_FILE", ssl_file, 1);
      if (ssl_dir) setenv("SSL_CERT_DIR", ssl_dir, 1);
      setenv("PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", 1);
    }

    free(lang);
    free(lc_all);
    free(lc_ctype);
    free(tz);
    free(term);
    free(home);
    free(user);
    free(logname);
    free(ssl_file);
    free(ssl_dir);
  }

  if (!strict_mode) {
    const char *deny[] = {
      "LD_PRELOAD",
      "LD_LIBRARY_PATH",
      "LD_AUDIT",
      "LD_DEBUG",
      "LD_DEBUG_OUTPUT",
      "LD_PROFILE",
      "LD_SHOW_AUXV",
      "LD_USE_LOAD_BIAS",
      "LD_ORIGIN_PATH",
      "LD_ASSUME_KERNEL",
      "LD_DYNAMIC_WEAK",
      "NODE_OPTIONS",
      "NODE_PATH",
      "NODE_V8_COVERAGE",
      "NODE_DEBUG",
      "NODE_REPL_HISTORY",
      "NODE_DISABLE_COLORS",
      "GCONV_PATH",
      "LOCPATH",
      "MALLOC_TRACE",
      "MALLOC_CHECK_",
      NULL
    };
    for (int i = 0; deny[i]; i++) {
      unsetenv(deny[i]);
    }
    if (!existing_path || existing_path[0] == 0) {
      setenv("PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", 1);
    }
  }
}

static void harden_limits(void) {
  struct rlimit lim;
  lim.rlim_cur = 0;
  lim.rlim_max = 0;
  setrlimit(RLIMIT_CORE, &lim);
  prctl(PR_SET_DUMPABLE, 0, 0, 0, 0);
#ifdef PR_SET_NO_NEW_PRIVS
  prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);
#endif
}

int main(int argc, char **argv) {
  (void)argc;
  (void)argv;

  char root[PATH_MAX + 1];
  if (resolve_root(root, sizeof(root)) != 0) {
    if (!getcwd(root, sizeof(root))) {
      snprintf(root, sizeof(root), ".");
    }
  }

  int self_fd = open("/proc/self/exe", O_RDONLY | O_CLOEXEC);
  if (self_fd < 0) {
    fprintf(stderr, "[thin] open self failed\\n");
    return 20;
  }

  off_t end = lseek(self_fd, 0, SEEK_END);
  if (end < 0) {
    fprintf(stderr, "[thin] seek failed\\n");
    return 21;
  }

  int aio_ok = 0;
  uint64_t rt_off = 0;
  uint64_t rt_len = 0;
  uint64_t pl_off = 0;
  uint64_t pl_len = 0;

  if (end >= (off_t)THIN_AIO_FOOTER_LEN) {
    uint8_t aio_footer[THIN_AIO_FOOTER_LEN];
    if (read_exact(self_fd, aio_footer, THIN_AIO_FOOTER_LEN, end - THIN_AIO_FOOTER_LEN) == 0) {
      uint32_t aio_seed = THIN_CODEC_SEED ^ THIN_AIO_FOOTER_NONCE;
      decode_bytes(aio_footer, THIN_AIO_FOOTER_LEN, aio_seed);

      uint32_t version = read_u32_le(aio_footer + 0);
      uint32_t codec_id = read_u32_le(aio_footer + 4);
      if (version == THIN_VERSION && codec_id == THIN_CODEC_ID) {
        rt_off = read_u64_le(aio_footer + 8);
        rt_len = read_u64_le(aio_footer + 16);
        pl_off = read_u64_le(aio_footer + 24);
        pl_len = read_u64_le(aio_footer + 32);

        uint64_t data_end = (uint64_t)(end - (off_t)THIN_AIO_FOOTER_LEN);
        if (rt_len > 0 && pl_len > 0
          && rt_off <= data_end && rt_len <= (data_end - rt_off)
          && pl_off <= data_end && pl_len <= (data_end - pl_off)
          && rt_off + rt_len <= pl_off) {
          aio_ok = 1;
        }
      }
    }
  }

  if (!aio_ok && !THIN_BOOTSTRAP_ALLOWED) {
    fprintf(stderr, "[thin] missing AIO footer\\n");
    return 23;
  }

  int rt_fd = self_fd;
  int pl_fd = self_fd;
  int rt_file_fd = -1;
  int pl_file_fd = -1;
  uint64_t rt_src_off = rt_off;
  uint64_t rt_src_len = rt_len;
  uint64_t pl_src_off = pl_off;
  uint64_t pl_src_len = pl_len;

  if (!aio_ok) {
    char rt_path[PATH_MAX + 8];
    char pl_path[PATH_MAX + 8];
    snprintf(rt_path, sizeof(rt_path), "%s/r/rt", root);
    snprintf(pl_path, sizeof(pl_path), "%s/r/pl", root);

    rt_file_fd = open_regular(rt_path);
    if (rt_file_fd < 0) {
      fprintf(stderr, "[thin] runtime missing: %s\\n", rt_path);
      return 10;
    }
    pl_file_fd = open_regular(pl_path);
    if (pl_file_fd < 0) {
      fprintf(stderr, "[thin] payload missing: %s\\n", pl_path);
      return 11;
    }

    if (get_file_size(rt_file_fd, &rt_src_len) != 0 || rt_src_len < THIN_FOOTER_LEN) {
      fprintf(stderr, "[thin] runtime invalid\\n");
      return 12;
    }
    if (get_file_size(pl_file_fd, &pl_src_len) != 0 || pl_src_len < THIN_FOOTER_LEN) {
      fprintf(stderr, "[thin] payload invalid\\n");
      return 13;
    }

    rt_fd = rt_file_fd;
    pl_fd = pl_file_fd;
    rt_src_off = 0;
    pl_src_off = 0;
  }

  int node_fd = make_memfd("seal-node");
  if (node_fd < 0) {
    fprintf(stderr, "[thin] memfd node failed\\n");
    return 27;
  }
  node_fd = ensure_fd_min(node_fd, 10);
  if (node_fd < 0) {
    fprintf(stderr, "[thin] memfd node failed\\n");
    return 27;
  }
  int rc = decode_container(rt_fd, rt_src_off, rt_src_len, node_fd);
  if (rc != 0) {
    fprintf(stderr, "[thin] decode runtime failed (%d)\\n", rc);
    return 28;
  }
  if (lseek(node_fd, 0, SEEK_SET) < 0) return 26;

  int bundle_fd = make_memfd("seal-bundle");
  if (bundle_fd < 0) {
    fprintf(stderr, "[thin] memfd bundle failed\\n");
    return 29;
  }
  bundle_fd = ensure_fd_min(bundle_fd, 10);
  if (bundle_fd < 0) {
    fprintf(stderr, "[thin] memfd bundle failed\\n");
    return 29;
  }
  rc = decode_container(pl_fd, pl_src_off, pl_src_len, bundle_fd);
  if (rc != 0) {
    fprintf(stderr, "[thin] decode payload failed (%d)\\n", rc);
    return 30;
  }
  if (lseek(bundle_fd, 0, SEEK_SET) < 0) return 29;

  seal_memfd(node_fd);
  seal_memfd(bundle_fd);

  if (rt_file_fd >= 0) close(rt_file_fd);
  if (pl_file_fd >= 0) close(pl_file_fd);
  if (self_fd >= 0) close(self_fd);

  node_fd = move_fd(node_fd, 3);
  if (node_fd < 0) {
    fprintf(stderr, "[thin] dup2 failed\\n");
    return 33;
  }
  set_cloexec(node_fd);

  bundle_fd = move_fd(bundle_fd, 4);
  if (bundle_fd < 0) {
    fprintf(stderr, "[thin] dup2 failed\\n");
    return 33;
  }
  if (set_no_cloexec(4) < 0) {
    fprintf(stderr, "[thin] dup2 failed\\n");
    return 33;
  }

  close_extra_fds(node_fd, 4);

  harden_env();
  set_env_paths(root);
  harden_limits();

  char *exec_argv[] = { (char *)"node", (char *)"-e", (char *)BOOTSTRAP_JS, NULL };
  fexecve(node_fd, exec_argv, environ);
  fprintf(stderr, "[thin] exec failed: %s\\n", strerror(errno));
  return 34;
}
`;
}

function buildLauncher(stageDir, codecState, allowBootstrap) {
  const limits = DEFAULT_LIMITS;
  const cc = resolveCc();
  if (!cc) {
    return { ok: false, errorShort: "C compiler not found (cc/gcc)", error: "missing_cc" };
  }

  const cPath = path.join(stageDir, "thin-launcher.c");
  const outPath = path.join(stageDir, "thin-launcher");
  fs.writeFileSync(cPath, renderLauncherSource(codecState, limits, allowBootstrap), "utf-8");

  const zstdFlags = getZstdFlags();
  const args = [
    "-O2",
    "-s",
    "-D_GNU_SOURCE",
    "-D_FORTIFY_SOURCE=2",
    "-fPIE",
    "-fstack-protector-strong",
    "-Wl,-z,relro,-z,now",
    "-Wl,-z,noexecstack",
    "-pie",
    "-o", outPath,
    cPath,
    ...zstdFlags,
    "-lzstd",
  ];

  const res = spawnSyncSafe(cc, args, { stdio: "pipe" });
  if (!res.ok) {
    const msg = (res.stderr || res.stdout || res.error || "compile_failed").trim();
    const lines = msg.split(/\r?\n/).filter(Boolean);
    const short = lines.slice(0, 3).join(" | ") || "compile_failed";
    return { ok: false, errorShort: `launcher build failed: ${short}`, error: msg };
  }

  return { ok: true, path: outPath };
}

async function packThin({ stageDir, releaseDir, appName, obfPath, mode, level, chunkSizeBytes, zstdLevelOverride, zstdTimeoutMs, projectRoot, targetName }) {
  try {
    if (!hasCommand("zstd")) {
      return { ok: false, errorShort: "zstd not found in PATH", error: "missing_zstd" };
    }
    if (!fileExists(obfPath)) {
      return { ok: false, errorShort: "bundle missing", error: obfPath };
    }

    const thinMode = String(mode || "aio").toLowerCase();
    const thinLevel = normalizeThinLevel(level);
    const chunkSize = resolveChunkSize(thinLevel, chunkSizeBytes);
    const zstdLevel = resolveZstdLevel(thinLevel, zstdLevelOverride);
    const zstdTimeout = resolveZstdTimeout(zstdTimeoutMs);
    let codecState = null;
    if (thinMode === "bootstrap") {
      codecState = loadCodecState(projectRoot, targetName);
      if (codecState) {
        info("Thin: using cached codec_state (bootstrap)...");
      } else {
        info("Thin: codec_state missing; generating new (bootstrap)...");
      }
    }

    if (!codecState) {
      codecState = {
        codecId: randomU32(),
        seed: randomU32(),
        rot: (crypto.randomBytes(1)[0] % 7) + 1,
        add: (crypto.randomBytes(1)[0] % 255) + 1,
        indexNonce: randomU32(),
        footerNonce: randomU32(),
        aioFooterNonce: randomU32(),
      };
    }

    const timeoutLabel = zstdTimeout === 0 ? "none" : `${zstdTimeout}ms`;
    info(`Thin: level=${thinLevel} (chunk=${chunkSize}, zstd=${zstdLevel}, timeout=${timeoutLabel})`);
    info(`Thin: encoding runtime (zstd + mask, chunk=${chunkSize})...`);
    const nodeBin = fs.readFileSync(process.execPath);
    const payload = fs.readFileSync(obfPath);

    zstdCompress.timeoutMs = zstdTimeout;
    const runtimeContainer = await encodeContainer(nodeBin, codecState, chunkSize, zstdLevel, {
      progress: (i, total) => info(`Thin: runtime ${i}/${total}`),
    });
    info("Thin: encoding payload (zstd + mask)...");
    const payloadContainer = await encodeContainer(payload, codecState, chunkSize, zstdLevel, {
      progress: (i, total) => info(`Thin: payload ${i}/${total}`),
    });

    ensureDir(stageDir);
    ensureDir(releaseDir);

    const allowBootstrap = thinMode === "bootstrap";
    info("Thin: building launcher (cc + libzstd)...");
    const launcherRes = buildLauncher(stageDir, codecState, allowBootstrap);
    if (!launcherRes.ok) return launcherRes;

    const outBin = path.join(releaseDir, appName);

    if (thinMode === "bootstrap") {
      info("Thin: assembling bootstrap layout...");
      const bDir = path.join(releaseDir, "b");
      ensureDir(bDir);
      const launcherPath = path.join(bDir, "a");
      fs.copyFileSync(launcherRes.path, launcherPath);
      fs.chmodSync(launcherPath, 0o755);

      const rDir = path.join(releaseDir, "r");
      ensureDir(rDir);
      fs.writeFileSync(path.join(rDir, "rt"), runtimeContainer);
      fs.writeFileSync(path.join(rDir, "pl"), payloadContainer);
      writeCodecBin(rDir, codecState);

      const wrapper = `#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/b/a" "$@"
`;
      fs.writeFileSync(outBin, wrapper, "utf-8");
      fs.chmodSync(outBin, 0o755);

      saveCodecState(projectRoot, targetName, codecState);
      return { ok: true, codecId: codecState.codecId };
    }

    info("Thin: assembling AIO binary...");
    fs.copyFileSync(launcherRes.path, outBin);
    fs.chmodSync(outBin, 0o755);

    const launcherSize = fs.statSync(outBin).size;
    const runtimeOff = launcherSize;
    const payloadOff = runtimeOff + runtimeContainer.length;

    const aioFooter = buildAioFooter({
      codecState,
      runtimeOff,
      runtimeLen: runtimeContainer.length,
      payloadOff,
      payloadLen: payloadContainer.length,
    });

    fs.appendFileSync(outBin, runtimeContainer);
    fs.appendFileSync(outBin, payloadContainer);
    fs.appendFileSync(outBin, aioFooter);
    writeCodecBin(releaseDir, codecState);

    return { ok: true, codecId: codecState.codecId };
  } catch (e) {
    return { ok: false, errorShort: e && e.message ? e.message : String(e), error: e && e.stack ? e.stack : String(e) };
  }
}

module.exports = { packThin };
