import { describe, expect, it } from "vitest";
import { keyResultProgress, objectiveProgress, progressForValue } from "./progress";

describe("progress calculation", () => {
  it("calculates ascending key result progress with weighting", () => {
    expect(keyResultProgress({ startValue: 0, targetValue: 100, currentValue: 50, weight: 2 })).toBe(100);
  });

  it("calculates descending key result progress", () => {
    expect(progressForValue({ startValue: 100, targetValue: 0 }, 25)).toBe(75);
  });

  it("caps progress at 100 percent before weighting", () => {
    expect(keyResultProgress({ startValue: 0, targetValue: 10, currentValue: 15, weight: 1 })).toBe(100);
  });

  it("treats zero range as complete", () => {
    expect(objectiveProgress([{ startValue: 1, targetValue: 1, currentValue: 1, weight: 1 }])).toBe(100);
  });

  it("calculates weighted objective progress", () => {
    expect(objectiveProgress([
      { startValue: 0, targetValue: 100, currentValue: 100, weight: 2 },
      { startValue: 0, targetValue: 100, currentValue: 50, weight: 1 }
    ])).toBeCloseTo(83.333, 2);
  });
});
