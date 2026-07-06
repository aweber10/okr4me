import { describe, expect, it } from "vitest";
import { currentQuarter, isPastQuarter, nextQuarter, objectiveVisibleInQuarter, previousQuarter, quarterEnd, quarterStart } from "./quarters";
import type { Objective } from "./types";

const objective: Objective = {
  id: "o1",
  description: "Strategic",
  createdAt: "2026-01-01T00:00:00Z",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  quarter: 1,
  year: 2026,
  owner: { kind: "participant", id: "p1" },
  type: "strategic",
  keyResultIds: [],
  crossLinkedKeyResultIds: [],
  commentIds: []
};

describe("quarter logic", () => {
  it("detects the current quarter", () => {
    expect(currentQuarter(new Date("2026-07-06T00:00:00Z"))).toEqual({ quarter: 3, year: 2026 });
  });

  it("moves across year boundaries", () => {
    expect(previousQuarter({ quarter: 1, year: 2026 })).toEqual({ quarter: 4, year: 2025 });
    expect(nextQuarter({ quarter: 4, year: 2026 })).toEqual({ quarter: 1, year: 2027 });
  });

  it("computes quarter date boundaries", () => {
    expect(quarterStart({ quarter: 3, year: 2026 })).toBe("2026-07-01");
    expect(quarterEnd({ quarter: 3, year: 2026 })).toBe("2026-09-30");
  });

  it("locks past quarters", () => {
    expect(isPastQuarter({ quarter: 2, year: 2026 }, new Date("2026-07-06T00:00:00Z"))).toBe(true);
    expect(isPastQuarter({ quarter: 3, year: 2026 }, new Date("2026-07-06T00:00:00Z"))).toBe(false);
  });

  it("shows strategic objectives across quarters", () => {
    expect(objectiveVisibleInQuarter(objective, { quarter: 4, year: 2026 })).toBe(true);
    expect(objectiveVisibleInQuarter(objective, { quarter: 1, year: 2027 })).toBe(false);
  });
});
