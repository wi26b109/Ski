import { api } from "../api.js";
import { S, register, render, aktion } from "../state.js";
import { bind, esc, fmt, plus, MEDAL, toast } from "../util.js";

function note(run, anzahl) {
  if (run.siege === anzahl) return ["👑", `${anzahl}-0 – Perfekte Saison!`, "Kein einziges Rennen verloren. Legendär."];
  if (run.siege >= anzahl * 0.7) return ["🏆", "Gesamtweltcup-Sieger", "Dominante Saison mit vielen Siegen."];
  if (run.podien >= anzahl * 0.6) return ["🥈", "Podiums-Dauergast", "Konstant vorne dabei."];
  if (run.punkte >= 400) return ["🎿", "Solide Saison", "Meist in den Punkten, aber noch Luft nach oben."];
  return ["🌨️", "Lehrgeld bezahlt", "Probier ein anderes Team oder eine andere Epoche."];
}

register("done", root => {
  const { cfg } = S;
  const run = S.profil.run;
  const n = cfg.saison.length;
  const [emoji, titel, text] = note(run, n);
  const era = cfg.eras.find(e => e.id === run.era);
  const raster = run.results.map(r => (r.platz === 1 ? "🟩" : r.platz <= 3 ? "🟨" : r.platz <= 10 ? "🟧" : "⬛")).join("");
  const teilen = `Skirennspiel – ${era.name}${run.mod_name ? " · " + run.mod_name : ""}\n${run.siege}-${n - run.siege} · ${run.punkte} Punkte\n${raster}`;

  root.innerHTML = `
    <section class="card" style="text-align:center">
      <div class="bigemoji">${emoji}</div><h1>${esc(titel)}</h1><p class="sub">${esc(text)}</p>
      <div class="stats" style="max-width:520px;margin:0 auto 16px">
        ${[["Punkte", run.punkte], ["Siege", run.siege], ["Podien", run.podien], ["Beste Serie", run.beste_serie]]
          .map(([l, v]) => `<div class="stat-box"><b>${v}</b><span>${l}</span></div>`).join("")}</div>
      ${run.bonus ? `<p class="good"><b>Perfekte-Saison-Bonus: +${run.bonus} Punkte</b></p>` : ""}
      <p style="font-size:30px;margin:8px 0">${raster}</p>
      <div class="row" style="justify-content:center">
        <button data-act="teilen">Ergebnis kopieren</button>
        <button data-act="listen" class="ghost">Bestenliste</button>
        <button data-act="neu" class="ghost">Neue Saison</button></div>
    </section>
    <section class="card"><h2>Saisonverlauf</h2>
      ${run.results.map((r, i) => {
        const k = cfg.saison[i], d = cfg.disziplinen[k.disziplin], w = cfg.wetter.find(x => x.id === r.wetter);
        return `<details class="rennen"><summary><span class="pl">${MEDAL(r.platz)}</span> <b>${esc(k.name)}</b>
          <small>${d.icon} ${esc(d.name)} · ${w.icon} ${esc(w.name)}</small>
          <span class="rechts">${fmt(r.zeit)} s · ${r.punkte} P</span></summary>
          <p class="mute">Geschwindigkeit ${fmt(r.geschwindigkeit)} m/s, Grundzeit ${fmt(r.grundzeit)} s${r.ereignisse.length ? ", danach:" : "."}</p>
          ${r.ereignisse.length ? `<ul class="ev">${r.ereignisse.map(e => `<li>${esc(e.name)}: ${plus(e.diff)} s</li>`).join("")}</ul>` : ""}
          <div class="wrap"><table><thead><tr><th>Platz</th><th>Fahrer</th><th>Zeit</th><th>Rückstand</th></tr></thead><tbody>
          ${r.feld.map(f => `<tr class="${f.du ? "me" : ""}"><td>${MEDAL(f.platz)}</td><td>${f.du ? "Du" : esc(f.name)}</td><td>${fmt(f.zeit)} s</td><td>${f.platz === 1 ? "" : "+" + fmt(f.zeit - r.feld[0].zeit)}</td></tr>`).join("")}
          </tbody></table></div></details>`;
      }).join("")}</section>`;

  bind(root, {
    teilen: async () => {
      try { await navigator.clipboard.writeText(teilen); toast("📋 Ergebnis kopiert"); }
      catch { prompt("Zum Kopieren:", teilen); }
    },
    listen: async () => { S.listen = await api.bestenlisten(); S.tab = "listen"; S.listenTab = S.profil.run.mode === "challenge" ? "challenge" : "saison"; render(); },
    neu: async () => { if (await aktion(() => api.aufgeben(S.name))) render(); },
  });
});
