"""HTTP-Server (nur Standardbibliothek): liefert das Frontend aus und bietet die JSON-API."""
import json
import mimetypes
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from . import season, storage
from .data_loader import GameData
from .paths import RESOURCE_DIR

FRONTEND = RESOURCE_DIR / "frontend"
MAX_BODY = 10_000
LOCK = threading.Lock()  # ein Spieler-Zugriff nach dem anderen, genug fuer ein lokales Spiel
DATA = None


def profil_ansicht(profil):
    run = profil["run"]
    return {"name": profil["name"], "stats": profil["stats"], "erfolge": profil["erfolge"],
            "karten": profil["karten"], "run": season.run_ansicht(run) if run else None}


def _run_antwort(profil, **extra):
    storage.speichere_profil(profil)
    return {"profil": profil_ansicht(profil), **extra}


def _aktiver_run(profil):
    if not profil["run"]:
        raise season.GameError("Es gibt keinen aktiven Durchgang.")
    return profil["run"]


# --- API-Handler: (Profil, Body) -> JSON ---------------------------------------------

def api_start(profil, b):
    season.neuer_run(DATA, profil, b.get("modus"), b.get("era"))
    return _run_antwort(profil)


def api_pick(profil, b):
    run = _aktiver_run(profil)
    neu = season.pick(run, DATA, profil, b.get("karte"))
    neu += season.simuliere_saison(run, DATA, profil)  # nach dem letzten Pick laeuft die ganze Saison durch
    return _run_antwort(profil, neue_erfolge=neu)


def api_reroll(profil, b):
    season.reroll(_aktiver_run(profil), DATA)
    return _run_antwort(profil)


def api_race(profil, b):
    ergebnis, neu = season.fahre_rennen(_aktiver_run(profil), DATA, profil)
    return _run_antwort(profil, ergebnis=ergebnis, neue_erfolge=neu)


def api_abandon(profil, b):
    profil["run"] = None
    return _run_antwort(profil)


POST_ROUTEN = {
    "/api/run/start": api_start, "/api/run/pick": api_pick, "/api/run/reroll": api_reroll,
    "/api/run/race": api_race, "/api/run/abandon": api_abandon,
}


class Handler(BaseHTTPRequestHandler):
    server_version = "Skirennspiel/2.0"

    def log_message(self, fmt, *args):
        pass

    def _json(self, daten, status=200):
        body = json.dumps(daten, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)
        q = parse_qs(url.query)
        if url.path == "/api/config":
            return self._json(DATA.public_config())
        if url.path == "/api/challenge":
            return self._json(season.challenge_info(DATA))
        if url.path == "/api/highscores":
            return self._json(storage.lade_bestenlisten())
        if url.path == "/api/profile":
            with LOCK:
                profil = storage.lade_profil(q.get("name", [""])[0])
                if profil["run"] and profil["run"]["status"] == "season":  # Spielstand aus einer aelteren Version
                    season.simuliere_saison(profil["run"], DATA, profil)
                    storage.speichere_profil(profil)
                return self._json(profil_ansicht(profil))
        if url.path.startswith("/api/"):
            return self._json({"fehler": "Unbekannte Route."}, 404)
        self._static(url.path)

    def do_POST(self):
        handler = POST_ROUTEN.get(urlparse(self.path).path)
        if not handler:
            return self._json({"fehler": "Unbekannte Route."}, 404)
        try:
            laenge = int(self.headers.get("Content-Length", 0))
            if laenge > MAX_BODY:
                return self._json({"fehler": "Anfrage zu groß."}, 413)
            body = json.loads(self.rfile.read(laenge) or b"{}")
            if not isinstance(body, dict):
                raise ValueError
        except (ValueError, json.JSONDecodeError):
            return self._json({"fehler": "Ungültige Anfrage."}, 400)
        with LOCK:
            try:
                profil = storage.lade_profil(body.get("name"))
                self._json(handler(profil, body))
            except season.GameError as e:
                self._json({"fehler": str(e)}, 400)

    def _static(self, pfad):
        rel = "index.html" if pfad in ("", "/") else pfad.lstrip("/")
        datei = (FRONTEND / rel).resolve()
        if FRONTEND.resolve() not in datei.parents or not datei.is_file():
            self.send_response(404)
            self.end_headers()
            return
        typ = mimetypes.guess_type(datei.name)[0] or "application/octet-stream"
        inhalt = datei.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", f"{typ}; charset=utf-8" if typ.startswith("text/") or typ.endswith("javascript") else typ)
        self.send_header("Content-Length", str(len(inhalt)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(inhalt)


def starte(port=8000, host="127.0.0.1"):
    global DATA
    DATA = GameData()
    server = ThreadingHTTPServer((host, port), Handler)
    return server
