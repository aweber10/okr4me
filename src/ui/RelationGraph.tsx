import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { graphForQuarter } from "../domain/selectors";
import { useAppStore } from "../state/appStore";

export function RelationGraph() {
  const { t } = useTranslation();
  const document = useAppStore((state) => state.document);
  const selectedQuarter = useAppStore((state) => state.selectedQuarter);
  const graph = useMemo(() => graphForQuarter(document, selectedQuarter), [document, selectedQuarter]);
  const positionedNodes = useMemo(() => graph.nodes.map((node, index) => ({
    ...node,
    x: 8 + (index % 5) * 18,
    y: 12 + Math.floor(index / 5) * 18
  })), [graph.nodes]);
  const nodeById = useMemo(() => new Map(positionedNodes.map((node) => [node.id, node])), [positionedNodes]);
  const drawableLinks = graph.links
    .map((link) => {
      const source = nodeById.get(link.source);
      const target = nodeById.get(link.target);
      if (!source || !target) return null;
      return { ...link, sourceNode: source, targetNode: target };
    })
    .filter((link) => link !== null);

  return (
    <section>
      <div className="section-heading">
        <h1>{t("graph")}</h1>
        <span>{graph.nodes.length} Knoten · {graph.links.length} Kanten</span>
      </div>
      <div className="graph-surface" role="img" aria-label={t("graph")}>
        {graph.nodes.length === 0 && <p className="empty">{t("noData")}</p>}
        <svg className="graph-links" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <marker id="graph-arrow-parent" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" />
            </marker>
            <marker id="graph-arrow-cross" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" />
            </marker>
          </defs>
          {drawableLinks.map((link, index) => (
            <line
              key={`${link.source}-${link.target}-${index}`}
              className={`graph-link ${link.kind}`}
              x1={link.sourceNode.x + 7}
              y1={link.sourceNode.y + 4}
              x2={link.targetNode.x + 6}
              y2={link.targetNode.y + 4}
              markerEnd={link.kind === "crossLink" ? "url(#graph-arrow-cross)" : "url(#graph-arrow-parent)"}
            />
          ))}
        </svg>
        {positionedNodes.map((node) => (
          <div
            key={node.id}
            className={`graph-node ${node.kind}`}
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`
            }}
            title={`${node.label} · ${node.ownerLabel} · ${node.progress.toFixed(0)}%`}
          >
            <strong>{node.kind === "objective" ? "O" : "KR"}</strong>
            <span>{node.label}</span>
          </div>
        ))}
      </div>
      <div className="link-list">
        {drawableLinks.map((link, index) => (
          <span key={`${link.source}-${link.target}-${index}`} className={link.kind}>
            {link.sourceNode.label} → {link.targetNode.label}
          </span>
        ))}
      </div>
    </section>
  );
}
