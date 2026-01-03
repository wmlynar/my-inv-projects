"use strict";

const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const SKIP_CODE = 77;
const DEFAULT_SPAWN_TIMEOUT_MS = 15000;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveCommand(cmd) {
  if (!cmd) return null;
  const str = String(cmd);
  if (!str) return null;
  const hasSlash = str.includes("/") || str.includes("\\");
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";")
    : [""];
  const candidates = [];
  if (hasSlash) {
    candidates.push(str);
  } else {
    const pathEnv = process.env.PATH || "";
    for (const dir of pathEnv.split(path.delimiter)) {
      if (!dir) continue;
      for (const ext of exts) {
        candidates.push(path.join(dir, str + ext));
      }
    }
  }
  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (!stat.isFile()) continue;
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // ignore
    }
  }
  return null;
}

function hasCommand(cmd) {
  return !!resolveCommand(cmd);
}

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function resolveE2ETimeoutScale() {
  const override = parseNumber(process.env.SEAL_E2E_TIMEOUT_SCALE);
  if (override !== null && override > 0) return override;
  if (process.env.SEAL_E2E_SLOW === "1") return 2;
  if (process.env.SEAL_DOCKER_E2E === "1") return 2;
  return 1;
}

function isUnderRoot(root, candidate) {
  if (!root || !candidate) return false;
  const rel = path.relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function resolveTmpRoot() {
  const env = process.env;
  const envRoot = env.SEAL_E2E_TMP_ROOT || env.SEAL_TMPDIR || env.TMPDIR || env.TMP || env.TEMP;
  const e2eRoot = env.SEAL_E2E_ROOT || "";
  const runRoot = env.SEAL_E2E_RUN_ROOT || "";
  const allowExternal = env.SEAL_E2E_TMP_ALLOW_EXTERNAL === "1";

  if (envRoot) {
    const resolved = path.resolve(envRoot);
    if (!resolved.startsWith("/tmp") && !resolved.startsWith("/var/tmp")) {
      const allowed = allowExternal
        || (runRoot && isUnderRoot(runRoot, resolved))
        || (e2eRoot && isUnderRoot(e2eRoot, resolved));
      if (allowed) {
        ensureDir(resolved);
        return resolved;
      }
      const fallbackRoot = e2eRoot || path.join(process.cwd(), "seal-out", "e2e");
      const fallback = path.join(fallbackRoot, "tmp");
      console.warn(`WARN: ignoring temp root outside E2E root (${resolved}); using ${fallback}.`);
      ensureDir(fallback);
      return fallback;
    }
  }

  const fallbackRoot = e2eRoot || path.join(process.cwd(), "seal-out", "e2e");
  const fallback = path.join(fallbackRoot, "tmp");
  ensureDir(fallback);
  return fallback;
}

function resolveE2ETimeout(envKey, defaultMs) {
  const override = envKey ? parseNumber(process.env[envKey]) : null;
  if (override !== null) return override;
  const scale = resolveE2ETimeoutScale();
  return Math.max(1, Math.round(defaultMs * scale));
}

function resolveE2ERunTimeout(envKey, defaultMs) {
  const override = parseNumber(process.env[envKey]);
  if (override !== null) return override;
  const base = resolveE2ETimeout(null, defaultMs);
  const jobs = Math.max(1, parseNumber(process.env.SEAL_E2E_JOBS) || 1);
  const scaled = base + (jobs - 1) * 5000;
  return Math.min(base * 4, scaled);
}

function makeReadyFile(label) {
  const safeLabel = String(label || "seal")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "");
  const name = `${safeLabel}-ready-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`;
  return path.join(resolveTmpRoot(), name);
}

function applyReadyFileEnv(env, readyFile) {
  const out = Object.assign({}, env || {});
  if (readyFile) {
    out.SEAL_E2E_READY_FILE = readyFile;
    out.SEAL_E2E_NO_LISTEN = "1";
  }
  return out;
}

async function waitForReadyFile(filePath, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timeout waiting for ready file: ${filePath}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgsEnv(raw, envName, opts = {}) {
  const emptyValue = Object.prototype.hasOwnProperty.call(opts, "empty") ? opts.empty : null;
  if (!raw) return emptyValue;
  const trimmed = String(raw).trim();
  if (!trimmed) return emptyValue;
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        throw new Error("expected JSON array");
      }
      return parsed.map((v) => String(v));
    } catch (err) {
      const label = envName || "args";
      const msg = err && err.message ? err.message : String(err);
      throw new Error(`${label} must be a valid JSON array (${msg})`);
    }
  }
  return trimmed.split(/\s+/).filter(Boolean);
}

