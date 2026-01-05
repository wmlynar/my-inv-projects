import { describe, it, expect } from "vitest";
import {
  resolveRobustnessProfile,
  applyReservationProfile,
  ROBUSTNESS_PROFILES
} from "../src/index.js";

describe("core-scheduler robustness profile", () => {
  it("maps conservative/balanced/aggressive parameters", () => {
    const conservative = resolveRobustnessProfile({ robustnessProfile: "conservative" });
    const balanced = resolveRobustnessProfile({ robustnessProfile: "balanced" });
    const aggressive = resolveRobustnessProfile({ robustnessProfile: "aggressive" });

    expect(conservative.horizonMs).toBe(ROBUSTNESS_PROFILES.conservative.horizonMs);
    expect(balanced.stepMs).toBe(ROBUSTNESS_PROFILES.balanced.stepMs);
    expect(aggressive.safetyMs).toBe(ROBUSTNESS_PROFILES.aggressive.safetyMs);
    expect(aggressive.baseSlackMs).toBe(ROBUSTNESS_PROFILES.aggressive.baseSlackMs);
  });

  it("applies profile defaults when values are missing", () => {
    const merged = applyReservationProfile({ robustnessProfile: "balanced" });
    expect(merged.reservationHorizonMs).toBe(ROBUSTNESS_PROFILES.balanced.horizonMs);
    expect(merged.reservationStepMs).toBe(ROBUSTNESS_PROFILES.balanced.stepMs);
    expect(merged.reservationSafetyMs).toBe(ROBUSTNESS_PROFILES.balanced.safetyMs);
    expect(merged.scheduleSlackMs).toBe(ROBUSTNESS_PROFILES.balanced.baseSlackMs);
  });

  it("allows explicit overrides without losing profile name", () => {
    const merged = applyReservationProfile({
      robustnessProfile: "aggressive",
      reservationHorizonMs: 9000,
      reservationSafetyMs: 200
    });
    expect(merged.robustnessProfile).toBe("aggressive");
    expect(merged.reservationHorizonMs).toBe(9000);
    expect(merged.reservationSafetyMs).toBe(200);
  });
});
