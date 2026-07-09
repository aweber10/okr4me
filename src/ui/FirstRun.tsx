import { FormEvent, useState } from "react";
import { Button, Input, Label } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../state/appStore";

export function FirstRun() {
  const { t } = useTranslation();
  const completeFirstRun = useAppStore((state) => state.completeFirstRun);
  const setSyncFolder = useAppStore((state) => state.setSyncFolder);
  const [displayName, setDisplayName] = useState("");
  const [syncFolder, setSyncFolderDraft] = useState("");
  const [step, setStep] = useState<"identity" | "sync">("identity");
  const [error, setError] = useState("");
  const isTauri = "__TAURI_INTERNALS__" in window;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step === "identity") {
      if (displayName.trim()) setStep("sync");
      return;
    }
    await finishSetup(syncFolder.trim() || null);
  }

  async function finishSetup(folder: string | null) {
    setError("");
    try {
      await completeFirstRun(displayName.trim());
      if (folder) await setSyncFolder(folder);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <main className="center">
      <form className="setup-panel" onSubmit={(event) => void submit(event)}>
        <h1>{t("firstRunTitle")}</h1>
        {step === "identity" ? (
          <>
            <Label htmlFor="display-name">{t("displayName")}</Label>
            <Input id="display-name" value={displayName} onChange={(_, data) => setDisplayName(data.value)} />
            <Button appearance="primary" type="submit" disabled={!displayName.trim()}>{t("continue")}</Button>
          </>
        ) : (
          <>
            <Label htmlFor="first-run-sync-folder">{t("syncFolder")}</Label>
            <Input id="first-run-sync-folder" value={syncFolder} onChange={(_, data) => setSyncFolderDraft(data.value)} placeholder="/gemeinsamer/ordner" autoFocus />
            <p className="subtle">
              {isTauri ? t("syncSetupHintDesktop") : t("syncSetupHintBrowser")}
            </p>
            {error && <p className="form-error">{error}</p>}
            <div className="button-row">
              <Button appearance="primary" type="submit">{syncFolder.trim() ? t("save") : t("startWithoutSync")}</Button>
              <Button type="button" onClick={() => void finishSetup(null)}>{t("skip")}</Button>
            </div>
          </>
        )}
      </form>
    </main>
  );
}
