"use strict";

function guessHint(message) {
  const msg = String(message || "");
  if (/Brak seal\.json5|Missing seal\.json5/.test(msg)) {
    return "Run: seal init";
  }
  if (/Brak targetu|Missing target/i.test(msg)) {
    return "Run: seal target add <name>";
  }
  if (/Invalid build\.securityProfile/i.test(msg)) {
    return "Allowed: minimal | balanced | strict | max";
  }
  if (/Invalid sentinel profile/i.test(msg)) {
    return "Allowed: off | auto | required | strict";
  }
  if (/Unknown obfuscationProfile|Invalid build\.obfuscationProfile/i.test(msg)) {
    return "Allowed: none | minimal | balanced | strict | max";
  }
  if (/Missing repo config/i.test(msg)) {
    return "Run: seal config add <name> (or ensure seal-config/configs/<name>.json5 exists)";
  }
  if (/Config drift detected|Refusing to start with config drift/i.test(msg)) {
    return "Fix: seal config push <target> (or rerun with --accept-drift)";
  }
  if (/Config missing on target|missing config on target/i.test(msg)) {
    return "Fix: seal config push <target> (or ship --push-config)";
  }
  if (/target\.host missing/i.test(msg)) {
    return "Set target.host in seal-config/targets/<target>.json5";
  }
  if (/Invalid installDir/i.test(msg)) {
    return "Use an absolute path without spaces, e.g. /home/admin/apps/<app>";
  }
  if (/Missing appctl/i.test(msg)) {
    return "Run: seal ship <target> --bootstrap (installs runner + unit)";
  }
  if (/ELF packer failed/i.test(msg)) {
    return "Install the packer or disable build.protection.elfPacker";
  }
  if (/cObfuscator/i.test(msg)) {
    return "Install obfuscating clang and set build.protection.cObfuscator";
  }
  if (/sentinel verify failed: launcher missing/i.test(msg)) {
    return "Run: seal ship <target> --bootstrap (installs launcher) or fix target.installDir";
  }
  if (/sentinel verify failed: cannot switch to service user/i.test(msg)) {
    return "Ensure sudo/runuser/su is available, or set target.serviceUser=root (or use --skip-verify)";
  }
  if (/sentinel verify failed: runtime invalid/i.test(msg)) {
    return "Run: seal sentinel verify <target> and consider seal sentinel install <target> --force";
  }
  if (/sentinel verify failed/i.test(msg)) {
    return "Run: seal sentinel verify <target>";
  }
  if (/sentinel install failed: baseDir missing/i.test(msg)) {
    return "Create baseDir (root-owned, not writable by group/others) or set build.sentinel.storage.baseDir";
  }
  if (/baseDir is a symlink/i.test(msg)) {
    return "Use a real directory (or pass --insecure to override)";
  }
  if (/baseDir must be root-owned/i.test(msg)) {
    return "Fix perms: chown root:root <baseDir> && chmod 755 <baseDir>";
  }
  if (/service user cannot access baseDir/i.test(msg)) {
    return "Ensure execute permission for service user (e.g. chmod 0710 <baseDir> and set group)";
  }
  if (/sentinel install failed: lock busy/i.test(msg)) {
    return "Wait and retry (another install/uninstall may be running)";
  }
  if (/sentinel install failed: existing sentinel mismatch/i.test(msg)) {
    return "Use --force to rebind sentinel to current host";
  }
  if (/sentinel install failed: missing machine-id/i.test(msg)) {
    return "Ensure /etc/machine-id exists (or use sentinel level=0)";
  }
  if (/sentinel install failed: missing rid/i.test(msg)) {
    return "Use sentinel level=1 or ensure root FS has stable UUID/partuuid";
  }
  if (/ssh .* failed|ssh config check failed/i.test(msg)) {
    return "Check target.host/user/sshPort and SSH keys; ensure passwordless sudo if required";
  }
  return null;
}

function formatError(err) {
  const message = err && err.message ? err.message : String(err);
  const hint = guessHint(message);
  const debug = process.env.SEAL_DEBUG === "1" || process.env.SEAL_TRACE === "1";
  const stack = debug && err && err.stack ? err.stack : null;
  return { message, hint, stack };
}

module.exports = { formatError };
