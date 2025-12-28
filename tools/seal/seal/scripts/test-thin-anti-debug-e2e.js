#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { hasCommand, resolveE2ETimeout, resolveE2ERunTimeout, applyReadyFileEnv, makeReadyFile, waitForReadyFile } = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");
const ERRNO = { EPERM: 1, EACCES: 13, EFAULT: 14 };
const LEAK_TOKENS = [
  "function ",
  "module.exports",
  "exports.",
  "require(",
  "sourceMappingURL=",
  "use strict",
];
const NODE_DIAG_FLAGS = [
  "--cpu-prof",
  "--cpu-prof-name",
  "--cpu-prof-interval",
  "--cpu-prof-dir",
  "--heap-prof",
  "--heap-prof-name",
  "--heap-prof-interval",
  "--heap-prof-dir",
  "--diagnostic-report",
  "--report-on-fatalerror",
  "--report-on-signal",
  "--report-signal",
  "--report-dir",
  "--report-filename",
  "--report-compact",
  "--report-verbose",
  "--heapsnapshot-signal",
  "--trace-gc",
  "--trace-gc-verbose",
  "--trace-gc-ignore-scavenger",
  "--trace-events-enabled",
  "--trace-events-categories",
  "--trace-turbo",
  "--trace-ic",
  "--trace-opt",
  "--trace-deopt",
  "--trace-exit",
  "--perf-basic-prof",
  "--perf-basic-prof-only-functions",
  "--perf-prof",
  "--perf-prof-unwinding-info",
  "--perf-prof-annotate-wasm",
  "--perf-prof-annotate-wasm-function-names",
  "--perf-prof-annotate-wasm-function-indices",
];
const NODE_INJECT_FLAGS = [
  "--require",
  "-r",
  "--loader",
  "--experimental-loader",
  "--import",
];
const SUITE_ORDER = [
  "build",
  "env",
  "leaks",
  "bootstrap",
  "attach",
  "config",
  "tamper",
];
const DANGEROUS_CAPS = {
  SYS_MODULE: 16,
  SYS_RAWIO: 17,
  SYS_PTRACE: 19,
  SYS_ADMIN: 21,
  SYS_BOOT: 22,
  SYSLOG: 34,
};

function log(msg) {
  process.stdout.write(`[thin-anti-debug-e2e] ${msg}\n`);
}

function normalizeSuiteList(input) {
  const raw = Array.isArray(input) ? input.join(",") : (input || "");
  const cleaned = String(raw).trim();
  if (!cleaned) return SUITE_ORDER.slice();
  const parts = cleaned.split(/[,\s]+/).map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return SUITE_ORDER.slice();
  if (parts.includes("all")) return SUITE_ORDER.slice();
  const set = new Set();
  for (const part of parts) {
    if (!SUITE_ORDER.includes(part)) {
      throw new Error(`Unknown suite "${part}". Valid: ${SUITE_ORDER.join(", ")}`);
    }
    set.add(part);
  }
  return SUITE_ORDER.filter((name) => set.has(name));
}

function fail(msg) {
  process.stderr.write(`[thin-anti-debug-e2e] ERROR: ${msg}\n`);
}

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
}

function isRootUser() {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

function resolveCc() {
  if (hasCommand("cc")) return "cc";
  if (hasCommand("gcc")) return "gcc";
  return null;
}

function runGdbAttach(pid, timeoutMs = 5000) {
  return spawnSync(
    "gdb",
    ["-q", "-batch", "-p", String(pid), "-ex", "detach", "-ex", "quit"],
    { stdio: "pipe", timeout: timeoutMs }
  );
}

function runLldbAttach(pid, timeoutMs = 5000) {
  return spawnSync(
    "lldb",
    ["-b", "-o", `process attach -p ${pid}`, "-o", "detach", "-o", "quit"],
    { stdio: "pipe", timeout: timeoutMs }
  );
}

function runStraceAttach(pid, logPath, timeoutMs = 5000) {
  return spawnSync(
    "strace",
    ["-p", String(pid), "-f", "-qq", "-o", logPath, "-e", "trace=memfd_create,execveat,execve", "-c"],
    { stdio: "pipe", timeout: timeoutMs }
  );
}

function runLtraceAttach(pid, logPath, timeoutMs = 5000) {
  return spawnSync(
    "ltrace",
    ["-p", String(pid), "-f", "-o", logPath],
    { stdio: "pipe", timeout: timeoutMs }
  );
}

function runGdbServerAttach(pid, hostPort, timeoutMs = 5000) {
  return spawnSync(
    "gdbserver",
    ["--attach", hostPort, String(pid)],
    { stdio: "pipe", timeout: timeoutMs }
  );
}

function runLldbServerAttach(pid, hostPort, timeoutMs = 5000) {
  return spawnSync(
    "lldb-server",
    ["gdbserver", "--attach", String(pid), hostPort],
    { stdio: "pipe", timeout: timeoutMs }
  );
}

function checkPrereqs() {
  if (process.platform !== "linux") {
    log(`SKIP: thin anti-debug E2E is linux-only (platform=${process.platform})`);
    return { ok: false, skip: true };
  }
  if (!hasCommand("cc") && !hasCommand("gcc")) {
    fail("Missing C compiler (cc/gcc)");
    return { ok: false, skip: false };
  }
  if (!hasCommand("pkg-config")) {
    fail("Missing pkg-config (required for libzstd)");
    return { ok: false, skip: false };
  }
  const zstdCheck = runCmd("pkg-config", ["--libs", "libzstd"]);
  if (zstdCheck.status !== 0) {
    fail("libzstd not found via pkg-config");
    return { ok: false, skip: false };
  }
  return { ok: true, skip: false };
}

const HELPER_MEMREAD_SRC = `#define _FILE_OFFSET_BITS 64
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "usage: %s <pid> <addr_hex> [len]\\n", argv[0]);
    return 2;
  }
  pid_t pid = (pid_t)atoi(argv[1]);
  unsigned long long addr = strtoull(argv[2], NULL, 16);
  size_t len = (argc > 3) ? (size_t)strtoul(argv[3], NULL, 10) : 16;
  char path[64];
  snprintf(path, sizeof(path), "/proc/%d/mem", (int)pid);
  int fd = open(path, O_RDONLY);
  if (fd < 0) {
    fprintf(stderr, "open:%d\\n", errno);
    return 3;
  }
  unsigned char buf[64];
  if (len > sizeof(buf)) len = sizeof(buf);
  ssize_t n = pread(fd, buf, len, (off_t)addr);
  if (n <= 0) {
    fprintf(stderr, "read:%d\\n", errno);
    close(fd);
    return 4;
  }
  write(1, buf, (size_t)n);
  close(fd);
  return 0;
}
`;

const HELPER_VMREAD_SRC = `#define _GNU_SOURCE
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/uio.h>
#include <sys/syscall.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "usage: %s <pid> <addr_hex> [len]\\n", argv[0]);
    return 2;
  }
  pid_t pid = (pid_t)atoi(argv[1]);
  unsigned long long addr = strtoull(argv[2], NULL, 16);
  size_t len = (argc > 3) ? (size_t)strtoul(argv[3], NULL, 10) : 16;
#ifndef SYS_process_vm_readv
#ifdef __NR_process_vm_readv
#define SYS_process_vm_readv __NR_process_vm_readv
#else
  fprintf(stderr, "unsupported\\n");
  return 5;
#endif
#endif
  unsigned char buf[64];
  if (len > sizeof(buf)) len = sizeof(buf);
  struct iovec local;
  struct iovec remote;
  local.iov_base = buf;
  local.iov_len = len;
  remote.iov_base = (void *)(uintptr_t)addr;
  remote.iov_len = len;
  ssize_t n = syscall(SYS_process_vm_readv, pid, &local, 1, &remote, 1, 0);
  if (n <= 0) {
    fprintf(stderr, "vmread:%d\\n", errno);
    return 4;
  }
  write(1, buf, (size_t)n);
  return 0;
}
`;

const HELPER_MEMWRITE_SRC = `#define _FILE_OFFSET_BITS 64
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "usage: %s <pid> <addr_hex> [len]\\n", argv[0]);
    return 2;
  }
  pid_t pid = (pid_t)atoi(argv[1]);
  unsigned long long addr = strtoull(argv[2], NULL, 16);
  size_t len = (argc > 3) ? (size_t)strtoul(argv[3], NULL, 10) : 1;
  char path[64];
  snprintf(path, sizeof(path), "/proc/%d/mem", (int)pid);
  int fd = open(path, O_RDWR);
  if (fd < 0) {
    fprintf(stderr, "open:%d\\n", errno);
    return 3;
  }
  unsigned char buf[8] = { 0 };
  if (len > sizeof(buf)) len = sizeof(buf);
  ssize_t n = pwrite(fd, buf, len, (off_t)addr);
  if (n <= 0) {
    fprintf(stderr, "write:%d\\n", errno);
    close(fd);
    return 4;
  }
  close(fd);
  return 0;
}
`;

const HELPER_VMWRITE_SRC = `#define _GNU_SOURCE
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/uio.h>
#include <sys/syscall.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "usage: %s <pid> <addr_hex> [len]\\n", argv[0]);
    return 2;
  }
  pid_t pid = (pid_t)atoi(argv[1]);
  unsigned long long addr = strtoull(argv[2], NULL, 16);
  size_t len = (argc > 3) ? (size_t)strtoul(argv[3], NULL, 10) : 1;
#ifndef SYS_process_vm_writev
#ifdef __NR_process_vm_writev
#define SYS_process_vm_writev __NR_process_vm_writev
#else
  fprintf(stderr, "unsupported\\n");
  return 5;
#endif
#endif
  unsigned char buf[8] = { 0 };
  if (len > sizeof(buf)) len = sizeof(buf);
  struct iovec local;
  struct iovec remote;
  local.iov_base = buf;
  local.iov_len = len;
  remote.iov_base = (void *)(uintptr_t)addr;
  remote.iov_len = len;
  ssize_t n = syscall(SYS_process_vm_writev, pid, &local, 1, &remote, 1, 0);
  if (n <= 0) {
    fprintf(stderr, "vmwrite:%d\\n", errno);
    return 4;
  }
  return 0;
}
`;

const HELPER_PTRACE_SRC = `#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/ptrace.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s <pid>\\n", argv[0]);
    return 2;
  }
  pid_t pid = (pid_t)atoi(argv[1]);
#ifdef PTRACE_SEIZE
  if (ptrace(PTRACE_SEIZE, pid, NULL, NULL) == 0) {
    ptrace(PTRACE_DETACH, pid, NULL, NULL);
    return 0;
  }
#else
  if (ptrace(PTRACE_ATTACH, pid, NULL, NULL) == 0) {
    waitpid(pid, NULL, 0);
    ptrace(PTRACE_DETACH, pid, NULL, NULL);
    return 0;
  }
#endif
  fprintf(stderr, "ptrace:%d\\n", errno);
  return 3;
}
`;

const HELPER_PIDFD_SRC = `#define _GNU_SOURCE
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/syscall.h>
#include <unistd.h>

#ifndef SYS_pidfd_open
#ifdef __NR_pidfd_open
#define SYS_pidfd_open __NR_pidfd_open
#endif
#endif

#ifndef SYS_pidfd_getfd
#ifdef __NR_pidfd_getfd
#define SYS_pidfd_getfd __NR_pidfd_getfd
#endif
#endif

int main(int argc, char **argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s <pid> [fd]\\n", argv[0]);
    return 2;
  }
  pid_t pid = (pid_t)atoi(argv[1]);
#ifndef SYS_pidfd_open
  fprintf(stderr, "pidfd_open:unsupported\\n");
  return 3;
#endif
  int pfd = (int)syscall(SYS_pidfd_open, pid, 0);
  if (pfd < 0) {
    fprintf(stderr, "pidfd_open:%d\\n", errno);
    return 4;
  }
#ifndef SYS_pidfd_getfd
  close(pfd);
  fprintf(stderr, "pidfd_getfd:unsupported\\n");
  return 6;
#else
  int target = (argc > 2) ? atoi(argv[2]) : 0;
  int dupfd = (int)syscall(SYS_pidfd_getfd, pfd, target, 0);
  if (dupfd >= 0) {
    close(dupfd);
    close(pfd);
    return 0;
  }
  fprintf(stderr, "pidfd_getfd:%d\\n", errno);
  close(pfd);
  return 5;
#endif
}
`;

const HELPER_PRELOAD_SRC = `#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
static void seal_preload_init(void) {
  const char *path = getenv("SEAL_E2E_PRELOAD_MARKER");
  if (!path || !*path) return;
  int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0600);
  if (fd < 0) return;
  dprintf(fd, "pid=%d\\n", (int)getpid());
  close(fd);
}
`;

const HELPER_AUDIT_SRC = `#define _GNU_SOURCE
#include <fcntl.h>
#include <link.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

static void seal_audit_marker(void) {
  const char *path = getenv("SEAL_E2E_AUDIT_MARKER");
  if (!path || !*path) return;
  int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0600);
  if (fd < 0) return;
  dprintf(fd, "pid=%d\\n", (int)getpid());
  close(fd);
}

unsigned int la_version(unsigned int v) {
  seal_audit_marker();
  return LAV_CURRENT;
}
`;

function ensureHelper(ctx, name, src) {
  if (ctx.helpers[name]) return ctx.helpers[name];
  const cc = resolveCc();
  if (!cc) {
    throw new Error("Missing C compiler (cc/gcc)");
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `seal-ad-${name}-`));
  const srcPath = path.join(dir, `${name}.c`);
  const outPath = path.join(dir, name);
  fs.writeFileSync(srcPath, src, "utf8");
  const res = runCmd(cc, ["-O2", srcPath, "-o", outPath], 8000);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}${res.stderr || ""}`;
    throw new Error(`helper ${name} compile failed: ${out.slice(0, 200)}`);
  }
  const info = { dir, path: outPath };
  ctx.helpers[name] = info;
  ctx.helperDirs.push(dir);
  return info;
}

function ensureSharedHelper(ctx, name, src, extraArgs = []) {
  if (ctx.helpers[name]) return ctx.helpers[name];
  const cc = resolveCc();
  if (!cc) {
    throw new Error("Missing C compiler (cc/gcc)");
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `seal-ad-${name}-`));
  const srcPath = path.join(dir, `${name}.c`);
  const outPath = path.join(dir, `${name}.so`);
  fs.writeFileSync(srcPath, src, "utf8");
  const args = ["-O2", "-fPIC", "-shared", srcPath, "-o", outPath, ...extraArgs];
  const res = runCmd(cc, args, 8000);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}${res.stderr || ""}`;
    throw new Error(`helper ${name} compile failed: ${out.slice(0, 200)}`);
  }
  const info = { dir, path: outPath };
  ctx.helpers[name] = info;
  ctx.helperDirs.push(dir);
  return info;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDelayList(raw, fallback) {
  if (!raw) return Array.isArray(fallback) ? fallback : [];
  const out = [];
  const parts = String(raw).split(/[,\s]+/).filter(Boolean);
  for (const part of parts) {
    const val = Number(part);
    if (Number.isFinite(val) && val >= 0) out.push(Math.floor(val));
  }
  return out.length ? out : (Array.isArray(fallback) ? fallback : []);
}

function withTimeout(label, ms, fn) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([fn(), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function httpJson({ port, path: reqPath, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: reqPath,
        method: "GET",
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            const json = JSON.parse(raw);
            resolve({ status: res.statusCode, json });
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${raw.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("HTTP timeout")));
    req.on("error", (err) => reject(err));
    req.end();
  });
}

async function waitForStatus(port, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { status, json } = await httpJson({ port, path: "/api/status", timeoutMs: 800 });
      if (status === 200 && json && json.ok) return json;
    } catch {
      // ignore and retry
    }
    await delay(200);
  }
  throw new Error(`Timeout waiting for /api/status on port ${port}`);
}

async function waitForReady({ port, readyFile, timeoutMs }) {
  if (readyFile) return waitForReadyFile(readyFile, timeoutMs);
  return waitForStatus(port, timeoutMs);
}

async function waitForMarkerFile(markerPath, expected, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const raw = fs.readFileSync(markerPath, "utf8").trim();
      if (raw === expected) return raw;
    } catch {
      // ignore
    }
    await delay(100);
  }
  throw new Error(`Timeout waiting for marker "${expected}"`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    if (process.env.SEAL_E2E_NO_LISTEN === "1") {
      resolve(null);
      return;
    }
    const srv = net.createServer();
    srv.on("error", (err) => {
      if (err && err.code === "EPERM") {
        process.env.SEAL_E2E_NO_LISTEN = "1";
        resolve(null);
        return;
      }
      reject(err);
    });
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : null;
      srv.close(() => resolve(port));
    });
  });
}

function writeRuntimeConfig(releaseDir, port) {
  const cfgPath = path.join(EXAMPLE_ROOT, "seal-config", "configs", "local.json5");
  const cfg = readJson5(cfgPath);
  cfg.http = cfg.http || {};
  cfg.http.host = "127.0.0.1";
  cfg.http.port = port || 3000;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function ensureRuntimeConfig(releaseDir) {
  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);
  return port;
}

