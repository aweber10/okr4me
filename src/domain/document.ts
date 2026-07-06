import { v4 as uuid } from "uuid";
import type {
  ChangeAction,
  ChangeLogEntry,
  Comment,
  EntityKind,
  KeyResult,
  Objective,
  OrgUnit,
  OwnerRef,
  Participant,
  ZueDocument
} from "./types";
import { keyResultSchema, objectiveSchema, orgUnitSchema, participantSchema } from "./validation";
import { quarterEnd, quarterStart } from "./quarters";

export function emptyDocument(): ZueDocument {
  return {
    participants: {},
    orgUnits: {},
    objectives: {},
    keyResults: {},
    timeEvents: {},
    comments: {},
    changeLog: {},
    coordinatorIds: []
  };
}

export function normalizeDocument(input: unknown): ZueDocument {
  const value = typeof input === "object" && input !== null ? input as Partial<ZueDocument> : {};
  return {
    participants: value.participants ?? {},
    orgUnits: value.orgUnits ?? {},
    objectives: value.objectives ?? {},
    keyResults: value.keyResults ?? {},
    timeEvents: value.timeEvents ?? {},
    comments: value.comments ?? {},
    changeLog: value.changeLog ?? {},
    coordinatorIds: value.coordinatorIds ?? []
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

function addLog(document: ZueDocument, entityKind: EntityKind, entityId: string, action: ChangeAction, participantId: string, summary: string): void {
  const id = uuid();
  document.changeLog[id] = { id, entityKind, entityId, action, participantId, summary, createdAt: nowIso() };
}

export function ensureParticipant(document: ZueDocument, identity: { localId: string; displayName: string }): ZueDocument {
  const draft = structuredClone(document);
  const existing = draft.participants[identity.localId];
  if (existing) {
    existing.displayName = identity.displayName || existing.displayName;
    return draft;
  }
  const participant: Participant = {
    id: identity.localId,
    displayName: identity.displayName,
    language: "de",
    roleDescription: "",
    about: "",
    isCoordinator: Object.keys(draft.participants).length === 0
  };
  draft.participants[participant.id] = participant;
  if (participant.isCoordinator) draft.coordinatorIds.push(participant.id);
  return draft;
}

export function updateParticipant(document: ZueDocument, participantId: string, patch: Partial<Participant>): ZueDocument {
  const draft = structuredClone(document);
  const current = draft.participants[participantId];
  if (!current) return draft;
  const next = { ...current, ...patch, id: participantId };
  participantSchema.parse(next);
  next.isCoordinator = draft.coordinatorIds.includes(participantId);
  draft.participants[participantId] = next;
  return draft;
}

export function createOrgUnit(document: ZueDocument, participantId: string, input: Omit<OrgUnit, "id">): ZueDocument {
  const draft = structuredClone(document);
  orgUnitSchema.parse(input);
  const id = uuid();
  draft.orgUnits[id] = { ...input, id };
  return draft;
}

export function updateOrgUnit(document: ZueDocument, id: string, input: Partial<OrgUnit>): ZueDocument {
  const draft = structuredClone(document);
  const current = draft.orgUnits[id];
  if (!current) return draft;
  const next = { ...current, ...input, id };
  orgUnitSchema.parse(next);
  if (next.parentId && wouldCreateCycle(draft, id, next.parentId)) {
    throw new Error("Organisation hierarchy cannot contain cycles.");
  }
  draft.orgUnits[id] = next;
  return draft;
}

export function deleteOrgUnit(document: ZueDocument, id: string): ZueDocument {
  const draft = structuredClone(document);
  const hasChildren = Object.values(draft.orgUnits).some((unit) => !unit.deletedAt && unit.parentId === id);
  if (hasChildren) throw new Error("Only leaf org units can be deleted.");
  if (draft.orgUnits[id]) draft.orgUnits[id].deletedAt = nowIso();
  return draft;
}

export function wouldCreateCycle(document: ZueDocument, movingId: string, newParentId: string): boolean {
  let current: string | undefined = newParentId;
  while (current) {
    if (current === movingId) return true;
    current = document.orgUnits[current]?.parentId;
  }
  return false;
}

export function createObjective(
  document: ZueDocument,
  participantId: string,
  input: {
    description: string;
    quarter: number;
    year: number;
    type: "quarterly" | "strategic";
    owner: OwnerRef;
    startDate?: string;
    endDate?: string;
  }
): ZueDocument {
  objectiveSchema.parse(input);
  const draft = structuredClone(document);
  const id = uuid();
  const startDate = input.type === "quarterly" ? quarterStart(input) : input.startDate;
  const endDate = input.type === "quarterly" ? quarterEnd(input) : input.endDate;
  draft.objectives[id] = {
    ...input,
    id,
    startDate,
    endDate,
    createdAt: nowIso(),
    keyResultIds: [],
    crossLinkedKeyResultIds: [],
    commentIds: []
  };
  addLog(draft, "objective", id, "create", participantId, `Created Objective: ${input.description}`);
  return draft;
}

export function updateObjective(document: ZueDocument, participantId: string, id: string, patch: Partial<Objective>): ZueDocument {
  const draft = structuredClone(document);
  const current = draft.objectives[id];
  if (!current) return draft;
  const next = { ...current, ...patch, id };
  objectiveSchema.parse(next);
  const diff = diffSummary(current, next, ["description", "startDate", "endDate", "quarter", "year", "type"]);
  draft.objectives[id] = next;
  if (diff) addLog(draft, "objective", id, "update", participantId, diff);
  return draft;
}

export function deleteObjective(document: ZueDocument, participantId: string, id: string): ZueDocument {
  const draft = structuredClone(document);
  const objective = draft.objectives[id];
  if (!objective) return draft;
  const deletedAt = nowIso();
  objective.deletedAt = deletedAt;
  for (const keyResultId of objective.keyResultIds) {
    const keyResult = draft.keyResults[keyResultId];
    if (!keyResult) continue;
    keyResult.deletedAt = deletedAt;
    for (const eventId of keyResult.timeEventIds) {
      if (draft.timeEvents[eventId]) draft.timeEvents[eventId].deletedAt = deletedAt;
    }
    for (const commentId of keyResult.commentIds) {
      if (draft.comments[commentId]) draft.comments[commentId].deletedAt = deletedAt;
    }
  }
  for (const commentId of objective.commentIds) {
    if (draft.comments[commentId]) draft.comments[commentId].deletedAt = deletedAt;
  }
  addLog(draft, "objective", id, "delete", participantId, `Deleted Objective: ${objective.description}`);
  return draft;
}

export function createKeyResult(document: ZueDocument, participantId: string, objectiveId: string, input: Omit<KeyResult, "id" | "objectiveId" | "timeEventIds" | "commentIds" | "crossLinkedObjectiveIds">): ZueDocument {
  keyResultSchema.parse(input);
  const draft = structuredClone(document);
  const objective = draft.objectives[objectiveId];
  if (!objective) throw new Error("Objective does not exist.");
  const id = uuid();
  draft.keyResults[id] = { ...input, id, objectiveId, timeEventIds: [], commentIds: [], crossLinkedObjectiveIds: [] };
  objective.keyResultIds.push(id);
  addLog(draft, "keyResult", id, "create", participantId, `Created Key Result: ${input.description}`);
  return recordProgressEvent(draft, participantId, id, input.currentValue);
}

export function updateKeyResult(document: ZueDocument, participantId: string, id: string, patch: Partial<KeyResult>): ZueDocument {
  const draft = structuredClone(document);
  const current = draft.keyResults[id];
  if (!current) return draft;
  const next = { ...current, ...patch, id };
  keyResultSchema.parse(next);
  const diff = diffSummary(current, next, ["description", "startValue", "targetValue", "currentValue", "stepSize", "weight", "resultType"]);
  draft.keyResults[id] = next;
  if (diff) addLog(draft, "keyResult", id, "update", participantId, diff);
  if (patch.currentValue !== undefined && patch.currentValue !== current.currentValue) {
    return recordProgressEvent(draft, participantId, id, patch.currentValue);
  }
  return draft;
}

export function deleteKeyResult(document: ZueDocument, participantId: string, id: string): ZueDocument {
  const draft = structuredClone(document);
  const keyResult = draft.keyResults[id];
  if (!keyResult) return draft;
  const deletedAt = nowIso();
  keyResult.deletedAt = deletedAt;
  const objective = draft.objectives[keyResult.objectiveId];
  if (objective) objective.keyResultIds = objective.keyResultIds.filter((keyResultId) => keyResultId !== id);
  for (const eventId of keyResult.timeEventIds) {
    if (draft.timeEvents[eventId]) draft.timeEvents[eventId].deletedAt = deletedAt;
  }
  for (const commentId of keyResult.commentIds) {
    if (draft.comments[commentId]) draft.comments[commentId].deletedAt = deletedAt;
  }
  addLog(draft, "keyResult", id, "delete", participantId, `Deleted Key Result: ${keyResult.description}`);
  return draft;
}

export function recordProgressEvent(document: ZueDocument, participantId: string, keyResultId: string, value: number): ZueDocument {
  const draft = structuredClone(document);
  const keyResult = draft.keyResults[keyResultId];
  if (!keyResult) return draft;
  const id = uuid();
  draft.timeEvents[id] = { id, keyResultId, value, participantId, createdAt: nowIso() };
  keyResult.currentValue = value;
  keyResult.timeEventIds.push(id);
  return draft;
}

export function toggleCrossLink(document: ZueDocument, participantId: string, objectiveId: string, keyResultId: string): ZueDocument {
  const draft = structuredClone(document);
  const objective = draft.objectives[objectiveId];
  const keyResult = draft.keyResults[keyResultId];
  if (!objective || !keyResult || keyResult.objectiveId === objectiveId) return draft;
  const exists = objective.crossLinkedKeyResultIds.includes(keyResultId);
  objective.crossLinkedKeyResultIds = exists
    ? objective.crossLinkedKeyResultIds.filter((id) => id !== keyResultId)
    : [...objective.crossLinkedKeyResultIds, keyResultId];
  keyResult.crossLinkedObjectiveIds = exists
    ? keyResult.crossLinkedObjectiveIds.filter((id) => id !== objectiveId)
    : [...keyResult.crossLinkedObjectiveIds, objectiveId];
  addLog(draft, "objective", objectiveId, "update", participantId, exists ? "Removed cross-link" : "Added cross-link");
  return draft;
}

export function addComment(document: ZueDocument, participantId: string, entityKind: EntityKind, entityId: string, text: string): ZueDocument {
  const draft = structuredClone(document);
  const id = uuid();
  const comment: Comment = { id, entityKind, entityId, authorId: participantId, text, createdAt: nowIso(), updatedAt: nowIso() };
  draft.comments[id] = comment;
  if (entityKind === "objective") draft.objectives[entityId]?.commentIds.push(id);
  if (entityKind === "keyResult") draft.keyResults[entityId]?.commentIds.push(id);
  return draft;
}

export function updateComment(document: ZueDocument, commentId: string, text: string): ZueDocument {
  const draft = structuredClone(document);
  const comment = draft.comments[commentId];
  if (comment) {
    comment.text = text;
    comment.updatedAt = nowIso();
  }
  return draft;
}

export function deleteComment(document: ZueDocument, commentId: string): ZueDocument {
  const draft = structuredClone(document);
  if (draft.comments[commentId]) draft.comments[commentId].deletedAt = nowIso();
  return draft;
}

function diffSummary<T extends Record<string, unknown>>(before: T, after: T, keys: Array<keyof T>): string {
  return keys
    .filter((key) => before[key] !== after[key])
    .map((key) => `${String(key)}: ${String(before[key] ?? "")} -> ${String(after[key] ?? "")}`)
    .join("; ");
}
