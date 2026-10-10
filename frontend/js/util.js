// Kleine Helfer: Escaping, Zahlenformat, Karten-HTML, Toasts.
export const esc = t => String(t ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const fmt = (x, n = 2) => Number(x).toFixed(n).replace(".", ",");
export const fmtZeit = s => `${fmt(s)} s`;
export const plus = d => (d > 0 ? "+" : "") + fmt(d, 2).replace(/,00$/, "").replace(/(,\d)0$/, "$1");

export const SLOT_ICON = { athlet: "⛷️", ski: "🎿", helm: "🪖", brille: "🥽", fitness: "💪" };
export const MEDAL = p => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : String(p));

/** Klick-Delegation: handlers[data-act](dataset, button) */
export function bind(root, handlers) {
  root.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (b && !b.disabled) handlers[b.dataset.act]?.(b.dataset, b);
  });
}

export function toast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  document.getElementById("toasts").append(t);
  setTimeout(() => t.remove(), 4500);
}

export function toastErfolge(liste) {
  (liste || []).forEach((e, i) => setTimeout(() => toast(`${e.icon} Erfolg freigeschaltet: ${e.name}`), i * 700));
}

/** HTML einer Karte. opt: {kosten, tier (Override), gesperrt, mini, aktion, disabled} */
export function kartenHTML(cfg, karte, opt = {}) {
  const tier = opt.tier || karte.tier;
  const stufe = cfg.stufen[tier];
  const slot = karte.slot;
  let stat = "";
  if (slot === "athlet") {
    stat = `<div class="bars">${Object.entries(cfg.disziplinen).map(([id, d]) => {
      const w = karte.profil[id];
      return `<span>${d.icon}</span><span class="bar" title="${esc(d.name)} ×${w}"><i style="width:${Math.round(((w - 0.95) / 0.1) * 100)}%"></i></span>`;
    }).join("")}</div>`;
    stat += `<div class="stat"><span>${esc(karte.nation)}</span><span>Fehler −${Math.round((karte.fehler_bonus || 0) * 100)} %</span></div>`;
  } else if (slot === "fitness") {
    stat = `<div class="stat"><span>×${fmt(stufe.faktor)}</span><span>Fehlerchance ${Math.round(stufe.fehlerchance * 100)} %</span></div>`;
  } else {
    stat = `<div class="stat"><span>×${fmt(stufe.faktor)} Tempo</span></div>`;
  }
  const kosten = opt.kosten !== undefined ? `<span class="cost">${opt.kosten} $</span>` : "";
  const inhalt = opt.gesperrt
    ? `<span class="ic">❔</span><span class="tier">${esc(stufe.name)}</span><span class="nm">???</span><span class="tx">Noch nicht gedraftet.</span>`
    : `<span class="ic">${SLOT_ICON[slot]}</span><span class="tier">${esc(stufe.name)} · ${esc(cfg.slot_namen[slot])}</span><span class="nm">${esc(karte.name)}</span>
       ${karte.text ? `<span class="tx">${esc(karte.text)}</span>` : ""}${stat}${kosten}`;
  const klassen = `gc t-${tier}${opt.gesperrt ? " locked" : ""}${opt.mini ? " mini" : ""}`;
  if (opt.aktion) {
    return `<button class="${klassen}" data-act="${esc(opt.aktion)}" data-id="${esc(karte.id)}"${opt.disabled ? " disabled" : ""}>${inhalt}</button>`;
  }
  return `<div class="${klassen}">${inhalt}</div>`;
}
