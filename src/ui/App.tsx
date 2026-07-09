import { useEffect, useState } from "react";
import { Button, Spinner } from "@fluentui/react-components";
import { Network, Printer, Target, TreePine, UserCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAppStore } from "../state/appStore";
import { quarterLabel, isPastQuarter } from "../domain/quarters";
import { printCurrentView } from "../platform/persistence";
import { FirstRun } from "./FirstRun";
import { ProfilePanel } from "./ProfilePanel";
import { GoalsView } from "./GoalsView";
import { OrgBrowser } from "./OrgBrowser";
import { RelationGraph } from "./RelationGraph";

export default function App() {
  const { t } = useTranslation();
  const initialized = useAppStore((state) => state.initialized);
  const identity = useAppStore((state) => state.identity);
  const participant = useAppStore((state) => identity ? state.document.participants[identity.localId] : undefined);
  const selectedQuarter = useAppStore((state) => state.selectedQuarter);
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const initialize = useAppStore((state) => state.initialize);
  const previousQuarter = useAppStore((state) => state.previousQuarter);
  const nextQuarter = useAppStore((state) => state.nextQuarter);
  const syncFolder = useAppStore((state) => state.syncFolder);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (participant?.language) void i18n.changeLanguage(participant.language);
  }, [participant?.language]);

  if (!initialized) {
    return <main className="center"><Spinner label="Lade..." /></main>;
  }

  if (!identity) return <FirstRun />;

  return (
    <div className="app-shell">
      <header className="topbar section-not-printable">
        <div>
          <div className="brand">{t("appName")}</div>
          <div className="subtle">{participant?.displayName}</div>
        </div>
        <nav className="nav">
          <Button appearance={activeView === "goals" ? "primary" : "subtle"} icon={<Target size={18} />} onClick={() => setActiveView("goals")}>{t("goals")}</Button>
          <Button appearance={activeView === "org" ? "primary" : "subtle"} icon={<TreePine size={18} />} onClick={() => setActiveView("org")}>{t("org")}</Button>
          <Button appearance={activeView === "graph" ? "primary" : "subtle"} icon={<Network size={18} />} onClick={() => setActiveView("graph")}>{t("graph")}</Button>
        </nav>
        <div className="quarter-control">
          <Button onClick={previousQuarter}>{t("previous")}</Button>
          <strong>{quarterLabel(selectedQuarter, participant?.language ?? "de")}</strong>
          <Button onClick={nextQuarter}>{t("next")}</Button>
          <Button icon={<Printer size={18} />} onClick={() => void printCurrentView()}>{t("print")}</Button>
          {!syncFolder && <Button appearance="subtle" onClick={() => setProfileOpen(true)}>{t("syncSetup")}</Button>}
          <Button icon={<UserCircle size={18} />} onClick={() => setProfileOpen(true)}>{t("profile")}</Button>
        </div>
      </header>

      <div className="workspace">
        <main className="content">
          {isPastQuarter(selectedQuarter) && <div className="notice">{t("pastQuarter")}</div>}
          {activeView === "goals" && <GoalsView />}
          {activeView === "org" && <OrgBrowser />}
          {activeView === "graph" && <RelationGraph />}
        </main>
      </div>
      {profileOpen && (
        <div className="modal-backdrop section-not-printable" role="presentation" onMouseDown={() => setProfileOpen(false)}>
          <section
            className="profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t("profile")}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="dialog-header">
              <h2>{t("profile")}</h2>
              <Button aria-label={t("closeProfile")} icon={<X size={18} />} appearance="subtle" onClick={() => setProfileOpen(false)} />
            </header>
            <ProfilePanel compact />
          </section>
        </div>
      )}
    </div>
  );
}
