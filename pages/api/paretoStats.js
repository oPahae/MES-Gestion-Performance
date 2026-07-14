import { query } from "../../lib/db";
import { computeDays } from "../../lib/dateUtils";
import { computeTempsChain } from "../../lib/kpiLogic";

function toPareto(countsMap, limit) {
  const entries = Object.entries(countsMap).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
  let cumulative = 0;
  const top = entries.slice(0, limit || entries.length);
  const rest = entries.slice(limit || entries.length);
  const restSum = rest.reduce((s, [, c]) => s + c, 0);
  const list = top.map(([name, nombre]) => {
    cumulative += nombre;
    return { name, nombre, cumule: Math.round((cumulative / total) * 100) };
  });
  if (restSum > 0) {
    cumulative += restSum;
    list.push({ name: "Autre", nombre: restSum, cumule: Math.round((cumulative / total) * 100) });
  }
  return list;
}

function sum(rows, field) {
  return rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
}

function dateKey(d) {
  return d instanceof Date ? d.toLocaleDateString("fr-CA") : String(d).slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  const { sheetId, periode, poste, startDate, endDate } = req.query;

  try {
    let first, last;
    if (startDate && endDate) {
      first = startDate;
      last = endDate;
    } else {
      const days = computeDays(periode === "mois" ? "mois" : "semaine");
      first = days[0];
      last = days[days.length - 1];
    }

    const selections = await query(
      "SELECT categorie, valeur FROM cause_selections WHERE sheet_id = ? AND date_jour BETWEEN ? AND ?",
      [sheetId, first, last]
    );

    const counts = { place: {}, risque: {}, defaut: {}, absence: {} };
    selections.forEach((s) => {
      if (s.categorie === "defaut") {
        if (poste && !s.valeur.endsWith(` — ${poste}`)) return;
        const key = s.valeur.split(" — ")[0];
        counts.defaut[key] = (counts.defaut[key] || 0) + 1;
        return;
      }
      counts[s.categorie][s.valeur] = (counts[s.categorie][s.valeur] || 0) + 1;
    });

    const placeCounts = Object.entries(counts.place).map(([place, count]) => ({ place, count }));
    const risquesPareto = toPareto(counts.risque, 4);
    const defautsPareto = toPareto(counts.defaut, 4);
    const absences = Object.entries(counts.absence)
      .sort((a, b) => b[1] - a[1])
      .map(([name, valeur]) => ({ name, valeur }));

    const tempsRows = await query(
      "SELECT date_jour, ouverture, planifie, arret, changement, rupture, autre, gammes FROM cause_temps WHERE sheet_id = ? AND date_jour BETWEEN ? AND ?",
      [sheetId, first, last]
    );
    const kpiRows = await query(
      "SELECT kpi_key, date_jour, data FROM kpi_daily_params WHERE sheet_id = ? AND date_jour BETWEEN ? AND ? AND kpi_key IN ('C','Q')",
      [sheetId, first, last]
    );

    const kpiByDateC = {};
    const kpiByDateQ = {};
    kpiRows.forEach((r) => {
      const key = dateKey(r.date_jour);
      const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      if (r.kpi_key === "C") kpiByDateC[key] = data;
      if (r.kpi_key === "Q") kpiByDateQ[key] = data;
    });

    const sumTemps = {
      ouverture: sum(tempsRows, "ouverture"),
      planifie: sum(tempsRows, "planifie"),
      arret: sum(tempsRows, "arret"),
      changement: sum(tempsRows, "changement"),
      rupture: sum(tempsRows, "rupture"),
      autre: sum(tempsRows, "autre"),
    };

    let sumTempsUtileMin = 0;
    let sumTempsNonQualiteMin = 0;
    tempsRows.forEach((row) => {
      const key = dateKey(row.date_jour);
      const qtyProduite = Number(kpiByDateC[key]?.quantiteProduite) || 0;
      const qtyRebut = Number(kpiByDateQ[key]?.rebuts) || 0;
      const gammes = Number(row.gammes) || 0;
      sumTempsUtileMin += gammes * qtyProduite;
      sumTempsNonQualiteMin += gammes * qtyRebut;
    });

    const tempsRequisMin = sumTemps.ouverture - sumTemps.planifie;
    const tempsFonctionnementMin =
      tempsRequisMin - (sumTemps.arret + sumTemps.changement + sumTemps.rupture + sumTemps.autre);
    const tempsNetMin = sumTempsUtileMin + sumTempsNonQualiteMin;
    const tempsRalentissementMin = tempsFonctionnementMin - tempsNetMin;

    const toH = (min) => Math.round((min / 60) * 100) / 100;

    const chain = {
      tempsRequisH: toH(tempsRequisMin),
      tempsFonctionnementH: toH(tempsFonctionnementMin),
      tempsUtileH: toH(sumTempsUtileMin),
      tempsNonQualiteH: toH(sumTempsNonQualiteMin),
      tempsNetH: toH(tempsNetMin),
      tempsRalentissementH: toH(tempsRalentissementMin),
      arret: toH(sumTemps.arret),
      changement: toH(sumTemps.changement),
      rupture: toH(sumTemps.rupture),
    };

    const tempsCout = [
      { name: "Arrêt\nmachine", valeur: chain.arret },
      { name: "Changement\nsérie", valeur: chain.changement },
      { name: "Rupture\nstock", valeur: chain.rupture },
      { name: "Non\nqualité", valeur: chain.tempsNonQualiteH },
      { name: "Ralentissement", valeur: chain.tempsRalentissementH },
    ];

    res.status(200).json({ first, last, placeCounts, risquesPareto, defautsPareto, absences, tempsCout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}