// Saison-Wiedergabe: zeigt die bereits berechneten Rennen nacheinander als Zielfoto-Animation.
import { S, register, render } from "../state.js";
import { bind, esc, fmt, plus, MEDAL, toastErfolge } from "../util.js";

const LANE = 28, TOP = 14, W = 900, DAUER = 2.6;
const warte = ms => new Promise(r => setTimeout(r, ms));

/** Zielfoto aller Starter: Zeitunterschiede werden zur Anschauung vergroessert. Liefert ein Promise. */
function animiere(canvas, feld, ctl) {
  const fahrer = feld;  // alle Starter
  const best = feld[0].zeit, AMP = 18;
  const eff = f => best + (f.zeit - best) * AMP;
  const maxEff = Math.max(...fahrer.map(eff));
  const H = TOP * 2 + fahrer.length * LANE;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const x0 = 120, x1 = W - 44;

  function zeichne(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#e6f0f8"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1f6fe0"; ctx.fillRect(x1, 0, 6, H);              // blaue Zielmarkierung
    ctx.fillStyle = "#9bb4c8"; ctx.fillRect(x0, 0, 2, H);
    fahrer.forEach((f, i) => {
      const y = TOP + i * LANE + LANE / 2;
      const p = Math.min(1, (t / DAUER) * (maxEff / eff(f)));
      ctx.strokeStyle = "#c9dbe9"; ctx.beginPath(); ctx.moveTo(x0, y + LANE / 2); ctx.lineTo(x1 + 6, y + LANE / 2); ctx.stroke();
      ctx.font = "600 14px Archivo, system-ui, sans-serif"; ctx.textBaseline = "middle";
      ctx.fillStyle = f.du ? "#1f6fe0" : "#34495e"; ctx.textAlign = "right";
      ctx.fillText(f.du ? "Du" : f.name.split(" ").pop().slice(0, 14), x0 - 10, y);
      ctx.textAlign = "center"; ctx.font = "20px sans-serif"; ctx.fillText("⛷️", x0 + p * (x1 - x0), y);
      if (p >= 1) { ctx.font = "600 14px sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = f.du ? "#1f6fe0" : "#5d7286"; ctx.fillText(MEDAL(f.platz), x1 + 14, y); }
    });
  }
  // Timer statt requestAnimationFrame: laeuft auch weiter, wenn der Tab im Hintergrund ist
  return new Promise(fertig => {
    const start = performance.now();
    const schritt = () => {
      if (ctl.abbruch || ctl.skip) return fertig();
      const t = (performance.now() - start) / 1000;
      zeichne(Math.min(t, DAUER + 0.1));
      if (t < DAUER + 0.4) setTimeout(schritt, 16); else fertig();
    };
    zeichne(0);
    schritt();
  });
}

register("sim", root => {
  const { cfg } = S;
  const run = S.profil.run;
  const n = cfg.saison.length;
  const ctl = { abbruch: false, skip: false };
  if (S.simCtl) S.simCtl.abbruch = true;  // alte Wiedergabe stoppen
  S.simCtl = ctl;

  root.innerHTML = `
    <h1 id="titel">Saison läuft …</h1>
    <p class="sub" id="sub">Dein Team fährt den Weltcup – ${esc(cfg.eras.find(e => e.id === run.era).name)}${run.mod_name ? " · " + esc(run.mod_name) : ""}</p>
    <div class="budget"><i id="bar" style="width:0%"></i></div>
    <div class="stats" style="margin:12px 0 16px">
      <div class="stat-box"><b id="s-p">0</b><span>Punkte</span></div><div class="stat-box"><b id="s-w">0</b><span>Siege</span></div>
      <div class="stat-box"><b id="s-pod">0</b><span>Podien</span></div><div class="stat-box"><b id="s-r">0 / ${n}</b><span>Rennen</span></div></div>
    <section class="card"><div class="cal" id="cal">${cfg.saison.map((k, i) => `<div class="race" data-i="${i}"><span class="pl">${cfg.disziplinen[k.disziplin].icon}</span><small>Rennen ${i + 1}</small>
      <small>${esc(k.ort.replace(/ \(.*/, ""))}</small><small class="pt">&nbsp;</small></div>`).join("")}</div></section>
    <section class="card" id="live"><h2 id="rname">&nbsp;</h2><p class="mute" id="rinfo">&nbsp;</p>
      <canvas aria-label="Animation des Rennens"></canvas>
      <ul class="ev" id="evs"></ul></section>
    <p class="row"><button data-act="skip" id="skip" class="ghost">Überspringen</button>
      <button data-act="fertig" id="fertig" class="big" hidden>Zur Auswertung</button></p>`;

  const $ = id => root.querySelector("#" + id);
  const fertig = () => { ctl.abbruch = true; toastErfolge(S.sim?.neu); S.sim = null; render(); };
  bind(root, { skip: () => { ctl.skip = true; }, fertig });

  (async () => {
    let punkte = 0, siege = 0, podien = 0;
    for (let i = 0; i < n; i++) {
      if (ctl.abbruch) return;
      const k = cfg.saison[i], d = cfg.disziplinen[k.disziplin], r = run.results[i];
      const w = cfg.wetter.find(x => x.id === r.wetter);
      $("rname").textContent = `${d.icon} Rennen ${i + 1}: ${k.name}`;
      $("rinfo").textContent = `${k.ort} · ${d.name} · ${k.laenge} m · ${w.icon} ${w.name}`;
      $("evs").innerHTML = "";
      root.querySelector(`.race[data-i="${i}"]`).classList.add("next");
      await animiere(root.querySelector("canvas"), r.feld, ctl);
      if (ctl.abbruch) return;

      punkte += r.punkte; siege += r.platz === 1; podien += r.platz <= 3;
      const zelle = root.querySelector(`.race[data-i="${i}"]`);
      zelle.classList.remove("next");
      zelle.querySelector(".pl").textContent = MEDAL(r.platz);
      zelle.querySelector(".pt").textContent = `${r.punkte} P`;
      $("s-p").textContent = punkte; $("s-w").textContent = siege; $("s-pod").textContent = podien;
      $("s-r").textContent = `${i + 1} / ${n}`;
      $("bar").style.width = `${((i + 1) / n) * 100}%`;
      $("evs").innerHTML = `<li><b>Platz ${r.platz} · ${fmt(r.zeit)} s</b></li>` + r.ereignisse.map(e => `<li>${esc(e.name)}: ${plus(e.diff)} s</li>`).join("");
      if (!ctl.skip) await warte(1100);
    }
    if (ctl.abbruch) return;
    $("titel").textContent = run.siege === n ? "👑 Perfekte Saison!" : "🏁 Saison beendet";
    $("sub").textContent = "Alle Rennen sind gefahren.";
    $("skip").hidden = true; $("fertig").hidden = false;
    $("fertig").focus();
  })();
});