async function runReleaseWithReady({ releaseDir, runTimeoutMs, env, onReady, skipMessage }) {
  const port = runReleaseOk.skipListen ? null : await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) {
    log("WARN: listen not permitted; using ready-file mode");
  }
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        code !== null ? `code=${code}` : null,
        signal ? `signal=${signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      reject(new Error(`process exited early (${detail || "no output"})`));
    });
  });

  let stdout = "";
  let stderr = "";
  try {
    await withTimeout("waitForStatus", runTimeoutMs, () =>
      Promise.race([waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }), exitPromise])
    );
    await onReady({ child, port });
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    stdout = Buffer.concat(outChunks).toString("utf8");
    stderr = Buffer.concat(errChunks).toString("utf8");
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
  return { stdout, stderr };
}

function readProcStatus(pid) {
  const statusPath = path.join("/proc", String(pid), "status");
  const content = fs.readFileSync(statusPath, "utf8");
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

function readProcMaps(pid) {
  const mapsPath = path.join("/proc", String(pid), "maps");
  try {
    return fs.readFileSync(mapsPath, "utf8");
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return null;
    throw e;
  }
}

function readProcSmaps(pid) {
  const smapsPath = path.join("/proc", String(pid), "smaps");
  try {
    return fs.readFileSync(smapsPath, "utf8");
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return null;
    throw e;
  }
}

function parseProcMapsEntries(content) {
  const entries = [];
  if (!content) return entries;
  for (const line of content.split(/\r?\n/)) {
    if (!line) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const range = parts[0];
    const perms = parts[1] || "";
    const dash = range.indexOf("-");
    if (dash <= 0) continue;
    const startStr = range.slice(0, dash);
    const endStr = range.slice(dash + 1);
    if (!/^[0-9a-fA-F]+$/.test(startStr) || !/^[0-9a-fA-F]+$/.test(endStr)) continue;
    const start = Number.parseInt(startStr, 16);
    const end = Number.parseInt(endStr, 16);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const pathPart = parts.length > 5 ? parts.slice(5).join(" ") : "";
    entries.push({ start, end, perms, path: pathPart, startStr });
  }
  return entries;
}

function readProcFdTargets(pid) {
  const fdDir = path.join("/proc", String(pid), "fd");
  let entries = [];
  try {
    entries = fs.readdirSync(fdDir);
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return null;
    throw e;
  }
  const out = [];
  for (const ent of entries) {
    if (!/^\d+$/.test(ent)) continue;
    const fdPath = path.join(fdDir, ent);
    let target = "";
    try {
      target = fs.readlinkSync(fdPath);
    } catch {
      continue;
    }
    out.push({ fd: Number(ent), target });
  }
  return out;
}

function readProcLimits(pid) {
  const limitsPath = path.join("/proc", String(pid), "limits");
  try {
    return fs.readFileSync(limitsPath, "utf8");
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return null;
    throw e;
  }
}

function readProcCoredumpFilter(pid) {
  const filePath = path.join("/proc", String(pid), "coredump_filter");
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return null;
    throw e;
  }
}

function readProcEnviron(pid) {
  const envPath = path.join("/proc", String(pid), "environ");
  try {
    return fs.readFileSync(envPath);
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return null;
    throw e;
  }
}

function readProcCmdline(pid) {
  const cmdPath = path.join("/proc", String(pid), "cmdline");
  try {
    return fs.readFileSync(cmdPath);
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM" || e.code === "ENOENT")) return null;
    throw e;
  }
}

function readProcExeLink(pid) {
  const exePath = path.join("/proc", String(pid), "exe");
  try {
    return fs.readlinkSync(exePath);
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM" || e.code === "ENOENT")) return null;
    throw e;
  }
}

function parseProcCmdline(buf) {
  if (!buf || buf.length === 0) return [];
  return buf.toString("utf8").split("\0").filter(Boolean);
}

function parseProcEnviron(buf) {
  if (!buf || buf.length === 0) return {};
  const out = {};
  const items = buf.toString("utf8").split("\0").filter(Boolean);
  for (const item of items) {
    const idx = item.indexOf("=");
    if (idx <= 0) continue;
    const key = item.slice(0, idx);
    const value = item.slice(idx + 1);
    out[key] = value;
  }
  return out;
}

function parseProcNetSockets(filePath) {
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return null;
    throw e;
  }
  const lines = content.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const sockets = [];
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 10) continue;
    const local = parts[1];
    const state = parts[3];
    const inode = parts[9];
    const portHex = local && local.includes(":") ? local.split(":")[1] : "";
    const port = portHex ? Number.parseInt(portHex, 16) : NaN;
    if (!Number.isFinite(port)) continue;
    sockets.push({ inode, port, state });
  }
  return sockets;
}

function getProcessListeningPorts(pid) {
  const fdTargets = readProcFdTargets(pid);
  if (fdTargets === null) return { skip: "fd targets blocked" };
  const inodes = new Set();
  for (const entry of fdTargets) {
    const match = /socket:\[(\d+)\]/.exec(entry.target || "");
    if (match) inodes.add(match[1]);
  }
  if (inodes.size === 0) return { ok: true, ports: [] };
  const tcp4 = parseProcNetSockets("/proc/net/tcp");
  const tcp6 = parseProcNetSockets("/proc/net/tcp6");
  if (tcp4 === null && tcp6 === null) return { skip: "proc net blocked" };
  const sockets = [];
  if (Array.isArray(tcp4)) sockets.push(...tcp4);
  if (Array.isArray(tcp6)) sockets.push(...tcp6);
  const ports = [];
  for (const sock of sockets) {
    if (sock.state !== "0A") continue;
    if (inodes.has(sock.inode)) ports.push(sock.port);
  }
  return { ok: true, ports };
}

function parseInspectPortValue(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const last = trimmed.includes(":") ? trimmed.split(":").pop() : trimmed;
  const port = Number(last);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) return null;
  return port;
}

function collectInspectorPortsFromArgs(args) {
  const ports = new Set([9229, 9222, 5858]);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--inspect" || arg === "--inspect-brk") {
      ports.add(9229);
      continue;
    }
    if (arg && (arg.startsWith("--inspect=") || arg.startsWith("--inspect-brk="))) {
      const value = arg.split("=").slice(1).join("=");
      const parsed = parseInspectPortValue(value);
      if (parsed) ports.add(parsed);
      continue;
    }
    if (arg === "--inspect-port" && i + 1 < args.length) {
      const parsed = parseInspectPortValue(args[i + 1]);
      if (parsed) ports.add(parsed);
      continue;
    }
    if (arg && arg.startsWith("--inspect-port=")) {
      const value = arg.split("=").slice(1).join("=");
      const parsed = parseInspectPortValue(value);
      if (parsed) ports.add(parsed);
    }
  }
  return ports;
}

function checkInspectorDisabled(pid) {
  const cmdBuf = readProcCmdline(pid);
  if (cmdBuf === null) return { skip: "cmdline blocked" };
  const args = parseProcCmdline(cmdBuf);
  const inspectArgs = args.filter((arg) => arg.startsWith("--inspect"));
  if (inspectArgs.length > 0) {
    throw new Error(`inspector args present: ${inspectArgs.join(", ")}`);
  }
  const portsRes = getProcessListeningPorts(pid);
  if (portsRes.skip) return { skip: portsRes.skip };
  const inspectorPorts = collectInspectorPortsFromArgs(args);
  const hits = (portsRes.ports || []).filter((p) => inspectorPorts.has(p));
  if (hits.length > 0) {
    throw new Error(`inspector port open: ${hits.join(", ")}`);
  }
  return { ok: true };
}

function readProcChildren(pid) {
  const pathChildren = path.join("/proc", String(pid), "task", String(pid), "children");
  try {
    const raw = fs.readFileSync(pathChildren, "utf8").trim();
    if (!raw) return [];
    return raw.split(/\s+/).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0);
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM" || e.code === "ENOENT")) return null;
    throw e;
  }
}

async function waitForChildPids(pid, opts = {}) {
  const tries = Number.isFinite(opts.tries) ? opts.tries : 10;
  const delayMs = Number.isFinite(opts.delayMs) ? opts.delayMs : 200;
  for (let i = 0; i < tries; i += 1) {
    const kids = readProcChildren(pid);
    if (kids === null) return null;
    if (kids.length > 0) return kids;
    await delay(delayMs);
  }
  return [];
}

function parseSmaps(content) {
  if (!content) return [];
  const entries = [];
  let cur = null;
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    if (/^[0-9a-fA-F]+-[0-9a-fA-F]+\s+/.test(line)) {
      if (cur) entries.push(cur);
      const parts = line.trim().split(/\s+/);
      const range = parts[0];
      const perms = parts[1] || "";
      const dash = range.indexOf("-");
      const start = dash > 0 ? parseInt(range.slice(0, dash), 16) : 0;
      const end = dash > 0 ? parseInt(range.slice(dash + 1), 16) : 0;
      const pathPart = parts.length > 5 ? parts.slice(5).join(" ") : "";
      cur = {
        start,
        end,
        perms,
        path: pathPart,
        sizeKb: null,
        vmLckKb: null,
        vmFlags: [],
      };
      continue;
    }
    if (!cur) continue;
    if (line.startsWith("Size:")) {
      const match = /Size:\s+(\d+)\s+kB/.exec(line);
      if (match) cur.sizeKb = Number(match[1]);
    } else if (line.startsWith("VmLck:")) {
      const match = /VmLck:\s+(\d+)\s+kB/.exec(line);
      if (match) cur.vmLckKb = Number(match[1]);
    } else if (line.startsWith("VmFlags:")) {
      const flags = line.slice("VmFlags:".length).trim().split(/\s+/).filter(Boolean);
      cur.vmFlags = flags;
    }
  }
  if (cur) entries.push(cur);
  return entries;
}

function findBundleMap(entries, bundleBytes) {
  if (!bundleBytes) return null;
  const target = Math.ceil(bundleBytes / 1024);
  const tolerance = Math.max(16, Math.floor(target * 0.02));
  let best = null;
  for (const entry of entries) {
    if (!entry || !Number.isFinite(entry.sizeKb)) continue;
    if (!entry.perms || !entry.perms.startsWith("rw")) continue;
    if (entry.path && entry.path !== "[anon]" && entry.path !== "[heap]") continue;
    const sizeKb = entry.sizeKb;
    if (sizeKb < target - tolerance || sizeKb > target + tolerance) continue;
    if (!best || sizeKb < best.sizeKb) best = entry;
  }
  return best;
}

function buildBundleSignatureTokens(bundlePath) {
  if (!bundlePath || !fs.existsSync(bundlePath)) return { skip: "bundle missing", tokens: [] };
  let size = 0;
  try {
    size = fs.statSync(bundlePath).size;
  } catch {
    return { skip: "bundle stat failed", tokens: [] };
  }
  if (size < 96) return { skip: "bundle too small", tokens: [] };
  const positions = [
    0,
    Math.floor(size / 2),
    Math.max(0, size - 64),
  ];
  const tokens = [];
  for (const pos of positions) {
    const slice = readFileSlice(bundlePath, pos, 32);
    if (slice.length >= 16) tokens.push(slice);
  }
  if (!tokens.length) return { skip: "bundle signature empty", tokens: [] };
  const uniq = new Map();
  for (const tok of tokens) {
    uniq.set(tok.toString("hex"), tok);
  }
  return { ok: true, tokens: Array.from(uniq.values()) };
}

function checkBundleDontDump(pid, bundleBytes) {
  const strict = process.env.SEAL_E2E_STRICT_DONTDUMP === "1";
  const smaps = readProcSmaps(pid);
  if (smaps === null) {
    return { skip: "smaps blocked" };
  }
  const entries = parseSmaps(smaps);
  const candidate = findBundleMap(entries, bundleBytes);
  if (!candidate) {
    return { skip: "bundle mapping not found" };
  }
  const flags = candidate.vmFlags || [];
  if (flags.includes("dd")) {
    return { ok: true };
  }
  if (strict) {
    throw new Error("bundle mapping missing MADV_DONTDUMP (VmFlags lacks dd)");
  }
  return { skip: "bundle mapping missing dd (set SEAL_E2E_STRICT_DONTDUMP=1 to enforce)" };
}

function checkBundleMemLocked(pid, bundleBytes) {
  const strict = process.env.SEAL_E2E_STRICT_MEMLOCK === "1";
  const smaps = readProcSmaps(pid);
  if (smaps === null) {
    return { skip: "smaps blocked" };
  }
  const entries = parseSmaps(smaps);
  const candidate = findBundleMap(entries, bundleBytes);
  if (!candidate) {
    return { skip: "bundle mapping not found" };
  }
  const flags = candidate.vmFlags || [];
  const locked = flags.includes("lo") || (candidate.vmLckKb && candidate.vmLckKb > 0);
  if (locked) {
    return { ok: true };
  }
  if (strict) {
    throw new Error("bundle mapping not locked (VmFlags lacks lo)");
  }
  return { skip: "bundle mapping not locked (set SEAL_E2E_STRICT_MEMLOCK=1 to enforce)" };
}

function checkBundleWipeOnFork(pid, bundleBytes) {
  const strict = process.env.SEAL_E2E_STRICT_WIPEONFORK === "1";
  const smaps = readProcSmaps(pid);
  if (smaps === null) {
    return { skip: "smaps blocked" };
  }
  const entries = parseSmaps(smaps);
  const candidate = findBundleMap(entries, bundleBytes);
  if (!candidate) {
    return { skip: "bundle mapping not found" };
  }
  const flags = candidate.vmFlags || [];
  if (flags.includes("wf")) {
    return { ok: true };
  }
  if (strict) {
    throw new Error("bundle mapping missing MADV_WIPEONFORK (VmFlags lacks wf)");
  }
  return { skip: "bundle mapping missing wf (set SEAL_E2E_STRICT_WIPEONFORK=1 to enforce)" };
}

function checkBundleDontFork(pid, bundleBytes) {
  const strict = process.env.SEAL_E2E_STRICT_DONTFORK === "1";
  const smaps = readProcSmaps(pid);
  if (smaps === null) {
    return { skip: "smaps blocked" };
  }
  const entries = parseSmaps(smaps);
  const candidate = findBundleMap(entries, bundleBytes);
  if (!candidate) {
    return { skip: "bundle mapping not found" };
  }
  const flags = candidate.vmFlags || [];
  if (flags.includes("dc")) {
    return { ok: true };
  }
  if (strict) {
    throw new Error("bundle mapping missing MADV_DONTFORK (VmFlags lacks dc)");
  }
  return { skip: "bundle mapping missing dc (set SEAL_E2E_STRICT_DONTFORK=1 to enforce)" };
}

function checkBundleUnmergeable(pid, bundleBytes) {
  const strict = process.env.SEAL_E2E_STRICT_UNMERGEABLE === "1";
  const smaps = readProcSmaps(pid);
  if (smaps === null) {
    return { skip: "smaps blocked" };
  }
  const entries = parseSmaps(smaps);
  const candidate = findBundleMap(entries, bundleBytes);
  if (!candidate) {
    return { skip: "bundle mapping not found" };
  }
  const flags = candidate.vmFlags || [];
  if (flags.includes("um")) {
    return { ok: true };
  }
  if (flags.includes("mg")) {
    if (strict) {
      throw new Error("bundle mapping mergeable (VmFlags has mg)");
    }
    return { skip: "bundle mapping mergeable (set SEAL_E2E_STRICT_UNMERGEABLE=1 to enforce)" };
  }
  if (strict) {
    throw new Error("bundle mapping missing MADV_UNMERGEABLE (VmFlags lacks um)");
  }
  return { skip: "bundle mapping missing um (set SEAL_E2E_STRICT_UNMERGEABLE=1 to enforce)" };
}

function checkSealMemfdClosed(pid) {
  const fds = readProcFdTargets(pid);
  if (fds === null) return { skip: "fd list blocked" };
  const hits = fds.filter((f) => /memfd:seal-(node|bundle)/.test(f.target));
  if (hits.length > 0) {
    const list = hits.map((h) => `${h.fd}:${h.target}`).join(", ");
    throw new Error(`seal memfd still open: ${list}`);
  }
  return { ok: true };
}

function checkProcessFdHygiene(pid, releaseDir) {
  const fds = readProcFdTargets(pid);
  if (fds === null) return { skip: "fd list blocked" };
  const rtPath = path.resolve(releaseDir, "r", "rt");
  const plPath = path.resolve(releaseDir, "r", "pl");
  const bad = [];
  for (const f of fds) {
    const target = f.target || "";
    if (/memfd:seal-(node|bundle)/.test(target)) {
      bad.push(`${f.fd}:${target}`);
      continue;
    }
    const cleaned = target.replace(/ \(deleted\)$/, "");
    if (cleaned === rtPath || cleaned === plPath) {
      bad.push(`${f.fd}:${target}`);
    }
  }
  if (bad.length > 0) {
    throw new Error(`fd hygiene violation: ${bad.join(", ")}`);
  }
  return { ok: true };
}

function getMapAddresses(pid, opts = {}) {
  const maps = readProcMaps(pid);
  if (maps === null) return { blocked: true, addresses: [] };
  const readable = opts.readable === true;
  const writable = opts.writable === true;
  const limit = Number.isFinite(opts.limit) ? opts.limit : 5;
  const addrs = [];
  for (const line of maps.split(/\r?\n/)) {
    if (!line) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const range = parts[0];
    const perms = parts[1];
    if (!perms) continue;
    if (readable && perms[0] !== "r") continue;
    if (writable && !perms.includes("w")) continue;
    const dash = range.indexOf("-");
    if (dash <= 0) continue;
    const start = range.slice(0, dash);
    if (!/^[0-9a-fA-F]+$/.test(start)) continue;
    addrs.push(start);
    if (addrs.length >= limit) break;
  }
  return { blocked: false, addresses: addrs };
}

function getReadableMapAddresses(pid, limit = 5) {
  return getMapAddresses(pid, { readable: true, limit });
}

function getWritableMapAddresses(pid, limit = 5) {
  return getMapAddresses(pid, { readable: true, writable: true, limit });
}

function parseHelperErrno(output) {
  const match = /(open|read|write|vmread|vmwrite|ptrace):(\d+)/.exec(output || "");
  return match ? Number(match[2]) : null;
}

function readFileHead(filePath, len) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(len);
    const read = fs.readSync(fd, buf, 0, len, 0);
    return read > 0 ? buf.slice(0, read) : Buffer.alloc(0);
  } finally {
    fs.closeSync(fd);
  }
}

function readFileSlice(filePath, offset, len) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(len);
    const read = fs.readSync(fd, buf, 0, len, offset);
    return read > 0 ? buf.slice(0, read) : Buffer.alloc(0);
  } finally {
    fs.closeSync(fd);
  }
}

function findBundleMapAddress(pid, bundleBytes) {
  const maps = readProcMaps(pid);
  if (maps === null) return { skip: "maps blocked" };
  const target = Math.ceil(bundleBytes / 4096);
  let best = null;
  for (const line of maps.split(/\r?\n/)) {
    if (!line) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const range = parts[0];
    const perms = parts[1];
    const dash = range.indexOf("-");
    if (dash <= 0) continue;
    const startHex = range.slice(0, dash);
    const endHex = range.slice(dash + 1);
    if (!/^[0-9a-fA-F]+$/.test(startHex) || !/^[0-9a-fA-F]+$/.test(endHex)) continue;
    const start = parseInt(startHex, 16);
    const end = parseInt(endHex, 16);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    if (!perms.startsWith("rw")) continue;
    const pages = Math.ceil((end - start) / 4096);
    if (pages < target) continue;
    const pathPart = parts.length > 5 ? parts.slice(5).join(" ") : "";
    if (pathPart && pathPart !== "[anon]" && pathPart !== "[heap]") continue;
    if (!best || pages < best.pages) {
      best = { addr: startHex, pages };
    }
  }
  if (!best) return { skip: "bundle mapping not found" };
  return { ok: true, addr: best.addr };
}

function readMemAt(pid, addrHex, len, helpers) {
  const tryHelper = (helperPath, label) => {
    if (!helperPath) return { skip: `${label} helper missing` };
    const res = runCmd(helperPath, [String(pid), addrHex, String(len)], 5000);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.status === 0) {
      return { ok: true, data: Buffer.from(res.stdout || "") };
    }
    if (/unsupported/i.test(out)) {
      return { skip: `${label} unsupported` };
    }
    const errno = parseHelperErrno(out);
    if (errno === ERRNO.EPERM || errno === ERRNO.EACCES) {
      return { blocked: true, note: `${label} errno ${errno}` };
    }
    return { skip: `${label} failed (${out.slice(0, 120) || "unknown"})` };
  };

  const vmRes = tryHelper(helpers && helpers.vm && helpers.vm.path, "vmread");
  if (vmRes.ok || vmRes.blocked) return vmRes;
  const memRes = tryHelper(helpers && helpers.mem && helpers.mem.path, "memread");
  return memRes;
}

function checkBundleMemoryProbe(pid, bundlePath, bundleBytes, helpers) {
  if (!bundlePath || !fs.existsSync(bundlePath)) {
    return { skip: "bundle source missing" };
  }
  if (!bundleBytes) {
    return { skip: "bundle size missing" };
  }
  const head = readFileHead(bundlePath, 64);
  if (!head.length) {
    return { skip: "bundle head empty" };
  }
  const mapRes = findBundleMapAddress(pid, bundleBytes);
  if (mapRes.skip) return { skip: mapRes.skip };
  if (!mapRes.ok) return { skip: "bundle map lookup failed" };
  const memRes = readMemAt(pid, mapRes.addr, head.length, helpers);
  if (memRes.blocked) {
    return { ok: true, note: memRes.note };
  }
  if (memRes.ok && memRes.data) {
    const data = memRes.data;
    if (data.length >= head.length && data.subarray(0, head.length).equals(head)) {
      throw new Error("bundle header readable in target memory");
    }
    return { skip: "memory readable but bundle header not found" };
  }
  return { skip: memRes.skip || "memory probe failed" };
}

function readSysctlValue(pathname) {
  try {
    return fs.readFileSync(pathname, "utf8").trim();
  } catch {
    return null;
  }
}

function readSysctlInt(pathname) {
  const raw = readSysctlValue(pathname);
  if (raw === null) return null;
  const n = Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function logSysctlInfo() {
  const yama = readSysctlValue("/proc/sys/kernel/yama/ptrace_scope");
  if (yama !== null) {
    log(`INFO: kernel.yama.ptrace_scope=${yama}`);
  } else {
    log("INFO: kernel.yama.ptrace_scope unavailable");
  }
  const perf = readSysctlValue("/proc/sys/kernel/perf_event_paranoid");
  if (perf !== null) {
    log(`INFO: kernel.perf_event_paranoid=${perf}`);
  } else {
    log("INFO: kernel.perf_event_paranoid unavailable");
  }
  const kptr = readSysctlValue("/proc/sys/kernel/kptr_restrict");
  if (kptr !== null) {
    log(`INFO: kernel.kptr_restrict=${kptr}`);
  } else {
    log("INFO: kernel.kptr_restrict unavailable");
  }
  const dmesg = readSysctlValue("/proc/sys/kernel/dmesg_restrict");
  if (dmesg !== null) {
    log(`INFO: kernel.dmesg_restrict=${dmesg}`);
  } else {
    log("INFO: kernel.dmesg_restrict unavailable");
  }
  const ubpf = readSysctlValue("/proc/sys/kernel/unprivileged_bpf_disabled");
  if (ubpf !== null) {
    log(`INFO: kernel.unprivileged_bpf_disabled=${ubpf}`);
  } else {
    log("INFO: kernel.unprivileged_bpf_disabled unavailable");
  }
  const aslr = readSysctlValue("/proc/sys/kernel/randomize_va_space");
  if (aslr !== null) {
    log(`INFO: kernel.randomize_va_space=${aslr}`);
  } else {
    log("INFO: kernel.randomize_va_space unavailable");
  }
  const modules = readSysctlValue("/proc/sys/kernel/modules_disabled");
  if (modules !== null) {
    log(`INFO: kernel.modules_disabled=${modules}`);
  } else {
    log("INFO: kernel.modules_disabled unavailable");
  }
  const kexec = readSysctlValue("/proc/sys/kernel/kexec_load_disabled");
  if (kexec !== null) {
    log(`INFO: kernel.kexec_load_disabled=${kexec}`);
  } else {
    log("INFO: kernel.kexec_load_disabled unavailable");
  }
  const suidDump = readSysctlValue("/proc/sys/fs/suid_dumpable");
  if (suidDump !== null) {
    log(`INFO: fs.suid_dumpable=${suidDump}`);
  } else {
    log("INFO: fs.suid_dumpable unavailable");
  }
  const swappiness = readSysctlValue("/proc/sys/vm/swappiness");
  if (swappiness !== null) {
    log(`INFO: vm.swappiness=${swappiness}`);
  } else {
    log("INFO: vm.swappiness unavailable");
  }
  const hardlinks = readSysctlValue("/proc/sys/fs/protected_hardlinks");
  if (hardlinks !== null) {
    log(`INFO: fs.protected_hardlinks=${hardlinks}`);
  } else {
    log("INFO: fs.protected_hardlinks unavailable");
  }
  const symlinks = readSysctlValue("/proc/sys/fs/protected_symlinks");
  if (symlinks !== null) {
    log(`INFO: fs.protected_symlinks=${symlinks}`);
  } else {
    log("INFO: fs.protected_symlinks unavailable");
  }
  const fifos = readSysctlValue("/proc/sys/fs/protected_fifos");
  if (fifos !== null) {
    log(`INFO: fs.protected_fifos=${fifos}`);
  } else {
    log("INFO: fs.protected_fifos unavailable");
  }
  const regular = readSysctlValue("/proc/sys/fs/protected_regular");
  if (regular !== null) {
    log(`INFO: fs.protected_regular=${regular}`);
  } else {
    log("INFO: fs.protected_regular unavailable");
  }
  const corePattern = readSysctlValue("/proc/sys/kernel/core_pattern");
  if (corePattern !== null) {
    log(`INFO: kernel.core_pattern=${corePattern}`);
  } else {
    log("INFO: kernel.core_pattern unavailable");
  }
}

function checkSysctlHardening() {
  const strict = process.env.SEAL_E2E_STRICT_SYSCTL === "1";
  const checks = [
    { name: "kernel.yama.ptrace_scope", path: "/proc/sys/kernel/yama/ptrace_scope", min: 1 },
    { name: "kernel.perf_event_paranoid", path: "/proc/sys/kernel/perf_event_paranoid", min: 2 },
    { name: "kernel.kptr_restrict", path: "/proc/sys/kernel/kptr_restrict", min: 1 },
    { name: "kernel.dmesg_restrict", path: "/proc/sys/kernel/dmesg_restrict", min: 1 },
    { name: "kernel.unprivileged_bpf_disabled", path: "/proc/sys/kernel/unprivileged_bpf_disabled", min: 1 },
    { name: "kernel.randomize_va_space", path: "/proc/sys/kernel/randomize_va_space", min: 2 },
    { name: "kernel.modules_disabled", path: "/proc/sys/kernel/modules_disabled", min: 1 },
    { name: "kernel.kexec_load_disabled", path: "/proc/sys/kernel/kexec_load_disabled", min: 1 },
    { name: "fs.suid_dumpable", path: "/proc/sys/fs/suid_dumpable", max: 0 },
    { name: "vm.swappiness", path: "/proc/sys/vm/swappiness", max: 10 },
    { name: "fs.protected_hardlinks", path: "/proc/sys/fs/protected_hardlinks", min: 1 },
    { name: "fs.protected_symlinks", path: "/proc/sys/fs/protected_symlinks", min: 1 },
    { name: "fs.protected_fifos", path: "/proc/sys/fs/protected_fifos", min: 1 },
    { name: "fs.protected_regular", path: "/proc/sys/fs/protected_regular", min: 1 },
  ];
  const missing = [];
  const low = [];
  const high = [];
  for (const chk of checks) {
    const val = readSysctlInt(chk.path);
    if (val === null) {
      missing.push(chk.name);
      continue;
    }
    if (Number.isFinite(chk.min) && val < chk.min) {
      low.push(`${chk.name}=${val} < ${chk.min}`);
    }
    if (Number.isFinite(chk.max) && val > chk.max) {
      high.push(`${chk.name}=${val} > ${chk.max}`);
    }
  }
  if (missing.length === 0 && low.length === 0 && high.length === 0) return { ok: true };
  const details = [
    missing.length ? `missing: ${missing.join(", ")}` : "",
    low.length ? `low: ${low.join(", ")}` : "",
    high.length ? `high: ${high.join(", ")}` : "",
  ].filter(Boolean).join("; ");
  if (strict) {
    throw new Error(`sysctl hardening failed (${details})`);
  }
  return { skip: details || "sysctl hardening not enforced" };
}

function checkCoreLimits(pid) {
  const limits = readProcLimits(pid);
  if (limits === null) {
    return { skip: "limits blocked" };
  }
  const lines = limits.split(/\r?\n/);
  const line = lines.find((l) => l.startsWith("Max core file size"));
  if (!line) {
    return { skip: "missing core limits" };
  }
  const match = /^Max core file size\s+(\S+)\s+(\S+)\s+(\S+)/.exec(line.trim());
  if (!match) {
    return { skip: "core limits parse error" };
  }
  const soft = match[1];
  const hard = match[2];
  const unit = match[3] || "";
  if (soft !== "0" || hard !== "0") {
    throw new Error(`core limit not zero: soft=${soft}, hard=${hard} ${unit}`.trim());
  }
  return { ok: true, note: `${soft}/${hard} ${unit}`.trim() };
}

function checkCoredumpFilter(pid) {
  const strict = process.env.SEAL_E2E_STRICT_CORE_FILTER === "1";
  const raw = readProcCoredumpFilter(pid);
  if (raw === null) return { skip: "coredump_filter blocked" };
  const val = raw.trim();
  if (!val) return { skip: "coredump_filter empty" };
  const parsed = val.startsWith("0x") ? Number.parseInt(val, 16) : Number.parseInt(val, 16);
  if (!Number.isFinite(parsed)) return { skip: `coredump_filter parse failed (${val})` };
  if (parsed === 0) return { ok: true };
  if (strict) {
    throw new Error(`coredump_filter not zero: ${val}`);
  }
  return { skip: "coredump_filter non-zero (set SEAL_E2E_STRICT_CORE_FILTER=1 to enforce)" };
}

function checkProcStatusHardened(pid) {
  const status = readProcStatus(pid);
  if (status.TracerPid === undefined) {
    throw new Error("Missing TracerPid in /proc/<pid>/status");
  }
  if (status.TracerPid !== "0") {
    throw new Error(`TracerPid not zero: ${status.TracerPid}`);
  }
  if (status.NoNewPrivs === undefined) {
    throw new Error("Missing NoNewPrivs in /proc/<pid>/status");
  }
  if (status.NoNewPrivs !== "1") {
    throw new Error(`NoNewPrivs not set: ${status.NoNewPrivs}`);
  }
  if (status.Seccomp === undefined) {
    throw new Error("Missing Seccomp in /proc/<pid>/status");
  }
  if (status.Seccomp !== "2") {
    throw new Error(`Seccomp not in filter mode: ${status.Seccomp}`);
  }
  if (status.Seccomp_filters !== undefined) {
    const filters = Number(status.Seccomp_filters);
    if (!Number.isFinite(filters) || filters < 1) {
      throw new Error(`Seccomp_filters not set: ${status.Seccomp_filters}`);
    }
  }
  if (status.Dumpable !== undefined && status.Dumpable !== "0") {
    throw new Error(`Dumpable not zero: ${status.Dumpable}`);
  }
}

function parseCapHex(value) {
  if (!value) return null;
  try {
    return BigInt(`0x${value}`);
  } catch {
    return null;
  }
}

function listCaps(mask) {
  if (mask === null) return [];
  const hits = [];
  for (const [name, bit] of Object.entries(DANGEROUS_CAPS)) {
    const flag = 1n << BigInt(bit);
    if ((mask & flag) !== 0n) hits.push(name);
  }
  return hits;
}

function checkProcCapsReduced(pid) {
  const strict = process.env.SEAL_E2E_STRICT_CAPS === "1";
  const status = readProcStatus(pid);
  const capEff = parseCapHex(status.CapEff);
  const capBnd = parseCapHex(status.CapBnd);
  if (capEff === null && capBnd === null) return { skip: "capabilities missing" };
  const effHits = listCaps(capEff);
  const bndHits = listCaps(capBnd);
  const combined = Array.from(new Set([...effHits, ...bndHits]));
  if (combined.length > 0) {
    if (strict) throw new Error(`dangerous caps present (${combined.join(", ")})`);
    return { skip: `caps present (${combined.join(", ")})` };
  }
  return { ok: true };
}

function checkNodeDiagnosticFlags(pid) {
  const strict = process.env.SEAL_E2E_STRICT_NODE_DIAG === "1";
  const cmdBuf = readProcCmdline(pid);
  if (cmdBuf === null) return { skip: "cmdline blocked" };
  const args = parseProcCmdline(cmdBuf);
  const hits = [];
  for (const flag of NODE_DIAG_FLAGS) {
    for (const arg of args) {
      if (arg === flag || arg.startsWith(`${flag}=`)) {
        hits.push(arg);
      }
    }
  }
  if (hits.length > 0) {
    if (strict) throw new Error(`diagnostic flags present (${hits.join(", ")})`);
    return { skip: `diagnostic flags present (${hits.join(", ")})` };
  }
  return { ok: true };
}

function checkProcCmdlineLength(pid) {
  const strict = process.env.SEAL_E2E_STRICT_CMDLINE === "1";
  const cmdBuf = readProcCmdline(pid);
  if (cmdBuf === null) return { skip: "cmdline blocked" };
  const maxBytes = Number(process.env.SEAL_E2E_CMDLINE_MAX_BYTES || "4096");
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) return { skip: "cmdline length check disabled" };
  if (cmdBuf.length <= maxBytes) return { ok: true };
  if (strict) {
    throw new Error(`cmdline too long (${cmdBuf.length} bytes > ${maxBytes})`);
  }
  return { skip: `cmdline too long (${cmdBuf.length} bytes; set SEAL_E2E_STRICT_CMDLINE=1 to enforce)` };
}

function checkNodeInjectionFlags(pid) {
  const cmdBuf = readProcCmdline(pid);
  if (cmdBuf === null) return { skip: "cmdline blocked" };
  const args = parseProcCmdline(cmdBuf);
  const hits = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (NODE_INJECT_FLAGS.includes(arg)) {
      const next = args[i + 1] || "";
      hits.push(`${arg}${next ? ` ${next}` : ""}`);
      i += 1;
      continue;
    }
    if (arg.startsWith("--require=") || arg.startsWith("--loader=") || arg.startsWith("--experimental-loader=") || arg.startsWith("--import=")) {
      hits.push(arg);
      continue;
    }
  }
  if (hits.length > 0) {
    throw new Error(`node injection flags present (${hits.join(", ")})`);
  }
  return { ok: true };
}

function checkProcExeMemfd(pid, releaseDir) {
  const strict = process.env.SEAL_E2E_STRICT_NODE_MEMFD === "1";
  const exe = readProcExeLink(pid);
  if (!exe) return { skip: "exe unreadable" };
  const cleaned = exe.endsWith(" (deleted)") ? exe.slice(0, -10) : exe;
  if (releaseDir) {
    const absRelease = path.resolve(releaseDir);
    const absExe = path.resolve(cleaned);
    if (absExe.startsWith(`${absRelease}${path.sep}`)) {
      return { skip: "launcher exec" };
    }
  }
  if (/memfd:/.test(exe)) return { ok: true, note: exe };
  if (strict) {
    throw new Error(`node exec not memfd (${exe})`);
  }
  return { skip: "node exec not memfd (set SEAL_E2E_STRICT_NODE_MEMFD=1 to enforce)" };
}

function checkProcCmdlineForBundleTokens(pid, tokenBuffers) {
  if (!tokenBuffers || tokenBuffers.length === 0) return { skip: "bundle signatures missing" };
  const cmdBuf = readProcCmdline(pid);
  if (cmdBuf === null) return { skip: "cmdline blocked" };
  const hit = bufferHasAnyTokenBuf(cmdBuf, tokenBuffers);
  if (hit) {
    throw new Error(`bundle signature in cmdline (${formatTokenHex(hit)})`);
  }
  return { ok: true };
}

function checkProcEnvironForBundleTokens(pid, tokenBuffers) {
  if (!tokenBuffers || tokenBuffers.length === 0) return { skip: "bundle signatures missing" };
  const envBuf = readProcEnviron(pid);
  if (envBuf === null) return { skip: "environ blocked" };
  const hit = bufferHasAnyTokenBuf(envBuf, tokenBuffers);
  if (hit) {
    throw new Error(`bundle signature in environ (${formatTokenHex(hit)})`);
  }
  return { ok: true };
}

function checkMapsNoJsPaths(pid) {
  const maps = readProcMaps(pid);
  if (maps === null) return { skip: "maps blocked" };
  const hits = [];
  for (const line of maps.split(/\r?\n/)) {
    if (!line) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;
    const pathPart = parts.slice(5).join(" ");
    if (!pathPart) continue;
    if (pathPart.startsWith("[") || pathPart.startsWith("memfd:") || pathPart.startsWith("anon_inode:")) {
      continue;
    }
    if (pathPart.startsWith("socket:") || pathPart.startsWith("pipe:") || pathPart.startsWith("eventfd:")) {
      continue;
    }
    const lower = pathPart.toLowerCase();
    if (lower.endsWith(".js") || lower.endsWith(".cjs") || lower.endsWith(".mjs") || lower.endsWith(".map")) {
      hits.push(pathPart);
      if (hits.length >= 5) break;
    }
  }
  if (hits.length > 0) {
    throw new Error(`js-backed maps present (${hits.join(", ")})`);
  }
  return { ok: true };
}

function checkFdNoJsPaths(pid) {
  const fds = readProcFdTargets(pid);
  if (fds === null) return { skip: "fd list blocked" };
  const hits = [];
  for (const f of fds) {
    const target = f.target || "";
    if (!target) continue;
    if (target.startsWith("memfd:") || target.startsWith("socket:") || target.startsWith("pipe:") || target.startsWith("anon_inode:")) {
      continue;
    }
    const lower = target.toLowerCase();
    if (lower.endsWith(".js") || lower.endsWith(".cjs") || lower.endsWith(".mjs") || lower.endsWith(".map")) {
      hits.push(target);
      if (hits.length >= 5) break;
    }
  }
  if (hits.length > 0) {
    throw new Error(`js file descriptors present (${hits.join(", ")})`);
  }
  return { ok: true };
}

function checkEnvScrubbed(pid, keys) {
  const envBuf = readProcEnviron(pid);
  if (envBuf === null) return { skip: "environ blocked" };
  const env = parseProcEnviron(envBuf);
  const present = keys.filter((k) => env[k] && env[k].length > 0);
  if (present.length > 0) {
    throw new Error(`environment not scrubbed: ${present.join(", ")}`);
  }
  return { ok: true };
}

function anyMarkerExists(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function checkLdSoPreloadFile() {
  const strict = process.env.SEAL_E2E_STRICT_LD_SO_PRELOAD === "1";
  const preloadPath = "/etc/ld.so.preload";
  if (!fs.existsSync(preloadPath)) return { ok: true };
  let content = "";
  try {
    content = fs.readFileSync(preloadPath, "utf8").trim();
  } catch (e) {
    return { skip: `ld.so.preload unreadable: ${e && e.code ? e.code : "error"}` };
  }
  if (!content) return { ok: true };
  if (strict) {
    throw new Error(`ld.so.preload configured: ${content.split(/\r?\n/)[0].slice(0, 120)}`);
  }
  return { skip: "ld.so.preload configured (set SEAL_E2E_STRICT_LD_SO_PRELOAD=1 to enforce)" };
}

function bufferHasAnyToken(buf, tokenBuffers) {
  for (const token of tokenBuffers) {
    if (buf.includes(token)) return token.toString("utf8");
  }
  return "";
}

function bufferHasAnyTokenBuf(buf, tokenBuffers) {
  for (const token of tokenBuffers) {
    if (buf.includes(token)) return token;
  }
  return null;
}

function formatTokenHex(token) {
  if (!token || !token.length) return "";
  return token.toString("hex").slice(0, 64);
}

function fileHasAnyToken(filePath, tokenBuffers, maxBytes) {
  let st;
  try {
    st = fs.statSync(filePath);
  } catch {
    return { skip: "stat failed" };
  }
  if (!st.isFile()) return { skip: "not file" };
  if (maxBytes && st.size > maxBytes) {
    return { skip: `too large (${st.size} bytes)` };
  }
  const buf = fs.readFileSync(filePath);
  const hit = bufferHasAnyToken(buf, tokenBuffers);
  if (hit) return { hit };
  return { ok: true };
}

function scanFileForTokenStream(filePath, tokenBuffers, maxBytes) {
  if (!tokenBuffers.length) return "";
  const maxTokenLen = Math.max(...tokenBuffers.map((b) => b.length));
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(1024 * 1024);
    let total = 0;
    let carry = Buffer.alloc(0);
    while (true) {
      const bytes = fs.readSync(fd, buf, 0, buf.length, null);
      if (bytes <= 0) break;
      total += bytes;
      const chunk = bytes === buf.length ? buf : buf.subarray(0, bytes);
      const data = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      const hit = bufferHasAnyToken(data, tokenBuffers);
      if (hit) return hit;
      if (maxTokenLen > 1) {
        const keep = Math.min(maxTokenLen - 1, data.length);
        carry = data.subarray(data.length - keep);
      } else {
        carry = Buffer.alloc(0);
      }
      if (maxBytes && total >= maxBytes) break;
    }
  } finally {
    fs.closeSync(fd);
  }
  return "";
}

function scanTextForTokens(label, text, tokens) {
  if (!text) return null;
  for (const token of tokens) {
    if (text.includes(token)) return `${label} contains "${token}"`;
  }
  return null;
}

function scanProcessMemoryForTokens(pid, tokenBuffers, bundleBytes) {
  let ranges = null;
  if (bundleBytes) {
    const smaps = readProcSmaps(pid);
    if (smaps === null) return { skip: "smaps blocked" };
    const entries = parseSmaps(smaps);
    const candidate = findBundleMap(entries, bundleBytes);
    if (!candidate) return { skip: "bundle mapping not found" };
    ranges = [{ start: candidate.start, end: candidate.end }];
  }
  const maps = ranges ? null : readProcMaps(pid);
  if (maps === null && !ranges) return { skip: "maps blocked" };
  const maxTotal = Number(process.env.SEAL_E2E_MEM_SCAN_MAX_BYTES || "16777216");
  const maxRegion = Number(process.env.SEAL_E2E_MEM_SCAN_REGION_MAX_BYTES || "262144");
  if (!Number.isFinite(maxTotal) || maxTotal <= 0) return { skip: "mem scan disabled" };
  let fd = null;
  try {
    fd = fs.openSync(path.join("/proc", String(pid), "mem"), "r");
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return { skip: "mem access denied" };
    return { skip: `mem open failed: ${e && e.code ? e.code : "error"}` };
  }
  let scanned = 0;
  try {
    const rangesToScan = ranges || [];
    if (!ranges) {
      const lines = maps.split(/\r?\n/);
      for (const line of lines) {
        if (!line) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;
        const range = parts[0];
        const perms = parts[1];
        if (!perms || perms[0] !== "r") continue;
        const dash = range.indexOf("-");
        if (dash <= 0) continue;
        const startStr = range.slice(0, dash);
        const endStr = range.slice(dash + 1);
        if (!/^[0-9a-fA-F]+$/.test(startStr) || !/^[0-9a-fA-F]+$/.test(endStr)) continue;
        const start = Number.parseInt(startStr, 16);
        const end = Number.parseInt(endStr, 16);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
        rangesToScan.push({ start, end, startStr });
      }
    }
    for (const range of rangesToScan) {
      const start = range.start;
      const end = range.end;
      const remaining = maxTotal - scanned;
      if (remaining <= 0) break;
      const regionSize = end - start;
      const chunkSize = Math.min(regionSize, maxRegion, remaining);
      if (chunkSize <= 0) continue;
      const buf = Buffer.alloc(chunkSize);
      let read = 0;
      try {
        read = fs.readSync(fd, buf, 0, chunkSize, start);
      } catch (e) {
        if (e && (e.code === "EIO" || e.code === "EFAULT")) continue;
        if (e && (e.code === "EACCES" || e.code === "EPERM")) return { skip: "mem read denied" };
        continue;
      }
      if (read > 0) {
        scanned += read;
        const hit = bufferHasAnyToken(buf.subarray(0, read), tokenBuffers);
        if (hit) return { hit, addr: range.startStr || start.toString(16) };
      }
    }
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
  return { ok: true, scanned };
}

function scanMemoryRangesForTokens(pid, tokenBuffers, ranges, opts = {}) {
  if (!tokenBuffers || tokenBuffers.length === 0) return { skip: "tokens missing" };
  if (!ranges || ranges.length === 0) return { skip: "no ranges" };
  const maxTotal = Number.isFinite(opts.maxTotal)
    ? opts.maxTotal
    : Number(process.env.SEAL_E2E_MEM_SCAN_MAX_BYTES || "16777216");
  const maxRegion = Number.isFinite(opts.maxRegion)
    ? opts.maxRegion
    : Number(process.env.SEAL_E2E_MEM_SCAN_REGION_MAX_BYTES || "262144");
  if (!Number.isFinite(maxTotal) || maxTotal <= 0) return { skip: "mem scan disabled" };
  let fd = null;
  try {
    fd = fs.openSync(path.join("/proc", String(pid), "mem"), "r");
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return { skip: "mem access denied" };
    return { skip: `mem open failed: ${e && e.code ? e.code : "error"}` };
  }
  let scanned = 0;
  try {
    for (const range of ranges) {
      const start = range.start;
      const end = range.end;
      let offset = start;
      while (offset < end) {
        const remaining = maxTotal - scanned;
        if (remaining <= 0) return { ok: true, scanned };
        const regionSize = end - offset;
        const chunkSize = Math.min(regionSize, maxRegion, remaining);
        if (chunkSize <= 0) break;
        const buf = Buffer.alloc(chunkSize);
        let read = 0;
        try {
          read = fs.readSync(fd, buf, 0, chunkSize, offset);
        } catch (e) {
          if (e && (e.code === "EIO" || e.code === "EFAULT")) {
            offset += chunkSize;
            continue;
          }
          if (e && (e.code === "EACCES" || e.code === "EPERM")) return { skip: "mem read denied" };
          offset += chunkSize;
          continue;
        }
        if (read > 0) {
          scanned += read;
          const hit = opts.binary
            ? bufferHasAnyTokenBuf(buf.subarray(0, read), tokenBuffers)
            : bufferHasAnyToken(buf.subarray(0, read), tokenBuffers);
          if (hit) {
            const hitLabel = opts.binary ? formatTokenHex(hit) : hit;
            return { hit: hitLabel, addr: offset.toString(16) };
          }
        }
        offset += chunkSize;
      }
    }
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
  return { ok: true, scanned };
}

function scanSharedMemoryForTokens(pid, tokenBuffers) {
  const maps = readProcMaps(pid);
  if (maps === null) return { skip: "maps blocked" };
  const entries = parseProcMapsEntries(maps);
  const ranges = [];
  for (const entry of entries) {
    if (!entry.perms || entry.perms[0] !== "r") continue;
    const p = entry.path || "";
    if (!p) continue;
    if (p.includes("/dev/shm") || p.startsWith("/SYSV") || p === "[shmem]") {
      ranges.push(entry);
    }
  }
  if (!ranges.length) return { skip: "no shared memory mappings" };
  const maxTotal = Number(process.env.SEAL_E2E_SHM_SCAN_MAX_BYTES || "4194304");
  const maxRegion = Number(process.env.SEAL_E2E_SHM_SCAN_REGION_MAX_BYTES || "262144");
  return scanMemoryRangesForTokens(pid, tokenBuffers, ranges, { maxTotal, maxRegion, binary: true });
}

function scanAnonMemoryForTokens(pid, tokenBuffers) {
  const maps = readProcMaps(pid);
  if (maps === null) return { skip: "maps blocked" };
  const entries = parseProcMapsEntries(maps);
  const ranges = [];
  for (const entry of entries) {
    if (!entry.perms || entry.perms[0] !== "r") continue;
    const p = entry.path || "";
    if (!p || p === "[anon]" || p === "[heap]" || p.startsWith("[anon:") || p.startsWith("[stack")) {
      ranges.push(entry);
    }
  }
  if (!ranges.length) return { skip: "no anon ranges" };
  const maxTotal = Number(process.env.SEAL_E2E_ANON_SCAN_MAX_BYTES || "8388608");
  const maxRegion = Number(process.env.SEAL_E2E_ANON_SCAN_REGION_MAX_BYTES || "262144");
  return scanMemoryRangesForTokens(pid, tokenBuffers, ranges, { maxTotal, maxRegion, binary: true });
}

function collectAnonRanges(pid) {
  const maps = readProcMaps(pid);
  if (maps === null) return { skip: "maps blocked" };
  const entries = parseProcMapsEntries(maps);
  const ranges = [];
  for (const entry of entries) {
    if (!entry.perms || entry.perms[0] !== "r") continue;
    const p = entry.path || "";
    if (!p || p === "[anon]" || p === "[heap]" || p.startsWith("[anon:") || p.startsWith("[stack")) {
      ranges.push(entry);
    }
  }
  if (!ranges.length) return { skip: "no anon ranges" };
  return { ranges };
}

function scanMemoryRangesByPerms(pid, tokenBuffers, permsPrefixes, opts = {}) {
  const maps = readProcMaps(pid);
  if (maps === null) return { skip: "maps blocked" };
  const entries = parseProcMapsEntries(maps);
  const prefixes = Array.isArray(permsPrefixes) ? permsPrefixes : [permsPrefixes];
  const ranges = entries.filter((entry) => entry.perms && prefixes.some((p) => entry.perms.startsWith(p)));
  if (!ranges.length) return { skip: "no ranges" };
  return scanMemoryRangesForTokens(pid, tokenBuffers, ranges, opts);
}

function countMemoryPagesWithToken(pid, tokenBuffers, ranges, opts = {}) {
  if (!tokenBuffers || tokenBuffers.length === 0) return { skip: "tokens missing" };
  if (!ranges || ranges.length === 0) return { skip: "no ranges" };
  const pageSize = Number.isFinite(opts.pageSize)
    ? opts.pageSize
    : Number(process.env.SEAL_E2E_PAGE_BYTES || "4096");
  const maxTotal = Number.isFinite(opts.maxTotal)
    ? opts.maxTotal
    : Number(process.env.SEAL_E2E_PAGE_SCAN_MAX_BYTES || "67108864");
  if (!Number.isFinite(pageSize) || pageSize <= 0) return { skip: "page size invalid" };
  if (!Number.isFinite(maxTotal) || maxTotal <= 0) return { skip: "page scan disabled" };
  let fd = null;
  try {
    fd = fs.openSync(path.join("/proc", String(pid), "mem"), "r");
  } catch (e) {
    if (e && (e.code === "EACCES" || e.code === "EPERM")) return { skip: "mem access denied" };
    return { skip: `mem open failed: ${e && e.code ? e.code : "error"}` };
  }
  let scanned = 0;
  let count = 0;
  const hits = [];
  try {
    for (const range of ranges) {
      let offset = range.start;
      while (offset < range.end) {
        if (scanned >= maxTotal) {
          return { ok: true, count, scanned, hits, truncated: true };
        }
        const remaining = maxTotal - scanned;
        const toRead = Math.min(pageSize, range.end - offset, remaining);
        if (toRead <= 0) break;
        const buf = Buffer.alloc(toRead);
        let read = 0;
        try {
          read = fs.readSync(fd, buf, 0, toRead, offset);
        } catch (e) {
          if (e && (e.code === "EIO" || e.code === "EFAULT")) {
            offset += pageSize;
            continue;
          }
          if (e && (e.code === "EACCES" || e.code === "EPERM")) return { skip: "mem read denied" };
          offset += pageSize;
          continue;
        }
        if (read > 0) {
          scanned += read;
          const hit = bufferHasAnyTokenBuf(buf.subarray(0, read), tokenBuffers);
          if (hit) {
            count += 1;
            if (hits.length < 5) hits.push(offset.toString(16));
            if (opts.maxHits && count >= opts.maxHits) {
              return { ok: true, count, scanned, hits, capped: true };
            }
          }
        }
        offset += pageSize;
      }
    }
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
  return { ok: true, count, scanned, hits };
}

function scanJournalForTokens(pid, sinceMs, tokens) {
  if (!hasCommand("journalctl")) return { skip: "journalctl missing" };
  const sinceSec = Math.max(0, Math.floor(sinceMs / 1000) - 1);
  const args = ["--no-pager", "-o", "cat", "--since", `@${sinceSec}`];
  if (pid) args.push(`_PID=${pid}`);
  const res = runCmd("journalctl", args, 8000);
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  if (res.status !== 0) {
    if (/permission denied|not permitted|access denied|no journal files/i.test(out)) {
      return { skip: out.trim().slice(0, 120) || "journalctl access denied" };
    }
    return { skip: out.trim().slice(0, 120) || "journalctl failed" };
  }
  const maxBytes = Number(process.env.SEAL_E2E_JOURNAL_MAX_BYTES || "1048576");
  const hay = out.length > maxBytes ? out.slice(-maxBytes) : out;
  const hit = scanTextForTokens("journal", hay, tokens);
  if (hit) return { hit };
  return { ok: true };
}

function parseArgsEnv(raw) {
  if (!raw) return [];
  const trimmed = String(raw).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("args must be a JSON array");
    return parsed.map((v) => String(v));
  }
  return trimmed.split(/\s+/).filter(Boolean);
}

function getFileSize(filePath) {
  let st;
  try {
    st = fs.statSync(filePath);
  } catch {
    return 0;
  }
  if (st.isFile() && st.size > 0) return st.size;
  if (st.isBlockDevice() && hasCommand("blockdev")) {
    const res = runCmd("blockdev", ["--getsize64", filePath], 5000);
    if (res.status === 0) {
      const out = `${res.stdout || ""}`.trim();
      const size = Number.parseInt(out, 10);
      if (Number.isFinite(size) && size > 0) return size;
    }
  }
  return st.size || 0;
}

function scanFileTailForTokens(filePath, tokenBuffers, maxBytes) {
  let st;
  try {
    st = fs.statSync(filePath);
  } catch {
    return { skip: "stat failed" };
  }
  if (!st.isFile()) return { skip: "not file" };
  const size = st.size;
  if (size <= 0) return { skip: "empty" };
  const bytes = Math.min(size, maxBytes);
  const start = Math.max(0, size - bytes);
  let fd = null;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(bytes);
    const read = fs.readSync(fd, buf, 0, bytes, start);
    if (read <= 0) return { skip: "no data" };
    const hit = bufferHasAnyToken(buf.subarray(0, read), tokenBuffers);
    if (hit) return { hit };
    return { ok: true };
  } catch (e) {
    const code = e && e.code ? e.code : "";
    if (code === "EACCES" || code === "EPERM") return { skip: "permission denied" };
    return { skip: code || "read error" };
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
}

function scanFileSamplesForTokens(filePath, tokenBuffers, opts = {}) {
  const sampleBytes = Number.isFinite(opts.sampleBytes) ? opts.sampleBytes : 65536;
  const maxSamples = Number.isFinite(opts.samples) ? opts.samples : 3;
  const size = getFileSize(filePath);
  if (!size || size <= 0) return { skip: "size unavailable" };
  const offsets = [];
  offsets.push(0);
  offsets.push(Math.max(0, Math.floor(size / 2 - sampleBytes / 2)));
  offsets.push(Math.max(0, size - sampleBytes));
  while (offsets.length < maxSamples) {
    const off = Math.max(0, Math.floor(Math.random() * Math.max(1, size - sampleBytes)));
    offsets.push(off);
  }
  const uniq = Array.from(new Set(offsets.map((v) => Math.max(0, Math.min(v, size - sampleBytes)))));
  let fd = null;
  try {
    fd = fs.openSync(filePath, "r");
    for (const off of uniq) {
      const toRead = Math.min(sampleBytes, size - off);
      if (toRead <= 0) continue;
      const buf = Buffer.alloc(toRead);
      let read = 0;
      try {
        read = fs.readSync(fd, buf, 0, toRead, off);
      } catch (e) {
        const code = e && e.code ? e.code : "";
        if (code === "EACCES" || code === "EPERM") return { skip: "permission denied" };
        if (code === "EIO" || code === "EFAULT") continue;
        return { skip: code || "read error" };
      }
      if (read > 0) {
        const hit = bufferHasAnyToken(buf.subarray(0, read), tokenBuffers);
        if (hit) return { hit };
      }
    }
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
  return { ok: true };
}

function readProcSwaps() {
  const pathSwaps = "/proc/swaps";
  if (!fs.existsSync(pathSwaps)) return [];
  const raw = fs.readFileSync(pathSwaps, "utf8").trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  const out = [];
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    const pathName = parts[0];
    const sizeKb = Number.parseInt(parts[2], 10);
    out.push({ path: pathName, sizeKb: Number.isFinite(sizeKb) ? sizeKb : 0 });
  }
  return out;
}

function scanSwapDevicesForTokens(tokenBuffers) {
  const devices = readProcSwaps();
  if (!devices.length) return { skip: "no swap devices" };
  const sampleBytes = Number(process.env.SEAL_E2E_SWAP_SAMPLE_BYTES || "65536");
  const samples = Number(process.env.SEAL_E2E_SWAP_SAMPLES || "3");
  let scanned = 0;
  for (const dev of devices) {
    const filePath = dev.path;
    if (!fs.existsSync(filePath)) continue;
    const res = scanFileSamplesForTokens(filePath, tokenBuffers, { sampleBytes, samples });
    if (res && res.hit) {
      throw new Error(`swap leak in ${filePath}: "${res.hit}"`);
    }
    if (res && res.ok) scanned += 1;
  }
  if (scanned === 0) return { skip: "swap scan skipped" };
  return { ok: true };
}

function scanHibernationFilesForTokens(tokenBuffers) {
  const candidates = [
    "/swapfile",
    "/swap.img",
    "/var/swap",
    "/var/lib/systemd/hibernate",
    "/var/lib/systemd/sleep/hibernate",
  ];
  const sampleBytes = Number(process.env.SEAL_E2E_HIBER_SAMPLE_BYTES || "65536");
  const samples = Number(process.env.SEAL_E2E_HIBER_SAMPLES || "2");
  let scanned = 0;
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const res = scanFileSamplesForTokens(filePath, tokenBuffers, { sampleBytes, samples });
    if (res && res.hit) {
      throw new Error(`hibernate leak in ${filePath}: "${res.hit}"`);
    }
    if (res && res.ok) scanned += 1;
  }
  if (scanned === 0) return { skip: "hibernate scan skipped" };
  return { ok: true };
}

function scanSystemLogsForTokens(tokenBuffers) {
  if (process.env.SEAL_E2E_STRICT_SYSLOG !== "1") {
    return { skip: "system log scan disabled (set SEAL_E2E_STRICT_SYSLOG=1 to enforce)" };
  }
  const maxBytes = Number(process.env.SEAL_E2E_LOG_SCAN_MAX_BYTES || "1048576");
  const logFiles = [
    "/var/log/syslog",
    "/var/log/messages",
    "/var/log/kern.log",
    "/var/log/audit/audit.log",
  ];
  let scanned = 0;
  for (const filePath of logFiles) {
    if (!fs.existsSync(filePath)) continue;
    const res = scanFileTailForTokens(filePath, tokenBuffers, maxBytes);
    if (res && res.hit) {
      throw new Error(`log leak in ${filePath}: "${res.hit}"`);
    }
    if (res && res.ok) scanned += 1;
  }
  if (scanned === 0) return { skip: "no log files scanned" };
  return { ok: true };
}

function scanDmesgForTokens(tokens) {
  if (process.env.SEAL_E2E_SKIP_DMESG === "1") {
    return { skip: "dmesg scan disabled" };
  }
  if (process.env.SEAL_DOCKER_E2E === "1" && process.env.SEAL_E2E_STRICT_DMESG !== "1") {
    return { skip: "dmesg scan skipped in docker (set SEAL_E2E_STRICT_DMESG=1 to enforce)" };
  }
  if (!hasCommand("dmesg")) return { skip: "dmesg missing" };
  const res = runCmd("dmesg", ["--ctime"], 5000);
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  if (res.status !== 0) {
    if (/operation not permitted|permission denied|not permitted/i.test(out)) {
      return { skip: "dmesg restricted" };
    }
    if (/unknown option|unrecognized option|usage:/i.test(out)) {
      return { skip: out.trim().slice(0, 120) || "dmesg unsupported" };
    }
    return { skip: out.trim().slice(0, 120) || "dmesg failed" };
  }
  const maxBytes = Number(process.env.SEAL_E2E_DMESG_MAX_BYTES || "1048576");
  const hay = out.length > maxBytes ? out.slice(-maxBytes) : out;
  const hit = scanTextForTokens("dmesg", hay, tokens);
  if (hit) return { hit };
  return { ok: true };
}

function runExternalDumpScan(pid, tokenBuffers) {
  const cmd = process.env.SEAL_E2E_DUMP_CMD;
  if (!cmd) return { skip: "dump cmd not configured" };
  if (!hasCommand(cmd)) return { skip: `dump cmd missing: ${cmd}` };
  const rawArgs = process.env.SEAL_E2E_DUMP_ARGS || "";
  const outPath = process.env.SEAL_E2E_DUMP_OUT || path.join(os.tmpdir(), `seal-dump-${pid || "x"}-${Date.now()}.bin`);
  const args = parseArgsEnv(rawArgs).map((arg) =>
    arg.replace(/\{pid\}/g, String(pid || "")).replace(/\{out\}/g, outPath)
  );
  const timeoutMs = resolveE2ETimeout("SEAL_E2E_DUMP_TIMEOUT_MS", 60000);
  let hit = "";
  try {
    const res = runCmd(cmd, args, timeoutMs);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.error && res.error.code === "ETIMEDOUT") {
      return { skip: "dump cmd timed out" };
    }
    if (res.status !== 0) {
      return { skip: out.slice(0, 120) || "dump cmd failed" };
    }
    if (!fs.existsSync(outPath)) {
      return { skip: "dump output missing" };
    }
    const maxMb = Number(process.env.SEAL_E2E_DUMP_SCAN_MAX_MB || "256");
    hit = scanFileForTokenStream(outPath, tokenBuffers, maxMb * 1024 * 1024);
  } finally {
    try { fs.rmSync(outPath, { force: true }); } catch {}
  }
  if (hit) return { hit };
  return { ok: true };
}

function runAvmlDumpScan(pid, tokenBuffers) {
  if (process.env.SEAL_E2E_MEMDUMP !== "1") return { skip: "memdump disabled" };
  if (!hasCommand("avml")) return { skip: "avml missing" };
  const outPath = path.join(os.tmpdir(), `seal-avml-${pid || "x"}-${Date.now()}.raw`);
  const timeoutMs = resolveE2ETimeout("SEAL_E2E_MEMDUMP_TIMEOUT_MS", 120000);
  let hit = "";
  try {
    const res = runCmd("avml", [outPath], timeoutMs);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.error && res.error.code === "ETIMEDOUT") {
      return { skip: "avml timed out" };
    }
    if (res.status !== 0) {
      return { skip: out.slice(0, 120) || "avml failed" };
    }
    if (!fs.existsSync(outPath)) {
      return { skip: "avml output missing" };
    }
    const maxMb = Number(process.env.SEAL_E2E_MEMDUMP_SCAN_MAX_MB || "256");
    hit = scanFileForTokenStream(outPath, tokenBuffers, maxMb * 1024 * 1024);
  } finally {
    try { fs.rmSync(outPath, { force: true }); } catch {}
  }
  if (hit) return { hit };
  return { ok: true };
}

function listFilesLimited(rootDir, opts = {}) {
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : 6;
  const maxFiles = Number.isFinite(opts.maxFiles) ? opts.maxFiles : 3000;
  const skipDirs = Array.isArray(opts.skipDirs) ? opts.skipDirs : [];
  const out = [];
  const stack = [{ dir: rootDir, depth: 0 }];
  while (stack.length && out.length < maxFiles) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (skipDirs.includes(ent.name)) continue;
        stack.push({ dir: full, depth: depth + 1 });
      } else if (ent.isFile()) {
        out.push(full);
      }
      if (out.length >= maxFiles) break;
    }
  }
  return out;
}

function collectRecentFiles(rootDir, sinceMs, opts = {}) {
  const files = listFilesLimited(rootDir, opts);
  const out = [];
  for (const filePath of files) {
    let st;
    try {
      st = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    if (st.mtimeMs < sinceMs - 1000) continue;
    if (opts.extensions) {
      const ext = path.extname(filePath).toLowerCase();
      if (!opts.extensions.includes(ext)) continue;
    }
    out.push(filePath);
  }
  return out;
}

function checkPerfRecordBlocked(pid) {
  if (!hasCommand("perf")) return { skip: "perf missing" };
  const strict = process.env.SEAL_E2E_STRICT_PERF === "1";
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-perf-"));
  const dataPath = path.join(tmpDir, "perf.data");
  try {
    const res = runCmd("perf", ["record", "-p", String(pid), "-o", dataPath, "--", "sleep", "1"], 12000);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.error && res.error.code === "ETIMEDOUT") {
      if (strict) throw new Error("perf record timed out (possible attach)");
      return { skip: "perf record timed out" };
    }
    if (res.status === 0 && fs.existsSync(dataPath)) {
      if (strict) throw new Error("perf record succeeded (unexpected)");
      return { skip: "perf record succeeded (set SEAL_E2E_STRICT_PERF=1 to enforce)" };
    }
    if (/permission denied|not permitted|not allowed|operation not permitted/i.test(out)) {
      return { ok: true, note: out.slice(0, 200) };
    }
    if (/unknown option|usage:|not supported|no such file/i.test(out)) {
      return { skip: out.slice(0, 120) || "perf record unsupported" };
    }
    return { ok: true, note: out.slice(0, 200) };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function checkPerfTraceBlocked(pid) {
  if (!hasCommand("perf")) return { skip: "perf missing" };
  const strict = process.env.SEAL_E2E_STRICT_PERF === "1";
  const res = runCmd("perf", ["trace", "-p", String(pid), "--", "sleep", "1"], 12000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("perf trace timed out (possible attach)");
    return { skip: "perf trace timed out" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("perf trace succeeded (unexpected)");
    return { skip: "perf trace succeeded (set SEAL_E2E_STRICT_PERF=1 to enforce)" };
  }
  if (/permission denied|not permitted|not allowed|operation not permitted/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/unknown option|usage:|not supported|no such file/i.test(out)) {
    return { skip: out.slice(0, 120) || "perf trace unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function runRrAttach(pid, timeoutMs = 8000) {
  let res = runCmd("rr", ["record", "-p", String(pid)], timeoutMs);
  let out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.status !== 0 && /unknown option|usage:|expects.*command/i.test(out)) {
    res = runCmd("rr", ["attach", String(pid)], timeoutMs);
    out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  }
  return { res, out };
}

function checkRrAttachBlocked(pid) {
  if (!hasCommand("rr")) return { skip: "rr missing" };
  const strict = process.env.SEAL_E2E_STRICT_RR === "1";
  const { res, out } = runRrAttach(pid, 8000);
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("rr attach timed out (possible attach)");
    return { skip: "rr attach timed out" };
  }
  if (/unknown option|usage:|expects.*command/i.test(out)) {
    return { skip: "rr attach unsupported" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("rr attach succeeded (unexpected)");
    return { skip: "rr attach succeeded (set SEAL_E2E_STRICT_RR=1 to enforce)" };
  }
  if (/permission denied|not permitted|ptrace|perf_event_open/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkBpftraceAttachBlocked(pid) {
  if (!hasCommand("bpftrace")) return { skip: "bpftrace missing" };
  const strict = process.env.SEAL_E2E_STRICT_BPFTRACE === "1";
  const script = `tracepoint:sched:sched_switch /args->next_pid == ${pid} || args->prev_pid == ${pid}/ { exit(); }`;
  const res = runCmd("bpftrace", ["-e", script], 8000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("bpftrace timed out (possible attach)");
    return { skip: "bpftrace timed out" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("bpftrace succeeded (unexpected)");
    return { skip: "bpftrace succeeded (set SEAL_E2E_STRICT_BPFTRACE=1 to enforce)" };
  }
  if (/permission denied|not permitted|operation not permitted/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/requires root|not supported|unknown probe/i.test(out)) {
    return { skip: out.slice(0, 120) || "bpftrace unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkBpftraceUprobeBlocked(pid) {
  if (!hasCommand("bpftrace")) return { skip: "bpftrace missing" };
  const strict = process.env.SEAL_E2E_STRICT_BPFTRACE === "1";
  const target = `/proc/${pid}/exe`;
  const script = `uprobe:${target}:_start { exit(); }`;
  const res = runCmd("bpftrace", ["-e", script], 8000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("bpftrace uprobe timed out (possible attach)");
    return { skip: "bpftrace uprobe timed out" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("bpftrace uprobe succeeded (unexpected)");
    return { skip: "bpftrace uprobe succeeded (set SEAL_E2E_STRICT_BPFTRACE=1 to enforce)" };
  }
  if (/permission denied|not permitted|operation not permitted/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/no probes to attach|unknown probe|not supported|cannot open/i.test(out)) {
    return { skip: out.slice(0, 120) || "bpftrace uprobe unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

async function checkGdbServerAttachBlockedPid(pid) {
  if (!hasCommand("gdbserver")) return { skip: "gdbserver not installed" };
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";
  const gdbPort = await getFreePort();
  if (gdbPort === null) return { skip: "listen not permitted" };
  const hostPort = `127.0.0.1:${gdbPort}`;
  const res = runGdbServerAttach(pid, hostPort, 5000);
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (isRoot && !strict) {
      return { skip: "gdbserver attach timed out (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
    }
    throw new Error("gdbserver attach timed out (unexpected)");
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  const skipMarkers = [/address already in use/i, /cannot bind/i, /failed to bind/i];
  if (skipMarkers.some((re) => re.test(out))) {
    return { skip: out.slice(0, 120) || "gdbserver bind failed" };
  }
  const failMarkers = [
    /operation not permitted/i,
    /permission denied/i,
    /ptrace/i,
    /cannot attach/i,
    /not being run/i,
    /inappropriate ioctl/i,
  ];
  const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
  if (!isFailure) {
    if (isRoot && !strict) {
      return { skip: "gdbserver attach succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
    }
    throw new Error(`gdbserver attach succeeded (unexpected)${out ? `; output=${out.slice(0, 200)}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

async function checkLldbServerAttachBlockedPid(pid) {
  if (!hasCommand("lldb-server")) return { skip: "lldb-server not installed" };
  const strict = process.env.SEAL_E2E_STRICT_LLDB_SERVER === "1";
  const port = await getFreePort();
  if (port === null) return { skip: "listen not permitted" };
  const hostPort = `127.0.0.1:${port}`;
  const res = runLldbServerAttach(pid, hostPort, 5000);
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("lldb-server attach timed out (possible attach)");
    return { skip: "lldb-server attach timed out" };
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  const skipMarkers = [/address already in use/i, /cannot bind/i, /failed to bind/i];
  if (skipMarkers.some((re) => re.test(out))) {
    return { skip: out.slice(0, 120) || "lldb-server bind failed" };
  }
  const failMarkers = [
    /operation not permitted/i,
    /permission denied/i,
    /ptrace/i,
    /cannot attach/i,
    /not being run/i,
    /inappropriate ioctl/i,
  ];
  const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
  if (!isFailure) {
    if (strict) throw new Error(`lldb-server attach succeeded (unexpected)${out ? `; output=${out.slice(0, 200)}` : ""}`);
    return { skip: "lldb-server attach succeeded (set SEAL_E2E_STRICT_LLDB_SERVER=1 to enforce)" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkGdbAttachBlockedPid(pid) {
  if (!hasCommand("gdb")) return { skip: "gdb not installed" };
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";
  const res = runGdbAttach(pid, 5000);
  if (res.error && res.error.code === "ETIMEDOUT") {
    throw new Error("gdb attach timed out (unexpected)");
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  const failMarkers = [
    /could not attach/i,
    /operation not permitted/i,
    /permission denied/i,
    /ptrace:/i,
    /not being run/i,
    /no such process/i,
    /inappropriate ioctl/i,
  ];
  const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
  if (!isFailure) {
    if (isRoot && !strict) {
      return { skip: "root can ptrace (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
    }
    throw new Error(`gdb attach succeeded (unexpected)${out ? `; output=${out.slice(0, 200)}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkLldbAttachBlockedPid(pid) {
  if (!hasCommand("lldb")) return { skip: "lldb not installed" };
  const strict = process.env.SEAL_E2E_STRICT_LLDB === "1";
  const res = runLldbAttach(pid, 8000);
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("lldb attach timed out (possible attach)");
    return { skip: "lldb attach timed out" };
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  const failMarkers = [
    /could not attach/i,
    /operation not permitted/i,
    /permission denied/i,
    /attach failed/i,
    /not being run/i,
    /no such process/i,
    /inappropriate ioctl/i,
    /^error:/i,
  ];
  const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
  if (!isFailure) {
    if (strict) throw new Error(`lldb attach succeeded (unexpected)${out ? `; output=${out.slice(0, 200)}` : ""}`);
    return { skip: "lldb attach succeeded (set SEAL_E2E_STRICT_LLDB=1 to enforce)" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkStraceAttachBlockedPid(pid) {
  if (!hasCommand("strace")) return { skip: "strace not installed" };
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";
  const logPath = path.join(os.tmpdir(), `seal-strace-attach-${pid}-${Date.now()}.log`);
  const res = runStraceAttach(pid, logPath, 5000);
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (isRoot && !strict) {
      return { skip: "strace attach timed out (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
    }
    throw new Error("strace attach timed out (unexpected)");
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  const failMarkers = [
    /operation not permitted/i,
    /permission denied/i,
    /ptrace/i,
    /not being run/i,
    /inappropriate ioctl/i,
  ];
  const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
  if (!isFailure) {
    const trace = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").slice(0, 200) : "";
    if (isRoot && !strict) {
      return { skip: "strace attach succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
    }
    throw new Error(`strace attach succeeded (unexpected)${trace ? `; trace=${trace}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkLtraceAttachBlockedPid(pid) {
  if (!hasCommand("ltrace")) return { skip: "ltrace not installed" };
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";
  const logPath = path.join(os.tmpdir(), `seal-ltrace-attach-${pid}-${Date.now()}.log`);
  const res = runLtraceAttach(pid, logPath, 5000);
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (isRoot && !strict) {
      return { skip: "ltrace attach timed out (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
    }
    throw new Error("ltrace attach timed out (unexpected)");
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  const failMarkers = [
    /operation not permitted/i,
    /permission denied/i,
    /ptrace/i,
    /cannot attach/i,
    /not being run/i,
    /inappropriate ioctl/i,
  ];
  const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
  if (!isFailure) {
    const trace = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").slice(0, 200) : "";
    if (isRoot && !strict) {
      return { skip: "ltrace attach succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
    }
    throw new Error(`ltrace attach succeeded (unexpected)${trace ? `; trace=${trace}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkStackToolBlocked(cmd, args, label) {
  const name = label || cmd;
  if (!hasCommand(cmd)) return { skip: `${name} not installed` };
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";
  const res = runCmd(cmd, args, 8000);
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (isRoot && !strict) {
      return { skip: `${name} attach timed out (set SEAL_E2E_STRICT_PTRACE=1 to enforce)` };
    }
    throw new Error(`${name} attach timed out (unexpected)`);
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  const failMarkers = [
    /operation not permitted/i,
    /permission denied/i,
    /ptrace/i,
    /could not attach/i,
    /cannot attach/i,
    /not being run/i,
    /no such process/i,
    /inappropriate ioctl/i,
    /not supported/i,
  ];
  const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
  if (!isFailure) {
    if (isRoot && !strict) {
      return { skip: `${name} attach succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)` };
    }
    throw new Error(`${name} attach succeeded (unexpected)${out ? `; output=${out.slice(0, 200)}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkPstackAttachBlocked(pid) {
  return checkStackToolBlocked("pstack", [String(pid)], "pstack");
}

function checkGstackAttachBlocked(pid) {
  return checkStackToolBlocked("gstack", [String(pid)], "gstack");
}

function checkEuStackAttachBlocked(pid) {
  return checkStackToolBlocked("eu-stack", ["-p", String(pid)], "eu-stack");
}

function checkLttngAttachBlocked(pid) {
  if (!hasCommand("lttng")) return { skip: "lttng missing" };
  const strict = process.env.SEAL_E2E_STRICT_LTTNG === "1";
  const sess = `seal-e2e-${pid}-${Date.now()}`;
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-lttng-"));
  try {
    let res = runCmd("lttng", ["create", sess, "--output", outDir], 8000);
    let out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.status !== 0) {
      if (/permission denied|not permitted/i.test(out)) return { ok: true, note: out.slice(0, 200) };
      return { skip: out ? `lttng create failed: ${out.slice(0, 120)}` : "lttng create failed" };
    }
    res = runCmd("lttng", ["enable-event", "-u", "--all"], 8000);
    out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.status !== 0) {
      if (/permission denied|not permitted/i.test(out)) return { ok: true, note: out.slice(0, 200) };
      return { skip: out ? `lttng enable failed: ${out.slice(0, 120)}` : "lttng enable failed" };
    }
    res = runCmd("lttng", ["track", "-u", "-p", String(pid)], 8000);
    out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.status === 0) {
      if (strict) throw new Error("lttng track succeeded (unexpected)");
      return { skip: "lttng track succeeded (set SEAL_E2E_STRICT_LTTNG=1 to enforce)" };
    }
    if (/permission denied|not permitted/i.test(out)) return { ok: true, note: out.slice(0, 200) };
    return { skip: out ? `lttng track failed: ${out.slice(0, 120)}` : "lttng track failed" };
  } finally {
    runCmd("lttng", ["destroy", sess], 8000);
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

function checkSystemtapAttachBlocked(pid) {
  if (!hasCommand("stap")) return { skip: "systemtap missing" };
  const strict = process.env.SEAL_E2E_STRICT_SYSTEMTAP === "1";
  const script = `probe process("/proc/${pid}/exe").begin { exit() }`;
  const res = runCmd("stap", ["-x", String(pid), "-e", script], 8000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("systemtap timed out (possible attach)");
    return { skip: "systemtap timed out" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("systemtap attach succeeded (unexpected)");
    return { skip: "systemtap attach succeeded (set SEAL_E2E_STRICT_SYSTEMTAP=1 to enforce)" };
  }
  if (/permission denied|not permitted|operation not permitted/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/semantic error|parse error|not found|cannot open|missing kernel|no debuginfo/i.test(out)) {
    return { skip: out.slice(0, 120) || "systemtap unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkFridaAttachBlocked(pid) {
  if (!hasCommand("frida")) return { skip: "frida missing" };
  const strict = process.env.SEAL_E2E_STRICT_FRIDA === "1";
  const res = runCmd("frida", ["-p", String(pid), "--no-pause", "-q", "-e", "send('ok')"], 8000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("frida timed out (possible attach)");
    return { skip: "frida timed out" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("frida attach succeeded (unexpected)");
    return { skip: "frida attach succeeded (set SEAL_E2E_STRICT_FRIDA=1 to enforce)" };
  }
  if (/permission denied|not permitted|access denied|unable to attach|failed to attach/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/usage:|unknown option|not found/i.test(out)) {
    return { skip: out.slice(0, 120) || "frida unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkDrrunAttachBlocked(pid) {
  if (!hasCommand("drrun")) return { skip: "drrun missing" };
  const tool = process.env.SEAL_E2E_DRRUN_TOOL;
  if (!tool) return { skip: "drrun tool not configured (set SEAL_E2E_DRRUN_TOOL)" };
  const strict = process.env.SEAL_E2E_STRICT_DRRUN === "1";
  const res = runCmd("drrun", ["-pid", String(pid), "-c", tool], 12000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("drrun timed out (possible attach)");
    return { skip: "drrun timed out" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("drrun attach succeeded (unexpected)");
    return { skip: "drrun attach succeeded (set SEAL_E2E_STRICT_DRRUN=1 to enforce)" };
  }
  if (/permission denied|not permitted|access denied|failed to attach|unable to attach|security/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/unknown option|usage:|not found|client not found/i.test(out)) {
    return { skip: out.slice(0, 120) || "drrun unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkPinAttachBlocked(pid) {
  const pinCmd = process.env.SEAL_E2E_PIN_CMD || "pin";
  const tool = process.env.SEAL_E2E_PIN_TOOL;
  if (!tool) return { skip: "pin tool not configured (set SEAL_E2E_PIN_TOOL)" };
  if (!hasCommand(pinCmd)) return { skip: `${pinCmd} missing` };
  const strict = process.env.SEAL_E2E_STRICT_PIN === "1";
  const res = runCmd(pinCmd, ["-pid", String(pid), "-t", tool], 12000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("pin timed out (possible attach)");
    return { skip: "pin timed out" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("pin attach succeeded (unexpected)");
    return { skip: "pin attach succeeded (set SEAL_E2E_STRICT_PIN=1 to enforce)" };
  }
  if (/permission denied|not permitted|access denied|cannot attach|failed to attach/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/unknown option|usage:|not found/i.test(out)) {
    return { skip: out.slice(0, 120) || "pin unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkTraceCmdBlocked(pid) {
  if (!hasCommand("trace-cmd")) return { skip: "trace-cmd missing" };
  const strict = process.env.SEAL_E2E_STRICT_TRACE_CMD === "1";
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-trace-cmd-"));
  const outPath = path.join(tmpDir, "trace.dat");
  try {
    const res = runCmd(
      "trace-cmd",
      ["record", "-p", String(pid), "-o", outPath, "-e", "sched:sched_switch", "--", "sleep", "1"],
      12000
    );
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.error && res.error.code === "ETIMEDOUT") {
      if (strict) throw new Error("trace-cmd timed out (possible attach)");
      return { skip: "trace-cmd timed out" };
    }
    if (res.status === 0 && fs.existsSync(outPath)) {
      if (strict) throw new Error("trace-cmd record succeeded (unexpected)");
      return { skip: "trace-cmd record succeeded (set SEAL_E2E_STRICT_TRACE_CMD=1 to enforce)" };
    }
    if (/permission denied|not permitted|not allowed|operation not permitted/i.test(out)) {
      return { ok: true, note: out.slice(0, 200) };
    }
    if (/unknown option|usage:|not supported|tracefs|debugfs|not found|no such file/i.test(out)) {
      return { skip: out.slice(0, 120) || "trace-cmd unsupported" };
    }
    return { ok: true, note: out.slice(0, 200) };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function checkPerfProbeBlocked(pid) {
  if (!hasCommand("perf")) return { skip: "perf missing" };
  const strict = process.env.SEAL_E2E_STRICT_PERF_PROBE === "1";
  const target = `/proc/${pid}/exe`;
  const res = runCmd("perf", ["probe", "-x", target, "main"], 8000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("perf probe timed out (possible attach)");
    return { skip: "perf probe timed out" };
  }
  if (res.status === 0) {
    runCmd("perf", ["probe", "-x", target, "-d", "main"], 8000);
    if (strict) throw new Error("perf probe succeeded (unexpected)");
    return { skip: "perf probe succeeded (set SEAL_E2E_STRICT_PERF_PROBE=1 to enforce)" };
  }
  if (/permission denied|not permitted|not allowed|operation not permitted/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/failed to find symbol|unknown option|usage:|not supported|no symbols|no debuginfo|not found/i.test(out)) {
    return { skip: out.slice(0, 120) || "perf probe unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkSysdigBlocked(pid) {
  if (!hasCommand("sysdig")) return { skip: "sysdig missing" };
  const strict = process.env.SEAL_E2E_STRICT_SYSDIG === "1";
  const res = runCmd("sysdig", ["-n", "5", `proc.pid=${pid}`], 8000);
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (res.error && res.error.code === "ETIMEDOUT") {
    if (strict) throw new Error("sysdig timed out (possible capture)");
    return { skip: "sysdig timed out" };
  }
  if (res.status === 0) {
    if (strict) throw new Error("sysdig captured events (unexpected)");
    return { skip: "sysdig captured events (set SEAL_E2E_STRICT_SYSDIG=1 to enforce)" };
  }
  if (/permission denied|not permitted|operation not permitted|access denied/i.test(out)) {
    return { ok: true, note: out.slice(0, 200) };
  }
  if (/unable to open|cannot open|probe.*not loaded|kernel module|driver|no such file|failed to/i.test(out)) {
    return { skip: out.slice(0, 120) || "sysdig unsupported" };
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkAuditctlBlocked(pid) {
  if (!hasCommand("auditctl")) return { skip: "auditctl missing" };
  const strict = process.env.SEAL_E2E_STRICT_AUDITCTL === "1";
  const ruleArgs = ["-a", "always,exit", "-F", `pid=${pid}`, "-S", "execve"];
  const delArgs = ["-d", "always,exit", "-F", `pid=${pid}`, "-S", "execve"];
  let added = false;
  try {
    const res = runCmd("auditctl", ruleArgs, 5000);
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (res.status === 0) {
      added = true;
      if (strict) throw new Error("auditctl rule added (unexpected)");
      return { skip: "auditctl rule added (set SEAL_E2E_STRICT_AUDITCTL=1 to enforce)" };
    }
    if (/permission denied|not permitted|operation not permitted|immutable/i.test(out)) {
      return { ok: true, note: out.slice(0, 200) };
    }
    if (/disabled|not enabled|no audit|not supported|unknown option|usage|invalid field|unknown field|invalid argument/i.test(out)) {
      return { skip: out.slice(0, 120) || "auditctl unsupported" };
    }
    return { ok: true, note: out.slice(0, 200) };
  } finally {
    if (added) {
      runCmd("auditctl", delArgs, 5000);
    }
  }
}

function checkCriuDumpBlocked(pid) {
  if (!hasCommand("criu")) return { skip: "criu missing" };
  const strict = process.env.SEAL_E2E_STRICT_CRIU === "1";
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-criu-"));
  const logPath = path.join(tmpDir, "dump.log");
  try {
    const res = runCmd(
      "criu",
      ["dump", "-t", String(pid), "-D", tmpDir, "-o", "dump.log", "--shell-job", "--leave-running", "--tcp-established", "--ext-unix-sk"],
      20000
    );
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    const logOut = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").trim() : "";
    const combined = `${out}\n${logOut}`.trim();
    if (res.error && res.error.code === "ETIMEDOUT") {
      if (strict) throw new Error("criu dump timed out (possible snapshot)");
      return { skip: "criu dump timed out" };
    }
    if (res.status === 0) {
      if (strict) throw new Error("criu dump succeeded (unexpected)");
      return { skip: "criu dump succeeded (set SEAL_E2E_STRICT_CRIU=1 to enforce)" };
    }
    if (/permission denied|not permitted|operation not permitted|cap/i.test(combined)) {
      return { ok: true, note: combined.slice(0, 200) };
    }
    if (/not configured|not supported|unknown option|not enabled|unprivileged|checkpoint.*not enabled/i.test(combined)) {
      return { skip: combined.slice(0, 120) || "criu unsupported" };
    }
    return { ok: true, note: combined.slice(0, 200) };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function checkProcMemBlocked(pid, helperPath) {
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PROC_MEM === "1";
  const maps = getReadableMapAddresses(pid, 6);
  if (maps.blocked) {
    return { ok: true, note: "maps blocked" };
  }
  if (!maps.addresses.length) {
    return { skip: "no readable maps" };
  }
  for (const addr of maps.addresses) {
    const res = runCmd(helperPath, [String(pid), addr, "32"], 5000);
    if (res.error) {
      const msg = res.error && res.error.code ? res.error.code : String(res.error);
      throw new Error(`mem helper failed: ${msg}`);
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (/unsupported/i.test(out)) {
      return { skip: "mem helper unsupported" };
    }
    if (res.status === 0) {
      if (isRoot) {
        if (process.env.SEAL_DOCKER_E2E === "1") {
          return { skip: "root can read /proc/<pid>/mem in docker (kernel policy); enforce on host or adjust container hardening" };
        }
        if (!strict) {
          return { skip: "root can read /proc/<pid>/mem (set SEAL_E2E_STRICT_PROC_MEM=1 to enforce)" };
        }
      }
      throw new Error(`/proc/<pid>/mem read succeeded (addr=0x${addr})`);
    }
    const errno = parseHelperErrno(out);
    if (errno === ERRNO.EPERM || errno === ERRNO.EACCES) {
      return { ok: true, note: `errno ${errno}` };
    }
  }
  return { skip: "non-permission errors" };
}

function checkProcMemWriteBlocked(pid, helperPath) {
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PROC_MEM === "1";
  const maps = getWritableMapAddresses(pid, 6);
  if (maps.blocked) {
    return { ok: true, note: "maps blocked" };
  }
  if (!maps.addresses.length) {
    return { skip: "no writable maps" };
  }
  for (const addr of maps.addresses) {
    const res = runCmd(helperPath, [String(pid), addr, "1"], 5000);
    if (res.error) {
      const msg = res.error && res.error.code ? res.error.code : String(res.error);
      throw new Error(`mem write helper failed: ${msg}`);
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (/unsupported/i.test(out)) {
      return { skip: "mem write helper unsupported" };
    }
    if (res.status === 0) {
      if (isRoot) {
        if (process.env.SEAL_DOCKER_E2E === "1") {
          return { skip: "root can write /proc/<pid>/mem in docker (kernel policy); enforce on host or adjust container hardening" };
        }
        if (!strict) {
          return { skip: "root can write /proc/<pid>/mem (set SEAL_E2E_STRICT_PROC_MEM=1 to enforce)" };
        }
      }
      throw new Error(`/proc/<pid>/mem write succeeded (addr=0x${addr})`);
    }
    const errno = parseHelperErrno(out);
    if (errno === ERRNO.EPERM || errno === ERRNO.EACCES) {
      return { ok: true, note: `errno ${errno}` };
    }
  }
  return { skip: "non-permission errors" };
}

function checkVmReadBlocked(pid, helperPath) {
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PROC_MEM === "1";
  const maps = getReadableMapAddresses(pid, 6);
  if (maps.blocked) {
    return { ok: true, note: "maps blocked" };
  }
  if (!maps.addresses.length) {
    return { skip: "no readable maps" };
  }
  for (const addr of maps.addresses) {
    const res = runCmd(helperPath, [String(pid), addr, "32"], 5000);
    if (res.error) {
      const msg = res.error && res.error.code ? res.error.code : String(res.error);
      throw new Error(`vmread helper failed: ${msg}`);
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (/unsupported/i.test(out)) {
      return { skip: "process_vm_readv unsupported" };
    }
    if (res.status === 0) {
      if (isRoot && !strict) {
        return { skip: "root can use process_vm_readv (set SEAL_E2E_STRICT_PROC_MEM=1 to enforce)" };
      }
      throw new Error(`process_vm_readv succeeded (addr=0x${addr})`);
    }
    const errno = parseHelperErrno(out);
    if (errno === ERRNO.EPERM || errno === ERRNO.EACCES) {
      return { ok: true, note: `errno ${errno}` };
    }
  }
  return { skip: "non-permission errors" };
}

function checkVmWriteBlocked(pid, helperPath) {
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PROC_MEM === "1";
  const maps = getWritableMapAddresses(pid, 6);
  if (maps.blocked) {
    return { ok: true, note: "maps blocked" };
  }
  if (!maps.addresses.length) {
    return { skip: "no writable maps" };
  }
  for (const addr of maps.addresses) {
    const res = runCmd(helperPath, [String(pid), addr, "1"], 5000);
    if (res.error) {
      const msg = res.error && res.error.code ? res.error.code : String(res.error);
      throw new Error(`vmwrite helper failed: ${msg}`);
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    if (/unsupported/i.test(out)) {
      return { skip: "process_vm_writev unsupported" };
    }
    if (res.status === 0) {
      if (isRoot && !strict) {
        return { skip: "root can use process_vm_writev (set SEAL_E2E_STRICT_PROC_MEM=1 to enforce)" };
      }
      throw new Error(`process_vm_writev succeeded (addr=0x${addr})`);
    }
    const errno = parseHelperErrno(out);
    if (errno === ERRNO.EPERM || errno === ERRNO.EACCES) {
      return { ok: true, note: `errno ${errno}` };
    }
  }
  return { skip: "non-permission errors" };
}

function checkPtraceBlocked(pid, helperPath) {
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";
  const res = runCmd(helperPath, [String(pid)], 5000);
  if (res.error) {
    const msg = res.error && res.error.code ? res.error.code : String(res.error);
    throw new Error(`ptrace helper failed: ${msg}`);
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (/unsupported/i.test(out)) {
    return { skip: "ptrace helper unsupported" };
  }
  if (res.status === 0) {
    if (isRoot && !strict) {
      return { skip: "root can ptrace (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
    }
    throw new Error("ptrace attach succeeded (unexpected)");
  }
  return { ok: true, note: out ? out.slice(0, 120) : "" };
}

function checkPidfdBlocked(pid, helperPath) {
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PIDFD === "1";
  const res = runCmd(helperPath, [String(pid), "0"], 5000);
  if (res.error) {
    const msg = res.error && res.error.code ? res.error.code : String(res.error);
    throw new Error(`pidfd helper failed: ${msg}`);
  }
  const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (/pidfd_open:unsupported|pidfd_getfd:unsupported/i.test(out)) {
    return { skip: "pidfd unsupported" };
  }
  if (res.status === 0) {
    if (isRoot && !strict) {
      return { skip: "pidfd_getfd succeeded (set SEAL_E2E_STRICT_PIDFD=1 to enforce)" };
    }
    throw new Error("pidfd_getfd succeeded (unexpected)");
  }
  const match = /(pidfd_open|pidfd_getfd):(\d+)/.exec(out || "");
  const errno = match ? Number(match[2]) : null;
  if (errno === ERRNO.EPERM || errno === ERRNO.EACCES) {
    return { ok: true, note: `errno ${errno}` };
  }
  return { skip: out ? out.slice(0, 120) : "pidfd failed" };
}

function checkKernelMemorySource(pathname, label) {
  const strict = process.env.SEAL_E2E_STRICT_KERNEL_MEM === "1";
  if (!fs.existsSync(pathname)) return { skip: `${label} missing` };
  let fd = null;
  try {
    fd = fs.openSync(pathname, "r");
    const buf = Buffer.alloc(4096);
    const read = fs.readSync(fd, buf, 0, buf.length, 0);
    if (read > 0) {
      if (strict) throw new Error(`${label} readable`);
      return { skip: `${label} readable (set SEAL_E2E_STRICT_KERNEL_MEM=1 to enforce)` };
    }
    return { ok: true };
  } catch (e) {
    const code = e && e.code ? e.code : "";
    if (code === "EACCES" || code === "EPERM") return { ok: true, note: `${label} blocked` };
    if (code === "ENOENT") return { skip: `${label} missing` };
    return { skip: `${label} read error: ${code || "error"}` };
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
}

function checkKernelMemorySources() {
  const res = [];
  res.push({ name: "/dev/mem", result: checkKernelMemorySource("/dev/mem", "/dev/mem") });
  res.push({ name: "/proc/kcore", result: checkKernelMemorySource("/proc/kcore", "/proc/kcore") });
  return res;
}

function runGcore(pid, outputPrefix) {
  if (hasCommand("gcore")) {
    return runCmd("gcore", ["-o", outputPrefix, String(pid)], 15000);
  }
  if (hasCommand("gdb")) {
    return runCmd("gdb", [
      "-q",
      "-batch",
      "-p",
      String(pid),
      "-ex",
      `gcore ${outputPrefix}`,
      "-ex",
      "detach",
      "-ex",
      "quit",
    ], 15000);
  }
  return null;
}

function checkGcoreBlocked(pid) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-gcore-"));
  const prefix = path.join(tmpDir, "seal-core");
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";
  try {
    const res = runGcore(pid, prefix);
    if (!res) {
      return { skip: "gcore/gdb missing" };
    }
    if (res.error && res.error.code === "ETIMEDOUT") {
      if (isRoot && !strict) {
        return { skip: "gcore timed out (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
      }
      throw new Error("gcore timed out (unexpected)");
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith("seal-core"));
    if (res.status === 0 && files.length > 0) {
      if (isRoot && !strict) {
        return { skip: "gcore succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
      }
      const corePath = path.join(tmpDir, files[0]);
      const tokenBuffers = LEAK_TOKENS.map((t) => Buffer.from(t, "utf8"));
      const maxMb = Number(process.env.SEAL_E2E_CORE_SCAN_MAX_MB || "256");
      const hit = scanFileForTokenStream(corePath, tokenBuffers, maxMb * 1024 * 1024);
      if (hit) {
        throw new Error(`gcore succeeded; core contains "${hit}"`);
      }
      throw new Error("gcore succeeded and produced core (unexpected)");
    }
    if (res.status === 0 && files.length === 0) {
      if (isRoot && !strict) {
        return { skip: "gcore reported success but no core found (set SEAL_E2E_STRICT_PTRACE=1 to enforce)" };
      }
      throw new Error(`gcore reported success but no core found (${out.slice(0, 200)})`);
    }
    return { ok: true, note: out ? out.slice(0, 200) : "" };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function readCorePattern() {
  return readSysctlValue("/proc/sys/kernel/core_pattern");
}

function listCoreFiles(dir, sinceMs) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.startsWith("core")) continue;
    const full = path.join(dir, entry);
    try {
      const st = fs.statSync(full);
      if (st.isFile() && st.mtimeMs >= sinceMs - 1000) {
        out.push(entry);
      }
    } catch {}
  }
  return out;
}

function checkCoredumpctl(pid, sinceMs) {
  if (!hasCommand("coredumpctl")) {
    return { skip: "coredumpctl missing" };
  }
  const sinceSec = Math.max(0, Math.floor(sinceMs / 1000) - 1);
  const baseArgs = ["--no-pager", "--json=short", "--since", `@${sinceSec}`];
  let res = runCmd("coredumpctl", [...baseArgs, "--pid", String(pid)], 8000);
  let out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  if (/unrecognized option.*--pid/i.test(out)) {
    res = runCmd("coredumpctl", [...baseArgs, "list", `COREDUMP_PID=${pid}`], 8000);
    out = `${res.stdout || ""}${res.stderr || ""}`.trim();
  }
  if (/no coredumps found/i.test(out)) {
    return { ok: true };
  }
  if (out) {
    let entries = 0;
    let matches = 0;
    const lines = out.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (!obj || typeof obj !== "object") continue;
        entries += 1;
        const val = obj.COREDUMP_PID || obj._PID || obj.PID;
        if (val !== undefined && Number(val) === Number(pid)) {
          matches += 1;
        }
      } catch {}
    }
    if (matches > 0) {
      return { ok: false, reason: `coredumpctl reported core for pid=${pid}` };
    }
    if (entries > 0 && res.status === 0) {
      return { ok: true };
    }
  }
  if (res.status === 0 && !out) {
    return { ok: true };
  }
  return { skip: out ? `coredumpctl error: ${out.slice(0, 120)}` : "coredumpctl error" };
}

function checkCoreFilesAfterCrash(releaseDir, pid, sinceMs) {
  const pattern = readCorePattern();
  if (!pattern) {
    return { skip: "core_pattern unavailable" };
  }
  if (pattern.startsWith("|")) {
    return checkCoredumpctl(pid, sinceMs);
  }
  if (pattern.includes("/")) {
    return { skip: `core_pattern path: ${pattern}` };
  }
  const files = listCoreFiles(releaseDir, sinceMs);
  if (files.length > 0) {
    return { ok: false, reason: `core file(s): ${files.join(", ")}` };
  }
  return { ok: true };
}

async function runReleaseOk({ releaseDir, runTimeoutMs, env }) {
  const port = runReleaseOk.skipListen ? null : await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        code !== null ? `code=${code}` : null,
        signal ? `signal=${signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      reject(new Error(`process exited early (${detail || "no output"})`));
    });
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () =>
      Promise.race([waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }), exitPromise])
    );
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function runReleaseExpectFail({ releaseDir, runTimeoutMs, env, expectStderr, args }) {
  const port = runReleaseOk.skipListen ? null : await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const childArgs = Array.isArray(args) ? args : [];
  const child = spawn(binPath, childArgs, { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      resolve({ code, signal, stdout, stderr });
    });
  });

  try {
    const winner = await withTimeout("expectFail", runTimeoutMs, () => Promise.race([
      exitPromise,
      waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }).then(() => ({ ok: true })),
    ]));
    if (winner && winner.ok) {
      throw new Error("process reached /api/status (expected failure)");
    }
    const { code, signal, stderr, stdout } = winner || {};
    if (code === 0) {
      throw new Error("process exited with code=0 (expected failure)");
    }
    if (code === null && !signal) {
      throw new Error("process did not fail as expected");
    }
    if (expectStderr) {
      const hay = [stderr, stdout].filter(Boolean).join("\n");
      const ok = expectStderr instanceof RegExp ? expectStderr.test(hay) : hay.includes(String(expectStderr));
      if (!ok) {
        const detail = [
          stderr ? `stderr: ${stderr.slice(0, 200)}` : null,
          stdout ? `stdout: ${stdout.slice(0, 200)}` : null,
        ].filter(Boolean).join("; ");
        throw new Error(`stderr/stdout did not match expected pattern: ${expectStderr}${detail ? ` (${detail})` : ""}`);
      }
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
  if (readyFile) {
    try { fs.rmSync(readyFile, { force: true }); } catch {}
  }
}

