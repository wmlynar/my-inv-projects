"use strict";

const path = require("path");
const fs = require("fs");
const readline = require("readline");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, getConfigFile, loadSealFile, isWorkspaceConfig, resolveTargetName, findLastArtifact } = require("../lib/project");
const { info, warn, ok, hr } = require("../lib/ui");
const { fileExists } = require("../lib/fsextra");
const { spawnSyncSafe } = require("../lib/spawn");

const BATCH_SKIP_ENV = "SEAL_BATCH_SKIP";

function isInteractive() {
  return !!process.stdin.isTTY && !!process.stdout.isTTY;
}

function listTargets(targetsDir) {
  if (!fs.existsSync(targetsDir)) return [];
  return fs.readdirSync(targetsDir)
    .filter((f) => f.endsWith(".json5"))
    .map((f) => f.replace(/\.json5$/, ""))
    .sort();
}

function getCliPath() {
  return process.argv[1] || path.join(__dirname, "..", "cli.js");
}

function runSealCommand(projectRoot, args) {
  const cliPath = getCliPath();
  info(`Running: seal ${args.join(" ")}`);
  const res = spawnSyncSafe(process.execPath, [cliPath].concat(args), {
    cwd: projectRoot,
    stdio: "inherit",
    env: { [BATCH_SKIP_ENV]: "1" },
  });
  if (!res.ok) {
    warn(`Komenda zakończona błędem (status=${res.status || res.signal || "?"})`);
  }
  return res.ok;
}

function createRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve(String(answer || "").trim())));
}

async function promptYesNo(rl, prompt, defNo = true) {
  const suffix = defNo ? "[t/N]" : "[T/n]";
  const answer = (await ask(rl, `${prompt} ${suffix} `)).toLowerCase();
  if (!answer) return !defNo;
  return ["t", "tak", "y", "yes"].includes(answer);
}

async function promptChoice(rl, prompt, items) {
  while (true) {
    const answer = (await ask(rl, prompt)).toLowerCase();
    if (!answer || answer === "0" || answer === "q") return null;
    const found = items.find((item) => item.key === answer);
    if (found) return found;
    console.log("Nieznana opcja. Wpisz numer z listy lub 0 aby wyjść.");
  }
}

async function promptTarget(rl, projectRoot) {
  const paths = getSealPaths(projectRoot);
  const targets = listTargets(paths.targetsDir);
  const defTarget = resolveTargetName(projectRoot, null);
  if (targets.length) {
    console.log(`Dostępne targety: ${targets.join(", ")}`);
  }
  const answer = await ask(rl, `Target [${defTarget}]: `);
  return answer || defTarget;
}

async function runWorkspaceWizard(cwd, cfg) {
  const projects = (cfg.projects || []).map((p) => {
    const name = p.name || p.path;
    const rel = p.path || p.name;
    const full = rel ? path.resolve(cwd, rel) : null;
    const ok = !!(full && fs.existsSync(full));
    return { name, rel, full, ok };
  }).filter((p) => p.name);

  hr();
  info("SEAL wizard (workspace)");
  info(`cwd: ${cwd}`);
  hr();

  if (!projects.length) {
    warn("Brak zdefiniowanych projektów w seal.json5 (projects).");
    return;
  }

  if (!isInteractive()) {
    console.log("Tip: uruchom w terminalu interaktywnym, aby wybrać projekt.");
    console.log("Projekty:");
    projects.forEach((p) => console.log(`- ${p.name} (${p.rel})`));
    return;
  }

  console.log("Wybierz projekt:");
  projects.forEach((p, i) => {
    const note = p.ok ? "" : " (brak folderu)";
    console.log(` ${i + 1}) ${p.name} (${p.rel})${note}`);
  });

  const rl = createRl();
  try {
    const choice = await promptChoice(rl, "Projekt [1.." + projects.length + ", 0=wyjście]: ", projects.map((p, i) => ({ key: String(i + 1), value: p })));
    if (!choice || !choice.value) return;
    if (!choice.value.ok) {
      warn(`Folder projektu nie istnieje: ${choice.value.full}`);
      return;
    }
    await wizard(choice.value.full);
  } finally {
    rl.close();
  }
}

