"use strict";

const { spawnSyncSafe } = require("./spawn");

function sshTarget(user, host) {
  return `${user}@${host}`;
}

function shellQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function normalizeStrictHostKeyChecking(value) {
  if (value === undefined || value === null || value === "") return "accept-new";
  if (typeof value === "boolean") return value ? "yes" : "no";
  const v = String(value).toLowerCase();
  if (["accept-new", "yes", "no", "ask"].includes(v)) return v;
  return "accept-new";
}

function normalizeSshPort(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const port = Math.trunc(n);
  if (port < 1 || port > 65535) return null;
  return port;
}

function sshNonInteractiveArgs(strict) {
  return [
    "-o", "BatchMode=yes",
    "-o", "PreferredAuthentications=publickey",
    "-o", "PasswordAuthentication=no",
    "-o", "KbdInteractiveAuthentication=no",
    "-o", "ChallengeResponseAuthentication=no",
    "-o", "NumberOfPasswordPrompts=0",
    "-o", `StrictHostKeyChecking=${strict}`,
    "-o", "ConnectTimeout=10",
    "-o", "ServerAliveInterval=10",
    "-o", "ServerAliveCountMax=2",
  ];
}

function detectSshPromptHint(res) {
  if (!res) return "";
  if (res.timedOut) {
    return "timeout (possible prompt or network issue). Ensure key-based auth and check connectivity.";
  }
  const out = `${res.stdout || ""}\n${res.stderr || ""}`.toLowerCase();
  if (!out.trim()) return "";
  if (out.includes("host key verification failed") || out.includes("are you sure you want to continue connecting")) {
    return "host key prompt blocked. Add host key or set sshStrictHostKeyChecking=accept-new.";
  }
  if (out.includes("password") || out.includes("passphrase") || out.includes("keyboard-interactive")) {
    return "interactive auth blocked. Configure key-based SSH (ssh-agent/authorized_keys).";
  }
  if (out.includes("permission denied")) {
    return "permission denied. Check SSH key, user, and authorized_keys on target.";
  }
  return "";
}

function formatSshFailure(res) {
  if (!res) return "";
  const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  const hint = detectSshPromptHint(res);
  if (!out && !hint) return "";
  const parts = [];
  if (out) parts.push(out);
  if (hint) parts.push(`hint: ${hint}`);
  return `: ${parts.join(" | ")}`;
}

function sshExec({ user, host, args, stdin = null, stdio = "inherit", tty = false, strictHostKeyChecking, sshPort }) {
  const target = sshTarget(user, host);
  let finalArgs = args || [];
  if (Array.isArray(args) && args[0] === "bash" && args[1] === "-lc" && args.length >= 3) {
    // ssh concatenates args without quoting, so wrap the bash -lc command.
    const cmd = args.slice(2).join(" ");
    finalArgs = [`bash -lc ${shellQuote(cmd)}`];
  }
  const baseArgs = [];
  if (tty) baseArgs.push("-tt");
  const strict = normalizeStrictHostKeyChecking(strictHostKeyChecking);
  const port = normalizeSshPort(sshPort);
  baseArgs.push(...sshNonInteractiveArgs(strict));
  if (port) baseArgs.push("-p", String(port));
  baseArgs.push(target);
  const sshArgs = baseArgs.concat(finalArgs);

  let spawnStdio = stdio;
  let input = stdin !== null ? stdin : undefined;
  if (!tty && stdin === null && stdio === "inherit") {
    spawnStdio = ["ignore", "inherit", "inherit"];
  }
  if (!tty && stdin === null && stdio === "pipe") {
    input = "";
  }

  // For capturing output, use stdio=pipe
  const res = spawnSyncSafe("ssh", sshArgs, { stdio: spawnStdio, input });
  res.hint = detectSshPromptHint(res);
  return res;
}

function scpTo({ user, host, localPath, remotePath, strictHostKeyChecking, sshPort }) {
  const target = sshTarget(user, host);
  const strict = normalizeStrictHostKeyChecking(strictHostKeyChecking);
  const port = normalizeSshPort(sshPort);
  const args = sshNonInteractiveArgs(strict);
  if (port) args.push("-P", String(port));
  args.push(localPath, `${target}:${remotePath}`);
  const res = spawnSyncSafe("scp", args, { stdio: ["ignore", "inherit", "inherit"] });
  res.hint = detectSshPromptHint(res);
  return res;
}

function scpFrom({ user, host, remotePath, localPath, strictHostKeyChecking, sshPort }) {
  const target = sshTarget(user, host);
  const strict = normalizeStrictHostKeyChecking(strictHostKeyChecking);
  const port = normalizeSshPort(sshPort);
  const args = sshNonInteractiveArgs(strict);
  if (port) args.push("-P", String(port));
  args.push(`${target}:${remotePath}`, localPath);
  const res = spawnSyncSafe("scp", args, { stdio: ["ignore", "inherit", "inherit"] });
  res.hint = detectSshPromptHint(res);
  return res;
}

module.exports = {
  sshExec,
  scpTo,
  scpFrom,
  normalizeStrictHostKeyChecking,
  normalizeSshPort,
  sshNonInteractiveArgs,
  formatSshFailure,
};
