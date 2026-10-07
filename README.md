[README.md](https://github.com/user-attachments/files/33165716/README.md)
# Skirennspiel

Ein kleines Skirennspiel: Du wählst Ausrüstung und Fitness, startest das Rennen und bekommst deine Zeit. Die besten Zeiten landen in einer Highscore-Tabelle.

Das Projekt gibt es in zwei Varianten mit derselben Spiellogik:

| Datei | Variante | Highscore wird gespeichert in |
|---|---|---|
| `skirennspiel.py` | Konsole (Python) | `highscores.json` (neben dem Skript) |
| `Skirennspiel.html` | Browser (HTML/JavaScript) | `localStorage` des Browsers |

## Starten

### Python-Version

Voraussetzung: Python 3.8 oder neuer (keine zusätzlichen Pakete nötig).

```bash
python skirennspiel.py
```

Das Programm fragt der Reihe nach:

1. Name
2. Helm, Brille, Ski, Fitness (jeweils eine der angezeigten Möglichkeiten eintippen)
3. Länge der Piste in Metern (Standard: 2000)
4. Basisgeschwindigkeit in m/s (Standard: 20)
5. Zufallsereignisse ja/nein (`j` oder `n`, Standard: `n`)

Danach werden Zeit und Highscore-Tabelle ausgegeben.

### Browser-Version

`Skirennspiel.html` einfach per Doppelklick im Browser öffnen. Es wird kein Server benötigt. Die Schriftart wird von Google Fonts geladen, ohne Internet greift automatisch eine Systemschrift.

## Spielregeln

### Pflichtausrüstung

Ohne **Helm** oder ohne **Brille** fährt der Fahrer über die blaue Markierung und scheidet aus (**Ausfall**). Ausfälle bekommen keine Zeit und kommen nicht in die Highscore-Tabelle.

### Berechnung der Zeit

```
Geschwindigkeit = Basisgeschwindigkeit × Helm × Brille × Ski × Fitness
Grundzeit       = Länge der Piste / Geschwindigkeit
```

Faktoren der Ausrüstungsstufen:

| Stufe | Faktor |
|---|---|
| Anfänger | 0,90 |
| Standard | 1,00 |
| Profi | 1,05 |

Beispiele bei 2000 m und 20 m/s:

- Alles Standard: 20 m/s, Zeit **100,00 s**
- Alles Profi: 24,31 m/s, Zeit **82,27 s**

### Zufallsereignisse (optional)

Wenn aktiviert, passieren pro Rennen zufällig 3 bis 6 Ereignisse, die Sekunden auf die Grundzeit addieren oder abziehen:

| Ereignis | Zeitänderung |
|---|---|
| Tor verpasst | +3 s |
| Ausrutscher | +2 s |
| Zu späte Kurve | +2 s |
| Kurve zu weit | +1 s |
| Perfekte Linie | −1 s |
| Kein Fehler | 0 s |

Ob ein Fehler (Pluszeit) tatsächlich eintritt, hängt von der **Fitness** ab. Ein Bonus (Minuszeit) tritt mit der Gegenwahrscheinlichkeit ein.

| Fitness | Fehlerchance |
|---|---|
| Anfänger | 30 % |
| Standard | 20 % |
| Profi | 10 % |

### Highscore

- Es werden die **10 besten Zeiten** gespeichert (aufsteigend sortiert, schnellste Zeit zuerst).
- Python: Datei `highscores.json` wird automatisch angelegt.
- Browser: Mit dem Button **„Highscores löschen“** wird die Tabelle zurückgesetzt. In der Python-Version genügt es, `highscores.json` zu löschen.

## Aufbau des Codes (Python)

| Funktion | Aufgabe |
|---|---|
| `berechne_rennen()` | Prüft Ausrüstung, berechnet Zeit und würfelt optional Ereignisse |
| `rangliste()` | Sortiert Ergebnisse nach Zeit, Ausfälle kommen ans Ende |
| `lade_highscores()` / `speichere_highscore()` | Lesen und Schreiben der Highscore-Datei |
| `frage()` | Eingabe mit Prüfung auf gültige Antworten |

Die Werte (Faktoren, Fehlerchancen, Ereignisse) stehen als Tabellen am Anfang der Datei und lassen sich dort leicht anpassen. In der HTML-Datei stehen sie am Anfang des `<script>`-Blocks.

## Hinweise

- Die Highscores der beiden Varianten sind voneinander getrennt.
- Im Browser sind die Highscores an Browser und Gerät gebunden. Wird der Browserspeicher geleert, sind sie weg.
