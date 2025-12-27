#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { hasCommand } = require("./e2e-utils");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");
const ERRNO = { EPERM: 1, EACCES: 13, EFAULT: 14 };

function log(msg) {
  process.stdout.write(`[thin-anti-debug-e2e] ${msg}\n`);
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

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
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
  cfg.http.port = port;
  writeJson5(path.join(releaseDir, "config.runtime.json5"), cfg);
}

async function runReleaseWithReady({ releaseDir, runTimeoutMs, env, onReady, skipMessage }) {
  if (runReleaseOk.skipListen) {
    log(skipMessage || "SKIP: listen not permitted; runtime check disabled");
    return;
  }
  const port = await getFreePort();
  const gdbPort = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([waitForStatus(port), exitPromise]));
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
  }
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

function readProcLimits(pid) {
  const limitsPath = path.join("/proc", String(pid), "limits");
  try {
    return fs.readFileSync(limitsPath, "utf8");
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

function readSysctlValue(pathname) {
  try {
    return fs.readFileSync(pathname, "utf8").trim();
  } catch {
    return null;
  }
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
  const gdbPort = await getFreePort();
  const hostPort = `127.0.0.1:${gdbPort}`;
  const res = runGdbServerAttach(pid, hostPort, 5000);
  if (res.error && res.error.code === "ETIMEDOUT") {
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
    throw new Error(`gdbserver attach succeeded (unexpected)${out ? `; output=${out.slice(0, 200)}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkGdbAttachBlockedPid(pid) {
  if (!hasCommand("gdb")) return { skip: "gdb not installed" };
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
    throw new Error(`gdb attach succeeded (unexpected)${out ? `; output=${out.slice(0, 200)}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkStraceAttachBlockedPid(pid) {
  if (!hasCommand("strace")) return { skip: "strace not installed" };
  const logPath = path.join(os.tmpdir(), `seal-strace-attach-${pid}-${Date.now()}.log`);
  const res = runStraceAttach(pid, logPath, 5000);
  if (res.error && res.error.code === "ETIMEDOUT") {
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
    throw new Error(`strace attach succeeded (unexpected)${trace ? `; trace=${trace}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkLtraceAttachBlockedPid(pid) {
  if (!hasCommand("ltrace")) return { skip: "ltrace not installed" };
  const logPath = path.join(os.tmpdir(), `seal-ltrace-attach-${pid}-${Date.now()}.log`);
  const res = runLtraceAttach(pid, logPath, 5000);
  if (res.error && res.error.code === "ETIMEDOUT") {
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
    throw new Error(`ltrace attach succeeded (unexpected)${trace ? `; trace=${trace}` : ""}`);
  }
  return { ok: true, note: out.slice(0, 200) };
}

function checkStackToolBlocked(cmd, args, label) {
  const name = label || cmd;
  if (!hasCommand(cmd)) return { skip: `${name} not installed` };
  const res = runCmd(cmd, args, 8000);
  if (res.error && res.error.code === "ETIMEDOUT") {
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
      if (isRoot && !strict) {
        return { skip: "root can read /proc/<pid>/mem (set SEAL_E2E_STRICT_PROC_MEM=1 to enforce)" };
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
      if (isRoot && !strict) {
        return { skip: "root can write /proc/<pid>/mem (set SEAL_E2E_STRICT_PROC_MEM=1 to enforce)" };
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
  try {
    const res = runGcore(pid, prefix);
    if (!res) {
      return { skip: "gcore/gdb missing" };
    }
    if (res.error && res.error.code === "ETIMEDOUT") {
      throw new Error("gcore timed out (unexpected)");
    }
    const out = `${res.stdout || ""}${res.stderr || ""}`.trim();
    const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith("seal-core"));
    if (res.status === 0 && files.length > 0) {
      throw new Error("gcore succeeded and produced core (unexpected)");
    }
    if (res.status === 0 && files.length === 0) {
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
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }
  const port = await getFreePort();
  const gdbPort = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([waitForStatus(port), exitPromise]));
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
}

async function runReleaseExpectFail({ releaseDir, runTimeoutMs, env, expectStderr }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }
  const port = await getFreePort();
  const gdbPort = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
    const winner = await withTimeout("expectFail", runTimeoutMs, () => Promise.race([
      exitPromise,
      waitForStatus(port).then(() => ({ ok: true })),
    ]));
    if (winner && winner.ok) {
      throw new Error("process reached /api/status (expected failure)");
    }
    const { code, signal, stderr } = winner || {};
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
  }
}

async function runReleaseProcIntrospectionChecks({ releaseDir, runTimeoutMs, env, helpers }) {
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
    },
  });
}

async function runReleaseEnvScrubChecks({ releaseDir, runTimeoutMs, env, keys }) {
  await runReleaseWithReady({
    releaseDir,
    runTimeoutMs,
    env,
    skipMessage: "SKIP: listen not permitted; env scrub check disabled",
    onReady: async ({ child }) => {
      log("Checking scrubbed environment...");
      const res = checkEnvScrubbed(child.pid, keys);
      if (res.skip) {
        log(`SKIP: environ scrub (${res.skip})`);
      } else {
        log("OK: environment scrubbed");
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

async function runReleaseChildAttachChecks({ releaseDir, runTimeoutMs, helpers }) {
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

        const ptraceRes = checkPtraceBlocked(pid, helpers.ptrace.path);
        if (ptraceRes.skip) log(`SKIP: child ptrace (${ptraceRes.skip})`);
        else log("OK: child ptrace blocked");

        const gdbRes = checkGdbAttachBlockedPid(pid);
        if (gdbRes.skip) log(`SKIP: child gdb (${gdbRes.skip})`);
        else log("OK: child gdb blocked");

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
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; core crash test disabled");
    return;
  }
  const port = await getFreePort();
  const gdbPort = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
      waitForStatus(port).then(() => ({ ok: true })),
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
  }
}

async function runReleaseGdbAttachFail({ releaseDir, runTimeoutMs, env }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; gdb attach test disabled");
    return;
  }
  if (!hasCommand("gdb")) {
    log("SKIP: gdb not installed; gdb attach test disabled");
    return;
  }

  const port = await getFreePort();
  const gdbPort = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([waitForStatus(port), exitPromise]));
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
  }
}

async function runReleaseStraceAttachFail({ releaseDir, runTimeoutMs, env }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; strace attach test disabled");
    return;
  }
  if (!hasCommand("strace")) {
    log("SKIP: strace not installed; strace attach test disabled");
    return;
  }

  const port = await getFreePort();
  const gdbPort = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([waitForStatus(port), exitPromise]));
    const logPath = path.join(os.tmpdir(), `seal-strace-attach-${Date.now()}.log`);
    const res = runStraceAttach(child.pid, logPath, 5000);
    if (res.error && res.error.code === "ETIMEDOUT") {
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
  }
}

async function runReleaseLtraceAttachFail({ releaseDir, runTimeoutMs, env }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; ltrace attach test disabled");
    return;
  }
  if (!hasCommand("ltrace")) {
    log("SKIP: ltrace not installed; ltrace attach test disabled");
    return;
  }

  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([waitForStatus(port), exitPromise]));
    const logPath = path.join(os.tmpdir(), `seal-ltrace-attach-${Date.now()}.log`);
    const res = runLtraceAttach(child.pid, logPath, 5000);
    if (res.error && res.error.code === "ETIMEDOUT") {
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
  }
}

async function runReleaseGdbServerAttachFail({ releaseDir, runTimeoutMs, env }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; gdbserver attach test disabled");
    return;
  }
  if (!hasCommand("gdbserver")) {
    log("SKIP: gdbserver not installed; gdbserver attach test disabled");
    return;
  }

  const port = await getFreePort();
  const gdbPort = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
    await withTimeout("waitForStatus", runTimeoutMs, () => Promise.race([waitForStatus(port), exitPromise]));
    const hostPort = `127.0.0.1:${gdbPort}`;
    const res = runGdbServerAttach(child.pid, hostPort, 5000);
    if (res.error && res.error.code === "ETIMEDOUT") {
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
  }
}

async function runReleaseStraceCapture({ releaseDir, runTimeoutMs, env }) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; strace capture disabled");
    return;
  }
  if (!hasCommand("strace")) {
    log("SKIP: strace not installed; strace capture disabled");
    return;
  }

  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const logPath = path.join(os.tmpdir(), `seal-strace-run-${Date.now()}.log`);
  const childEnv = Object.assign({}, process.env, env || {});
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
    return;
  }
  log("OK: strace captured memfd_create + exec (antiDebug=off)");
}

