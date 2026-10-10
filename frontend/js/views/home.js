import { api } from "../api.js";
import { S, register, render, aktion } from "../state.js";
import { bind, esc } from "../util.js";

const MODI = {
  normal: { icon: "🃏", name: "Normaler Draft", text: "Wähle pro Slot 1 aus 3 Karten. Keine Grenzen, nur dein Glück und dein Auge." },
  cap: { icon: "💰", name: "Cap-Draft", text: "5 Karten pro Slot, aber ein Gehaltslimit. Jede Karte kostet – wähle klug." },
  challenge: { icon: "📅", name: "Wochen-Challenge", text: "Für alle gleich: gleiche Karten, gleiche Rennen, ein Modifikator. Wer holt die meisten Punkte?" },
};

register("home", root => {
  const { cfg, challenge: ch } = S;
  const modus = S.modus || "normal";
  const era = S.era || "2000er";
  const st = S.profil.stats;
  root.innerHTML = `
    <h1>Kann dein Team eine Saison <span style="color:var(--blue)">10-0</span> fahren?</h1>
    <p class="sub">Draft dein Rennteam aus Athlet, Ski, Helm, Brille und Coach, gewinne alle 10 Weltcup-Rennen. Ohne Helm und Brille bist du raus – die blaue Markierung kennt keine Gnade.</p>

    <section class="card"><h2>1. Modus</h2>
      <div class="grid g3">${Object.entries(MODI).map(([id, m]) => `
        <button class="tile" data-act="modus" data-id="${id}" aria-pressed="${id === modus}">
          <span class="em">${m.icon}</span><b>${m.name}</b><small>${m.text}</small></button>`).join("")}</div>
      ${modus === "challenge" ? `<p style="margin:12px 0 0"><b>${esc(ch.woche)}</b> · Epoche ${esc(cfg.eras.find(e => e.id === ch.era).name)} · Cap ${ch.cap} · <b>${esc(ch.modifikator.name)}</b>: ${esc(ch.modifikator.beschreibung)}</p>` : ""}
    </section>

    ${modus === "challenge" ? "" : `<section class="card"><h2>2. Epoche</h2>
      <div class="grid g4">${cfg.eras.map(e => `
        <button class="tile" style="border-left:6px solid ${esc(e.farbe)}" data-act="era" data-id="${esc(e.id)}" aria-pressed="${e.id === era}">
          <b>${esc(e.name)}</b><small>${esc(e.jahre)}</small><small>${esc(e.beschreibung)}</small></button>`).join("")}</div></section>`}

    <p><button class="big" data-act="start">Saison starten</button></p>

    <section class="card"><h2>Deine Karriere</h2>
      <div class="stats">
        ${[["Rennen", st.rennen], ["Siege", st.siege], ["Podien", st.podien], ["Saisons", st.saisons], ["Perfekte Saisons", st.perfekt], ["Beste Punkte", st.beste_punkte]]
          .map(([l, v]) => `<div class="stat-box"><b>${v}</b><span>${l}</span></div>`).join("")}
      </div></section>`;

  bind(root, {
    modus: d => { S.modus = d.id; render(); },
    era: d => { S.era = d.id; render(); },
    start: async () => {
      const r = await aktion(() => api.start(S.name, modus, era));
      if (r) render();
    },
  });
});
