"""Speichern von Profilen und Bestenlisten als JSON-Dateien im Ordner saves/."""
import json
import re
import threading
import time
from pathlib import Path

SAVE_DIR = Path(__file__).resolve().parent.parent / "saves"
_lock = threading.RLock()

LEER_STATS = {"rennen": 0, "siege": 0, "podien": 0, "saisons": 0, "perfekt": 0,
              "challenges": 0, "max_vorsprung": 0.0, "foto": 0, "beste_punkte": 0}


def normalize_name(name):
    name = re.sub(r"\s+", " ", str(name or "")).strip()[:20]
    return name or "Spieler"


def slug(name):
    """Dateiname aus dem Spielernamen; nur [a-z0-9_-], damit kein Pfad ausbrechen kann."""
    s = re.sub(r"[^a-z0-9]+", "_", normalize_name(name).lower()).strip("_")
    return s or "spieler"


def _lesen(pfad, standard):
    try:
        with open(pfad, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return standard


def _schreiben(pfad, daten):
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = pfad.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, indent=2)
    for versuch in range(5):  # unter Windows kann replace kurz blockieren (Virenscanner, Indexer)
        try:
            tmp.replace(pfad)
            return
        except PermissionError:
            if versuch == 4:
                raise
            time.sleep(0.05)


def lade_profil(name):
    name = normalize_name(name)
    with _lock:
        p = _lesen(SAVE_DIR / f"profil_{slug(name)}.json", None)
    if not p:
        p = {"name": name, "stats": dict(LEER_STATS), "erfolge": [], "karten": [], "run": None}
    p["stats"] = {**LEER_STATS, **p.get("stats", {})}
    return p


def speichere_profil(profil):
    with _lock:
        _schreiben(SAVE_DIR / f"profil_{slug(profil['name'])}.json", profil)


def lade_bestenlisten():
    with _lock:
        b = _lesen(SAVE_DIR / "highscores.json", None)
    if not isinstance(b, dict):  # altes Format des Konsolenspiels war eine Liste
        b = {}
    b.setdefault("saison", [])
    b.setdefault("challenge", [])
    b.setdefault("zeiten", [])
    return b


def trage_ein(liste_name, eintrag, sortier_key, absteigend, anzahl, gleich=None):
    """Fuegt einen Eintrag ein, sortiert und behaelt nur die besten `anzahl`.

    gleich: optionales Praedikat fuer 'derselbe Eintrag'; es zaehlt dann nur das bessere Ergebnis.
    """
    with _lock:
        b = lade_bestenlisten()
        liste = b[liste_name]
        if gleich:
            alt = [e for e in liste if gleich(e)]
            besser = lambda a, n: a[sortier_key] >= n[sortier_key] if absteigend else a[sortier_key] <= n[sortier_key]
            if any(besser(a, eintrag) for a in alt):
                return liste
            liste = [e for e in liste if not gleich(e)]
        b[liste_name] = liste
        b[liste_name].append(eintrag)
        b[liste_name].sort(key=lambda e: e[sortier_key], reverse=absteigend)
        b[liste_name] = b[liste_name][:anzahl]
        _schreiben(SAVE_DIR / "highscores.json", b)
        return b[liste_name]


def loesche_zeiten():
    with _lock:
        b = lade_bestenlisten()
        b["zeiten"] = []
        _schreiben(SAVE_DIR / "highscores.json", b)
