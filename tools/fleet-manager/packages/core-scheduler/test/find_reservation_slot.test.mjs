import { describe, it, expect } from "vitest";
import { TrafficReservations } from "@fleet-manager/core-reservations";
import { findReservationSlot, CriticalSectionTable } from "../src/index.js";

const makeCtx = (table, options = {}) => ({
  reservationTable: table,
  defaults: { stepMs: 50, horizonMs: 500 },
  getRobotPriorityById: options.getRobotPriorityById || null,
  criticalSectionTable: options.criticalSectionTable || null
});

describe("core-scheduler findReservationSlot", () => {
  it("shifts start time to avoid edge reservation conflicts", () => {
    const table = new TrafficReservations.ReservationTable({ safetyMs: 10 });
    table.reserveEdge("E1", "r1", 0, 100);

    const result = findReservationSlot(makeCtx(table), {
      edgeKeys: ["E1"],
      startTime: 0,
      travelMs: 50,
      profile: { safetyMs: 10, stepMs: 50, horizonMs: 500 },
      robotId: "r2"
    });

    expect(result.startTime).toBe(120);
    expect(result.arrivalTime).toBe(170);
    expect(result.conflict?.type).toBe("edge");
  });

  it("respects constraints and avoids overlaps", () => {
    const table = new TrafficReservations.ReservationTable({ safetyMs: 0 });
    const constraints = {
      edges: new Map([
        [
          "E2",
          [{ startTime: 200, endTime: 260, holder: "constraint" }]
        ]
      ]),
      nodes: new Map()
    };

    const result = findReservationSlot(makeCtx(table), {
      edgeKeys: ["E2"],
      startTime: 180,
      travelMs: 50,
      profile: { safetyMs: 0, stepMs: 50, horizonMs: 500 },
      constraints
    });

    expect(result.startTime).toBe(310);
    expect(result.arrivalTime).toBe(360);
    expect(result.conflict?.source).toBe("constraint");
  });

  it("ignores lower-priority reservations", () => {
    const table = new TrafficReservations.ReservationTable({ safetyMs: 10 });
    table.reserveEdge("E3", "low", 0, 100);

    const result = findReservationSlot(
      makeCtx(table, {
        getRobotPriorityById: (id) => (id === "low" ? 1 : 10)
      }),
      {
        edgeKeys: ["E3"],
        startTime: 0,
        travelMs: 50,
        profile: { safetyMs: 10, stepMs: 50, horizonMs: 500 },
        robotId: "high",
        planningPriority: 5
      }
    );

    expect(result.startTime).toBe(0);
    expect(result.arrivalTime).toBe(50);
  });

  it("shifts on critical section capacity conflicts", () => {
    const table = new TrafficReservations.ReservationTable({ safetyMs: 0 });
    const criticalTable = new CriticalSectionTable();
    criticalTable.reserve("CS-1", "r1", 0, 100, 1);

    const result = findReservationSlot(
      makeCtx(table, { criticalSectionTable: criticalTable }),
      {
        edgeKeys: [],
        nodeId: null,
        startTime: 0,
        travelMs: 40,
        profile: { safetyMs: 0, stepMs: 50, horizonMs: 500 },
        robotId: "r2",
        criticalSection: { id: "CS-1", windowMs: 80, capacity: 1 }
      }
    );

    expect(result.startTime).toBe(150);
    expect(result.arrivalTime).toBe(190);
    expect(result.conflict?.source).toBe("critical_section");
  });

  it("shifts beyond long constraint windows deterministically", () => {
    const table = new TrafficReservations.ReservationTable({ safetyMs: 0 });
    const constraints = {
      edges: new Map([
        [
          "E4",
          [{ startTime: 0, endTime: 10000, holder: "constraint" }]
        ]
      ]),
      nodes: new Map()
    };

    const result = findReservationSlot(makeCtx(table), {
      edgeKeys: ["E4"],
      startTime: 0,
      travelMs: 50,
      profile: { safetyMs: 0, stepMs: 50, horizonMs: 200 },
      constraints
    });

    expect(result.startTime).toBeGreaterThanOrEqual(10050);
    expect(result.conflict?.source).toBe("constraint");
  });
});
