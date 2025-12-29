"use strict";

const fs = require("fs");

function parseList(raw) {
  return String(raw || "")
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isDockerEnv() {
  if (process.env.SEAL_DOCKER_E2E === "1") return true;
  try {
    if (fs.existsSync("/.dockerenv")) return true;
  } catch {
    // ignore
  }
  try {
    const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
    return /docker|containerd|kubepods/i.test(cgroup);
  } catch {
    return false;
  }
}

function detectCapabilities(env) {
  const caps = {};
  const dockerHost = env.SEAL_E2E_DOCKER_HOST === "1";
  caps.root = typeof process.getuid === "function" && process.getuid() === 0;
  caps.docker = isDockerEnv();
  caps.limitedHost = env.SEAL_E2E_LIMITED_HOST === "1" && !dockerHost;
  caps.host = !caps.limitedHost && (!caps.docker || dockerHost);

  const allow = parseList(env.SEAL_E2E_CAPS_ALLOW);
  const deny = parseList(env.SEAL_E2E_CAPS_DENY);
  for (const cap of allow) {
    caps[cap] = true;
  }
  for (const cap of deny) {
    caps[cap] = false;
  }
  return caps;
}

module.exports = {
  detectCapabilities,
};
