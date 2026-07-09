# Technisches Konzept: OKR-Client (Neuentwicklung auf Tauri-Basis)

**Dokumentversion:** 2.0  
**Stand:** Juli 2026  
**Bezug:** ANFORDERUNGEN_FACHLICH.md v2.0

**Änderungen gegenüber v1.0:** Die Datenhaltung wird von einem CRDT-basierten Ansatz (Automerge) auf eine versionierte Kette vollständiger JSON-Snapshots mit Konflikterkennung umgestellt. Grund: bewusste Entscheidung gegen ein Binärformat, um Transparenz, Lesbarkeit, einfache Sicherung und Migrierbarkeit der Datenablage zu priorisieren. Automatisches konfliktfreies Merging wird dafür aufgegeben und durch erkennbare Konflikte mit manueller Auflösung ersetzt. Bei der erwarteten Nutzung (kleines Team, quartalsweiser Rhythmus) ist das ein akzeptierter Kompromiss.

**Kritische Präzisierung:** Ein einfacher Sync-Ordner bietet keine zentrale atomare Versionsvergabe. Deshalb darf das Konzept nicht davon ausgehen, dass es "nie" zwei Dateien mit derselben Folgeversion gibt. Korrekt ist: Die Anwendung erkennt konkurrierende Snapshot-Köpfe ("Heads") und verhindert, dass sie unbemerkt automatisch zusammengeführt werden.

---

## Inhaltsverzeichnis

