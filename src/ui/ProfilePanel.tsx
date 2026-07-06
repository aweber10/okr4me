import { FormEvent, useMemo, useState } from "react";
import { Button, Dropdown, Input, Label, Option, Textarea } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../state/appStore";

export function ProfilePanel() {
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

  if (!participant) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await setSyncFolder(folder.trim() || null);
  }

  return (
    <section className="panel">
      <h2>{t("profile")}</h2>
      <div className="avatar">{participant.displayName.slice(0, 2).toUpperCase()}</div>
      <Label>{t("displayName")}</Label>
      <Input value={participant.displayName} onChange={(_, data) => void updateCurrentParticipant({ displayName: data.value })} />
      <Label>Sprache / Language</Label>
      <Dropdown selectedOptions={[participant.language]} value={participant.language.toUpperCase()} onOptionSelect={(_, data) => void updateCurrentParticipant({ language: data.optionValue as "de" | "en" })}>
        <Option value="de">Deutsch</Option>
        <Option value="en">English</Option>
      </Dropdown>
      <Label>Organisation</Label>
      <Dropdown
        selectedOptions={participant.orgUnitId ? [participant.orgUnitId] : []}
        value={orgUnits.find((unit) => unit.id === participant.orgUnitId)?.name ?? ""}
        onOptionSelect={(_, data) => void updateCurrentParticipant({ orgUnitId: data.optionValue })}
      >
        {orgUnits.map((unit) => <Option key={unit.id} value={unit.id}>{unit.name}</Option>)}
      </Dropdown>
      <Label>Tätigkeit</Label>
      <Textarea value={participant.roleDescription} maxLength={255} onChange={(_, data) => void updateCurrentParticipant({ roleDescription: data.value })} />
      <Label>Über mich</Label>
      <Textarea value={participant.about} maxLength={255} onChange={(_, data) => void updateCurrentParticipant({ about: data.value })} />

      <form className="sync-form" onSubmit={(event) => void submit(event)}>
        <Label>{t("syncFolder")}</Label>
        <Input value={folder} onChange={(_, data) => setFolder(data.value)} placeholder="/gemeinsamer/ordner" />
        <div className="button-row">
          <Button type="submit">{t("save")}</Button>
          <Button type="button" onClick={() => void pullSync()}>Pull</Button>
        </div>
      </form>
    </section>
  );
}
