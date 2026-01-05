import { describe, it, expect } from "vitest";
import { createFleetSim } from "@fleet-manager/sim-runtime";
import { isRobokitTaskActive } from "@fleet-manager/core-types";
import * as coreMapf from "@fleet-manager/core-mapf";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const WAIT_REASONS = new Set([
  "traffic",
  "traffic_overlap",
  "edge_lock",
  "node_lock",
  "reservation_wait",
  "reservation_entry",
  "avoidance",
  "avoidance_hold",
  "yield",
  "stuck",
  "paused",
  "manual",
  "no_motion",
  "idle",
  "offline"
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SCENE_DIR = path.resolve(REPO_ROOT, "apps", "traffic-lab", "scenes", "traffic");

const cloneJson = (value) => (value ? JSON.parse(JSON.stringify(value)) : value);

const parseJson5 = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    try {
      return Function(`"use strict"; return (${text});`)();
    } catch (_fallbackErr) {
      throw err;
    }
  }
};

const parseJsonFile = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  if (filePath.endsWith(".json5")) {
    return parseJson5(raw);
  }
  return JSON.parse(raw);
};

const loadTrafficScene = () => ({
  graph: parseJsonFile(path.join(SCENE_DIR, "graph.json")),
  workflow: parseJsonFile(path.join(SCENE_DIR, "workflow.json5")),
  robotsConfig: parseJsonFile(path.join(SCENE_DIR, "robots.json")),
  packaging: parseJsonFile(path.join(SCENE_DIR, "packaging.json"))
});

const buildBundle = (scene) => ({
  graph: scene.graph,
  workflow: scene.workflow,
  robotsConfig: scene.robotsConfig,
  packaging: scene.packaging
});

const applyStrategy = (scene, strategy) => {
  const robotsConfig = cloneJson(scene.robotsConfig || {});
  robotsConfig.traffic = {
    ...(robotsConfig.traffic || {}),
    strategy
  };
  robotsConfig.robots = (robotsConfig.robots || []).map((robot) => ({
    ...robot,
    controlled: true,
    manualMode: false
  }));
  return { ...scene, robotsConfig };
};

const resolvePickSiteIds = (workflow) => {
  const bins = workflow?.bin_locations || {};
  return Object.entries(bins)
    .filter(
      ([, item]) =>
        typeof item?.group === "string" && item.group.toUpperCase().startsWith("PICK")
    )
    .map(([id]) => id);
};

const buildNoWaitTrafficScene = (scene) => {
  const nodeIndex = new Map((scene.graph?.nodes || []).map((node) => [node.id, node.pos]));
  const topPick = nodeIndex.get("AP1");
  const topDrop = nodeIndex.get("AP4");
  const bottomPick = nodeIndex.get("AP8");
  const bottomDrop = nodeIndex.get("AP5");
  const workflow = {
    map: scene.workflow?.map || null,
    groups: {
      PICK_TOP: ["AP1"],
      DROP_TOP: ["AP4"],
      PICK_BOTTOM: ["AP8"],
      DROP_BOTTOM: ["AP5"]
    },
    bin_locations: {
      "PICK-T1": { group: "PICK_TOP", point: "AP1", pos: topPick },
      "DROP-T1": { group: "DROP_TOP", point: "AP4", pos: topDrop },
      "PICK-B1": { group: "PICK_BOTTOM", point: "AP8", pos: bottomPick },
      "DROP-B1": { group: "DROP_BOTTOM", point: "AP5", pos: bottomDrop }
    },
    occupancy: {
      pick_groups: ["PICK_TOP", "PICK_BOTTOM"],
      drop_groups: ["DROP_TOP", "DROP_BOTTOM"]
    },
    streams: [
      {
        id: "top",
        pick_group: "PICK_TOP",
        drop_group_order: ["DROP_TOP"],
        drop_policy: { access_rule: "any_free" }
      },
      {
        id: "bottom",
        pick_group: "PICK_BOTTOM",
        drop_group_order: ["DROP_BOTTOM"],
        drop_policy: { access_rule: "any_free" }
      }
    ]
  };
  const robotsConfig = cloneJson(scene.robotsConfig || {});
  robotsConfig.robots = [
    { id: "RB-01", name: "Robot 01", ref: "AP1", controlled: true, manualMode: false },
    { id: "RB-02", name: "Robot 02", ref: "AP8", controlled: true, manualMode: false }
  ];
  return { ...scene, workflow, robotsConfig };
};

const buildEdgePickScene = (scene) => {
  const robotsConfig = cloneJson(scene.robotsConfig || {});
  robotsConfig.robots = [
    {
      id: "RB-01",
      name: "Robot 01",
      ref: "PP1",
      controlled: true,
      manualMode: false,
      trafficPriority: 10
    },
    {
      id: "RB-02",
      name: "Robot 02",
      ref: "PP2",
      controlled: true,
      manualMode: false,
      trafficPriority: 1
    }
  ];
  return { ...scene, robotsConfig };
};

