"use strict";

const E2E_JS_DUMP_TOKEN = "SEAL_E2E_JS_DUMP_FIXTURE_v1__c9a0f2e63d4b4a2b9c2fdc1c3a8f4e6d";
const E2E_JS_DUMP_PAD = "X".repeat(64);

function enableE2ELeakFixture() {
  if (process.env.SEAL_E2E_JS_DUMP_FIXTURE !== "1") return false;
  const token = E2E_JS_DUMP_TOKEN;
  const payload = `${token}::${E2E_JS_DUMP_PAD}`;
  const copies = [];
  for (let i = 0; i < 6; i += 1) {
    copies.push(`${payload}:${i}`);
  }
  const buf = Buffer.from(payload, "utf8");
  const chunk = Buffer.concat([buf, buf]);
  globalThis.__SEAL_E2E_JS_DUMP_FIXTURE = {
    token,
    payload,
    copies,
    buf,
    chunk,
  };
  return true;
}

module.exports = { E2E_JS_DUMP_TOKEN, enableE2ELeakFixture };
