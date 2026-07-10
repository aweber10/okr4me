import { create } from "zustand";
import type { EntityKind, LocalIdentity, Objective, OrgUnit, OwnerRef, Participant, Quarter, ZueDocument } from "../domain/types";
import { currentQuarter, nextQuarter, previousQuarter } from "../domain/quarters";
import {
  addComment,
  createKeyResult,
  createObjective,
  createOrgUnit,
  deleteKeyResult,
  deleteObjective,
  deleteOrgUnit,
  emptyDocument,
  ensureParticipant,
  toggleCrossLink,
  updateKeyResult,
  updateObjective,
  updateOrgUnit,
  updateParticipant
} from "../domain/document";
import { mergeDocuments } from "../domain/merge";
import { getSyncFolder, loadDocument, loadIdentity, saveDocument, saveIdentity, setSyncFolder, syncPull, syncPush } from "../platform/persistence";

interface AppState {
  initialized: boolean;
  identity: LocalIdentity | null;
  document: ZueDocument;
  selectedQuarter: Quarter;
  activeView: "goals" | "org" | "graph";
  selectedOrgUnitId?: string;
  syncFolder: string | null;
  initialize: () => Promise<void>;
  completeFirstRun: (displayName: string) => Promise<void>;
  setActiveView: (view: AppState["activeView"]) => void;
  previousQuarter: () => void;
  nextQuarter: () => void;
  persist: (next: ZueDocument, sync?: boolean) => Promise<void>;
  updateCurrentParticipant: (patch: Partial<Participant>) => Promise<void>;
  setSyncFolder: (folder: string | null) => Promise<void>;
  pullSync: () => Promise<void>;
  createOrgUnit: (input: Omit<OrgUnit, "id">) => Promise<string>;
  updateOrgUnit: (id: string, input: Partial<OrgUnit>) => Promise<void>;
  deleteOrgUnit: (id: string) => Promise<void>;
  selectOrgUnit: (id?: string) => void;
  createObjective: (input: { description: string; type: "quarterly" | "strategic"; owner: OwnerRef; startDate?: string; endDate?: string }) => Promise<void>;
  updateObjective: (id: string, patch: Partial<Objective>) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;
  createKeyResult: (objectiveId: string, input: { description: string; startValue: number; targetValue: number; currentValue: number; stepSize: number; weight: number; resultType: string }) => Promise<void>;
  updateKeyResult: (keyResultId: string, patch: { description?: string; startValue?: number; targetValue?: number; currentValue?: number; stepSize?: number; weight?: number; resultType?: string }) => Promise<void>;
  updateKeyResultValue: (keyResultId: string, value: number) => Promise<void>;
  deleteKeyResult: (keyResultId: string) => Promise<void>;
  toggleCrossLink: (objectiveId: string, keyResultId: string) => Promise<void>;
  addComment: (entityKind: EntityKind, entityId: string, text: string) => Promise<void>;
  loadDemoData: () => Promise<void>;
}

