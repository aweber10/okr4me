# Technisches Konzept: ZuE-Client (Neuentwicklung auf Tauri-Basis)

**Dokumentversion:** 1.0
**Stand:** Juli 2026
**Bezug:** ANFORDERUNGEN_FACHLICH.md v2.0

---

## Inhaltsverzeichnis

1. [Architekturentscheidung im Überblick](#1-architekturentscheidung-im-überblick)
2. [Frontend](#2-frontend)
3. [Tauri-Kern (Rust)](#3-tauri-kern-rust)
4. [Datenhaltung](#4-datenhaltung)
5. [Abbildung des Datenmodells](#5-abbildung-des-datenmodells)
6. [Identität und Rollen (technisch)](#6-identität-und-rollen-technisch)
7. [Synchronisation](#7-synchronisation)
8. [Visualisierung: Graph und Diagramme](#8-visualisierung-graph-und-diagramme)
9. [Internationalisierung](#9-internationalisierung)
10. [Druckfunktion](#10-druckfunktion)
11. [Build, Paketierung und Verteilung](#11-build-paketierung-und-verteilung)
12. [Migration aus der Vorgängerlösung](#12-migration-aus-der-vorgängerlösung)
13. [Offene Punkte](#13-offene-punkte)

---

## 1. Architekturentscheidung im Überblick

Der bisherige Angular/Material-Client wird nicht migriert, sondern vollständig neu entwickelt. Gründe: Angular in der vorliegenden Version ist zu alt für ein sinnvolles Upgrade, und die Datenzugriffsschicht ändert sich ohnehin grundlegend (kein REST-Backend mehr, sondern lokale, replizierte Datenhaltung). Eine Migration würde also nur die UI-Schicht retten, während gerade diese am stärksten veraltet ist.

**Grobarchitektur:**


┌─────────────────────────────────────────────┐
│  Webview (Frontend, TypeScript)              │
│  - Ansichten, Formulare, Graph, Diagramme    │
│  - Zustand/Business-Logik im Frontend        │
└───────────────┬───────────────────────────────┘
│  Tauri IPC (invoke/emit)
┌───────────────▼───────────────────────────────┐
│  Tauri-Kern (Rust)                            │
│  - Dateisystemzugriff, lokale Persistenz      │
│  - OS-Integration (Benutzername, Drucken)     │
│  - Austausch-Adapter (siehe Kap. 7)           │
└─────────────────────────────────────────────────┘

Die fachliche Logik (Fortschrittsberechnung, Validierung, Kaskadenlöschung) liegt bewusst im TypeScript-Frontend, nicht in Rust – sie ist reine Domänenlogik ohne Sicherheitsrelevanz (siehe fachliches Dokument, Kap. 6.5) und profitiert von schnellerer Entwicklungsiteration. Rust übernimmt ausschließlich Aufgaben, die echten Systemzugriff brauchen.

---

## 2. Frontend

**Framework:** React 18 mit TypeScript und Vite als Build-Tool. Begründung gegenüber Alternativen:

- Deutlich größeres Ökosystem an fertigen Bausteinen für die anspruchsvollen UI-Teile dieses Projekts (Force-Graph, Drag-and-Drop, Diagramme) als Svelte oder SolidJS.
- Sehr gute Tauri-Unterstützung und Dokumentation, viele existierende Referenzprojekte.
- Große Verfügbarkeit von Entwicklern, die mit React arbeiten können, falls das Projekt später von anderen übernommen wird – im Unterschied zur Vorgängerlösung soll Wartbarkeit hier explizit eine Rolle spielen.

**UI-Komponentenbibliothek:** Fluent UI React (Microsoft Fluent 2), nicht erneut Material.

- Passt optisch zur Windows-/Office-Arbeitsumgebung der Zielgruppe, die von der Excel-Vorgängerlösung kommt – hohe Wiedererkennung, kein Bruch im „Look and Feel".
- Wird von Microsoft aktiv gepflegt, unabhängig von Google/Angular-Ökosystem-Entscheidungen, geringeres Risiko einer erneuten technologischen Veralterung.
- Deckt Formulare, Datentabellen, Kontextmenüs, Dialoge, Badges und Akkordeons ab, die laut fachlichem Konzept an vielen Stellen gebraucht werden (5.6, 5.7, 5.9 f.).

**Zustandsverwaltung:** Zustand (das State-Management-Paket, nicht zu verwechseln mit dem Fachbegriff) oder alternativ React Context + `useReducer` für kleinere Bereiche. Kein Redux – für die Größe dieser Anwendung unnötiger Overhead.

**Formulare:** react-hook-form mit Zod für Validierung (Pflichtfelder, Zeichenlimits, Wertebereiche laut Datenmodell).

**Drag-and-Drop:** `@dnd-kit/core` für Team-Baum-Verschiebung und Profilbild-Upload per Drag-and-Drop.

---

## 3. Tauri-Kern (Rust)

Zuständigkeiten des Rust-Teils:

- **Dateisystemzugriff:** Laden/Speichern der lokalen Datendatei (siehe Kap. 4), Verwaltung des Speicherorts (z. B. `%APPDATA%/ZuE/`).
- **Lokale Identität:** Anlegen und Lesen der lokalen Identitätsdatei bei Ersteinrichtung (Anzeigename, generierte lokale ID, optional ausgelesener Windows-Benutzername via `whoami`-Crate oder `std::env::var("USERNAME")`).
- **Austausch-Adapter:** Eine klar abgegrenzte Schnittstelle (Trait) `SyncProvider`, die das Herunterladen/Hochladen der Änderungs-Datenpakete kapselt (siehe Kap. 7). Details des tatsächlich verwendeten Austauschmechanismus sind hier bewusst noch nicht festgelegt.
- **Drucken:** Ansteuerung des systemeigenen Druckdialogs über die Tauri-Druck-API bzw. `window.print()` im Webview.
- **Datei-Uploads:** Profilbild-Auswahl über den nativen Dateiauswahldialog.

Rust-Code bleibt bewusst schlank; komplexe Geschäftslogik wird nicht dorthin verlagert.

---

## 4. Datenhaltung

**Kernentscheidung:** Ein CRDT-Dokument (Conflict-free Replicated Data Type) pro Team/Bereich, umgesetzt mit **Automerge** (Rust-Bibliothek mit stabilen JS/TS-Bindings, dadurch auf beiden Seiten der Tauri-Grenze nutzbar).

**Warum CRDT statt klassischer Datei- oder DB-Lösung:**

- Mehrere Teilnehmer bearbeiten den Datenbestand zeitlich versetzt und ohne durchgehende Verbindung (fachliche Anforderung 6.1). Automerge führt gleichzeitige, unabhängig entstandene Änderungen automatisch und deterministisch zusammen, ohne dass ein Teilnehmer manuell einen Konflikt aus Textzeilen auflösen muss.
- Automerge führt intern ohnehin ein vollständiges Änderungsprotokoll jeder Operation mit Autor und Zeitstempel – das deckt die fachliche Anforderung 5.8/6.6 zu großen Teilen bereits aus der gewählten Technik ab, statt separat gebaut werden zu müssen.

**Persistenzformat:** Das Automerge-Dokument wird binär als einzelne Datei auf der Festplatte gehalten (z. B. `zue-data.automerge`). Beim App-Start wird es vollständig ins Frontend geladen (Größenordnung bei „überschaubarer Nutzerzahl" unkritisch für Arbeitsspeicher).

**Kein SQL, kein separater Datenbankprozess.** Für performante Filterung/Sortierung in größeren Listen (z. B. Orgabrowser bei vielen Objectives) reicht bei dieser Nutzerzahl eine In-Memory-Indexierung im Frontend (z. B. einfache Maps nach Team/Quartal); ein zusätzlicher SQLite-Index wird nur bei tatsächlich beobachteten Performanceproblemen nachgerüstet, nicht vorab.

---

## 5. Abbildung des Datenmodells

Automerge bildet Maps und Listen ab; die fachlichen Entitäten werden wie folgt gemappt:

document
├── participants: Map<localId, Participant>
├── orgUnits: Map<unitId, OrgUnit>
├── objectives: Map<objectiveId, Objective>
│     └── keyResults: Map<krId, KeyResult>
│           ├── timeEvents: List<TimeEvent>
│           └── comments: List<Comment>
│     └── comments: List<Comment>
│     └── crossLinks: List<krId>      // m:n, siehe unten
├── coordinatorIds: List<localId>      // Konventions-Flag, siehe Kap. 6
└── changeLog: (entfällt als separate Struktur – ergibt sich aus Automerge-Historie,
gefiltert/aufbereitet zur Anzeige)

**Cross-Links (m:n):** als beidseitige Referenzliste von Key-Result-ID zu Objective-ID; beim Anzeigen wird zusätzlich zur eigentlichen Eltern-Objective-Zuordnung diese Liste ausgewertet.

**Löschen (Tombstones):** Da es keine erzwingenden Fremdschlüssel-Constraints wie in einer relationalen DB gibt, wird Löschen explizit in der Anwendungslogik behandelt: Beim Löschen eines Objectives markiert die App-Logik in einer einzigen Automerge-Transaktion das Objective sowie alle referenzierten Key Results, Fortschrittsereignisse und Kommentare als gelöscht (`deletedAt`-Zeitstempel) und entfernt sie aus den aktiven Listen. Damit bleibt die Kaskadenlöschung (fachlich 5.3, 6.4) auch bei später einlaufenden, parallel erstellten Änderungen anderer Teilnehmer konsistent auflösbar.

**Änderungsprotokoll-Anzeige:** Die für die Oberfläche nötige „menschenlesbare Zusammenfassung" (Felddiff) wird beim Schreiben jeder Änderung zusätzlich als kompakter Log-Eintrag im Dokument mitgeschrieben (nicht ausschließlich aus der Automerge-Rohhistorie zur Anzeigezeit rekonstruiert), damit Diff-Texte stabil und sprachabhängig (de/en) aufbereitet werden können.

---

## 6. Identität und Rollen (technisch)

**Lokale Identitätsdatei** (nicht Teil des synchronisierten Dokuments, verbleibt nur auf dem jeweiligen Rechner):

```json
{
  "localId": "3f2a1c9e-...",
  "displayName": "Max Mustermann",
  "windowsAccount": "mmustermann"
}
```

- `localId` wird bei Ersteinrichtung per UUID erzeugt und danach nie geändert – sie ist der Schlüssel, unter dem der Teilnehmer im geteilten Dokument als Besitzer/Autor auftritt.
- `windowsAccount` wird, falls verfügbar, automatisch aus der Betriebssystemumgebung gelesen und nur zu Anzeige-/Debuggingzwecken mitgeführt.

**Rollenprüfung:** Die Frontend-Logik prüft bei jeder besitz- oder koordinatorabhängigen UI-Aktion (Bearbeiten-Button, Koordinatoren-Aktionen im Orgabrowser) lediglich, ob `localId` des aktuellen Teilnehmers mit dem Besitzerfeld übereinstimmt bzw. ob `localId` in `coordinatorIds` enthalten ist. Es gibt bewusst **keine** kryptografische Signatur, keine Zugriffskontrollschicht und keine serverseitige Durchsetzung – das entspricht der fachlich festgelegten Sicherheitsanforderung 6.5.

---

## 7. Synchronisation

Der genaue Austauschmechanismus (z. B. Ordnersynchronisation, Versionsverwaltung) ist laut fachlichem Konzept nicht Gegenstand dieses Dokuments und wird hier daher nur als **austauschbare technische Schnittstelle** beschrieben, nicht als festgelegter Mechanismus:

```rust
trait SyncProvider {
    fn pull(&self) -> Result<Vec<ChangePackage>>;
    fn push(&self, changes: Vec<ChangePackage>) -> Result<()>;
}
```

- Ein `ChangePackage` entspricht den binären Automerge-„Sync-Messages" bzw. Change-Blobs seit dem letzten bekannten Stand.
- Die App ruft `pull()` beim Start und in konfigurierbaren Intervallen auf, führt die erhaltenen Changes lokal per Automerge-Merge zusammen und ruft nach eigenen Änderungen `push()` auf.
- Konkrete Implementierungen von `SyncProvider` (z. B. „Dateien in einem synchronisierten Ordner ablegen/lesen") sind austauschbar und können später ohne Änderung der übrigen Anwendung ergänzt werden.

---

## 8. Visualisierung: Graph und Diagramme

- **Verknüpfungsgraph (5.11 fachlich):** `d3-force` für die kräftebasierte Simulation, gerendert in einer React-Komponente per SVG oder Canvas (Canvas empfohlen, sobald mehr als einige hundert Knoten gleichzeitig dargestellt werden). Zoom/Pan über `d3-zoom`.
- **Fortschrittsdiagramm (5.13 fachlich):** Recharts für das Linienchart je Key Result (Kalenderwochen auf der X-Achse, Prozent auf der Y-Achse).
- **Fortschrittsbalken/Schieberegler:** eigene, kleine React-Komponenten auf Basis der Fluent-UI-Grundelemente, da die Invertierungslogik bei absteigendem Ziel (fachlich 5.5) speziell genug ist, um keine Fremdkomponente zu verbiegen.

---

## 9. Internationalisierung

`i18next` mit `react-i18next`. Sprachdateien für Deutsch und Englisch liegen als JSON im Frontend-Bundle. Die aktuelle Sprache wird aus dem Teilnehmerprofil (Kap. 3.1 fachlich) gelesen und beim Start gesetzt.

---

## 10. Druckfunktion

`window.print()` im Webview, angestoßen über die Tauri-Druckschaltfläche. Ein dediziertes Print-Stylesheet (`@media print`) blendet Navigation, Quartalswähler und interaktive Steuerelemente aus und klappt vor dem Druckaufruf programmatisch alle Akkordeon-Elemente auf (fachlich 5.14).

---

## 11. Build, Paketierung und Verteilung

- `tauri build` erzeugt ein natives Windows-Installationspaket (MSI/NSIS), passend zur Windows-geprägten Zielumgebung.
- Kein Auto-Update-Server erforderlich für den Start; Tauri unterstützt bei Bedarf später einen Updater, der über denselben bereits genehmigten Verteilweg (z. B. Dateiablage) bedient werden kann, ohne eine neue Infrastruktur zu benötigen.
- Ein Entwickler-Setup läuft über `npm install && npm run tauri dev`; für Endanwender ist ausschließlich das fertige Installationspaket relevant, keine Entwicklerwerkzeuge nötig.

---

## 12. Migration aus der Vorgängerlösung

Da UI-Technologie (Angular/Material → React/Fluent) und Datenzugriff (REST/Spring Boot → lokales CRDT-Dokument) sich grundlegend ändern, ist eine Code-Migration nicht sinnvoll. Wiederverwendbar ist:

- die fachliche Logik der Fortschrittsberechnung (Kap. 5.5 fachlich) als Referenzimplementierung/Testfälle,
- die Struktur des Datenmodells als Vorlage für das Automerge-Schema (Kap. 5 dieses Dokuments),
- ggf. vorhandene UI-Texte für die Übersetzungsdateien (Kap. 9).

Die eigentliche UI- und Backend-Implementierung wird komplett neu geschrieben.

---

## 13. Offene Punkte

- Konkreter Austauschmechanismus für die Synchronisation (Kap. 7) ist bewusst noch nicht entschieden und sollte separat geklärt werden.
- Verhalten bei sehr großen Historien (Automerge-Dokumentgröße über die Zeit) ist bei der angenommenen kleinen Nutzerzahl unkritisch, sollte aber nach einigen Quartalen produktiver Nutzung einmal beobachtet werden (ggf. Kompaktierung der Historie).
- Umgang mit Profilbildern im CRDT-Dokument (Binärdaten können das Dokument aufblähen) – Empfehlung: Statt Profilbildern werden im ersten Schritt die Initialien der Nutzer angezeigt.