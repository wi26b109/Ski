"""Rennberechnung: Geschwindigkeit, Zeit, Zufallsereignisse, Rivalenfeld, Platzierung.

Die Grundformel stammt aus dem urspruenglichen Spiel:
    Geschwindigkeit = Basis * Helm * Brille * Ski * Fitness
    Grundzeit       = Laenge / Geschwindigkeit
Neu sind Athlet, Wetter, Upgrades und die Rivalen.
"""



def berechne_rennen(sportler, strecke, rng, data, mit_zufall=True,
                    wetter=None, fehler_zuschlag=0.0, buffs=None):
    """Berechnet ein Rennen fuer einen Sportler.

    sportler: {"helm": Stufe|None, "brille": Stufe|None, "ski": Stufe, "fitness": Stufe,
               optional "athlet_faktor", "fehler_bonus", "speed_bonus"}
    strecke:  {"laenge": m, "speed": m/s, "ereignis_skala": float (optional)}
    buffs:    {"speed": 0.02, "fehler_block": 1} - fuer ein Rennen verbrauchte Upgrades
    Gibt ein dict mit status, zeit, v, grund, ereignisse zurueck.
    """
    buffs = buffs or {}
    ergebnis = {"status": "ok", "zeit": None, "v": None, "grund": None, "ereignisse": []}

    # 1. Pflichtausruestung
    if sportler["helm"] is None or sportler["brille"] is None:
        ergebnis["status"] = "ausfall"
        return ergebnis

    # 2. Geschwindigkeit und Grundzeit
    f = data.tier_faktor
    v = (strecke["speed"] * f(sportler["helm"]) * f(sportler["brille"])
         * f(sportler["ski"]) * f(sportler["fitness"]))
    v *= sportler.get("athlet_faktor", 1.0)
    v *= 1 + sportler.get("speed_bonus", 0.0) + buffs.get("speed", 0.0)
    if wetter:
        v *= wetter["speed"]
    zeit = strecke["laenge"] / v
    ergebnis["v"], ergebnis["grund"] = v, zeit

    # 3. Zufallsereignisse (Fehler treten mit Fehlerchance ein, Bonus mit Gegenchance)
    if mit_zufall:
        chance = data.game["stufen"][sportler["fitness"]]["fehlerchance"]
        chance -= sportler.get("fehler_bonus", 0.0)
        chance += fehler_zuschlag + (wetter["fehler"] if wetter else 0.0)
        chance = min(0.6, max(0.02, chance))
        skala = strecke.get("ereignis_skala", 1.0)
        lim = data.game["ereignisse_pro_rennen"]
        block = buffs.get("fehler_block", 0)
        for _ in range(rng.randint(lim["min"], lim["max"])):
            ev = rng.choice(data.events)
            diff = ev["diff"]
            eintritt = chance if diff > 0 else 1 - chance
            if diff != 0 and rng.random() > eintritt:
                continue
            if diff > 0 and block > 0:
                block -= 1
                ergebnis["ereignisse"].append({"name": ev["name"], "diff": 0, "verhindert": True})
                continue
            diff = round(diff * skala, 2)
            zeit += diff
            ergebnis["ereignisse"].append({"name": ev["name"], "diff": diff})

    ergebnis["zeit"] = round(zeit, 2)
    return ergebnis


def erzeuge_rivalen(rng, data, anzahl):
    """Erzeugt die Rivalen einer Saison. 'skill' ist normalverteilt und bleibt ueber die Saison gleich."""
    r = data.rivals
    namen, rivalen = set(), []
    while len(rivalen) < anzahl:
        name = f"{rng.choice(r['vornamen'])} {rng.choice(r['nachnamen'])}"
        if name in namen:
            continue
        namen.add(name)
        rivalen.append({"name": name, "nation": rng.choice(r["nationen"]),
                        "skill": round(rng.gauss(0, 1), 3)})
    return rivalen


def rivalen_zeiten(rivalen, kurs, rng, data, offset=0.0):
    """Zeiten aller Rivalen fuer einen Kurs."""
    feld = data.game["feld"]
    grund = kurs["laenge"] / kurs["speed"]
    zeiten = []
    for r in rivalen:
        faktor = kurs["rivalen"] + offset + r["skill"] * feld["streuung"] * 0.5
        faktor = max(0.8, faktor)
        zeit = grund / faktor + rng.gauss(0, feld["form_rauschen"] * grund)
        zeiten.append({"name": r["name"], "nation": r["nation"], "zeit": round(max(zeit, 1.0), 2)})
    return zeiten


def rangliste(ergebnisse):
    """Gueltige Zeiten aufsteigend sortieren, Ausfaelle ans Ende (wie im Original)."""
    gueltig = sorted((e for e in ergebnisse if e["zeit"] is not None), key=lambda e: e["zeit"])
    return gueltig + [e for e in ergebnisse if e["zeit"] is None]


def punkte_fuer_platz(platz, data):
    tabelle = data.game["punkte"]
    return tabelle[platz - 1] if 1 <= platz <= len(tabelle) else 0


def muenzen_fuer_platz(platz, data, mult=1.0):
    m = data.game["muenzen"]
    wert = m["basis"]
    if platz == 1:
        wert += m["sieg"]
    elif platz <= 3:
        wert += m["podium"]
    elif platz <= 10:
        wert += m["top10"]
    return int(round(wert * mult))