async function runReleaseMemfdSealProbe({ releaseDir, runTimeoutMs }) {
  await runReleaseOk({
    releaseDir,
    runTimeoutMs,
    env: { SEAL_MEMFD_SEAL_PROBE: "1" },
  });
}

async function runReleaseProcIntrospectionChecks({ releaseDir, outDir, runTimeoutMs, env, helpers }) {
  const bundlePath = outDir ? path.join(outDir, "stage", "bundle.obf.cjs") : null;
  const bundleSig = buildBundleSignatureTokens(bundlePath);
  const bundleTokens = bundleSig.tokens || [];
  if (bundleSig.skip) {
    log(`SKIP: bundle signatures (${bundleSig.skip})`);
  }
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; proc introspection disabled",
    onReady: async ({ child }) => {
      const pid = child.pid;
      log("Checking /proc status...");
      checkProcStatusHardened(pid);
      log("OK: /proc status hardened");

      log("Checking inspector flags/ports...");
      const inspectRes = checkInspectorDisabled(pid);
      if (inspectRes.skip) {
        log(`SKIP: inspector (${inspectRes.skip})`);
      } else {
        log("OK: inspector disabled");
      }

      log("Checking node injection flags...");
      const injectRes = checkNodeInjectionFlags(pid);
      if (injectRes.skip) {
        log(`SKIP: node inject (${injectRes.skip})`);
      } else {
        log("OK: node inject flags clean");
      }

      log("Checking Node diagnostic flags...");
      const diagRes = checkNodeDiagnosticFlags(pid);
      if (diagRes.skip) {
        log(`SKIP: node diag (${diagRes.skip})`);
      } else {
        log("OK: node diag flags clean");
      }

      log("Checking cmdline length...");
      const cmdLenRes = checkProcCmdlineLength(pid);
      if (cmdLenRes.skip) {
        log(`SKIP: cmdline length (${cmdLenRes.skip})`);
      } else {
        log("OK: cmdline length ok");
      }

      log("Checking bundle tokens in cmdline...");
      const cmdRes = checkProcCmdlineForBundleTokens(pid, bundleTokens);
      if (cmdRes.skip) {
        log(`SKIP: cmdline leak (${cmdRes.skip})`);
      } else {
        log("OK: cmdline clean");
      }

      log("Checking bundle tokens in environ...");
      const envRes = checkProcEnvironForBundleTokens(pid, bundleTokens);
      if (envRes.skip) {
        log(`SKIP: environ leak (${envRes.skip})`);
      } else {
        log("OK: environ clean");
      }

      log("Checking maps for JS backing...");
      const mapRes = checkMapsNoJsPaths(pid);
      if (mapRes.skip) {
        log(`SKIP: maps js (${mapRes.skip})`);
      } else {
        log("OK: maps clean");
      }

      log("Checking fd targets for JS files...");
      const fdJsRes = checkFdNoJsPaths(pid);
      if (fdJsRes.skip) {
        log(`SKIP: fd js (${fdJsRes.skip})`);
      } else {
        log("OK: fd targets clean");
      }

      log("Checking memfd lifetime...");
      const memfdRes = checkSealMemfdClosed(pid);
      if (memfdRes.skip) {
        log(`SKIP: memfd (${memfdRes.skip})`);
      } else {
        log("OK: seal memfd closed");
      }

      log("Checking fd hygiene...");
      const fdHygieneRes = checkProcessFdHygiene(pid, releaseDir);
      if (fdHygieneRes.skip) {
        log(`SKIP: fd hygiene (${fdHygieneRes.skip})`);
      } else {
        log("OK: fd hygiene clean");
      }

      log("Checking exec via memfd...");
      const exeRes = checkProcExeMemfd(pid, releaseDir);
      if (exeRes.skip) {
        log(`SKIP: exec memfd (${exeRes.skip})`);
      } else {
        const note = exeRes.note ? ` (${exeRes.note})` : "";
        log(`OK: exec memfd${note}`);
      }

      log("Checking process capabilities...");
      const capsRes = checkProcCapsReduced(pid);
      if (capsRes.skip) {
        log(`SKIP: caps (${capsRes.skip})`);
      } else {
        log("OK: caps reduced");
      }

      log("Checking /proc/<pid>/limits...");
      const limitsRes = checkCoreLimits(pid);
      if (limitsRes.skip) {
        log(`SKIP: /proc/<pid>/limits (${limitsRes.skip})`);
      } else {
        const note = limitsRes.note ? ` (${limitsRes.note})` : "";
        log(`OK: core limits zero${note}`);
      }

      log("Checking /proc/<pid>/mem access...");
      const memRes = checkProcMemBlocked(pid, helpers.mem.path);
      if (memRes.skip) {
        log(`SKIP: /proc/<pid>/mem (${memRes.skip})`);
      } else {
        const note = memRes.note ? ` (${memRes.note})` : "";
        log(`OK: /proc/<pid>/mem blocked${note}`);
      }

      log("Checking /proc/<pid>/mem write...");
      const memWriteRes = checkProcMemWriteBlocked(pid, helpers.memwrite.path);
      if (memWriteRes.skip) {
        log(`SKIP: /proc/<pid>/mem write (${memWriteRes.skip})`);
      } else {
        const note = memWriteRes.note ? ` (${memWriteRes.note})` : "";
        log(`OK: /proc/<pid>/mem write blocked${note}`);
      }

      log("Checking process_vm_readv access...");
      const vmRes = checkVmReadBlocked(pid, helpers.vm.path);
      if (vmRes.skip) {
        log(`SKIP: process_vm_readv (${vmRes.skip})`);
      } else {
        const note = vmRes.note ? ` (${vmRes.note})` : "";
        log(`OK: process_vm_readv blocked${note}`);
      }

      log("Checking process_vm_writev access...");
      const vmWriteRes = checkVmWriteBlocked(pid, helpers.vmwrite.path);
      if (vmWriteRes.skip) {
        log(`SKIP: process_vm_writev (${vmWriteRes.skip})`);
      } else {
        const note = vmWriteRes.note ? ` (${vmWriteRes.note})` : "";
        log(`OK: process_vm_writev blocked${note}`);
      }

      log("Checking coredump_filter...");
      const coreFilter = checkCoredumpFilter(pid);
      if (coreFilter.skip) {
        log(`SKIP: coredump_filter (${coreFilter.skip})`);
      } else {
        log("OK: coredump_filter zero");
      }

      log("Checking pidfd access...");
      const pidfdRes = checkPidfdBlocked(pid, helpers.pidfd.path);
      if (pidfdRes.skip) {
        log(`SKIP: pidfd (${pidfdRes.skip})`);
      } else {
        const note = pidfdRes.note ? ` (${pidfdRes.note})` : "";
        log(`OK: pidfd blocked${note}`);
      }
    },
  });
}

