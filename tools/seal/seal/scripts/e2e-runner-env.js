"use strict";

function setEnvDefault(env, key, value) {
  if (env[key] === undefined || env[key] === null || env[key] === "") {
    env[key] = value;
  }
}

function applyToolsetDefaults(env, toolset) {
  if (toolset === "core") {
    env.SEAL_C_OBF_ALLOW_MISSING = "1";
    env.SEAL_MIDGETPACK_SKIP = "1";
  }
}

function applyE2EFeatureFlags(env, toolset) {
  env.SEAL_THIN_E2E = "1";
  env.SEAL_THIN_ANTI_DEBUG_E2E = "1";
  env.SEAL_LEGACY_PACKAGERS_E2E = "1";
  env.SEAL_USER_FLOW_E2E = "1";
  setEnvDefault(env, "SEAL_E2E_STRICT_PROC_MEM", "1");
  setEnvDefault(env, "SEAL_E2E_STRICT_PTRACE", "1");
  setEnvDefault(env, "SEAL_E2E_STRICT_DENY_ENV", "0");
  env.SEAL_SENTINEL_E2E = "1";
  env.SEAL_PROTECTION_E2E = "1";
  env.SEAL_OBFUSCATION_E2E = "1";
  env.SEAL_STRIP_E2E = "1";
  env.SEAL_STRIP_E2E_STRINGS_TIMEOUT_MS = env.SEAL_STRIP_E2E_STRINGS_TIMEOUT_MS || "60000";
  env.SEAL_STRIP_E2E_STRINGS_MAX_BUFFER = env.SEAL_STRIP_E2E_STRINGS_MAX_BUFFER || "50000000";
  env.SEAL_ELF_PACKERS_E2E = "1";
  const defaultCObf = process.platform === "linux" ? "1" : "0";
  env.SEAL_C_OBF_E2E = env.SEAL_C_OBF_E2E || defaultCObf;
  env.SEAL_UI_E2E = "1";
  env.SEAL_POSTJECT_E2E = "1";
  env.SEAL_SHIP_E2E = "1";
  env.SEAL_DECOY_E2E = "1";
  env.SEAL_CONFIG_SYNC_E2E = "1";
  env.SEAL_PROFILE_OVERLAY_E2E = "1";
  env.SEAL_THIN_CHUNK_SIZE = env.SEAL_THIN_CHUNK_SIZE || "8388608";
  env.SEAL_THIN_ZSTD_LEVEL = env.SEAL_THIN_ZSTD_LEVEL || "1";
  if (!env.SEAL_E2E_TIMEOUT_SCALE && env.SEAL_DOCKER_E2E === "1") {
    env.SEAL_E2E_TIMEOUT_SCALE = "2";
  }
  env.SEAL_UI_E2E_HEADLESS = env.SEAL_UI_E2E_HEADLESS || "1";
}

function applySshDefaults(env) {
  let e2eSsh = env.SEAL_E2E_SSH || "";
  if (!e2eSsh) {
    e2eSsh = env.SEAL_SHIP_SSH_E2E || "0";
  }
  if (e2eSsh === "1") {
    env.SEAL_E2E_SSH = "1";
    env.SEAL_SHIP_SSH_E2E = "1";
    env.SEAL_USER_FLOW_SSH_E2E = "1";
    env.SEAL_SHIP_SSH_HOST = env.SEAL_SHIP_SSH_HOST || "seal-server";
    env.SEAL_SHIP_SSH_USER = env.SEAL_SHIP_SSH_USER || "admin";
    env.SEAL_SHIP_SSH_PORT = env.SEAL_SHIP_SSH_PORT || "22";
    env.SEAL_SHIP_SSH_INSTALL_DIR = env.SEAL_SHIP_SSH_INSTALL_DIR || "/home/admin/apps/seal-example";
    env.SEAL_SHIP_SSH_SERVICE_NAME = env.SEAL_SHIP_SSH_SERVICE_NAME || "seal-example";
    env.SEAL_SHIP_SSH_HTTP_PORT = env.SEAL_SHIP_SSH_HTTP_PORT || "3333";
  } else {
    env.SEAL_E2E_SSH = "0";
    env.SEAL_SHIP_SSH_E2E = "0";
    env.SEAL_USER_FLOW_SSH_E2E = "0";
  }
}

module.exports = {
  applyToolsetDefaults,
  applyE2EFeatureFlags,
  applySshDefaults,
};
