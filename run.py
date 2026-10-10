"""Startet das Skirennspiel: Server + Browser.   Aufruf: python run.py [port]"""
import sys
import threading
import webbrowser

from backend.server import starte

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = starte(port)
    url = f"http://127.0.0.1:{port}/"
    print(f"Skirennspiel läuft auf {url}  (Strg+C zum Beenden)")
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBeendet.")
