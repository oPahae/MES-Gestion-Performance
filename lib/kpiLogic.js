export const KPI_ORDER = ["S", "Q", "C", "D", "P"];

export const KPI_INFO = {
  S: { color: "#E53935", label: "Sécurité" },
  Q: { color: "#8E24AA", label: "Qualité" },
  C: { color: "#FB8C00", label: "Coût" },
  D: { color: "#1E88E5", label: "Délai" },
  P: { color: "#43A047", label: "Personnel" },
};

export const STATUS_COLORS = {
  green: "#4CAF50",
  gray: "#B9C0CC",
  orange: "#FB8C00",
  red: "#E53935",
  white: "#F3F4F6",
  today: "#3B82F6",
  selected: "#FBBF24",
};

export const STATUS_LEGEND = [
  { key: "green", label: "Objectif atteint" },
  { key: "gray", label: "Donnée normale (RAS)" },
  { key: "orange", label: "Alerte" },
  { key: "red", label: "Non conforme / Critique" },
  { key: "white", label: "Pas de donnée" },
];

export const PLACE_OPTIONS = ["Main gauche", "Main droite", "Épaule droite", "Épaule gauche", "Dos", "Genou", "Cheville", "Tête", "Doigt"];

export const PLACE_COORDS = {
  "Épaule droite": { x: 78, y: 45 },
  "Épaule gauche": { x: 32, y: 45 },
  "Main gauche": { x: 16, y: 88 },
  "Main droite": { x: 94, y: 88 },
  Dos: { x: 55, y: 95 },
  "Genou gauche": { x: 42, y: 145 },
  Genou: { x: 42, y: 145 },
  "Cheville droite": { x: 58, y: 185 },
  Cheville: { x: 58, y: 185 },
  Tête: { x: 55, y: 15 },
  Doigt: { x: 20, y: 100 },
};

export const STATUT_LABELS = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
};

export function countStatus(n) {
  n = Number(n) || 0;
  if (n <= 0) return "green";
  if (n <= 2) return "orange";
  return "red";
}

export function ratioHigherBetter(pct) {
  pct = Number(pct) || 0;
  if (pct >= 95) return "green";
  if (pct >= 85) return "orange";
  return "red";
}

export function ratioLowerBetter(pct) {
  pct = Number(pct) || 0;
  if (pct <= 3) return "green";
  if (pct <= 7) return "orange";
  return "red";
}

export function getRingConfig(kpiKey, sheetType) {
  if (kpiKey === "S")
    return [
      { name: "Accidents", type: "count" },
      { name: "Risques", type: "count" },
    ];
  if (kpiKey === "Q")
    return [
      { name: "Retours clients", type: "count" },
      { name: "Taux de rebut", type: "percent" },
    ];
  if (kpiKey === "C") return [{ name: sheetType === "machine" ? "TRS" : "Efficience", type: "percent" }];
  if (kpiKey === "D") return [{ name: "PDP", type: "percent" }];
  if (kpiKey === "P") return [{ name: "Absents", type: "count" }];
  return [];
}

export function computeRingValue(kpiKey, ringName, params) {
  if (!params) return { value: null, status: "white" };
  if (kpiKey === "S") {
    const v = ringName === "Accidents" ? params.accidents : params.risques;
    if (v === undefined || v === null) return { value: null, status: "white" };
    return { value: v, status: countStatus(v) };
  }
  if (kpiKey === "Q") {
    if (ringName === "Retours clients") {
      const v = params.retoursClients;
      if (v === undefined || v === null) return { value: null, status: "white" };
      return { value: v, status: countStatus(v) };
    }
    if (params.quantiteTotale === undefined || params.rebuts === undefined) return { value: null, status: "white" };
    const pct = params.quantiteTotale > 0 ? (params.rebuts / params.quantiteTotale) * 100 : 0;
    return { value: Math.round(pct * 10) / 10, status: ratioLowerBetter(pct) };
  }
  if (kpiKey === "C") {
    if (params.quantiteObjectif === undefined || params.quantiteProduite === undefined) return { value: null, status: "white" };
    const pct = params.quantiteObjectif > 0 ? (params.quantiteProduite / params.quantiteObjectif) * 100 : 0;
    return { value: Math.round(pct), status: ratioHigherBetter(pct) };
  }
  if (kpiKey === "D") {
    if (params.quantitePlanifiee === undefined || params.quantiteProduite === undefined) return { value: null, status: "white" };
    const pct = params.quantitePlanifiee > 0 ? (params.quantiteProduite / params.quantitePlanifiee) * 100 : 0;
    return { value: Math.round(pct), status: ratioHigherBetter(pct) };
  }
  if (kpiKey === "P") {
    const v = params.absents;
    if (v === undefined || v === null) return { value: null, status: "white" };
    return { value: v, status: countStatus(v) };
  }
  return { value: null, status: "white" };
}

