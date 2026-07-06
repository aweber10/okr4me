import { FormEvent, useMemo, useState } from "react";
import { Button, Input } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../state/appStore";
import { isPastQuarter } from "../domain/quarters";
import { objectivesForOrgUnit } from "../domain/selectors";
import { ObjectiveCard } from "./ObjectiveCard";

export function OrgBrowser() {
  const { t } = useTranslation();
  const identity = useAppStore((state) => state.identity);
  const document = useAppStore((state) => state.document);
  const selectedQuarter = useAppStore((state) => state.selectedQuarter);
  const selectedOrgUnitId = useAppStore((state) => state.selectedOrgUnitId);
  const selectOrgUnit = useAppStore((state) => state.selectOrgUnit);
  const createOrgUnit = useAppStore((state) => state.createOrgUnit);
  const createObjective = useAppStore((state) => state.createObjective);
  const [unitName, setUnitName] = useState("");
  const [objectiveDescription, setObjectiveDescription] = useState("");
  const participant = identity ? document.participants[identity.localId] : undefined;
  const isCoordinator = identity ? document.coordinatorIds.includes(identity.localId) : false;
  const units = Object.values(document.orgUnits).filter((unit) => !unit.deletedAt);
  const currentOrgUnitId = selectedOrgUnitId ?? participant?.orgUnitId ?? units[0]?.id;
  const objectives = useMemo(() => currentOrgUnitId ? objectivesForOrgUnit(document, currentOrgUnitId, selectedQuarter) : [], [document, currentOrgUnitId, selectedQuarter]);
  const readonly = isPastQuarter(selectedQuarter);

  async function submitUnit(event: FormEvent) {
    event.preventDefault();
    if (!unitName.trim()) return;
    await createOrgUnit({ name: unitName.trim(), description: "", color: "#0f6cbd" });
    setUnitName("");
  }

  async function submitObjective(event: FormEvent) {
    event.preventDefault();
    if (!objectiveDescription.trim() || !currentOrgUnitId) return;
    await createObjective({ description: objectiveDescription.trim(), type: "quarterly", owner: { kind: "orgUnit", id: currentOrgUnitId } });
    setObjectiveDescription("");
  }

  return (
    <section className="org-layout">
      <div className="org-tree section-not-printable">
        <h2>{t("organization")}</h2>
        {units.map((unit) => (
          <button
            key={unit.id}
            className={unit.id === currentOrgUnitId ? "tree-node active" : "tree-node"}
            style={{ borderLeftColor: unit.color }}
            onClick={() => selectOrgUnit(unit.id)}
          >
            {unit.name}
          </button>
        ))}
        {isCoordinator && (
          <form className="inline-form" onSubmit={(event) => void submitUnit(event)}>
            <Input value={unitName} onChange={(_, data) => setUnitName(data.value)} placeholder={t("addOrgUnit")} />
            <Button type="submit">+</Button>
          </form>
        )}
      </div>
      <div>
        <div className="section-heading">
          <h1>{units.find((unit) => unit.id === currentOrgUnitId)?.name ?? t("org")}</h1>
        </div>
        {!readonly && currentOrgUnitId && (
          <form className="create-objective" onSubmit={(event) => void submitObjective(event)}>
            <Input value={objectiveDescription} onChange={(_, data) => setObjectiveDescription(data.value)} placeholder={t("description")} />
            <Button appearance="primary" type="submit">{t("create")}</Button>
          </form>
        )}
        <div className="objective-list">
          {objectives.map((objective) => <ObjectiveCard key={objective.id} objective={objective} readonly={readonly} />)}
          {objectives.length === 0 && <p className="empty">{t("noData")}</p>}
        </div>
      </div>
    </section>
  );
}
