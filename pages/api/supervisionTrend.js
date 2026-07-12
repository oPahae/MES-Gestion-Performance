import { query } from "../../lib/db";
import { computeTempsChain } from "../../lib/kpiLogic";
import { addDaysIso, fmtWeekLabel } from "../../lib/dateUtils";

function dateKey(d) {
  if (!(d instanceof Date)) return String(d).slice(0, 10);
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { sheetId, kpi, weeks } = req.query;
  if (!sheetId || !kpi || !weeks) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  try {
    const weekStarts = weeks.split(",");
    const first = weekStarts[0];
    const last = addDaysIso(weekStarts[weekStarts.length - 1], 6);

    function weekOf(iso) {
      return weekStarts.find((w) => iso >= w && iso <= addDaysIso(w, 6));
    }

    const rows = await query(
      "SELECT date_jour, data FROM kpi_daily_params WHERE sheet_id = ? AND kpi_key = ? AND date_jour BETWEEN ? AND ?",
      [sheetId, kpi, first, last]
    );

    const sumsByWeek = {};
    rows.forEach((r) => {
      const iso = dateKey(r.date_jour);
      const wk = weekOf(iso);
      if (!wk) return;
      sumsByWeek[wk] = sumsByWeek[wk] || {};
      const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      Object.entries(data || {}).forEach(([f, v]) => {
        sumsByWeek[wk][f] = (sumsByWeek[wk][f] || 0) + (Number(v) || 0);
      });
    });

    let tempsSumsByWeek = {};
    let gammesByWeek = {};
    let rebutSumsByWeek = {};

    if (kpi === "C") {
      const tempsRows = await query(
        "SELECT date_jour, ouverture, planifie, arret, changement, rupture, autre, gammes FROM cause_temps WHERE sheet_id = ? AND date_jour BETWEEN ? AND ?",
        [sheetId, first, last]
      );
      tempsRows.forEach((r) => {
        const iso = dateKey(r.date_jour);
        const wk = weekOf(iso);
        if (!wk) return;
        tempsSumsByWeek[wk] = tempsSumsByWeek[wk] || { ouverture: 0, planifie: 0, arret: 0, changement: 0, rupture: 0, autre: 0 };
        tempsSumsByWeek[wk].ouverture += Number(r.ouverture) || 0;
        tempsSumsByWeek[wk].planifie += Number(r.planifie) || 0;
        tempsSumsByWeek[wk].arret += Number(r.arret) || 0;
        tempsSumsByWeek[wk].changement += Number(r.changement) || 0;
        tempsSumsByWeek[wk].rupture += Number(r.rupture) || 0;
        tempsSumsByWeek[wk].autre += Number(r.autre) || 0;
        gammesByWeek[wk] = gammesByWeek[wk] || [];
        gammesByWeek[wk].push(Number(r.gammes) || 0);
      });

      const qRows = await query(
        "SELECT date_jour, data FROM kpi_daily_params WHERE sheet_id = ? AND kpi_key = 'Q' AND date_jour BETWEEN ? AND ?",
        [sheetId, first, last]
      );
      qRows.forEach((r) => {
        const iso = dateKey(r.date_jour);
        const wk = weekOf(iso);
        if (!wk) return;
        const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
        rebutSumsByWeek[wk] = (rebutSumsByWeek[wk] || 0) + (Number(data.rebuts) || 0);
      });
    }

    const result = weekStarts.map((wk) => {
      const sums = sumsByWeek[wk] || {};
      const item = { weekStart: wk, weekLabel: fmtWeekLabel(wk) };

      if (kpi === "S") {
        item.accidents = sums.accidents || 0;
        item.risques = sums.risques || 0;
      } else if (kpi === "Q") {
        const total = sums.quantiteTotale || 0;
        const rebuts = sums.rebuts || 0;
        item.retoursClients = sums.retoursClients || 0;
        item.tauxRebut = total > 0 ? Number(((rebuts / total) * 100).toFixed(1)) : 0;
      } else if (kpi === "C") {
        const objectif = sums.quantiteObjectif || 0;
        const produite = sums.quantiteProduite || 0;
        item.efficience = objectif > 0 ? Number(((produite / objectif) * 100).toFixed(1)) : 0;

        const temps = tempsSumsByWeek[wk];
        if (temps) {
          const gArr = gammesByWeek[wk] || [];
          const gammes = gArr.length ? gArr.reduce((a, b) => a + b, 0) / gArr.length : 0;
          const qtyRebut = rebutSumsByWeek[wk] || 0;
          const chain = computeTempsChain({ ...temps, gammes }, produite, qtyRebut);
          item.disponibilite = chain.tempsRequisMin > 0 ? Number(((chain.tempsFonctionnementMin / chain.tempsRequisMin) * 100).toFixed(1)) : 0;
          item.performance = chain.tempsRequisMin > 0 ? Number(((chain.tempsNetMin / chain.tempsRequisMin) * 100).toFixed(1)) : 0;
          item.qualite = chain.tempsRequisMin > 0 ? Number(((chain.tempsUtileMin / chain.tempsRequisMin) * 100).toFixed(1)) : 0;
        } else {
          item.disponibilite = null;
          item.performance = null;
          item.qualite = null;
        }
      } else if (kpi === "D") {
        const planifiee = sums.quantitePlanifiee || 0;
        const produite = sums.quantiteProduite || 0;
        item.pdp = planifiee > 0 ? Number(((produite / planifiee) * 100).toFixed(1)) : 0;
      } else if (kpi === "P") {
        item.absents = sums.absents || 0;
      }

      return item;
    });

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}