import { FormEvent, useState } from "react";
import { Button, Input, Label } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../state/appStore";

export function FirstRun() {
  const { t } = useTranslation();
  const completeFirstRun = useAppStore((state) => state.completeFirstRun);
  const [displayName, setDisplayName] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (displayName.trim()) await completeFirstRun(displayName.trim());
  }

  return (
    <main className="center">
      <form className="setup-panel" onSubmit={(event) => void submit(event)}>
        <h1>{t("firstRunTitle")}</h1>
        <Label htmlFor="display-name">{t("displayName")}</Label>
        <Input id="display-name" value={displayName} onChange={(_, data) => setDisplayName(data.value)} />
        <Button appearance="primary" type="submit" disabled={!displayName.trim()}>{t("continue")}</Button>
      </form>
    </main>
  );
}
