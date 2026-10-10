"""Startet das Skirennspiel: Server + Browser.   Aufruf: python run.py [port]"""
import sys
import threading
import webbrowser

from backend.server import starte


def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = None
    for port in range(start, start + 10):  # Port belegt? dann den naechsten probieren
        try:
            server = starte(port)
            break
        except OSError:
            print(f"Port {port} ist belegt, versuche den nächsten …")
    if server is None:
        sys.exit("Kein freier Port gefunden.")
    url = f"http://127.0.0.1:{port}/"
    print(f"Skirennspiel läuft auf {url}\nZum Beenden dieses Fenster schließen oder Strg+C drücken.")
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBeendet.")


if __name__ == "__main__":
    main()
