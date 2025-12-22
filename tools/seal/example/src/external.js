"use strict";

function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

async function externalEcho({ url, timeoutMs, logger }) {
  const start = Date.now();
  const reqId = Math.random().toString(16).slice(2);

  logger.debug("external.request", { reqId, url, method: "GET" });

  try {
    const res = await withTimeout(fetch(url, { method: "GET" }), timeoutMs);
    const text = await res.text();
    const ms = Date.now() - start;

    // keep log size sane
    const preview = text.length > 1200 ? text.slice(0, 1200) + "…(truncated)" : text;

    logger.debug("external.response", {
      reqId,
      url,
      status: res.status,
      durationMs: ms,
      bodyPreview: preview,
    });

    return { ok: res.ok, status: res.status, body: text, durationMs: ms, reqId };
  } catch (e) {
    const ms = Date.now() - start;
    logger.error("external.error", {
      reqId,
      url,
      durationMs: ms,
      error: {
        name: e.name,
        code: e.code || null,
        message: e.message,
      }
    });
    throw e;
  }
}

module.exports = { externalEcho };
