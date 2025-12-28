"use strict";

function cmdProfiles() {
  console.log("Security profiles:");
  console.log("  - minimal : obfuscation=minimal; anti-debug+integrity+nativeBootstrap+strip ON; seccomp=kill");
  console.log("  - balanced: obfuscation=balanced; envMode=denylist; anti-debug+integrity+nativeBootstrap+strip ON");
  console.log("  - strict  : balanced + snapshotGuard ON + envMode=allowlist + obfuscation=strict");
  console.log("  - max     : strict + seccomp.aggressive + obfuscation=max");
  console.log("  (default: strict)");
  console.log("");
  console.log("Obfuscation profiles (backend JS):");
  console.log("  - none    : skip backend obfuscation (fastest)");
  console.log("  - test-fast: minimal obfuscation + terser passes=4 (experimental speed probe)");
  console.log("  - minimal : most compatible, minimal transforms");
  console.log("  - balanced: default, safe for most apps");
  console.log("  - strict  : stronger DCI + renameGlobals + terser (toplevel)");
  console.log("  - max     : strongest (DCI↑, terser passes=4), use after E2E");
  console.log("");
  console.log("Sentinel profiles:");
  console.log("  - off     : sentinel disabled");
  console.log("  - auto    : sentinel enabled only for thin+ssh targets");
  console.log("  - required: sentinel enforced (enabled=true, level=auto)");
  console.log("  - strict  : sentinel enforced (enabled=true, level=2)");
}

module.exports = { cmdProfiles };