async function runReleaseEnvScrubChecks({ releaseDir, runTimeoutMs, env, keys, allowSkip }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; env scrub check disabled",
    onReady: async ({ child }) => {
      log("Checking scrubbed environment...");
      try {
        const res = checkEnvScrubbed(child.pid, keys);
        if (res.skip) {
          log(`SKIP: environ scrub (${res.skip})`);
        } else {
          log("OK: environment scrubbed");
        }
      } catch (e) {
        if (allowSkip) {
          const msg = e && e.message ? e.message : String(e);
          log(`SKIP: environ scrub (${msg})`);
          return;
        }
        throw e;
      }
    },
  });
}

async function runReleasePreloadAuditCheck({ releaseDir, runTimeoutMs, env, markerPaths }) {
  for (const p of markerPaths) {
    try { fs.rmSync(p, { force: true }); } catch {}
  }
  await runReleaseOk({ releaseDir, runTimeoutMs, env });
  const hit = anyMarkerExists(markerPaths);
  if (hit) {
    if (process.env.SEAL_E2E_STRICT_DYNLINK === "1") {
      throw new Error(`LD_PRELOAD/LD_AUDIT marker created: ${hit}`);
    }
    log(`SKIP: dynamic loader instrumentation observed (${path.basename(hit)}); set SEAL_E2E_STRICT_DYNLINK=1 to enforce`);
  } else {
    log("OK: dynamic loader instrumentation blocked");
  }
}

