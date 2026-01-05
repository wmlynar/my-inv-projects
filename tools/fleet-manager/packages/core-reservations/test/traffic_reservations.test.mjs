import { describe, it, expect } from "vitest";
import * as reservations from "../src/index.js";

const { TrafficReservations } = reservations;

const expectSafetyApplied = (entry, safetyMs) => {
  expect(entry.start).toBe(entry.rawStart - safetyMs);
  expect(entry.end).toBe(entry.rawEnd + safetyMs);
};

describe("core-reservations traffic wrapper", () => {
  it("releases all reservations for a robot deterministically", () => {
    const table = new TrafficReservations.ReservationTable({ safetyMs: 10 });
    table.reserveEdge("E1", "r1", 0, 20);
    table.reserveNode("N1", "r1", 30, 10);
    table.reserveEdge("E2", "r2", 0, 20);
    table.reserveNode("N2", "r2", 30, 10);

    table.releaseRobot("r1");

    const snapshot = table.getSnapshot();
    const edgeReservations = Array.from(snapshot.edge.values()).flat();
    const nodeReservations = Array.from(snapshot.node.values()).flat();
    expect(edgeReservations.every((entry) => entry.robotId === "r2")).toBe(true);
    expect(nodeReservations.every((entry) => entry.robotId === "r2")).toBe(true);
  });

  it("applies safetyMs consistently across reservation APIs", () => {
    const safetyMs = 25;
    const table = new TrafficReservations.ReservationTable({ safetyMs });

    table.reserveEdge("E1", "r1", 100, 200);
    table.reserveNode("N1", "r1", 300, 10);
    table.forceReserveEdge("E2", "r2", 400, 500);
    table.forceReserveNode("N2", "r2", 600, 20);

    const tx = table.beginTransaction();
    expect(tx.reserveEdge("E3", "r3", 700, 800).ok).toBe(true);
    expect(tx.reserveNode("N3", "r3", 900, 15).ok).toBe(true);
    tx.commit();

    const edgeE1 = table.getEdgeReservations("E1")[0];
    const nodeN1 = table.getNodeReservations("N1")[0];
    const edgeE2 = table.getEdgeReservations("E2")[0];
    const nodeN2 = table.getNodeReservations("N2")[0];
    const edgeE3 = table.getEdgeReservations("E3")[0];
    const nodeN3 = table.getNodeReservations("N3")[0];

    expectSafetyApplied(edgeE1, safetyMs);
    expectSafetyApplied(nodeN1, safetyMs);
    expectSafetyApplied(edgeE2, safetyMs);
    expectSafetyApplied(nodeN2, safetyMs);
    expectSafetyApplied(edgeE3, safetyMs);
    expectSafetyApplied(nodeN3, safetyMs);
  });

  it("prunes old reservations based on raw end time", () => {
    const table = new TrafficReservations.ReservationTable({ safetyMs: 10, horizonMs: 50 });
    table.reserveEdge("E1", "r1", 0, 10);
    table.reserveEdge("E2", "r1", 100, 120);
    table.prune(150);
    expect(table.getEdgeReservations("E1").length).toBe(0);
    expect(table.getEdgeReservations("E2").length).toBe(1);
  });

  it("rolls back transaction reservations", () => {
    const table = new TrafficReservations.ReservationTable({ safetyMs: 0 });
    const tx = table.beginTransaction();
    expect(tx.reserveEdge("E1", "r1", 0, 10).ok).toBe(true);
    tx.rollback();
    expect(table.getEdgeReservations("E1").length).toBe(0);
  });
});
