import { query } from "../../lib/db";
import { computeTempsChain } from "../../lib/kpiLogic";

function computeValue(kpi, data) {
  if (!data) return null;
  switch (kpi) {
    case "S":
      return (Number(data.accidents) || 0) + (Number(data.risques) || 0);
    case "Q": {
      const total = Number(data.quantiteTotale) || 0;
      const rebuts = Number(data.rebuts) || 0;
      return total > 0 ? Number(((rebuts / total) * 100).toFixed(1)) : 0;
    }
    case "C": {
      const objectif = Number(data.quantiteObjectif) || 0;
      const produite = Number(data.quantiteProduite) || 0;
      return objectif > 0 ? Number(((produite / objectif) * 100).toFixed(1)) : 0;
    }
    case "D": {
      const planifiee = Number(data.quantitePlanifiee) || 0;
      const produite = Number(data.quantiteProduite) || 0;
      return planifiee > 0 ? Number(((produite / planifiee) * 100).toFixed(1)) : 0;
    }
    case "P":
      return Number(data.absents) || 0;
    default:
      return null;
  }
}

function dateKey(d) {
  if (!(d instanceof Date)) return String(d).slice(0, 10);
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { sheetId, kpi, startDate, endDate } = req.query;
  if (!sheetId || !kpi || !startDate || !endDate) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  try {
    const rows = await query(
      `SELECT date_jour, data FROM kpi_daily_params
       WHERE sheet_id = ? AND kpi_key = ? AND date_jour BETWEEN ? AND ?
       ORDER BY date_jour ASC`,
      [sheetId, kpi, startDate, endDate]
    );

    const byDate = {};
    rows.forEach((r) => {
      byDate[dateKey(r.date_jour)] = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    });

    let tempsByDate = {};
    let rebutByDate = {};
    if (kpi === "C") {
      const tempsRows = await query(
        `SELECT date_jour, ouverture, planifie, arret, changement, rupture, autre, gammes FROM cause_temps
         WHERE sheet_id = ? AND date_jour BETWEEN ? AND ?`,
        [sheetId, startDate, endDate]
      );
      tempsRows.forEach((r) => {
        tempsByDate[dateKey(r.date_jour)] = r;
      });

      const qRows = await query(
        `SELECT date_jour, data FROM kpi_daily_params WHERE sheet_id = ? AND kpi_key = 'Q' AND date_jour BETWEEN ? AND ?`,
        [sheetId, startDate, endDate]
      );
      qRows.forEach((r) => {
        rebutByDate[dateKey(r.date_jour)] = (typeof r.data === "string" ? JSON.parse(r.data) : r.data) || {};
      });
    }

    const result = [];
    let cursor = startDate;
    while (cursor <= endDate) {
      const data = byDate[cursor] || null;
      const item = { date: cursor, valeur: computeValue(kpi, data) };

      if (kpi === "C") {
        const temps = tempsByDate[cursor];
        if (temps) {
          const qtyProduced = data ? Number(data.quantiteProduite) || 0 : 0;
          const qtyRebut = rebutByDate[cursor] ? Number(rebutByDate[cursor].rebuts) || 0 : 0;
          const chain = computeTempsChain(temps, qtyProduced, qtyRebut);
          item.disponibilite = chain.tempsRequisMin > 0 ? Number(((chain.tempsFonctionnementMin / chain.tempsRequisMin) * 100).toFixed(1)) : 0;
          item.performance = chain.tempsRequisMin > 0 ? Number(((chain.tempsNetMin / chain.tempsRequisMin) * 100).toFixed(1)) : 0;
          item.qualite = chain.tempsRequisMin > 0 ? Number(((chain.tempsUtileMin / chain.tempsRequisMin) * 100).toFixed(1)) : 0;
        } else {
          item.disponibilite = null;
          item.performance = null;
          item.qualite = null;
        }
      }

      result.push(item);
      const next = new Date(cursor);
      next.setDate(next.getDate() + 1);
      cursor = next.toISOString().slice(0, 10);
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}