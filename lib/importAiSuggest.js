import { checkRange, MAX_COUNT, MAX_QTY, MAX_TIME_MIN, MAX_DATE_FUTURE_DAYS } from "./excelRules";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clampNumber(raw, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return "0";
  return String(Math.min(Math.max(Math.trunc(n), 0), max));
}

export function suggestFix(sheetName, field, row, validCodes) {
  if (field === "Date") return todayIso();
  if (field === "FeuilleCode") return validCodes && validCodes.length ? validCodes[0] : "";
  if (field === "KPI") return "S";
  if (field === "Categorie") return "risque";
  if (field === "Statut") return "a_faire";
  if (field === "Valeur" || field === "Probleme" || field === "Action") return "À compléter";
  if (field === "Pilote") return "";

  if (sheetName === "KPI_Params") {
    if (field === "Rebuts") {
      const total = Number(row.QuantiteTotale) || 0;
      return String(total);
    }
    if (["Accidents", "Risques", "RetoursClients", "Absents"].includes(field)) return clampNumber(row[field], MAX_COUNT);
    if (["QuantiteTotale", "QuantiteProduite", "QuantiteObjectif", "QuantitePlanifiee"].includes(field)) return clampNumber(row[field], MAX_QTY);
  }

  if (sheetName === "Causes_Temps") {
    if (field === "Planifie") return String(Number(row.Ouverture) || 0);
    if (field === "Arret") {
      const ouverture = Number(row.Ouverture) || 0;
      const planifie = Number(row.Planifie) || 0;
      const changement = Number(row.Changement) || 0;
      const rupture = Number(row.Rupture) || 0;
      const autre = Number(row.Autre) || 0;
      const tempsRequis = ouverture - planifie;
      const reste = tempsRequis - (changement + rupture + autre);
      return String(Math.max(0, reste));
    }
    if (["Ouverture", "Changement", "Rupture", "Autre", "Gammes"].includes(field)) return clampNumber(row[field], MAX_TIME_MIN);
  }

  if (sheetName === "Causes_Selections" && field === "Quantite") return clampNumber(row.Quantite, MAX_QTY);

  return null;
}