const runFastSim = (bundle, { speedMultiplier = 12 } = {}) => {
  const sim = createFleetSim({
    tickMs: 20,
    speedMultiplier,
    fastMode: true,
    actionWaitMs: 0,
    collisionBlocking: false,
    enableTestHooks: true
  });
  sim.loadBundle(bundle);
  sim.stopSim();
  return sim;
};

const runUntilDone = (sim, robotIds, pickSiteIds, options = {}) => {
  const maxSteps = Number.isFinite(options.maxSteps) ? options.maxSteps : 3000;
  const deltaMs = Number.isFinite(options.deltaMs) ? options.deltaMs : 50;
  const maxWaitSteps = Number.isFinite(options.maxWaitSteps)
    ? options.maxWaitSteps
    : 400;
  const useFakeTime = options.useFakeTime !== false;
  const donePredicate = typeof options.donePredicate === "function" ? options.donePredicate : null;
  const monitorPredicate =
    typeof options.monitorPredicate === "function" ? options.monitorPredicate : null;
  const onStep = typeof options.onStep === "function" ? options.onStep : null;
  const waitReasons = options.waitReasons instanceof Set ? options.waitReasons : WAIT_REASONS;
  const waitStreak = new Map(robotIds.map((id) => [id, 0]));
  const maxWait = new Map(robotIds.map((id) => [id, 0]));
  const anyWaitSteps = new Map(robotIds.map((id) => [id, 0]));
  let mutualWaitSteps = 0;
  const blockedStreak = new Map(robotIds.map((id) => [id, 0]));
  const maxBlocked = new Map(robotIds.map((id) => [id, 0]));
  const pickSet = new Set(pickSiteIds);
  const originalNow = Date.now;
  let fakeNow = originalNow();
  if (useFakeTime) {
    Date.now = () => fakeNow;
  }

  try {
    for (let step = 0; step < maxSteps; step += 1) {
      sim.step({ deltaMs });
      if (useFakeTime) {
        fakeNow += deltaMs;
      }
      const status = sim.getStatus(true);
      const activeTasks = status.tasks.filter(
        (task) => task.status === "in_progress" || task.status === "paused"
      );
      const picksRemaining = status.worksites.some((site) => pickSet.has(site.id) && site.filled);
      const monitoringActive = monitorPredicate
        ? monitorPredicate(status, { activeTasks, picksRemaining })
        : activeTasks.length > 0 || picksRemaining;
      let waitingNow = 0;
      status.robots.forEach((robot) => {
        if (!robotIds.includes(robot.id)) return;
        const blockedNext = robot.blocked ? (blockedStreak.get(robot.id) || 0) + 1 : 0;
        blockedStreak.set(robot.id, blockedNext);
        const prevBlockedMax = maxBlocked.get(robot.id) || 0;
        if (blockedNext > prevBlockedMax) {
          maxBlocked.set(robot.id, blockedNext);
        }
        const reason = robot.diagnostics?.reason || null;
        const activeTask = isRobokitTaskActive(robot.taskStatus);
        const isWaiting = monitoringActive && activeTask && waitReasons.has(reason);
        const next = isWaiting ? (waitStreak.get(robot.id) || 0) + 1 : 0;
        waitStreak.set(robot.id, next);
        const prevMax = maxWait.get(robot.id) || 0;
        if (next > prevMax) {
          maxWait.set(robot.id, next);
        }
        if (isWaiting) {
          waitingNow += 1;
          anyWaitSteps.set(robot.id, (anyWaitSteps.get(robot.id) || 0) + 1);
        }
      });
      if (monitoringActive && waitingNow >= 2) {
        mutualWaitSteps += 1;
      }
      if (onStep) {
        onStep(step, status, sim);
      }
      const done = donePredicate
        ? donePredicate(status, { activeTasks, picksRemaining })
        : !activeTasks.length && !picksRemaining;
      if (done) {
        return {
          done: true,
          steps: step + 1,
          maxWait,
          maxBlocked,
          maxWaitSteps,
          anyWaitSteps,
          mutualWaitSteps
        };
      }
    }

    return {
      done: false,
      steps: maxSteps,
      maxWait,
      maxBlocked,
      maxWaitSteps,
      anyWaitSteps,
      mutualWaitSteps
    };
  } finally {
    if (useFakeTime) {
      Date.now = originalNow;
    }
  }
};

const STRATEGIES =
  coreMapf.TrafficStrategies?.STRATEGY_NAMES?.length
    ? coreMapf.TrafficStrategies.STRATEGY_NAMES
    : ["pulse-mapf-time"];

