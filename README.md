# Skirennspiel – Saison 10-0

Ein Skirennspiel mit Draft und Saison. Inspiriert von Draft-Spielen wie *Era Ball* und *82-0*: Du stellst per Kartendraft ein Rennteam zusammen und versuchst, **alle 10 Weltcup-Rennen einer Saison zu gewinnen**.

## Starten

Voraussetzung: Python 3.9+ und PyYAML.

```bash
pip install -r requirements.txt
python run.py
```

Der Server startet auf `http://127.0.0.1:8000/` und öffnet den Browser. Anderer Port: `python run.py 9000`.
Tests: `python -m unittest discover tests`.

## Spielablauf

1. **Modus und Epoche wählen**
   - *Normaler Draft*: pro Slot 1 aus 3 Karten.
   - *Cap-Draft*: 1 aus 5 Karten, aber das Team darf höchstens 95 $ kosten.
   - *Wochen-Challenge*: Seed, Epoche und Modifikator hängen an der Kalenderwoche, damit sind Karten und Rennen für alle gleich. Eigene Bestenliste pro Woche.
2. **Draft**: Athlet, Ski, Helm, Brille, Fitness-Coach. Karten gibt es in vier Stufen (Anfänger, Standard, Profi, Legende). 2 Rerolls pro Draft.
3. **Saison**: Nach dem letzten Pick läuft die Saison automatisch ab: Du siehst jedes Rennen als Zielfoto-Animation (überspringbar), danach die Auswertung mit aufklappbaren Rennen. 10 Rennen (Slalom, Riesenslalom, Super-G, Abfahrt) gegen 9 Rivalen, die im Lauf der Saison stärker werden. Wetter und Zufallsereignisse sorgen für Varianz.
4. **Auswertung**: Weltcup-Punkte (100 für den Sieg), Bonus von 500 für die perfekte Saison, Bestenliste, Ergebnis zum Teilen.

Dazu kommen **Kartensammlung** (jede gedraftete Karte wird freigeschaltet), **14 Erfolge** und Lebenszeit-Statistiken pro Spielername.

### Rennformel (unverändert aus dem Original)

```
Geschwindigkeit = Basis × Helm × Brille × Ski × Fitness   (× Athlet × Wetter)
Grundzeit       = Länge / Geschwindigkeit
```

Faktoren: Anfänger 0,90 · Standard 1,00 · Profi 1,05 · neu: Legende 1,08. Alles Standard bei 2000 m und 20 m/s ergibt 100,00 s, alles Profi 82,27 s (beides in den Tests geprüft).

**Pflichtausrüstung:** Ohne Helm oder Brille gibt es einen **Ausfall** über die blaue Markierung. Im Draft kann das nicht passieren, die Regel steckt aber weiter in der Rennformel.

**Zufallsereignisse:** pro Rennen 3 bis 6 Ereignisse (Tor verpasst +3 s, Ausrutscher +2 s, …, Perfekte Linie −1 s). Ob ein Fehler eintritt, hängt von der Fitness-Stufe ab (30 / 20 / 10 / 5 %), dazu kommen Athlet, Wetter und Epoche. Die Zeitstrafen skalieren mit der Disziplin (Slalom kleiner, Abfahrt größer).

## Projektstruktur

```
data/        Spieldaten in YAML (hier balancieren und erweitern, kein Code nötig)
  game.yaml          Stufen, Faktoren, Draft-Regeln, Punkte
  eras.yaml          Epochen mit Modifikatoren
  athletes.yaml      Athleten-Karten
  equipment.yaml     Ski-, Helm-, Brillen- und Coach-Karten
  courses.yaml       Disziplinen und der 10-Rennen-Kalender inkl. Rivalenstärke
  weather.yaml  events.yaml  challenges.yaml  achievements.yaml  rivals.yaml
backend/     Python (nur PyYAML als Abhängigkeit)
  data_loader.py     lädt und prüft die YAML-Dateien
  engine.py          Rennformel, Ereignisse, Rivalen, Ranglisten
  season.py          Spielablauf: Draft, Rennen, Challenge
  achievements.py    Erfolge
  storage.py         JSON-Speicherstände (saves/)
  server.py          HTTP-Server und JSON-API
frontend/    HTML/CSS/JavaScript ohne Build-Schritt
  js/views/          eine Datei pro Ansicht (home, draft, sim, done, meta)
tests/       Unit-Tests
saves/       Profile und Bestenlisten (werden automatisch angelegt)
run.py       Starter
```

Die Spiellogik läuft komplett im Backend; das Frontend zeigt nur an. So lässt sich nicht im Browser schummeln, und dasselbe Seed ergibt immer dieselben Angebote und Rennen.

### Eigene Inhalte hinzufügen

- Neue Karte: Eintrag in `athletes.yaml` bzw. `equipment.yaml` (ID eindeutig, Epoche und Stufe angeben).
- Neue Strecke: Eintrag in `courses.yaml`. Die Saisonlänge ergibt sich aus der Anzahl der Einträge.
- Balance: `rivalen` in `courses.yaml` und die Faktoren in `game.yaml`. Beim Start wird alles geprüft, Fehler werden mit Dateinamen gemeldet.

Die Namen der Athleten und Rivalen sind frei erfunden.

## Hinweise

- Spielstände liegen in `saves/` (ein Profil pro Spielername, kein Passwort – gedacht für lokales Spielen).
- Die alten Dateien `skirennspiel (1).py` und `Skirennspiel (1).html` (das Ursprungsspiel) bleiben unverändert im Ordner, werden aber nicht mehr verwendet.
- Die Schriftart wird von Google Fonts geladen; ohne Internet greift eine Systemschrift.