async function wizard(cwd) {
  const absCwd = path.resolve(cwd);
  const sealHere = loadSealFile(absCwd);
  if (sealHere && isWorkspaceConfig(sealHere)) {
    await runWorkspaceWizard(absCwd, sealHere);
    return;
  }

  const projectRoot = findProjectRoot(absCwd);
  const sealCfg = loadSealFile(projectRoot);
  if (sealCfg && isWorkspaceConfig(sealCfg)) {
    await runWorkspaceWizard(projectRoot, sealCfg);
    return;
  }

  const paths = getSealPaths(projectRoot);
  const hasSeal = fileExists(paths.sealFile);
  const pkgPath = path.join(projectRoot, "package.json");

  hr();
  info("SEAL wizard");
  info(`cwd: ${absCwd}`);
  info(`projectRoot: ${projectRoot}`);
  hr();

  if (!fs.existsSync(pkgPath)) {
    warn("Brak package.json w bieżącym katalogu (to nie wygląda jak projekt Node).");
    console.log("Tip: przejdź do folderu projektu i uruchom ponownie: seal");
    return;
  }

  if (!hasSeal) {
    warn("Projekt nie jest zainicjalizowany pod SEAL (brak seal.json5).");
    if (!isInteractive()) {
      console.log("Następny krok:");
      console.log("  seal init");
      return;
    }
    const rl = createRl();
    try {
      const go = await promptYesNo(rl, "Uruchomić teraz `seal init`?");
      if (go) runSealCommand(projectRoot, ["init"]);
    } finally {
      rl.close();
    }
    return;
  }

  const proj = loadProjectConfig(projectRoot);
  if (!proj) {
    warn("Nie udało się wczytać konfiguracji projektu (seal.json5).");
    return;
  }
  ok(`Projekt SEAL: appName=${proj.appName} entry=${proj.entry}`);
  const defaultTarget = resolveTargetName(projectRoot, null);
  const defaultConfigFile = getConfigFile(projectRoot, defaultTarget);
  info(`defaultTarget: ${defaultTarget}`);
  info(`config: ${fileExists(defaultConfigFile) ? defaultConfigFile : defaultConfigFile + " (missing)"}`);
  const targets = listTargets(paths.targetsDir);
  const hasRemoteTargets = targets.some((name) => name !== "local");
  const hasArtifact = !!findLastArtifact(projectRoot, proj.appName);

  const localCfg = getConfigFile(projectRoot, "local");
  if (!fileExists(localCfg)) {
    warn("Brak config local (seal-config/configs/local.json5)");
    if (isInteractive()) {
      const rl = createRl();
      try {
        const go = await promptYesNo(rl, "Utworzyć teraz `seal config add local`?");
        if (go) runSealCommand(projectRoot, ["config", "add", "local"]);
      } finally {
        rl.close();
      }
    } else {
      console.log("Następny krok:");
      console.log("  seal config add local");
    }
    return;
  }

  const localTarget = path.join(paths.targetsDir, "local.json5");
  if (!fileExists(localTarget)) {
    warn("Brak targetu local (seal-config/targets/local.json5)");
    if (isInteractive()) {
      const rl = createRl();
      try {
        const go = await promptYesNo(rl, "Utworzyć teraz `seal target add local`?");
        if (go) runSealCommand(projectRoot, ["target", "add", "local"]);
      } finally {
        rl.close();
      }
    } else {
      console.log("Następny krok:");
      console.log("  seal target add local");
    }
    return;
  }

  if (!isInteractive()) {
    const recommendedCmd = !hasArtifact ? "release" : (hasRemoteTargets ? "ship <target>" : "run-local --sealed");
    console.log("");
    console.log(`Rekomendowane teraz: seal ${recommendedCmd}`);
    console.log("");
    console.log("Typowe komendy:");
    console.log("  seal check              # preflight toolchain + kompatybilność");
    console.log("  seal release            # build sealed release + .tgz");
    console.log("  seal verify --explain   # checklista weryfikacji artefaktu");
    console.log("  seal run-local --sealed # uruchomienie sealed build lokalnie");
    console.log("");
    console.log("Deploy (localhost / serwer):");
    console.log("  seal deploy local --bootstrap   # przygotowanie lokalnego targetu");
    console.log("  seal ship <target>              # build + deploy + restart");
    console.log("  seal remote <target> status     # status usługi");
    return;
  }

  const rl = createRl();
  try {
    const mainMenu = [
      { key: "1", label: "check (preflight)", desc: "sprawdza toolchain i kompatybilność przed buildem", value: { cmd: ["check"] } },
      { key: "2", label: "release (build)", desc: "buduje sealed release i artefakt .tgz", value: { cmd: ["release"] } },
      { key: "3", label: "verify --explain", desc: "weryfikuje artefakt i wypisuje checklistę", value: { cmd: ["verify", "--explain"] } },
      { key: "4", label: "run-local --sealed", desc: "uruchamia sealed build lokalnie", value: { cmd: ["run-local", "--sealed"] } },
      { key: "5", label: "deploy (artifact) → target", desc: "wdraża artefakt na serwer (bez kontroli serwisu)", value: { cmd: ["deploy"], needsTarget: true, supportsBootstrap: true, supportsRestart: true } },
      { key: "6", label: "ship (build+deploy+restart) → target", desc: "jedno polecenie: build + deploy + restart", value: { cmd: ["ship"], needsTarget: true, supportsBootstrap: true } },
      { key: "7", label: "remote (service control)", desc: "sterowanie usługą (up/enable/start/stop/status/logs)", value: { cmd: ["remote"], needsTarget: true, remote: true } },
      { key: "8", label: "rollback → target", desc: "powrót do poprzedniego release", value: { cmd: ["rollback"], needsTarget: true } },
      { key: "9", label: "uninstall → target", desc: "usuwa usługę SEAL z targetu", value: { cmd: ["uninstall"], needsTarget: true } },
    ];

    while (true) {
      const hasArtifactNow = !!findLastArtifact(projectRoot, proj.appName);
      const recommendedKey = !hasArtifactNow ? "2" : (hasRemoteTargets ? "6" : "4");
      const recommendedItem = mainMenu.find((item) => item.key === recommendedKey);

      console.log("");
      if (recommendedItem) {
        info(`Rekomendowane teraz: ${recommendedItem.label}`);
      }
      console.log("Wybierz następną akcję:");
      mainMenu.forEach((item) => {
        const tag = item.key === recommendedKey ? " [rekomendowane]" : "";
        console.log(` ${item.key}) ${item.label}${tag} — ${item.desc}`);
      });
      console.log(" 0) wyjście");

      const choice = await promptChoice(rl, "Opcja: ", mainMenu);
      if (!choice) break;

      const sel = choice.value;
      const args = sel.cmd.slice();

      if (sel.needsTarget) {
        const target = await promptTarget(rl, projectRoot);
        if (sel.remote) {
          console.log("");
          console.log("Akcje remote:");
          const remoteMenu = [
            { key: "1", label: "up (install service + restart)", value: "up" },
            { key: "2", label: "enable", value: "enable" },
            { key: "3", label: "start", value: "start" },
            { key: "4", label: "restart", value: "restart" },
            { key: "5", label: "stop", value: "stop" },
            { key: "6", label: "disable", value: "disable" },
            { key: "7", label: "down (stop + disable + remove)", value: "down" },
            { key: "8", label: "status", value: "status" },
            { key: "9", label: "logs", value: "logs" },
          ];
          remoteMenu.forEach((item) => console.log(` ${item.key}) ${item.label}`));
          console.log(" 0) wyjście");
          const action = await promptChoice(rl, "Akcja: ", remoteMenu);
          if (!action) continue;
          args.push(target, action.value);
          runSealCommand(projectRoot, args);
          continue;
        }

        args.push(target);
        if (sel.supportsBootstrap) {
          const bootstrap = await promptYesNo(rl, "Wykonać bootstrap (pierwszy raz)?");
          if (bootstrap) args.push("--bootstrap");
        }
        if (sel.supportsRestart) {
          const restart = await promptYesNo(rl, "Zrestartować usługę po deployu?");
          if (restart) args.push("--restart");
        }
      }

      runSealCommand(projectRoot, args);
    }
  } finally {
    rl.close();
  }
}

module.exports = { wizard };
