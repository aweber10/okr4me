import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import "../i18n";
import { createKeyResult, createObjective, emptyDocument, ensureParticipant } from "../domain/document";
import { useAppStore } from "../state/appStore";
import { RelationGraph } from "./RelationGraph";

function posOf(container: HTMLElement) {
  const map = new Map<string, { x: number; y: number }>();
  for (const g of Array.from(container.querySelectorAll("g.cluster-node")) as SVGGElement[]) {
    const id = g.getAttribute("data-node-id");
    const t = g.getAttribute("transform") || "";
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(t);
    if (id && m) map.set(id, { x: parseFloat(m[1]), y: parseFloat(m[2]) });
  }
  return map;
}

const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe("RelationGraph layout clustering", () => {
  it("places each key result closer to its own objective than to the nearest foreign objective", () => {
    let doc = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Ada" });
    for (let o = 0; o < 4; o += 1) {
      doc = createObjective(doc, "p1", { description: `Obj ${o}`, quarter: 3, year: 2026, type: "quarterly", owner: { kind: "participant", id: "p1" } });
    }
    const objIds = Object.keys(doc.objectives);
    for (const oid of objIds) {
      for (let k = 0; k < 3; k += 1) {
        doc = createKeyResult(doc, "p1", oid, { description: `KR ${oid}-${k}`, startValue: 0, targetValue: 100, currentValue: 10, stepSize: 1, weight: 1, resultType: "%" });
      }
    }
    const krParent = new Map<string, string>();
    for (const oid of objIds) for (const k of doc.objectives[oid].keyResultIds) krParent.set(`K${k}`, `O${oid}`);

    useAppStore.setState({ initialized: true, identity: { localId: "p1", displayName: "Ada" }, document: doc, selectedQuarter: { quarter: 3, year: 2026 }, activeView: "graph", selectedOrgUnitId: undefined, syncFolder: null } as never);

    const { container } = render(<FluentProvider theme={webLightTheme}><RelationGraph /></FluentProvider>);
    const pos = posOf(container);

    let ok = 0;
    let total = 0;
    for (const [krId, parentId] of krParent) {
      const kr = pos.get(krId);
      const own = pos.get(parentId);
      if (!kr || !own) continue;
      total += 1;
      const ownDist = d(kr, own);
      let nearestForeign = Infinity;
      for (const oid of objIds) {
        const foreignId = `O${oid}`;
        if (foreignId === parentId) continue;
        const fp = pos.get(foreignId);
        if (fp) nearestForeign = Math.min(nearestForeign, d(kr, fp));
      }
      if (ownDist < nearestForeign) ok += 1;
    }

    expect(total).toBe(12);
    // Erwartung: nahezu alle KRs liegen naeher am eigenen Objective.
    expect(ok / total).toBeGreaterThanOrEqual(0.9);
  });

  it("moves an objective together with its own key results, leaving foreign clusters in place", () => {
    let doc = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Ada" });
    for (let o = 0; o < 3; o += 1) {
      doc = createObjective(doc, "p1", { description: `Obj ${o}`, quarter: 3, year: 2026, type: "quarterly", owner: { kind: "participant", id: "p1" } });
    }
    const objIds = Object.keys(doc.objectives);
    for (const oid of objIds) {
      for (let k = 0; k < 2; k += 1) {
        doc = createKeyResult(doc, "p1", oid, { description: `KR ${oid}-${k}`, startValue: 0, targetValue: 100, currentValue: 10, stepSize: 1, weight: 1, resultType: "%" });
      }
    }
    useAppStore.setState({ initialized: true, identity: { localId: "p1", displayName: "Ada" }, document: doc, selectedQuarter: { quarter: 3, year: 2026 }, activeView: "graph", selectedOrgUnitId: undefined, syncFolder: null } as never);

    const { container } = render(<FluentProvider theme={webLightTheme}><RelationGraph /></FluentProvider>);
    const svg = container.querySelector("svg.cluster-map-svg") as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 620, right: 1000, bottom: 620, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    const draggedObjective = `O${objIds[0]}`;
    const ownKrs = doc.objectives[objIds[0]].keyResultIds.map((k) => `K${k}`);
    const foreignObjective = `O${objIds[1]}`;
    const foreignKr = `K${doc.objectives[objIds[1]].keyResultIds[0]}`;

    const before = posOf(container);
    const nodeG = container.querySelector(`g.cluster-node[data-node-id="${draggedObjective}"]`) as SVGGElement;
    nodeG.setPointerCapture = () => {};

    // jsdom kennt kein PointerEvent; wir feuern MouseEvents mit pointer-Typ und
    // gesetzten Client-Koordinaten, damit clientX/clientY tatsaechlich ankommen.
    const startX = before.get(draggedObjective)!.x;
    const startY = before.get(draggedObjective)!.y;
    const pointerEvent = (type: string, target: Element, x: number, y: number) => {
      const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
      Object.defineProperty(ev, "pointerId", { value: 1 });
      act(() => {
        target.dispatchEvent(ev);
      });
    };

    pointerEvent("pointerdown", nodeG, startX, startY);
    pointerEvent("pointermove", svg, startX + 120, startY + 60);
    pointerEvent("pointerup", svg, startX + 120, startY + 60);

    const after = posOf(container);
    const moved = (id: string) => d(before.get(id)!, after.get(id)!);

    // Objective und seine eigenen KRs bewegen sich um dasselbe Delta (~134).
    const objMove = moved(draggedObjective);
    expect(objMove).toBeGreaterThan(100);
    for (const kr of ownKrs) {
      expect(Math.abs(moved(kr) - objMove)).toBeLessThan(1);
    }
    // Fremdes Objective und dessen KR bleiben unbewegt.
    expect(moved(foreignObjective)).toBeLessThan(1);
    expect(moved(foreignKr)).toBeLessThan(1);
  });
});
