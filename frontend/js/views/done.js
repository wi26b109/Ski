import { api } from "../api.js";
import { S, register, render, aktion } from "../state.js";
import { bind, esc, MEDAL, toast } from "../util.js";

function note(run, anzahl) {
  if (run.siege === anzahl) return ["👑", `${anzahl}-0 – Perfekte Saison!`, "Kein einziges Rennen verloren. Legendär."];
  if (run.siege >= anzahl * 0.7) return ["🏆", "Gesamtweltcup-Sieger", "Dominante Saison mit vielen Siegen."];
  if (run.podien >= anzahl * 0.6) return ["🥈", "Podiums-Dauergast", "Konstant vorne dabei."];
  if (run.punkte >= 400) return ["🎿", "Solide Saison", "Meist in den Punkten, aber noch Luft nach oben."];
  return ["🌨️", "Lehrgeld bezahlt", "Probier ein anderes Team oder spar Münzen für Upgrades."];
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
    <section class="card"><h2>Saisonverlauf</h2><div class="wrap"><table>
      <thead><tr><th>#</th><th>Rennen</th><th>Platz</th><th>Zeit</th><th>Punkte</th></tr></thead><tbody>
      ${run.results.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(cfg.saison[i].name)}</td><td>${MEDAL(r.platz)}</td><td>${String(r.zeit).replace(".", ",")} s</td><td>${r.punkte}</td></tr>`).join("")}
      </tbody></table></div></section>`;

  bind(root, {
    teilen: async () => {
      try { await navigator.clipboard.writeText(teilen); toast("📋 Ergebnis kopiert"); }
      catch { prompt("Zum Kopieren:", teilen); }
    },
    listen: () => { S.tab = "listen"; render(); },
    neu: async () => { if (await aktion(() => api.aufgeben(S.name))) render(); },
  });
});
