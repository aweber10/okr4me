import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Dropdown, Input, Label, Option, Textarea } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../state/appStore";
import type { OrgUnit } from "../domain/types";
import { isTauri } from "../platform/persistence";

function orgPath(units: OrgUnit[], unitId?: string): string {
  if (!unitId) return "";
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const parts: string[] = [];
  let current = byId.get(unitId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.join(" / ");
}

interface Props {
  compact?: boolean;
}

export function ProfilePanel({ compact }: Props) {
  const { t } = useTranslation();
  const identity = useAppStore((state) => state.identity);
  const document = useAppStore((state) => state.document);
  const participant = identity ? document.participants[identity.localId] : undefined;
  const orgUnits = useMemo(() => Object.values(document.orgUnits).filter((unit) => !unit.deletedAt), [document.orgUnits]);
  const syncFolder = useAppStore((state) => state.syncFolder);
  const updateCurrentParticipant = useAppStore((state) => state.updateCurrentParticipant);
  const setSyncFolder = useAppStore((state) => state.setSyncFolder);
  const pullSync = useAppStore((state) => state.pullSync);
  const [folder, setFolder] = useState(syncFolder ?? "");
  const [syncStatus, setSyncStatus] = useState("");
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    setFolder(syncFolder ?? "");
  }, [syncFolder]);

  if (!participant) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSyncStatus("");
    setSyncError("");
    try {
      await setSyncFolder(folder.trim() || null);
      setSyncStatus(folder.trim() ? "Sync-Ordner gespeichert und synchronisiert." : "Sync-Ordner entfernt.");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error));
    }
  }

  async function pull() {
    setSyncStatus("");
    setSyncError("");
    try {
      await pullSync();
      setSyncStatus("Stand aus dem Sync-Ordner geholt.");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="panel">
      {!compact && <h2>{t("profile")}</h2>}
      <div className="avatar">{participant.displayName.slice(0, 2).toUpperCase()}</div>
      <Label htmlFor="profile-display-name">{t("displayName")}</Label>
      <Input id="profile-display-name" value={participant.displayName} onChange={(_, data) => void updateCurrentParticipant({ displayName: data.value })} />
      <Label htmlFor="profile-language">Sprache / Language</Label>
      <Dropdown id="profile-language" selectedOptions={[participant.language]} value={participant.language.toUpperCase()} onOptionSelect={(_, data) => void updateCurrentParticipant({ language: data.optionValue as "de" | "en" })}>
        <Option value="de">Deutsch</Option>
        <Option value="en">English</Option>
      </Dropdown>
      <Label htmlFor="profile-organization">Organisation</Label>
      <Dropdown
        id="profile-organization"
        selectedOptions={participant.orgUnitId ? [participant.orgUnitId] : []}
        value={orgPath(orgUnits, participant.orgUnitId)}
        onOptionSelect={(_, data) => void updateCurrentParticipant({ orgUnitId: data.optionValue })}
      >
        {orgUnits.map((unit) => <Option key={unit.id} value={unit.id}>{orgPath(orgUnits, unit.id)}</Option>)}
      </Dropdown>
      <Label htmlFor="profile-role">Tätigkeit</Label>
      <Textarea id="profile-role" value={participant.roleDescription} maxLength={255} onChange={(_, data) => void updateCurrentParticipant({ roleDescription: data.value })} />
      <Label htmlFor="profile-about">Über mich</Label>
      <Textarea id="profile-about" value={participant.about} maxLength={255} onChange={(_, data) => void updateCurrentParticipant({ about: data.value })} />

      {isTauri() ? (
        <form className="sync-form" onSubmit={(event) => void submit(event)}>
          <Label htmlFor="profile-sync-folder">{t("syncFolder")}</Label>
          <Input id="profile-sync-folder" value={folder} onChange={(_, data) => setFolder(data.value)} placeholder="/gemeinsamer/ordner" />
          <div className="button-row">
            <Button type="submit">{t("save")}</Button>
            <Button type="button" onClick={() => void pull()}>Pull</Button>
          </div>
          {syncStatus && <p className="sync-status">{syncStatus}</p>}
          {syncError && <p className="form-error">{syncError}</p>}
        </form>
      ) : (
        <div className="sync-form" style={{ marginTop: "2rem" }}>
          <Button type="button" onClick={() => void useAppStore.getState().loadDemoData?.()}>Demo-Daten laden</Button>
        </div>
      )}
    </section>
  );
}
