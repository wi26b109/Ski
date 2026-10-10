// Gemeinsamer Zustand und Render-Registry (vermeidet zirkulaere Imports zwischen den Views).
import { api } from "./api.js";
import { toast } from "./util.js";

export const S = {
  cfg: null,
  profil: null,
  name: "",
  tab: "play",       // play | sammlung | erfolge | listen | klassik
  fehler: "",
  ansichten: {},     // name -> render-Funktion
};

export function register(name, fn) { S.ansichten[name] = fn; }

export function render() {
  const app = document.getElementById("app");
  const key = aktuelleAnsicht();
  const box = document.createElement("div");  // frisches Element, damit sich keine Listener stapeln
  app.replaceChildren(box);
  S.ansichten[key](box);
  document.querySelectorAll("#nav button").forEach(b => {
    if (b.dataset.tab === S.tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
}

function aktuelleAnsicht() {
  if (S.tab !== "play") return S.tab;
  const run = S.profil?.run;
  if (!run) return "home";
  return run.status === "draft" ? "draft" : "done";
}

/** Fuehrt eine API-Aktion aus, uebernimmt das Profil und zeichnet neu. Fehler werden angezeigt. */
export async function aktion(fn) {
  try {
    const antwort = await fn();
    if (antwort.profil) S.profil = antwort.profil;
    S.fehler = "";
    return antwort;
  } catch (e) {
    toast("⚠️ " + e.message);
    S.fehler = e.message;
    return null;
  }
}

export async function ladeProfil() {
  S.profil = await api.profil(S.name);
}
