import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { graphForQuarter } from "../domain/selectors";
import { useAppStore } from "../state/appStore";

export function RelationGraph() {
  const { t } = useTranslation();
  const document = useAppStore((state) => state.document);
  const selectedQuarter = useAppStore((state) => state.selectedQuarter);
  const graph = useMemo(() => graphForQuarter(document, selectedQuarter), [document, selectedQuarter]);

  return (
    <section>
      <div className="section-heading">
        <h1>{t("graph")}</h1>
        <span>{graph.nodes.length} Knoten · {graph.links.length} Kanten</span>
      </div>
      <div className="graph-surface" role="img" aria-label={t("graph")}>
        {graph.nodes.length === 0 && <p className="empty">{t("noData")}</p>}
        {graph.nodes.map((node, index) => (
          <div
            key={node.id}
            className={`graph-node ${node.kind}`}
            style={{
              left: `${8 + (index % 5) * 18}%`,
              top: `${12 + Math.floor(index / 5) * 18}%`
            }}
            title={`${node.label} · ${node.ownerLabel} · ${node.progress.toFixed(0)}%`}
          >
            <strong>{node.kind === "objective" ? "O" : "KR"}</strong>
            <span>{node.label}</span>
          </div>
        ))}
      </div>
      <div className="link-list">
        {graph.links.map((link, index) => (
          <span key={`${link.source}-${link.target}-${index}`} className={link.kind}>{link.source} → {link.target}</span>
        ))}
      </div>
    </section>
  );
}
