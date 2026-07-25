import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../i18n";
import { emptyDocument } from "../domain/document";
import { currentQuarter } from "../domain/quarters";
import { selectSyncFolder } from "../platform/persistence";
import { useAppStore } from "../state/appStore";
import { FirstRun } from "./FirstRun";

vi.mock("../platform/persistence", async (importOriginal) => ({
  ...await importOriginal<typeof import("../platform/persistence")>(),
  isTauri: () => true,
  selectSyncFolder: vi.fn()
}));

describe("FirstRun sync folder", () => {
  beforeEach(() => {
    vi.mocked(selectSyncFolder).mockReset();
    useAppStore.setState({
      initialized: true,
      identity: null,
      document: emptyDocument(),
      selectedQuarter: currentQuarter(),
      activeView: "goals",
      selectedOrgUnitId: undefined,
      syncFolder: null
    });
  });

  it("offers the native folder picker during desktop setup", async () => {
    vi.mocked(selectSyncFolder).mockResolvedValue("/Users/alice/Sync");
    render(
      <FluentProvider theme={webLightTheme}>
        <FirstRun />
      </FluentProvider>
    );

    await userEvent.type(screen.getByLabelText("Anzeigename"), "Alice");
    await userEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await userEvent.click(screen.getByRole("button", { name: "Ordner auswählen …" }));

    expect(screen.getByLabelText("Sync-Ordner")).toHaveValue("/Users/alice/Sync");
  });
});
