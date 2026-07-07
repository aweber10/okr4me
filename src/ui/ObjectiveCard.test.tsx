import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import "../i18n";
import { createKeyResult, createObjective, emptyDocument, ensureParticipant } from "../domain/document";
import { currentQuarter } from "../domain/quarters";
import { useAppStore } from "../state/appStore";
import { ObjectiveCard } from "./ObjectiveCard";

function setupDocument() {
  let document = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Ada" });
  const quarter = currentQuarter();
  document = createObjective(document, "p1", {
    description: "Old objective",
    quarter: quarter.quarter,
    year: quarter.year,
    type: "quarterly",
    owner: { kind: "participant", id: "p1" }
  });
  const objectiveId = Object.keys(document.objectives)[0];
  document = createKeyResult(document, "p1", objectiveId, {
    description: "Old key result",
    startValue: 0,
    targetValue: 100,
    currentValue: 0,
    stepSize: 1,
    weight: 1,
    resultType: "%"
  });
  return { document, objectiveId };
}

function renderCard(objectiveId: string) {
  const objective = useAppStore.getState().document.objectives[objectiveId];
  render(
    <FluentProvider theme={webLightTheme}>
      <ObjectiveCard objective={objective} />
    </FluentProvider>
  );
}

describe("ObjectiveCard title editing", () => {
  beforeEach(() => {
    localStorage.clear();
    const { document } = setupDocument();
    useAppStore.setState({
      initialized: true,
      identity: { localId: "p1", displayName: "Ada" },
      document,
      selectedQuarter: currentQuarter(),
      activeView: "goals",
      selectedOrgUnitId: undefined,
      syncFolder: null
    });
  });

  it("edits objective and key result titles", async () => {
    const objectiveId = Object.keys(useAppStore.getState().document.objectives)[0];
    renderCard(objectiveId);

    await userEvent.click(screen.getByRole("button", { name: "Objective-Titel bearbeiten" }));
    const objectiveInput = screen.getByLabelText("Objective-Titel");
    await userEvent.clear(objectiveInput);
    await userEvent.type(objectiveInput, "New objective");
    await userEvent.click(screen.getByRole("button", { name: "Objective-Titel speichern" }));
    await waitFor(() => expect(useAppStore.getState().document.objectives[objectiveId].description).toBe("New objective"));

    await userEvent.click(screen.getByRole("button", { name: "Key-Result-Titel bearbeiten" }));
    const keyResultInput = screen.getByLabelText("Key-Result-Titel");
    await userEvent.clear(keyResultInput);
    await userEvent.type(keyResultInput, "New key result");
    await userEvent.click(screen.getByRole("button", { name: "Key-Result-Titel speichern" }));
    const keyResultId = Object.keys(useAppStore.getState().document.keyResults)[0];
    await waitFor(() => expect(useAppStore.getState().document.keyResults[keyResultId].description).toBe("New key result"));
  });

  it("creates and edits key result measurement fields", async () => {
    const objectiveId = Object.keys(useAppStore.getState().document.objectives)[0];
    renderCard(objectiveId);

    expect(screen.queryByLabelText("Neuer Key-Result-Startwert")).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Key Result"), "Default KR");
    await userEvent.click(screen.getByRole("button", { name: "+" }));
    const defaultKr = Object.values(useAppStore.getState().document.keyResults).find((keyResult) => keyResult.description === "Default KR")!;
    await waitFor(() => expect(defaultKr).toBeTruthy());
    expect(defaultKr.startValue).toBe(0);
    expect(defaultKr.targetValue).toBe(100);
    expect(defaultKr.stepSize).toBe(1);
    expect(defaultKr.weight).toBe(1);
    expect(defaultKr.resultType).toBe("");

    await userEvent.click(screen.getByRole("button", { name: "Key-Result-Details anzeigen" }));
    await userEvent.type(screen.getByPlaceholderText("Key Result"), "Measured KR");
    await userEvent.clear(screen.getByLabelText("Neuer Key-Result-Startwert"));
    await userEvent.type(screen.getByLabelText("Neuer Key-Result-Startwert"), "10");
    await userEvent.clear(screen.getByLabelText("Neuer Key-Result-Zielwert"));
    await userEvent.type(screen.getByLabelText("Neuer Key-Result-Zielwert"), "50");
    await userEvent.type(screen.getByLabelText("Neuer Key-Result-Zieltyp"), "Stück");
    await userEvent.click(screen.getByRole("button", { name: "+" }));

    const created = Object.values(useAppStore.getState().document.keyResults).find((keyResult) => keyResult.description === "Measured KR")!;
    await waitFor(() => expect(created).toBeTruthy());
    expect(created.startValue).toBe(10);
    expect(created.targetValue).toBe(50);
    expect(created.currentValue).toBe(10);
    expect(created.stepSize).toBe(1);
    expect(created.weight).toBe(1);
    expect(created.resultType).toBe("Stück");

    await userEvent.click(await screen.findByRole("button", { name: "Messwerte für Measured KR bearbeiten" }));
    await userEvent.clear(screen.getByLabelText("Key-Result-Zieltyp bearbeiten"));
    await userEvent.type(screen.getByLabelText("Key-Result-Zieltyp bearbeiten"), "Punkte");
    await userEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(useAppStore.getState().document.keyResults[created.id].resultType).toBe("Punkte"));
  }, 10000);

  it("adds and removes cross-links to foreign key results", async () => {
    const quarter = currentQuarter();
    let document = useAppStore.getState().document;
    const objectiveId = Object.keys(document.objectives)[0];
    document = createObjective(document, "p1", {
      description: "Other objective",
      quarter: quarter.quarter,
      year: quarter.year,
      type: "quarterly",
      owner: { kind: "participant", id: "p1" }
    });
    const otherObjectiveId = Object.keys(document.objectives).find((id) => id !== objectiveId)!;
    document = createKeyResult(document, "p1", otherObjectiveId, {
      description: "Foreign key result",
      startValue: 0,
      targetValue: 100,
      currentValue: 40,
      stepSize: 1,
      weight: 1,
      resultType: "%"
    });
    const foreignKeyResultId = Object.values(document.keyResults).find((keyResult) => keyResult.description === "Foreign key result")!.id;
    useAppStore.setState({ document });

    renderCard(objectiveId);

    await userEvent.click(screen.getByRole("button", { name: "Querverlinkungen verwalten" }));
    const linkManager = screen.getByRole("region", { name: "Querverlinkungen" });
    expect(within(linkManager).queryByRole("button", { name: /Old key result/ })).not.toBeInTheDocument();

    await userEvent.click(within(linkManager).getByRole("button", { name: /Foreign key result/ }));
    await waitFor(() => expect(useAppStore.getState().document.objectives[objectiveId].crossLinkedKeyResultIds).toContain(foreignKeyResultId));
    expect(useAppStore.getState().document.keyResults[foreignKeyResultId].crossLinkedObjectiveIds).toContain(objectiveId);

    await userEvent.click(screen.getByRole("button", { name: "Querverlinkung zu Foreign key result entfernen" }));
    await waitFor(() => expect(useAppStore.getState().document.objectives[objectiveId].crossLinkedKeyResultIds).not.toContain(foreignKeyResultId));
    expect(useAppStore.getState().document.keyResults[foreignKeyResultId].crossLinkedObjectiveIds).not.toContain(objectiveId);
  });
});
