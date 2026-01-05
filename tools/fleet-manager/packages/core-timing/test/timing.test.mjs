import { describe, it, expect } from "vitest";
import * as timing from "../src/index.js";

const { TimingModel } = timing;

describe("core-timing", () => {
  it("computes ewma and dynamic slack", () => {
    const model = new TimingModel({ baseSlackMs: 100, minSlackMs: 50, maxSlackMs: 300 });
    expect(model.getSlack("seg-1")).toBe(100);
    model.record("seg-1", 400);
    model.record("seg-1", 200);
    const stats = model.getStats("seg-1");
    expect(stats.ewma).not.toBeNull();
    const slack = model.getSlack("seg-1");
    expect(slack).toBeGreaterThanOrEqual(50);
    expect(slack).toBeLessThanOrEqual(300);
  });

  it("learns expected values and uncertainty", () => {
    const model = new TimingModel({ ewmaAlpha: 0.5, p95Window: 5 });
    const edgeKey = "edge:1";
    const robotId = "r1";
    model.observeTravel(edgeKey, robotId, 150, 1000);
    model.observeTravel(edgeKey, robotId, 170, 1100);
    const expected = model.getExpectedMs(edgeKey, robotId, 100);
    expect(expected).toBeGreaterThanOrEqual(150);

    model.observeSlip(edgeKey, robotId, 30, 1200);
    const slipP95 = model.getSlipP95(edgeKey, robotId);
    expect(slipP95).toBeGreaterThanOrEqual(30);
    const uncertainty = model.getUncertaintyMs(edgeKey, robotId, expected);
    expect(Number.isFinite(uncertainty)).toBe(true);
  });

  it("updates ewma deterministically without NaNs", () => {
    const model = new TimingModel({ ewmaAlpha: 0.5, p95Window: 5 });
    model.record("seg-2", 100, "r1", 1000);
    model.record("seg-2", 300, "r1", 1100);
    const stats = model.getStats("seg-2");
    expect(stats.ewma).toBe(200);
    expect(Number.isFinite(stats.ewma)).toBe(true);
    expect(Number.isFinite(model.getSlack("seg-2"))).toBe(true);
  });

  it("handles empty stats and negative slip values", () => {
    const model = new TimingModel({ ewmaAlpha: 0.3, p95Window: 5 });
    expect(model.getUncertaintyMs("edge-x", "r1", 100)).toBe(0);
    model.observeSlip("edge-x", "r1", -50, 1000);
    expect(model.getSlipP95("edge-x", "r1")).toBe(0);
  });
});
