"""Laedt und prueft alle YAML-Dateien aus dem data-Ordner."""
from pathlib import Path

import yaml

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class DataError(Exception):
    pass


def _lade(name):
    pfad = DATA_DIR / name
    try:
        with open(pfad, encoding="utf-8") as f:
            return yaml.safe_load(f)
    except (OSError, yaml.YAMLError) as e:
        raise DataError(f"{name}: {e}") from e


class GameData:
    """Alle Spieldaten als Attribute, plus Lookup-Tabellen."""

    def __init__(self, data_dir=None):
        global DATA_DIR
        if data_dir:
            DATA_DIR = Path(data_dir)
        self.game = _lade("game.yaml")
        self.eras = {e["id"]: e for e in _lade("eras.yaml")["eras"]}
        self.weather = {w["id"]: w for w in _lade("weather.yaml")["wetter"]}
        self.events = _lade("events.yaml")["ereignisse"]
        kurse = _lade("courses.yaml")
        self.disciplines = kurse["disziplinen"]
        self.season = kurse["saison"]
        self.upgrades = {u["id"]: u for u in _lade("upgrades.yaml")["upgrades"]}
        ch = _lade("challenges.yaml")
        self.challenge_mods = ch["modifikatoren"]
        self.challenge_eras = ch["epochen"]
        self.achievements = _lade("achievements.yaml")["erfolge"]
        self.rivals = _lade("rivals.yaml")

        # Karten: id -> Karte (mit Slot)
        self.cards = {}
        for athlet in _lade("athletes.yaml")["athleten"]:
            self._add_card("athlet", athlet)
        for slot, karten in _lade("equipment.yaml").items():
            for karte in karten:
                self._add_card(slot, karte)
        self._validate()

    def _add_card(self, slot, karte):
        if karte["id"] in self.cards:
            raise DataError(f"Doppelte Karten-ID: {karte['id']}")
        karte = dict(karte, slot=slot)
        karte.setdefault("kosten", self.game["stufen"][karte["tier"]]["kosten"]
                         if karte["tier"] in self.game["stufen"] else 0)
        self.cards[karte["id"]] = karte

    def _validate(self):
        stufen = self.game["stufen"]
        for k in self.cards.values():
            if k["tier"] not in stufen:
                raise DataError(f"Karte {k['id']}: unbekannte Stufe {k['tier']}")
            if k["era"] not in self.eras or k["era"] == "zufall":
                raise DataError(f"Karte {k['id']}: unbekannte Epoche {k['era']}")
        for era in self.eras:
            for slot in self.game["draft_slots"]:
                pool = self.pool(slot, era)
                if len(pool) < max(self.game["draft"]["optionen_normal"], 3):
                    raise DataError(f"Zu wenige Karten fuer {slot} in {era}")
                if not any(k["tier"] == "anfaenger" for k in pool):
                    raise DataError(f"Keine Anfaenger-Karte fuer {slot} in {era}")
        for kurs in self.season:
            if kurs["disziplin"] not in self.disciplines:
                raise DataError(f"Kurs {kurs['id']}: unbekannte Disziplin")
        for mod in self.challenge_mods:
            if mod.get("wetter") and mod["wetter"] not in self.weather:
                raise DataError(f"Challenge {mod['id']}: unbekanntes Wetter")

    def pool(self, slot, era):
        """Alle Karten eines Slots; 'zufall' enthaelt alle Epochen."""
        return [k for k in self.cards.values()
                if k["slot"] == slot and (era == "zufall" or k["era"] == era)]

    def tier_faktor(self, tier):
        return self.game["stufen"][tier]["faktor"]

    def public_config(self):
        """Alles, was das Frontend zum Zeichnen braucht."""
        return {
            "stufen": self.game["stufen"],
            "stufen_reihenfolge": self.game["stufen_reihenfolge"],
            "slots": self.game["draft_slots"],
            "slot_namen": self.game["slot_namen"],
            "pflicht": self.game["pflicht_ausruestung"],
            "eras": list(self.eras.values()),
            "disziplinen": self.disciplines,
            "saison": self.season,
            "upgrades": list(self.upgrades.values()),
            "erfolge": self.achievements,
            "karten": list(self.cards.values()),
            "wetter": list(self.weather.values()),
            "ereignisse": self.events,
            "draft": self.game["draft"],
            "muenzen": self.game["muenzen"],
            "perfekte_saison_bonus": self.game["perfekte_saison_bonus"],
        }
