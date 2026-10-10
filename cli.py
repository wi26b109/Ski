"""Konsolenversion (Klassik-Modus) - nutzt dieselbe Spiellogik und dieselben YAML-Daten wie die Web-Version.

Aufruf: python cli.py
"""
from backend import season, storage
from backend.data_loader import GameData


def frage(text, moeglich):
    while True:
        antwort = input(f"{text} {moeglich}: ").strip().lower()
        if antwort in moeglich:
            return antwort
        print("Bitte eine der Möglichkeiten eingeben.")


def main():
    data = GameData()
    stufen = list(data.game["stufen"])
    profil = storage.lade_profil(input("Name: "))
    p = {
        "helm": frage("Helm", ["keiner"] + stufen),
        "brille": frage("Brille", ["keine"] + stufen),
        "ski": frage("Ski", stufen),
        "fitness": frage("Fitness", stufen),
        "laenge": input("Länge der Piste (m) [2000]: ") or 2000,
        "speed": input("Basisgeschwindigkeit (m/s) [20]: ") or 20,
        "zufall": input("Zufallsereignisse? (j/n) [n]: ").strip().lower() == "j",
    }
    r, liste = season.klassik_rennen(data, profil, p)
    if r["status"] == "ausfall":
        print(f"\n{r['name']}: Ausfall (über die blaue Markierung gefahren, es fehlt: {' und '.join(r['fehlt'])})")
    else:
        print(f"\n{r['name']}: {r['zeit']} s")
        for e in r["ereignisse"]:
            print(f"  {e['name']}: {e['diff']:+g} s")
    print("\nHighscore-Tabelle")
    for platz, h in enumerate(storage.lade_bestenlisten()["zeiten"], start=1):
        print(f"{platz}. {h['name']}: {h['zeit']} s")


if __name__ == "__main__":
    main()
