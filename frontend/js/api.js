// Duenne Schicht ueber die JSON-API des Backends.
async function anfrage(pfad, body) {
  const r = await fetch(pfad, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const daten = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(daten.fehler || `Serverfehler (${r.status})`);
  return daten;
}

export const api = {
  config: () => anfrage("/api/config"),
  challenge: () => anfrage("/api/challenge"),
  bestenlisten: () => anfrage("/api/highscores"),
  profil: name => anfrage(`/api/profile?name=${encodeURIComponent(name)}`),
  start: (name, modus, era) => anfrage("/api/run/start", { name, modus, era }),
  pick: (name, karte) => anfrage("/api/run/pick", { name, karte }),
  reroll: name => anfrage("/api/run/reroll", { name }),
  rennen: name => anfrage("/api/run/race", { name }),
  kaufen: (name, upgrade, slot) => anfrage("/api/run/buy", { name, upgrade, slot }),
  aufgeben: name => anfrage("/api/run/abandon", { name }),
  klassik: (name, p) => anfrage("/api/klassik", { name, ...p }),
  klassikReset: () => anfrage("/api/klassik/reset", {}),
};
