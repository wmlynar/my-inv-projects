import { describe, it, expect } from "vitest";
import { createFleetSim } from "@fleet-manager/sim-runtime";

const buildGraph = () => ({
  nodes: [
    { id: "A", pos: { x: 0, y: 0 } },
    { id: "B", pos: { x: 2, y: 0 } }
  ],
  edges: [{ start: "A", end: "B" }]
});

const buildRobotsConfig = (strategy, overrides = {}) => ({
  traffic: {
    strategy,
    nodeLocks: true,
    reservationNodeDwellMs: 30,
    ...(overrides.traffic || {})
  },
  robots: [
    {
      id: "RB-01",
      name: "Robot 01",
      ref: "A",
      controlled: true,
      manualMode: true,
      model: { head: 0.2, tail: 0.2, width: 3 },
      maxSpeed: 1
    }
  ]
});

const buildBundle = (strategy, overrides = {}) => ({
  graph: buildGraph(),
  workflow: { map: null, groups: {}, bin_locations: {}, occupancy: {}, streams: [] },
  robotsConfig: buildRobotsConfig(strategy, overrides),
  packaging: null
});

const runSimOnce = (bundle) => {
  const sim = createFleetSim({
    tickMs: 20,
    fastMode: true,
    actionWaitMs: 0,
    collisionBlocking: false,
    enableTestHooks: true,
    speedMultiplier: 1
  });
  sim.loadBundle(bundle);
  sim.stopSim();
  return sim;
};

const stepUntil = (sim, condition, maxSteps = 200, deltaMs = 50) => {
  for (let step = 0; step < maxSteps; step += 1) {
    sim.step({ deltaMs });
    if (condition()) return true;
  }
  return false;
};

describe("node reservations", () => {
  it("holds the start node lock while leaving a node", () => {
    const sim = runSimOnce(buildBundle("pulse-mapf"));
    const ok = sim.goTarget("RB-01", "B", null);
    expect(ok).toBe(true);
    const lockReady = stepUntil(sim, () => {
      const diag = sim.getDiagnostics({ includeHistory: false, includeRoute: false });
      const locks = diag.traffic?.nodeLocks || [];
      return locks.some((entry) => entry.nodeId === "A" && entry.holderId === "RB-01");
    });
    expect(lockReady).toBe(true);
    const diag = sim.getDiagnostics({ includeHistory: false, includeRoute: false });
    const locks = diag.traffic?.nodeLocks || [];
    const lock = locks.find((entry) => entry.nodeId === "A");
    expect(lock?.holderId).toBe("RB-01");
  });

  it("reserves node buffers large enough for turn envelopes", () => {
    const sim = runSimOnce(
      buildBundle("pulse-mapf-time", {
        traffic: { reservationNodeDwellMs: 30 }
      })
    );
    const ok = sim.goTarget("RB-01", "B", null);
    expect(ok).toBe(true);
    sim.step({ deltaMs: 50 });

    const debug = sim.getDebugState();
    const schedule = debug.robots?.[0]?.route?.schedule || [];
    expect(schedule.length).toBeGreaterThan(0);
    const arrivalTime = schedule[0].arrivalTime;
    expect(Number.isFinite(arrivalTime)).toBe(true);

    const diag = sim.getDiagnostics({
      includeReservations: true,
      includeHistory: false,
      includeRoute: true,
      includeObstacles: false
    });
    const nodeReservations =
      diag.reservations?.node?.find((entry) => entry.nodeId === "B")?.reservations || [];
    expect(nodeReservations.length).toBeGreaterThan(0);
    const reservation = nodeReservations[0];

    const length = 0.4;
    const width = 3;
    const envelopeRadius = Math.hypot(length, width) * 0.5;
    const expectedMinMs = (envelopeRadius / 1) * 1000;
    const approachMs = arrivalTime - reservation.rawStart;
    const clearMs = reservation.rawEnd - arrivalTime - 30;

    expect(approachMs).toBeGreaterThanOrEqual(expectedMinMs - 1);
    expect(clearMs).toBeGreaterThanOrEqual(expectedMinMs - 1);
  });
});