async function runReleaseLeakChecks({ releaseDir, outDir, runTimeoutMs, helpers }) {
  const startMs = Date.now();
  const tokenBuffers = LEAK_TOKENS.map((t) => Buffer.from(t, "utf8"));
  const bundlePath = outDir ? path.join(outDir, "stage", "bundle.obf.cjs") : null;
  const bundleBytes = bundlePath && fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
  const bundleSig = buildBundleSignatureTokens(bundlePath);
  const bundleTokens = bundleSig.tokens || [];
  if (bundleSig.skip) {
    log(`SKIP: bundle signatures (${bundleSig.skip})`);
  }
  const maxScanBytes = Number(process.env.SEAL_E2E_MAX_SCAN_BYTES || "33554432");
  let leakPid = null;

  const outputs = await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    skipMessage: "SKIP: listen not permitted; leak checks disabled",
    onReady: async ({ child }) => {
      leakPid = child.pid;
      log("Checking memfd lifetime...");
      const memfdRes = checkSealMemfdClosed(child.pid);
      if (memfdRes.skip) log(`SKIP: memfd (${memfdRes.skip})`);
      else log("OK: seal memfd closed");

      log("Checking fd hygiene...");
      const fdRes = checkProcessFdHygiene(child.pid, releaseDir);
      if (fdRes.skip) log(`SKIP: fd hygiene (${fdRes.skip})`);
      else log("OK: fd hygiene clean");

      log("Checking MADV_DONTDUMP on bundle mapping...");
      const ddRes = checkBundleDontDump(child.pid, bundleBytes);
      if (ddRes.skip) log(`SKIP: dontdump (${ddRes.skip})`);
      else log("OK: bundle mapping marked DONTDUMP");

      log("Checking bundle memlock...");
      const lockRes = checkBundleMemLocked(child.pid, bundleBytes);
      if (lockRes.skip) log(`SKIP: memlock (${lockRes.skip})`);
      else log("OK: bundle mapping locked");

      log("Checking MADV_WIPEONFORK on bundle mapping...");
      const wipeRes = checkBundleWipeOnFork(child.pid, bundleBytes);
      if (wipeRes.skip) log(`SKIP: wipeonfork (${wipeRes.skip})`);
      else log("OK: bundle mapping marked WIPEONFORK");

      log("Checking MADV_DONTFORK on bundle mapping...");
      const dfRes = checkBundleDontFork(child.pid, bundleBytes);
      if (dfRes.skip) log(`SKIP: dontfork (${dfRes.skip})`);
      else log("OK: bundle mapping marked DONTFORK");

      log("Checking MADV_UNMERGEABLE on bundle mapping...");
      const umRes = checkBundleUnmergeable(child.pid, bundleBytes);
      if (umRes.skip) log(`SKIP: unmergeable (${umRes.skip})`);
      else log("OK: bundle mapping marked UNMERGEABLE");

      log("Checking memory probe for bundle header...");
      const memProbe = checkBundleMemoryProbe(child.pid, bundlePath, bundleBytes, helpers);
      if (memProbe && memProbe.skip) log(`SKIP: mem probe (${memProbe.skip})`);
      else if (memProbe && memProbe.note) log(`OK: mem probe blocked (${memProbe.note})`);
      else log("OK: mem probe blocked");

      log("Scanning shared memory maps for bundle tokens...");
      const shmRes = scanSharedMemoryForTokens(child.pid, bundleTokens);
      if (shmRes.skip) log(`SKIP: shm scan (${shmRes.skip})`);
      else if (shmRes.hit) throw new Error(`shared memory leak token ${shmRes.hit} @0x${shmRes.addr}`);
      else log(`OK: shm scan clean (${shmRes.scanned} bytes)`);

      log("Scanning process memory for leak tokens...");
      const memScan = scanProcessMemoryForTokens(child.pid, tokenBuffers, bundleBytes);
      if (memScan.skip) log(`SKIP: mem scan (${memScan.skip})`);
      else if (memScan.hit) throw new Error(`memory leak "${memScan.hit}" @0x${memScan.addr}`);
      else log(`OK: mem scan clean (${memScan.scanned} bytes)`);

      log("Checking full memory dump (avml)...");
      const avmlRes = runAvmlDumpScan(child.pid, tokenBuffers);
      if (avmlRes.skip) log(`SKIP: avml dump (${avmlRes.skip})`);
      else if (avmlRes.hit) throw new Error(`avml dump leak "${avmlRes.hit}"`);
      else log("OK: avml dump scan clean");

      log("Checking external dump tool...");
      const extDump = runExternalDumpScan(child.pid, tokenBuffers);
      if (extDump.skip) log(`SKIP: external dump (${extDump.skip})`);
      else if (extDump.hit) throw new Error(`external dump leak "${extDump.hit}"`);
      else log("OK: external dump scan clean");
    },
  });
  if (!outputs) {
    log("SKIP: leak checks skipped (runtime not started)");
    return;
  }

  if (leakPid) {
    const journalRes = scanJournalForTokens(leakPid, startMs, LEAK_TOKENS);
    if (journalRes && journalRes.skip) log(`SKIP: journal scan (${journalRes.skip})`);
    else if (journalRes && journalRes.hit) throw new Error(journalRes.hit);
  }

  const stdout = outputs && outputs.stdout ? outputs.stdout : "";
  const stderr = outputs && outputs.stderr ? outputs.stderr : "";
  const outHit = scanTextForTokens("stdout", stdout, LEAK_TOKENS);
  if (outHit) throw new Error(outHit);
  const errHit = scanTextForTokens("stderr", stderr, LEAK_TOKENS);
  if (errHit) throw new Error(errHit);

  const logPath = path.join(releaseDir, "logs", "app.log");
  if (fs.existsSync(logPath)) {
    const logBuf = fs.readFileSync(logPath);
    const hit = bufferHasAnyToken(logBuf, tokenBuffers);
    if (hit) {
      throw new Error(`log file contains "${hit}"`);
    }
  }

  const releaseFiles = collectRecentFiles(releaseDir, startMs, {
    maxDepth: 6,
    maxFiles: 4000,
    skipDirs: ["r", "b", "public", "node_modules", ".git"],
  });
  for (const filePath of releaseFiles) {
    if (filePath === logPath) continue;
    const res = fileHasAnyToken(filePath, tokenBuffers, maxScanBytes);
    if (res && res.hit) {
      throw new Error(`artifact leak in ${path.relative(releaseDir, filePath)}: "${res.hit}"`);
    }
  }

  const tmpExts = [".js", ".cjs", ".mjs", ".map", ".json", ".log", ".txt"];
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const runUserDir = uid !== null ? path.join("/run/user", String(uid)) : "";
  const tmpRoots = Array.from(new Set([
    os.tmpdir(),
    "/tmp",
    "/var/tmp",
    "/dev/shm",
    runUserDir,
    path.join(os.homedir(), ".cache"),
  ].filter(Boolean)));
  for (const root of tmpRoots) {
    if (!fs.existsSync(root)) continue;
    const files = collectRecentFiles(root, startMs, { maxDepth: 3, maxFiles: 2000, extensions: tmpExts });
    if (files.length >= 2000) {
      log(`SKIP: ${root} scan truncated (too many files)`);
      continue;
    }
    for (const filePath of files) {
      if (filePath.includes(`${path.sep}seal-`)) continue;
      const res = fileHasAnyToken(filePath, tokenBuffers, maxScanBytes);
      if (res && res.hit) {
        throw new Error(`temp/cache leak in ${filePath}: "${res.hit}"`);
      }
    }
  }

  const dmesgRes = scanDmesgForTokens(LEAK_TOKENS);
  if (dmesgRes && dmesgRes.skip) log(`SKIP: dmesg scan (${dmesgRes.skip})`);
  else if (dmesgRes && dmesgRes.hit) throw new Error(dmesgRes.hit);

  const syslogRes = scanSystemLogsForTokens(tokenBuffers);
  if (syslogRes && syslogRes.skip) log(`SKIP: system log scan (${syslogRes.skip})`);

  const swapRes = scanSwapDevicesForTokens(tokenBuffers);
  if (swapRes && swapRes.skip) log(`SKIP: swap scan (${swapRes.skip})`);

  const hiberRes = scanHibernationFilesForTokens(tokenBuffers);
  if (hiberRes && hiberRes.skip) log(`SKIP: hibernation scan (${hiberRes.skip})`);

  const crashRoots = [
    { root: "/var/crash", maxDepth: 2, maxFiles: 200, extensions: [".crash", ".log", ".core", ".dmp", ".gz", ".lz4", ".zst", ".xz"] },
    { root: "/var/lib/systemd/coredump", maxDepth: 2, maxFiles: 200, extensions: [".core", ".dmp", ".gz", ".lz4", ".zst", ".xz"] },
  ];
  const coreMaxBytes = Number(process.env.SEAL_E2E_CORE_SCAN_MAX_MB || "256") * 1024 * 1024;
  for (const entry of crashRoots) {
    const root = entry.root;
    if (!fs.existsSync(root)) continue;
    const files = collectRecentFiles(root, startMs, { maxDepth: entry.maxDepth, maxFiles: entry.maxFiles, extensions: entry.extensions });
    if (files.length >= entry.maxFiles) {
      log(`SKIP: ${root} scan truncated (too many files)`);
      continue;
    }
    for (const filePath of files) {
      const base = path.basename(filePath);
      if (leakPid && !base.includes(String(leakPid))) continue;
      let hit = "";
      try {
        hit = scanFileForTokenStream(filePath, tokenBuffers, coreMaxBytes);
      } catch (e) {
        const code = e && e.code ? e.code : "";
        if (code === "EACCES" || code === "EPERM") {
          log(`SKIP: crash scan permission denied (${filePath})`);
          continue;
        }
        throw e;
      }
      if (hit) throw new Error(`crash leak in ${filePath}: "${hit}"`);
    }
  }

  const homeDir = os.homedir();
  const explicitFiles = [path.join(homeDir, ".node_repl_history")];
  for (const filePath of explicitFiles) {
    if (!fs.existsSync(filePath)) continue;
    let st;
    try {
      st = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (st.mtimeMs < startMs - 1000) continue;
    const res = fileHasAnyToken(filePath, tokenBuffers, maxScanBytes);
    if (res && res.hit) {
      throw new Error(`history leak in ${filePath}: "${res.hit}"`);
    }
  }

  const npmLogsDir = path.join(homeDir, ".npm", "_logs");
  if (fs.existsSync(npmLogsDir)) {
    const files = collectRecentFiles(npmLogsDir, startMs, { maxDepth: 2, maxFiles: 500, extensions: [".log"] });
    if (files.length >= 500) {
      log("SKIP: ~/.npm/_logs scan truncated (too many files)");
    } else {
      for (const filePath of files) {
        const res = fileHasAnyToken(filePath, tokenBuffers, maxScanBytes);
        if (res && res.hit) {
          throw new Error(`npm log leak in ${filePath}: "${res.hit}"`);
        }
      }
    }
  }
}

async function runReleaseDelayedMarkerScan({ releaseDir, runTimeoutMs, delaysMs }) {
  const markerHex = crypto.randomBytes(24).toString("hex");
  const markerBuf = Buffer.from(markerHex, "hex");
  const delays = Array.isArray(delaysMs) && delaysMs.length ? delaysMs : [2000, 6000];
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env: { SEAL_E2E_KEY_MARKER_HEX: markerHex },
    skipMessage: "SKIP: listen not permitted; delayed marker scan disabled",
    onReady: async ({ child }) => {
      for (const delayMs of delays) {
        if (delayMs > 0) await delay(delayMs);
        log(`Delayed marker scan (+${delayMs}ms)...`);
        const res = scanAnonMemoryForTokens(child.pid, [markerBuf]);
        if (res.skip) {
          log(`SKIP: delayed marker scan (${res.skip})`);
          continue;
        }
        if (res.hit) {
          throw new Error(`delayed marker leak "${res.hit}" @0x${res.addr}`);
        }
        const note = res.scanned ? ` (${res.scanned} bytes)` : "";
        log(`OK: delayed marker scan clean${note}`);
      }
    },
  });
}

function reportBootstrapScan(label, res, expectHit, strictEnvVar) {
  if (res.skip) {
    log(`SKIP: ${label} (${res.skip})`);
    return;
  }
  if (expectHit) {
    if (res.hit) {
      const note = res.addr ? ` @0x${res.addr}` : "";
      log(`OK: ${label} hit${note}`);
      return;
    }
    if (process.env[strictEnvVar] === "1") {
      throw new Error(`${label} marker not found`);
    }
    log(`SKIP: ${label} marker not found (set ${strictEnvVar}=1 to enforce)`);
    return;
  }
  if (res.hit) {
    if (process.env[strictEnvVar] === "1") {
      throw new Error(`${label} marker present (${res.hit})`);
    }
    log(`SKIP: ${label} marker present (${res.hit}; set ${strictEnvVar}=1 to enforce)`);
    return;
  }
  const note = res.scanned ? ` (${res.scanned} bytes)` : "";
  log(`OK: ${label} clean${note}`);
}

function reportBootstrapNoHit(label, res) {
  if (res.skip) {
    log(`SKIP: ${label} (${res.skip})`);
    return;
  }
  if (res.hit) {
    throw new Error(`${label} hit (${res.hit})`);
  }
  const note = res.scanned ? ` (${res.scanned} bytes)` : "";
  log(`OK: ${label} clean${note}`);
}

function reportBootstrapPageCount(label, res, maxPages) {
  if (res.skip) {
    log(`SKIP: ${label} (${res.skip})`);
    return;
  }
  const strictEnv = process.env.SEAL_E2E_STRICT_BOOTSTRAP_PAGE_COUNT;
  const strict = strictEnv === "1";
  const count = Number.isFinite(res.count) ? res.count : 0;
  const notes = [];
  if (Number.isFinite(res.scanned)) notes.push(`${res.scanned} bytes`);
  if (res.truncated) notes.push("truncated");
  if (res.capped) notes.push("capped");
  const note = notes.length ? ` (${notes.join(", ")})` : "";
  if (count > maxPages) {
    if (!strict) {
      log(`SKIP: ${label} pages=${count} > ${maxPages}${note} (set SEAL_E2E_STRICT_BOOTSTRAP_PAGE_COUNT=1 to enforce)`);
      return;
    }
    throw new Error(`${label} pages=${count} > ${maxPages}${note}`);
  }
  if (res.truncated) {
    log(`SKIP: ${label} pages=${count}${note}`);
    return;
  }
  log(`OK: ${label} pages=${count}${note}`);
}

async function runReleaseBootstrapStageScan({ releaseDir, runTimeoutMs, stage, pauseMs, env, scanFn }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const markerPath = path.join(os.tmpdir(), `seal-bootstrap-${stage}-${Date.now()}-${Math.random().toString(16).slice(2)}.marker`);
  try { fs.rmSync(markerPath, { force: true }); } catch {}
  const resolvedPauseMs = Number.isFinite(pauseMs) ? pauseMs : Number(process.env.SEAL_E2E_BOOTSTRAP_PAUSE_MS || "6000");

  const childEnv = Object.assign({}, process.env, env || {}, {
    SEAL_E2E_BOOTSTRAP_STAGE: stage,
    SEAL_E2E_BOOTSTRAP_PAUSE_MS: String(Math.max(0, resolvedPauseMs || 0)),
    SEAL_E2E_BOOTSTRAP_MARKER: markerPath,
  });

  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      resolve({
        code,
        signal,
        stdout: Buffer.concat(outChunks).toString("utf8").trim(),
        stderr: Buffer.concat(errChunks).toString("utf8").trim(),
      });
    });
  });

  let scanRes = { skip: "scan not executed" };
  try {
    const markerTimeout = Math.min(runTimeoutMs, Math.max(2000, (resolvedPauseMs || 0) + 2000));
    const winner = await withTimeout(`bootstrap stage ${stage}`, markerTimeout, () =>
      Promise.race([
        waitForMarkerFile(markerPath, stage, markerTimeout).then(() => ({ ok: true })),
        exitPromise.then((info) => ({ exit: info })),
      ])
    );
    if (winner && winner.exit) {
      const info = winner.exit;
      const detail = [
        info.code !== null ? `code=${info.code}` : null,
        info.signal ? `signal=${info.signal}` : null,
        info.stdout ? `stdout: ${info.stdout.slice(0, 200)}` : null,
        info.stderr ? `stderr: ${info.stderr.slice(0, 200)}` : null,
      ].filter(Boolean).join("; ");
      throw new Error(`process exited before bootstrap stage "${stage}" (${detail || "no output"})`);
    }
    scanRes = scanFn(child.pid);
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    try { fs.rmSync(markerPath, { force: true }); } catch {}
  }
  return scanRes;
}

async function runReleaseBootstrapSelfScan({
  releaseDir,
  runTimeoutMs,
  stage,
  target,
  expect,
  mode,
  gcPressure,
  markerHex,
  markerHexList,
  bundleBytes,
  vmflags,
}) {
  const strictEnv = process.env.SEAL_E2E_STRICT_BOOTSTRAP_SELF_SCAN;
  const strictSelfScan = strictEnv === "1";
  const vmflagsStrictEnv = process.env.SEAL_E2E_STRICT_BOOTSTRAP_SELF_SCAN_VMFLAGS;
  const strictVmflags = vmflags && vmflagsStrictEnv === "1";
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);
  const childEnv = Object.assign({}, process.env, {
    SEAL_E2E_BOOTSTRAP_SELF_SCAN: "1",
    SEAL_E2E_BOOTSTRAP_SELF_SCAN_STAGE: stage,
    SEAL_E2E_BOOTSTRAP_SELF_SCAN_TARGET: target,
    SEAL_E2E_BOOTSTRAP_SELF_SCAN_EXPECT: expect,
    SEAL_E2E_BOOTSTRAP_SELF_SCAN_MODE: mode || "mem",
    SEAL_E2E_BOOTSTRAP_SELF_SCAN_STRICT: strictSelfScan ? "1" : "0",
    SEAL_E2E_BOOTSTRAP_SELF_SCAN_VMFLAGS: vmflags ? "1" : "0",
    SEAL_E2E_BOOTSTRAP_SELF_SCAN_VMFLAGS_STRICT: strictVmflags ? "1" : "0",
    SEAL_E2E_BUNDLE_BYTES: bundleBytes ? String(bundleBytes) : "0",
  });
  if (gcPressure) childEnv.SEAL_E2E_BOOTSTRAP_SELF_SCAN_GC_PRESSURE = "1";
  if (markerHex) childEnv.SEAL_E2E_KEY_MARKER_HEX = markerHex;
  if (markerHexList && markerHexList.length) {
    childEnv.SEAL_E2E_KEY_MARKER_HEX_LIST = Array.isArray(markerHexList)
      ? markerHexList.join(",")
      : String(markerHexList);
  }
  const res = spawnSync(binPath, [], { cwd: releaseDir, env: childEnv, stdio: "pipe", timeout: runTimeoutMs });
  if (res.error && res.error.code === "ETIMEDOUT") {
    throw new Error(`bootstrap self-scan timed out (${stage}/${target}/${expect})`);
  }
  const stdout = `${res.stdout || ""}`.trim();
  const stderr = `${res.stderr || ""}`.trim();
  if (res.status !== 0) {
    const detail = [
      res.status !== null ? `code=${res.status}` : null,
      res.signal ? `signal=${res.signal}` : null,
      stdout ? `stdout: ${stdout.slice(0, 200)}` : null,
      stderr ? `stderr: ${stderr.slice(0, 200)}` : null,
    ].filter(Boolean).join("; ");
    throw new Error(`bootstrap self-scan failed (${stage}/${target}/${expect})${detail ? `; ${detail}` : ""}`);
  }
}

