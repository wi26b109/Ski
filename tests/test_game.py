"""Tests fuer Datenladen, Rennformel, Draft und Saison.   Aufruf: python -m unittest discover tests"""
import pathlib
import random
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from backend import engine, season, storage  # noqa: E402
from backend.data_loader import GameData  # noqa: E402

storage.SAVE_DIR = pathlib.Path(tempfile.mkdtemp())
DATA = GameData()


def neues_profil(name="Test"):
    return storage.lade_profil(name)


def draft_durchspielen(run, profil, wahl=max):
    while run["status"] == "draft":
        angebot = [DATA.cards[c] for c in run["offers"]]
        stufe = DATA.game["stufen_reihenfolge"]
        season.pick(run, DATA, profil, wahl(angebot, key=lambda k: stufe.index(k["tier"]))["id"])


class RennformelTest(unittest.TestCase):
    """Die Beispiele aus dem urspruenglichen README muessen weiter stimmen."""
    strecke = {"laenge": 2000, "speed": 20}

    def rennen(self, stufe):
        s = {"helm": stufe, "brille": stufe, "ski": stufe, "fitness": stufe}
        return engine.berechne_rennen(s, self.strecke, random.Random(1), DATA, mit_zufall=False)

    def test_alles_standard(self):
        self.assertEqual(self.rennen("standard")["zeit"], 100.0)

    def test_alles_profi(self):
        self.assertEqual(self.rennen("profi")["zeit"], 82.27)

    def test_ohne_helm_oder_brille_ausfall(self):
        s = {"helm": None, "brille": "profi", "ski": "profi", "fitness": "profi"}
        r = engine.berechne_rennen(s, self.strecke, random.Random(1), DATA)
        self.assertEqual(r["status"], "ausfall")
        self.assertIsNone(r["zeit"])

    def test_ausfaelle_ans_ende(self):
        liste = engine.rangliste([{"zeit": None}, {"zeit": 90.0}, {"zeit": 80.0}])
        self.assertEqual([e["zeit"] for e in liste], [80.0, 90.0, None])

    def test_ereignisse_3_bis_6(self):
        s = {"helm": "standard", "brille": "standard", "ski": "standard", "fitness": "standard"}
        for seed in range(50):
            r = engine.berechne_rennen(s, self.strecke, random.Random(seed), DATA)
            self.assertLessEqual(len(r["ereignisse"]), 6)


class DatenTest(unittest.TestCase):
    def test_alle_epochen_haben_genug_karten(self):
        for era in DATA.eras:
            for slot in DATA.game["draft_slots"]:
                self.assertGreaterEqual(len(DATA.pool(slot, era)), 3, (era, slot))

    def test_zehn_rennen(self):
        self.assertEqual(len(DATA.season), 10)


class DraftTest(unittest.TestCase):
    def test_gleicher_seed_gleiche_angebote(self):
        a, b = neues_profil("A"), neues_profil("B")
        ra = season.neuer_run(DATA, a, "challenge", None)
        rb = season.neuer_run(DATA, b, "challenge", None)
        self.assertEqual(ra["offers"], rb["offers"])

    def test_cap_wird_nie_ueberschritten(self):
        for _ in range(40):
            p = neues_profil()
            run = season.neuer_run(DATA, p, "cap", "zufall")
            draft_durchspielen(run, p)
            self.assertEqual(run["status"], "season")
            self.assertGreaterEqual(run["budget"], 0)

    def test_pick_ausserhalb_angebot_wird_abgelehnt(self):
        p = neues_profil()
        run = season.neuer_run(DATA, p, "normal", "2000er")
        fremd = next(k for k in DATA.cards if k not in run["offers"])
        with self.assertRaises(season.GameError):
            season.pick(run, DATA, p, fremd)

    def test_reroll_begrenzt(self):
        p = neues_profil()
        run = season.neuer_run(DATA, p, "normal", "2000er")
        for _ in range(DATA.game["draft"]["rerolls"]):
            season.reroll(run, DATA)
        with self.assertRaises(season.GameError):
            season.reroll(run, DATA)


class SaisonTest(unittest.TestCase):
    def saison(self, name="S"):
        p = neues_profil(name)
        run = season.neuer_run(DATA, p, "normal", "2000er")
        draft_durchspielen(run, p)
        return p, run

    def test_komplette_saison(self):
        p, run = self.saison()
        while run["status"] == "season":
            season.fahre_rennen(run, DATA, p)
        self.assertEqual(run["status"], "done")
        self.assertEqual(len(run["results"]), 10)
        self.assertEqual(p["stats"]["saisons"], 1)
        self.assertEqual(p["stats"]["rennen"], 10)

    def test_jeder_platz_nur_einmal(self):
        for i in range(30):
            p, run = self.saison(f"U{i}")
            season.simuliere_saison(run, DATA, p)
            for r in run["results"]:
                plaetze = [f["platz"] for f in r["feld"]]
                self.assertEqual(plaetze, list(range(1, len(plaetze) + 1)))
                zeiten = [f["zeit"] for f in r["feld"]]
                self.assertEqual(len(set(zeiten)), len(zeiten))
                self.assertEqual(next(f["platz"] for f in r["feld"] if f.get("du")), r["platz"])

    def test_gleiche_zeiten_werden_getrennt(self):
        riv = [{"zeit": 50.0}, {"zeit": 50.0}, {"zeit": 50.01}]
        engine.zeiten_eindeutig(riv, 50.0)
        zeiten = sorted(r["zeit"] for r in riv)
        self.assertEqual(len(set(zeiten + [50.0])), 4)
        self.assertTrue(all(z > 50.0 for z in zeiten))

    def test_simuliere_saison(self):
        p, run = self.saison("Auto")
        season.simuliere_saison(run, DATA, p)
        self.assertEqual(run["status"], "done")
        self.assertEqual(len(run["results"]), 10)

    def test_rennen_ist_reproduzierbar(self):
        p1, r1 = self.saison("X1")
        p2, r2 = self.saison("X2")
        r2["seed"], r2["rivalen"] = r1["seed"], r1["rivalen"]
        r2["team"] = r1["team"]
        a, _ = season.fahre_rennen(r1, DATA, p1)
        b, _ = season.fahre_rennen(r2, DATA, p2)
        self.assertEqual(a["zeit"], b["zeit"])

    def test_slug_verhindert_pfadtricks(self):
        self.assertEqual(storage.slug("../../etc/passwd"), "etc_passwd")


if __name__ == "__main__":
    unittest.main()
