import { FormEvent, useMemo, useState } from "react";
import { Button, Input, Label, Textarea } from "@fluentui/react-components";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../state/appStore";
import { isPastQuarter } from "../domain/quarters";
import { objectivesForOrgUnit } from "../domain/selectors";
import { ObjectiveCard } from "./ObjectiveCard";
import type { OrgUnit } from "../domain/types";

interface OrgTreeNode {
  unit: OrgUnit;
  children: OrgTreeNode[];
}

function buildOrgTree(units: OrgUnit[]): OrgTreeNode[] {
  const nodes = new Map(units.map((unit) => [unit.id, { unit, children: [] as OrgTreeNode[] }]));
  const roots: OrgTreeNode[] = [];
  for (const unit of units) {
    const node = nodes.get(unit.id)!;
    if (unit.parentId && nodes.has(unit.parentId)) {
      nodes.get(unit.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (items: OrgTreeNode[]) => {
    items.sort((a, b) => a.unit.name.localeCompare(b.unit.name));
    items.forEach((item) => sortNodes(item.children));
  };
  sortNodes(roots);
  return roots;
}

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

export function OrgBrowser() {
  const { t } = useTranslation();
  const identity = useAppStore((state) => state.identity);
  const document = useAppStore((state) => state.document);
  const selectedQuarter = useAppStore((state) => state.selectedQuarter);
  const selectedOrgUnitId = useAppStore((state) => state.selectedOrgUnitId);
  const selectOrgUnit = useAppStore((state) => state.selectOrgUnit);
  const createOrgUnit = useAppStore((state) => state.createOrgUnit);
  const updateOrgUnit = useAppStore((state) => state.updateOrgUnit);
  const deleteOrgUnit = useAppStore((state) => state.deleteOrgUnit);
  const createObjective = useAppStore((state) => state.createObjective);
  const [rootName, setRootName] = useState("");
  const [childName, setChildName] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("#0f6cbd");
  const [editing, setEditing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const [objectiveDescription, setObjectiveDescription] = useState("");
  const participant = identity ? document.participants[identity.localId] : undefined;
  const isCoordinator = identity ? document.coordinatorIds.includes(identity.localId) : false;
  const units = useMemo(() => Object.values(document.orgUnits).filter((unit) => !unit.deletedAt), [document.orgUnits]);
  const tree = useMemo(() => buildOrgTree(units), [units]);
  const currentOrgUnitId = selectedOrgUnitId ?? participant?.orgUnitId ?? units[0]?.id;
  const currentUnit = units.find((unit) => unit.id === currentOrgUnitId);
  const currentPath = orgPath(units, currentOrgUnitId);
  const hasChildren = currentOrgUnitId ? units.some((unit) => unit.parentId === currentOrgUnitId) : false;
  const objectives = useMemo(() => currentOrgUnitId ? objectivesForOrgUnit(document, currentOrgUnitId, selectedQuarter) : [], [document, currentOrgUnitId, selectedQuarter]);
  const readonly = isPastQuarter(selectedQuarter);

  async function submitRoot(event: FormEvent) {
    event.preventDefault();
    if (!rootName.trim()) return;
    const id = await createOrgUnit({ name: rootName.trim(), description: "", color: "#0f6cbd" });
    setExpandedIds((current) => new Set(current).add(id));
    setRootName("");
    setMessage("");
  }

  async function submitChild(event: FormEvent) {
    event.preventDefault();
    if (!childName.trim() || !currentOrgUnitId) return;
    const id = await createOrgUnit({ name: childName.trim(), description: "", color: "#0f6cbd", parentId: currentOrgUnitId });
    setExpandedIds((current) => new Set(current).add(currentOrgUnitId).add(id));
    setChildName("");
    setMessage("");
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!currentOrgUnitId || !editName.trim()) return;
    await updateOrgUnit(currentOrgUnitId, { name: editName.trim(), description: editDescription, color: editColor });
    setEditing(false);
    setMessage("");
  }

  function startEdit() {
    if (!currentUnit) return;
    setEditName(currentUnit.name);
    setEditDescription(currentUnit.description);
    setEditColor(currentUnit.color);
    setEditing(true);
    setMessage("");
  }

  async function removeSelectedUnit() {
    if (!currentOrgUnitId) return;
    if (hasChildren) {
      setMessage("Nur Organisationseinheiten ohne Untereinheiten können gelöscht werden.");
      return;
    }
    await deleteOrgUnit(currentOrgUnitId);
    selectOrgUnit(units.find((unit) => unit.id !== currentOrgUnitId)?.id);
    setMessage("");
  }

  async function submitObjective(event: FormEvent) {
    event.preventDefault();
    if (!objectiveDescription.trim() || !currentOrgUnitId) return;
    await createObjective({ description: objectiveDescription.trim(), type: "quarterly", owner: { kind: "orgUnit", id: currentOrgUnitId } });
    setObjectiveDescription("");
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(node: OrgTreeNode, level: number) {
    const isExpanded = expandedIds.has(node.unit.id);
    const hasNodeChildren = node.children.length > 0;
    return (
      <div key={node.unit.id}>
        <button
          className={node.unit.id === currentOrgUnitId ? "tree-node active" : "tree-node"}
          style={{ borderLeftColor: node.unit.color, paddingLeft: `${12 + level * 18}px` }}
          onClick={() => selectOrgUnit(node.unit.id)}
          title={node.unit.description || node.unit.name}
        >
          <span className="tree-toggle" onClick={(event) => { event.stopPropagation(); if (hasNodeChildren) toggleExpanded(node.unit.id); }}>
            {hasNodeChildren ? (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <span className="tree-spacer" />}
          </span>
          <span className="tree-label">{node.unit.name}</span>
        </button>
        {hasNodeChildren && isExpanded && (
          <div className="tree-children">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="org-layout">
      <div className="org-tree section-not-printable">
        <h2>{t("organization")}</h2>
        <div className="tree-list">
          {tree.map((node) => renderNode(node, 0))}
          {tree.length === 0 && <p className="empty">Noch keine Organisationseinheiten</p>}
        </div>
        {isCoordinator && (
          <div className="org-actions">
            <form className="stack-form" onSubmit={(event) => void submitRoot(event)}>
              <Label>Root anlegen</Label>
              <div className="compact-row">
                <Input value={rootName} onChange={(_, data) => setRootName(data.value)} placeholder="Organisationseinheit" />
                <Button aria-label="Root anlegen" icon={<Plus size={16} />} type="submit" disabled={!rootName.trim()} />
              </div>
            </form>
            <form className="stack-form" onSubmit={(event) => void submitChild(event)}>
              <Label>Untereinheit zu {currentUnit?.name ?? "Auswahl"}</Label>
              <div className="compact-row">
                <Input value={childName} onChange={(_, data) => setChildName(data.value)} placeholder="Untereinheit" disabled={!currentOrgUnitId} />
                <Button aria-label="Untereinheit anlegen" icon={<Plus size={16} />} type="submit" disabled={!childName.trim() || !currentOrgUnitId} />
              </div>
            </form>
            {currentUnit && (
              <div className="button-row">
                <Button icon={<Pencil size={16} />} onClick={startEdit}>Bearbeiten</Button>
                <Button icon={<Trash2 size={16} />} onClick={() => void removeSelectedUnit()} disabled={hasChildren}>{t("delete")}</Button>
              </div>
            )}
            {message && <div className="inline-warning">{message}</div>}
          </div>
        )}
      </div>
      <div>
        <div className="section-heading">
          <div>
            <h1>{currentUnit?.name ?? t("org")}</h1>
            {currentPath && <p className="subtle">{currentPath}</p>}
          </div>
        </div>
        {editing && currentUnit && (
          <form className="edit-unit-form section-not-printable" onSubmit={(event) => void submitEdit(event)}>
            <Input value={editName} onChange={(_, data) => setEditName(data.value)} placeholder="Name" />
            <input className="color-input" type="color" value={editColor} onChange={(event) => setEditColor(event.currentTarget.value)} aria-label="Farbe" />
            <Textarea value={editDescription} onChange={(_, data) => setEditDescription(data.value)} placeholder="Beschreibung" />
            <Button appearance="primary" type="submit" disabled={!editName.trim()}>{t("save")}</Button>
            <Button type="button" onClick={() => setEditing(false)}>Abbrechen</Button>
          </form>
        )}
        {!readonly && currentOrgUnitId && (
          <form className="create-objective org-objective-form section-not-printable" onSubmit={(event) => void submitObjective(event)}>
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
