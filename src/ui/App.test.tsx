import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import "../i18n";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAppStore } from "../state/appStore";
import { currentQuarter } from "../domain/quarters";
import { emptyDocument } from "../domain/document";

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

  it("asks for a display name and then shows the goals view", async () => {
    renderApp();
    expect(await screen.findByText("Ersteinrichtung")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Anzeigename"), "Alice");
    await userEvent.click(screen.getByRole("button", { name: "Weiter" }));

    await waitFor(() => expect(screen.getByText("okr4me")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Meine Ziele" })).toBeInTheDocument();
    expect(screen.getByText("Noch keine Einträge")).toBeInTheDocument();
  });
});
