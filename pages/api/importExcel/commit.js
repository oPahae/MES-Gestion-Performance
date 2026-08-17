import { query, getPool } from "../../../lib/db";
import { validateKpiRow, validateTempsRow, validateCausesRow, validateActionsRow } from "../../../lib/excelRules";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Méthode non autorisée." });

  const { sheets } = req.body || {};
  if (!sheets || typeof sheets !== "object") return res.status(400).json({ message: "Données manquantes." });

  const sheetsRows = await query("SELECT id, code FROM sheets");
  const codeToId = new Map(sheetsRows.map((s) => [s.code, s.id]));
  const validCodes = [...codeToId.keys()];

  const kpiInserts = [];
  const tempsInserts = [];
  const causesInserts = [];
  const actionsInserts = [];
  const outSheets = {};
  let hasErrors = false;

  (sheets.KPI_Params || []).forEach((row, idx) => {
    const { errors, feuilleCode, kpiKey, dateJour, data } = validateKpiRow(row, validCodes);
    if (Object.keys(errors).length) {
      hasErrors = true;
      outSheets.KPI_Params = outSheets.KPI_Params || [];
      outSheets.KPI_Params.push({ line: idx + 2, data: row, errors });
      return;
    }
    kpiInserts.push({ sheetId: codeToId.get(feuilleCode), kpiKey, dateJour, data: JSON.stringify(data) });
  });

  (sheets.Causes_Temps || []).forEach((row, idx) => {
    const { errors, feuilleCode, dateJour, ouverture, planifie, arret, changement, rupture, autre, gammes } = validateTempsRow(row, validCodes);
    if (Object.keys(errors).length) {
      hasErrors = true;
      outSheets.Causes_Temps = outSheets.Causes_Temps || [];
      outSheets.Causes_Temps.push({ line: idx + 2, data: row, errors });
      return;
    }
    tempsInserts.push({ sheetId: codeToId.get(feuilleCode), dateJour, ouverture, planifie, arret, changement, rupture, autre, gammes });
  });

  (sheets.Causes_Selections || []).forEach((row, idx) => {
    const { errors, feuilleCode, dateJour, categorie, valeur, quantite } = validateCausesRow(row, validCodes);
    if (Object.keys(errors).length) {
      hasErrors = true;
      outSheets.Causes_Selections = outSheets.Causes_Selections || [];
      outSheets.Causes_Selections.push({ line: idx + 2, data: row, errors });
      return;
    }
    causesInserts.push({ sheetId: codeToId.get(feuilleCode), dateJour, categorie, valeur, quantite });
  });

  (sheets.Actions || []).forEach((row, idx) => {
    const { errors, feuilleCode, dateJour, kpiKey, probleme, action, pilote, statut } = validateActionsRow(row, validCodes);
    if (Object.keys(errors).length) {
      hasErrors = true;
      outSheets.Actions = outSheets.Actions || [];
      outSheets.Actions.push({ line: idx + 2, data: row, errors });
      return;
    }
    actionsInserts.push({ sheetId: codeToId.get(feuilleCode), dateJour, kpiKey, probleme, action, pilote, statut });
  });

  if (hasErrors) {
    return res.status(400).json({ message: "Certaines lignes contiennent encore des erreurs.", sheets: outSheets, validCodes });
  }

  if (kpiInserts.length === 0 && tempsInserts.length === 0 && causesInserts.length === 0 && actionsInserts.length === 0) {
    return res.status(400).json({ message: "Aucune ligne à importer." });
  }

  const pool = getPool();
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const row of kpiInserts) {
      await connection.execute(
        `INSERT INTO kpi_daily_params (sheet_id, kpi_key, date_jour, data) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [row.sheetId, row.kpiKey, row.dateJour, row.data]
      );
    }
    for (const row of tempsInserts) {
      await connection.execute(
        `INSERT INTO cause_temps (sheet_id, date_jour, ouverture, planifie, arret, changement, rupture, autre, gammes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE ouverture=VALUES(ouverture), planifie=VALUES(planifie), arret=VALUES(arret),
           changement=VALUES(changement), rupture=VALUES(rupture), autre=VALUES(autre), gammes=VALUES(gammes)`,
        [row.sheetId, row.dateJour, row.ouverture, row.planifie, row.arret, row.changement, row.rupture, row.autre, row.gammes]
      );
    }
    for (const row of causesInserts) {
      await connection.execute(
        `INSERT INTO cause_selections (sheet_id, date_jour, categorie, valeur, quantite) VALUES (?, ?, ?, ?, ?)`,
        [row.sheetId, row.dateJour, row.categorie, row.valeur, row.quantite]
      );
    }
    for (const row of actionsInserts) {
      await connection.execute(
        `INSERT INTO actions (sheet_id, date_jour, probleme, action, pilote, statut, kpi_key) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.sheetId, row.dateJour, row.probleme, row.action, row.pilote, row.statut, row.kpiKey]
      );
    }

    await connection.commit();
    connection.release();
    connection = null;

    res.status(200).json({
      message: "Import terminé avec succès.",
      counts: { kpi: kpiInserts.length, temps: tempsInserts.length, causes: causesInserts.length, actions: actionsInserts.length },
    });
  } catch (err) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
      connection.release();
    }
    res.status(500).json({ message: "Erreur lors de l'import.", detail: err.message });
  }
}