function requireParticipant(state: AppState): string {
  if (!state.identity) throw new Error("Identity is missing.");
  return state.identity.localId;
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  identity: null,
  document: emptyDocument(),
  selectedQuarter: currentQuarter(),
  activeView: "goals",
  syncFolder: null,

  initialize: async () => {
    const [identity, syncFolder] = await Promise.all([loadIdentity(), getSyncFolder()]);
    let document = await loadDocument();
    if (syncFolder) {
      document = mergeDocuments(document, await syncPull());
      await saveDocument(document);
    }
    if (identity) {
      document = ensureParticipant(document, { localId: identity.localId, displayName: identity.displayName });
      await saveDocument(document);
    }
    set({ initialized: true, identity, document, syncFolder });
  },

  completeFirstRun: async (displayName) => {
    const identity = await saveIdentity(displayName);
    const document = ensureParticipant(get().document, { localId: identity.localId, displayName: identity.displayName });
    await saveDocument(document);
    set({ identity, document });
  },

  setActiveView: (activeView) => set({ activeView }),
  previousQuarter: () => set((state) => ({ selectedQuarter: previousQuarter(state.selectedQuarter) })),
  nextQuarter: () => set((state) => ({ selectedQuarter: nextQuarter(state.selectedQuarter) })),

  persist: async (next, sync = true) => {
    await saveDocument(next);
    if (sync) await syncPush(next);
    set({ document: next });
  },

  updateCurrentParticipant: async (patch) => {
    const id = requireParticipant(get());
    await get().persist(updateParticipant(get().document, id, patch));
  },

  setSyncFolder: async (folder) => {
    await setSyncFolder(folder);
    set({ syncFolder: folder });
    if (!folder) return;
    const merged = mergeDocuments(get().document, await syncPull());
    await saveDocument(merged);
    await syncPush(merged);
    set({ document: merged });
  },

  pullSync: async () => {
    const packages = await syncPull();
    const merged = mergeDocuments(get().document, packages);
    await get().persist(merged, false);
  },

  createOrgUnit: async (input) => {
    const participantId = requireParticipant(get());
    const next = createOrgUnit(get().document, participantId, input);
    const id = Object.keys(next.orgUnits).find((unitId) => !get().document.orgUnits[unitId]);
    await get().persist(next);
    if (!id) throw new Error("Created org unit could not be resolved.");
    set({ selectedOrgUnitId: id });
    return id;
  },

  updateOrgUnit: async (id, input) => {
    await get().persist(updateOrgUnit(get().document, id, input));
  },

  deleteOrgUnit: async (id) => {
    await get().persist(deleteOrgUnit(get().document, id));
  },

  selectOrgUnit: (selectedOrgUnitId) => set({ selectedOrgUnitId }),

  createObjective: async (input) => {
    const state = get();
    const participantId = requireParticipant(state);
    await state.persist(createObjective(state.document, participantId, { ...input, ...state.selectedQuarter }));
  },

  updateObjective: async (id, patch) => {
    const participantId = requireParticipant(get());
    await get().persist(updateObjective(get().document, participantId, id, patch));
  },

  deleteObjective: async (id) => {
    const participantId = requireParticipant(get());
    await get().persist(deleteObjective(get().document, participantId, id));
  },

  createKeyResult: async (objectiveId, input) => {
    const participantId = requireParticipant(get());
    await get().persist(createKeyResult(get().document, participantId, objectiveId, input));
  },

  updateKeyResult: async (keyResultId, patch) => {
    const participantId = requireParticipant(get());
    await get().persist(updateKeyResult(get().document, participantId, keyResultId, patch));
  },

  updateKeyResultValue: async (keyResultId, value) => {
    const participantId = requireParticipant(get());
    await get().persist(updateKeyResult(get().document, participantId, keyResultId, { currentValue: value }));
  },

  deleteKeyResult: async (keyResultId) => {
    const participantId = requireParticipant(get());
    await get().persist(deleteKeyResult(get().document, participantId, keyResultId));
  },

  toggleCrossLink: async (objectiveId, keyResultId) => {
    const participantId = requireParticipant(get());
    await get().persist(toggleCrossLink(get().document, participantId, objectiveId, keyResultId));
  },

  addComment: async (entityKind, entityId, text) => {
    const participantId = requireParticipant(get());
    await get().persist(addComment(get().document, participantId, entityKind, entityId, text));
  },

  loadDemoData: async () => {
    const state = get();
    const participantId = requireParticipant(state);
    const { document } = state;
    let nextDoc = { ...document };

    // Create a demo OrgUnit
    nextDoc = createOrgUnit(nextDoc, participantId, { name: "Demo Organisation", unitType: "company" });
    const orgUnitId = Object.keys(nextDoc.orgUnits).find((id) => !document.orgUnits[id])!;
    
    // Create a demo Objective
    nextDoc = createObjective(nextDoc, participantId, {
      description: "Unsere App erfolgreich launchen",
      type: "quarterly",
      owner: { type: "orgUnit", id: orgUnitId },
      ...state.selectedQuarter
    });
    const objectiveId = Object.keys(nextDoc.objectives).find((id) => !document.objectives[id])!;

    // Create a demo Key Result
    nextDoc = createKeyResult(nextDoc, participantId, objectiveId, {
      description: "1000 aktive Nutzer erreichen",
      startValue: 0,
      targetValue: 1000,
      currentValue: 150,
      stepSize: 10,
      weight: 1,
      resultType: "number"
    });

    await state.persist(nextDoc);
  }
}));
