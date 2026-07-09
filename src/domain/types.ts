export type Locale = "de" | "en";
export type ObjectiveType = "quarterly" | "strategic";
export type OwnerRef = { kind: "participant"; id: string } | { kind: "orgUnit"; id: string };
export type EntityKind = "objective" | "keyResult";
export type ChangeAction = "create" | "update" | "delete";

export interface Participant {
  id: string;
  displayName: string;
  language: Locale;
  roleDescription: string;
  about: string;
  orgUnitId?: string;
  isCoordinator: boolean;
  deletedAt?: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  description: string;
  color: string;
  parentId?: string;
  deletedAt?: string;
}

export interface Objective {
  id: string;
  description: string;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  quarter: number;
  year: number;
  owner: OwnerRef;
  type: ObjectiveType;
  keyResultIds: string[];
  crossLinkedKeyResultIds: string[];
  commentIds: string[];
  deletedAt?: string;
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  description: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  stepSize: number;
  weight: number;
  resultType: string;
  timeEventIds: string[];
  commentIds: string[];
  crossLinkedObjectiveIds: string[];
  deletedAt?: string;
}

export interface TimeEvent {
  id: string;
  keyResultId: string;
  value: number;
  createdAt: string;
  participantId: string;
  deletedAt?: string;
}

export interface Comment {
  id: string;
  entityKind: EntityKind;
  entityId: string;
  authorId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ChangeLogEntry {
  id: string;
  entityKind: EntityKind;
  entityId: string;
  action: ChangeAction;
  participantId: string;
  summary: string;
  createdAt: string;
}

export interface ZueDocument {
  participants: Record<string, Participant>;
  orgUnits: Record<string, OrgUnit>;
  objectives: Record<string, Objective>;
  keyResults: Record<string, KeyResult>;
  timeEvents: Record<string, TimeEvent>;
  comments: Record<string, Comment>;
  changeLog: Record<string, ChangeLogEntry>;
  coordinatorIds: string[];
}

export interface LocalIdentity {
  localId: string;
  displayName: string;
  windowsAccount?: string;
}

export interface Quarter {
  quarter: number;
  year: number;
}

export interface GraphNode {
  id: string;
  kind: EntityKind;
  label: string;
  ownerLabel: string;
  ownerKind: OwnerRef["kind"];
  ownerId: string;
  ownerColor: string;
  progress: number;
}

export interface GraphLink {
  source: string;
  target: string;
  kind: "parent" | "crossLink";
}

export interface DiagramSeries {
  keyResultId: string;
  label: string;
  points: Array<{ date: string; progress: number }>;
}
