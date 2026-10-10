"""Pfade: funktionieren im normalen Python-Betrieb und in der gepackten EXE (PyInstaller)."""
import sys
from pathlib import Path

FROZEN = getattr(sys, "frozen", False)
# data/ und frontend/ liegen in der EXE (entpackt in einen Temp-Ordner), saves/ neben der EXE
RESOURCE_DIR = Path(sys._MEIPASS) if FROZEN else Path(__file__).resolve().parent.parent
APP_DIR = Path(sys.executable).parent if FROZEN else RESOURCE_DIR
