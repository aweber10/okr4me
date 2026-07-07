import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import "../i18n";
import { emptyDocument, ensureParticipant } from "../domain/document";
import { currentQuarter } from "../domain/quarters";
import { useAppStore } from "../state/appStore";
import { ProfilePanel } from "./ProfilePanel";

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
});
