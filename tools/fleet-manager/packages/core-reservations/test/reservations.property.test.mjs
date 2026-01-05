import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as reservations from "../src/index.js";
import * as coreTime from "@fleet-manager/core-time";

const { ReservationTable } = reservations;
const { overlaps } = coreTime;

const resources = ["edge:1", "edge:2", "node:1", "node:2"];
const owners = ["r1", "r2", "r3"];

const intervalArb = fc
  .tuple(fc.integer({ min: 0, max: 200 }), fc.integer({ min: 1, max: 40 }))
  .map(([start, len]) => ({ start, end: start + len }));

const opArb = fc.oneof(
  fc.record({
    kind: fc.constant("reserve"),
    resourceId: fc.constantFrom(...resources),
    ownerId: fc.constantFrom(...owners),
    interval: intervalArb
  }),
  fc.record({
    kind: fc.constant("release"),
    resourceId: fc.constantFrom(...resources),
    ownerId: fc.constantFrom(...owners),
    interval: intervalArb
  })
);

const assertNoOverlapAcrossOwners = (table) => {
  const snapshot = table.getSnapshot();
  for (const entries of snapshot.values()) {
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i];
        const b = entries[j];
        if (a.ownerId === b.ownerId) continue;
        expect(overlaps(a.range, b.range)).toBe(false);
      }
    }
  }
};

describe("core-reservations property", () => {
  it("never stores overlapping reservations across owners", () => {
    fc.assert(
      fc.property(
        fc.array(opArb, { minLength: 1, maxLength: 80 }),
        (ops) => {
          const table = new ReservationTable();
          ops.forEach((op) => {
            if (op.kind === "reserve") {
              table.reserve(op.resourceId, op.interval, { ownerId: op.ownerId });
            } else {
              table.release(op.resourceId, op.ownerId, op.interval);
            }
          });
          assertNoOverlapAcrossOwners(table);
        }
      )
    );
  });
});
