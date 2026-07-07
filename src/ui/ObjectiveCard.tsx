import { FormEvent, useMemo, useState } from "react";
import { Button, Input, Label, ProgressBar, Textarea } from "@fluentui/react-components";
import { Check, Link2, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import type { KeyResult, Objective } from "../domain/types";
import { activeObjectives, keyResultsForObjective, objectiveProgressById, ownerLabel } from "../domain/selectors";
import { useAppStore } from "../state/appStore";
import { dividesRange, keyResultSchema } from "../domain/validation";
import { progressForValue } from "../domain/progress";

interface Props {
  objective: Objective;
  readonly?: boolean;
}

interface KeyResultFormState {
  description: string;
  startValue: string;
  targetValue: string;
  stepSize: string;
  weight: string;
  resultType: string;
}

const defaultKeyResultForm: KeyResultFormState = {
  description: "",
  startValue: "0",
  targetValue: "100",
  stepSize: "1",
  weight: "1",
  resultType: ""
};

function formFromKeyResult(keyResult: KeyResult): KeyResultFormState {
  return {
    description: keyResult.description,
    startValue: String(keyResult.startValue),
    targetValue: String(keyResult.targetValue),
    stepSize: String(keyResult.stepSize),
    weight: String(keyResult.weight),
    resultType: keyResult.resultType
  };
}

function parseKeyResultForm(form: KeyResultFormState, currentValue?: number) {
  return {
    description: form.description.trim(),
    startValue: Number(form.startValue),
    targetValue: Number(form.targetValue),
    currentValue: currentValue ?? Number(form.startValue),
    stepSize: Number(form.stepSize),
    weight: Number(form.weight),
    resultType: form.resultType.trim()
  };
}

function keyResultFormError(form: KeyResultFormState, currentValue?: number): string {
  const parsed = parseKeyResultForm(form, currentValue);
  if (!form.description.trim()) return "Beschreibung ist erforderlich.";
  if ([parsed.startValue, parsed.targetValue, parsed.currentValue, parsed.stepSize, parsed.weight].some((value) => Number.isNaN(value))) return "Startwert, Zielwert, aktueller Wert, Schrittgröße und Gewichtung müssen Zahlen sein.";
  if (parsed.startValue === parsed.targetValue) return "Startwert und Zielwert dürfen nicht identisch sein.";
  const range = Math.abs(parsed.targetValue - parsed.startValue);
  if (parsed.stepSize < 0.01) return "Schrittgröße muss mindestens 0.01 sein.";
  if (parsed.stepSize > range) return "Schrittgröße darf nicht größer als der Wertebereich sein.";
  if (!dividesRange(range, parsed.stepSize)) return "Schrittgröße teilt den Wertebereich nicht ganzzahlig.";
  if (!Number.isInteger(parsed.weight) || parsed.weight < 1) return "Gewichtung muss eine ganze Zahl ab 1 sein.";
  if (parsed.resultType.length > 20) return "Zieltyp darf maximal 20 Zeichen lang sein.";
  const result = keyResultSchema.safeParse(parsed);
  return result.success ? "" : result.error.issues[0]?.message ?? "Key Result ist ungültig.";
}

export function ObjectiveCard({ objective, readonly }: Props) {
  const document = useAppStore((state) => state.document);
  const currentObjective = document.objectives[objective.id] ?? objective;
  const createKeyResult = useAppStore((state) => state.createKeyResult);
  const updateObjective = useAppStore((state) => state.updateObjective);
  const updateKeyResult = useAppStore((state) => state.updateKeyResult);
  const updateKeyResultValue = useAppStore((state) => state.updateKeyResultValue);
  const deleteKeyResult = useAppStore((state) => state.deleteKeyResult);
  const deleteObjective = useAppStore((state) => state.deleteObjective);
  const toggleCrossLink = useAppStore((state) => state.toggleCrossLink);
  const addComment = useAppStore((state) => state.addComment);
  const keyResults = useMemo(() => keyResultsForObjective(document, currentObjective.id), [document, currentObjective.id]);
  const linkedKeyResults = useMemo(
    () => currentObjective.crossLinkedKeyResultIds
      .map((id) => document.keyResults[id])
      .filter((keyResult) => keyResult && !keyResult.deletedAt && document.objectives[keyResult.objectiveId] && !document.objectives[keyResult.objectiveId].deletedAt),
    [document, currentObjective.crossLinkedKeyResultIds]
  );
  const linkCandidates = useMemo(() => {
    const linkedIds = new Set(currentObjective.crossLinkedKeyResultIds);
    const visibleObjectiveIds = new Set(activeObjectives(document, { quarter: currentObjective.quarter, year: currentObjective.year }).map((item) => item.id));
    return Object.values(document.keyResults)
      .filter((keyResult) => {
        if (keyResult.deletedAt) return false;
        if (keyResult.objectiveId === currentObjective.id) return false;
        if (linkedIds.has(keyResult.id)) return false;
        return visibleObjectiveIds.has(keyResult.objectiveId);
      })
      .sort((a, b) => {
        const objectiveA = document.objectives[a.objectiveId]?.description ?? "";
        const objectiveB = document.objectives[b.objectiveId]?.description ?? "";
        return objectiveA.localeCompare(objectiveB) || a.description.localeCompare(b.description);
      });
  }, [document, currentObjective.crossLinkedKeyResultIds, currentObjective.id, currentObjective.quarter, currentObjective.year]);
  const progress = objectiveProgressById(document, currentObjective.id);
  const [newKeyResult, setNewKeyResult] = useState<KeyResultFormState>(defaultKeyResultForm);
  const [showNewKeyResultDetails, setShowNewKeyResultDetails] = useState(false);
  const [showLinkManager, setShowLinkManager] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [comment, setComment] = useState("");
  const [objectiveDraft, setObjectiveDraft] = useState(objective.description);
  const [editingObjective, setEditingObjective] = useState(false);
  const [editingKeyResultId, setEditingKeyResultId] = useState<string | null>(null);
  const [keyResultDraft, setKeyResultDraft] = useState("");
  const [editingMetricsId, setEditingMetricsId] = useState<string | null>(null);
  const [metricsDraft, setMetricsDraft] = useState<KeyResultFormState>(defaultKeyResultForm);

  function startObjectiveEdit() {
    setObjectiveDraft(currentObjective.description);
    setEditingObjective(true);
  }

  async function saveObjectiveDescription() {
    const next = objectiveDraft.trim();
    if (!next || next === currentObjective.description) {
      setEditingObjective(false);
      return;
    }
    await updateObjective(currentObjective.id, { description: next });
    setEditingObjective(false);
  }

  function startKeyResultEdit(id: string, currentDescription: string) {
    setEditingKeyResultId(id);
    setKeyResultDraft(currentDescription);
  }

  async function saveKeyResultDescription(id: string, currentDescription: string) {
    const next = keyResultDraft.trim();
    if (!next || next === currentDescription) {
      setEditingKeyResultId(null);
      return;
    }
    await updateKeyResult(id, { description: next });
    setEditingKeyResultId(null);
  }

  function startMetricsEdit(keyResult: KeyResult) {
    setEditingMetricsId(keyResult.id);
    setMetricsDraft(formFromKeyResult(keyResult));
  }

  async function saveMetricsEdit(keyResult: KeyResult) {
    const error = keyResultFormError(metricsDraft, keyResult.currentValue);
    if (error) return;
    const parsed = parseKeyResultForm(metricsDraft, keyResult.currentValue);
    await updateKeyResult(keyResult.id, parsed);
    setEditingMetricsId(null);
  }

  async function submitKeyResult(event: FormEvent) {
    event.preventDefault();
    const error = keyResultFormError(newKeyResult);
    if (error) return;
    await createKeyResult(currentObjective.id, parseKeyResultForm(newKeyResult));
    setNewKeyResult(defaultKeyResultForm);
    setShowNewKeyResultDetails(false);
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    await addComment("objective", currentObjective.id, comment.trim());
    setComment("");
  }

  const normalizedLinkSearch = linkSearch.trim().toLocaleLowerCase();
  const filteredLinkCandidates = normalizedLinkSearch
    ? linkCandidates.filter((keyResult) => {
        const parentObjective = document.objectives[keyResult.objectiveId];
        const haystack = `${keyResult.description} ${parentObjective?.description ?? ""} ${parentObjective ? ownerLabel(document, parentObjective.owner) : ""}`.toLocaleLowerCase();
        return haystack.includes(normalizedLinkSearch);
      })
    : linkCandidates;

  function crossLinkSummary(keyResult: KeyResult): string {
    const parentObjective = document.objectives[keyResult.objectiveId];
    if (!parentObjective) return "";
    return `${parentObjective.description} · ${ownerLabel(document, parentObjective.owner)} · ${progressForValue(keyResult, keyResult.currentValue).toFixed(0)}%`;
  }

  return (
    <article className="objective-card">
      <header className="objective-header">
        <div>
          {editingObjective ? (
            <form className="title-edit-form" onSubmit={(event) => { event.preventDefault(); void saveObjectiveDescription(); }}>
              <Input
                aria-label="Objective-Titel"
                value={objectiveDraft}
                maxLength={255}
                onChange={(_, data) => setObjectiveDraft(data.value)}
                autoFocus
              />
              <Button aria-label="Objective-Titel speichern" icon={<Check size={16} />} type="submit" disabled={!objectiveDraft.trim()} />
              <Button aria-label="Objective-Titel abbrechen" icon={<X size={16} />} type="button" onClick={() => setEditingObjective(false)} />
            </form>
          ) : (
            <div className="editable-title">
              <h3 onDoubleClick={!readonly ? startObjectiveEdit : undefined}>{currentObjective.description}</h3>
              {!readonly && <Button aria-label="Objective-Titel bearbeiten" icon={<Pencil size={16} />} appearance="subtle" onClick={startObjectiveEdit} />}
            </div>
          )}
          <p>{ownerLabel(document, currentObjective.owner)} · {currentObjective.type === "strategic" ? "Strategisch" : "Quartal"}</p>
        </div>
        <div className="objective-header-actions">
          {!readonly && (
            <Button
              aria-label="Querverlinkungen verwalten"
              icon={<Link2 size={16} />}
              appearance={showLinkManager ? "primary" : "subtle"}
              onClick={() => setShowLinkManager((current) => !current)}
            >
              {linkedKeyResults.length}
            </Button>
          )}
          <strong>{progress.toFixed(0)}%</strong>
        </div>
      </header>
      <ProgressBar value={progress / 100} />
      {showLinkManager && !readonly && (
        <section className="cross-link-manager" aria-label="Querverlinkungen">
          <div className="cross-link-column">
            <h4>Verknüpfte Key Results</h4>
            {linkedKeyResults.length === 0 && <p className="empty">Keine Querverlinkungen</p>}
            {linkedKeyResults.map((keyResult) => (
              <div className="cross-link-row" key={keyResult.id}>
                <div>
                  <strong>{keyResult.description}</strong>
                  <span>{crossLinkSummary(keyResult)}</span>
                </div>
                <Button
                  aria-label={`Querverlinkung zu ${keyResult.description} entfernen`}
                  icon={<X size={16} />}
                  appearance="subtle"
                  onClick={() => void toggleCrossLink(currentObjective.id, keyResult.id)}
                />
              </div>
            ))}
          </div>
          <div className="cross-link-column">
            <h4>Key Result verknüpfen</h4>
            <Input
              aria-label="Key Results suchen"
              value={linkSearch}
              onChange={(_, data) => setLinkSearch(data.value)}
              placeholder="Key Result suchen"
            />
            {filteredLinkCandidates.length === 0 && <p className="empty">Keine verknüpfbaren Key Results</p>}
            {filteredLinkCandidates.map((keyResult) => (
              <button
                className="cross-link-candidate"
                type="button"
                key={keyResult.id}
                onClick={() => void toggleCrossLink(currentObjective.id, keyResult.id)}
              >
                <strong>{keyResult.description}</strong>
                <span>{crossLinkSummary(keyResult)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="kr-list">
        {keyResults.map((keyResult) => (
          <div className={editingMetricsId === keyResult.id ? "kr-row editing" : "kr-row"} key={keyResult.id}>
            <div className="kr-main">
              {editingKeyResultId === keyResult.id ? (
                <form className="title-edit-form" onSubmit={(event) => { event.preventDefault(); void saveKeyResultDescription(keyResult.id, keyResult.description); }}>
                  <Input
                    aria-label="Key-Result-Titel"
                    value={keyResultDraft}
                    maxLength={255}
                    onChange={(_, data) => setKeyResultDraft(data.value)}
                    autoFocus
                  />
                  <Button aria-label="Key-Result-Titel speichern" icon={<Check size={16} />} type="submit" disabled={!keyResultDraft.trim()} />
                  <Button aria-label="Key-Result-Titel abbrechen" icon={<X size={16} />} type="button" onClick={() => setEditingKeyResultId(null)} />
                </form>
              ) : (
                <div className="editable-title compact">
                  <strong onDoubleClick={!readonly ? () => startKeyResultEdit(keyResult.id, keyResult.description) : undefined}>{keyResult.description}</strong>
                  {!readonly && (
                    <Button
                      aria-label="Key-Result-Titel bearbeiten"
                      icon={<Pencil size={14} />}
                      appearance="subtle"
                      onClick={() => startKeyResultEdit(keyResult.id, keyResult.description)}
                    />
                  )}
                </div>
              )}
              <span>{keyResult.currentValue} / {keyResult.targetValue} {keyResult.resultType}</span>
              {keyResult.crossLinkedObjectiveIds.length > 0 && <span className="cross-link-badge"><Link2 size={12} /> {keyResult.crossLinkedObjectiveIds.length}</span>}
              {editingMetricsId === keyResult.id && (
                <form className="key-result-details-form" onSubmit={(event) => { event.preventDefault(); void saveMetricsEdit(keyResult); }}>
                  <label>
                    Startwert
                    <Input aria-label="Key-Result-Startwert bearbeiten" value={metricsDraft.startValue} onChange={(_, data) => setMetricsDraft((current) => ({ ...current, startValue: data.value }))} />
                  </label>
                  <label>
                    Zielwert
                    <Input aria-label="Key-Result-Zielwert bearbeiten" value={metricsDraft.targetValue} onChange={(_, data) => setMetricsDraft((current) => ({ ...current, targetValue: data.value }))} />
                  </label>
                  <label>
                    Zieltyp
                    <Input aria-label="Key-Result-Zieltyp bearbeiten" value={metricsDraft.resultType} maxLength={20} placeholder="z.B. %, Mitarbeiter" onChange={(_, data) => setMetricsDraft((current) => ({ ...current, resultType: data.value }))} />
                  </label>
                  <label>
                    Schrittgröße
                    <Input aria-label="Key-Result-Schrittgröße bearbeiten" value={metricsDraft.stepSize} onChange={(_, data) => setMetricsDraft((current) => ({ ...current, stepSize: data.value }))} />
                  </label>
                  <label>
                    Gewichtung
                    <Input aria-label="Key-Result-Gewichtung bearbeiten" value={metricsDraft.weight} onChange={(_, data) => setMetricsDraft((current) => ({ ...current, weight: data.value }))} />
                  </label>
                  {keyResultFormError(metricsDraft, keyResult.currentValue) && <div className="form-error">{keyResultFormError(metricsDraft, keyResult.currentValue)}</div>}
                  <div className="button-row">
                    <Button type="submit" appearance="primary" disabled={Boolean(keyResultFormError(metricsDraft, keyResult.currentValue))}>Speichern</Button>
                    <Button type="button" onClick={() => setEditingMetricsId(null)}>Abbrechen</Button>
                  </div>
                </form>
              )}
            </div>
            <input
              aria-label={keyResult.description}
              type="range"
              min={Math.min(keyResult.startValue, keyResult.targetValue)}
              max={Math.max(keyResult.startValue, keyResult.targetValue)}
              step={keyResult.stepSize}
              value={keyResult.currentValue}
              disabled={readonly}
              onChange={(event) => void updateKeyResultValue(keyResult.id, Number(event.currentTarget.value))}
            />
            {!readonly && (
              <div className="kr-actions">
                <Button aria-label={`Messwerte für ${keyResult.description} bearbeiten`} icon={<Pencil size={16} />} appearance="subtle" onClick={() => startMetricsEdit(keyResult)} />
                <Button aria-label="Key Result löschen" icon={<Trash2 size={16} />} appearance="subtle" onClick={() => void deleteKeyResult(keyResult.id)} />
              </div>
            )}
          </div>
        ))}
      </div>
      {!readonly && (
        <form className={showNewKeyResultDetails ? "key-result-create-form expanded" : "key-result-create-form"} onSubmit={(event) => void submitKeyResult(event)}>
          <Input value={newKeyResult.description} onChange={(_, data) => setNewKeyResult((current) => ({ ...current, description: data.value }))} placeholder="Key Result" maxLength={255} />
          {showNewKeyResultDetails && (
            <div className="key-result-details-grid">
              <label>
                Startwert
                <Input aria-label="Neuer Key-Result-Startwert" value={newKeyResult.startValue} onChange={(_, data) => setNewKeyResult((current) => ({ ...current, startValue: data.value }))} />
              </label>
              <label>
                Zielwert
                <Input aria-label="Neuer Key-Result-Zielwert" value={newKeyResult.targetValue} onChange={(_, data) => setNewKeyResult((current) => ({ ...current, targetValue: data.value }))} />
              </label>
              <label>
                Zieltyp
                <Input aria-label="Neuer Key-Result-Zieltyp" value={newKeyResult.resultType} maxLength={20} placeholder="z.B. %, Mitarbeiter" onChange={(_, data) => setNewKeyResult((current) => ({ ...current, resultType: data.value }))} />
              </label>
              <label>
                Schrittgröße
                <Input aria-label="Neuer Key-Result-Schrittgröße" value={newKeyResult.stepSize} onChange={(_, data) => setNewKeyResult((current) => ({ ...current, stepSize: data.value }))} />
              </label>
              <label>
                Gewichtung
                <Input aria-label="Neuer Key-Result-Gewichtung" value={newKeyResult.weight} onChange={(_, data) => setNewKeyResult((current) => ({ ...current, weight: data.value }))} />
              </label>
            </div>
          )}
          {keyResultFormError(newKeyResult) && newKeyResult.description.trim() && <div className="form-error">{keyResultFormError(newKeyResult)}</div>}
          <Button
            aria-label={showNewKeyResultDetails ? "Key-Result-Details ausblenden" : "Key-Result-Details anzeigen"}
            icon={<Pencil size={16} />}
            type="button"
            onClick={() => setShowNewKeyResultDetails((current) => !current)}
          />
          <Button type="submit" disabled={Boolean(keyResultFormError(newKeyResult))}>+</Button>
          <Button icon={<Trash2 size={16} />} appearance="subtle" onClick={() => void deleteObjective(currentObjective.id)} />
        </form>
      )}
      <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
        <Label><MessageSquare size={14} /> {document.comments ? currentObjective.commentIds.filter((id) => !document.comments[id]?.deletedAt).length : 0}</Label>
        <Textarea value={comment} onChange={(_, data) => setComment(data.value)} placeholder="Kommentar" />
        <Button type="submit" disabled={!comment.trim()}>OK</Button>
      </form>
    </article>
  );
}
