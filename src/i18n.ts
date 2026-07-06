import i18n from "i18next";
import { initReactI18next } from "react-i18next";

void i18n.use(initReactI18next).init({
  resources: {
    de: {
      translation: {
        appName: "okr4me",
        goals: "Meine Ziele",
        org: "Orgabrowser",
        graph: "Verknüpfungsgraph",
        previous: "Zurück",
        next: "Weiter",
        print: "Drucken",
        pastQuarter: "Das gewählte Quartal liegt in der Vergangenheit. Bearbeiten und Erstellen ist gesperrt.",
        firstRunTitle: "Ersteinrichtung",
        displayName: "Anzeigename",
        continue: "Weiter",
        profile: "Profil",
        syncFolder: "Sync-Ordner",
        save: "Speichern",
        addObjective: "Objective anlegen",
        addKeyResult: "Key Result anlegen",
        description: "Beschreibung",
        create: "Anlegen",
        progress: "Fortschritt",
        teamObjectives: "Ziele meiner Organisationseinheit",
        noData: "Noch keine Einträge",
        organization: "Organisation",
        addOrgUnit: "Organisationseinheit anlegen",
        quarterly: "Quartalsziel",
        strategic: "Strategisches Ziel",
        delete: "Löschen",
        comments: "Kommentare"
      }
    },
    en: {
      translation: {
        appName: "okr4me",
        goals: "My Goals",
        org: "Org browser",
        graph: "Relation graph",
        previous: "Previous",
        next: "Next",
        print: "Print",
        pastQuarter: "The selected quarter is in the past. Editing and creation are locked.",
        firstRunTitle: "First setup",
        displayName: "Display name",
        continue: "Continue",
        profile: "Profile",
        syncFolder: "Sync folder",
        save: "Save",
        addObjective: "Add objective",
        addKeyResult: "Add key result",
        description: "Description",
        create: "Create",
        progress: "Progress",
        teamObjectives: "Objectives of my org unit",
        noData: "No entries yet",
        organization: "Organization",
        addOrgUnit: "Add org unit",
        quarterly: "Quarterly objective",
        strategic: "Strategic objective",
        delete: "Delete",
        comments: "Comments"
      }
    }
  },
  lng: "de",
  fallbackLng: "de",
  interpolation: { escapeValue: false }
});

export default i18n;
