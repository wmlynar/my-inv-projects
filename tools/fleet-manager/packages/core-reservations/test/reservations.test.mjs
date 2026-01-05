import { describe, it, expect } from "vitest";
import * as reservations from "../src/index.js";

const { ReservationTable } = reservations;

describe("core-reservations", () => {
  it("reserves without overlap and rejects conflicts", () => {
    const table = new ReservationTable();
    const a = table.reserve("edge-1", { start: 0, end: 10 }, { ownerId: "r1" });
    expect(a.ok).toBe(true);
    const conflict = table.reserve("edge-1", { start: 5, end: 7 }, { ownerId: "r2" });
    expect(conflict.ok).toBe(false);
    expect(conflict.error.conflict.ownerId).toBe("r1");
    const ok = table.reserve("edge-1", { start: 10, end: 12 }, { ownerId: "r2" });
    expect(ok.ok).toBe(true);
  });

  it("is idempotent for the same owner and interval", () => {
    const table = new ReservationTable();
    const first = table.reserve("node-1", { start: 2, end: 6 }, { ownerId: "r1" });
    expect(first.ok).toBe(true);
    const second = table.reserve("node-1", { start: 2, end: 6 }, { ownerId: "r1" });
    expect(second.ok).toBe(true);
    expect(second.value.idempotent).toBe(true);
  });

  it("releases specific reservations and by owner", () => {
    const table = new ReservationTable();
    table.reserve("edge-2", { start: 0, end: 5 }, { ownerId: "r1" });
    table.reserve("edge-2", { start: 6, end: 9 }, { ownerId: "r2" });
    const released = table.release("edge-2", "r1", { start: 0, end: 5 });
    expect(released.ok).toBe(true);
    expect(table.list("edge-2").length).toBe(1);

    table.reserve("edge-3", { start: 0, end: 4 }, { ownerId: "r1" });
    const all = table.releaseByOwner("r1");
    expect(all.ok).toBe(true);
    expect(table.list("edge-2").length).toBe(1);
    expect(table.list("edge-3").length).toBe(0);
  });

  it("does not release when range does not match", () => {
    const table = new ReservationTable();
    table.reserve("edge-4", { start: 0, end: 10 }, { ownerId: "r1" });
    const released = table.release("edge-4", "r1", { start: 0, end: 9 });
    expect(released.ok).toBe(true);
    expect(released.value.removed).toBe(0);
    expect(table.list("edge-4").length).toBe(1);
  });

  it("treats same-range reservations as idempotent regardless of meta", () => {
    const table = new ReservationTable();
    const first = table.reserve("edge-5", { start: 0, end: 10 }, { ownerId: "r1", tag: "a" });
    expect(first.ok).toBe(true);
    const second = table.reserve("edge-5", { start: 0, end: 10 }, { ownerId: "r1", tag: "b" });
    expect(second.ok).toBe(true);
    expect(second.value.idempotent).toBe(true);
  });

  it("supports commit and rollback", () => {
    const table = new ReservationTable();
    const tx = table.beginTransaction();
    expect(tx.reserve("edge-2", { start: 0, end: 5 }, { ownerId: "r1" }).ok).toBe(true);
    tx.rollback();
    expect(table.list("edge-2").length).toBe(0);

    const tx2 = table.beginTransaction();
    expect(tx2.reserve("edge-2", { start: 0, end: 5 }, { ownerId: "r1" }).ok).toBe(true);
    tx2.commit();
    expect(table.list("edge-2").length).toBe(1);
  });

  it("does not add conflicting reservations in a transaction", () => {
    const table = new ReservationTable();
    table.reserve("edge-3", { start: 0, end: 10 }, { ownerId: "r1" });
    const tx = table.beginTransaction();
    const conflict = tx.reserve("edge-3", { start: 5, end: 7 }, { ownerId: "r2" });
    expect(conflict.ok).toBe(false);
    tx.commit();
    expect(table.list("edge-3").length).toBe(1);
  });

  it("isolates conflicts per resource (edge/node/segment)", () => {
    const table = new ReservationTable();
    expect(table.reserve("edge:E1", { start: 0, end: 10 }, { ownerId: "r1" }).ok).toBe(true);
    expect(table.reserve("node:N1", { start: 0, end: 10 }, { ownerId: "r1" }).ok).toBe(true);
    expect(table.reserve("segment:S1", { start: 0, end: 10 }, { ownerId: "r1" }).ok).toBe(true);

    const edgeConflict = table.reserve("edge:E1", { start: 5, end: 8 }, { ownerId: "r2" });
    const nodeConflict = table.reserve("node:N1", { start: 5, end: 8 }, { ownerId: "r2" });
    const segmentConflict = table.reserve("segment:S1", { start: 5, end: 8 }, { ownerId: "r2" });

    expect(edgeConflict.ok).toBe(false);
    expect(nodeConflict.ok).toBe(false);
    expect(segmentConflict.ok).toBe(false);
  });
});
