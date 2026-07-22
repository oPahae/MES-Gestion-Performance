export const D_STEPS = [
  { key: "D0", label: "D0 — Définir le problème" },
  { key: "D1", label: "D1 — Former l'équipe" },
  { key: "D2", label: "D2 — QQOQCCP" },
  { key: "D3", label: "D3 — Actions de sécurisation" },
  { key: "D4", label: "D4 — Causes racines" },
  { key: "D56", label: "D5/6 — Plan d'actions" },
  { key: "D7", label: "D7 — Transversalisation" },
  { key: "D8", label: "D8 — Validation" },
];

export const BLOCS = [
  { key: "methode", label: "Méthode", side: "top" },
  { key: "machine", label: "Machine", side: "top" },
  { key: "milieu", label: "Milieu", side: "top" },
  { key: "main_oeuvre", label: "Main d'œuvre", side: "bottom" },
  { key: "matiere", label: "Matière", side: "bottom" },
];

export const ACTION_STATUT_LABELS = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
};

// A row is "complete" as data (has content) — used only to decide if a table
// counts as started; kept for potential future use / backward compat.
export function isActionRowComplete(row) {
  return !!(row && row.action && row.action.trim() && row.pilote && row.pilote.trim());
}

// A row is "closed out" — statut = terminé AND an evidence file is attached.
// This is the bar for D3 / D5-6 / D7 to be checked off.
export function isActionRowClosed(row) {
  return !!(row && row.statut === "termine" && row.hasFile);
}

// A whole action list (by type) counts as complete only if it has at least
// one row, and every single row in it is closed out.
export function isActionListComplete(actions, type) {
  const rows = (actions || []).filter((a) => a.type === type);
  if (rows.length === 0) return false;
  return rows.every(isActionRowClosed);
}

export function computeCompletion(data) {
  const d0 = !!(data.probleme && data.probleme.trim() && data.ligne && data.ligne.trim());
  const d1 = !!(data.pilote && data.pilote.trim() && data.equipe && data.equipe.length > 0);
  const d2 = !!(
    data.quoi && data.qui && data.ou && data.quand_txt && data.combien && data.comment_txt && data.pourquoi &&
    data.quoi.trim() && data.qui.trim() && data.ou.trim() && data.quand_txt.trim() &&
    data.combien.trim() && data.comment_txt.trim() && data.pourquoi.trim()
  );

  const d3 = isActionListComplete(data.actions, "d3");

  const causeRacines = (data.causes || []).filter((c) => c.cause_racine);
  const d4 = causeRacines.length > 0;

  const d5 = isActionListComplete(data.actions, "d56");

  const d7TransComplete = isActionListComplete(data.actions, "d7_transverse");
  const d7AutreComplete = data.autre_ligne_existe
    ? isActionListComplete(data.actions, "d7_autre_ligne")
    : true; // not applicable when the user answered "Non"
  const d7 = d7TransComplete && d7AutreComplete;

  const d8 = !!(data.validation_nom && data.validation_nom.trim() && data.validation_date && data.validation_signature);

  return { D0: d0, D1: d1, D2: d2, D3: d3, D4: d4, D56: d5, D7: d7, D8: d8 };
}

export function computeStatutLabel(completion) {
  if (completion.D8) return "Clôturé";
  if (!completion.D0) return "En attente";
  const order = ["D0", "D1", "D2", "D3", "D4", "D56", "D7", "D8"];
  for (const key of order) {
    if (!completion[key]) {
      const label = key === "D56" ? "D5/6" : key;
      return `En cours – ${label}`;
    }
  }
  return "En cours – D8";
}

export function fmtLead(dateOuverture) {
  const start = new Date(dateOuverture);
  const now = new Date();
  let diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) diffMs = 0;
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}j ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}min`;
}