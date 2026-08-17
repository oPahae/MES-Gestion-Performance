export const KPI_KEYS = ["S", "Q", "C", "D", "P"];
export const CAUSE_CATEGORIES = ["place", "risque", "defaut", "absence"];
export const ACTION_STATUTS = ["a_faire", "en_cours", "termine"];

export const MAX_COUNT = 100000;
export const MAX_QTY = 1000000;
export const MAX_TIME_MIN = 100000;
export const MIN_DATE = "2000-01-01";
export const MAX_DATE_FUTURE_DAYS = 365;

export function isDateInAcceptableRange(dateStr) {
  if (!dateStr || dateStr < MIN_DATE) return false;
  const today = new Date();
  const maxFuture = new Date(today.getTime() + MAX_DATE_FUTURE_DAYS * 24 * 60 * 60 * 1000);
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  return d.getTime() <= maxFuture.getTime();
}

export function checkRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function toIntOrDefault(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.trunc(n);
}

export function toIntOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.trunc(n);
}

export function validateKpiRow(row, validCodes) {
  const errors = {};
  const feuilleCode = String(row.FeuilleCode || "").trim();
  const kpiKey = String(row.KPI || "").trim().toUpperCase();
  const dateJour = String(row.Date || "").trim();

  if (!feuilleCode) errors.FeuilleCode = "Feuille manquante.";
  else if (!validCodes.includes(feuilleCode)) errors.FeuilleCode = `Feuille "${feuilleCode}" introuvable.`;

  if (!KPI_KEYS.includes(kpiKey)) errors.KPI = `KPI "${row.KPI}" invalide.`;

  if (!dateJour) errors.Date = "Date manquante.";
  else if (!isDateInAcceptableRange(dateJour)) errors.Date = `Date hors plage acceptable (${MIN_DATE} à J+${MAX_DATE_FUTURE_DAYS}).`;

  let data = {};
  if (kpiKey === "S") {
    const accidents = toIntOrDefault(row.Accidents, 0);
    const risques = toIntOrDefault(row.Risques, 0);
    if (Number.isNaN(accidents) || !checkRange(accidents, 0, MAX_COUNT)) errors.Accidents = `Doit être un nombre entre 0 et ${MAX_COUNT}.`;
    if (Number.isNaN(risques) || !checkRange(risques, 0, MAX_COUNT)) errors.Risques = `Doit être un nombre entre 0 et ${MAX_COUNT}.`;
    data = { accidents, risques };
  } else if (kpiKey === "Q") {
    const retoursClients = toIntOrDefault(row.RetoursClients, 0);
    const rebuts = toIntOrDefault(row.Rebuts, 0);
    const quantiteTotale = toIntOrDefault(row.QuantiteTotale, 0);
    if (Number.isNaN(retoursClients) || !checkRange(retoursClients, 0, MAX_COUNT)) errors.RetoursClients = `Doit être un nombre entre 0 et ${MAX_COUNT}.`;
    if (Number.isNaN(rebuts) || !checkRange(rebuts, 0, MAX_QTY)) errors.Rebuts = `Doit être un nombre entre 0 et ${MAX_QTY}.`;
    if (Number.isNaN(quantiteTotale) || !checkRange(quantiteTotale, 0, MAX_QTY)) errors.QuantiteTotale = `Doit être un nombre entre 0 et ${MAX_QTY}.`;
    if (!Number.isNaN(rebuts) && !Number.isNaN(quantiteTotale) && rebuts > quantiteTotale) {
      errors.Rebuts = `Ne peut pas dépasser QuantiteTotale (${quantiteTotale}).`;
    }
    data = { retoursClients, rebuts, quantiteTotale };
  } else if (kpiKey === "C") {
    const quantiteProduite = toIntOrDefault(row.QuantiteProduite, 0);
    const quantiteObjectif = toIntOrDefault(row.QuantiteObjectif, 0);
    if (Number.isNaN(quantiteProduite) || !checkRange(quantiteProduite, 0, MAX_QTY)) errors.QuantiteProduite = `Doit être un nombre entre 0 et ${MAX_QTY}.`;
    if (Number.isNaN(quantiteObjectif) || !checkRange(quantiteObjectif, 0, MAX_QTY)) errors.QuantiteObjectif = `Doit être un nombre entre 0 et ${MAX_QTY}.`;
    data = { quantiteProduite, quantiteObjectif };
  } else if (kpiKey === "D") {
    const quantiteProduite = toIntOrDefault(row.QuantiteProduite, 0);
    const quantitePlanifiee = toIntOrDefault(row.QuantitePlanifiee, 0);
    if (Number.isNaN(quantiteProduite) || !checkRange(quantiteProduite, 0, MAX_QTY)) errors.QuantiteProduite = `Doit être un nombre entre 0 et ${MAX_QTY}.`;
    if (Number.isNaN(quantitePlanifiee) || !checkRange(quantitePlanifiee, 0, MAX_QTY)) errors.QuantitePlanifiee = `Doit être un nombre entre 0 et ${MAX_QTY}.`;
    data = { quantiteProduite, quantitePlanifiee };
  } else if (kpiKey === "P") {
    const absents = toIntOrDefault(row.Absents, 0);
    if (Number.isNaN(absents) || !checkRange(absents, 0, MAX_COUNT)) errors.Absents = `Doit être un nombre entre 0 et ${MAX_COUNT}.`;
    data = { absents };
  }

  return { errors, feuilleCode, kpiKey, dateJour, data };
}

