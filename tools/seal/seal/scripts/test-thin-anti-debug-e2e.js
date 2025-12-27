#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const { buildRelease } = require("../src/lib/build");
const { loadProjectConfig, loadTargetConfig, resolveConfigName } = require("../src/lib/project");
const { readJson5, writeJson5 } = require("../src/lib/json5io");

const EXAMPLE_ROOT = process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");
const ERRNO = { EPERM: 1, EACCES: 13 };

function log(msg) {
  process.stdout.write(`[thin-anti-debug-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[thin-anti-debug-e2e] ERROR: ${msg}\n`);
}

function runCmd(cmd, args, timeoutMs = 5000) {
  return spawnSync(cmd, args, { stdio: "pipe", timeout: timeoutMs });
}

function hasCommand(cmd) {
  const res = runCmd("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`]);
  return res.status === 0;
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

function getReadableMapAddresses(pid, limit = 5) {
  const maps = readProcMaps(pid);
  if (maps === null) return { blocked: true, addresses: [] };
  const addrs = [];
  for (const line of maps.split(/\r?\n/)) {
    if (!line) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const range = parts[0];
    const perms = parts[1];
    if (!perms || perms[0] !== "r") continue;
    const dash = range.indexOf("-");
    if (dash <= 0) continue;
    const start = range.slice(0, dash);
    if (!/^[0-9a-fA-F]+$/.test(start)) continue;
    addrs.push(start);
    if (addrs.length >= limit) break;
  }
  return { blocked: false, addresses: addrs };
}

function parseHelperErrno(output) {
  const match = /(open|read|vmread|ptrace):(\d+)/.exec(output || "");
  return match ? Number(match[2]) : null;
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

function checkProcMemBlocked(pid, helperPath) {
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
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

function checkVmReadBlocked(pid, helperPath) {
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
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

function checkPtraceBlocked(pid, helperPath) {
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

async function runReleaseOk({ releaseDir, runTimeoutMs, env }) {
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

      log("Checking /proc/<pid>/mem access...");
      const memRes = checkProcMemBlocked(pid, helpers.mem.path);
      if (memRes.skip) {
        log(`SKIP: /proc/<pid>/mem (${memRes.skip})`);
      } else {
        const note = memRes.note ? ` (${memRes.note})` : "";
        log(`OK: /proc/<pid>/mem blocked${note}`);
      }

      log("Checking process_vm_readv access...");
      const vmRes = checkVmReadBlocked(pid, helpers.vm.path);
      if (vmRes.skip) {
        log(`SKIP: process_vm_readv (${vmRes.skip})`);
      } else {
        const note = vmRes.note ? ` (${vmRes.note})` : "";
        log(`OK: process_vm_readv blocked${note}`);
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

async function runReleaseExpectFailAfterReady({ releaseDir, readyTimeoutMs, failTimeoutMs, env, expectStderr }) {
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

async function main() {
  if (process.env.SEAL_THIN_ANTI_DEBUG_E2E !== "1") {
    log("SKIP: set SEAL_THIN_ANTI_DEBUG_E2E=1 to run thin anti-debug E2E tests");
    process.exit(0);
  }
  const prereq = checkPrereqs();
  if (!prereq.ok) process.exit(prereq.skip ? 0 : 1);

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
      vm: ensureHelper(helperCtx, "vmread", HELPER_VMREAD_SRC),
      ptrace: ensureHelper(helperCtx, "ptrace", HELPER_PTRACE_SRC),
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
      { name: "LD_PRELOAD", value: "1", allowSuccess: true },
      { name: "LD_AUDIT", value: "1", allowSuccess: true },
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
        if (t.allowSuccess && !strictDenyEnv && /reached \/api\/status/.test(String(err && err.message))) {
          log(`SKIP: ${t.name} not visible to runtime (loader may strip); set SEAL_E2E_STRICT_DENY_ENV=1 to enforce`);
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

    log("Testing integrity tamper...");
    tamperLauncher(resA.releaseDir);
    await withTimeout("integrity tamper fail", testTimeoutMs, () =>
      runReleaseExpectFail({ releaseDir: resA.releaseDir, runTimeoutMs, expectStderr: "[thin] runtime invalid" })
    );
    log("OK: integrity tamper rejected");

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
