import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import "../i18n";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAppStore } from "../state/appStore";
import { currentQuarter } from "../domain/quarters";
import { emptyDocument, ensureParticipant } from "../domain/document";

function renderApp() {
  render(
    <FluentProvider theme={webLightTheme}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </FluentProvider>
  );
}

describe("App first-run flow", () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      initialized: false,
      identity: null,
      document: emptyDocument(),
      selectedQuarter: currentQuarter(),
      activeView: "goals",
      selectedOrgUnitId: undefined,
      syncFolder: null
    });
  });

  it("asks for a display name and sync folder before showing the goals view", async () => {
    renderApp();
    expect(await screen.findByText("Ersteinrichtung")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Anzeigename"), "Alice");
    await userEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(await screen.findByLabelText("Sync-Ordner")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Überspringen" }));

    await waitFor(() => expect(screen.getByText("okr4me")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Meine Ziele" })).toBeInTheDocument();
    expect(screen.getByText("Noch keine Einträge")).toBeInTheDocument();
  });

  it("opens the profile from the topbar without rendering a permanent sidebar", async () => {
    const appDocument = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "Ada" });
    localStorage.setItem("okr4me.identity", JSON.stringify({ localId: "p1", displayName: "Ada" }));
    localStorage.setItem("okr4me.document", JSON.stringify(appDocument));
    useAppStore.setState({
      initialized: true,
      identity: { localId: "p1", displayName: "Ada" },
      document: appDocument,
      selectedQuarter: currentQuarter(),
      activeView: "goals",
      selectedOrgUnitId: undefined,
      syncFolder: null
    });

    renderApp();

    expect(document.querySelector(".sidebar")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Profil" }));
    expect(screen.getByRole("dialog", { name: "Profil" })).toBeInTheDocument();
    expect(screen.getByLabelText("Anzeigename")).toBeInTheDocument();
  });
});
