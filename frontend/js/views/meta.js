// Meta-Ansichten: Kartensammlung, Erfolge, Bestenlisten.
import { api } from "../api.js";
import { S, register, render } from "../state.js";
import { bind, esc, fmt, kartenHTML } from "../util.js";

register("sammlung", root => {
  const { cfg, profil } = S;
  const filter = S.sammlungEra || "alle";
  const alle = cfg.karten.filter(k => filter === "alle" || k.era === filter);
  const besitz = new Set(profil.karten);
  const order = cfg.stufen_reihenfolge;
  root.innerHTML = `
    <h1>Kartensammlung</h1><p class="sub">${profil.karten.length} von ${cfg.karten.length} Karten gesammelt. Karten schaltest du frei, indem du sie draftest.</p>
    <div class="tabs">${["alle", ...cfg.eras.filter(e => e.id !== "zufall").map(e => e.id)].map(id =>
      `<button data-act="filter" data-id="${id}" aria-pressed="${id === filter}">${id === "alle" ? "Alle" : esc(cfg.eras.find(e => e.id === id).name)}</button>`).join("")}</div>
    ${cfg.slots.map(s => `<h2>${esc(cfg.slot_namen[s])}</h2><div class="grid g4" style="margin-bottom:20px">
      ${alle.filter(k => k.slot === s).sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier))
        .map(k => kartenHTML(cfg, k, { mini: true, gesperrt: !besitz.has(k.id) })).join("")}</div>`).join("")}`;
  bind(root, { filter: d => { S.sammlungEra = d.id; render(); } });
});

register("erfolge", root => {
  const { cfg, profil } = S;
  const frei = new Set(profil.erfolge);
  root.innerHTML = `<h1>Erfolge</h1><p class="sub">${frei.size} von ${cfg.erfolge.length} freigeschaltet.</p>
    <div class="grid g2">${cfg.erfolge.map(e => `<div class="ach ${frei.has(e.id) ? "" : "off"}"><span class="ic">${e.icon}</span>
      <div><b>${esc(e.name)}</b><br><small>${esc(e.beschreibung)}</small></div></div>`).join("")}</div>`;
});

const tabelle = (kopf, zeilen) => `<div class="wrap"><table><thead><tr>${kopf.map(k => `<th>${k}</th>`).join("")}</tr></thead><tbody>
  ${zeilen.length ? zeilen.join("") : `<tr><td colspan="${kopf.length}" class="mute">Noch keine Einträge.</td></tr>`}</tbody></table></div>`;

register("listen", root => {
  const { cfg } = S;
  const tab = S.listenTab || "saison";
  const b = S.listen;
  const ich = e => (e.name === S.profil.name ? ' class="me"' : "");
  const eraName = id => esc(cfg.eras.find(e => e.id === id)?.name || id);
  let inhalt;
  if (tab === "saison") {
    inhalt = tabelle(["Platz", "Name", "Punkte", "Siege", "Epoche", "Modus"], b.saison.map((e, i) =>
      `<tr${ich(e)}><td>${i + 1}</td><td>${esc(e.name)}</td><td>${e.punkte}</td><td>${e.siege}-${cfg.saison.length - e.siege}</td><td>${eraName(e.era)}</td><td>${e.modus === "cap" ? "Cap" : "Normal"}</td></tr>`));
  } else if (tab === "challenge") {
    const woche = S.challenge.woche;
    const liste = b.challenge.filter(e => e.woche === woche).slice(0, 10);
    inhalt = `<p class="sub">${esc(woche)} · ${esc(S.challenge.modifikator.name)} (${esc(S.challenge.modifikator.beschreibung)})</p>` +
      tabelle(["Platz", "Name", "Punkte", "Siege"], liste.map((e, i) =>
        `<tr${ich(e)}><td>${i + 1}</td><td>${esc(e.name)}</td><td>${e.punkte}</td><td>${e.siege}-${cfg.saison.length - e.siege}</td></tr>`));
  } else {
    inhalt = tabelle(["Platz", "Name", "Zeit", "Ausrüstung"], b.zeiten.map((e, i) =>
      `<tr${ich(e)}><td>${i + 1}</td><td>${esc(e.name)}</td><td>${fmt(e.zeit)} s</td><td>${esc(e.info)}</td></tr>`));
  }
  root.innerHTML = `<h1>Bestenlisten</h1>
    <div class="tabs">${[["saison", "Saison"], ["challenge", "Wochen-Challenge"], ["zeiten", "Klassik-Bestzeiten"]].map(([id, n]) =>
      `<button data-act="tab" data-id="${id}" aria-pressed="${id === tab}">${n}</button>`).join("")}</div>
    <section class="card">${inhalt}</section>`;
  bind(root, { tab: d => { S.listenTab = d.id; render(); } });
});
