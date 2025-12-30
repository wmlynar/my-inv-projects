"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const md5 = require("md5");

const { loadRuntimeConfig } = require("./config");
const { createLogger } = require("./logger");
const { readJsonFile } = require("./files");
const { externalEcho } = require("./external");
const { runObfChecks } = require("./obfChecks");
const { enableE2ELeakFixture } = require("./e2eLeak");

const BUILD_ID = (typeof __SEAL_BUILD_ID__ !== "undefined") ? __SEAL_BUILD_ID__ : "DEV";
const APP_NAME = (typeof __SEAL_APP_NAME__ !== "undefined") ? __SEAL_APP_NAME__ : "seal-example";

function main() {
  let cfg;
  try {
    cfg = loadRuntimeConfig();
  } catch (e) {
    // Friendly fatal: show what to do
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      msg: "startup.config_missing",
      data: {
        code: e.code || null,
        message: e.message,
        tip: "Copy seal-config/configs/<variant>.json5 to ./config.runtime.json5 (CWD = release dir).",
      }
    }));
    process.exit(2);
  }

  const logger = createLogger(cfg.log);
  enableE2ELeakFixture();
  const readyFile = process.env.SEAL_E2E_READY_FILE || "";
  const noListen = process.env.SEAL_E2E_NO_LISTEN === "1";

  const writeReadyFile = () => {
    if (!readyFile) return;
    try {
      fs.mkdirSync(path.dirname(readyFile), { recursive: true });
      fs.writeFileSync(readyFile, JSON.stringify({
        ts: new Date().toISOString(),
        pid: process.pid,
        appName: APP_NAME,
        buildId: BUILD_ID,
      }));
    } catch (e) {
      logger.error("startup.ready_failed", { file: readyFile, error: { message: e.message } });
    }
  };

  // Read local file (runtime) – this demonstrates "extra local files"
  let features = { features: {}, notes: "missing features file" };
  try {
    features = readJsonFile(cfg.featuresFile);
  } catch (e) {
    logger.error("features.read_failed", { file: cfg.featuresFile, error: { message: e.message } });
  }

  const app = express();
  app.use(express.json({ limit: "256kb" }));

  // Minimal request logging (only in debug)
  app.use((req, res, next) => {
    if (logger.isDebug) {
      logger.debug("http.request", { method: req.method, path: req.path });
    }
    next();
  });

  // Static assets
  app.use(express.static(path.join(process.cwd(), "public")));

  // Health
  app.get("/healthz", (req, res) => res.json({ ok: true }));

  // Status
  app.get("/api/status", (req, res) => {
    res.json({
      ok: true,
      appName: APP_NAME,
      buildId: BUILD_ID,
      pid: process.pid,
      cwd: process.cwd(),
      http: cfg.http,
      logLevel: cfg.log.level,
      features,
    });
  });

  // MD5 helper
  app.post("/api/md5", (req, res) => {
    const text = String((req.body && req.body.text) || "");
    const hash = md5(text);
    res.json({ ok: true, textLength: text.length, md5: hash });
  });

  // Obfuscation checks (E2E): validates runtime semantics under heavy transforms
  app.get("/api/obf/checks", async (req, res) => {
    try {
      const result = await runObfChecks();
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: { message: e.message } });
    }
  });

  // External call (debug logs show full request/response)
  app.get("/api/external/ping", async (req, res) => {
    try {
      const r = await externalEcho({ url: cfg.external.echoUrl, timeoutMs: cfg.external.timeoutMs, logger });
      res.json({ ok: true, external: { status: r.status, durationMs: r.durationMs, reqId: r.reqId }, bodyPreview: (r.body||"").slice(0, 500) });
    } catch (e) {
      res.status(502).json({ ok: false, error: { message: e.message, code: e.code || null } });
    }
  });

  // UI fallback
  app.get("*", (req, res) => {
    const p = path.join(process.cwd(), "public", "index.html");
    if (fs.existsSync(p)) return res.sendFile(p);
    res.status(404).send("missing public/index.html");
  });

  if (noListen) {
    logger.info("startup.ready", {
      appName: APP_NAME,
      buildId: BUILD_ID,
      host: cfg.http.host,
      port: cfg.http.port,
      logLevel: cfg.log.level,
      featuresFile: cfg.featuresFile,
      noListen: true,
    });
    writeReadyFile();
    setInterval(() => {}, 1000);
    return;
  }

  app.listen(cfg.http.port, cfg.http.host, () => {
    logger.info("startup.listen", {
      appName: APP_NAME,
      buildId: BUILD_ID,
      host: cfg.http.host,
      port: cfg.http.port,
      logLevel: cfg.log.level,
      featuresFile: cfg.featuresFile,
    });
    writeReadyFile();
  });
}

main();
