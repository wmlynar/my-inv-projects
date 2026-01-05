import { describe, it, expect } from "vitest";
import { CriticalSectionTable } from "../src/index.js";

describe("core-scheduler critical sections", () => {
  it("enforces capacity=1 and rejects overlaps", () => {
    const table = new CriticalSectionTable();
    expect(table.reserve("S1", "r1", 0, 100, 1).ok).toBe(true);
    const denied = table.reserve("S1", "r2", 50, 120, 1);
    expect(denied.ok).toBe(false);
    expect(denied.holder).toBe("r1");
    expect(denied.end).toBe(100);
  });

  it("allows reuse after releaseRobot", () => {
    const table = new CriticalSectionTable();
    table.reserve("S2", "r1", 0, 100, 1);
    table.releaseRobot("r1");
    const ok = table.reserve("S2", "r2", 10, 20, 1);
    expect(ok.ok).toBe(true);
  });

  it("supports capacity > 1", () => {
    const table = new CriticalSectionTable();
    expect(table.reserve("S3", "r1", 0, 100, 2).ok).toBe(true);
    expect(table.reserve("S3", "r2", 10, 90, 2).ok).toBe(true);
    const denied = table.reserve("S3", "r3", 20, 80, 2);
    expect(denied.ok).toBe(false);
    expect(denied.end).toBe(90);
  });

  it("does not block when windows only touch", () => {
    const table = new CriticalSectionTable();
    expect(table.reserve("S4", "r1", 0, 50, 1).ok).toBe(true);
    const ok = table.reserve("S4", "r2", 50, 70, 1);
    expect(ok.ok).toBe(true);
  });
});
