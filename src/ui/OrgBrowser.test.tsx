import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import "../i18n";
import { emptyDocument, ensureParticipant } from "../domain/document";
import { currentQuarter } from "../domain/quarters";
import { useAppStore } from "../state/appStore";
import { OrgBrowser } from "./OrgBrowser";

function renderOrgBrowser() {
  render(
    <FluentProvider theme={webLightTheme}>
      <OrgBrowser />
    </FluentProvider>
  );
}

describe("OrgBrowser", () => {
  beforeEach(() => {
    localStorage.clear();
    const document = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Ada" });
    useAppStore.setState({
      initialized: true,
      identity: { localId: "p1", displayName: "Ada" },
      document,
      selectedQuarter: currentQuarter(),
      activeView: "org",
      selectedOrgUnitId: undefined,
      syncFolder: null
    });
  });

  it("creates and selects a root org unit", async () => {
    renderOrgBrowser();

    await userEvent.type(screen.getByPlaceholderText("Organisationseinheit"), "onsite");
    await userEvent.click(screen.getByRole("button", { name: "Root anlegen" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "onsite" })).toBeInTheDocument());
    const units = Object.values(useAppStore.getState().document.orgUnits);
    expect(units).toHaveLength(1);
    expect(units[0].name).toBe("onsite");
    expect(units[0].parentId).toBeUndefined();
  });

  it("creates a child org unit under the selected unit and renders the hierarchy path", async () => {
    renderOrgBrowser();

    await userEvent.type(screen.getByPlaceholderText("Organisationseinheit"), "onsite");
    await userEvent.click(screen.getByRole("button", { name: "Root anlegen" }));
    await userEvent.type(await screen.findByPlaceholderText("Untereinheit"), "Industry Solutions");
    await userEvent.click(screen.getByRole("button", { name: "Untereinheit anlegen" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Industry Solutions" })).toBeInTheDocument());
    expect(screen.getByText("onsite / Industry Solutions")).toBeInTheDocument();
    const units = Object.values(useAppStore.getState().document.orgUnits);
    const root = units.find((unit) => unit.name === "onsite")!;
    const child = units.find((unit) => unit.name === "Industry Solutions")!;
    expect(child.parentId).toBe(root.id);
  });
});