describe("sim-runtime no-wait safeguards", () => {
  const trafficScene = loadTrafficScene();
  const pickSiteIds = resolvePickSiteIds(trafficScene.workflow);
  STRATEGIES.forEach((strategy) => {
    it(`drains traffic deliveries without deadlock or long waits (${strategy})`, () => {
      const scene = applyStrategy(trafficScene, strategy);
      const bundle = buildBundle(scene);
      const sim = runFastSim(bundle, { speedMultiplier: 10 });
      pickSiteIds.forEach((id) => {
        sim.setWorksiteOccupancy(id, "filled");
      });
      const robotIds = (scene.robotsConfig?.robots || []).map((robot) => robot.id);

      const result = runUntilDone(sim, robotIds, pickSiteIds, {
        maxSteps: 8000,
        deltaMs: 50,
        maxWaitSteps: 1600
      });
      expect(result.done).toBe(true);
      result.maxBlocked.forEach((value) => {
        expect(value).toBeLessThanOrEqual(result.maxWaitSteps);
      });
      result.maxWait.forEach((value) => {
        expect(value).toBeLessThanOrEqual(result.maxWaitSteps);
      });
      result.anyWaitSteps.forEach((value) => {
        expect(value).toBeLessThanOrEqual(result.maxWaitSteps);
      });
      expect(result.mutualWaitSteps).toBeLessThanOrEqual(result.maxWaitSteps);
    });

    it(`avoids waiting when flows are isolated (${strategy})`, () => {
      const scene = applyStrategy(buildNoWaitTrafficScene(trafficScene), strategy);
      const bundle = buildBundle(scene);
      const sim = runFastSim(bundle, { speedMultiplier: 16 });
      const pickSiteIds = resolvePickSiteIds(scene.workflow);
      pickSiteIds.forEach((id) => {
        sim.setWorksiteOccupancy(id, "filled");
      });
      const robotIds = (scene.robotsConfig?.robots || []).map((robot) => robot.id);
      const waitReasons = new Set([
        "traffic",
        "traffic_overlap",
        "edge_lock",
        "node_lock",
        "reservation_wait",
        "reservation_entry",
        "yield",
        "avoidance",
        "avoidance_hold"
      ]);

      const result = runUntilDone(sim, robotIds, pickSiteIds, {
        maxSteps: 5000,
        deltaMs: 50,
        maxWaitSteps: 120,
        waitReasons
      });
      expect(result.done).toBe(true);
      result.anyWaitSteps.forEach((value) => {
        expect(value).toBeLessThanOrEqual(result.maxWaitSteps);
      });
      expect(result.mutualWaitSteps).toBeLessThanOrEqual(result.maxWaitSteps);
    });

    it(`waits only on one side for edge picks (${strategy})`, () => {
      const baseScene = buildNoWaitTrafficScene(trafficScene);
      const scene = applyStrategy(buildEdgePickScene(baseScene), strategy);
      if (scene.robotsConfig?.traffic) {
        scene.robotsConfig.traffic.edgeQueues = false;
        scene.robotsConfig.traffic.nodeLocks = false;
      }
      const bundle = buildBundle(scene);
      const sim = runFastSim(bundle, { speedMultiplier: 16 });
      const pickSiteIds = resolvePickSiteIds(scene.workflow);
      pickSiteIds.forEach((id) => {
        sim.setWorksiteOccupancy(id, "filled");
      });
      const robotIds = (scene.robotsConfig?.robots || []).map((robot) => robot.id);
      let pauseSucceeded = false;
      let resumeAt = null;
      let rb01WaitDuringPause = 0;
      const waitReasons = new Set([
        "traffic",
        "traffic_overlap",
        "node_lock",
        "reservation_wait",
        "reservation_entry",
        "yield",
        "paused"
      ]);

      const result = runUntilDone(sim, robotIds, pickSiteIds, {
        maxSteps: 4000,
        deltaMs: 30,
        maxWaitSteps: 200,
        waitReasons,
        monitorPredicate: () => pauseSucceeded,
        onStep: (step, status, simInstance) => {
          if (!pauseSucceeded) {
            const rb02 = status.robots.find((robot) => robot.id === "RB-02");
            const runtime = simInstance.__test?.getRuntime("RB-02");
            if (
              runtime &&
              !runtime.paused &&
              runtime.route &&
              isRobokitTaskActive(rb02?.taskStatus)
            ) {
              pauseSucceeded = simInstance.pause("RB-02");
              if (pauseSucceeded) {
                resumeAt = step + 20;
              }
            }
          } else if (resumeAt !== null && step < resumeAt) {
            const rb01 = status.robots.find((robot) => robot.id === "RB-01");
            const reason = rb01?.diagnostics?.reason || null;
            if (isRobokitTaskActive(rb01?.taskStatus) && waitReasons.has(reason)) {
              rb01WaitDuringPause += 1;
            }
          } else if (resumeAt !== null && step >= resumeAt) {
            simInstance.resume("RB-02");
            resumeAt = null;
          }
        }
      });
      expect(result.done).toBe(true);
      expect(pauseSucceeded).toBe(true);
      expect(rb01WaitDuringPause).toBeLessThanOrEqual(15);
      expect(result.mutualWaitSteps).toBeLessThanOrEqual(result.maxWaitSteps);
    });
  });
});
