import { describe, expect, it } from "vitest";
import {
  createKeyResult,
  createObjective,
  createOrgUnit,
  deleteObjective,
  deleteOrgUnit,
  emptyDocument,
  ensureParticipant,
  toggleCrossLink,
  updateOrgUnit
} from "./document";
import { graphForQuarter } from "./selectors";

describe("document mutations", () => {
  it("creates the first participant as coordinator", () => {
    const doc = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Max" });
    expect(doc.participants.p1.isCoordinator).toBe(true);
    expect(doc.coordinatorIds).toContain("p1");
  });

  it("cascades objective deletion to key results, events and comments", () => {
    let doc = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Max" });
    doc = createObjective(doc, "p1", { description: "O", quarter: 3, year: 2026, type: "quarterly", owner: { kind: "participant", id: "p1" } });
    const objectiveId = Object.keys(doc.objectives)[0];
    doc = createKeyResult(doc, "p1", objectiveId, { description: "KR", startValue: 0, targetValue: 100, currentValue: 10, stepSize: 1, weight: 1, resultType: "%" });
    const keyResultId = Object.keys(doc.keyResults)[0];
    const eventId = Object.keys(doc.timeEvents)[0];
    doc = deleteObjective(doc, "p1", objectiveId);
    expect(doc.objectives[objectiveId].deletedAt).toBeTruthy();
    expect(doc.keyResults[keyResultId].deletedAt).toBeTruthy();
    expect(doc.timeEvents[eventId].deletedAt).toBeTruthy();
  });

  it("prevents cyclic org hierarchies and deleting non-leaf units", () => {
    let doc = emptyDocument();
    doc = createOrgUnit(doc, "p1", { name: "A", description: "", color: "#0f6cbd" });
    const a = Object.keys(doc.orgUnits)[0];
    doc = createOrgUnit(doc, "p1", { name: "B", description: "", color: "#0f6cbd", parentId: a });
    const b = Object.keys(doc.orgUnits).find((id) => id !== a)!;
    expect(() => updateOrgUnit(doc, a, { parentId: b })).toThrow();
    expect(() => deleteOrgUnit(doc, a)).toThrow();
  });

  it("builds relation graph with parent and cross-link edges", () => {
    let doc = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Max" });
    doc = createObjective(doc, "p1", { description: "A", quarter: 3, year: 2026, type: "quarterly", owner: { kind: "participant", id: "p1" } });
    doc = createObjective(doc, "p1", { description: "B", quarter: 3, year: 2026, type: "quarterly", owner: { kind: "participant", id: "p1" } });
    const [a, b] = Object.keys(doc.objectives);
    doc = createKeyResult(doc, "p1", a, { description: "KR", startValue: 0, targetValue: 100, currentValue: 10, stepSize: 1, weight: 1, resultType: "%" });
    const keyResultId = Object.keys(doc.keyResults)[0];
    doc = toggleCrossLink(doc, "p1", b, keyResultId);
    const graph = graphForQuarter(doc, { quarter: 3, year: 2026 });
    expect(graph.links.some((link) => link.kind === "parent")).toBe(true);
    expect(graph.links.some((link) => link.kind === "crossLink")).toBe(true);
  });
});
