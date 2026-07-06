import { FormEvent, useMemo, useState } from "react";
import { Button, Input, Label, ProgressBar, Textarea } from "@fluentui/react-components";
import { MessageSquare, Trash2 } from "lucide-react";
import type { Objective } from "../domain/types";
import { keyResultsForObjective, objectiveProgressById, ownerLabel } from "../domain/selectors";
import { useAppStore } from "../state/appStore";

interface Props {
  objective: Objective;
  readonly?: boolean;
}

export function ObjectiveCard({ objective, readonly }: Props) {
  const document = useAppStore((state) => state.document);
  const createKeyResult = useAppStore((state) => state.createKeyResult);
  const updateKeyResultValue = useAppStore((state) => state.updateKeyResultValue);
  const deleteKeyResult = useAppStore((state) => state.deleteKeyResult);
  const deleteObjective = useAppStore((state) => state.deleteObjective);
  const addComment = useAppStore((state) => state.addComment);
  const keyResults = useMemo(() => keyResultsForObjective(document, objective.id), [document, objective.id]);
  const progress = objectiveProgressById(document, objective.id);
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");

  async function submitKeyResult(event: FormEvent) {
    event.preventDefault();
    if (!description.trim()) return;
    await createKeyResult(objective.id, {
      description: description.trim(),
      startValue: 0,
      targetValue: 100,
      currentValue: 0,
      stepSize: 1,
      weight: 1,
      resultType: "%"
    });
    setDescription("");
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    await addComment("objective", objective.id, comment.trim());
    setComment("");
  }

  return (
    <article className="objective-card">
      <header className="objective-header">
        <div>
          <h3>{objective.description}</h3>
          <p>{ownerLabel(document, objective.owner)} · {objective.type === "strategic" ? "Strategisch" : "Quartal"}</p>
        </div>
        <strong>{progress.toFixed(0)}%</strong>
      </header>
      <ProgressBar value={progress / 100} />
      <div className="kr-list">
        {keyResults.map((keyResult) => (
          <div className="kr-row" key={keyResult.id}>
            <div>
              <strong>{keyResult.description}</strong>
              <span>{keyResult.currentValue} / {keyResult.targetValue} {keyResult.resultType}</span>
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
            {!readonly && <Button icon={<Trash2 size={16} />} appearance="subtle" onClick={() => void deleteKeyResult(keyResult.id)} />}
          </div>
        ))}
      </div>
      {!readonly && (
        <form className="inline-form" onSubmit={(event) => void submitKeyResult(event)}>
          <Input value={description} onChange={(_, data) => setDescription(data.value)} placeholder="Key Result" />
          <Button type="submit">+</Button>
          <Button icon={<Trash2 size={16} />} appearance="subtle" onClick={() => void deleteObjective(objective.id)} />
        </form>
      )}
      <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
        <Label><MessageSquare size={14} /> {document.comments ? objective.commentIds.filter((id) => !document.comments[id]?.deletedAt).length : 0}</Label>
        <Textarea value={comment} onChange={(_, data) => setComment(data.value)} placeholder="Kommentar" />
        <Button type="submit" disabled={!comment.trim()}>OK</Button>
      </form>
    </article>
  );
}
