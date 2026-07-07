import { describe, expect, it } from "vitest";
import { keyResultSchema } from "./validation";

describe("key result validation", () => {
  const base = {
    description: "KR",
    startValue: 0,
    targetValue: 100,
    currentValue: 0,
    stepSize: 1,
    weight: 1,
    resultType: ""
  };

  it("accepts legacy default values", () => {
    expect(keyResultSchema.safeParse(base).success).toBe(true);
  });

  it("requires step size to divide the value range", () => {
    expect(keyResultSchema.safeParse({ ...base, stepSize: 5 }).success).toBe(true);
    expect(keyResultSchema.safeParse({ ...base, stepSize: 3 }).success).toBe(false);
  });

  it("accepts descending goals", () => {
    expect(keyResultSchema.safeParse({ ...base, startValue: 100, targetValue: 20, currentValue: 100, stepSize: 5 }).success).toBe(true);
  });
});