1. [Architekturentscheidung im Überblick](#1-architekturentscheidung-im-überblick)
2. [Frontend](#2-frontend)
3. [Tauri-Kern (Rust)](#3-tauri-kern-rust)
4. [Datenhaltung](#4-datenhaltung)
5. [Abbildung des Datenmodells](#5-abbildung-des-datenmodells)
6. [Identität und Rollen (technisch)](#6-identität-und-rollen-technisch)
7. [Synchronisation und Konflikte](#7-synchronisation-und-konflikte)
8. [Visualisierung: Graph und Diagramme](#8-visualisierung-graph-und-diagramme)
9. [Internationalisierung](#9-internationalisierung)
10. [Druckfunktion](#10-druckfunktion)
11. [Build, Paketierung und Verteilung](#11-build-paketierung-und-verteilung)
12. [Migration aus der Vorgängerlösung](#12-migration-aus-der-vorgängerlösung)
13. [Offene Punkte](#13-offene-punkte)

---

## 1. Architekturentscheidung im Überblick

Der bisherige Angular/Material-Client wird nicht migriert, sondern vollständig neu entwickelt. Gründe: Angular in der vorliegenden Version ist zu alt für ein sinnvolles Upgrade, und die Datenzugriffsschicht ändert sich grundlegend (kein REST-Backend mehr, sondern lokale, dateibasierte Datenhaltung). Eine Migration würde nur Teile der UI-Schicht retten, während gerade diese am stärksten veraltet ist.

**Grobarchitektur:**

```text
┌─────────────────────────────────────────────┐
│  Webview (Frontend, TypeScript)             │
│  - Ansichten, Formulare, Graph, Diagramme   │
│  - Zustand/Business-Logik im Frontend       │
└───────────────┬─────────────────────────────┘
                │  Tauri IPC (invoke/emit)
┌───────────────▼─────────────────────────────┐
│  Tauri-Kern (Rust)                          │
│  - Dateisystemzugriff, lokale Persistenz    │
│  - OS-Integration (Benutzername, Drucken)   │
│  - Austausch-Adapter für Sync-Ordner        │
└─────────────────────────────────────────────┘
```

Die fachliche Logik (Fortschrittsberechnung, Validierung, Kaskadenlöschung, Konfliktdarstellung) liegt bewusst im TypeScript-Frontend. Rust übernimmt Aufgaben, die echten Systemzugriff brauchen: lokale Dateien, Sync-Ordner, OS-Informationen und später native Dialoge.

---

## 2. Frontend

**Framework:** React 18 mit TypeScript und Vite.

- Geeignetes Ökosystem für UI-Bausteine, Graphen, Drag-and-Drop und Diagramme.
- Gute Tauri-Unterstützung.
- Breite Entwicklerverfügbarkeit.

**UI-Komponentenbibliothek:** Fluent UI React (Microsoft Fluent 2).

- Passt zur Windows-/Office-Arbeitsumgebung der Zielgruppe.
- Deckt Formulare, Dialoge, Badges, Menüs und strukturierte Oberflächen ab.
- Vermeidet eine erneute Bindung an das veraltete Angular/Material-Setup der Vorgängerlösung.

**Zustandsverwaltung:** Zustand. Redux ist für die Größe dieser Anwendung unnötig.

**Formulare und Validierung:** React-Formulare mit Zod-Validierung für Pflichtfelder, Zeichenlimits und Wertebereiche.

**Drag-and-Drop:** `@dnd-kit/core` für Team-Baum-Verschiebung; Profilbilder bleiben wegen Snapshot-Größe zunächst offen (siehe Kap. 13).

---

## 3. Tauri-Kern (Rust)

Zuständigkeiten des Rust-Teils:

- **Dateisystemzugriff:** Laden/Speichern der lokalen Datendatei und Lesen/Schreiben im Sync-Ordner.
- **Lokale Identität:** Anlegen und Lesen der lokalen Identitätsdatei bei Ersteinrichtung.
- **Sync-Adapter:** Abstraktion für Dateiliste, Lesen und Schreiben von Snapshot-Dateien.
- **OS-Integration:** optionales Auslesen des Windows-/Systembenutzers.
- **Drucken:** primär `window.print()` im Webview; native Erweiterung nur bei Bedarf.

Rust bleibt bewusst schlank; komplexe Geschäftslogik wird nicht dorthin verlagert.

---

## 4. Datenhaltung

**Kernentscheidung:** Der Datenbestand wird als Kette vollständiger JSON-Snapshots abgelegt, nicht als Datenbank und nicht als binäres CRDT-Dokument. Jeder Snapshot enthält den kompletten fachlichen Zustand zu einem Zeitpunkt.

**Warum diese Struktur statt CRDT oder klassischer DB:**

- Vollständig menschenlesbar: reines JSON, kein Binärformat.
- Jede Snapshot-Datei ist für sich analysierbar und migrierbar.
- Keine zentrale Datenbank und kein Server notwendig.
- Konflikte werden sichtbar gemacht, statt automatisch und potenziell überraschend gemerged zu werden.

**Konsequenz:** Gleichzeitige Änderungen an derselben Grundlage können nicht automatisch konfliktfrei zusammengeführt werden. Die Anwendung muss konkurrierende Snapshot-Köpfe erkennen und die Fortsetzung blockieren, bis ein Teilnehmer einen neuen, eindeutigen Auflösungs-Snapshot erzeugt.

**Lokale Speicherung:** Zusätzlich zum Sync-Ordner hält jeder Client lokal seinen zuletzt akzeptierten Snapshot. Im Browser-Testfall wird dieser Stand per Web-Speicher (`localStorage`) gehalten; ein echter Sync-Ordner ist nur in der Tauri-App möglich.

---

## 5. Abbildung des Datenmodells

Jede Snapshot-Datei enthält Metadaten plus den kompletten fachlichen Zustand:

```json
{
  "schemaVersion": 2,
  "snapshotId": "4b7a4e5e-...",
  "version": 7,
  "parentSnapshotId": "aa13c9d4-...",
  "parentVersion": 6,
  "writtenBy": "<localId>",
  "writtenAt": "2026-07-08T18:55:32.137Z",
  "participants": { "<localId>": { "...": "..." } },
  "orgUnits": { "<unitId>": { "...": "..." } },
  "objectives": { "<objectiveId>": { "...": "...", "keyResultIds": ["..."] } },
  "keyResults": { "<krId>": { "...": "...", "crossLinkedObjectiveIds": ["..."] } },
  "timeEvents": { "<eventId>": { "...": "..." } },
  "comments": { "<commentId>": { "...": "..." } },
  "changeLog": { "<logId>": { "...": "..." } },
  "coordinatorIds": ["<localId>"]
}
```

**Metadaten:**

- `schemaVersion`: Version des JSON-Schemas für Migrationen.
- `snapshotId`: UUID des Snapshots; dient als eindeutiger Knoten in der Snapshot-Kette.
- `version`: monotone Folgezahl aus Sicht der linearen Hauptkette.
- `parentSnapshotId` / `parentVersion`: Grundlage, auf der dieser Snapshot erzeugt wurde.
- `writtenBy` / `writtenAt`: Autor und Schreibzeitpunkt.

**Wichtig:** `version` ist allein kein eindeutiger Konfliktschlüssel. In einem Sync-Ordner können zwei Clients parallel Snapshots mit gleicher `version` und gleichem `parentVersion` erzeugen. Eindeutig ist erst `snapshotId`.

**Cross-Links (m:n):** beidseitige Referenzlisten:

- `Objective.crossLinkedKeyResultIds`
- `KeyResult.crossLinkedObjectiveIds`

**Löschen:** Für den aktuellen Zielzustand reicht es, gelöschte Entitäten aus aktiven Referenzlisten zu entfernen und im Snapshot nicht mehr als aktiv zu betrachten. Für Nachvollziehbarkeit und Konflikt-Diff ist aber ein Änderungsprotokoll nötig. Ein dauerhaftes Tombstone-Feld ist nicht zwingend, bleibt aber für die aktuelle Implementierung zulässig, solange Selektoren gelöschte Entitäten ausblenden. Das Konzept erzwingt also keine Tombstones, verbietet sie aber auch nicht.

**Änderungsprotokoll:** `changeLog` bleibt eine eigene Map mit menschenlesbaren Einträgen. Jeder Snapshot enthält die bis dahin bekannte Historie. Dadurch bleibt die Historie auch nach Kompaktierung älterer Dateien erhalten, sofern der neueste Snapshot den vollständigen `changeLog` enthält.

---

## 6. Identität und Rollen (technisch)

**Lokale Identitätsdatei** (nicht Teil des synchronisierten Dokuments):

```json
{
  "localId": "3f2a1c9e-...",
  "displayName": "Max Mustermann",
  "windowsAccount": "mmustermann"
}
```

- `localId` wird bei Ersteinrichtung per UUID erzeugt und danach nie geändert.
- `windowsAccount` wird, falls verfügbar, automatisch aus der Betriebssystemumgebung gelesen und nur informativ verwendet.

**Rollenprüfung:** Die Frontend-Logik prüft anhand der `localId`, ob Bearbeitung oder Koordinatorenfunktionen angeboten werden. Es gibt bewusst keine kryptografische Signatur, keine serverseitige Zugriffskontrolle und keine formale Benutzerverwaltung.

---

## 7. Synchronisation und Konflikte

Der erste konkrete Sync-Provider ist ein lokaler bzw. extern synchronisierter Ordner. Weitere Provider können später ergänzt werden.

```rust
trait SyncProvider {
    fn list_files(&self) -> Result<Vec<FileMeta>>;
    fn read(&self, name: &str) -> Result<Vec<u8>>;
    fn write_new(&self, name: &str, content: Vec<u8>) -> Result<()>;
    fn move_to_archive(&self, name: &str) -> Result<()>;
}
```

`write_new` muss so implementiert werden, dass keine vorhandene Datei überschrieben wird. Bei Dateisystem-Providern erfolgt das über exklusives Anlegen einer neuen Datei.

### 7.1 Dateibenennung

Dateien folgen dem Schema:

```text
<version>-<parentVersion>-<snapshotId>-<localId>.zuechange
```

Beispiel:

```text
0007-0006-4b7a4e5e-25b45ba9.zuechange
```

Die `snapshotId` verhindert Namenskollisionen auch dann, wenn zwei Clients dieselbe Folgeversion aus derselben Parent-Version erzeugen.

### 7.2 Lesen und Head-Ermittlung

Beim Start und beim manuellen Pull:

1. Alle `.zuechange`-Dateien im Sync-Ordner lesen.
2. Ungültige oder unlesbare Dateien melden und ignorieren, nicht still verschlucken.
3. Aus `snapshotId` und `parentSnapshotId` einen gerichteten Graphen bilden.
4. Heads bestimmen: Snapshots, die von keinem anderen Snapshot als Parent referenziert werden.
5. Gibt es genau einen Head, ist dieser der aktuelle gemeinsame Stand.
6. Gibt es mehrere Heads, liegt ein offener Konflikt vor.

Der lokale Stand darf nur automatisch auf einen eindeutigen Head aktualisiert werden. Bei mehreren Heads muss die Anwendung den Konflikt sichtbar machen.

### 7.3 Schreiben einer Änderung

Eine Bearbeitung kann lokal vorbereitet werden, ohne sofort mit dem Sync-Ordner verbunden zu sein. Beim Veröffentlichen in den Sync-Ordner gilt:

1. Aktuellen eindeutigen Head ermitteln.
2. Wenn der lokale Arbeitsstand nicht auf diesem Head basiert, den Schreibvorgang blockieren.
3. Teilnehmerhinweis anzeigen: Der gemeinsame Stand hat sich geändert; neu laden und Änderung erneut prüfen.
4. Wenn der lokale Arbeitsstand auf dem Head basiert, neuen Snapshot mit `version = parentVersion + 1` und `parentSnapshotId = head.snapshotId` schreiben.

Die Anwendung sollte Formulareingaben beim Blockieren nicht verwerfen. Der Teilnehmer muss die Möglichkeit haben, den neuen Stand zu laden und seine Eingabe erneut zu bestätigen.

### 7.4 Echte Gleichzeitigkeit

Wenn zwei Clients nahezu gleichzeitig ausgehend vom selben Head schreiben, können zwei Snapshots mit gleicher `parentSnapshotId` entstehen. Das ist kein Datenverlust, sondern ein Konfliktzustand:

- Beide Snapshots bleiben erhalten.
- Die Anwendung erkennt mehrere Heads.
- Normale weitere Schreibvorgänge werden blockiert.
- Eine Konfliktauflösung erzeugt einen neuen Snapshot, der einen der Heads als technischen Parent referenziert und fachlich die gewünschte Auflösung enthält.

Da das Format vollständige JSON-Snapshots nutzt, kann die UI beide Endstände und optional den gemeinsamen Parent vergleichen. Eine automatische Feld-für-Feld-Zusammenführung findet in v2 bewusst nicht statt.

### 7.5 Konfliktauflösung

Die konkrete UI wird separat entworfen, muss aber folgende Mindestfälle abdecken:

- Ein Head vollständig übernehmen.
- Einzelne fachliche Änderungen manuell nachtragen.
- Konflikt als gelöst speichern, indem ein neuer eindeutiger Snapshot erzeugt wird.

Die Anwendung darf nach einer Konfliktauflösung nicht die alten Konfliktdateien löschen. Sie können später archiviert werden.

### 7.6 Dateiverlust

Wenn eine ältere Datei gelöscht wird, ist der neueste vollständige Snapshot weiterhin nutzbar. Wenn ein noch nicht von anderen Clients gelesener neuester Snapshot gelöscht wird, geht genau dieser Stand verloren. Das ist der Preis des dateibasierten Ansatzes ohne zentralen Server.

Fehlende Parent-Dateien sind für den aktuellen Stand nicht zwangsläufig fatal, weil jeder Snapshot vollständig ist. Sie verschlechtern aber Nachvollziehbarkeit und Konflikt-Diff. Die Anwendung sollte solche Lücken melden.

### 7.7 Kompaktierung

Da jeder Snapshot vollständig ist, können ältere Dateien archiviert werden, sobald ein eindeutiger neuer Head existiert.

Empfohlener Ablauf:

1. Kompaktierung manuell oder ab einem Schwellwert (z. B. 50 Dateien) anbieten.
2. Nur ausführen, wenn genau ein Head existiert.
3. Die letzten fünf bis zehn Snapshots im Hauptordner behalten.
4. Ältere Snapshots in `archiv/` verschieben, nicht löschen.

Der neueste Snapshot muss den vollständigen `changeLog` enthalten, damit die fachliche Historie durch Archivierung nicht verloren geht.

---

## 8. Visualisierung: Graph und Diagramme

- **Verknüpfungsgraph:** Darstellung von Objectives, Key Results, Parent-Kanten und Cross-Links. Für v1 reicht SVG mit festen bzw. einfachen Positionen; `d3-force` bleibt Option für eine spätere interaktive Layout-Verbesserung.
- **Fortschrittsdiagramm:** Recharts oder eigene SVG-Komponente für den Fortschrittsverlauf je Key Result.
- **Fortschrittsbalken/Schieberegler:** eigene React-Komponenten bzw. native Eingaben mit spezifischer Logik für Startwert, Zielwert, Schrittgröße und absteigende Ziele.

---

## 9. Internationalisierung

`i18next` mit `react-i18next`. Deutsch und Englisch liegen im Frontend-Bundle. Die aktuelle Sprache wird aus dem Teilnehmerprofil gelesen und beim Start gesetzt.

---

## 10. Druckfunktion

`window.print()` im Webview. Ein Print-Stylesheet blendet Navigation, Quartalswähler und interaktive Steuerelemente aus. Tauri kann bei Bedarf später native Druckintegration ergänzen.

---

## 11. Build, Paketierung und Verteilung

- Entwicklung: `npm install`, `npm run dev`, `npm run tauri dev`.
- Tests: `npm test`.
- Frontend-Build: `npm run build`.
- Tauri-Build: `npm run tauri build`.
- Zielplattform für Endanwender ist Windows. Windows-Pakete werden zuverlässig auf einem Windows-Buildsystem erzeugt.

Aktuell muss die Tauri-Bundle-Konfiguration für echte Installer-Artefakte explizit aktiviert werden.

---

## 12. Migration aus der Vorgängerlösung

Da UI-Technologie (Angular/Material → React/Fluent) und Datenzugriff (REST/Spring Boot → lokale JSON-Snapshots) sich grundlegend ändern, ist eine Code-Migration nicht sinnvoll.

Wiederverwendbar sind:

- fachliche Logik der Fortschrittsberechnung als Referenz/Testfälle,
- Datenmodellstruktur als Vorlage für JSON-Schema,
- UI-Texte für Übersetzungen,
- Icons und einfache statische Assets, soweit lizenzrechtlich unproblematisch.

Die eigentliche UI- und Backend-Implementierung wird neu geschrieben.

---

## 13. Offene Punkte

- Konfliktauflösungs-UI konkret entwerfen.
- Snapshot-Metadaten (`schemaVersion`, `snapshotId`, Parent-Felder) in der aktuellen Implementierung nachziehen.
- Bestehende automatische Merge-Logik durch Head-Erkennung und Konfliktblockade ersetzen.
- Atomisches Schreiben neuer Snapshot-Dateien im Sync-Provider sicherstellen.
- Schwellwert und Bedienung der Kompaktierung festlegen.
- Profilbilder: Wegen vollständiger Snapshots nicht als Base64 im JSON speichern; Empfehlung: separate Dateien mit Hash/Dateiname im Snapshot referenzieren.
- Nicht mehr benötigte Automerge-Abhängigkeit aus dem Projekt entfernen, sobald der Snapshot-Ansatz vollständig umgesetzt ist.
