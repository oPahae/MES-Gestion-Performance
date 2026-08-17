import formidable from "formidable";
import fs from "fs";
import * as XLSX from "xlsx";
import { query } from "../../../lib/db";
import { readWorkbookSheet } from "../../../lib/excelParse";
import { validateKpiRow, validateTempsRow, validateCausesRow, validateActionsRow } from "../../../lib/excelRules";

export const config = { api: { bodyParser: false } };

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, maxFileSize: 20 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

const KPI_COLUMNS = ["FeuilleCode", "KPI", "Date", "Accidents", "Risques", "RetoursClients", "Rebuts", "QuantiteTotale", "QuantiteProduite", "QuantiteObjectif", "QuantitePlanifiee", "Absents"];
const TEMPS_COLUMNS = ["FeuilleCode", "Date", "Ouverture", "Planifie", "Arret", "Changement", "Rupture", "Autre", "Gammes"];
const CAUSES_COLUMNS = ["FeuilleCode", "Date", "Categorie", "Valeur", "Quantite"];
const ACTIONS_COLUMNS = ["FeuilleCode", "Date", "KPI", "Probleme", "Action", "Pilote", "Statut"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Méthode non autorisée." });

  let files;
  try {
    ({ files } = await parseForm(req));
  } catch (err) {
    return res.status(400).json({ message: "Fichier invalide.", detail: err.message });
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ message: "Aucun fichier fourni." });

  let workbook;
  try {
    const buffer = fs.readFileSync(file.filepath);
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (err) {
    try { fs.unlinkSync(file.filepath); } catch (_) {}
    return res.status(400).json({ message: "Impossible de lire le fichier Excel.", detail: err.message });
  }
  try { fs.unlinkSync(file.filepath); } catch (_) {}

  const sheetsRows = await query("SELECT id, code, label FROM sheets");
  const validCodes = sheetsRows.map((s) => s.code);

  const result = { validCodes, sheets: {}, hasErrors: false };

  const kpiRows = readWorkbookSheet(workbook, "KPI_Params", KPI_COLUMNS);
  if (kpiRows) {
    result.sheets.KPI_Params = kpiRows.map((row, idx) => {
      const { errors } = validateKpiRow(row, validCodes);
      if (Object.keys(errors).length) result.hasErrors = true;
      return { line: idx + 2, data: row, errors };
    });
  }

  const tempsRows = readWorkbookSheet(workbook, "Causes_Temps", TEMPS_COLUMNS);
  if (tempsRows) {
    result.sheets.Causes_Temps = tempsRows.map((row, idx) => {
      const { errors } = validateTempsRow(row, validCodes);
      if (Object.keys(errors).length) result.hasErrors = true;
      return { line: idx + 2, data: row, errors };
    });
  }

  const causesRows = readWorkbookSheet(workbook, "Causes_Selections", CAUSES_COLUMNS);
  if (causesRows) {
    result.sheets.Causes_Selections = causesRows.map((row, idx) => {
      const { errors } = validateCausesRow(row, validCodes);
      if (Object.keys(errors).length) result.hasErrors = true;
      return { line: idx + 2, data: row, errors };
    });
  }

  const actionsRows = readWorkbookSheet(workbook, "Actions", ACTIONS_COLUMNS);
  if (actionsRows) {
    result.sheets.Actions = actionsRows.map((row, idx) => {
      const { errors } = validateActionsRow(row, validCodes);
      if (Object.keys(errors).length) result.hasErrors = true;
      return { line: idx + 2, data: row, errors };
    });
  }

  if (Object.keys(result.sheets).length === 0) {
    return res.status(400).json({ message: "Aucune feuille reconnue dans le fichier (KPI_Params, Causes_Temps, Causes_Selections, Actions)." });
  }

  res.status(200).json(result);
}