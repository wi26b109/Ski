import { S, register, render } from "../state.js";
import { bind, esc, fmt, fmtZeit, plus, MEDAL, toastErfolge } from "../util.js";

const LANE = 34, TOP = 18, W = 900;

/** Zielfoto-Animation: die Zeitunterschiede werden zur Anschauung vergroessert. */
function animiere(canvas, feld, fertig) {
  const fahrer = feld.slice(0, 5);
  const ich = feld.find(f => f.du);
  if (!fahrer.includes(ich)) fahrer.push(ich);
  const best = feld[0].zeit, AMP = 18, DAUER = 5.5;
  const eff = f => best + (f.zeit - best) * AMP;
  const maxEff = Math.max(...fahrer.map(eff));
  const H = TOP * 2 + fahrer.length * LANE;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const x0 = 130, x1 = W - 40;
  let start = null, abgebrochen = false;

  function zeichne(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#e6f0f8"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1f6fe0"; ctx.fillRect(x1, 0, 6, H);            // blaue Zielmarkierung
    ctx.fillStyle = "#9bb4c8"; ctx.fillRect(x0, 0, 2, H);
    ctx.font = "600 14px Archivo, system-ui, sans-serif"; ctx.textBaseline = "middle";
    fahrer.forEach((f, i) => {
      const y = TOP + i * LANE + LANE / 2;
      ctx.strokeStyle = "#c9dbe9"; ctx.beginPath(); ctx.moveTo(x0, y + LANE / 2); ctx.lineTo(x1 + 6, y + LANE / 2); ctx.stroke();
      const p = Math.min(1, (t / DAUER) * (maxEff / eff(f)));
      ctx.fillStyle = f.du ? "#1f6fe0" : "#34495e";
      ctx.textAlign = "right"; ctx.fillText((f.du ? "Du" : f.name.split(" ").pop()).slice(0, 14), x0 - 10, y);
      ctx.textAlign = "center"; ctx.font = "22px sans-serif";
      ctx.fillText("⛷️", x0 + p * (x1 - x0), y);
      ctx.font = "600 14px Archivo, system-ui, sans-serif";
      if (p >= 1) { ctx.textAlign = "left"; ctx.fillStyle = f.du ? "#1f6fe0" : "#5d7286"; ctx.fillText(MEDAL(f.platz), x1 + 12 - (f.platz > 3 ? 4 : 0), y); }
    });
  }
  function schritt(ts) {
    if (abgebrochen) return;
    start ??= ts;
    const t = (ts - start) / 1000;
    zeichne(Math.min(t, DAUER + 0.2));
    if (t < DAUER + 0.6) requestAnimationFrame(schritt); else fertig();
  }
  zeichne(0);
  requestAnimationFrame(schritt);
  return () => { abgebrochen = true; };
}

function tabelleHTML(feld) {
  const zeile = f => `<tr class="${f.du ? "me" : ""}"><td>${MEDAL(f.platz)}</td><td>${esc(f.du ? "Du" : f.name)} ${f.nation ? `<small>${esc(f.nation)}</small>` : ""}</td>
    <td>${fmtZeit(f.zeit)}</td><td>${f.platz === 1 ? "" : "+" + fmt(f.zeit - feld[0].zeit)}</td></tr>`;
  const ich = feld.find(f => f.du);
  let html = feld.slice(0, 10).map(zeile).join("");
  if (ich.platz > 10) html += `<tr class="gap"><td colspan="4">⋮</td></tr>` + zeile(ich);
  return `<div class="wrap"><table><thead><tr><th>Platz</th><th>Fahrer</th><th>Zeit</th><th>Rückstand</th></tr></thead><tbody>${html}</tbody></table></div>`;
}

register("race", root => {
  const { cfg, letztes } = S;
  const r = letztes.ergebnis, kurs = letztes.kurs;
  const disz = cfg.disziplinen[kurs.disziplin];
  const wetter = cfg.wetter.find(w => w.id === r.wetter);
  const run = S.profil.run;

  const ergebnisHTML = () => {
    const sieg = r.platz === 1;
    const ev = r.ereignisse.length
      ? `<ul class="ev">${r.ereignisse.map(e => `<li>${esc(e.name)}: ${e.verhindert ? "verhindert durch Streckenbesichtigung" : plus(e.diff) + " s"}</li>`).join("")}</ul>` : "";
    root.innerHTML = `
      <section class="card">
        <div class="row sp"><div><p class="place ${sieg ? "good" : ""}">${r.platz <= 3 ? MEDAL(r.platz) : ""} Platz ${r.platz}</p>
          <p class="time">${fmtZeit(r.zeit)}</p></div>
          <div style="text-align:right"><b>${disz.icon} ${esc(kurs.name)}</b><br><span class="pill">${wetter.icon} ${esc(wetter.name)}</span>
          <br><span class="good"><b>+${r.punkte} Punkte</b></span> · <b>+${r.muenzen} 🪙</b></div></div>
        <p class="mute">Geschwindigkeit ${fmt(r.geschwindigkeit)} m/s, Grundzeit ${fmt(r.grundzeit)} s, danach Zufallsereignisse:</p>${ev}
        ${sieg ? `<p class="good"><b>Sieg mit ${fmt(r.abstand)} s Vorsprung!</b></p>` : `<p class="mute">${fmt(-r.abstand)} s hinter dem Sieger.</p>`}
      </section>
      <section class="card"><h2>Ergebnisliste</h2>${tabelleHTML(r.feld)}</section>
      <p><button class="big" data-act="weiter">${run.status === "done" ? "Zur Saisonauswertung" : "Weiter"}</button></p>`;
    toastErfolge(letztes.neu);
    letztes.neu = [];
  };
  bind(root, { weiter: () => { S.overlay = null; render(); }, skip: () => { stop?.(); letztes.animiert = true; ergebnisHTML(); } });

  if (letztes.animiert) return ergebnisHTML();
  root.innerHTML = `<section class="card"><h2>${disz.icon} ${esc(kurs.name)} – Zielfoto</h2>
    <canvas aria-label="Animation des Rennens"></canvas>
    <p class="mute">Die Zeitunterschiede sind zur Anschauung vergrößert.</p>
    <button class="ghost" data-act="skip">Überspringen</button></section>`;
  const stop = animiere(root.querySelector("canvas"), r.feld, () => { letztes.animiert = true; ergebnisHTML(); });
});
