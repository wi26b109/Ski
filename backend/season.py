"""Spielablauf einer Saison: Draft -> 10 Rennen -> Abschluss.

Ein "run" ist ein einfaches dict (gut als JSON speicherbar). Alle Zufaelle kommen aus einem
Seed, daher ergibt dasselbe Seed (Wochen-Challenge) fuer alle Spieler dieselben Angebote und Rennen.
"""
import datetime
import random
import secrets

from . import achievements, engine, storage


class GameError(Exception):
    """Ungueltige Aktion des Spielers (wird als 400 an das Frontend gegeben)."""


# --- Challenge ------------------------------------------------------------------

def challenge_info(data, heute=None):
    heute = heute or datetime.date.today()
    jahr, woche, _ = heute.isocalendar()
    idx = jahr * 53 + woche
    mod = data.challenge_mods[idx % len(data.challenge_mods)]
    era = data.challenge_eras[(idx // len(data.challenge_mods)) % len(data.challenge_eras)]
    return {"woche": f"{jahr}-W{woche:02d}", "era": era, "modifikator": mod,
            "cap": mod.get("cap", data.game["draft"]["cap"])}


# --- Start ----------------------------------------------------------------------

def neuer_run(data, profil, mode, era):
    if mode not in ("normal", "cap", "challenge"):
        raise GameError("Unbekannter Modus.")
    mod, woche, cap = {}, None, None
    if mode == "challenge":
        info = challenge_info(data)
        era, mod, woche = info["era"], info["modifikator"], info["woche"]
        seed = f"challenge-{woche}"
        cap = info["cap"]
    else:
        seed = secrets.token_hex(6)
        if mode == "cap":
            cap = data.game["draft"]["cap"]
    if era not in data.eras:
        raise GameError("Unbekannte Epoche.")

    em = data.eras[era]["modifikator"]
    mods = {"fehler": em["fehler"], "rivalen": em["rivalen"] + mod.get("rivalen", 0.0), "wetter": mod.get("wetter")}
    rng = random.Random(f"{seed}|rivalen")
    run = {
        "id": secrets.token_hex(4), "mode": mode, "era": era, "seed": seed, "woche": woche,
        "status": "draft", "slot_index": 0, "offers": [], "rerolls": data.game["draft"]["rerolls"],
        "reroll_zaehler": 0, "cap": cap, "budget": cap, "team": {}, "race_index": 0,
        "results": [], "mods": mods, "mod_name": mod.get("name"),
        "rivalen": engine.erzeuge_rivalen(rng, data, data.game["feld"]["groesse"] - 1),
        "punkte": 0, "siege": 0, "podien": 0, "serie": 0, "beste_serie": 0, "bonus": 0,
    }
    _neue_angebote(run, data)
    profil["run"] = run
    return run


# --- Draft ----------------------------------------------------------------------

def _gewichtet_ziehen(rng, karten, gewichte, n):
    karten, gewichte, ergebnis = list(karten), list(gewichte), []
    for _ in range(min(n, len(karten))):
        i = rng.choices(range(len(karten)), weights=gewichte)[0]
        ergebnis.append(karten.pop(i))
        gewichte.pop(i)
    return ergebnis


def _min_kosten(data):
    return min(s["kosten"] for s in data.game["stufen"].values())


def _neue_angebote(run, data):
    slots = data.game["draft_slots"]
    slot = slots[run["slot_index"]]
    pool = data.pool(slot, run["era"])
    if run["cap"] is not None:  # nur Karten, bei denen die restlichen Slots noch bezahlbar bleiben
        uebrig = len(slots) - run["slot_index"] - 1
        grenze = run["budget"] - uebrig * _min_kosten(data)
        pool = [k for k in pool if k["kosten"] <= grenze]
    n = data.game["draft"]["optionen_cap" if run["cap"] is not None else "optionen_normal"]
    rng = random.Random(f"{run['seed']}|draft|{slot}|{run['reroll_zaehler']}")
    gewichte = [data.game["stufen"][k["tier"]]["gewicht"] for k in pool]
    angebot = _gewichtet_ziehen(rng, pool, gewichte, n)
    if not any(k["tier"] == "anfaenger" for k in angebot):  # immer eine bezahlbare Notloesung
        billig = min(pool, key=lambda k: k["kosten"])
        angebot[-1] = billig
    run["offers"] = [k["id"] for k in angebot]


def reroll(run, data):
    if run["status"] != "draft":
        raise GameError("Kein Draft aktiv.")
    if run["rerolls"] <= 0:
        raise GameError("Keine Rerolls mehr übrig.")
    run["rerolls"] -= 1
    run["reroll_zaehler"] += 1
    _neue_angebote(run, data)


def pick(run, data, profil, card_id):
    if run["status"] != "draft":
        raise GameError("Kein Draft aktiv.")
    if card_id not in run["offers"]:
        raise GameError("Diese Karte steht nicht zur Auswahl.")
    karte = data.cards[card_id]
    run["team"][karte["slot"]] = {"id": card_id, "tier": karte["tier"]}
    if run["cap"] is not None:
        run["budget"] -= karte["kosten"]
    if card_id not in profil["karten"]:
        profil["karten"].append(card_id)
    run["slot_index"] += 1
    run["reroll_zaehler"] += 1
    if run["slot_index"] >= len(data.game["draft_slots"]):
        run["status"] = "season"
        run["offers"] = []
    else:
        _neue_angebote(run, data)
    return achievements.pruefe(data, profil, run)


# --- Rennen ---------------------------------------------------------------------

def _sportler(run, data, kurs):
    team = run["team"]
    athlet = data.cards[team["athlet"]["id"]]
    tier = team["athlet"]["tier"]
    return {
        "helm": team["helm"]["tier"], "brille": team["brille"]["tier"],
        "ski": team["ski"]["tier"], "fitness": team["fitness"]["tier"],
        "athlet_faktor": data.game["athlet_faktoren"][tier] * athlet["profil"][kurs["disziplin"]],
        "fehler_bonus": athlet.get("fehler_bonus", 0.0),
    }


def _wetter(run, data, rng):
    if run["mods"]["wetter"]:
        return data.weather[run["mods"]["wetter"]]
    w = list(data.weather.values())
    return rng.choices(w, weights=[x["gewicht"] for x in w])[0]


def fahre_rennen(run, data, profil):
    if run["status"] != "season":
        raise GameError("Es läuft keine Saison.")
    idx = run["race_index"]
    kurs = data.season[idx]
    disz = data.disciplines[kurs["disziplin"]]
    rng = random.Random(f"{run['seed']}|rennen|{idx}")
    wetter = _wetter(run, data, rng)

    sportler = _sportler(run, data, kurs)
    strecke = {"laenge": kurs["laenge"], "speed": kurs["speed"], "ereignis_skala": disz["ereignis_skala"]}
    r = engine.berechne_rennen(sportler, strecke, rng, data, True, wetter,
                               run["mods"]["fehler"])
    rivalen = engine.rivalen_zeiten(run["rivalen"], kurs, rng, data, run["mods"]["rivalen"])
    engine.zeiten_eindeutig(rivalen, r["zeit"])
    platz = 1 + sum(1 for x in rivalen if x["zeit"] < r["zeit"])
    bester_rivale = min(x["zeit"] for x in rivalen)
    abstand = round(bester_rivale - r["zeit"], 2)  # >0: Sieg mit Vorsprung

    punkte = engine.punkte_fuer_platz(platz, data)
    run["punkte"] += punkte
    if platz == 1:
        run["siege"] += 1
        run["serie"] += 1
        run["beste_serie"] = max(run["beste_serie"], run["serie"])
    else:
        run["serie"] = 0
    if platz <= 3:
        run["podien"] += 1

    feld = engine.rangliste([{"name": profil["name"], "nation": None, "zeit": r["zeit"], "du": True}] + rivalen)
    for i, e in enumerate(feld, start=1):
        e["platz"] = i
    ergebnis = {
        "kurs": kurs["id"], "wetter": wetter["id"], "zeit": r["zeit"], "platz": platz,
        "punkte": punkte, "geschwindigkeit": round(r["v"], 2),
        "grundzeit": round(r["grund"], 2), "ereignisse": r["ereignisse"], "abstand": abstand,
        "feld": feld,
    }
    run["results"].append(ergebnis)
    run["race_index"] += 1

    s = profil["stats"]
    s["rennen"] += 1
    s["podien"] += platz <= 3
    if platz == 1:
        s["siege"] += 1
        s["max_vorsprung"] = max(s["max_vorsprung"], abstand)
        s["foto"] += abstand < 0.1

    fertig = run["race_index"] >= len(data.season)
    if fertig:
        _saison_beenden(run, data, profil)
    return ergebnis, achievements.pruefe(data, profil, run)


def simuliere_saison(run, data, profil):
    """Faehrt alle noch offenen Rennen am Stueck. Gibt die neu freigeschalteten Erfolge zurueck."""
    neu = []
    while run["status"] == "season":
        neu += fahre_rennen(run, data, profil)[1]
    return neu


def _saison_beenden(run, data, profil):
    run["status"] = "done"
    perfekt = run["siege"] == len(data.season)
    if perfekt:
        run["bonus"] = data.game["perfekte_saison_bonus"]
        run["punkte"] += run["bonus"]
    s = profil["stats"]
    s["saisons"] += 1
    s["perfekt"] += perfekt
    s["challenges"] += run["mode"] == "challenge"
    s["beste_punkte"] = max(s["beste_punkte"], run["punkte"])
    eintrag = {"name": profil["name"], "punkte": run["punkte"], "siege": run["siege"],
               "podien": run["podien"], "era": run["era"], "modus": run["mode"],
               "woche": run["woche"], "datum": datetime.date.today().isoformat()}
    n = data.game["highscore_eintraege"]
    if run["mode"] == "challenge":
        storage.trage_ein("challenge", eintrag, "punkte", True, n * 20,
                          gleich=lambda e: e["name"] == profil["name"] and e["woche"] == run["woche"])
    else:
        storage.trage_ein("saison", eintrag, "punkte", True, n)


# --- Ansicht fuer das Frontend ----------------------------------------------------

def run_ansicht(run):
    """Der Run ohne interne Daten (Rivalen-Skill)."""
    return {k: v for k, v in run.items() if k != "rivalen"}


# --- Klassik-Modus (das urspruengliche Spiel) -------------------------------------

def klassik_rennen(data, profil, p):
    """Ein einzelnes Rennen mit frei gewaehlter Ausruestung - wie im ersten Spiel."""
    stufen = data.game["stufen"]

    def waehle(wert, pflicht, leer):
        if wert == leer and pflicht:
            return None
        if wert not in stufen:
            raise GameError("Ungültige Ausrüstung.")
        return wert

    def zahl(schluessel, lo, hi, std):
        try:
            return min(hi, max(lo, float(p.get(schluessel, std))))
        except (TypeError, ValueError):
            return std

    sportler = {"helm": waehle(p.get("helm"), True, "keiner"),
                "brille": waehle(p.get("brille"), True, "keine"),
                "ski": waehle(p.get("ski"), False, None),
                "fitness": waehle(p.get("fitness"), False, None)}
    strecke = {"laenge": zahl("laenge", 100, 20000, 2000), "speed": zahl("speed", 1, 100, 20)}
    mit_zufall = bool(p.get("zufall"))
    r = engine.berechne_rennen(sportler, strecke, random.Random(), data, mit_zufall)
    r["name"] = profil["name"]
    if r["status"] == "ausfall":
        fehlt = [n for n, k in (("Helm", "helm"), ("Brille", "brille")) if sportler[k] is None]
        r["fehlt"] = fehlt
        return r, None
    r["v"], r["grund"] = round(r["v"], 2), round(r["grund"], 2)
    info = f"{p['helm']}, {p['brille']}, {p['ski']}, {p['fitness']}"
    eintrag = {"name": profil["name"], "zeit": r["zeit"], "info": info,
               "laenge": strecke["laenge"], "speed": strecke["speed"]}
    liste = storage.trage_ein("zeiten", eintrag, "zeit", False, data.game["highscore_eintraege"])
    return r, liste
