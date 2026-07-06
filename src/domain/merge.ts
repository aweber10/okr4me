import type { ZueDocument } from "./types";

export function mergeDocuments(base: ZueDocument, incoming: ZueDocument[]): ZueDocument {
  return incoming.reduce((current, next) => ({
    participants: mergeRecord(current.participants, next.participants),
    orgUnits: mergeRecord(current.orgUnits, next.orgUnits),
    objectives: mergeRecord(current.objectives, next.objectives),
    keyResults: mergeRecord(current.keyResults, next.keyResults),
    timeEvents: mergeRecord(current.timeEvents, next.timeEvents),
    comments: mergeRecord(current.comments, next.comments),
    changeLog: mergeRecord(current.changeLog, next.changeLog),
    coordinatorIds: Array.from(new Set([...current.coordinatorIds, ...next.coordinatorIds]))
  }), base);
}

function mergeRecord<T extends { id: string; deletedAt?: string; updatedAt?: string; createdAt?: string }>(left: Record<string, T>, right: Record<string, T>): Record<string, T> {
  const merged = { ...left };
  for (const [id, value] of Object.entries(right)) {
    const existing = merged[id];
    if (!existing) {
      merged[id] = value;
      continue;
    }
    const existingStamp = existing.updatedAt ?? existing.deletedAt ?? existing.createdAt ?? "";
    const nextStamp = value.updatedAt ?? value.deletedAt ?? value.createdAt ?? "";
    merged[id] = nextStamp >= existingStamp ? value : existing;
  }
  return merged;
}
