import { describe, it, expect } from "vitest";
import { TrafficStrategies } from "../src/index.js";

const describeStrategy = (name) => {
  const entry = TrafficStrategies.describe(name, {});
  expect(entry).toBeTruthy();
  return entry;
};

describe("core-mapf strategy catalog", () => {
  it("describes time-based vs segment-based reservations", () => {
    const pulseTime = describeStrategy("pulse-mapf-time");
    const sipp = describeStrategy("sipp");

    expect(pulseTime.categories.reservation).toBe("time");
    expect(sipp.categories.reservation).toBe("segment");
  });

  it("marks conflict search capabilities for CBS and MAPF", () => {
    const cbs = describeStrategy("cbs-sipp");
    const cbsFull = describeStrategy("cbs-full");
    const mapfGlobal = describeStrategy("mapf-global");

    expect(cbs.categories.conflictSearch).toBe("local");
    expect(cbsFull.categories.conflictSearch).toBe("full");
    expect(mapfGlobal.categories.conflictSearch).toBe("global");
  });

  it("exposes kinematics and optimality in dimensions", () => {
    const kin = describeStrategy("sipp-kinodynamic");
    const smt = describeStrategy("mapf-smt");

    expect(kin.dimensions.routePlanner.kinematics).toBe("kinodynamic");
    expect(smt.dimensions.routePlanner.optimality).toBe("optimal");
  });
});
