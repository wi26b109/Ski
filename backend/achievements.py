"""Erfolge: werden nach jeder Aktion gegen die Statistik des Profils geprueft."""


def _metriken(data, profil, run):
    s = profil["stats"]
    m = {
        "l_siege": s["siege"], "l_podien": s["podien"], "l_saisons": s["saisons"],
        "l_perfekt": s["perfekt"], "l_challenges": s["challenges"],
        "l_max_vorsprung": s["max_vorsprung"], "l_foto": s["foto"],
        "l_karten": len(profil["karten"]),
        "s_serie": 0, "s_punkte": 0, "s_legenden": 0,
    }
    if run:
        m["s_serie"] = run["beste_serie"]
        m["s_punkte"] = run["punkte"]
        m["s_legenden"] = sum(1 for t in run["team"].values() if t["tier"] == "legende")
    return m


def pruefe(data, profil, run=None):
    """Schaltet neue Erfolge frei und gibt sie zurueck (Liste von Erfolgs-dicts)."""
    m = _metriken(data, profil, run)
    neu = []
    for e in data.achievements:
        if e["id"] not in profil["erfolge"] and m.get(e["metrik"], 0) >= e["ziel"]:
            profil["erfolge"].append(e["id"])
            neu.append(e)
    return neu
