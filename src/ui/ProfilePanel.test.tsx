import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../i18n";
import { emptyDocument, ensureParticipant } from "../domain/document";
import { currentQuarter } from "../domain/quarters";
import { useAppStore } from "../state/appStore";
import { ProfilePanel } from "./ProfilePanel";
import { selectSyncFolder } from "../platform/persistence";

vi.mock("../platform/persistence", async (importOriginal) => ({
  ...await importOriginal<typeof import("../platform/persistence")>(),
  isTauri: () => true,
  selectSyncFolder: vi.fn()
}));

function renderProfile() {
  render(
    <FluentProvider theme={webLightTheme}>
      <div className="sidebar" style={{ width: 300 }}>
        <ProfilePanel />
      </div>
    </FluentProvider>
  );
}

describe("ProfilePanel layout", () => {
  beforeEach(() => {
    vi.mocked(selectSyncFolder).mockReset();
    const document = ensureParticipant(emptyDocument(), { localId: "p1", displayName: "AndreasW" });
    useAppStore.setState({
      initialized: true,
      identity: { localId: "p1", displayName: "AndreasW" },
      document,
      selectedQuarter: currentQuarter(),
      activeView: "goals",
      selectedOrgUnitId: undefined,
      syncFolder: null
    });
  });

  it("constrains editable fields to the profile panel", () => {
    renderProfile();
    expect(screen.getByLabelText("Anzeigename")).toBeInTheDocument();
    expect(document.querySelector(".panel .fui-Input")).toBeTruthy();
  });

  it("fills the editable sync folder from the native folder picker", async () => {
    vi.mocked(selectSyncFolder).mockResolvedValue("C:\\Users\\Alice\\Sync");
    renderProfile();

    await userEvent.click(screen.getByRole("button", { name: "Ordner auswählen …" }));

    expect(screen.getByLabelText("Sync-Ordner")).toHaveValue("C:\\Users\\Alice\\Sync");
  });

  it("keeps a manually entered folder when the picker is cancelled", async () => {
    vi.mocked(selectSyncFolder).mockResolvedValue(null);
    renderProfile();
    const input = screen.getByLabelText("Sync-Ordner");
    await userEvent.type(input, "/Users/alice/Sync");

    await userEvent.click(screen.getByRole("button", { name: "Ordner auswählen …" }));

    expect(selectSyncFolder).toHaveBeenCalledWith("/Users/alice/Sync");
    expect(input).toHaveValue("/Users/alice/Sync");
  });
});
