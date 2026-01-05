import { describe, it, expect } from "vitest";
import * as coreTime from "../src/index.js";

const {
  interval,
  makeInterval,
  duration,
  contains,
  overlaps,
  mergeIntervals,
  shift,
  clamp,
  ManualClock
} = coreTime;

describe("core-time intervals", () => {
  it("uses [start,end) semantics", () => {
    const a = interval(0, 10);
    const b = interval(10, 20);
    expect(overlaps(a, b)).toBe(false);
    expect(contains(a, 0)).toBe(true);
    expect(contains(a, 9)).toBe(true);
    expect(contains(a, 10)).toBe(false);
  });

  it("shifts and clamps intervals", () => {
    const base = interval(5, 15);
    const moved = shift(base, 5);
    expect(moved).toEqual({ start: 10, end: 20 });
    const trimmed = clamp(moved, 12, 18);
    expect(trimmed).toEqual({ start: 12, end: 18 });
  });

  it("handles overlap and merge rules", () => {
    const a = interval(0, 10);
    const b = interval(4, 12);
    const c = interval(10, 14);
    expect(overlaps(a, b)).toBe(true);
    expect(overlaps(a, c)).toBe(false);
    expect(mergeIntervals(a, b)).toEqual({ start: 0, end: 12 });
    expect(mergeIntervals(a, c)).toBe(null);
  });

  it("shifts backwards deterministically", () => {
    const base = interval(8, 18);
    expect(shift(base, -3)).toEqual({ start: 5, end: 15 });
  });

  it("handles zero-length intervals and large values", () => {
    const zero = interval(5, 5);
    expect(duration(zero)).toBe(0);
    expect(contains(zero, 5)).toBe(false);
    const large = interval(1e9, 1e9 + 5);
    expect(contains(large, 1e9)).toBe(true);
    expect(overlaps(large, interval(1e9 + 5, 1e9 + 10))).toBe(false);
  });

  it("normalizes with makeInterval", () => {
    expect(makeInterval(10, 5)).toEqual({ start: 5, end: 10 });
    expect(makeInterval(0, 0)).toEqual({ start: 0, end: 0 });
  });

  it("tracks time in manual clock", () => {
    const clock = new ManualClock(100);
    expect(clock.now()).toBe(100);
    clock.advance(50);
    expect(clock.now()).toBe(150);
    clock.set(12);
    expect(clock.now()).toBe(12);
  });

  it("computes duration", () => {
    expect(duration(interval(2, 9))).toBe(7);
  });
});