function parseJsonOrNull(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

async function readReadyPayload(readyFile, raw, timeoutMs = 1000) {
  let payload = parseJsonOrNull(raw);
  if (payload) return payload;
  if (!readyFile) return null;
  const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
  while (Date.now() < deadline) {
    await delay(100);
    try {
      const next = fs.readFileSync(readyFile, "utf8");
      payload = parseJsonOrNull(next);
      if (payload) return payload;
    } catch {
      // ignore and retry
    }
  }
  return null;
}

function spawnSyncWithTimeout(cmd, args, options = {}) {
  const opts = { ...(options || {}) };
  if (opts.timeout === undefined) {
    const raw = process.env.SEAL_E2E_SPAWN_TIMEOUT_MS;
    const parsed = raw !== undefined ? Number(raw) : NaN;
    opts.timeout = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SPAWN_TIMEOUT_MS;
  }
  return spawnSync(cmd, args, opts);
}

function withTimeout(label, ms, fn) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([Promise.resolve().then(fn), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function httpJson({ port, path: reqPath, method, body, timeoutMs, host }) {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request(
      {
        host: host || "127.0.0.1",
        port,
        path: reqPath,
        method: method || "GET",
        timeout: timeoutMs,
        headers: payload
          ? { "content-type": "application/json", "content-length": payload.length }
          : undefined,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 0,
            json,
            text,
          });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timeout"));
    });
    if (payload) req.write(payload);
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

function createRollingBuffer(maxBytes = 16000) {
  let text = "";
  return {
    append(chunk) {
      const next = text + chunk.toString("utf8");
      text = next.length > maxBytes ? next.slice(-maxBytes) : next;
    },
    read() {
      return text;
    },
  };
}

function captureProcessOutput(child, options = {}) {
  const opts = typeof options === "number" ? { maxBytes: options } : (options || {});
  const maxBytes = Number.isFinite(opts.maxBytes) && opts.maxBytes > 0 ? opts.maxBytes : 16000;
  const full = opts.full === true;
  const stdout = createRollingBuffer(maxBytes);
  const stderr = createRollingBuffer(maxBytes);
  const stdoutChunks = [];
  const stderrChunks = [];
  const onStdout = (chunk) => {
    stdout.append(chunk);
    if (full) stdoutChunks.push(chunk);
  };
  const onStderr = (chunk) => {
    stderr.append(chunk);
    if (full) stderrChunks.push(chunk);
  };
  if (child && child.stdout) child.stdout.on("data", onStdout);
  if (child && child.stderr) child.stderr.on("data", onStderr);

  const readText = (buf, chunks) => {
    if (!full) return buf.read();
    if (!chunks.length) return "";
    return Buffer.concat(chunks).toString("utf8");
  };

  return {
    stdout,
    stderr,
    format() {
      const out = stdout.read();
      const err = stderr.read();
      return `${out ? `\n--- stdout ---\n${out}` : ""}${err ? `\n--- stderr ---\n${err}` : ""}`;
    },
    text() {
      return {
        stdout: readText(stdout, stdoutChunks),
        stderr: readText(stderr, stderrChunks),
      };
    },
  };
}

function terminateChild(child, timeoutMs = 4000) {
  if (!child || child.killed || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } finally {
        finish();
      }
    }, timeoutMs);
    child.once("exit", finish);
    try {
      child.kill("SIGTERM");
    } catch {
      finish();
    }
  });
}

function cleanupReadyFile(readyFile) {
  if (!readyFile) return;
  try {
    fs.rmSync(readyFile, { force: true });
  } catch {
    // ignore
  }
}