async function runReleaseExpectFailAfterReady({
  releaseDir,
  readyTimeoutMs,
  failTimeoutMs,
  env,
  expectStderr,
  onReady,
}) {
  if (runReleaseOk.skipListen) {
    log("SKIP: listen not permitted; runtime check disabled");
    return;
  }
  const port = await getFreePort();
  writeRuntimeConfig(releaseDir, port);

  const binPath = path.join(releaseDir, "seal-example");
  assert.ok(fs.existsSync(binPath), `Missing binary: ${binPath}`);

  const childEnv = Object.assign({}, process.env, env || {});
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
      waitForStatus(port),
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
    fs.rmSync(cgDir, { recursive: true, force: true });
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
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) process.exit(prereq.skip ? 0 : 1);

  logSysctlInfo();

  const buildTimeoutMs = Number(process.env.SEAL_THIN_ANTI_DEBUG_E2E_BUILD_TIMEOUT_MS || "240000");
  const runTimeoutMs = Number(process.env.SEAL_THIN_ANTI_DEBUG_E2E_RUN_TIMEOUT_MS || "15000");
  const testTimeoutMs = Number(process.env.SEAL_THIN_ANTI_DEBUG_E2E_TIMEOUT_MS || "300000");

  try {
    await getFreePort();
  } catch (e) {
    if (e && e.code === "EPERM") {
      runReleaseOk.skipListen = true;
      log("SKIP: cannot listen on localhost (EPERM)");
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
      preload: ensureSharedHelper(helperCtx, "preload", HELPER_PRELOAD_SRC),
      audit: ensureSharedHelper(helperCtx, "audit", HELPER_AUDIT_SRC),
    };
    const baseCfg = loadProjectConfig(EXAMPLE_ROOT);
    const cObfCmd = baseCfg?.build?.protection?.cObfuscator?.cmd;
    const cObfAvailable = !!(cObfCmd && hasCommand(cObfCmd));
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
          if (!msg.includes("launcherObfuscation")) {
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

    const strictDenyEnv = process.env.SEAL_E2E_STRICT_DENY_ENV === "1";
    const denyEnvTests = [
      { name: "NODE_OPTIONS", value: "--inspect" },
      { name: "NODE_V8_COVERAGE", value: "/tmp/seal-v8" },
      { name: "LD_PRELOAD", value: "1", allowSkip: true },
      { name: "LD_AUDIT", value: "1", allowSkip: true },
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
        if (t.allowSkip && /reached \/api\/status/.test(String(err && err.message))) {
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

    log("Testing /proc hardening checks...");
    await withTimeout("proc introspection", testTimeoutMs, () =>
      runReleaseProcIntrospectionChecks({ releaseDir: resA.releaseDir, runTimeoutMs, helpers })
    );

    log("Testing environment scrub...");
    await withTimeout("env scrub", testTimeoutMs, () =>
      runReleaseEnvScrubChecks({
        releaseDir: resA.releaseDir,
        runTimeoutMs,
        env: {
          LD_PRELOAD: "/tmp/seal-preload.so",
          LD_AUDIT: "/tmp/seal-audit.so",
          NODE_OPTIONS: "--inspect",
        },
        keys: ["LD_PRELOAD", "LD_AUDIT", "NODE_OPTIONS"],
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

    log("Testing gdb attach (expect failure)...");
    await withTimeout("gdb attach fail", testTimeoutMs, () =>
      runReleaseGdbAttachFail({ releaseDir: resA.releaseDir, runTimeoutMs })
    );
    log("OK: gdb attach blocked");

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

    log("Testing child attach checks...");
    await withTimeout("child attach checks", testTimeoutMs, () =>
      runReleaseChildAttachChecks({ releaseDir: resA.releaseDir, runTimeoutMs, helpers })
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
          expectStderr: /decode payload failed|payload invalid|runtime invalid|exec failed/i,
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
        runReleaseExpectFail({ releaseDir: resBindA.releaseDir, runTimeoutMs, expectStderr: "decode runtime failed" })
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

    log("Testing snapshot guard (cgroup freeze)...");
    const cgRes = await withTimeout("snapshot guard cgroup", testTimeoutMs, () =>
      runReleaseCgroupFreezeFail({
        releaseDir: resSnap.releaseDir,
        readyTimeoutMs: 8000,
        failTimeoutMs: 12000,
        freezeMs: 600,
        expectStderr: "[thin] runtime invalid",
      })
    );
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