export function formatRingValue(value, type) {
  if (value === undefined || value === null || Number.isNaN(value)) return "–";
  return type === "percent" ? `${value}%` : `${value}`;
}

export function computeTempsChain(temps, quantiteProduite, quantiteRebut) {
  const ouverture = Number(temps.ouverture) || 0;
  const planifie = Number(temps.planifie) || 0;
  const arret = Number(temps.arret) || 0;
  const changement = Number(temps.changement) || 0;
  const rupture = Number(temps.rupture) || 0;
  const autre = Number(temps.autre) || 0;
  const gammes = Number(temps.gammes) || 0;
  const qtyProduced = Number(quantiteProduite) || 0;
  const qtyRebut = Number(quantiteRebut) || 0;

  const tempsRequisMin = ouverture - planifie;
  const tempsFonctionnementMin = tempsRequisMin - (arret + changement + rupture + autre);
  const tempsUtileMin = gammes * qtyProduced;
  const tempsNonQualiteMin = gammes * qtyRebut;
  const tempsNetMin = tempsUtileMin + tempsNonQualiteMin;
  const tempsRalentissementMin = tempsFonctionnementMin - tempsNetMin;

  const toH = (min) => Math.round((min / 60) * 100) / 100;

  return {
    arret: toH(arret),
    changement: toH(changement),
    rupture: toH(rupture),
    tempsRequisH: toH(tempsRequisMin),
    tempsFonctionnementH: toH(tempsFonctionnementMin),
    tempsNetH: toH(tempsNetMin),
    tempsUtileH: toH(tempsUtileMin),
    tempsNonQualiteH: toH(tempsNonQualiteMin),
    tempsRalentissementH: toH(tempsRalentissementMin),
    tempsRequisMin,
    tempsFonctionnementMin,
    tempsNetMin,
    tempsUtileMin,
    tempsNonQualiteMin,
    tempsRalentissementMin,
  };
}

export function computeQuantiteObjectif(tempsCycleLigne, tempsRequisH) {
  const cycle = Number(tempsCycleLigne) || 0;
  const requisH = Number(tempsRequisH) || 0;
  if (cycle <= 0) return 0;
  return Math.round((60 / cycle) * requisH);
}

export const KPI_TREND_FIELDS = {
  S: [
    { key: "accidents", label: "Accidents", color: "#E53935", type: "count" },
    { key: "risques", label: "Risques", color: "#FB8C00", type: "count" },
  ],
  Q: [
    { key: "retoursClients", label: "Retours clients", color: "#8E24AA", type: "count" },
    { key: "tauxRebut", label: "Taux de rebut", color: "#3B82F6", type: "percent" },
  ],
  C: [
    { key: "efficience", label: "TRS/Efficience", color: "#FB8C00", type: "percent" },
    { key: "disponibilite", label: "Disponibilité", color: "#1E88E5", type: "percent" },
    { key: "performance", label: "Performance", color: "#43A047", type: "percent" },
    { key: "qualite", label: "Qualité", color: "#8E24AA", type: "percent" },
  ],
  D: [{ key: "pdp", label: "PDP", color: "#1E88E5", type: "percent" }],
  P: [{ key: "absents", label: "Absents", color: "#43A047", type: "count" }],
};