async function withSealedBinary(opts, fn) {
  const options = opts || {};
  const label = options.label || "seal";
  const releaseDir = options.releaseDir;
  const binPath = options.binPath;
  const args = Array.isArray(options.args) ? options.args : [];
  const runTimeoutMs = options.runTimeoutMs;
  const writeRuntimeConfig = options.writeRuntimeConfig;
  const env = options.env || null;
  const uid = Number.isFinite(options.uid) ? options.uid : null;
  const gid = Number.isFinite(options.gid) ? options.gid : null;
  const skipListen = options.skipListen === true;
  const captureOutput = options.captureOutput;
  const log = options.log;

  if (!releaseDir) throw new Error("Missing releaseDir");
  if (!binPath) throw new Error("Missing binPath");
  if (typeof runTimeoutMs !== "number") throw new Error("Missing runTimeoutMs");

  const port = skipListen ? null : await getFreePort();
  const readyFile = port === null ? makeReadyFile(label) : null;
  if (readyFile && typeof log === "function") {
    log("WARN: listen not permitted; using ready-file mode");
  }
  if (typeof writeRuntimeConfig === "function") {
    writeRuntimeConfig(releaseDir, port);
  }

  const childEnv = applyReadyFileEnv(Object.assign({}, process.env, env || {}), readyFile);
  const childOpts = { cwd: releaseDir, stdio: ["ignore", "pipe", "pipe"], env: childEnv };
  if (uid !== null) childOpts.uid = uid;
  if (gid !== null) childOpts.gid = gid;
  const child = spawn(binPath, args, childOpts);
  const captureEnabled = captureOutput === true || (captureOutput && typeof captureOutput === "object");
  const logs = captureEnabled ? captureProcessOutput(child, captureOutput === true ? {} : captureOutput) : null;
  if (!captureEnabled) {
    if (child.stdout) child.stdout.on("data", () => {});
    if (child.stderr) child.stderr.on("data", () => {});
  }

  const exitInfo = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  const spawnError = new Promise((_, reject) => {
    child.once("error", (err) => {
      reject(new Error(`spawn failed: ${err && err.message ? err.message : String(err)}`));
    });
  });
  spawnError.catch(() => {});

  const exitFailure = exitInfo.then(({ code, signal }) => {
    const detail = [
      code !== null ? `code=${code}` : null,
      signal ? `signal=${signal}` : null,
    ].filter(Boolean).join(", ");
    const suffix = logs ? logs.format() : "";
    throw new Error(`app exited (${detail || "no output"})${suffix}`);
  });
  exitFailure.catch(() => {});

  const waitForReadyEnabled = options.waitForReady !== false;
  const failOnExit = options.failOnExit !== false;
  try {
    const ready = waitForReadyEnabled
      ? await withTimeout("waitForStatus", runTimeoutMs, () =>
        Promise.race([waitForReady({ port, readyFile, timeoutMs: runTimeoutMs }), exitFailure, spawnError])
      )
      : null;
    if (typeof fn === "function") {
      const callbackPromise = fn({ child, port, readyFile, ready, logs, exitInfo });
      if (failOnExit) {
        return await Promise.race([callbackPromise, exitFailure, spawnError]);
      }
      return await Promise.race([callbackPromise, spawnError]);
    }
    return ready;
  } finally {
    await terminateChild(child);
    cleanupReadyFile(readyFile);
  }
}

function stripAnsi(input) {
  return String(input || "").replace(/\u001b\[[0-9;]*m/g, "");
}

function resolveExampleRoot() {
  return process.env.SEAL_E2E_EXAMPLE_ROOT || path.resolve(__dirname, "..", "..", "example");
}

function createLogger(prefix) {
  const tag = prefix.startsWith("[") ? prefix : `[${prefix}]`;
  const log = (msg) => process.stdout.write(`${tag} ${msg}\n`);
  const warn = (msg) => process.stdout.write(`${tag} WARN: ${msg}\n`);
  const error = (msg) => process.stderr.write(`${tag} ERROR: ${msg}\n`);
  const fail = (msg) => {
    error(msg);
    process.exitCode = 1;
  };
  const skip = (msg) => {
    const line = msg.startsWith("SKIP:") ? msg : `SKIP: ${msg}`;
    log(line);
    process.exitCode = SKIP_CODE;
    return true;
  };
  return { log, warn, error, fail, skip };
}

module.exports = {
  SKIP_CODE,
  resolveCommand,
  hasCommand,
  resolveE2ERunTimeout,
  resolveE2ETimeout,
  makeReadyFile,
  applyReadyFileEnv,
  waitForReadyFile,
  delay,
  parseArgsEnv,
  readReadyPayload,
  spawnSyncWithTimeout,
  resolveTmpRoot,
  withTimeout,
  httpJson,
  waitForStatus,
  waitForReady,
  getFreePort,
  captureProcessOutput,
  terminateChild,
  cleanupReadyFile,
  withSealedBinary,
  stripAnsi,
  resolveExampleRoot,
  createLogger,
};
