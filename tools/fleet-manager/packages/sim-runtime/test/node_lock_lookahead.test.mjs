import { describe, it, expect } from "vitest";
import { createFleetSim } from "@fleet-manager/sim-runtime";

const buildGraph = () => ({
  nodes: [
    { id: "A", pos: { x: 0, y: 0 } },
    { id: "B", pos: { x: 2, y: 0 } },
    { id: "C", pos: { x: 4, y: 0 } }
  ],
  edges: [
    { start: "A", end: "B" },
    { start: "B", end: "C" }
  ]
});

const buildBundle = (lookaheadM, lookbackM = 0) => ({
  graph: buildGraph(),
  workflow: { map: null, groups: {}, bin_locations: {}, occupancy: {}, streams: [] },
  robotsConfig: {
    traffic: {
      strategy: "simple",
      nodeLocks: true,
      nodeLockLookaheadM: lookaheadM,
      nodeLockLookbackM: lookbackM
    },
    robots: [
      {
        id: "RB-01",
        name: "Robot 01",
        ref: "A",
        controlled: true,
        manualMode: true,
        maxSpeed: 1
      }
    ]
  },
  packaging: null
});

const runSimOnce = (bundle) => {
  const sim = createFleetSim({
    tickMs: 20,
    fastMode: true,
    actionWaitMs: 0,
    collisionBlocking: false,
    enableTestHooks: true,
    speedMultiplier: 2
  });
  sim.loadBundle(bundle);
  sim.stopSim();
  return sim;
};

const getNodeLock = (diag, nodeId) =>
  (diag.traffic?.nodeLocks || []).find((entry) => entry.nodeId === nodeId) || null;

const stepUntil = (sim, condition, maxSteps = 200, deltaMs = 50) => {
  for (let step = 0; step < maxSteps; step += 1) {
    sim.step({ deltaMs });
    if (condition()) return true;
  }
  return false;
};

const advanceToSegment = (sim, robotId, targetIndex) => {
  for (let step = 0; step < 200; step += 1) {
    sim.step({ deltaMs: 50 });
    const runtime = sim.__test?.getRuntime?.(robotId);
    const segmentIndex = runtime?.route?.segmentIndex;
    if (Number.isFinite(segmentIndex) && segmentIndex >= targetIndex) {
      return runtime.route;
    }
  }
  return null;
};

describe("simple node-lock lookahead", () => {
  it("locks nodes within the lookahead corridor", () => {
    const sim = runSimOnce(buildBundle(5, 0));
    const ok = sim.goTarget("RB-01", "C", null);
    expect(ok).toBe(true);
    const locksReady = stepUntil(sim, () => {
      const diag = sim.getDiagnostics({ includeHistory: false, includeRoute: false });
      return getNodeLock(diag, "B") && getNodeLock(diag, "C");
    });
    expect(locksReady).toBe(true);

    const diag = sim.getDiagnostics({ includeHistory: false, includeRoute: false });
    const lockB = getNodeLock(diag, "B");
    const lockC = getNodeLock(diag, "C");
    expect(lockB?.holderId).toBe("RB-01");
    expect(lockC?.holderId).toBe("RB-01");
  });

  it("does not lock nodes beyond the lookahead corridor", () => {
    const sim = runSimOnce(buildBundle(0.5, 0));
    const ok = sim.goTarget("RB-01", "C", null);
    expect(ok).toBe(true);
    stepUntil(sim, () => false, 40);

    const diag = sim.getDiagnostics({ includeHistory: false, includeRoute: false });
    const lockB = getNodeLock(diag, "B");
    const lockC = getNodeLock(diag, "C");
    expect(lockB).not.toBe(null);
    expect(lockC).toBe(null);
  });

  it("locks nodes behind within the lookback corridor", () => {
    const sim = runSimOnce(buildBundle(0, 3));
    const ok = sim.goTarget("RB-01", "C", null);
    expect(ok).toBe(true);
    const route = advanceToSegment(sim, "RB-01", 1);
    expect(route?.segmentIndex).toBeGreaterThanOrEqual(1);

    const lockReady = stepUntil(sim, () => {
      const diag = sim.getDiagnostics({ includeHistory: false, includeRoute: false });
      return getNodeLock(diag, "A");
    });
    expect(lockReady).toBe(true);

    const diag = sim.getDiagnostics({ includeHistory: false, includeRoute: false });
    const lockA = getNodeLock(diag, "A");
    expect(lockA?.holderId).toBe("RB-01");
  });
});
