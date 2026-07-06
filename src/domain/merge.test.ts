import { describe, expect, it } from "vitest";
import { emptyDocument, ensureParticipant } from "./document";
import { mergeDocuments } from "./merge";

describe("document merge", () => {
  it("combines independently created participants and coordinators", () => {
    const a = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Ada" });
    const b = ensureParticipant(emptyDocument(), { localId: "p2", displayName: "Ben" });
    const merged = mergeDocuments(a, [b]);
    expect(Object.keys(merged.participants).sort()).toEqual(["p1", "p2"]);
    expect(merged.coordinatorIds).toEqual(["p1", "p2"]);
  });
});
