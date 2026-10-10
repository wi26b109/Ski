import { api } from "../api.js";
import { S, register, render, aktion } from "../state.js";
import { bind, esc, kartenHTML, toastErfolge, SLOT_ICON } from "../util.js";

register("draft", root => {
  const { cfg } = S;
  const run = S.profil.run;
  const slot = cfg.slots[run.slot_index];
  const karten = Object.fromEntries(cfg.karten.map(k => [k.id, k]));
  const cap = run.cap !== null;
  const era = cfg.eras.find(e => e.id === run.era);

  const gewaehlt = cfg.slots.filter(s => run.team[s]).map(s => kartenHTML(cfg, karten[run.team[s].id], { mini: true })).join("");
  root.innerHTML = `
    <h1>Draft: ${esc(cfg.slot_namen[slot])} wählen</h1>
    <p class="sub">${esc(era.name)}${run.mod_name ? ` · ${esc(run.mod_name)}` : ""} · ${cap ? "Cap-Draft" : "Normaler Draft"}</p>
    <div class="steps">${cfg.slots.map((s, i) =>
      `<span class="step ${i < run.slot_index ? "done" : i === run.slot_index ? "on" : ""}">${SLOT_ICON[s]} ${esc(cfg.slot_namen[s])}</span>`).join("")}</div>
    ${cap ? `<div class="card"><div class="row sp"><b>Budget</b><span>${run.budget} von ${run.cap} $ übrig</span></div>
      <div class="budget"><i style="width:${(run.budget / run.cap) * 100}%"></i></div></div>` : ""}
    <div class="grid g3">${run.offers.map(id => kartenHTML(cfg, karten[id], { aktion: "pick", kosten: cap ? karten[id].kosten : undefined })).join("")}</div>
    <p class="row" style="margin-top:14px">
      <button class="ghost" data-act="reroll" ${run.rerolls ? "" : "disabled"}>🔄 Neu würfeln (${run.rerolls} übrig)</button>
      <button class="ghost" data-act="abbrechen">Abbrechen</button></p>
    ${gewaehlt ? `<section class="card"><h2>Dein Team bisher</h2><div class="grid g4">${gewaehlt}</div></section>` : ""}`;

  bind(root, {
    pick: async d => {
      const r = await aktion(() => api.pick(S.name, d.id));
      if (!r) return;
      if (r.profil.run.status === "done") S.sim = { neu: r.neue_erfolge };  // Saison wurde simuliert: erst ablaufen lassen
      else toastErfolge(r.neue_erfolge);
      render();
    },
    reroll: async () => { if (await aktion(() => api.reroll(S.name))) render(); },
    abbrechen: async () => { if (confirm("Draft abbrechen?") && await aktion(() => api.aufgeben(S.name))) render(); },
  });
});
