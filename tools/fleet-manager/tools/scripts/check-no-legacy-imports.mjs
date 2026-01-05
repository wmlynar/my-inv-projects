import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const targets = ["packages", "apps"];
const badMatches = [];

const shouldScan = (file) =>
  file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".mjs") || file.endsWith(".cjs");

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(full);
    } else if (entry.isFile() && shouldScan(entry.name)) {
      const content = fs.readFileSync(full, "utf8");
      if (content.includes("legacy/")) {
        badMatches.push(full);
      }
    }
  }
};

for (const target of targets) {
  const dir = path.join(root, target);
  if (fs.existsSync(dir)) {
    walk(dir);
  }
}

if (badMatches.length) {
  console.error("Legacy import violations found:\n" + badMatches.join("\n"));
  process.exitCode = 1;
} else {
  console.log("No legacy imports detected.");
}
