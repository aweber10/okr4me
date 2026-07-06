# Anforderungsbeschreibung: OKR-Werkzeug (lokal, kleines Team)

**Dokumentversion:** 2.0
**Stand:** Juli 2026
**Arbeitstitel:** Ziele und Ergebnisse (ZuE)

---

## Inhaltsverzeichnis

1. [Zielsetzung und Überblick](#1-zielsetzung-und-überblick)
2. [Teilnehmer und Rollen](#2-teilnehmer-und-rollen)
3. [Datenmodell](#3-datenmodell)
4. [Navigationsprinzip und globale Steuerung](#4-navigationsprinzip-und-globale-steuerung)
5. [Funktionale Anforderungen](#5-funktionale-anforderungen)
   - 5.1 [Identität und Ersteinrichtung](#51-identität-und-ersteinrichtung)
   - 5.2 [Profil](#52-profil)
   - 5.3 [Objectives verwalten](#53-objectives-verwalten)
   - 5.4 [Key Results verwalten](#54-key-results-verwalten)
   - 5.5 [Fortschrittserfassung](#55-fortschrittserfassung)
   - 5.6 [Verknüpfungen zwischen Objectives und Key Results](#56-verknüpfungen-zwischen-objectives-und-key-results)
   - 5.7 [Kommentare](#57-kommentare)
   - 5.8 [Änderungsprotokoll](#58-änderungsprotokoll)
   - 5.9 [Ansicht: Meine Ziele](#59-ansicht-meine-ziele)
   - 5.10 [Ansicht: Orgabrowser (Teamansicht)](#510-ansicht-orgabrowser-teamansicht)
   - 5.11 [Ansicht: Verknüpfungsgraph (Relation Map)](#511-ansicht-verknüpfungsgraph-relation-map)
   - 5.12 [Organisationseinheiten (Teams) verwalten](#512-organisationseinheiten-teams-verwalten)
   - 5.13 [Fortschrittsdiagramm](#513-fortschrittsdiagramm)
   - 5.14 [Druckfunktion](#514-druckfunktion)
6. [Nicht-funktionale Anforderungen](#6-nicht-funktionale-anforderungen)
7. [Glossar](#7-glossar)

---

## 1. Zielsetzung und Überblick

Das Werkzeug unterstützt ein einzelnes, überschaubar großes Team (bzw. einen Bereich mit wenigen Teilteams) bei der Einführung und Pflege der OKR-Methode. Mitarbeiter und Teams definieren quartalsweise messbare Ziele (Objectives) mit zugehörigen Schlüsselergebnissen (Key Results) und verfolgen deren Erreichungsgrad.

**Bewusste Abgrenzung gegenüber der Vorgängerlösung:**

- Kein zentraler Server, keine zentrale Datenbank, keine formale Betriebsfreigabe erforderlich. Das Werkzeug läuft als lokal installierte Anwendung auf dem Rechner jedes Teilnehmers.
- Kein Anspruch auf eine unternehmensweite Reporting-Sicht. Der Nutzen liegt in der Unterstützung der täglichen Arbeit einzelner Personen und Teams, nicht in einer zentralen Controlling-Sicht über die gesamte Organisation.
- Das Sicherheitsniveau entspricht bewusst dem einer gemeinsam genutzten Excel-Datei: Jeder Teilnehmer mit Zugriff auf die gemeinsame Datenbasis könnte technisch jede Änderung vornehmen. Das Werkzeug bildet Besitz- und Rollenregeln als Konvention in der Oberfläche ab, erzwingt sie aber nicht kryptografisch oder serverseitig. Dieses Modell wurde von den Führungskräften des Bereichs bereits akzeptiert und wird hier unverändert übernommen.

**Kernfunktionen im Überblick:**

- Anlegen, Bearbeiten und Verwalten von Objectives und Key Results auf Personen- und Teamebene
- Quartalsbezogene Darstellung mit Navigation zwischen Quartalen
- Unterstützung sowohl kurzfristiger Quartalsziele als auch langfristiger strategischer Ziele
- Fortschrittserfassung und -berechnung auf Key-Result- und Objective-Ebene
- Verknüpfung von Key Results mit mehreren Objectives über Team- und Personengrenzen hinweg (Cross-Linking)
- Grafische Visualisierung aller Verknüpfungen als interaktiver Graph
- Mehrsprachigkeit (Deutsch und Englisch)
- Mehrere Teilnehmer arbeiten mit derselben Datenbasis, auch zeitlich versetzt und ohne durchgehende Verbindung zueinander

**Explizit nicht Gegenstand dieses Werkzeugs:** eine unternehmensweite tabellarische Gesamtübersicht aller Objectives und ein separater Personen-Browser zum Durchsuchen fremder Profile. Diese Sichten stiften bei der anvisierten Teamgröße keinen zusätzlichen Nutzen gegenüber der ohnehin vorhandenen Team- und Verknüpfungsansicht und werden bewusst weggelassen, um das Werkzeug klein und wartbar zu halten.

---

## 2. Teilnehmer und Rollen

Es gibt weiterhin zwei Rollen, die aber nicht als Zugriffsschutz, sondern als Konvention zu verstehen sind, die die Oberfläche respektiert:

### 2.1 Standardteilnehmer

- Verwaltet das eigene Profil und die eigene Team-Zugehörigkeit
- Legt eigene Objectives und Key Results an, bearbeitet und löscht sie
- Erfasst den Fortschritt eigener Key Results
- Verknüpft Objectives und Key Results mit denen anderer Teilnehmer
- Schreibt Kommentare auf allen Objectives und Key Results; bearbeitet/löscht eigene Kommentare
- Sieht alle Objectives aller Teilnehmer und Teams (lesend)
- Legt keine Organisationseinheiten an

### 2.2 Koordinator (entspricht der bisherigen Administrator-Rolle)

Hat dieselben fachlichen Möglichkeiten wie der Standardteilnehmer, zusätzlich:

- Verwaltet Organisationseinheiten (anlegen, umbenennen, verschieben, löschen)
- Ist in der Liste der Koordinatoren hinterlegt, die Teil der gemeinsamen Datenbasis ist

**Wichtig:** Die Zuordnung „Koordinator" ist ein Eintrag in der gemeinsamen Datenbasis, kein technisch geschütztes Recht. Die Anwendung blendet koordinatorspezifische Aktionen nur bei entsprechend markierten Teilnehmern ein, verhindert eine widerrechtliche Nutzung aber nicht aktiv. Eine förmliche Benutzerverwaltung mit Anlegen/Deaktivieren/Löschen von Konten, Aktivierungs-E-Mails oder Passwortvergabe entfällt vollständig, da es keine zentrale Kontoverwaltung gibt.

---

## 3. Datenmodell

### 3.1 Teilnehmer

| Attribut | Beschreibung |
|---|---|
| Anzeigename | Pflichtfeld, frei wählbar bei Ersteinrichtung |
| Sprachpräferenz | Deutsch oder Englisch |
| Profilbild | Optionales Bild |
| Tätigkeitsbeschreibung | Freitext, max. 255 Zeichen |
| Über mich | Freitext, max. 255 Zeichen |
| Organisationseinheit | Zugehörigkeit zu genau einer Organisationseinheit (optional) |
| Koordinator | Boolesches Konventions-Flag (siehe 2.2) |

Es gibt bewusst kein Feld für Anmeldename, Passwort, E-Mail oder Aktivierungsstatus – eine klassische Kontoverwaltung entfällt.

### 3.2 Organisationseinheit (Team)

| Attribut | Beschreibung |
|---|---|
| Name | Pflichtfeld |
| Beschreibung | Optionaler Freitext |
| Farbe | Farbwert (Hex) zur visuellen Unterscheidung |
| Übergeordnete Einheit | Selbstreferenz; ermöglicht unbegrenzt tiefe Hierarchiebäume; Wurzelknoten haben keine übergeordnete Einheit |

Organisationseinheiten bilden einen Baum beliebiger Tiefe. Ein Teilnehmer gehört zu genau einer Einheit (optional).

### 3.3 Objective

| Attribut | Beschreibung |
|---|---|
| Beschreibung | Pflichtfeld, max. 255 Zeichen |
| Erstellungsdatum | Automatisch gesetzt |
| Startdatum | Optional |
| Enddatum | Optional |
| Quartal | 1–4 |
| Jahr | Vierstellige Jahreszahl |
| Besitzer (Teilnehmer) | Zugewiesener Teilnehmer (optional) |
| Besitzer (Team) | Zugewiesene Organisationseinheit (optional) |
| Typ | Quartalsziel oder Strategisches Ziel |

Ein Objective gehört entweder einem Teilnehmer oder einer Organisationseinheit. Objectives des Typs „Strategisches Ziel" können mehrere Quartale überspannen. Der **Fortschritt** eines Objectives wird aus den gewichteten Fortschritten der zugehörigen Key Results berechnet.

### 3.4 Key Result

| Attribut | Beschreibung |
|---|---|
| Beschreibung | Pflichtfeld, max. 255 Zeichen |
| Startwert | Ausgangswert für die Fortschrittsmessung |
| Zielwert | Angestrebter Endwert |
| Aktueller Wert | Zuletzt erfasster Wert |
| Schrittgröße | Granularität für die Werteingabe |
| Gewichtung | Relativer Anteil an der Fortschrittsberechnung des übergeordneten Objectives |
| Zieltyp | Freitext-Einheit (z. B. „%", „Mitarbeiter"), max. 20 Zeichen |
| Übergeordnetes Objective | Pflicht-Fremdschlüssel |

### 3.5 Fortschrittsereignis (TimeEvent)

Jede Aktualisierung des aktuellen Werts eines Key Results wird als Fortschrittsereignis gespeichert und enthält Zeitstempel, erfassten Wert und erfassenden Teilnehmer. Diese Ereignisse bilden die Grundlage für den historischen Fortschrittsverlauf.

### 3.6 Verknüpfung (Cross-Link)

Verbindet ein Key Result mit einem oder mehreren Objectives, zu denen es beiträgt, ohne dabei das übergeordnete Objective-Verhältnis zu ändern. Diese m:n-Beziehung ermöglicht teamübergreifende Abhängigkeiten.

### 3.7 Kommentar

| Attribut | Beschreibung |
|---|---|
| Bezugsobjekt | Entweder ein Objective oder ein Key Result |
| Autor | Teilnehmer |
| Text | Freitext |
| Erstellungsdatum | Automatisch gesetzt |
| Änderungsdatum | Automatisch aktualisiert |

### 3.8 Änderungsprotokolleintrag

| Attribut | Beschreibung |
|---|---|
| Bezugsobjekt | Objective oder Key Result |
| Typ der Aktion | Erstellen, Bearbeiten, Löschen |
| Ausführender Teilnehmer | |
| Beschreibung | Menschenlesbare Zusammenfassung der Änderungen (Felddiff) |
| Zeitstempel | Automatisch gesetzt |

Das Änderungsprotokoll muss auch dann vollständig und lückenlos bleiben, wenn mehrere Teilnehmer zeitlich versetzt und ohne durchgehende Verbindung zueinander arbeiten und ihre Änderungen erst später zusammengeführt werden.

---

## 4. Navigationsprinzip und globale Steuerung

### 4.1 Hauptnavigation

Die Anwendung ist in drei Hauptansichten gegliedert, die über eine dauerhaft sichtbare Navigationsleiste erreichbar sind:

| Bezeichnung | Beschreibung |
|---|---|
| Meine Ziele | Eigene Objectives des Teilnehmers |
| Orgabrowser | Teamhierarchie mit teamspezifischen Objectives |
| Verknüpfungsgraph | Grafische Darstellung aller Verknüpfungen |

### 4.2 Quartalswähler

Ein globaler Quartalswähler ist dauerhaft in der Benutzeroberfläche sichtbar. Er zeigt das aktuell betrachtete Quartal (z. B. „3. Quartal 2026") und erlaubt die Navigation zum vorherigen oder nächsten Quartal per Schaltfläche. Beim Start ist das aktuelle Quartal vorausgewählt. Der Quartalswähler beeinflusst alle Ansichten gleichzeitig.

### 4.3 Schreibschutz vergangener Quartale

Für vergangene Quartale sind alle Bearbeitungs- und Erstellungsfunktionen gesperrt. Eine sichtbare Hinweismeldung informiert den Teilnehmer darüber. Die Lesefunktion bleibt in allen Quartalen verfügbar.

---

## 5. Funktionale Anforderungen

### 5.1 Identität und Ersteinrichtung

- Beim ersten Start fragt die Anwendung nach einem Anzeigenamen.
- Optional verknüpft die Anwendung diesen intern mit dem Windows-Anmeldenamen des Teilnehmers (rein informativ, keine Authentifizierungsfunktion).
- Es gibt keine Anmeldung mit Passwort, keine Selbstregistrierung mit E-Mail-Aktivierung, kein Passwort zurücksetzen und keine Sitzungsverwaltung – all das entfällt, da es kein zentrales Konto gibt.
- Die einmal vergebene Identität bleibt stabil, auch wenn der Anzeigename später geändert wird, damit ältere Einträge (Besitz, Kommentare, Änderungsprotokoll) korrekt zugeordnet bleiben.

### 5.2 Profil

- Anzeige von Name, Profilbild (oder Platzhalter), Organisationseinheit, Tätigkeitsbeschreibung und „Über mich"
- Liste der eigenen Objectives mit aufklappbaren Key Results
- Bearbeitung aller Profilfelder, Auswahl der Sprachpräferenz, Zuordnung zu einer Organisationseinheit (Autocomplete-Suche)

### 5.3 Objectives verwalten

**Anlegen:** Beschreibung (Pflichtfeld, max. 255 Zeichen), Typ (Quartalsziel mit automatischem Start-/Enddatum oder Strategisches Ziel mit manueller Datumsauswahl über mehrere Quartale). Objectives werden dem angemeldeten Teilnehmer zugeordnet.

**Bearbeiten:** Inline-Bearbeitung der Beschreibung per Doppelklick; Vollformular über ein Kontextmenü.

**Löschen:** Über Kontextmenü mit Bestätigungsschritt. Kaskadierendes Löschen aller zugehörigen Key Results, Fortschrittsereignisse und Kommentare.

**Zuweisen:** Ein Objective kann einem anderen Teilnehmer oder einer Organisationseinheit zugewiesen werden (Autocomplete-Suche, gegenseitig ausschließend).

**Verknüpfungen verwalten:** siehe 5.6.

**Änderungsprotokoll einsehen:** über das Kontextmenü, chronologische Liste aller Änderungen mit Teilnehmer, Zeitstempel und Felddiff.

### 5.4 Key Results verwalten

**Anlegen:** Beschreibung (Pflichtfeld, max. 255 Zeichen); erweiterte, ein-/ausblendbare Felder: Startwert, Zielwert, Zieltyp (max. 20 Zeichen), Schrittgröße, Gewichtung.

**Bearbeiten:** Inline per Doppelklick oder über Kontextmenü, alle Felder änderbar.

**Löschen:** über Kontextmenü, löscht zugehörige Fortschrittsereignisse und Kommentare mit.

**Änderungsprotokoll einsehen:** analog zu Objectives.

### 5.5 Fortschrittserfassung

Für jedes Key Result kann der aktuelle Wert direkt in der Listenansicht erfasst werden:

- **Schieberegler:** von Startwert bis Zielwert in konfigurierter Schrittgröße, bei absteigendem Ziel invertiert
- **Texteingabe:** Direkteingabe, Anzeige als „Aktueller Wert / Zielwert Einheit"
- **Bestätigung:** erst nach Bestätigung wird der Wert gespeichert; Abbruch setzt auf den zuletzt gespeicherten Wert zurück
- **Automatische Protokollierung:** jede Wertänderung erzeugt ein Fortschrittsereignis mit Zeitstempel und Teilnehmerreferenz
- **Sperrung:** gesperrt, wenn der Zeitraum des übergeordneten Objectives abgelaufen ist

**Fortschrittsberechnung:**

1. Wertebereich: `max(Startwert, Zielwert) − min(Startwert, Zielwert)`
2. Zurückgelegte Strecke: `|Aktueller Wert − Startwert|`
3. Prozentualer Fortschritt: `min((Strecke / Bereich) × 100, 100) × Gewichtung`

Der Fortschritt eines Objectives ist die Summe der gewichteten Key-Result-Fortschritte, dividiert durch die Gesamtgewichtung aller Key Results. Haben alle Key Results identischen Start- und Zielwert (Bereich = 0), gilt der Fortschritt als 100 %.

### 5.6 Verknüpfungen zwischen Objectives und Key Results

- Ein Key Result kann mit einem oder mehreren Objectives verknüpft sein, zu denen es beiträgt (zusätzlich zur Eltern-Kind-Beziehung)
- Ein Objective kann mehrere beitragende Key Results aus anderen Objectives oder Teams aufweisen
- Verwaltung über eine Verknüpfungsschaltfläche mit Badge (Anzahl der Verknüpfungen); Dialog zeigt alle bestehenden Verknüpfungen mit Name, Besitzer und Fortschritt; neue Verknüpfungen über filterbare Auswahl (nach Teilnehmer oder Team); bestehende Verknüpfungen einzeln entfernbar
- Diese Verknüpfungen werden im Verknüpfungsgraph visualisiert

### 5.7 Kommentare

- Aufruf über Kommentarschaltfläche mit Badge (Anzahl)
- Dialog zeigt alle Kommentare mit Autorname und Erstellungszeitpunkt
- Neuen Kommentar verfassen: Texteingabe, Schaltfläche deaktiviert solange leer
- Eigene Kommentare bearbeiten (Inline-Formular) und löschen (mit Bestätigung)
- Die Oberfläche bietet Bearbeiten/Löschen nur bei eigenen Kommentaren an; dies ist eine Konvention der Oberfläche, keine technisch erzwungene Schreibsperre

### 5.8 Änderungsprotokoll

Jede Erstellungs-, Bearbeitungs- oder Löschoperation auf Objectives und Key Results wird automatisch protokolliert: Art der Aktion, ausführender Teilnehmer, Zeitstempel, menschenlesbare Zusammenfassung der geänderten Felder (Vorher/Nachher). Das Protokoll ist für jedes Objective und jedes Key Result separat über das Kontextmenü einsehbar und bleibt auch nach Zusammenführung von Änderungen mehrerer Teilnehmer vollständig nachvollziehbar.

### 5.9 Ansicht: Meine Ziele

Zeigt ausschließlich die Objectives des angemeldeten Teilnehmers für das ausgewählte Quartal:

- Gesamtfortschritt des Teilnehmers für das Quartal in Prozent
- Aufklappbare Liste der eigenen Objectives mit Beschreibung, Fortschrittsbalken, Key Results mit Fortschrittserfassung (bei bearbeitbarem Quartal), Kontextmenü für Objective-Aktionen
- Zusätzlicher, nur lesender Abschnitt mit den Objectives der eigenen Organisationseinheit (falls zugeordnet)
- Hinweismeldung, wenn das gewählte Quartal in der Vergangenheit liegt

**Aktionen (nur im aktuellen/zukünftigen Quartal):** Objective anlegen/bearbeiten/löschen/zuweisen/verknüpfen; Key Result anlegen/bearbeiten/löschen/Fortschritt erfassen.

### 5.10 Ansicht: Orgabrowser (Teamansicht)

Zweispaltiges Layout:

**Linke Spalte – Organisationsbaum:** aufklappbarer, hierarchischer Baum aller Organisationseinheiten; aktuell ausgewählte Einheit hervorgehoben; Tooltip mit Beschreibung; Auswahl lädt Objectives rechts; beim Aufruf wird die eigene Einheit vorausgewählt (falls vorhanden); Direktaufruf einer Einheit über URL-Parameter möglich.

**Koordinatoren-Aktionen** (in der Oberfläche nur für als Koordinator markierte Teilnehmer sichtbar, siehe 2.2): neue Wurzel-Organisationseinheit anlegen, Untereinheit hinzufügen, Einheit bearbeiten (Name, Farbe, Beschreibung), Einheit löschen (nur Blattknoten), Einheit per Drag-and-Drop verschieben (zirkuläre Hierarchien werden verhindert).

**Rechte Spalte – Objectives der ausgewählten Einheit:** Abschnitte „Quartalsziele" und „Strategische Ziele", vollständige CRUD-Operationen bei bearbeitbarem Quartal.

### 5.11 Ansicht: Verknüpfungsgraph (Relation Map)

Interaktiver, kräftebasierter Graph, der alle Objectives und Key Results des ausgewählten Quartals sowie ihre Beziehungen visualisiert.

**Knotentypen:** Objective (größere Knoten), Key Result (kleinere Knoten).

**Kantentypen:** Eltern-Kind-Kante (Key Result gehört zu Objective), Verknüpfungs-Kante (Cross-Link).

**Interaktion:** Knoten per Drag-and-Drop verschiebbar, Kraftsimulation passt sich an; Graph zoom- und schwenkbar; aktualisiert sich beim Quartalswechsel automatisch.

**Knoteninhalt:** mindestens Beschreibung, aktueller und Zielwert, Besitzer (Teilnehmer/Team), Einheit, Fortschritt.

### 5.12 Organisationseinheiten (Teams) verwalten

*(Aktionen in der Oberfläche für Koordinatoren vorgesehen, siehe 2.2)*

- **Anlegen:** Name (Pflicht), Beschreibung (optional), Farbe
- **Bearbeiten:** alle Felder nachträglich änderbar
- **Löschen:** nur bei Blattknoten (Fehlermeldung bei Verstoß)
- **Verschieben:** Drag-and-Drop im Organisationsbaum, zirkuläre Hierarchien werden verhindert
- **Hierarchie:** unbegrenzte Tiefe, Untereinheiten erben keine Objectives automatisch

### 5.13 Fortschrittsdiagramm

Für jedes Objective mit Key Results und aufgezeichneten Fortschrittsereignissen wird ein Linienchart angezeigt: eine Linie pro Key Result, X-Achse Kalenderwochen, Y-Achse Prozentualer Fortschritt (0–100 %), Startpunkt 0 % am Startdatum, Endpunkt letzter bekannter Wert bis zum Enddatum.

### 5.14 Druckfunktion

In der Ansicht „Meine Ziele" und im Orgabrowser ist eine Druckschaltfläche verfügbar. Bei Betätigung werden alle Accordion-Elemente aufgeklappt und der Druckdialog des Betriebssystems geöffnet. Das Layout ist für den Druck optimiert.

---

## 6. Nicht-funktionale Anforderungen

### 6.1 Mehrbenutzerfähigkeit ohne zentralen Server

- Mehrere Teilnehmer arbeiten mit derselben Datenbasis, auch zeitlich versetzt und ohne durchgehende Verbindung zueinander.
- Änderungen unterschiedlicher Teilnehmer müssen sich automatisch und konfliktfrei zu einem gemeinsamen, konsistenten Stand zusammenführen lassen, ohne dass ein Teilnehmer manuell Konflikte auflösen muss.

### 6.2 Mehrsprachigkeit

- Die Benutzeroberfläche ist vollständig auf Deutsch und Englisch verfügbar.
- Die Sprachauswahl erfolgt pro Teilnehmer und wird im Profil gespeichert.

### 6.3 Zugänglichkeit und Bedienbarkeit

- Die Anwendung ist eine lokal installierte Desktop-Anwendung; kein Serverbetrieb, keine formale Betriebsfreigabe notwendig.
- Die Installation und der erste Start sind ohne Entwicklerwerkzeuge oder besondere IT-Kenntnisse möglich.
- Die Benutzeroberfläche muss auf gängigen Desktop-Bildschirmauflösungen gut bedienbar sein.
- Interaktive Elemente (Schieberegler, Drag-and-Drop, Zoom) müssen reaktionsschnell und intuitiv sein.

### 6.4 Datenkonsistenz

- Kaskadierendes Löschen muss sicherstellen, dass keine verwaisten Datensätze entstehen, auch wenn die Löschung durch einen Teilnehmer erfolgte, der offline war.
- Fortschrittsberechnungen müssen zu jedem Zeitpunkt aus dem jeweils lokal vorliegenden Stand korrekt und konsistent berechenbar sein.

### 6.5 Sicherheit

- Es findet keine Authentifizierung im klassischen Sinn statt. Das Sicherheitsniveau entspricht bewusst dem einer gemeinsam genutzten Excel-Datei: Jeder Teilnehmer mit Zugriff auf die gemeinsame Datenbasis kann diese technisch verändern.
- Besitz- und Rollenregeln (eigene Objectives, Koordinatorrechte) werden von der Anwendung als Konvention in der Bedienoberfläche abgebildet (Aktionen werden ein-/ausgeblendet), aber nicht technisch erzwungen.
- Dieses Sicherheitsniveau ist eine bewusste, akzeptierte Entscheidung und kein zu schließendes Sicherheitsrisiko im Rahmen dieses Werkzeugs.

### 6.6 Audit-Fähigkeit

- Alle inhaltlichen Änderungen an Objectives und Key Results werden vollständig protokolliert, auch über zeitlich versetzte Bearbeitung mehrerer Teilnehmer hinweg.
- Das Protokoll bleibt nach Zusammenführung mehrerer Teilnehmerstände lückenlos und in korrekter zeitlicher Reihenfolge nachvollziehbar.

---

## 7. Glossar

| Begriff | Erklärung |
|---|---|
| **Objective** | Ein qualitatives, inspirierendes Ziel, das in einem bestimmten Zeitraum erreicht werden soll |
| **Key Result (KR)** | Ein messbares Ergebnis, das den Fortschritt in Richtung eines Objectives quantifiziert |
| **Quartalsziel** | Ein Objective, das auf einen einzelnen Quartalszeitraum beschränkt ist |
| **Strategisches Ziel** | Ein Objective, das mehrere Quartale umspannt und langfristige Ausrichtung widerspiegelt |
| **Cross-Link** | Eine Verknüpfung zwischen einem Key Result und einem Objective, das nicht sein direktes Eltern-Objective ist |
| **Relation Map** | Grafische Darstellung aller Objectives und Key Results sowie ihrer Verknüpfungen als interaktiver Netzwerkgraph |
| **Organisationseinheit (OE)** | Struktureinheit innerhalb der Organisation (Team, Abteilung, Bereich); bildet eine hierarchische Baumstruktur |
| **Fortschrittsereignis** | Aufgezeichneter Wert eines Key Results zu einem bestimmten Zeitpunkt; Grundlage für den Fortschrittsverlauf |
| **Gewichtung** | Relativer Anteil eines Key Results an der Gesamtfortschrittsberechnung seines Objectives |
| **Schrittgröße (Granularität)** | Minimale Schrittweite bei der Werteingabe eines Key Results |
| **Startwert** | Ausgangswert eines Key Results (Baseline) |
| **Zielwert** | Angestrebter Endwert eines Key Results |
| **Zieltyp** | Freitext-Einheit des Key-Result-Werts (z. B. „%", „Stück", „Mitarbeiter") |
| **Koordinator** | Konventionelle Rolle mit erweiterten Möglichkeiten in der Team-Verwaltung; nicht technisch erzwungen |
| **Lokale Identität** | Stabile, lokal erzeugte Kennung eines Teilnehmers, unabhängig vom änderbaren Anzeigenamen |