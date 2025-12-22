"use strict";

const { spawnSyncSafe } = require("./spawn");

function sshTarget(user, host) {
  return `${user}@${host}`;
}

function shellQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function sshExec({ user, host, args, stdin = null, stdio = "inherit", tty = false }) {
  const target = sshTarget(user, host);
  let finalArgs = args || [];
  if (Array.isArray(args) && args[0] === "bash" && args[1] === "-lc" && args.length >= 3) {
    // ssh concatenates args without quoting, so wrap the bash -lc command.
    const cmd = args.slice(2).join(" ");
    finalArgs = [`bash -lc ${shellQuote(cmd)}`];
  }
  const baseArgs = [];
  if (tty) baseArgs.push("-tt");
  baseArgs.push("-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", target);
  const sshArgs = baseArgs.concat(finalArgs);

  // For capturing output, use stdio=pipe
  const res = spawnSyncSafe("ssh", sshArgs, { stdio, input: stdin !== null ? stdin : undefined });
  return res;
}

function scpTo({ user, host, localPath, remotePath }) {
  const target = sshTarget(user, host);
  const res = spawnSyncSafe("scp", ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", localPath, `${target}:${remotePath}`], { stdio: "inherit" });
  return res;
}

function scpFrom({ user, host, remotePath, localPath }) {
  const target = sshTarget(user, host);
  const res = spawnSyncSafe("scp", ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", `${target}:${remotePath}`, localPath], { stdio: "inherit" });
  return res;
}

module.exports = { sshExec, scpTo, scpFrom };
