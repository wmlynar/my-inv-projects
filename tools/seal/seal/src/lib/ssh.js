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
  baseArgs.push("-o", "BatchMode=yes", "-o", `StrictHostKeyChecking=${strict}`);
  if (port) baseArgs.push("-p", String(port));
  baseArgs.push(target);
  const sshArgs = baseArgs.concat(finalArgs);

  // For capturing output, use stdio=pipe
  const res = spawnSyncSafe("ssh", sshArgs, { stdio, input: stdin !== null ? stdin : undefined });
  return res;
}

function scpTo({ user, host, localPath, remotePath, strictHostKeyChecking, sshPort }) {
  const target = sshTarget(user, host);
  const strict = normalizeStrictHostKeyChecking(strictHostKeyChecking);
  const port = normalizeSshPort(sshPort);
  const args = ["-o", "BatchMode=yes", "-o", `StrictHostKeyChecking=${strict}`];
  if (port) args.push("-P", String(port));
  args.push(localPath, `${target}:${remotePath}`);
  const res = spawnSyncSafe("scp", args, { stdio: "inherit" });
  return res;
}

function scpFrom({ user, host, remotePath, localPath, strictHostKeyChecking, sshPort }) {
  const target = sshTarget(user, host);
  const strict = normalizeStrictHostKeyChecking(strictHostKeyChecking);
  const port = normalizeSshPort(sshPort);
  const args = ["-o", "BatchMode=yes", "-o", `StrictHostKeyChecking=${strict}`];
  if (port) args.push("-P", String(port));
  args.push(`${target}:${remotePath}`, localPath);
  const res = spawnSyncSafe("scp", args, { stdio: "inherit" });
  return res;
}

module.exports = { sshExec, scpTo, scpFrom, normalizeStrictHostKeyChecking, normalizeSshPort };
