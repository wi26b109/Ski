import { api } from "./api.js";
import { S, render, ladeProfil } from "./state.js";
import { esc } from "./util.js";
import "./views/home.js";
import "./views/draft.js";
import "./views/done.js";
import "./views/meta.js";
import "./views/klassik.js";

const TABS = [["play", "Spielen"], ["sammlung", "Sammlung"], ["erfolge", "Erfolge"], ["listen", "Bestenlisten"], ["klassik", "Klassik"]];

function navAufbauen() {
  const nav = document.getElementById("nav");
  nav.innerHTML = TABS.map(([id, n]) => `<button data-tab="${id}">${n}</button>`).join("");
  nav.addEventListener("click", async e => {
    const b = e.target.closest("button");
    if (!b) return;
    S.tab = b.dataset.tab;
    if (S.tab === "listen" || S.tab === "klassik") S.listen = await api.bestenlisten();
    render();
  });
}

async function profilWechseln(name) {
  S.name = (name || "").trim().slice(0, 20) || "Spieler";
  try { localStorage.setItem("ski-name", S.name); } catch { /* privater Modus */ }
  await ladeProfil();
  render();
}

async function start() {
  const app = document.getElementById("app");
  try {
    [S.cfg, S.challenge, S.listen] = await Promise.all([api.config(), api.challenge(), api.bestenlisten()]);
    let gespeichert = "";
    try { gespeichert = localStorage.getItem("ski-name") || ""; } catch { /* egal */ }
    const input = document.getElementById("name");
    input.value = gespeichert || "Anna";
    navAufbauen();
    input.addEventListener("change", () => profilWechseln(input.value));
    await profilWechseln(input.value);
  } catch (e) {
    app.innerHTML = `<p class="err">Das Spiel konnte nicht geladen werden: ${esc(e.message)}. Läuft der Server (python run.py)?</p>`;
  }
}

start();
