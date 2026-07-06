import type { DiagramSeries, GraphLink, GraphNode, Objective, OwnerRef, Quarter, ZueDocument } from "./types";
import { objectiveProgress, progressForValue } from "./progress";
import { objectiveVisibleInQuarter, quarterEnd, quarterStart } from "./quarters";

export function activeObjectives(document: ZueDocument, selected: Quarter): Objective[] {
  return Object.values(document.objectives)
    .filter((objective) => objectiveVisibleInQuarter(objective, selected))
    .sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? "") || a.description.localeCompare(b.description));
}

export function keyResultsForObjective(document: ZueDocument, objectiveId: string) {
  const objective = document.objectives[objectiveId];
  if (!objective) return [];
  return objective.keyResultIds.map((id) => document.keyResults[id]).filter((keyResult) => keyResult && !keyResult.deletedAt);
}

export function ownerLabel(document: ZueDocument, owner: OwnerRef): string {
  if (owner.kind === "participant") return document.participants[owner.id]?.displayName ?? "Unbekannt";
  return document.orgUnits[owner.id]?.name ?? "Unbekannt";
}

export function objectiveProgressById(document: ZueDocument, objectiveId: string): number {
  return objectiveProgress(keyResultsForObjective(document, objectiveId));
}

export function objectivesForParticipant(document: ZueDocument, participantId: string, selected: Quarter): Objective[] {
  return activeObjectives(document, selected).filter((objective) => objective.owner.kind === "participant" && objective.owner.id === participantId);
}

export function objectivesForOrgUnit(document: ZueDocument, orgUnitId: string, selected: Quarter): Objective[] {
  return activeObjectives(document, selected).filter((objective) => objective.owner.kind === "orgUnit" && objective.owner.id === orgUnitId);
}

export function graphForQuarter(document: ZueDocument, selected: Quarter): { nodes: GraphNode[]; links: GraphLink[] } {
  const objectives = activeObjectives(document, selected);
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const objectiveIds = new Set(objectives.map((objective) => objective.id));

  for (const objective of objectives) {
    nodes.push({
      id: `O${objective.id}`,
      kind: "objective",
      label: objective.description,
      ownerLabel: ownerLabel(document, objective.owner),
      progress: objectiveProgressById(document, objective.id)
    });
    for (const keyResult of keyResultsForObjective(document, objective.id)) {
      nodes.push({
        id: `K${keyResult.id}`,
        kind: "keyResult",
        label: keyResult.description,
        ownerLabel: ownerLabel(document, objective.owner),
        progress: progressForValue(keyResult, keyResult.currentValue)
      });
      links.push({ source: `O${objective.id}`, target: `K${keyResult.id}`, kind: "parent" });
    }
  }

  for (const objective of objectives) {
    for (const keyResultId of objective.crossLinkedKeyResultIds) {
      const keyResult = document.keyResults[keyResultId];
      if (keyResult && !keyResult.deletedAt && objectiveIds.has(keyResult.objectiveId)) {
        links.push({ source: `O${objective.id}`, target: `K${keyResultId}`, kind: "crossLink" });
      }
    }
  }
  return { nodes, links };
}

export function diagramForObjective(document: ZueDocument, objectiveId: string): DiagramSeries[] {
  const objective = document.objectives[objectiveId];
  if (!objective) return [];
  return keyResultsForObjective(document, objectiveId).map((keyResult) => {
    const points = [{ date: objective.startDate ?? quarterStart(objective), progress: 0 }];
    const eventPoints = keyResult.timeEventIds
      .map((id) => document.timeEvents[id])
      .filter((event) => event && !event.deletedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((event) => ({ date: event.createdAt, progress: progressForValue(keyResult, event.value) }));
    points.push(...eventPoints);
    const last = points[points.length - 1];
    points.push({ date: objective.endDate ?? quarterEnd(objective), progress: last.progress });
    return { keyResultId: keyResult.id, label: keyResult.description, points };
  });
}
