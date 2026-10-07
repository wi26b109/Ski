"""Skirennspiel - Zeitberechnung und Rangliste."""
import json
import random

# --- Wertetabelle (Faktoren) ------------------------------------------------
# None bedeutet: Ausfall (Fahrer faehrt ueber die blaue Markierung)
STUFEN = {"anfaenger": 0.90, "standard": 1.00, "profi": 1.05}
FAKTOREN = {
    "helm":    {"keiner": None, **STUFEN},
    "brille":  {"keine": None, **STUFEN},
    "ski":     dict(STUFEN),
    "fitness": dict(STUFEN),
}

# Chance, dass ein Fehler passiert (abhaengig von der Fitness)
FEHLERCHANCE = {"anfaenger": 0.30, "standard": 0.20, "profi": 0.10}

# Ereignisliste: (Name, Zeitdifferenz in Sekunden)
EREIGNISSE = [
    ("Tor verpasst", +3),
    ("Ausrutscher", +2),
    ("Kurve zu weit", +1),
    ("Zu spaete Kurve", +2),
    ("Perfekte Linie", -1),
    ("Kein Fehler", 0),
]


def berechne_rennen(sportler, strecke, mit_zufall=False, ereignisse=EREIGNISSE):
    """Berechnet Status, Gesamtzeit und eingetretene Ereignisse eines Sportlers."""
    ergebnis = {"name": sportler["name"], "status": "ok",
                "zeit": None, "ereignisse": []}

    # 1. Pflichtausruestung pruefen
    helm = FAKTOREN["helm"][sportler["helm"]]
    brille = FAKTOREN["brille"][sportler["brille"]]
    if helm is None or brille is None:
        ergebnis["status"] = "Ausfall (ueber blaue Markierung gefahren)"
        return ergebnis

    # 2. Geschwindigkeit und Grundzeit
    geschwindigkeit = (strecke["basisgeschwindigkeit"] * helm * brille
                       * FAKTOREN["ski"][sportler["ski"]]
                       * FAKTOREN["fitness"][sportler["fitness"]])
    zeit = strecke["laenge"] / geschwindigkeit

    # 3. Zufallsereignisse (optional)
    fehlerchance = FEHLERCHANCE[sportler["fitness"]]
    anzahl = random.randint(3, 6) if mit_zufall else 0
    for _ in range(anzahl):
        name, differenz = random.choice(ereignisse)
        # Fehler (+) treten mit Fehlerchance auf, Bonus (-) mit Gegenchance
        chance = fehlerchance if differenz > 0 else 1 - fehlerchance
        if differenz == 0 or random.random() <= chance:
            zeit += differenz
            ergebnis["ereignisse"].append((name, differenz))

    ergebnis["zeit"] = round(zeit, 2)
    return ergebnis


def rangliste(ergebnisse):
    """Gueltige Zeiten aufsteigend sortieren, Ausfaelle ans Ende."""
    gueltig = sorted((e for e in ergebnisse if e["zeit"] is not None),
                     key=lambda e: e["zeit"])
    ausgefallen = [e for e in ergebnisse if e["zeit"] is None]
    return gueltig + ausgefallen


HIGHSCORE_DATEI = "highscores.json"


def lade_highscores():
    try:
        with open(HIGHSCORE_DATEI, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def speichere_highscore(name, zeit, anzahl=10):
    """Neue Zeit eintragen, sortieren, nur die besten `anzahl` behalten."""
    liste = lade_highscores()
    liste.append({"name": name, "zeit": zeit})
    liste = sorted(liste, key=lambda e: e["zeit"])[:anzahl]
    with open(HIGHSCORE_DATEI, "w", encoding="utf-8") as f:
        json.dump(liste, f, ensure_ascii=False, indent=2)
    return liste


def frage(text, moeglich):
    while True:
        antwort = input(f"{text} {moeglich}: ").strip().lower()
        if antwort in moeglich:
            return antwort
        print("Bitte eine der Möglichkeiten eingeben.")


if __name__ == "__main__":
    name = input("Name: ").strip() or "Spieler"
    sportler = {
        "name": name,
        "helm": frage("Helm", list(FAKTOREN["helm"])),
        "brille": frage("Brille", list(FAKTOREN["brille"])),
        "ski": frage("Ski", list(FAKTOREN["ski"])),
        "fitness": frage("Fitness", list(FAKTOREN["fitness"])),
    }
    strecke = {
        "laenge": float(input("Länge der Piste (m) [2000]: ") or 2000),
        "basisgeschwindigkeit": float(input("Basisgeschwindigkeit (m/s) [20]: ") or 20),
    }
    zufall = input("Zufallsereignisse? (j/n) [n]: ").strip().lower() == "j"

    e = berechne_rennen(sportler, strecke, mit_zufall=zufall)
    if e["zeit"] is None:
        print(f"\n{e['name']}: {e['status']}")
    else:
        print(f"\n{e['name']}: {e['zeit']} s  {e['ereignisse']}")
        speichere_highscore(e["name"], e["zeit"])

    print("\nHighscore-Tabelle")
    for platz, h in enumerate(lade_highscores(), start=1):
        print(f"{platz}. {h['name']}: {h['zeit']} s")
