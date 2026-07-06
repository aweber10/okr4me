import { invoke } from "@tauri-apps/api/core";
import type { LocalIdentity, ZueDocument } from "../domain/types";
import { emptyDocument, normalizeDocument } from "../domain/document";

const IDENTITY_KEY = "okr4me.identity";
const DOCUMENT_KEY = "okr4me.document";
const SYNC_CONFIG_KEY = "okr4me.syncConfig";

function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export async function loadIdentity(): Promise<LocalIdentity | null> {
  if (isTauri()) return invoke<LocalIdentity | null>("load_identity");
  const raw = localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(IDENTITY_KEY);
    return null;
  }
}

export async function saveIdentity(displayName: string): Promise<LocalIdentity> {
  if (isTauri()) return invoke<LocalIdentity>("save_identity", { displayName });
  const existing = await loadIdentity();
  const identity: LocalIdentity = {
    localId: existing?.localId ?? createLocalId(),
    displayName,
    windowsAccount: existing?.windowsAccount
  };
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

export async function loadDocument(): Promise<ZueDocument> {
  if (isTauri()) {
    const raw = await invoke<string | null>("load_document");
    return parseDocument(raw);
  }
  const raw = localStorage.getItem(DOCUMENT_KEY);
  return parseDocument(raw);
}

export async function saveDocument(document: ZueDocument): Promise<void> {
  const documentJson = JSON.stringify(document);
  if (isTauri()) {
    await invoke("save_document", { documentJson });
    return;
  }
  localStorage.setItem(DOCUMENT_KEY, documentJson);
}

export async function getSyncFolder(): Promise<string | null> {
  if (isTauri()) {
    const config = await invoke<{ folderPath?: string | null }>("get_sync_config");
    return config.folderPath ?? null;
  }
  return localStorage.getItem(SYNC_CONFIG_KEY);
}

export async function setSyncFolder(folderPath: string | null): Promise<void> {
  if (isTauri()) {
    await invoke("set_sync_config", { folderPath });
    return;
  }
  if (folderPath) localStorage.setItem(SYNC_CONFIG_KEY, folderPath);
  else localStorage.removeItem(SYNC_CONFIG_KEY);
}

export async function syncPull(): Promise<ZueDocument[]> {
  if (!isTauri()) return [];
  const packages = await invoke<string[]>("sync_pull");
  return packages.map((raw) => JSON.parse(raw));
}

export async function syncPush(document: ZueDocument): Promise<void> {
  if (!isTauri()) return;
  await invoke("sync_push", { changeJson: JSON.stringify(document) });
}

export async function printCurrentView(): Promise<void> {
  document.body.classList.add("print-open");
  window.print();
  document.body.classList.remove("print-open");
  if (isTauri()) await invoke("print_current_view");
}

function parseDocument(raw: string | null): ZueDocument {
  if (!raw) return emptyDocument();
  try {
    return normalizeDocument(JSON.parse(raw));
  } catch {
    return emptyDocument();
  }
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
