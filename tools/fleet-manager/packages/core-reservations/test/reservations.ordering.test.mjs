import { describe, it, expect } from "vitest";
import * as reservations from "../src/index.js";
import { overlaps } from "@fleet-manager/core-time";

const { ReservationTable } = reservations;

describe("core-reservations ordering", () => {
  it("keeps reservations sorted by start time", () => {
    const table = new ReservationTable();
    table.reserve("edge-1", { start: 20, end: 30 }, { ownerId: "r1" });
    table.reserve("edge-1", { start: 0, end: 10 }, { ownerId: "r2" });
    table.reserve("edge-1", { start: 12, end: 18 }, { ownerId: "r3" });
    const list = table.list("edge-1");
    expect(list.map((entry) => entry.range.start)).toEqual([0, 12, 20]);
  });

  it("stores non-overlapping ranges per resource", () => {
    const table = new ReservationTable();
    table.reserve("edge-2", { start: 0, end: 5 }, { ownerId: "r1" });
    table.reserve("edge-2", { start: 6, end: 9 }, { ownerId: "r2" });
    const list = table.list("edge-2");
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        expect(overlaps(list[i].range, list[j].range)).toBe(false);
      }
    }
  });
});
