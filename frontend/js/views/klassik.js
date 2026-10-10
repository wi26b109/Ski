// Klassik-Modus: das urspruengliche Skirennspiel mit frei gewaehlter Ausruestung.
import { api } from "../api.js";
import { S, register, render, aktion } from "../state.js";
import { bind, esc, fmt, plus, toast } from "../util.js";

const STUFEN = [["anfaenger", "Anfänger"], ["standard", "Standard"], ["profi", "Profi"], ["legende", "Legende"]];
const optionen = (leer, sel) => `${leer ? `<option value="${leer}">${leer}</option>` : ""}${STUFEN.map(([v, n]) => `<option value="${v}"${v === sel ? " selected" : ""}>${n}</option>`).join("")}`;

register("klassik", root => {
  const f = S.klassikForm || { helm: "profi", brille: "profi", ski: "profi", fitness: "profi", laenge: 2000, speed: 20, zufall: false };
  const z = S.klassikErgebnis;
  const zeiten = S.listen.zeiten;

  let ergebnis = `<p class="sub" style="margin:0">Noch kein Rennen gefahren.</p>`;
  if (z?.status === "ausfall") {
    const fehlt = z.fehlt.join(" und ");
    ergebnis = `<p class="time fail">Ausfall</p><p>${esc(z.name)} fährt ohne ${esc(fehlt)} über die blaue Markierung. Wähle ${esc(fehlt)} und starte neu. Ausfälle kommen nicht in die Highscore-Tabelle.</p>`;
  } else if (z) {
    ergebnis = `<p class="time good">${fmt(z.zeit)} s</p>
      <p>Geschwindigkeit ${fmt(z.v)} m/s, Grundzeit ${fmt(z.grund)} s${f.zufall ? ", danach Zufallsereignisse:" : "."}</p>
      ${z.ereignisse.length ? `<ul class="ev">${z.ereignisse.map(e => `<li>${esc(e.name)}: ${plus(e.diff)} s</li>`).join("")}</ul>` : ""}`;
  }

  root.innerHTML = `
    <h1>Klassik</h1><p class="sub">Das Original: Ausrüstung frei wählen, Rennen starten, Zeit ansehen. Ohne Helm oder Brille gibt es einen Ausfall.</p>
    <section class="card"><h2>Fahrer und Ausrüstung</h2>
      <form class="grid g2" id="kf">
        <label>Helm<select name="helm">${optionen("keiner", f.helm)}</select></label>
        <label>Brille<select name="brille">${optionen("keine", f.brille)}</select></label>
        <label>Ski<select name="ski">${optionen("", f.ski)}</select></label>
        <label>Fitness<select name="fitness">${optionen("", f.fitness)}</select></label>
        <label>Länge der Piste (m)<input name="laenge" type="number" min="100" max="20000" value="${f.laenge}"></label>
        <label>Basisgeschwindigkeit (m/s)<input name="speed" type="number" min="1" max="100" value="${f.speed}"></label>
        <label class="chk" style="grid-column:1/-1"><input name="zufall" type="checkbox" ${f.zufall ? "checked" : ""}>Zufallsereignisse einbauen (Tor verpasst, perfekte Linie …)</label>
        <div><button type="submit">Rennen starten</button></div>
      </form></section>
    <section class="card"><h2>Ergebnis</h2>${ergebnis}</section>
    <section class="card"><h2>Highscore-Tabelle</h2><div class="wrap"><table><thead><tr><th>Platz</th><th>Name</th><th>Zeit</th><th>Ausrüstung</th></tr></thead><tbody>
      ${zeiten.length ? zeiten.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}</td><td>${fmt(e.zeit)} s</td><td>${esc(e.info)}</td></tr>`).join("") : `<tr><td colspan="4" class="mute">Noch keine Einträge. Fahre ein Rennen.</td></tr>`}
      </tbody></table></div><p><button class="ghost" data-act="reset">Highscores löschen</button></p></section>`;

  root.querySelector("#kf").addEventListener("submit", async e => {
    e.preventDefault();
    const d = new FormData(e.target);
    S.klassikForm = { helm: d.get("helm"), brille: d.get("brille"), ski: d.get("ski"), fitness: d.get("fitness"),
      laenge: +d.get("laenge") || 2000, speed: +d.get("speed") || 20, zufall: d.get("zufall") === "on" };
    const r = await aktion(() => api.klassik(S.name, S.klassikForm));
    if (r) { S.klassikErgebnis = r.ergebnis; S.listen.zeiten = (r.zeiten ?? S.listen.zeiten); render(); }
  });
  bind(root, {
    reset: async () => { if (confirm("Alle Klassik-Bestzeiten löschen?")) { await api.klassikReset(); S.listen.zeiten = []; render(); } },
  });
});
