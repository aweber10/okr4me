# okr4me

Lokaler OKR-Client auf Basis von React, Vite und Tauri 2.

## Voraussetzungen

- Node.js mit npm
- Rust mit Cargo
- Plattformabhaengige Tauri-Abhaengigkeiten
  - macOS: Xcode Command Line Tools
  - Windows: Microsoft Visual Studio Build Tools mit C++ Desktop-Workload und WebView2 Runtime

Rust installieren:

**Linux / macOS:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Nach der Installation ein neues Terminal oeffnen oder Cargo laden:

```bash
. "$HOME/.cargo/env"
```

**Windows:**
```powershell
winget install Rustlang.Rustup
```
Alternativ [rustup-init.exe](https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe) herunterladen und ausführen.

## Projekt einrichten

```bash
npm install
```

## Entwicklung starten

Browser-/Frontend-Entwicklung:

```bash
npm run dev
```

Vite startet auf `http://127.0.0.1:1420`.

Desktop-App mit Tauri starten:

```bash
npm run tauri dev
```

Der Tauri-Dev-Start ruft automatisch `npm run dev` auf und oeffnet danach das Desktop-Fenster.

## Qualitaetschecks

Frontend- und Domain-Tests:

```bash
npm test
```

Produktionsbuild des Frontends:

```bash
npm run build
```

Rust/Tauri pruefen:

```bash
cd src-tauri
cargo check
```

## Windows-Version bauen

Der verlaesslichste Weg ist der Build direkt auf Windows. Cross-Compiling von macOS nach Windows ist bei Tauri moeglich, aber wegen WebView2, Windows-SDK und Toolchain deutlich aufwendiger und wird hier nicht als Standardweg verwendet.

Auf einem Windows-Rechner:

1. Node.js installieren.
2. Rust installieren: https://rustup.rs/
3. Microsoft Visual Studio Build Tools installieren.
   - Workload: `Desktop development with C++`
   - Windows 10 oder Windows 11 SDK
4. WebView2 Runtime installieren, falls sie nicht bereits vorhanden ist.
5. Repository auschecken und Abhaengigkeiten installieren:

```powershell
npm install
```

6. Tests und Build ausfuehren:

```powershell
npm test
npm run build
npm run tauri build
```

Die gebaute Anwendung liegt danach unter:

```text
src-tauri\target\release\
```

Hinweis: In `src-tauri/tauri.conf.json` ist `bundle.active` aktuell auf `false` gesetzt. Damit wird primaer die Anwendung gebaut. Installer-/Bundle-Artefakte unter `src-tauri\target\release\bundle\` entstehen erst, wenn das Bundling in der Tauri-Konfiguration aktiviert wird.

## Nuetzliche Hinweise

- Das Fenster und Produkt heissen in der Tauri-Konfiguration `okr4me`.
- Die App speichert lokale Daten ueber die Tauri/Rust-Seite und kann fuer die Synchronisation einen Ordner verwenden.
- Bei Problemen mit `tauri: command not found` immer ueber das npm-Skript starten:

```bash
npm run tauri dev
```