export function validateTempsRow(row, validCodes) {
  const errors = {};
  const feuilleCode = String(row.FeuilleCode || "").trim();
  const dateJour = String(row.Date || "").trim();

  if (!feuilleCode) errors.FeuilleCode = "Feuille manquante.";
  else if (!validCodes.includes(feuilleCode)) errors.FeuilleCode = `Feuille "${feuilleCode}" introuvable.`;

  if (!dateJour) errors.Date = "Date manquante.";
  else if (!isDateInAcceptableRange(dateJour)) errors.Date = `Date hors plage acceptable (${MIN_DATE} à J+${MAX_DATE_FUTURE_DAYS}).`;

  const fieldsMap = {
    ouverture: toIntOrDefault(row.Ouverture, 0),
    planifie: toIntOrDefault(row.Planifie, 0),
    arret: toIntOrDefault(row.Arret, 0),
    changement: toIntOrDefault(row.Changement, 0),
    rupture: toIntOrDefault(row.Rupture, 0),
    autre: toIntOrDefault(row.Autre, 0),
    gammes: toIntOrDefault(row.Gammes, 0),
  };
  const columnByKey = { ouverture: "Ouverture", planifie: "Planifie", arret: "Arret", changement: "Changement", rupture: "Rupture", autre: "Autre", gammes: "Gammes" };
  Object.entries(fieldsMap).forEach(([key, val]) => {
    if (Number.isNaN(val) || !checkRange(val, 0, MAX_TIME_MIN)) {
      errors[columnByKey[key]] = `Doit être un nombre entre 0 et ${MAX_TIME_MIN}.`;
    }
  });

  if (!errors.Planifie && !errors.Ouverture && fieldsMap.planifie > fieldsMap.ouverture) {
    errors.Planifie = `Ne peut pas dépasser Ouverture (${fieldsMap.ouverture}).`;
  }

  const sommeArrets = fieldsMap.arret + fieldsMap.changement + fieldsMap.rupture + fieldsMap.autre;
  const tempsRequis = fieldsMap.ouverture - fieldsMap.planifie;
  if (!errors.Arret && !errors.Changement && !errors.Rupture && !errors.Autre && !errors.Planifie && !errors.Ouverture) {
    if (sommeArrets > tempsRequis) {
      errors.Arret = `La somme des arrêts (${sommeArrets}) dépasse le temps requis (${tempsRequis}).`;
    }
  }

  return { errors, feuilleCode, dateJour, ...fieldsMap };
}

export function validateCausesRow(row, validCodes) {
  const errors = {};
  const feuilleCode = String(row.FeuilleCode || "").trim();
  const dateJour = String(row.Date || "").trim();
  const categorie = String(row.Categorie || "").trim().toLowerCase();
  const valeur = String(row.Valeur || "").trim();
  const quantite = toIntOrNull(row.Quantite);

  if (!feuilleCode) errors.FeuilleCode = "Feuille manquante.";
  else if (!validCodes.includes(feuilleCode)) errors.FeuilleCode = `Feuille "${feuilleCode}" introuvable.`;

  if (!dateJour) errors.Date = "Date manquante.";
  else if (!isDateInAcceptableRange(dateJour)) errors.Date = `Date hors plage acceptable (${MIN_DATE} à J+${MAX_DATE_FUTURE_DAYS}).`;

  if (!CAUSE_CATEGORIES.includes(categorie)) errors.Categorie = `Catégorie "${row.Categorie}" invalide.`;
  if (!valeur) errors.Valeur = "Valeur manquante.";
  else if (valeur.length > 150) errors.Valeur = "150 caractères maximum.";

  if (Number.isNaN(quantite)) errors.Quantite = "Doit être un nombre.";
  else if (quantite !== null && !checkRange(quantite, 0, MAX_QTY)) errors.Quantite = `Doit être entre 0 et ${MAX_QTY}.`;

  return { errors, feuilleCode, dateJour, categorie, valeur, quantite };
}

export function validateActionsRow(row, validCodes) {
  const errors = {};
  const feuilleCode = String(row.FeuilleCode || "").trim();
  const dateJour = String(row.Date || "").trim();
  const kpiKey = String(row.KPI || "S").trim().toUpperCase();
  const probleme = String(row.Probleme || "").trim();
  const action = String(row.Action || "").trim();
  const pilote = String(row.Pilote || "").trim();
  const statut = String(row.Statut || "a_faire").trim().toLowerCase();

  if (!feuilleCode) errors.FeuilleCode = "Feuille manquante.";
  else if (!validCodes.includes(feuilleCode)) errors.FeuilleCode = `Feuille "${feuilleCode}" introuvable.`;

  if (!dateJour) errors.Date = "Date manquante.";
  else if (!isDateInAcceptableRange(dateJour)) errors.Date = `Date hors plage acceptable (${MIN_DATE} à J+${MAX_DATE_FUTURE_DAYS}).`;

  if (!KPI_KEYS.includes(kpiKey)) errors.KPI = `KPI "${row.KPI}" invalide.`;
  if (!probleme) errors.Probleme = "Problème manquant.";
  else if (probleme.length > 200) errors.Probleme = "200 caractères maximum.";
  if (!action) errors.Action = "Action manquante.";
  else if (action.length > 200) errors.Action = "200 caractères maximum.";
  if (pilote.length > 100) errors.Pilote = "100 caractères maximum.";
  if (!ACTION_STATUTS.includes(statut)) errors.Statut = `Statut "${row.Statut}" invalide.`;

  return { errors, feuilleCode, dateJour, kpiKey, probleme, action, pilote, statut };
}