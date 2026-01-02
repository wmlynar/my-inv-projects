"use strict";

const path = require("path");

function normalizePathList(raw, label) {
  if (raw === undefined || raw === null) return [];
  const items = Array.isArray(raw) ? raw : [raw];
  return items
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .map((p) => {
      if (!path.isAbsolute(p) || /\s/.test(p)) {
        throw new Error(`Invalid systemd hardening ${label}: ${p}`);
      }
      return p;
    });
}

function normalizeProtectHome(raw) {
  if (raw === undefined || raw === null) return null;
  if (raw === false) return "false";
  if (raw === true) return "true";
  const value = String(raw).trim().toLowerCase();
  if (!value) return null;
  if (["true", "false", "read-only", "tmpfs"].includes(value)) return value;
  throw new Error(`Invalid systemd hardening protectHome: ${raw}`);
}

function normalizeTokenList(raw, label) {
  if (raw === undefined || raw === null) return [];
  const items = Array.isArray(raw) ? raw : String(raw).split(/\s+/);
  return items
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .map((token) => {
      if (/\s/.test(token)) {
        throw new Error(`Invalid systemd hardening ${label}: ${token}`);
      }
      if (/\n/.test(token)) {
        throw new Error(`Invalid systemd hardening ${label}: ${token}`);
      }
      return token;
    });
}

function normalizeSystemdHardening(raw) {
  if (raw === undefined || raw === null || raw === false) {
    return { enabled: false };
  }
  if (raw === true) raw = { enabled: true, profile: "baseline" };
  if (typeof raw === "string") raw = { enabled: true, profile: raw };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid deploy.systemdHardening: expected boolean|string|object");
  }
  const enabled = raw.enabled !== undefined ? !!raw.enabled : true;
  if (!enabled) return { enabled: false };
  const profile = raw.profile !== undefined && raw.profile !== null
    ? String(raw.profile).trim().toLowerCase()
    : "baseline";
  if (!["baseline", "strict", "sandbox"].includes(profile)) {
    throw new Error(`Invalid systemd hardening profile: ${raw.profile} (expected baseline|strict|sandbox)`);
  }
  const autoPathsRaw = raw.autoPaths ?? raw.autoReadWritePaths ?? raw.autoReadWrite;
  let autoPaths = null;
  if (autoPathsRaw === undefined || autoPathsRaw === null) {
    autoPaths = profile === "baseline" ? "none" : "install";
  } else if (autoPathsRaw === true) {
    autoPaths = "common";
  } else if (autoPathsRaw === false) {
    autoPaths = "none";
  } else {
    const mode = String(autoPathsRaw).trim().toLowerCase();
    if (!["none", "install", "common"].includes(mode)) {
      throw new Error(`Invalid systemd hardening autoPaths: ${autoPathsRaw} (expected none|install|common)`);
    }
    autoPaths = mode;
  }
  const memoryDenyWriteExecute = raw.memoryDenyWriteExecute !== undefined ? !!raw.memoryDenyWriteExecute : (profile !== "baseline");
  const privateDevices = raw.privateDevices !== undefined ? !!raw.privateDevices : (profile !== "baseline");
  const protectHome = raw.protectHome !== undefined ? normalizeProtectHome(raw.protectHome) : (profile === "sandbox" ? "read-only" : null);
  const protectSystemRaw = raw.protectSystem ?? raw.protectSystemMode;
  let protectSystem = null;
  if (protectSystemRaw === undefined || protectSystemRaw === null) {
    protectSystem = profile === "sandbox" ? "strict" : "full";
  } else if (protectSystemRaw === true) {
    protectSystem = "full";
  } else if (protectSystemRaw === false) {
    protectSystem = "false";
  } else {
    const mode = String(protectSystemRaw).trim().toLowerCase();
    if (!["full", "strict", "true", "false"].includes(mode)) {
      throw new Error(`Invalid systemd hardening protectSystem: ${protectSystemRaw} (expected false|true|full|strict)`);
    }
    protectSystem = mode;
  }
  const privateUsers = raw.privateUsers !== undefined ? !!raw.privateUsers : (profile === "sandbox");
  const protectHostname = raw.protectHostname !== undefined ? !!raw.protectHostname : (profile === "sandbox");
  const protectProcRaw = raw.protectProc;
  let protectProc = null;
  if (protectProcRaw !== undefined && protectProcRaw !== null) {
    const value = String(protectProcRaw).trim().toLowerCase();
    if (!["default", "invisible", "noaccess"].includes(value)) {
      throw new Error(`Invalid systemd hardening protectProc: ${protectProcRaw} (expected default|invisible|noaccess)`);
    }
    protectProc = value;
  } else if (profile === "sandbox") {
    protectProc = "invisible";
  }
  const procSubsetRaw = raw.procSubset;
  let procSubset = null;
  if (procSubsetRaw !== undefined && procSubsetRaw !== null) {
    const value = String(procSubsetRaw).trim().toLowerCase();
    if (!["all", "pid"].includes(value)) {
      throw new Error(`Invalid systemd hardening procSubset: ${procSubsetRaw} (expected all|pid)`);
    }
    procSubset = value;
  } else if (profile === "sandbox") {
    procSubset = "pid";
  }
  const restrictAddressFamiliesRaw = raw.restrictAddressFamilies ?? raw.addressFamilies;
  let restrictAddressFamilies = normalizeTokenList(restrictAddressFamiliesRaw, "restrictAddressFamilies");
  if (!restrictAddressFamilies.length && profile === "sandbox") {
    restrictAddressFamilies = ["AF_UNIX", "AF_INET", "AF_INET6"];
  }
  const systemCallFilterRaw = raw.systemCallFilter ?? raw.syscallFilter ?? null;
  const systemCallFilter = normalizeTokenList(systemCallFilterRaw, "systemCallFilter");
  const systemCallErrorNumberRaw = raw.systemCallErrorNumber ?? raw.syscallErrorNumber ?? null;
  const systemCallErrorNumber = systemCallErrorNumberRaw !== null && systemCallErrorNumberRaw !== undefined
    ? String(systemCallErrorNumberRaw).trim()
    : null;
  const readWritePaths = normalizePathList(raw.readWritePaths, "readWritePaths");
  const readOnlyPaths = normalizePathList(raw.readOnlyPaths, "readOnlyPaths");
  const extraRaw = raw.extra;
  const extraItems = extraRaw === undefined || extraRaw === null
    ? []
    : (Array.isArray(extraRaw) ? extraRaw : [extraRaw]);
  const extra = extraItems
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .map((line) => {
      if (/\n/.test(line)) {
        throw new Error(`Invalid systemd hardening extra line: ${line}`);
      }
      return line;
    });
  return {
    enabled: true,
    profile,
    memoryDenyWriteExecute,
    privateDevices,
    protectHome,
    protectSystem,
    privateUsers,
    protectHostname,
    protectProc,
    procSubset,
    restrictAddressFamilies,
    systemCallFilter,
    systemCallErrorNumber,
    readWritePaths,
    readOnlyPaths,
    autoPaths,
    extra,
  };
}

