import { describe, it, expect } from "vitest";
import * as coreTypes from "../src/index.js";

const { ok, err, isOk, isErr, asId } = coreTypes;

describe("core-types Result", () => {
  it("marks ok and err results", () => {
    const success = ok(42);
    const failure = err("boom");
    expect(success.ok).toBe(true);
    expect(success.value).toBe(42);
    expect(failure.ok).toBe(false);
    expect(failure.error).toBe("boom");
    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });

  it("normalizes ids", () => {
    expect(asId(" robot-01 ")).toBe("robot-01");
    expect(() => asId(" ")).toThrowError(/id_empty/);
    expect(() => asId(null, "robot")).toThrowError(/robot_missing/);
  });
});