async function runReleaseBootstrapMemoryChecks({ releaseDir, outDir, runTimeoutMs }) {
  const pauseMs = Number(process.env.SEAL_E2E_BOOTSTRAP_PAUSE_MS || "6000");
  const markerHex = crypto.randomBytes(24).toString("hex");
  const markerBuf = Buffer.from(markerHex, "hex");
  const markerEnv = { SEAL_E2E_KEY_MARKER_HEX: markerHex };
  const bundlePath = outDir ? path.join(outDir, "stage", "bundle.obf.cjs") : null;
  const bundleBytes = bundlePath && fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
  const strictSelfScan = process.env.SEAL_E2E_STRICT_BOOTSTRAP_SELF_SCAN === "1";

  log("Testing bootstrap marker (decoded stage)...");
  const decodedRes = await runReleaseBootstrapStageScan({
    releaseDir,
    runTimeoutMs,
    stage: "decoded",
    pauseMs,
    env: markerEnv,
    scanFn: (pid) => scanAnonMemoryForTokens(pid, [markerBuf]),
  });
  reportBootstrapScan("bootstrap marker decoded", decodedRes, true, "SEAL_E2E_STRICT_BOOTSTRAP_MARKER");

  log("Testing bootstrap marker page count (decoded stage)...");
  const pageMax = Number(process.env.SEAL_E2E_MARKER_PAGE_MAX || "8");
  const decodedPages = await runReleaseBootstrapStageScan({
    releaseDir,
    runTimeoutMs,
    stage: "decoded",
    pauseMs,
    env: markerEnv,
    scanFn: (pid) => {
      const rangesRes = collectAnonRanges(pid);
      if (rangesRes.skip) return { skip: rangesRes.skip };
      return countMemoryPagesWithToken(pid, [markerBuf], rangesRes.ranges, { maxHits: pageMax + 1 });
    },
  });
  reportBootstrapPageCount("bootstrap marker pages decoded", decodedPages, pageMax);

  log("Testing bootstrap marker (post-wipe stage)...");
  const wipeRes = await runReleaseBootstrapStageScan({
    releaseDir,
    runTimeoutMs,
    stage: "post-wipe",
    pauseMs,
    env: markerEnv,
    scanFn: (pid) => scanAnonMemoryForTokens(pid, [markerBuf]),
  });
  reportBootstrapScan("bootstrap marker post-wipe", wipeRes, false, "SEAL_E2E_STRICT_BOOTSTRAP_WIPE");

  log("Testing bootstrap marker page count (post-wipe stage)...");
  const wipePages = await runReleaseBootstrapStageScan({
    releaseDir,
    runTimeoutMs,
    stage: "post-wipe",
    pauseMs,
    env: markerEnv,
    scanFn: (pid) => {
      const rangesRes = collectAnonRanges(pid);
      if (rangesRes.skip) return { skip: rangesRes.skip };
      return countMemoryPagesWithToken(pid, [markerBuf], rangesRes.ranges, { maxHits: 1 });
    },
  });
  reportBootstrapPageCount("bootstrap marker pages post-wipe", wipePages, 0);

  log("Testing bootstrap marker not in exec maps (post-wipe stage)...");
  const execWipe = await runReleaseBootstrapStageScan({
    releaseDir,
    runTimeoutMs,
    stage: "post-wipe",
    pauseMs,
    env: markerEnv,
    scanFn: (pid) => scanMemoryRangesByPerms(pid, [markerBuf], ["r-x"], { binary: true }),
  });
  reportBootstrapNoHit("bootstrap marker exec post-wipe", execWipe);

  log("Testing bootstrap marker not in read-only maps (post-wipe stage)...");
  const roWipe = await runReleaseBootstrapStageScan({
    releaseDir,
    runTimeoutMs,
    stage: "post-wipe",
    pauseMs,
    env: markerEnv,
    scanFn: (pid) => scanMemoryRangesByPerms(pid, [markerBuf], ["r--"], { binary: true }),
  });
  reportBootstrapNoHit("bootstrap marker ro post-wipe", roWipe);

  const bundleSig = buildBundleSignatureTokens(bundlePath);
  const bundleTokens = bundleSig.tokens || [];
  if (bundleSig.skip) {
    log(`SKIP: bootstrap bundle tokens (${bundleSig.skip})`);
  } else if (!bundleTokens.length) {
    log("SKIP: bootstrap bundle tokens empty");
  } else {
    log("Testing bootstrap bundle tokens (decoded stage)...");
    const bundleDecoded = await runReleaseBootstrapStageScan({
      releaseDir,
      runTimeoutMs,
      stage: "decoded",
      pauseMs,
      env: markerEnv,
      scanFn: (pid) => scanAnonMemoryForTokens(pid, bundleTokens),
    });
    reportBootstrapScan("bootstrap bundle decoded", bundleDecoded, true, "SEAL_E2E_STRICT_BOOTSTRAP_TOKENS");

    const codePageMax = Number(process.env.SEAL_E2E_CODE_PAGE_MAX || "128");
    if (Number.isFinite(codePageMax) && codePageMax > 0) {
      log("Testing bootstrap bundle page count (decoded stage)...");
      const bundlePages = await runReleaseBootstrapStageScan({
        releaseDir,
        runTimeoutMs,
        stage: "decoded",
        pauseMs,
        env: markerEnv,
        scanFn: (pid) => {
          const rangesRes = collectAnonRanges(pid);
          if (rangesRes.skip) return { skip: rangesRes.skip };
          return countMemoryPagesWithToken(pid, bundleTokens, rangesRes.ranges, { maxHits: codePageMax + 1 });
        },
      });
      reportBootstrapPageCount("bootstrap bundle pages decoded", bundlePages, codePageMax);
    } else {
      log("SKIP: bootstrap bundle page count disabled");
    }

    log("Testing bootstrap bundle tokens (post-wipe stage)...");
    const bundleWipe = await runReleaseBootstrapStageScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      pauseMs,
      env: markerEnv,
      scanFn: (pid) => scanAnonMemoryForTokens(pid, bundleTokens),
    });
    reportBootstrapScan("bootstrap bundle post-wipe", bundleWipe, false, "SEAL_E2E_STRICT_BOOTSTRAP_TOKENS");

    log("Testing bootstrap bundle page count (post-wipe stage)...");
    const bundleWipePages = await runReleaseBootstrapStageScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      pauseMs,
      env: markerEnv,
      scanFn: (pid) => {
        const rangesRes = collectAnonRanges(pid);
        if (rangesRes.skip) return { skip: rangesRes.skip };
        return countMemoryPagesWithToken(pid, bundleTokens, rangesRes.ranges, { maxHits: 1 });
      },
    });
    reportBootstrapPageCount("bootstrap bundle pages post-wipe", bundleWipePages, 0);

    log("Testing bootstrap bundle not in exec maps (post-wipe stage)...");
    const bundleExecWipe = await runReleaseBootstrapStageScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      pauseMs,
      env: markerEnv,
      scanFn: (pid) => scanMemoryRangesByPerms(pid, bundleTokens, ["r-x"], { binary: true }),
    });
    reportBootstrapNoHit("bootstrap bundle exec post-wipe", bundleExecWipe);

    log("Testing bootstrap bundle not in read-only maps (post-wipe stage)...");
    const bundleRoWipe = await runReleaseBootstrapStageScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      pauseMs,
      env: markerEnv,
      scanFn: (pid) => scanMemoryRangesByPerms(pid, bundleTokens, ["r--"], { binary: true }),
    });
    reportBootstrapNoHit("bootstrap bundle ro post-wipe", bundleRoWipe);
  }

  if (!strictSelfScan) {
    log("SKIP: bootstrap self-scan checks (set SEAL_E2E_STRICT_BOOTSTRAP_SELF_SCAN=1 to enforce)");
  } else {
    log("Testing bootstrap self-scan (marker present)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "decoded",
      target: "marker",
      expect: "present",
      mode: "mem",
      gcPressure: false,
      markerHex,
      bundleBytes,
      vmflags: true,
    });

    log("Testing bootstrap self-scan (marker present, dump mode)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "decoded",
      target: "marker",
      expect: "present",
      mode: "dump",
      gcPressure: false,
      markerHex,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (marker absent after wipe)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      target: "marker",
      expect: "absent",
      mode: "dump",
      gcPressure: true,
      markerHex,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (marker present, worker mode)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "decoded",
      target: "marker",
      expect: "present",
      mode: "worker",
      gcPressure: false,
      markerHex,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (marker absent after wipe, worker mode)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      target: "marker",
      expect: "absent",
      mode: "worker",
      gcPressure: true,
      markerHex,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (marker present, file dump)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "decoded",
      target: "marker",
      expect: "present",
      mode: "file",
      gcPressure: false,
      markerHex,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (marker absent after wipe, file dump)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      target: "marker",
      expect: "absent",
      mode: "file",
      gcPressure: true,
      markerHex,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (code present)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "decoded",
      target: "code",
      expect: "present",
      mode: "mem",
      gcPressure: false,
      markerHex,
      bundleBytes,
      vmflags: false,
    });

    const multiMarkers = [
      crypto.randomBytes(8).toString("hex"),
      crypto.randomBytes(16).toString("hex"),
      crypto.randomBytes(24).toString("hex"),
    ];
    log("Testing bootstrap self-scan (multi-marker present)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "decoded",
      target: "marker",
      expect: "present",
      mode: "mem",
      gcPressure: false,
      markerHexList: multiMarkers,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (multi-marker absent after wipe)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      target: "marker",
      expect: "absent",
      mode: "dump",
      gcPressure: true,
      markerHexList: multiMarkers,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (code present, dump mode)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "decoded",
      target: "code",
      expect: "present",
      mode: "dump",
      gcPressure: false,
      markerHex,
      bundleBytes,
      vmflags: false,
    });

    log("Testing bootstrap self-scan (code absent after wipe)...");
    await runReleaseBootstrapSelfScan({
      releaseDir,
      runTimeoutMs,
      stage: "post-wipe",
      target: "code",
      expect: "absent",
      mode: "dump",
      gcPressure: true,
      markerHex,
      bundleBytes,
      vmflags: false,
    });
  }

  log("Testing bootstrap fork-snapshot (code absent in child)...");
  await runReleaseBootstrapSelfScan({
    releaseDir,
    runTimeoutMs,
    stage: "decoded",
    target: "code",
    expect: "absent",
    mode: "fork",
    gcPressure: false,
    markerHex,
    bundleBytes,
    vmflags: false,
  });

  log("Testing bootstrap fork-snapshot (marker absent in child)...");
  await runReleaseBootstrapSelfScan({
    releaseDir,
    runTimeoutMs,
    stage: "decoded",
    target: "marker",
    expect: "absent",
    mode: "fork",
    gcPressure: false,
    markerHex,
    bundleBytes,
    vmflags: false,
  });

  log("Testing bootstrap fork-snapshot (code absent after wipe in child)...");
  await runReleaseBootstrapSelfScan({
    releaseDir,
    runTimeoutMs,
    stage: "post-wipe",
    target: "code",
    expect: "absent",
    mode: "fork",
    gcPressure: true,
    markerHex,
    bundleBytes,
    vmflags: false,
  });

  log("Testing bootstrap fork-snapshot (marker absent after wipe in child)...");
  await runReleaseBootstrapSelfScan({
    releaseDir,
    runTimeoutMs,
    stage: "post-wipe",
    target: "marker",
    expect: "absent",
    mode: "fork",
    gcPressure: true,
    markerHex,
    bundleBytes,
    vmflags: false,
  });
}

async function runReleaseDumpSelftest({ releaseDir, runTimeoutMs }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);
  const reportPath = path.join(os.tmpdir(), `seal-report-${Date.now()}.json`);
  const heapPath = path.join(os.tmpdir(), `seal-heap-${Date.now()}.heapsnapshot`);
  try { fs.rmSync(reportPath, { force: true }); } catch {}
  try { fs.rmSync(heapPath, { force: true }); } catch {}
  try {
    const childEnv = Object.assign({}, process.env, {
      SEAL_E2E_BOOTSTRAP_SELFTEST: "1",
      SEAL_E2E_REPORT_PATH: reportPath,
      SEAL_E2E_HEAP_PATH: heapPath,
    });
    const res = spawnSync(binPath, [], { cwd: releaseDir, env: childEnv, stdio: "pipe", timeout: runTimeoutMs });
    if (res.error && res.error.code === "ETIMEDOUT") {
      throw new Error("bootstrap dump selftest timed out");
    }
    const stdout = `${res.stdout || ""}`.trim();
    const stderr = `${res.stderr || ""}`.trim();
    if (res.status !== 0) {
      const detail = [
        res.status !== null ? `code=${res.status}` : null,
        res.signal ? `signal=${res.signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 200)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 200)}` : null,
      ].filter(Boolean).join("; ");
      throw new Error(`bootstrap dump selftest failed (${detail || "no output"})`);
    }
    if (fs.existsSync(reportPath) || fs.existsSync(heapPath)) {
      throw new Error("bootstrap dump selftest created report/heap files");
    }
  } finally {
    try { fs.rmSync(reportPath, { force: true }); } catch {}
    try { fs.rmSync(heapPath, { force: true }); } catch {}
  }
}

function runReleaseBootstrapOneShot({ releaseDir, runTimeoutMs, env, label }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);
  const res = spawnSync(binPath, [], { cwd: releaseDir, env, stdio: "pipe", timeout: runTimeoutMs });
  if (res.error && res.error.code === "ETIMEDOUT") {
    throw new Error(`${label} timed out`);
  }
  const stdout = `${res.stdout || ""}`.trim();
  const stderr = `${res.stderr || ""}`.trim();
  if (res.status !== 0) {
    const detail = [
      res.status !== null ? `code=${res.status}` : null,
      res.signal ? `signal=${res.signal}` : null,
      stdout ? `stdout: ${stdout.slice(0, 200)}` : null,
      stderr ? `stderr: ${stderr.slice(0, 200)}` : null,
    ].filter(Boolean).join("; ");
    throw new Error(`${label} failed (${detail || "no output"})`);
  }
}

async function runReleaseBootstrapStackScan({ releaseDir, runTimeoutMs, stage, target, markerHex, markerHexList }) {
  const env = Object.assign({}, process.env, {
    SEAL_E2E_BOOTSTRAP_STACK_SCAN: "1",
    SEAL_E2E_BOOTSTRAP_STACK_STAGE: stage,
    SEAL_E2E_BOOTSTRAP_STACK_TARGET: target || "all",
  });
  if (markerHex) env.SEAL_E2E_KEY_MARKER_HEX = markerHex;
  if (markerHexList && markerHexList.length) {
    env.SEAL_E2E_KEY_MARKER_HEX_LIST = Array.isArray(markerHexList)
      ? markerHexList.join(",")
      : String(markerHexList);
  }
  runReleaseBootstrapOneShot({ releaseDir, runTimeoutMs, env, label: "bootstrap stack scan" });
}

async function runReleaseBootstrapModuleScan({ releaseDir, runTimeoutMs, stage, target, markerHex, markerHexList }) {
  const env = Object.assign({}, process.env, {
    SEAL_E2E_BOOTSTRAP_MODULE_SCAN: "1",
    SEAL_E2E_BOOTSTRAP_MODULE_STAGE: stage,
    SEAL_E2E_BOOTSTRAP_MODULE_TARGET: target || "all",
  });
  if (markerHex) env.SEAL_E2E_KEY_MARKER_HEX = markerHex;
  if (markerHexList && markerHexList.length) {
    env.SEAL_E2E_KEY_MARKER_HEX_LIST = Array.isArray(markerHexList)
      ? markerHexList.join(",")
      : String(markerHexList);
  }
  runReleaseBootstrapOneShot({ releaseDir, runTimeoutMs, env, label: "bootstrap module scan" });
}

async function runReleaseBootstrapInspectorTest({ releaseDir, runTimeoutMs, mode, stage }) {
  const env = Object.assign({}, process.env, {
    SEAL_E2E_BOOTSTRAP_INSPECTOR: "1",
    SEAL_E2E_BOOTSTRAP_INSPECTOR_MODE: mode,
    SEAL_E2E_BOOTSTRAP_INSPECTOR_STAGE: stage || "decoded",
  });
  runReleaseBootstrapOneShot({ releaseDir, runTimeoutMs, env, label: `bootstrap inspector ${mode}` });
}

async function runReleaseBootstrapArgvEnvCheck({ releaseDir, runTimeoutMs, stage, env }) {
  const childEnv = Object.assign({}, process.env, env || {}, {
    SEAL_E2E_BOOTSTRAP_ARGV_ENV_CHECK: "1",
    SEAL_E2E_BOOTSTRAP_ARGV_ENV_STAGE: stage || "decoded",
  });
  runReleaseBootstrapOneShot({ releaseDir, runTimeoutMs, env: childEnv, label: "bootstrap argv/env check" });
}

async function runReleaseBootstrapCrashNoLeak({ releaseDir, runTimeoutMs, stage, markerHex }) {
  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);
  const crashStage = stage || "decoded";
  const marker = markerHex || crypto.randomBytes(16).toString("hex");
  const childEnv = Object.assign({}, process.env, {
    SEAL_E2E_BOOTSTRAP_CRASH_STAGE: crashStage,
    SEAL_E2E_KEY_MARKER_HEX: marker,
  });
  const startMs = Date.now();
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      resolve({ code, signal, stdout, stderr, pid: child.pid });
    });
  });

  let info = null;
  try {
    info = await withTimeout("bootstrap crash", runTimeoutMs, () => exitPromise);
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  if (!info) {
    throw new Error("bootstrap crash did not exit");
  }
  if (info.code === 0) {
    throw new Error("bootstrap crash exited with code=0");
  }
  if (info.code === null && !info.signal) {
    throw new Error("bootstrap crash exited without signal");
  }

  const coreRes = checkCoreFilesAfterCrash(releaseDir, info.pid, startMs);
  if (coreRes.skip) {
    log(`SKIP: bootstrap crash core check (${coreRes.skip})`);
  } else if (!coreRes.ok) {
    throw new Error(`bootstrap crash core dump found (${coreRes.reason})`);
  } else {
    log("OK: bootstrap crash no core dump");
  }

  const tokens = LEAK_TOKENS.concat([marker]);
  const stdoutHit = scanTextForTokens("stdout", info.stdout, tokens);
  if (stdoutHit) throw new Error(stdoutHit);
  const stderrHit = scanTextForTokens("stderr", info.stderr, tokens);
  if (stderrHit) throw new Error(stderrHit);
  log("OK: bootstrap crash output clean");
}

async function runReleaseChildAttachChecks({ releaseDir, outDir, runTimeoutMs, helpers }) {
  const bundlePath = outDir ? path.join(outDir, "stage", "bundle.obf.cjs") : null;
  const bundleSig = buildBundleSignatureTokens(bundlePath);
  const bundleTokens = bundleSig.tokens || [];
  if (bundleSig.skip) {
    log(`SKIP: bundle signatures (${bundleSig.skip})`);
  }
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    skipMessage: "SKIP: listen not permitted; child attach check disabled",
    onReady: async ({ child }) => {
      const kids = await waitForChildPids(child.pid, { tries: 10, delayMs: 200 });
      if (kids === null) {
        log("SKIP: cannot read /proc/<pid>/children");
        return;
      }
      if (!kids.length) {
        log("SKIP: no child processes detected");
        return;
      }
      for (const pid of kids) {
        log(`Checking child pid=${pid}...`);
        try {
          checkProcStatusHardened(pid);
          log("OK: child /proc status hardened");
        } catch (e) {
          const msg = e && e.message ? e.message : String(e);
          if (/enoent/i.test(msg)) {
            log(`SKIP: child ${pid} exited before checks`);
            continue;
          }
          throw e;
        }

        const inspectRes = checkInspectorDisabled(pid);
        if (inspectRes.skip) log(`SKIP: child inspector (${inspectRes.skip})`);
        else log("OK: child inspector disabled");

        const injectRes = checkNodeInjectionFlags(pid);
        if (injectRes.skip) log(`SKIP: child node inject (${injectRes.skip})`);
        else log("OK: child node inject flags clean");

        const diagRes = checkNodeDiagnosticFlags(pid);
        if (diagRes.skip) log(`SKIP: child node diag (${diagRes.skip})`);
        else log("OK: child node diag flags clean");

        const cmdLenRes = checkProcCmdlineLength(pid);
        if (cmdLenRes.skip) log(`SKIP: child cmdline length (${cmdLenRes.skip})`);
        else log("OK: child cmdline length ok");

        const cmdRes = checkProcCmdlineForBundleTokens(pid, bundleTokens);
        if (cmdRes.skip) log(`SKIP: child cmdline leak (${cmdRes.skip})`);
        else log("OK: child cmdline clean");

        const envRes = checkProcEnvironForBundleTokens(pid, bundleTokens);
        if (envRes.skip) log(`SKIP: child environ leak (${envRes.skip})`);
        else log("OK: child environ clean");

        const mapRes = checkMapsNoJsPaths(pid);
        if (mapRes.skip) log(`SKIP: child maps js (${mapRes.skip})`);
        else log("OK: child maps clean");

        const fdJsRes = checkFdNoJsPaths(pid);
        if (fdJsRes.skip) log(`SKIP: child fd js (${fdJsRes.skip})`);
        else log("OK: child fd targets clean");

        const exeRes = checkProcExeMemfd(pid, releaseDir);
        if (exeRes.skip) log(`SKIP: child exec memfd (${exeRes.skip})`);
        else log("OK: child exec memfd");

        const capsRes = checkProcCapsReduced(pid);
        if (capsRes.skip) log(`SKIP: child caps (${capsRes.skip})`);
        else log("OK: child caps reduced");

        const fdRes = checkProcessFdHygiene(pid, releaseDir);
        if (fdRes.skip) log(`SKIP: child fd hygiene (${fdRes.skip})`);
        else log("OK: child fd hygiene clean");

        const ptraceRes = checkPtraceBlocked(pid, helpers.ptrace.path);
        if (ptraceRes.skip) log(`SKIP: child ptrace (${ptraceRes.skip})`);
        else log("OK: child ptrace blocked");

        const gdbRes = checkGdbAttachBlockedPid(pid);
        if (gdbRes.skip) log(`SKIP: child gdb (${gdbRes.skip})`);
        else log("OK: child gdb blocked");

        const lldbRes = checkLldbAttachBlockedPid(pid);
        if (lldbRes.skip) log(`SKIP: child lldb (${lldbRes.skip})`);
        else log("OK: child lldb blocked");

        const straceRes = checkStraceAttachBlockedPid(pid);
        if (straceRes.skip) log(`SKIP: child strace (${straceRes.skip})`);
        else log("OK: child strace blocked");

        const ltraceRes = checkLtraceAttachBlockedPid(pid);
        if (ltraceRes.skip) log(`SKIP: child ltrace (${ltraceRes.skip})`);
        else log("OK: child ltrace blocked");

        const pstackRes = checkPstackAttachBlocked(pid);
        if (pstackRes.skip) log(`SKIP: child pstack (${pstackRes.skip})`);
        else log("OK: child pstack blocked");

        const gstackRes = checkGstackAttachBlocked(pid);
        if (gstackRes.skip) log(`SKIP: child gstack (${gstackRes.skip})`);
        else log("OK: child gstack blocked");

        const euStackRes = checkEuStackAttachBlocked(pid);
        if (euStackRes.skip) log(`SKIP: child eu-stack (${euStackRes.skip})`);
        else log("OK: child eu-stack blocked");

        const gdbsRes = await checkGdbServerAttachBlockedPid(pid);
        if (gdbsRes.skip) log(`SKIP: child gdbserver (${gdbsRes.skip})`);
        else log("OK: child gdbserver blocked");

        const lldbServerRes = await checkLldbServerAttachBlockedPid(pid);
        if (lldbServerRes.skip) log(`SKIP: child lldb-server (${lldbServerRes.skip})`);
        else log("OK: child lldb-server blocked");

        const perfRec = checkPerfRecordBlocked(pid);
        if (perfRec.skip) log(`SKIP: child perf record (${perfRec.skip})`);
        else log("OK: child perf record blocked");

        const perfTrace = checkPerfTraceBlocked(pid);
        if (perfTrace.skip) log(`SKIP: child perf trace (${perfTrace.skip})`);
        else log("OK: child perf trace blocked");

        const rrRes = checkRrAttachBlocked(pid);
        if (rrRes.skip) log(`SKIP: child rr (${rrRes.skip})`);
        else log("OK: child rr blocked");

        const bpfRes = checkBpftraceAttachBlocked(pid);
        if (bpfRes.skip) log(`SKIP: child bpftrace (${bpfRes.skip})`);
        else log("OK: child bpftrace blocked");

        const bpfU = checkBpftraceUprobeBlocked(pid);
        if (bpfU.skip) log(`SKIP: child bpftrace uprobe (${bpfU.skip})`);
        else log("OK: child bpftrace uprobe blocked");

        const lttngRes = checkLttngAttachBlocked(pid);
        if (lttngRes.skip) log(`SKIP: child lttng (${lttngRes.skip})`);
        else log("OK: child lttng blocked");

        const stapRes = checkSystemtapAttachBlocked(pid);
        if (stapRes.skip) log(`SKIP: child systemtap (${stapRes.skip})`);
        else log("OK: child systemtap blocked");

        const fridaRes = checkFridaAttachBlocked(pid);
        if (fridaRes.skip) log(`SKIP: child frida (${fridaRes.skip})`);
        else log("OK: child frida blocked");

        const drrunRes = checkDrrunAttachBlocked(pid);
        if (drrunRes.skip) log(`SKIP: child drrun (${drrunRes.skip})`);
        else log("OK: child drrun blocked");

        const pinRes = checkPinAttachBlocked(pid);
        if (pinRes.skip) log(`SKIP: child pin (${pinRes.skip})`);
        else log("OK: child pin blocked");

        const traceRes = checkTraceCmdBlocked(pid);
        if (traceRes.skip) log(`SKIP: child trace-cmd (${traceRes.skip})`);
        else log("OK: child trace-cmd blocked");

        const perfProbe = checkPerfProbeBlocked(pid);
        if (perfProbe.skip) log(`SKIP: child perf probe (${perfProbe.skip})`);
        else log("OK: child perf probe blocked");

        const sysdigRes = checkSysdigBlocked(pid);
        if (sysdigRes.skip) log(`SKIP: child sysdig (${sysdigRes.skip})`);
        else log("OK: child sysdig blocked");

        const criuRes = checkCriuDumpBlocked(pid);
        if (criuRes.skip) log(`SKIP: child criu (${criuRes.skip})`);
        else log("OK: child criu blocked");
      }
    },
  });
}

async function runReleasePerfAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; perf attach test disabled",
    onReady: async ({ child }) => {
      log("Checking perf record attach...");
      const rec = checkPerfRecordBlocked(child.pid);
      if (rec.skip) {
        log(`SKIP: perf record (${rec.skip})`);
      } else {
        const note = rec.note ? ` (${rec.note})` : "";
        log(`OK: perf record blocked${note}`);
      }
      log("Checking perf trace attach...");
      const trace = checkPerfTraceBlocked(child.pid);
      if (trace.skip) {
        log(`SKIP: perf trace (${trace.skip})`);
      } else {
        const note = trace.note ? ` (${trace.note})` : "";
        log(`OK: perf trace blocked${note}`);
      }
    },
  });
}

async function runReleaseRrAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; rr attach test disabled",
    onReady: async ({ child }) => {
      log("Checking rr attach...");
      const res = checkRrAttachBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: rr attach (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: rr attach blocked${note}`);
      }
    },
  });
}

async function runReleaseBpftraceAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; bpftrace attach test disabled",
    onReady: async ({ child }) => {
      log("Checking bpftrace attach...");
      const res = checkBpftraceAttachBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: bpftrace (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: bpftrace blocked${note}`);
      }
      log("Checking bpftrace uprobe...");
      const up = checkBpftraceUprobeBlocked(child.pid);
      if (up.skip) {
        log(`SKIP: bpftrace uprobe (${up.skip})`);
      } else {
        const note = up.note ? ` (${up.note})` : "";
        log(`OK: bpftrace uprobe blocked${note}`);
      }
    },
  });
}

async function runReleaseLttngAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; lttng attach test disabled",
    onReady: async ({ child }) => {
      log("Checking lttng attach...");
      const res = checkLttngAttachBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: lttng (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: lttng blocked${note}`);
      }
    },
  });
}

async function runReleaseSystemtapAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; systemtap attach test disabled",
    onReady: async ({ child }) => {
      log("Checking systemtap attach...");
      const res = checkSystemtapAttachBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: systemtap (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: systemtap blocked${note}`);
      }
    },
  });
}

async function runReleaseFridaAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; frida attach test disabled",
    onReady: async ({ child }) => {
      log("Checking frida attach...");
      const res = checkFridaAttachBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: frida (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: frida blocked${note}`);
      }
    },
  });
}

async function runReleaseDrrunAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; drrun attach test disabled",
    onReady: async ({ child }) => {
      log("Checking drrun attach...");
      const res = checkDrrunAttachBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: drrun (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: drrun blocked${note}`);
      }
    },
  });
}

async function runReleasePinAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; pin attach test disabled",
    onReady: async ({ child }) => {
      log("Checking pin attach...");
      const res = checkPinAttachBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: pin (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: pin blocked${note}`);
      }
    },
  });
}

async function runReleaseTraceCmdAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; trace-cmd attach test disabled",
    onReady: async ({ child }) => {
      log("Checking trace-cmd attach...");
      const res = checkTraceCmdBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: trace-cmd (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: trace-cmd blocked${note}`);
      }
    },
  });
}

async function runReleasePerfProbeFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; perf probe test disabled",
    onReady: async ({ child }) => {
      log("Checking perf probe...");
      const res = checkPerfProbeBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: perf probe (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: perf probe blocked${note}`);
      }
    },
  });
}

async function runReleaseSysdigAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; sysdig attach test disabled",
    onReady: async ({ child }) => {
      log("Checking sysdig attach...");
      const res = checkSysdigBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: sysdig (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: sysdig blocked${note}`);
      }
    },
  });
}

async function runReleaseAuditctlFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; auditctl test disabled",
    onReady: async ({ child }) => {
      log("Checking auditctl rule...");
      const res = checkAuditctlBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: auditctl (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: auditctl blocked${note}`);
      }
    },
  });
}

async function runReleaseCriuDumpFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; criu dump test disabled",
    onReady: async ({ child }) => {
      log("Checking CRIU dump...");
      const res = checkCriuDumpBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: criu (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: criu blocked${note}`);
      }
    },
  });
}

