// pages/api/exportExcel.js
import { query } from "../../lib/db";
import * as XLSX from "xlsx";

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Méthode non autorisée." });
  }

  const { sheetIds, dateFrom, dateTo } = req.query;

  if (!dateFrom || !dateTo) {
    return res.status(400).json({ message: "dateFrom et dateTo sont requis." });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return res.status(400).json({ message: "Format de date invalide, attendu YYYY-MM-DD." });
  }

  if (dateFrom > dateTo) {
    return res.status(400).json({ message: "dateFrom doit précéder dateTo." });
  }

  let ids = [];
  if (sheetIds && String(sheetIds).trim() !== "" && sheetIds !== "all") {
    ids = String(sheetIds)
      .split(",")
      .map((v) => parseInt(v, 10))
      .filter((v) => Number.isInteger(v));
    if (ids.length === 0) {
      return res.status(400).json({ message: "sheetIds invalide." });
    }
  }

  try {
    const sheetsRows = await query("SELECT id, code, label FROM sheets ORDER BY id");
    const sheetFilter = ids.length > 0 ? sheetsRows.filter((s) => ids.includes(s.id)) : sheetsRows;
    const filterIds = sheetFilter.map((s) => s.id);

    if (filterIds.length === 0) {
      return res.status(400).json({ message: "Aucune feuille correspondante." });
    }

    const placeholders = filterIds.map(() => "?").join(",");

    const kpiRows = await query(
      `SELECT s.code AS feuille, k.kpi_key, k.date_jour, k.data
       FROM kpi_daily_params k
       JOIN sheets s ON s.id = k.sheet_id
       WHERE k.sheet_id IN (${placeholders}) AND k.date_jour BETWEEN ? AND ?
       ORDER BY s.code, k.date_jour, k.kpi_key`,
      [...filterIds, dateFrom, dateTo]
    );

    const tempsRows = await query(
      `SELECT s.code AS feuille, t.date_jour, t.ouverture, t.planifie, t.arret, t.changement, t.rupture, t.autre, t.gammes
       FROM cause_temps t
       JOIN sheets s ON s.id = t.sheet_id
       WHERE t.sheet_id IN (${placeholders}) AND t.date_jour BETWEEN ? AND ?
       ORDER BY s.code, t.date_jour`,
      [...filterIds, dateFrom, dateTo]
    );

    const causesRows = await query(
      `SELECT s.code AS feuille, c.date_jour, c.categorie, c.valeur, c.quantite
       FROM cause_selections c
       JOIN sheets s ON s.id = c.sheet_id
       WHERE c.sheet_id IN (${placeholders}) AND c.date_jour BETWEEN ? AND ?
       ORDER BY s.code, c.date_jour, c.categorie`,
      [...filterIds, dateFrom, dateTo]
    );

    const actionsRows = await query(
      `SELECT s.code AS feuille, a.date_jour, a.kpi_key, a.probleme, a.action, a.pilote, a.statut
       FROM actions a
       JOIN sheets s ON s.id = a.sheet_id
       WHERE a.sheet_id IN (${placeholders}) AND a.date_jour BETWEEN ? AND ?
       ORDER BY s.code, a.date_jour`,
      [...filterIds, dateFrom, dateTo]
    );

    const kpiSheetData = kpiRows.map((r) => {
      const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      return {
        FeuilleCode: r.feuille,
        KPI: r.kpi_key,
        Date: fmtDate(r.date_jour),
        Accidents: data.accidents ?? "",
        Risques: data.risques ?? "",
        RetoursClients: data.retoursClients ?? "",
        Rebuts: data.rebuts ?? "",
        QuantiteTotale: data.quantiteTotale ?? "",
        QuantiteProduite: data.quantiteProduite ?? "",
        QuantiteObjectif: data.quantiteObjectif ?? "",
        QuantitePlanifiee: data.quantitePlanifiee ?? "",
        Absents: data.absents ?? "",
      };
    });

    const tempsSheetData = tempsRows.map((r) => ({
      FeuilleCode: r.feuille,
      Date: fmtDate(r.date_jour),
      Ouverture: r.ouverture,
      Planifie: r.planifie,
      Arret: r.arret,
      Changement: r.changement,
      Rupture: r.rupture,
      Autre: r.autre,
      Gammes: r.gammes,
    }));

    const causesSheetData = causesRows.map((r) => ({
      FeuilleCode: r.feuille,
      Date: fmtDate(r.date_jour),
      Categorie: r.categorie,
      Valeur: r.valeur,
      Quantite: r.quantite ?? "",
    }));

    const actionsSheetData = actionsRows.map((r) => ({
      FeuilleCode: r.feuille,
      Date: fmtDate(r.date_jour),
      KPI: r.kpi_key,
      Probleme: r.probleme,
      Action: r.action,
      Pilote: r.pilote,
      Statut: r.statut,
    }));

    const emptyKpi = [{ FeuilleCode: "", KPI: "", Date: "", Accidents: "", Risques: "", RetoursClients: "", Rebuts: "", QuantiteTotale: "", QuantiteProduite: "", QuantiteObjectif: "", QuantitePlanifiee: "", Absents: "" }];
    const emptyTemps = [{ FeuilleCode: "", Date: "", Ouverture: "", Planifie: "", Arret: "", Changement: "", Rupture: "", Autre: "", Gammes: "" }];
    const emptyCauses = [{ FeuilleCode: "", Date: "", Categorie: "", Valeur: "", Quantite: "" }];
    const emptyActions = [{ FeuilleCode: "", Date: "", KPI: "", Probleme: "", Action: "", Pilote: "", Statut: "" }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiSheetData.length ? kpiSheetData : emptyKpi), "KPI_Params");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tempsSheetData.length ? tempsSheetData : emptyTemps), "Causes_Temps");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(causesSheetData.length ? causesSheetData : emptyCauses), "Causes_Selections");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actionsSheetData.length ? actionsSheetData : emptyActions), "Actions");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="mes_performance_export_${dateFrom}_${dateTo}.xlsx"`);
    res.status(200).send(buf);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de l'export.", detail: err.message });
  }
}