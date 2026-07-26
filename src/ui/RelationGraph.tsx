import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@fluentui/react-components";
import { LocateFixed, ZoomIn, ZoomOut } from "lucide-react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import { useTranslation } from "react-i18next";
import { graphForQuarter } from "../domain/selectors";
import type { GraphLink, GraphNode } from "../domain/types";
import { useAppStore } from "../state/appStore";

const WIDTH = 1000;
const HEIGHT = 620;

type PositionedNode = GraphNode & SimulationNodeDatum & {
  radius: number;
  shortLabel: string;
  crossLinkCount: number;
};

type DrawableLink = GraphLink & {
  sourceNode: PositionedNode;
  targetNode: PositionedNode;
};

function shortLabel(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.slice(0, 3).join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildClusterSummaries(nodes: PositionedNode[], links: DrawableLink[]) {
  const objectiveIds = nodes.filter((node) => node.kind === "objective").map((node) => node.id);
  const parentObjectiveByKeyResult = new Map(links.filter((link) => link.kind === "parent").map((link) => [link.target, link.source]));
  const neighbors = new Map(objectiveIds.map((id) => [id, new Set<string>()]));
  let crossLinks = 0;

  for (const link of links.filter((item) => item.kind === "crossLink")) {
    const targetObjective = parentObjectiveByKeyResult.get(link.target);
    if (!targetObjective || targetObjective === link.source) continue;
    neighbors.get(link.source)?.add(targetObjective);
    neighbors.get(targetObjective)?.add(link.source);
    crossLinks += 1;
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const summaries: Array<{ id: string; objectives: number; owners: number; crossLinks: number }> = [];

  for (const objectiveId of objectiveIds) {
    if (seen.has(objectiveId)) continue;
    const stack = [objectiveId];
    const component = new Set<string>();
    seen.add(objectiveId);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.add(current);
      for (const next of neighbors.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    const componentLinks = [...component].reduce((count, id) => count + [...(neighbors.get(id) ?? [])].filter((next) => component.has(next)).length, 0) / 2;
    if (component.size > 1 || componentLinks > 0) {
      summaries.push({
        id: objectiveId,
        objectives: component.size,
        owners: new Set([...component].map((id) => nodeById.get(id)?.ownerLabel).filter(Boolean)).size,
        crossLinks: componentLinks
      });
    }
  }

  return {
    summaries: summaries.sort((a, b) => b.crossLinks - a.crossLinks || b.objectives - a.objectives).slice(0, 6),
    crossLinks
  };
}

export function RelationGraph() {
  const { t } = useTranslation();
  const document = useAppStore((state) => state.document);
  const selectedQuarter = useAppStore((state) => state.selectedQuarter);
  const graph = useMemo(() => graphForQuarter(document, selectedQuarter), [document, selectedQuarter]);
  const [positionedNodes, setPositionedNodes] = useState<PositionedNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [drag, setDrag] = useState<{
    pointerId: number;
    primaryId: string;
    lastX: number;
    lastY: number;
    memberIds: string[];
  } | null>(null);
  const [panStart, setPanStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const graphKey = useMemo(() => `${graph.nodes.map((node) => node.id).join("|")}::${graph.links.map((link) => `${link.source}-${link.target}-${link.kind}`).join("|")}`, [graph]);

  // Direkte Key Results je Objective (nur parent-Kanten), fuer die lokale
  // Gruppenbewegung beim Ziehen eines Objectives.
  const keyResultsByObjective = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const link of graph.links) {
      if (link.kind !== "parent") continue;
      const list = map.get(link.source) ?? [];
      list.push(link.target);
      map.set(link.source, list);
    }
    return map;
  }, [graph.links]);

  useEffect(() => {
    const crossLinkCounts = new Map<string, number>();
    for (const link of graph.links.filter((item) => item.kind === "crossLink")) {
      crossLinkCounts.set(link.source, (crossLinkCounts.get(link.source) ?? 0) + 1);
      crossLinkCounts.set(link.target, (crossLinkCounts.get(link.target) ?? 0) + 1);
    }

    // Ordne jeden Key Result seinem Eltern-Objective zu (parent-Kante),
    // damit KRs gezielt an ihrem eigenen Objective clustern koennen.
    const parentByKeyResult = new Map<string, string>();
    for (const link of graph.links.filter((item) => item.kind === "parent")) {
      parentByKeyResult.set(link.target, link.source);
    }

    // Verteile die Objectives auf einem Ring; Key Results starten dicht bei
    // ihrem Objective, damit die Simulation nicht in Layouts faellt, in denen
    // KRs zwischen fremden Objectives haengenbleiben.
    const objectiveNodes = graph.nodes.filter((node) => node.kind === "objective");
    const objectiveAngle = new Map<string, number>();
    objectiveNodes.forEach((node, index) => {
      objectiveAngle.set(node.id, (index / Math.max(1, objectiveNodes.length)) * Math.PI * 2);
    });

    const nodes: PositionedNode[] = graph.nodes.map((node) => {
      const radius = node.kind === "objective" ? 34 + Math.min(10, (crossLinkCounts.get(node.id) ?? 0) * 3) : 12;
      let angle: number;
      let ring: number;
      if (node.kind === "objective") {
        angle = objectiveAngle.get(node.id) ?? 0;
        ring = 210;
      } else {
        const parentId = parentByKeyResult.get(node.id);
        angle = (parentId ? objectiveAngle.get(parentId) : undefined) ?? Math.random() * Math.PI * 2;
        // leichter Winkelversatz, damit mehrere KRs eines Objectives nicht exakt uebereinander starten
        angle += (Math.random() - 0.5) * 0.4;
        ring = 210 + 46;
      }
      return {
        ...node,
        radius,
        shortLabel: shortLabel(node.label),
        crossLinkCount: crossLinkCounts.get(node.id) ?? 0,
        x: WIDTH / 2 + Math.cos(angle) * ring,
        y: HEIGHT / 2 + Math.sin(angle) * ring
      };
    });

    const nodeIndexById = new Map(nodes.map((node) => [node.id, node]));

    // Zielposition eines Key Results = aktuelle Position seines Objectives.
    // Ueber forceX/forceY zieht es KRs bevorzugt zu ihrem eigenen Objective.
    // Objectives selbst werden nur locker zur Mitte gezogen.
    function clusterTarget(node: PositionedNode, axis: "x" | "y"): number {
      const center = (axis === "x" ? WIDTH : HEIGHT) / 2;
      if (node.kind !== "keyResult") return center;
      const parentId = parentByKeyResult.get(node.id);
      const parent = parentId ? nodeIndexById.get(parentId) : undefined;
      if (!parent) return center;
      return (axis === "x" ? parent.x : parent.y) ?? center;
    }

    const simulationLinks = graph.links.map((link) => ({ ...link }));
    forceSimulation(nodes)
      .force("link", forceLink<PositionedNode, GraphLink>(simulationLinks).id((node) => node.id).distance((link) => link.kind === "crossLink" ? 150 : 46).strength((link) => link.kind === "crossLink" ? 0.25 : 0.9))
      .force("charge", forceManyBody<PositionedNode>().strength((node) => node.kind === "objective" ? -520 : -150))
      .force("collide", forceCollide<PositionedNode>().radius((node) => node.radius + 14).strength(1))
      // Cluster-Bindung: KRs werden zu ihrem eigenen Objective gezogen,
      // Objectives bleiben locker zentriert.
      .force("x", forceX<PositionedNode>((node) => clusterTarget(node, "x")).strength((node) => node.kind === "keyResult" ? 0.35 : 0.04))
      .force("y", forceY<PositionedNode>((node) => clusterTarget(node, "y")).strength((node) => node.kind === "keyResult" ? 0.35 : 0.04))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .stop()
      .tick(420);

    setPositionedNodes(nodes.map((node) => ({
      ...node,
      x: clamp(node.x ?? WIDTH / 2, 48, WIDTH - 48),
      y: clamp(node.y ?? HEIGHT / 2, 48, HEIGHT - 48)
    })));
    setSelectedNodeId((current) => current && graph.nodes.some((node) => node.id === current) ? current : null);
  }, [graphKey, graph.links, graph.nodes]);

  const nodeById = useMemo(() => new Map(positionedNodes.map((node) => [node.id, node])), [positionedNodes]);
  const drawableLinks = useMemo(() => graph.links
    .map((link) => {
      const source = nodeById.get(link.source);
      const target = nodeById.get(link.target);
      if (!source || !target) return null;
      return { ...link, sourceNode: source, targetNode: target };
    })
    .filter((link): link is DrawableLink => link !== null)
    // Parent-Links zuerst, Cross-Links darueber zeichnen, damit die
    // auffaelligen Beziehungslinien nicht von Struktur-Kanten verdeckt werden.
    .sort((a, b) => (a.kind === "crossLink" ? 1 : 0) - (b.kind === "crossLink" ? 1 : 0)), [graph.links, nodeById]);
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;
  const selectedLinks = selectedNode ? drawableLinks.filter((link) => link.source === selectedNode.id || link.target === selectedNode.id) : [];
  const owners = useMemo(() => {
    const uniqueOwners = new Map<string, PositionedNode>();
    for (const node of positionedNodes.filter((item) => item.kind === "objective")) uniqueOwners.set(`${node.ownerKind}:${node.ownerId}`, node);
    return [...uniqueOwners.values()].sort((a, b) => a.ownerLabel.localeCompare(b.ownerLabel));
  }, [positionedNodes]);
  const clusterInfo = useMemo(() => buildClusterSummaries(positionedNodes, drawableLinks), [positionedNodes, drawableLinks]);

  function svgPoint(event: React.PointerEvent<SVGSVGElement> | React.PointerEvent<SVGGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: WIDTH / 2, y: HEIGHT / 2 };
    const viewX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const viewY = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    return {
      x: (viewX - transform.x) / transform.k,
      y: (viewY - transform.y) / transform.k
    };
  }

  function zoomBy(delta: number) {
    setTransform((current) => ({ ...current, k: clamp(current.k + delta, 0.55, 2.4) }));
  }

  return (
    <section>
      <div className="section-heading graph-heading">
        <div>
          <h1>Beziehungslandkarte</h1>
          <span>{graph.nodes.filter((node) => node.kind === "objective").length} Ziele · {clusterInfo.crossLinks} Cross-Links · {graph.links.length} Kanten</span>
        </div>
        <div className="graph-toolbar">
          <Button icon={<ZoomOut size={16} />} aria-label="Verkleinern" onClick={() => zoomBy(-0.15)} />
          <Button icon={<LocateFixed size={16} />} aria-label="Ansicht zurücksetzen" onClick={() => setTransform({ x: 0, y: 0, k: 1 })} />
          <Button icon={<ZoomIn size={16} />} aria-label="Vergrößern" onClick={() => zoomBy(0.15)} />
        </div>
      </div>
      <div className="cluster-map-layout">
        <div className="graph-surface cluster-map" role="img" aria-label={t("graph")}>
          {graph.nodes.length === 0 && <p className="empty">{t("noData")}</p>}
          <svg
            ref={svgRef}
            className="cluster-map-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            onWheel={(event) => {
              event.preventDefault();
              zoomBy(event.deltaY > 0 ? -0.08 : 0.08);
            }}
            onPointerDown={(event) => {
              if (event.target !== event.currentTarget) return;
              setPanStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: transform.x, originY: transform.y });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (drag?.pointerId === event.pointerId) {
                const point = svgPoint(event);
                if (Number.isNaN(point.x) || Number.isNaN(point.y)) return;
                setPositionedNodes((nodes) => {
                  const members = new Set(drag.memberIds);
                  // Rohes Delta seit dem letzten Move.
                  let dx = point.x - drag.lastX;
                  let dy = point.y - drag.lastY;
                  // Delta so begrenzen, dass die gesamte Gruppe im Zeichenbereich bleibt.
                  for (const node of nodes) {
                    if (!members.has(node.id)) continue;
                    const nx = node.x ?? WIDTH / 2;
                    const ny = node.y ?? HEIGHT / 2;
                    dx = clamp(dx, 36 - nx, WIDTH - 36 - nx);
                    dy = clamp(dy, 36 - ny, HEIGHT - 36 - ny);
                  }
                  return nodes.map((node) => members.has(node.id)
                    ? { ...node, x: (node.x ?? WIDTH / 2) + dx, y: (node.y ?? HEIGHT / 2) + dy }
                    : node);
                });
                setDrag((current) => current ? { ...current, lastX: point.x, lastY: point.y } : current);
                return;
              }
              if (panStart?.pointerId === event.pointerId) {
                const rect = svgRef.current?.getBoundingClientRect();
                const scaleX = rect ? WIDTH / rect.width : 1;
                const scaleY = rect ? HEIGHT / rect.height : 1;
                setTransform((current) => ({
                  ...current,
                  x: panStart.originX + (event.clientX - panStart.x) * scaleX,
                  y: panStart.originY + (event.clientY - panStart.y) * scaleY
                }));
              }
            }}
            onPointerUp={(event) => {
              if (drag?.pointerId === event.pointerId) setDrag(null);
              if (panStart?.pointerId === event.pointerId) setPanStart(null);
            }}
            onPointerCancel={() => {
              setDrag(null);
              setPanStart(null);
            }}
          >
            <defs>
              <marker id="cluster-arrow-cross" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" />
              </marker>
            </defs>
            <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
              {drawableLinks.map((link, index) => {
                const connectedToSelection = selectedNodeId != null && (link.source === selectedNodeId || link.target === selectedNodeId);
                return (
                  <line
                    key={`${link.source}-${link.target}-${index}`}
                    className={`graph-link ${link.kind}${connectedToSelection ? " highlighted" : ""}`}
                    x1={link.sourceNode.x}
                    y1={link.sourceNode.y}
                    x2={link.targetNode.x}
                    y2={link.targetNode.y}
                    markerEnd={link.kind === "crossLink" ? "url(#cluster-arrow-cross)" : undefined}
                  />
                );
              })}
              {positionedNodes.map((node) => (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  className={`cluster-node ${node.kind} ${selectedNodeId === node.id ? "selected" : ""}`}
                  transform={`translate(${node.x} ${node.y})`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    // Objective zieht seine direkten KRs als starre Gruppe mit;
                    // ein KR bewegt sich einzeln. Fremde Cluster bleiben stehen.
                    const memberIds = node.kind === "objective"
                      ? [node.id, ...(keyResultsByObjective.get(node.id) ?? [])]
                      : [node.id];
                    const point = svgPoint(event);
                    setDrag({ pointerId: event.pointerId, primaryId: node.id, lastX: point.x, lastY: point.y, memberIds });
                    setSelectedNodeId(node.id);
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <title>{`${node.label} · ${node.ownerLabel} · ${node.progress.toFixed(0)}%`}</title>
                  <circle r={node.radius} fill={node.ownerColor} />
                  {node.kind === "objective" ? (
                    <>
                      <text className="node-type" y={-5}>O</text>
                      <text className="node-label" y={12}>{node.shortLabel}</text>
                    </>
                  ) : (
                    <text className="node-type" y={4}>KR</text>
                  )}
                </g>
              ))}
            </g>
          </svg>
        </div>
        <aside className="cluster-sidebar" aria-label="Cluster-Informationen">
          <div className="cluster-panel">
            <h2>Cluster</h2>
            {clusterInfo.summaries.length === 0 ? (
              <p className="empty">Noch keine teamübergreifenden Cluster sichtbar.</p>
            ) : clusterInfo.summaries.map((summary, index) => (
              <div key={summary.id} className="cluster-summary">
                <strong>Cluster {index + 1}</strong>
                <span>{summary.objectives} Ziele · {summary.owners} Besitzer · {summary.crossLinks} Cross-Links</span>
              </div>
            ))}
          </div>
          <div className="cluster-panel">
            <h2>Farben</h2>
            <div className="owner-legend">
              {owners.map((owner) => (
                <span key={`${owner.ownerKind}:${owner.ownerId}`}>
                  <i style={{ background: owner.ownerColor }} />
                  {owner.ownerLabel}
                </span>
              ))}
            </div>
          </div>
          <div className="cluster-panel detail-panel">
            <h2>Auswahl</h2>
            {selectedNode ? (
              <>
                <strong>{selectedNode.label}</strong>
                <span>{selectedNode.kind === "objective" ? "Objective" : "Key Result"} · {selectedNode.ownerLabel} · {selectedNode.progress.toFixed(0)}%</span>
                <span>{selectedLinks.length} sichtbare Beziehungen</span>
              </>
            ) : (
              <p className="empty">Knoten anklicken für Details.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