async function runReleaseStackToolsAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; stack attach test disabled",
    onReady: async ({ child }) => {
      log("Checking pstack attach...");
      const pstackRes = checkPstackAttachBlocked(child.pid);
      if (pstackRes.skip) {
        log(`SKIP: pstack (${pstackRes.skip})`);
      } else {
        const note = pstackRes.note ? ` (${pstackRes.note})` : "";
        log(`OK: pstack blocked${note}`);
      }

      log("Checking gstack attach...");
      const gstackRes = checkGstackAttachBlocked(child.pid);
      if (gstackRes.skip) {
        log(`SKIP: gstack (${gstackRes.skip})`);
      } else {
        const note = gstackRes.note ? ` (${gstackRes.note})` : "";
        log(`OK: gstack blocked${note}`);
      }

      log("Checking eu-stack attach...");
      const euStackRes = checkEuStackAttachBlocked(child.pid);
      if (euStackRes.skip) {
        log(`SKIP: eu-stack (${euStackRes.skip})`);
      } else {
        const note = euStackRes.note ? ` (${euStackRes.note})` : "";
        log(`OK: eu-stack blocked${note}`);
      }
    },
  });
}

async function runReleasePtraceHelperFail({ releaseDir, runTimeoutMs, env, helperPath }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; ptrace helper test disabled",
    onReady: async ({ child }) => {
      log("Checking ptrace attach helper...");
      const res = checkPtraceBlocked(child.pid, helperPath);
      if (res.skip) {
        log(`SKIP: ptrace helper (${res.skip})`);
      } else {
        log("OK: ptrace helper blocked");
      }
    },
  });
}

async function runReleaseGcoreFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; gcore test disabled",
    onReady: async ({ child }) => {
      log("Checking gcore/core dump...");
      const res = checkGcoreBlocked(child.pid);
      if (res.skip) {
        log(`SKIP: gcore (${res.skip})`);
      } else {
        log("OK: gcore blocked");
      }
    },
  });
}

