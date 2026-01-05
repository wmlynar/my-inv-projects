import { describe, it, expect } from "vitest";
import * as reservations from "@fleet-manager/core-reservations";
import * as scheduler from "../src/index.js";

const { ReservationTable } = reservations;
const { buildSchedule, repairSchedule } = scheduler;

const makeRoute = (ids) => ({
  segments: ids.map((id) => ({ id, length: 2, speedMps: 1 }))
});

describe("core-scheduler", () => {
  it("keeps schedule when no conflicts", () => {
    const table = new ReservationTable();
    const schedule = buildSchedule(makeRoute(["A"]), { startTimeMs: 0 });
    const result = repairSchedule(schedule, table, "edge:A");
    expect(result.ok).toBe(true);
    expect(result.schedule[0].startTime).toBe(schedule[0].startTime);
  });

  it("retimes on conflict without aborting", () => {
    const table = new ReservationTable();
    table.reserve("edge:A", { start: 0, end: 10 });
    const schedule = buildSchedule(makeRoute(["A"]), { startTimeMs: 0 });
    const result = repairSchedule(schedule, table, "edge:A");
    expect(result.ok).toBe(true);
    expect(result.schedule[0].startTime).toBe(10);
  });

  it("handles multiple conflicts in sequence", () => {
    const table = new ReservationTable();
    table.reserve("edge:A", { start: 0, end: 10 });
    table.reserve("edge:A", { start: 12, end: 18 });
    const schedule = buildSchedule(makeRoute(["A"]), { startTimeMs: 0 });
    const result = repairSchedule(schedule, table, "edge:A");
    expect(result.ok).toBe(true);
    expect(result.schedule[0].startTime).toBe(18);
  });

  it("retimes to conflict end and preserves ordering", () => {
    const table = new ReservationTable();
    table.reserve("edge:A", { start: 1000, end: 1500 });
    const route = { segments: [{ id: "A", travelMs: 100 }, { id: "B", travelMs: 100 }] };
    const schedule = buildSchedule(route, { startTimeMs: 1000 });
    const result = repairSchedule(
      schedule,
      table,
      (entry) => `edge:${entry.segmentId}`
    );
    expect(result.ok).toBe(true);
    expect(result.schedule[0].startTime).toBe(1500);
    expect(result.schedule[0].endTime).toBe(1600);
    expect(result.schedule[1].startTime).toBe(1600);
  });
});
