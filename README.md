# 🎿 Skirennspiel – Saison 10-0

Draft dir ein Rennteam, fahre eine komplette Weltcup-Saison und versuche, **alle 10 Rennen zu gewinnen**. Inspiriert von Draft-Spielen wie *Era Ball* und *82-0*.

> Eine kurze Anleitung zum Starten gibt es auch als PDF: `GroupX_Instructions.pdf` (bitte `X` durch die Gruppennummer ersetzen).

---

## Schnellstart

**Voraussetzungen:** [Python 3.9+](https://www.python.org/downloads/) (unter Windows bei der Installation „Add Python to PATH“ anhaken), ein Browser und optional [Visual Studio Code](https://code.visualstudio.com/).

1. **ZIP entpacken** – z. B. nach `C:\Projekte\Ski`.
2. **In VS Code öffnen** – *File → Open Folder…* und den entpackten Ordner wählen.
3. **Terminal öffnen** – *Terminal → New Terminal* (`Strg + ö` bzw. `` Ctrl + ` ``).
4. **Abhängigkeit installieren** (nur PyYAML):
   ```bash
   pip install -r requirements.txt
   ```
5. **Spiel starten:**
   ```bash
   python run.py
   ```
   Der Browser öffnet sich automatisch auf <http://127.0.0.1:8000/>. Falls nicht, die Adresse selbst eingeben.
6. **Beenden:** im Terminal `Strg + C`.

Hilfe bei Problemen:

| Problem | Lösung |
|---|---|
| `python` wird nicht gefunden | Unter Windows `py run.py` versuchen, unter macOS/Linux `python3 run.py`. Sonst Python neu installieren und „Add to PATH“ anhaken. |
| `No module named 'yaml'` | Schritt 4 wiederholen (`pip install -r requirements.txt`, ggf. `py -m pip …` bzw. `python3 -m pip …`). |
| Port 8000 ist belegt | Das Spiel probiert automatisch den nächsten freien Port, sonst manuell: `python run.py 9000` und <http://127.0.0.1:9000/> öffnen. |
| Seite bleibt leer | Läuft das Terminal noch? Seite mit `Strg + F5` neu laden. |

Tests ausführen: `python -m unittest discover tests`

---

## Ohne Python: die EXE

`Skirennspiel.exe` doppelklicken – fertig. Python oder andere Downloads sind nicht nötig (Windows 64 Bit). Es öffnet sich ein Konsolenfenster und der Browser; zum Beenden das Konsolenfenster schließen. Spielstände landen im Ordner `saves/` neben der EXE.
Beim ersten Start kann Windows SmartScreen warnen („Weitere Informationen → Trotzdem ausführen“), weil die EXE nicht signiert ist.

EXE selbst bauen (nach Änderungen am Code oder an den Daten):

```bash
pip install pyinstaller
python -m PyInstaller --onefile --name Skirennspiel --add-data "data;data" --add-data "frontend;frontend" run.py
```

Die fertige Datei liegt dann in `dist/`. Änderungen an `data/` oder `frontend/` stecken in der EXE, deshalb nach Änderungen neu bauen.

---

## So wird gespielt

1. **Modus und Epoche wählen**
   - 🃏 *Normaler Draft*: pro Slot 1 aus 3 Karten.
   - 💰 *Cap-Draft*: 1 aus 5 Karten, das Team darf höchstens 95 $ kosten.
   - 📅 *Wochen-Challenge*: Karten, Rennen und Modifikator sind für alle gleich, mit eigener Wochen-Bestenliste.
2. **Draften:** Athlet, Ski, Helm, Brille und Fitness-Coach. Karten gibt es in vier Stufen (Anfänger, Standard, Profi, Legende). 2× neu würfeln ist erlaubt.
3. **Saison ansehen:** Nach dem letzten Pick laufen alle 10 Rennen nacheinander als Zielfoto-Animation ab (überspringbar). Du fährst gegen 9 Rivalen, die im Lauf der Saison stärker werden. Wetter und Zufallsereignisse sorgen für Varianz.
4. **Auswertung:** Weltcup-Punkte (100 für den Sieg), 500 Bonuspunkte für die perfekte Saison, aufklappbare Rennen, Ergebnis zum Kopieren.

Dazu gibt es eine **Kartensammlung**, **14 Erfolge** und **Bestenlisten** (Saison und Wochen-Challenge). Spielstände werden pro Spielername lokal gespeichert.

### Rennformel

```
Geschwindigkeit = Basis × Helm × Brille × Ski × Fitness   (× Athlet × Wetter)
Grundzeit       = Länge / Geschwindigkeit
```

Stufenfaktoren: Anfänger 0,90 · Standard 1,00 · Profi 1,05 · Legende 1,08. Alles Standard bei 2000 m und 20 m/s ergibt 100,00 s, alles Profi 82,27 s (in den Tests geprüft).

**Pflichtausrüstung:** Ohne Helm oder Brille gäbe es einen Ausfall über die blaue Markierung. Im Draft kann das nicht passieren, die Regel steckt aber weiter in der Rennformel.

**Zufallsereignisse:** pro Rennen 3 bis 6 Ereignisse (Tor verpasst +3 s, Ausrutscher +2 s, …, Perfekte Linie −1 s). Ob ein Fehler eintritt, hängt von der Fitness-Stufe ab (30 / 20 / 10 / 5 %), dazu kommen Athlet, Wetter und Epoche. Die Zeitstrafen skalieren mit der Disziplin (Slalom kleiner, Abfahrt größer). Jeder Platz wird pro Rennen nur einmal vergeben.

---

## Projektstruktur

```
data/        Spieldaten in YAML (hier balancieren und erweitern, kein Code nötig)
  game.yaml          Stufen, Faktoren, Draft-Regeln, Starterzahl, Punkte
  eras.yaml          Epochen mit Modifikatoren
  athletes.yaml      Athleten-Karten
  equipment.yaml     Ski-, Helm-, Brillen- und Coach-Karten
  courses.yaml       Disziplinen und der 10-Rennen-Kalender inkl. Rivalenstärke
  weather.yaml  events.yaml  challenges.yaml  achievements.yaml  rivals.yaml
backend/     Python (nur PyYAML als Abhängigkeit)
  data_loader.py     lädt und prüft die YAML-Dateien
  engine.py          Rennformel, Ereignisse, Rivalen, Ranglisten
  season.py          Spielablauf: Draft, Saison, Challenge
  achievements.py    Erfolge
  storage.py         JSON-Speicherstände (saves/)
  server.py          HTTP-Server und JSON-API
frontend/    HTML/CSS/JavaScript ohne Build-Schritt
  js/views/          eine Datei pro Ansicht (home, draft, sim, done, meta)
tests/       Unit-Tests
saves/       Profile und Bestenlisten (werden automatisch angelegt)
run.py       Starter
```

Die Spiellogik läuft komplett im Backend, das Frontend zeigt nur an. Dasselbe Seed ergibt immer dieselben Angebote und Rennen.

### Eigene Inhalte hinzufügen

- **Neue Karte:** Eintrag in `athletes.yaml` bzw. `equipment.yaml` (ID eindeutig, Epoche und Stufe angeben).
- **Neue Strecke:** Eintrag in `courses.yaml`. Die Saisonlänge ergibt sich aus der Anzahl der Einträge.
- **Balance:** `rivalen` in `courses.yaml`, Faktoren und Starterzahl in `game.yaml`. Beim Start wird alles geprüft, Fehler werden mit Dateinamen gemeldet.

Die Namen der Athleten und Rivalen sind frei erfunden.

## Hinweise

- Spielstände liegen in `saves/` (ein Profil pro Spielername, kein Passwort – gedacht für lokales Spielen). Zum Zurücksetzen die Dateien dort löschen.
- Die Dateien `skirennspiel (1).py` und `Skirennspiel (1).html` stammen vom Ursprungsspiel und werden nicht mehr verwendet.
- Die Schriftart wird von Google Fonts geladen; ohne Internet greift eine Systemschrift.