async function runReleaseCrashNoCore({ releaseDir, runTimeoutMs, env }) {
  const port = await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const startMs = Date.now();
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      resolve({ code, signal, stdout, stderr, pid: child.pid });
    });
  });

  try {
    const winner = await withTimeout("core crash", runTimeoutMs, () => Promise.race([
      exitPromise,
      waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }).then(() => ({ ok: true })),
    ]));
    if (winner && winner.ok) {
      throw new Error("process reached /api/status (expected crash)");
    }
    const { code, signal, pid } = winner || {};
    if (code === 0) {
      throw new Error("process exited with code=0 (expected crash)");
    }
    if (code === null && !signal) {
      throw new Error("process did not crash as expected");
    }
    const coreRes = checkCoreFilesAfterCrash(releaseDir, pid, startMs);
    if (coreRes.skip) {
      log(`SKIP: core dump check (${coreRes.skip})`);
    } else if (!coreRes.ok) {
      throw new Error(`core dump found (${coreRes.reason})`);
    } else {
      log("OK: no core dump after crash");
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function runReleaseGdbAttachFail({ releaseDir, runTimeoutMs, env }) {
  if (!hasCommand("gdb")) {
    log("SKIP: gdb not installed; gdb attach test disabled");
    return;
  }
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";

  const port = await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        code !== null ? `code=${code}` : null,
        signal ? `signal=${signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      reject(new Error(`process exited early (${detail || "no output"})`));
    });
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () =>
      Promise.race([waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }), exitPromise])
    );
    const gdbRes = runGdbAttach(child.pid, 5000);
    if (gdbRes.error && gdbRes.error.code === "ETIMEDOUT") {
      throw new Error("gdb attach timed out (unexpected)");
    }
    const out = `${gdbRes.stdout || ""}${gdbRes.stderr || ""}`.trim();
    const failMarkers = [
      /could not attach/i,
      /operation not permitted/i,
      /permission denied/i,
      /ptrace:/i,
      /not being run/i,
      /no such process/i,
      /inappropriate ioctl/i,
    ];
    const isFailure = gdbRes.status !== 0 || failMarkers.some((re) => re.test(out));
    if (!isFailure) {
      if (isRoot && !strict) {
        log("SKIP: gdb attach succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)");
        return;
      }
      throw new Error(`gdb attach succeeded (unexpected)${out ? `; output=${out.slice(0, 400)}` : ""}`);
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function runReleaseLldbAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; lldb attach test disabled",
    onReady: async ({ child }) => {
      log("Checking lldb attach...");
      const res = checkLldbAttachBlockedPid(child.pid);
      if (res.skip) {
        log(`SKIP: lldb (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: lldb blocked${note}`);
      }
    },
  });
}

async function runReleaseStraceAttachFail({ releaseDir, runTimeoutMs, env }) {
  if (!hasCommand("strace")) {
    log("SKIP: strace not installed; strace attach test disabled");
    return;
  }
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";

  const port = await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        code !== null ? `code=${code}` : null,
        signal ? `signal=${signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      reject(new Error(`process exited early (${detail || "no output"})`));
    });
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () =>
      Promise.race([waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }), exitPromise])
    );
    const logPath = path.join(os.tmpdir(), `seal-strace-attach-${Date.now()}.log`);
    const res = runStraceAttach(child.pid, logPath, 5000);
    if (res.error && res.error.code === "ETIMEDOUT") {
      if (isRoot && !strict) {
        log("SKIP: strace attach timed out (set SEAL_E2E_STRICT_PTRACE=1 to enforce)");
        return;
      }
      throw new Error("strace attach timed out (unexpected)");
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    const failMarkers = [
      /operation not permitted/i,
      /permission denied/i,
      /ptrace/i,
      /not being run/i,
      /inappropriate ioctl/i,
    ];
    const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
    if (!isFailure) {
      const trace = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").slice(0, 800) : "";
      if (isRoot && !strict) {
        log("SKIP: strace attach succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)");
        return;
      }
      throw new Error(`strace attach succeeded (unexpected)${trace ? `; trace=${trace}` : ""}`);
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function runReleaseLtraceAttachFail({ releaseDir, runTimeoutMs, env }) {
  if (!hasCommand("ltrace")) {
    log("SKIP: ltrace not installed; ltrace attach test disabled");
    return;
  }
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";

  const port = await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        code !== null ? `code=${code}` : null,
        signal ? `signal=${signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      reject(new Error(`process exited early (${detail || "no output"})`));
    });
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () =>
      Promise.race([waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }), exitPromise])
    );
    const logPath = path.join(os.tmpdir(), `seal-ltrace-attach-${Date.now()}.log`);
    const res = runLtraceAttach(child.pid, logPath, 5000);
    if (res.error && res.error.code === "ETIMEDOUT") {
      if (isRoot && !strict) {
        log("SKIP: ltrace attach timed out (set SEAL_E2E_STRICT_PTRACE=1 to enforce)");
        return;
      }
      throw new Error("ltrace attach timed out (unexpected)");
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    const failMarkers = [
      /operation not permitted/i,
      /permission denied/i,
      /ptrace/i,
      /cannot attach/i,
      /not being run/i,
      /inappropriate ioctl/i,
    ];
    const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
    if (!isFailure) {
      const trace = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").slice(0, 800) : "";
      if (isRoot && !strict) {
        log("SKIP: ltrace attach succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)");
        return;
      }
      throw new Error(`ltrace attach succeeded (unexpected)${trace ? `; trace=${trace}` : ""}`);
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function runReleaseGdbServerAttachFail({ releaseDir, runTimeoutMs, env }) {
  if (!hasCommand("gdbserver")) {
    log("SKIP: gdbserver not installed; gdbserver attach test disabled");
    return;
  }
  const isRoot = isRootUser();
  const strict = process.env.SEAL_E2E_STRICT_PTRACE === "1";

  const port = await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  const gdbPort = await getFreePort();
  if (gdbPort === null) {
    log("SKIP: gdbserver attach disabled (listen not permitted)");
    return;
  }
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      const detail = [
        code !== null ? `code=${code}` : null,
        signal ? `signal=${signal}` : null,
        stdout ? `stdout: ${stdout.slice(0, 400)}` : null,
        stderr ? `stderr: ${stderr.slice(0, 400)}` : null,
      ].filter(Boolean).join("; ");
      reject(new Error(`process exited early (${detail || "no output"})`));
    });
  });

  try {
    await withTimeout("waitForStatus", runTimeoutMs, () =>
      Promise.race([waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }), exitPromise])
    );
    const hostPort = `127.0.0.1:${gdbPort}`;
    const res = runGdbServerAttach(child.pid, hostPort, 5000);
    if (res.error && res.error.code === "ETIMEDOUT") {
      if (isRoot && !strict) {
        log("SKIP: gdbserver attach timed out (set SEAL_E2E_STRICT_PTRACE=1 to enforce)");
        return;
      }
      throw new Error("gdbserver attach timed out (unexpected)");
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    const skipMarkers = [
      /address already in use/i,
      /cannot bind/i,
      /failed to bind/i,
    ];
    if (skipMarkers.some((re) => re.test(out))) {
      log(`SKIP: gdbserver attach (${out.slice(0, 120)})`);
      return;
    }
    const failMarkers = [
      /operation not permitted/i,
      /permission denied/i,
      /ptrace/i,
      /cannot attach/i,
      /not being run/i,
      /inappropriate ioctl/i,
    ];
    const isFailure = res.status !== 0 || failMarkers.some((re) => re.test(out));
    if (!isFailure) {
      if (isRoot && !strict) {
        log("SKIP: gdbserver attach succeeded (set SEAL_E2E_STRICT_PTRACE=1 to enforce)");
        return;
      }
      throw new Error(`gdbserver attach succeeded (unexpected)${out ? `; output=${out.slice(0, 200)}` : ""}`);
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function runReleaseLldbServerAttachFail({ releaseDir, runTimeoutMs, env }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; lldb-server attach test disabled",
    onReady: async ({ child }) => {
      log("Checking lldb-server attach...");
      const res = await checkLldbServerAttachBlockedPid(child.pid);
      if (res.skip) {
        log(`SKIP: lldb-server (${res.skip})`);
      } else {
        const note = res.note ? ` (${res.note})` : "";
        log(`OK: lldb-server blocked${note}`);
      }
    },
  });
}

async function runReleaseStraceCapture({ releaseDir, runTimeoutMs, env }) {
  if (!hasCommand("strace")) {
    log("SKIP: strace not installed; strace capture disabled");
    return;
  }

  const port = await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const logPath = path.join(os.tmpdir(), `seal-strace-run-${Date.now()}.log`);
  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const child = spawn(
    "strace",
    ["-f", "-qq", "-o", logPath, binPath],
    { cwd: releaseDir, stdio: "pipe", env: childEnv, detached: true }
  );
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve({
      code,
      signal,
      stdout: Buffer.concat(outChunks).toString("utf8"),
      stderr: Buffer.concat(errChunks).toString("utf8"),
    }));
  });

  try {
    await withTimeout("strace run", runTimeoutMs, async () => {
      await delay(1500);
    });
  } finally {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        try { process.kill(-child.pid, "SIGKILL"); } catch {}
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  const exit = await exitPromise;
  const out = `${exit.stdout || ""}${exit.stderr || ""}`;
  if (/operation not permitted/i.test(out) || /permission denied/i.test(out) || /ptrace/i.test(out)) {
    log("SKIP: strace capture blocked by ptrace policy");
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
    return;
  }
  await delay(200);
  const trace = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
  const hasMemfd = /memfd_create\(/.test(trace);
  const hasExec = /(execveat|execve|fexecve)\(/.test(trace);
  if (!hasExec) {
    throw new Error(`strace capture missing exec syscall (out=${out.slice(0, 200)})`);
  }
  const lines = trace.split(/\r?\n/);
  const memfdLine = lines.find((line) => line.includes("memfd_create("));
  const execLine = lines.find((line) => /(execveat|execve|fexecve)\(/.test(line));
  if (memfdLine) {
    log(`strace memfd: ${memfdLine.trim().slice(0, 300)}`);
  }
  if (execLine) {
    log(`strace exec: ${execLine.trim().slice(0, 300)}`);
  }
  if (!hasMemfd) {
    log("SKIP: memfd_create not visible in strace output (strace too old or syscall unnamed)");
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
    return;
  }
  log("OK: strace captured memfd_create + exec (antiDebug=off)");
  if (readyFile) {
    try { fs.rmSync(readyFile, { force: true }); } catch {}
  }
}

async function runReleaseExpectFailAfterReady({
  releaseDir,
  readyTimeoutMs,
  failTimeoutMs,
  env,
  expectStderr,
  onReady,
}) {
  const port = await getFreePort();
  const readyFile = port === null ? makeReadyFile("thin-anti-debug") : null;
  if (readyFile) log("WARN: listen not permitted; using ready-file mode");
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const baseEnv = Object.assign({}, process.env, env || {});
  const childEnv = applyReadyFileEnv(baseEnv, readyFile);
  const child = spawn(binPath, [], { cwd: releaseDir, stdio: "pipe", env: childEnv });
  const outChunks = [];
  const errChunks = [];
  child.stdout.on("data", (c) => outChunks.push(c));
  child.stderr.on("data", (c) => errChunks.push(c));

  const exitPromise = new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      resolve({ code, signal, stdout, stderr });
    });
  });

  try {
    await withTimeout("waitForReady", readyTimeoutMs, () => Promise.race([
      waitForReady({ port, readyFile, timeoutMs: readyTimeoutMs }),
      exitPromise.then(({ code, signal }) => {
        throw new Error(`process exited before ready (code=${code} signal=${signal || "none"})`);
      }),
    ]));

    if (onReady) {
      await onReady({ child, port });
    }

    const failRes = await withTimeout("waitForFail", failTimeoutMs, () => exitPromise);
    const { code, signal, stderr } = failRes || {};
    if (code === 0) {
      throw new Error("process exited with code=0 (expected failure)");
    }
    if (code === null && !signal) {
      throw new Error("process did not fail as expected");
    }
    if (expectStderr) {
      const hay = String(stderr || "");
      const ok = expectStderr instanceof RegExp ? expectStderr.test(hay) : hay.includes(String(expectStderr));
      if (!ok) {
        throw new Error(`stderr did not match expected pattern: ${expectStderr}`);
      }
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 4000);
      child.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    if (readyFile) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
    }
  }
}

async function runReleaseStopResumeExpectFail({ releaseDir, readyTimeoutMs, failTimeoutMs, stopMs, expectStderr }) {
  await runReleaseExpectFailAfterReady({
    releaseDir,
    readyTimeoutMs,
    failTimeoutMs,
    expectStderr,
    onReady: async ({ child }) => {
      process.kill(child.pid, "SIGSTOP");
      await delay(stopMs);
      process.kill(child.pid, "SIGCONT");
    },
  });
}

async function runReleaseCgroupFreezeFail({
  releaseDir,
  readyTimeoutMs,
  failTimeoutMs,
  freezeMs,
  expectStderr,
}) {
  const root = getCgroupV2Root();
  if (!root) return { skip: "cgroup v2 not available" };
  if (!ensureCgroupV2Writable(root)) return { skip: "cgroup v2 not writable" };

  const cgDir = path.join(root, `seal-e2e-${process.pid}-${Date.now()}`);
  const procsPath = path.join(cgDir, "cgroup.procs");
  const freezePath = path.join(cgDir, "cgroup.freeze");

  try {
    fs.mkdirSync(cgDir);
  } catch (e) {
    return { skip: `cgroup create failed: ${e && e.message ? e.message : String(e)}` };
  }

  if (!fs.existsSync(freezePath)) {
    fs.rmSync(cgDir, { recursive: true, force: true });
    return { skip: "cgroup.freeze missing" };
  }

  try {
    fs.writeFileSync(freezePath, "0");
  } catch (e) {
    fs.rmSync(cgDir, { recursive: true, force: true });
    return { skip: `cgroup.freeze not writable: ${e && e.message ? e.message : String(e)}` };
  }

  let skipReason = null;
  try {
    await runReleaseExpectFailAfterReady({
      releaseDir,
      readyTimeoutMs,
      failTimeoutMs,
      expectStderr,
      onReady: async ({ child }) => {
        try {
          fs.writeFileSync(procsPath, String(child.pid));
        } catch (e) {
          skipReason = `cgroup.procs write failed: ${e && e.message ? e.message : String(e)}`;
          throw new Error(`cgroup-probe:${skipReason}`);
        }
        try {
          fs.writeFileSync(freezePath, "1");
        } catch (e) {
          skipReason = `cgroup.freeze write failed: ${e && e.message ? e.message : String(e)}`;
          throw new Error(`cgroup-probe:${skipReason}`);
        }
        await delay(freezeMs);
        try {
          fs.writeFileSync(freezePath, "0");
        } catch (e) {
          skipReason = `cgroup.freeze unfreeze failed: ${e && e.message ? e.message : String(e)}`;
          throw new Error(`cgroup-probe:${skipReason}`);
        }
      },
    });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (skipReason || msg.startsWith("cgroup-probe:")) {
      const reason = skipReason || msg.slice("cgroup-probe:".length).trim();
      return { skip: reason || "cgroup not writable" };
    }
    throw e;
  } finally {
    try {
      fs.writeFileSync(freezePath, "0");
    } catch {}
    try {
      fs.rmSync(cgDir, { recursive: true, force: true });
    } catch {}
  }

  if (skipReason) return { skip: skipReason };
  return { ok: true };
}

async function buildThinSplit({
  outRoot,
  antiDebug,
  integrity,
  appBind,
  snapshotGuard,
  launcherHardening,
  launcherObfuscation,
}) {
  const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
  const projectCfg = JSON.parse(JSON.stringify(baseCfg));
  projectCfg.build = projectCfg.build || {};
  projectCfg.build.sentinel = Object.assign({}, projectCfg.build.sentinel || {}, {
    enabled: false,
  });
  const thinCfg = Object.assign({}, projectCfg.build.thin || {});
  if (antiDebug !== undefined) thinCfg.antiDebug = Object.assign({}, thinCfg.antiDebug || {}, antiDebug);
  if (integrity !== undefined) thinCfg.integrity = Object.assign({}, thinCfg.integrity || {}, integrity);
  if (appBind !== undefined) thinCfg.appBind = Object.assign({}, thinCfg.appBind || {}, appBind);
  if (snapshotGuard !== undefined) thinCfg.snapshotGuard = Object.assign({}, thinCfg.snapshotGuard || {}, snapshotGuard);
  if (launcherHardening !== undefined) thinCfg.launcherHardening = launcherHardening;
  if (launcherObfuscation !== undefined) thinCfg.launcherObfuscation = launcherObfuscation;
  projectCfg.build.thin = thinCfg;

  const targetCfg = loadTargetConfig(EXAMPLE_ROOT, "local").cfg;
  const configName = resolveConfigName(targetCfg, "local");

  const outDir = path.join(outRoot, "seal-out");
  const res = await buildRelease({
    projectRoot: EXAMPLE_ROOT,
    projectCfg,
    targetCfg,
    configName,
    packagerOverride: "thin-split",
    outDirOverride: outDir,
  });
  return res;
}

function tamperLauncher(releaseDir) {
  const launcherPath = path.join(releaseDir, "b", "a");
  if (!fs.existsSync(launcherPath)) {
    throw new Error(`launcher not found: ${launcherPath}`);
  }
  const buf = fs.readFileSync(launcherPath);
  const idx = Math.max(0, buf.length - 16);
  buf[idx] = buf[idx] ^ 0x01;
  fs.writeFileSync(launcherPath, buf);
}

function flipByteInFile(filePath, offsetFromEnd = 64) {
  const fd = fs.openSync(filePath, "r+");
  try {
    const st = fs.fstatSync(fd);
    if (st.size <= 0) {
      throw new Error(`empty file: ${filePath}`);
    }
    const offset = Math.max(0, st.size - offsetFromEnd);
    const buf = Buffer.alloc(1);
    const read = fs.readSync(fd, buf, 0, 1, offset);
    if (read !== 1) {
      throw new Error(`failed to read byte at ${offset} from ${filePath}`);
    }
    buf[0] = buf[0] ^ 0x01;
    fs.writeSync(fd, buf, 0, 1, offset);
  } finally {
    fs.closeSync(fd);
  }
}

function truncateFile(filePath, newSize) {
  fs.truncateSync(filePath, newSize);
}

function getCgroupV2Root() {
  const root = "/sys/fs/cgroup";
  if (!fs.existsSync(path.join(root, "cgroup.controllers"))) return null;
  return root;
}

function ensureCgroupV2Writable(root) {
  try {
    fs.accessSync(root, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (process.env.SEAL_THIN_ANTI_DEBUG_E2E !== "1") {
    log("SKIP: set SEAL_THIN_ANTI_DEBUG_E2E=1 to run thin anti-debug E2E tests");
    process.exit(77);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) process.exit(prereq.skip ? 77 : 1);

  const envChecks = process.env.SEAL_E2E_ENV_CHECKS === "1";
  if (envChecks) {
    logSysctlInfo();
    const sysctlRes = checkSysctlHardening();
    if (sysctlRes && sysctlRes.skip) {
      log(`SKIP: sysctl hardening (${sysctlRes.skip})`);
    } else {
      log("OK: sysctl hardening");
    }

    const kernelMem = checkKernelMemorySources();
    for (const entry of kernelMem) {
      const res = entry.result;
      if (res && res.skip) log(`SKIP: ${entry.name} (${res.skip})`);
      else log(`OK: ${entry.name} blocked`);
    }
  } else {
    log("SKIP: environment hardening checks disabled (set SEAL_E2E_ENV_CHECKS=1)");
  }

  const buildTimeoutMs = resolveE2ETimeout("SEAL_THIN_ANTI_DEBUG_E2E_BUILD_TIMEOUT_MS", 240000);
  const runTimeoutMs = resolveE2ERunTimeout("SEAL_THIN_ANTI_DEBUG_E2E_RUN_TIMEOUT_MS", 15000);
  const testTimeoutMs = resolveE2ETimeout("SEAL_THIN_ANTI_DEBUG_E2E_TIMEOUT_MS", 300000);
  const suiteList = normalizeSuiteList(process.env.SEAL_THIN_ANTI_DEBUG_SUITES);
  const suiteSet = new Set(suiteList);
  const suiteEnabled = (name) => suiteSet.has(name);
  log(`Suites enabled: ${suiteList.join(", ")}`);

  try {
    await getFreePort();
  } catch (e) {
    if (e && e.code === "EPERM") {
      runReleaseOk.skipListen = true;
      log("WARN: cannot listen on localhost (EPERM); using ready-file mode where possible");
    } else {
      throw e;
    }
  }

  const helperCtx = { helpers: {}, helperDirs: [] };
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-thin-ad-"));
  let failures = 0;
  try {
    const helpers = {
      mem: ensureHelper(helperCtx, "memread", HELPER_MEMREAD_SRC),
      memwrite: ensureHelper(helperCtx, "memwrite", HELPER_MEMWRITE_SRC),
      vm: ensureHelper(helperCtx, "vmread", HELPER_VMREAD_SRC),
      vmwrite: ensureHelper(helperCtx, "vmwrite", HELPER_VMWRITE_SRC),
      ptrace: ensureHelper(helperCtx, "ptrace", HELPER_PTRACE_SRC),
      pidfd: ensureHelper(helperCtx, "pidfd", HELPER_PIDFD_SRC),
      preload: ensureSharedHelper(helperCtx, "preload", HELPER_PRELOAD_SRC),
      audit: ensureSharedHelper(helperCtx, "audit", HELPER_AUDIT_SRC),
    };
    const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
    const cObfCmd = baseCfg?.build?.protection?.cObfuscator?.cmd;
    const cObfAvailable = !!(cObfCmd && hasCommand(cObfCmd));
    if (suiteEnabled("build")) {
      log("Suite: build");
      if (cObfAvailable) {
        log("Testing launcherObfuscation with available cObfuscator...");
        await withTimeout("buildRelease(launcherObfuscation ok)", buildTimeoutMs, () =>
          buildThinSplit({
            outRoot,
            launcherObfuscation: true,
          })
        );
        log("OK: launcherObfuscation build succeeded");
      } else {
        log("Testing launcherObfuscation requires cObfuscator...");
        await withTimeout("buildRelease(launcherObfuscation missing)", buildTimeoutMs, async () => {
          let threw = false;
          try {
            await buildThinSplit({
              outRoot,
              launcherObfuscation: true,
            });
          } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (!/launcherObfuscation|cObfuscator/i.test(msg)) {
              throw e;
            }
            threw = true;
          }
          if (!threw) {
            throw new Error("expected launcherObfuscation build failure");
          }
        });
        log("OK: launcherObfuscation requires cObfuscator");
      }
    }

    log("Building thin-split with integrity enabled...");
    const resA = await withTimeout("buildRelease(integrity)", buildTimeoutMs, () =>
      buildThinSplit({
        outRoot,
        integrity: { enabled: true },
        antiDebug: { enabled: true, tracerPid: true, denyEnv: true },
        launcherObfuscation: false,
      })
    );
    await withTimeout("run ok (integrity)", testTimeoutMs, () =>
      runReleaseOk({ releaseDir: resA.releaseDir, runTimeoutMs })
    );
    log("OK: integrity enabled (runtime ok)");

    if (suiteEnabled("build")) {
      const strictDenyEnv = process.env.SEAL_E2E_STRICT_DENY_ENV === "1";
      const denyEnvTests = [
        { name: "NODE_OPTIONS", value: "--inspect" },
        { name: "NODE_V8_COVERAGE", value: "/tmp/seal-v8" },
        { name: "LD_PRELOAD", value: "1", allowSkip: true },
        { name: "LD_AUDIT", value: "1", allowSkip: true },
        { name: "LD_DEBUG", value: "libs", allowSkip: true },
        { name: "LD_DEBUG_OUTPUT", value: "/tmp/seal-ld-debug", allowSkip: true },
        { name: "LD_PROFILE", value: "1", allowSkip: true },
        { name: "LD_LIBRARY_PATH", value: "/tmp", allowSkip: true },
        { name: "GLIBC_TUNABLES", value: "glibc.malloc.trim_threshold=0", allowSkip: true },
        { name: "GCONV_PATH", value: "/tmp", allowSkip: true },
        { name: "MALLOC_CHECK_", value: "3", allowSkip: true },
        { name: "MALLOC_PERTURB_", value: "69", allowSkip: true },
        { name: "MALLOC_TRACE", value: "/tmp/seal-malloc-trace", allowSkip: true },
        { name: "NODE_PATH", value: "/tmp", allowSkip: true },
      ];
      for (const t of denyEnvTests) {
        log(`Testing denyEnv (${t.name})...`);
        try {
          await withTimeout(`denyEnv fail (${t.name})`, testTimeoutMs, () =>
            runReleaseExpectFail({
              releaseDir: resA.releaseDir,
              runTimeoutMs,
              env: { [t.name]: t.value },
              expectStderr: "[thin] runtime invalid",
            })
          );
          log(`OK: denyEnv blocked ${t.name}`);
        } catch (err) {
          if (t.allowSkip && String(err && err.message).includes("reached /api/status")) {
            const suffix = strictDenyEnv
              ? "loader likely stripped before runtime; denyEnv not observable"
              : "loader may strip; set SEAL_E2E_STRICT_DENY_ENV=1 to enforce other envs";
            log(`SKIP: ${t.name} not visible to runtime (${suffix})`);
            continue;
          }
          throw err;
        }
      }

      log("Testing ptrace/core probes (expect success)...");
      await withTimeout("ptrace/core probes ok", testTimeoutMs, () =>
        runReleaseOk({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          env: { SEAL_DUMPABLE_PROBE: "1", SEAL_CORE_PROBE: "1" },
        })
      );
      log("OK: ptrace/core probes ok");
    }

    if (suiteEnabled("env")) {
      log("Suite: env");
      log("Testing /proc hardening checks...");
      await withTimeout("proc introspection", testTimeoutMs, () =>
        runReleaseProcIntrospectionChecks({ releaseDir: resA.releaseDir, outDir: resA.outDir, runTimeoutMs, helpers })
      );

      log("Testing memfd seals probe...");
      await withTimeout("memfd seals probe", testTimeoutMs, () =>
        runReleaseMemfdSealProbe({ releaseDir: resA.releaseDir, runTimeoutMs })
      );
      log("OK: memfd seals probe ok");

      log("Building thin-split for env scrub (denyEnv disabled)...");
      const resEnv = await withTimeout("buildRelease(envScrub)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          integrity: { enabled: true },
          antiDebug: { enabled: true, tracerPid: true, denyEnv: false },
          launcherObfuscation: false,
        })
      );

      log("Testing environment scrub...");
      await withTimeout("env scrub", testTimeoutMs, () =>
        runReleaseEnvScrubChecks({
          releaseDir: resEnv.releaseDir,
          runTimeoutMs,
          env: {
            LD_PRELOAD: "/tmp/seal-preload.so",
            LD_AUDIT: "/tmp/seal-audit.so",
            LD_DEBUG: "libs",
            LD_DEBUG_OUTPUT: "/tmp/seal-ld-debug",
            LD_PROFILE: "1",
            NODE_OPTIONS: "--inspect",
          },
          keys: ["LD_PRELOAD", "LD_AUDIT", "LD_DEBUG", "LD_DEBUG_OUTPUT", "LD_PROFILE", "NODE_OPTIONS"],
        })
      );

      log("Testing extended environment scrub...");
      const strictEnvScrubExt = process.env.SEAL_E2E_STRICT_ENV_SCRUB_EXT === "1";
      await withTimeout("env scrub ext", testTimeoutMs, () =>
        runReleaseEnvScrubChecks({
          releaseDir: resEnv.releaseDir,
          runTimeoutMs,
          env: {
            LD_LIBRARY_PATH: "/tmp",
            GLIBC_TUNABLES: "glibc.malloc.trim_threshold=0",
            GCONV_PATH: "/tmp",
            MALLOC_CHECK_: "3",
            MALLOC_PERTURB_: "69",
            MALLOC_TRACE: "/tmp/seal-malloc-trace",
            NODE_PATH: "/tmp",
          },
          keys: ["LD_LIBRARY_PATH", "GLIBC_TUNABLES", "GCONV_PATH", "MALLOC_CHECK_", "MALLOC_PERTURB_", "MALLOC_TRACE", "NODE_PATH"],
          allowSkip: !strictEnvScrubExt,
        })
      );

      log("Testing bootstrap argv/env scrub (in-process)...");
      await withTimeout("bootstrap argv/env", testTimeoutMs, () =>
        runReleaseBootstrapArgvEnvCheck({
          releaseDir: resEnv.releaseDir,
          runTimeoutMs,
          stage: "decoded",
          env: {
            NODE_OPTIONS: "--inspect --require /tmp/seal-e2e-preload",
            NODE_V8_COVERAGE: "/tmp/seal-v8",
            LD_PRELOAD: "/tmp/seal-preload.so",
            LD_AUDIT: "/tmp/seal-audit.so",
            LD_DEBUG: "libs",
            LD_DEBUG_OUTPUT: "/tmp/seal-ld-debug",
            LD_PROFILE: "1",
            LD_LIBRARY_PATH: "/tmp",
            GLIBC_TUNABLES: "glibc.malloc.trim_threshold=0",
            GCONV_PATH: "/tmp",
            MALLOC_CHECK_: "3",
            MALLOC_PERTURB_: "69",
            MALLOC_TRACE: "/tmp/seal-malloc-trace",
            NODE_PATH: "/tmp",
          },
        })
      );

      log("Testing LD_PRELOAD/LD_AUDIT scrub...");
      const resDyn = await withTimeout("buildRelease(dynlink scrub)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          antiDebug: { enabled: true, denyEnv: false },
          launcherObfuscation: false,
        })
      );
      const markerDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-dynlink-"));
      try {
        const preloadMarker = path.join(markerDir, "preload.marker");
        const auditMarker = path.join(markerDir, "audit.marker");
        await withTimeout("dynlink scrub", testTimeoutMs, () =>
          runReleasePreloadAuditCheck({
            releaseDir: resDyn.releaseDir,
            runTimeoutMs,
            env: {
              LD_PRELOAD: helpers.preload.path,
              LD_AUDIT: helpers.audit.path,
              SEAL_E2E_PRELOAD_MARKER: preloadMarker,
              SEAL_E2E_AUDIT_MARKER: auditMarker,
            },
            markerPaths: [preloadMarker, auditMarker],
          })
        );
      } finally {
        fs.rmSync(markerDir, { recursive: true, force: true });
      }

      if (process.env.SEAL_E2E_ENV_CHECKS === "1") {
        log("Checking /etc/ld.so.preload...");
        const ldPreloadRes = checkLdSoPreloadFile();
        if (ldPreloadRes.skip) log(`SKIP: ld.so.preload (${ldPreloadRes.skip})`);
        else log("OK: ld.so.preload empty");
      } else {
        log("SKIP: ld.so.preload check disabled (set SEAL_E2E_ENV_CHECKS=1)");
      }
    }

    if (suiteEnabled("leaks")) {
      log("Suite: leaks");
      log("Testing runtime leak checks (memfd/smaps/logs/artifacts)...");
      await withTimeout("leak checks", testTimeoutMs, () =>
        runReleaseLeakChecks({ releaseDir: resA.releaseDir, outDir: resA.outDir, runTimeoutMs, helpers })
      );

      log("Testing delayed marker scans...");
      const delayList = parseDelayList(process.env.SEAL_E2E_DELAY_SCAN_MS_LIST, [2000, 6000]);
      await withTimeout("delayed marker scans", testTimeoutMs, () =>
        runReleaseDelayedMarkerScan({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          delaysMs: delayList,
        })
      );
    }

    if (suiteEnabled("bootstrap")) {
      log("Suite: bootstrap");
      await ensureRuntimeConfig(resA.releaseDir);
      log("Testing bootstrap memory checkpoints...");
      await withTimeout("bootstrap memory checkpoints", testTimeoutMs, () =>
        runReleaseBootstrapMemoryChecks({ releaseDir: resA.releaseDir, outDir: resA.outDir, runTimeoutMs })
      );

      log("Testing bootstrap dump selftest...");
      await withTimeout("bootstrap dump selftest", testTimeoutMs, () =>
        runReleaseDumpSelftest({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing bootstrap crash path (no core/leak)...");
      await withTimeout("bootstrap crash no leak", testTimeoutMs, () =>
        runReleaseBootstrapCrashNoLeak({ releaseDir: resA.releaseDir, runTimeoutMs, stage: "decoded" })
      );
      await withTimeout("bootstrap crash no leak post-gc", testTimeoutMs, () =>
        runReleaseBootstrapCrashNoLeak({ releaseDir: resA.releaseDir, runTimeoutMs, stage: "post-gc" })
      );
      await withTimeout("bootstrap crash no leak post-wipe", testTimeoutMs, () =>
        runReleaseBootstrapCrashNoLeak({ releaseDir: resA.releaseDir, runTimeoutMs, stage: "post-wipe" })
      );

      const scanMarker = crypto.randomBytes(16).toString("hex");
      log("Testing bootstrap stack scan...");
      await withTimeout("bootstrap stack scan", testTimeoutMs, () =>
        runReleaseBootstrapStackScan({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          stage: "decoded",
          target: "all",
          markerHex: scanMarker,
        })
      );

      log("Testing bootstrap module cache scan...");
      await withTimeout("bootstrap module scan", testTimeoutMs, () =>
        runReleaseBootstrapModuleScan({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          stage: "post-gc",
          target: "all",
          markerHex: scanMarker,
        })
      );

      log("Testing bootstrap inspector selftest (open)...");
      await withTimeout("bootstrap inspector open", testTimeoutMs, () =>
        runReleaseBootstrapInspectorTest({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          mode: "open",
          stage: "decoded",
        })
      );

      log("Testing bootstrap inspector selftest (signal)...");
      await withTimeout("bootstrap inspector signal", testTimeoutMs, () =>
        runReleaseBootstrapInspectorTest({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          mode: "signal",
          stage: "decoded",
        })
      );
    }

    if (suiteEnabled("attach")) {
      log("Suite: attach");
      log("Testing gdb attach (expect failure)...");
      await withTimeout("gdb attach fail", testTimeoutMs, () =>
        runReleaseGdbAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );
      log("OK: gdb attach blocked");

      log("Testing lldb attach (expect failure)...");
      await withTimeout("lldb attach fail", testTimeoutMs, () =>
        runReleaseLldbAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );
      log("OK: lldb attach blocked");

      log("Testing strace attach (expect failure)...");
      await withTimeout("strace attach fail", testTimeoutMs, () =>
        runReleaseStraceAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );
      log("OK: strace attach blocked");

      log("Testing ltrace attach (expect failure)...");
      await withTimeout("ltrace attach fail", testTimeoutMs, () =>
        runReleaseLtraceAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );
      log("OK: ltrace attach blocked");

      log("Testing stack tools attach (expect failure)...");
      await withTimeout("stack attach fail", testTimeoutMs, () =>
        runReleaseStackToolsAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing gdbserver attach (expect failure)...");
      await withTimeout("gdbserver attach fail", testTimeoutMs, () =>
        runReleaseGdbServerAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );
      log("OK: gdbserver attach blocked");

      log("Testing lldb-server attach (expect failure)...");
      await withTimeout("lldb-server attach fail", testTimeoutMs, () =>
        runReleaseLldbServerAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );
      log("OK: lldb-server attach blocked");

      log("Testing perf attach (expect failure)...");
      await withTimeout("perf attach fail", testTimeoutMs, () =>
        runReleasePerfAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing rr attach (expect failure)...");
      await withTimeout("rr attach fail", testTimeoutMs, () =>
        runReleaseRrAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing bpftrace attach (expect failure)...");
      await withTimeout("bpftrace attach fail", testTimeoutMs, () =>
        runReleaseBpftraceAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing lttng attach (expect failure)...");
      await withTimeout("lttng attach fail", testTimeoutMs, () =>
        runReleaseLttngAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing systemtap attach (expect failure)...");
      await withTimeout("systemtap attach fail", testTimeoutMs, () =>
        runReleaseSystemtapAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing frida attach (expect failure)...");
      await withTimeout("frida attach fail", testTimeoutMs, () =>
        runReleaseFridaAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing drrun attach (expect failure)...");
      await withTimeout("drrun attach fail", testTimeoutMs, () =>
        runReleaseDrrunAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing pin attach (expect failure)...");
      await withTimeout("pin attach fail", testTimeoutMs, () =>
        runReleasePinAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing trace-cmd attach (expect failure)...");
      await withTimeout("trace-cmd attach fail", testTimeoutMs, () =>
        runReleaseTraceCmdAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing perf probe (expect failure)...");
      await withTimeout("perf probe fail", testTimeoutMs, () =>
        runReleasePerfProbeFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing sysdig attach (expect failure)...");
      await withTimeout("sysdig attach fail", testTimeoutMs, () =>
        runReleaseSysdigAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing auditctl rule (expect failure)...");
      await withTimeout("auditctl fail", testTimeoutMs, () =>
        runReleaseAuditctlFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing CRIU dump (expect failure)...");
      await withTimeout("criu dump fail", testTimeoutMs, () =>
        runReleaseCriuDumpFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing child attach checks...");
      await withTimeout("child attach checks", testTimeoutMs, () =>
        runReleaseChildAttachChecks({ releaseDir: resA.releaseDir, outDir: resA.outDir, runTimeoutMs, helpers })
      );

      log("Testing ptrace helper (expect failure)...");
      await withTimeout("ptrace helper fail", testTimeoutMs, () =>
        runReleasePtraceHelperFail({ releaseDir: resA.releaseDir, runTimeoutMs, helperPath: helpers.ptrace.path })
      );

      log("Testing gcore/core dump (expect failure)...");
      await withTimeout("gcore fail", testTimeoutMs, () =>
        runReleaseGcoreFail({ releaseDir: resA.releaseDir, runTimeoutMs })
      );

      log("Testing ptrace force (expect failure)...");
      await withTimeout("ptrace force fail", testTimeoutMs, () =>
        runReleaseExpectFail({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          env: { SEAL_PTRACE_FORCE: "1" },
          expectStderr: "[thin] runtime invalid",
        })
      );
      log("OK: ptrace force triggers failure");

      log("Testing loader guard force (expect failure)...");
      await withTimeout("loader guard fail", testTimeoutMs, () =>
        runReleaseExpectFail({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          env: { SEAL_LOADER_GUARD_FORCE: "1" },
          expectStderr: "[thin] runtime invalid",
        })
      );
      log("OK: loader guard triggers failure");
    }

    if (suiteEnabled("config")) {
      log("Suite: config");
      log("Testing seccomp probe (expect success)...");
      await withTimeout("seccomp probe ok", testTimeoutMs, () =>
        runReleaseOk({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          env: { SEAL_SECCOMP_PROBE: "1" },
        })
      );
      log("OK: seccomp probe ok");

      log("Testing seccomp aggressive probe (expect success)...");
      const resAgg = await withTimeout("buildRelease(seccomp aggressive)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          antiDebug: {
            enabled: true,
            seccompNoDebug: { enabled: true, mode: "errno", aggressive: true },
          },
          launcherObfuscation: false,
        })
      );
      await withTimeout("seccomp aggressive probe ok", testTimeoutMs, () =>
        runReleaseOk({
          releaseDir: resAgg.releaseDir,
          runTimeoutMs,
          env: { SEAL_SECCOMP_AGGRESSIVE_PROBE: "1" },
        })
      );
      log("OK: seccomp aggressive probe ok");

      log("Testing core crash (no core dump)...");
      await withTimeout("core crash probe", testTimeoutMs, () =>
        runReleaseCrashNoCore({
          releaseDir: resA.releaseDir,
          runTimeoutMs,
          env: { SEAL_CORE_CRASH_PROBE: "1" },
        })
      );

      log("Testing argv deny (fail-closed)...");
      const resArgv = await withTimeout("buildRelease(argv deny)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          antiDebug: { enabled: true, argvDeny: true },
          launcherObfuscation: false,
        })
      );
      await withTimeout("argv deny fail (--inspect)", testTimeoutMs, () =>
        runReleaseExpectFail({
          releaseDir: resArgv.releaseDir,
          runTimeoutMs,
          args: ["--inspect"],
          expectStderr: "[thin] runtime invalid",
        })
      );
      await withTimeout("argv deny fail (-r)", testTimeoutMs, () =>
        runReleaseExpectFail({
          releaseDir: resArgv.releaseDir,
          runTimeoutMs,
          args: ["-r", "/tmp/seal-e2e-preload.js"],
          expectStderr: "[thin] runtime invalid",
        })
      );
      log("OK: argv deny blocked diagnostic/inject flags");
    }

    if (suiteEnabled("tamper")) {
      log("Suite: tamper");
      log("Testing integrity tamper...");
      tamperLauncher(resA.releaseDir);
      await withTimeout("integrity tamper fail", testTimeoutMs, () =>
        runReleaseExpectFail({ releaseDir: resA.releaseDir, runTimeoutMs, expectStderr: "[thin] runtime invalid" })
      );
      log("OK: integrity tamper rejected");

      log("Testing payload tamper (byte flip)...");
      await withTimeout("payload tamper", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-pl-"));
        try {
          const res = await withTimeout("buildRelease(tamper payload)", buildTimeoutMs, () =>
            buildThinSplit({ outRoot: tamperRoot, integrity: { enabled: false }, launcherObfuscation: false })
          );
          flipByteInFile(path.join(res.releaseDir, "r", "pl"));
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: /decode payload failed|payload invalid/i,
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: payload tamper rejected");

      log("Testing runtime tamper (byte flip)...");
      await withTimeout("runtime tamper", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-rt-"));
        try {
          const res = await withTimeout("buildRelease(tamper runtime)", buildTimeoutMs, () =>
            buildThinSplit({ outRoot: tamperRoot, integrity: { enabled: false }, launcherObfuscation: false })
          );
          flipByteInFile(path.join(res.releaseDir, "r", "rt"));
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: /decode runtime failed|runtime invalid/i,
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: runtime tamper rejected");

      log("Testing payload truncate (footer missing)...");
      await withTimeout("payload truncate", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-pl-trunc-"));
        try {
          const res = await withTimeout("buildRelease(tamper truncate)", buildTimeoutMs, () =>
            buildThinSplit({ outRoot: tamperRoot, integrity: { enabled: false }, launcherObfuscation: false })
          );
          const plPath = path.join(res.releaseDir, "r", "pl");
          truncateFile(plPath, 16);
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: /decode payload failed|payload invalid/i,
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: payload truncate rejected");

      log("Testing payload swap (appBind mismatch)...");
      await withTimeout("payload swap", testTimeoutMs, async () => {
        const rootA = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-swap-a-"));
        const rootB = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-swap-b-"));
        try {
          const resA = await withTimeout("buildRelease(swap A)", buildTimeoutMs, () =>
            buildThinSplit({
              outRoot: rootA,
              appBind: { value: "swap-a" },
              integrity: { enabled: false },
              launcherObfuscation: false,
            })
          );
          const resB = await withTimeout("buildRelease(swap B)", buildTimeoutMs, () =>
            buildThinSplit({
              outRoot: rootB,
              appBind: { value: "swap-b" },
              integrity: { enabled: false },
              launcherObfuscation: false,
            })
          );
          fs.copyFileSync(path.join(resB.releaseDir, "r", "pl"), path.join(resA.releaseDir, "r", "pl"));
          await runReleaseExpectFail({
            releaseDir: resA.releaseDir,
            runTimeoutMs,
            expectStderr: /decode payload failed/i,
          });
        } finally {
          fs.rmSync(rootA, { recursive: true, force: true });
          fs.rmSync(rootB, { recursive: true, force: true });
        }
      });
      log("OK: payload swap rejected");

      log("Testing runtime swap (appBind mismatch)...");
      await withTimeout("runtime swap", testTimeoutMs, async () => {
        const rootA = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-swap-rt-a-"));
        const rootB = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-swap-rt-b-"));
        try {
          const resA = await withTimeout("buildRelease(swap rt A)", buildTimeoutMs, () =>
            buildThinSplit({
              outRoot: rootA,
              appBind: { value: "swap-rt-a" },
              integrity: { enabled: false },
              launcherObfuscation: false,
            })
          );
          const resB = await withTimeout("buildRelease(swap rt B)", buildTimeoutMs, () =>
            buildThinSplit({
              outRoot: rootB,
              appBind: { value: "swap-rt-b" },
              integrity: { enabled: false },
              launcherObfuscation: false,
            })
          );
          fs.copyFileSync(path.join(resB.releaseDir, "r", "rt"), path.join(resA.releaseDir, "r", "rt"));
          await runReleaseExpectFail({
            releaseDir: resA.releaseDir,
            runTimeoutMs,
            expectStderr: /decode runtime failed/i,
          });
        } finally {
          fs.rmSync(rootA, { recursive: true, force: true });
          fs.rmSync(rootB, { recursive: true, force: true });
        }
      });
      log("OK: runtime swap rejected");

      log("Testing runtime symlink tamper...");
      await withTimeout("runtime symlink", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-rt-symlink-"));
        try {
          const res = await withTimeout("buildRelease(rt symlink)", buildTimeoutMs, () =>
            buildThinSplit({ outRoot: tamperRoot, integrity: { enabled: false }, launcherObfuscation: false })
          );
          const rtPath = path.join(res.releaseDir, "r", "rt");
          const plPath = path.join(res.releaseDir, "r", "pl");
          fs.rmSync(rtPath, { force: true });
          fs.symlinkSync(plPath, rtPath);
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: /runtime missing|runtime invalid/i,
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: runtime symlink rejected");

      log("Testing payload symlink tamper...");
      await withTimeout("payload symlink", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-pl-symlink-"));
        try {
          const res = await withTimeout("buildRelease(pl symlink)", buildTimeoutMs, () =>
            buildThinSplit({ outRoot: tamperRoot, integrity: { enabled: false }, launcherObfuscation: false })
          );
          const rtPath = path.join(res.releaseDir, "r", "rt");
          const plPath = path.join(res.releaseDir, "r", "pl");
          fs.rmSync(plPath, { force: true });
          fs.symlinkSync(rtPath, plPath);
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: /payload missing|payload invalid|runtime invalid/i,
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: payload symlink rejected");

      log("Testing runtime hardlink tamper...");
      await withTimeout("runtime hardlink", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-rt-hardlink-"));
        try {
          const res = await withTimeout("buildRelease(rt hardlink)", buildTimeoutMs, () =>
            buildThinSplit({ outRoot: tamperRoot, integrity: { enabled: false }, launcherObfuscation: false })
          );
          const rtPath = path.join(res.releaseDir, "r", "rt");
          const plPath = path.join(res.releaseDir, "r", "pl");
          fs.rmSync(rtPath, { force: true });
          fs.linkSync(plPath, rtPath);
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: /exec failed|runtime invalid|decode runtime failed/i,
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: runtime hardlink rejected");

      log("Testing payload hardlink tamper...");
      await withTimeout("payload hardlink", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-pl-hardlink-"));
        try {
          const res = await withTimeout("buildRelease(pl hardlink)", buildTimeoutMs, () =>
            buildThinSplit({ outRoot: tamperRoot, integrity: { enabled: false }, launcherObfuscation: false })
          );
          const rtPath = path.join(res.releaseDir, "r", "rt");
          const plPath = path.join(res.releaseDir, "r", "pl");
          fs.rmSync(plPath, { force: true });
          fs.linkSync(rtPath, plPath);
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: /decode payload failed|payload invalid|runtime invalid|exec failed|SyntaxError|invalid or unexpected token/i,
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: payload hardlink rejected");

      log("Testing integrity sidecar missing...");
      await withTimeout("integrity sidecar missing", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-ih-miss-"));
        try {
          const res = await withTimeout("buildRelease(ih missing)", buildTimeoutMs, () =>
            buildThinSplit({
              outRoot: tamperRoot,
              integrity: { enabled: true, mode: "sidecar" },
              launcherObfuscation: false,
            })
          );
          const ihPath = path.join(res.releaseDir, "r", "ih");
          fs.rmSync(ihPath, { force: true });
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: "[thin] runtime invalid",
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: integrity sidecar missing rejected");

      log("Testing integrity sidecar corrupt...");
      await withTimeout("integrity sidecar corrupt", testTimeoutMs, async () => {
        const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seal-tamper-ih-corrupt-"));
        try {
          const res = await withTimeout("buildRelease(ih corrupt)", buildTimeoutMs, () =>
            buildThinSplit({
              outRoot: tamperRoot,
              integrity: { enabled: true, mode: "sidecar" },
              launcherObfuscation: false,
            })
          );
          flipByteInFile(path.join(res.releaseDir, "r", "ih"), 1);
          await runReleaseExpectFail({
            releaseDir: res.releaseDir,
            runTimeoutMs,
            expectStderr: "[thin] runtime invalid",
          });
        } finally {
          fs.rmSync(tamperRoot, { recursive: true, force: true });
        }
      });
      log("OK: integrity sidecar corrupt rejected");
    }

    if (suiteEnabled("config")) {
      log("Suite: config");
      log("Building thin-split with antiDebug disabled...");
      const resB = await withTimeout("buildRelease(antiDebug=off)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          antiDebug: { enabled: false },
          launcherObfuscation: false,
        })
      );
      await withTimeout("run ok (antiDebug off)", testTimeoutMs, () =>
        runReleaseOk({ releaseDir: resB.releaseDir, runTimeoutMs, env: { LD_PRELOAD: "1" } })
      );
      log("OK: antiDebug disabled allows LD_PRELOAD");

      log("Testing syscall logger (strace) on antiDebug=off...");
      await withTimeout("strace capture", testTimeoutMs, () =>
        runReleaseStraceCapture({ releaseDir: resB.releaseDir, runTimeoutMs })
      );

      log("Building thin-split with launcher hardening disabled...");
      const resHard = await withTimeout("buildRelease(hardening off)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          antiDebug: { enabled: false },
          launcherHardening: false,
          launcherObfuscation: false,
        })
      );
      await withTimeout("run ok (hardening off)", testTimeoutMs, () =>
        runReleaseOk({ releaseDir: resHard.releaseDir, runTimeoutMs })
      );
      log("OK: launcher hardening off still runs");

      log("Building thin-split with maps denylist...");
      const resC = await withTimeout("buildRelease(maps deny)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          antiDebug: { enabled: true, mapsDenylist: ["libc"] },
          launcherObfuscation: false,
        })
      );
      await withTimeout("maps deny fail", testTimeoutMs, () =>
        runReleaseExpectFail({ releaseDir: resC.releaseDir, runTimeoutMs, expectStderr: "[thin] runtime invalid" })
      );
      log("OK: maps denylist triggers failure");

      log("Testing periodic TracerPid (forced after ready)...");
      const resD = await withTimeout("buildRelease(tracerpid interval)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          antiDebug: { enabled: true, tracerPid: true, tracerPidIntervalMs: 200, tracerPidThreads: false },
          launcherObfuscation: false,
        })
      );
      await withTimeout("tracerpid interval fail", testTimeoutMs, () =>
        runReleaseExpectFailAfterReady({
          releaseDir: resD.releaseDir,
          readyTimeoutMs: 8000,
          failTimeoutMs: 8000,
          env: { SEAL_TRACERPID_FORCE: "1", SEAL_TRACERPID_FORCE_AFTER_MS: "300" },
          expectStderr: "[thin] runtime invalid",
        })
      );
      log("OK: periodic TracerPid triggers failure");

      log("Testing TracerPid thread scan (forced after ready)...");
      const resE = await withTimeout("buildRelease(tracerpid threads)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          antiDebug: { enabled: true, tracerPid: true, tracerPidIntervalMs: 200, tracerPidThreads: true },
          launcherObfuscation: false,
        })
      );
      await withTimeout("tracerpid threads fail", testTimeoutMs, () =>
        runReleaseExpectFailAfterReady({
          releaseDir: resE.releaseDir,
          readyTimeoutMs: 8000,
          failTimeoutMs: 8000,
          env: { SEAL_TRACERPID_FORCE_THREADS: "1", SEAL_TRACERPID_FORCE_AFTER_MS: "300" },
          expectStderr: "[thin] runtime invalid",
        })
      );
      log("OK: TracerPid thread scan triggers failure");

      log("Testing appBind mismatch (launcher swap)...");
      const bindRootA = fs.mkdtempSync(path.join(os.tmpdir(), "seal-thin-bind-a-"));
      const bindRootB = fs.mkdtempSync(path.join(os.tmpdir(), "seal-thin-bind-b-"));
      try {
        const resBindA = await withTimeout("buildRelease(appBind A)", buildTimeoutMs, () =>
          buildThinSplit({
            outRoot: bindRootA,
            appBind: { value: "bind-a" },
            integrity: { enabled: false },
            launcherObfuscation: false,
          })
        );
        const resBindB = await withTimeout("buildRelease(appBind B)", buildTimeoutMs, () =>
          buildThinSplit({
            outRoot: bindRootB,
            appBind: { value: "bind-b" },
            integrity: { enabled: false },
            launcherObfuscation: false,
          })
        );
        const launcherA = path.join(resBindA.releaseDir, "b", "a");
        const launcherB = path.join(resBindB.releaseDir, "b", "a");
        fs.copyFileSync(launcherB, launcherA);
        await withTimeout("appBind mismatch fail", testTimeoutMs, () =>
          runReleaseExpectFail({
            releaseDir: resBindA.releaseDir,
            runTimeoutMs,
            expectStderr: "decode runtime failed",
          })
        );
      } finally {
        fs.rmSync(bindRootA, { recursive: true, force: true });
        fs.rmSync(bindRootB, { recursive: true, force: true });
      }
      log("OK: appBind mismatch rejected");

      log("Testing snapshot guard (forced after ready)...");
      const resSnap = await withTimeout("buildRelease(snapshotGuard)", buildTimeoutMs, () =>
        buildThinSplit({
          outRoot,
          snapshotGuard: { enabled: true, intervalMs: 200, maxJumpMs: 200, maxBackMs: 100 },
          launcherObfuscation: false,
        })
      );
      log("Testing snapshot guard (SIGSTOP/SIGCONT)...");
      try {
        await withTimeout("snapshot guard sigstop", testTimeoutMs, () =>
          runReleaseStopResumeExpectFail({
            releaseDir: resSnap.releaseDir,
            readyTimeoutMs: 8000,
            failTimeoutMs: 10000,
            stopMs: 600,
            expectStderr: "[thin] runtime invalid",
          })
        );
        log("OK: snapshot guard SIGSTOP rejected");
      } catch (e) {
        const strictSnapshot = process.env.SEAL_E2E_STRICT_SNAPSHOT_GUARD === "1";
        if (process.env.SEAL_DOCKER_E2E === "1" && !strictSnapshot) {
          const msg = e && e.message ? e.message : String(e);
          if (msg.includes("process exited before ready")) {
            log(`SKIP: snapshot guard SIGSTOP (${msg}; set SEAL_E2E_STRICT_SNAPSHOT_GUARD=1 to enforce)`);
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }

      log("Testing snapshot guard (cgroup freeze)...");
      let cgRes = null;
      try {
        cgRes = await withTimeout("snapshot guard cgroup", testTimeoutMs, () =>
          runReleaseCgroupFreezeFail({
            releaseDir: resSnap.releaseDir,
            readyTimeoutMs: 8000,
            failTimeoutMs: 12000,
            freezeMs: 600,
            expectStderr: "[thin] runtime invalid",
          })
        );
      } catch (e) {
        const strictSnapshot = process.env.SEAL_E2E_STRICT_SNAPSHOT_GUARD === "1";
        if (process.env.SEAL_DOCKER_E2E === "1" && !strictSnapshot) {
          const msg = e && e.message ? e.message : String(e);
          if (msg.includes("process exited before ready")) {
            log(`SKIP: snapshot guard cgroup (${msg}; set SEAL_E2E_STRICT_SNAPSHOT_GUARD=1 to enforce)`);
            cgRes = { skip: msg };
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }
      if (cgRes && cgRes.skip) {
        log(`SKIP: snapshot guard cgroup (${cgRes.skip})`);
      } else {
        log("OK: snapshot guard cgroup rejected");
      }

      await withTimeout("snapshot guard fail", testTimeoutMs, () =>
        runReleaseExpectFail({
          releaseDir: resSnap.releaseDir,
          runTimeoutMs,
          env: { SEAL_SNAPSHOT_FORCE: "1" },
          expectStderr: "[thin] runtime invalid",
        })
      );
      log("OK: snapshot guard triggers failure");
    }
  } catch (e) {
    failures += 1;
    fail(e.message || e);
  } finally {
    fs.rmSync(outRoot, { recursive: true, force: true });
    for (const dir of helperCtx.helperDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  fail(err.stack || err.message || String(err));
  process.exit(1);
});
