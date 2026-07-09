import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import "../i18n";
import { createKeyResult, createObjective, emptyDocument, ensureParticipant, toggleCrossLink } from "../domain/document";
import { useAppStore } from "../state/appStore";
import { RelationGraph } from "./RelationGraph";

function renderGraph() {
  render(
    <FluentProvider theme={webLightTheme}>
      <RelationGraph />
    </FluentProvider>
  );
}

describe("RelationGraph", () => {
  beforeEach(() => {
    let document = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Ada" });
    document = createObjective(document, "p1", { description: "Source objective", quarter: 3, year: 2026, type: "quarterly", owner: { kind: "participant", id: "p1" } });
    document = createObjective(document, "p1", { description: "Target objective", quarter: 3, year: 2026, type: "quarterly", owner: { kind: "participant", id: "p1" } });
    const [sourceObjectiveId, targetObjectiveId] = Object.keys(document.objectives);
    document = createKeyResult(document, "p1", targetObjectiveId, {
      description: "Linked key result",
      startValue: 0,
      targetValue: 100,
      currentValue: 25,
      stepSize: 1,
      weight: 1,
      resultType: "%"
    });
    const keyResultId = Object.keys(document.keyResults)[0];
    document = toggleCrossLink(document, "p1", sourceObjectiveId, keyResultId);
    useAppStore.setState({
      initialized: true,
      identity: { localId: "p1", displayName: "Ada" },
      document,
      selectedQuarter: { quarter: 3, year: 2026 },
      activeView: "graph",
      selectedOrgUnitId: undefined,
      syncFolder: null
    });
  });

  it("renders a cluster map with cross-links and owner details", () => {
    renderGraph();

    expect(document.querySelector(".graph-link.crossLink")).toBeTruthy();
    expect(screen.getByText("Beziehungslandkarte")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Cluster-Informationen")).getByText(/2 Ziele .* 1 Besitzer .* 1 Cross-Links/)).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.queryByText(/O[0-9a-f-]+ → K[0-9a-f-]+/)).not.toBeInTheDocument();
  });
});
