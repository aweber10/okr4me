import { FormEvent, useMemo, useState } from "react";
import { Button, Dropdown, Input, Option } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../state/appStore";
import { isPastQuarter } from "../domain/quarters";
import { objectivesForOrgUnit, objectivesForParticipant, objectiveProgressById } from "../domain/selectors";
import { ObjectiveCard } from "./ObjectiveCard";

export function GoalsView() {
  const { t } = useTranslation();
  const identity = useAppStore((state) => state.identity);
  const document = useAppStore((state) => state.document);
  const selectedQuarter = useAppStore((state) => state.selectedQuarter);
  const createObjective = useAppStore((state) => state.createObjective);
  const participant = identity ? document.participants[identity.localId] : undefined;
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"quarterly" | "strategic">("quarterly");
  const readonly = isPastQuarter(selectedQuarter);
  const ownObjectives = useMemo(() => identity ? objectivesForParticipant(document, identity.localId, selectedQuarter) : [], [document, identity, selectedQuarter]);
  const teamObjectives = useMemo(() => participant?.orgUnitId ? objectivesForOrgUnit(document, participant.orgUnitId, selectedQuarter) : [], [document, participant?.orgUnitId, selectedQuarter]);
  const totalProgress = ownObjectives.length ? ownObjectives.reduce((sum, objective) => sum + objectiveProgressById(document, objective.id), 0) / ownObjectives.length : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!description.trim() || !identity) return;
    await createObjective({ description: description.trim(), type, owner: { kind: "participant", id: identity.localId } });
    setDescription("");
  }

  return (
    <section>
      <div className="section-heading">
        <h1>{t("goals")}</h1>
        <strong>{t("progress")}: {totalProgress.toFixed(0)}%</strong>
      </div>
      {!readonly && (
        <form className="create-objective" onSubmit={(event) => void submit(event)}>
          <Input value={description} onChange={(_, data) => setDescription(data.value)} placeholder={t("description")} />
          <Dropdown selectedOptions={[type]} value={type === "quarterly" ? t("quarterly") : t("strategic")} onOptionSelect={(_, data) => setType(data.optionValue as "quarterly" | "strategic")}>
            <Option value="quarterly">{t("quarterly")}</Option>
            <Option value="strategic">{t("strategic")}</Option>
          </Dropdown>
          <Button appearance="primary" type="submit">{t("create")}</Button>
        </form>
      )}
      <div className="objective-list">
        {ownObjectives.map((objective) => <ObjectiveCard key={objective.id} objective={objective} readonly={readonly} />)}
        {ownObjectives.length === 0 && <p className="empty">{t("noData")}</p>}
      </div>
      <h2>{t("teamObjectives")}</h2>
      <div className="objective-list">
        {teamObjectives.map((objective) => <ObjectiveCard key={objective.id} objective={objective} readonly />)}
      </div>
    </section>
  );
}