function renderSystemdHardening({ config, installDir }) {
  const cfg = normalizeSystemdHardening(config);
  if (!cfg.enabled) return "";
  const lines = ["# Hardening"];
  lines.push(
    "UnsetEnvironment=NODE_OPTIONS",
    "Environment=NODE_OPTIONS=",
    "NoNewPrivileges=true",
    "PrivateTmp=true",
    "LimitCORE=0",
    `ProtectSystem=${cfg.protectSystem || "full"}`,
    "ProtectKernelTunables=true",
    "ProtectKernelModules=true",
    "ProtectKernelLogs=true",
    "ProtectControlGroups=true",
    "RestrictSUIDSGID=true",
    "LockPersonality=true",
    "RestrictRealtime=true",
    "RestrictNamespaces=true",
    "SystemCallArchitectures=native"
  );
  if (cfg.privateDevices) lines.push("PrivateDevices=true");
  if (cfg.memoryDenyWriteExecute) lines.push("MemoryDenyWriteExecute=true");
  if (cfg.privateUsers) lines.push("PrivateUsers=true");
  if (cfg.protectHostname) lines.push("ProtectHostname=true");
  if (cfg.profile === "strict") {
    lines.push(
      "ProtectClock=true",
      "DevicePolicy=closed",
      "CapabilityBoundingSet=",
      "AmbientCapabilities="
    );
  }
  if (cfg.profile === "sandbox") {
    lines.push(
      "ProtectClock=true",
      "DevicePolicy=closed",
      "CapabilityBoundingSet=",
      "AmbientCapabilities="
    );
  }
  if (cfg.protectHome) lines.push(`ProtectHome=${cfg.protectHome}`);
  if (cfg.protectProc) lines.push(`ProtectProc=${cfg.protectProc}`);
  if (cfg.procSubset) lines.push(`ProcSubset=${cfg.procSubset}`);
  if (cfg.restrictAddressFamilies && cfg.restrictAddressFamilies.length) {
    lines.push(`RestrictAddressFamilies=${cfg.restrictAddressFamilies.join(" ")}`);
  }
  if (cfg.systemCallFilter && cfg.systemCallFilter.length) {
    lines.push(`SystemCallFilter=${cfg.systemCallFilter.join(" ")}`);
    if (cfg.systemCallErrorNumber) {
      lines.push(`SystemCallErrorNumber=${cfg.systemCallErrorNumber}`);
    }
  }
  let readWrite = cfg.readWritePaths || [];
  if (!readWrite.length && installDir && cfg.autoPaths && cfg.autoPaths !== "none") {
    const auto = [installDir];
    if (cfg.autoPaths === "common") {
      auto.push(
        path.join(installDir, "shared"),
        path.join(installDir, "data"),
        path.join(installDir, "logs")
      );
    }
    readWrite = auto;
  }
  if (readWrite.length) {
    lines.push(`ReadWritePaths=${readWrite.join(" ")}`);
  }
  const readOnly = cfg.readOnlyPaths || [];
  if (readOnly.length) {
    lines.push(`ReadOnlyPaths=${readOnly.join(" ")}`);
  }
  if (cfg.extra && cfg.extra.length) {
    lines.push(...cfg.extra);
  }
  return lines.join("\n") + "\n";
}

module.exports = {
  normalizeSystemdHardening,
  renderSystemdHardening,
};
