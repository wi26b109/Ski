import { api } from "../api.js";
import { S, register, render, aktion } from "../state.js";
import { bind, esc, kartenHTML, toastErfolge, MEDAL, fmt } from "../util.js";

/** Kalender, Teamkarten und Shop - wird in der Saison-Ansicht verwendet. */
function kalenderHTML(cfg, run) {
  return `<div class="cal">${cfg.saison.map((k, i) => {
    const r = run.results[i];
    const d = cfg.disziplinen[k.disziplin];
    return `<div class="race ${i === run.race_index && run.status === "season" ? "next" : ""}">
      <span class="pl">${r ? MEDAL(r.platz) : d.icon}</span><b>${i + 1}</b>
      <small>${esc(k.ort.replace(/ \(.*/, ""))}</small><small>${esc(d.name)}</small>
      ${r ? `<small>${r.punkte} P</small>` : ""}</div>`;
  }).join("")}</div>`;
}

function shopHTML(cfg, run) {
  const reihe = cfg.stufen_reihenfolge;
  return cfg.upgrades.map(u => {
    if (u.typ === "tierup") {
      return `<div class="shop"><div class="d"><b>${u.icon} ${esc(u.name)}</b><br><small>${esc(u.beschreibung)}</small></div></div>` +
        cfg.slots.filter(s => s !== "athlet").map(s => {
          const next = reihe[reihe.indexOf(run.team[s].tier) + 1];
          const preis = next ? u.preise[next] : null;
          return `<div class="shop"><div class="d">${esc(cfg.slot_namen[s])}: ${esc(cfg.stufen[run.team[s].tier].name)}${next ? ` → <b>${esc(cfg.stufen[next].name)}</b>` : " (Maximum)"}</div>
            <button data-act="kauf" data-id="${u.id}" data-slot="${s}" ${!next || run.coins < preis ? "disabled" : ""}>${next ? preis + " 🪙" : "–"}</button></div>`;
        }).join("");
    }
    let status, preis, aus;
    if (u.typ === "level") {
      const lv = run.levels[u.id] || 0;
      aus = lv >= u.kosten.length;
      preis = aus ? null : u.kosten[lv];
      status = `Stufe ${lv}/${u.kosten.length}`;
    } else {
      const n = run.lager[u.id] || 0;
      aus = n >= 3;
      preis = u.kosten;
      status = `Im Lager: ${n}`;
    }
    return `<div class="shop"><div class="d"><b>${u.icon} ${esc(u.name)}</b> <span class="pill">${status}</span><br><small>${esc(u.beschreibung)}</small></div>
      <button data-act="kauf" data-id="${u.id}" ${aus || run.coins < preis ? "disabled" : ""}>${aus ? "Max." : preis + " 🪙"}</button></div>`;
  }).join("");
}

register("season", root => {
  const { cfg } = S;
  const run = S.profil.run;
  const kurs = cfg.saison[run.race_index];
  const disz = cfg.disziplinen[kurs.disziplin];
  const karten = Object.fromEntries(cfg.karten.map(k => [k.id, k]));
  const team = cfg.slots.map(s => kartenHTML(cfg, karten[run.team[s].id], { tier: run.team[s].tier, mini: true })).join("");
  const perfekt = run.siege === run.race_index;

  root.innerHTML = `
    <div class="row sp"><h1>Rennen ${run.race_index + 1} von ${cfg.saison.length}</h1>
      <span class="pill">${perfekt && run.race_index ? `🔥 ${run.race_index}-0` : `${run.siege}-${run.race_index - run.siege}`}</span></div>
    <div class="stats" style="margin-bottom:16px">
      ${[["Punkte", run.punkte], ["Siege", run.siege], ["Podien", run.podien], ["Serie", run.serie], ["Münzen", run.coins + " 🪙"]]
        .map(([l, v]) => `<div class="stat-box"><b>${v}</b><span>${l}</span></div>`).join("")}</div>
    <section class="card">${kalenderHTML(cfg, run)}</section>

    <section class="card"><div class="row sp"><div>
        <h2 style="margin:0">${disz.icon} ${esc(kurs.name)}</h2>
        <span class="mute">${esc(kurs.ort)} · ${esc(disz.name)} · ${kurs.laenge} m</span></div>
      <button class="big" data-act="rennen">Rennen starten</button></div>
      ${Object.values(run.lager).some(Boolean) ? `<p class="mute" style="margin:10px 0 0">Aktiv für dieses Rennen: ${Object.entries(run.lager).filter(([, n]) => n).map(([id, n]) => `${esc(cfg.upgrades.find(u => u.id === id).name)} ×${n}`).join(", ")}</p>` : ""}
    </section>

    <div class="grid g2" style="align-items:start">
      <section class="card"><h2>Dein Team</h2><div class="grid g3">${team}</div>
        ${Object.keys(run.levels).length ? `<p class="mute">Training: ${Object.entries(run.levels).map(([id, l]) => `${esc(cfg.upgrades.find(u => u.id === id).name)} ${l}`).join(", ")}</p>` : ""}</section>
      <section class="card"><div class="row sp"><h2 style="margin:0">Shop</h2><b>${run.coins} 🪙</b></div>${shopHTML(cfg, run)}</section>
    </div>
    <p><button class="ghost" data-act="aufgeben">Saison abbrechen</button></p>`;

  bind(root, {
    kauf: async d => { if (await aktion(() => api.kaufen(S.name, d.id, d.slot))) render(); },
    rennen: async () => {
      const r = await aktion(() => api.rennen(S.name));
      if (!r) return;
      S.letztes = { ergebnis: r.ergebnis, kurs: kurs, neu: r.neue_erfolge, animiert: false };
      S.overlay = "race";
      render();
    },
    aufgeben: async () => { if (confirm("Saison wirklich abbrechen? Der Fortschritt geht verloren.") && await aktion(() => api.aufgeben(S.name))) render(); },
  });
});
