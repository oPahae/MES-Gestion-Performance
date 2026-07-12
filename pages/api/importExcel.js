// pages/api/importExcel.js
import formidable from "formidable";
import fs from "fs";
import * as XLSX from "xlsx";
import { query, getPool } from "../../lib/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

const KPI_KEYS = ["S", "Q", "C", "D", "P"];
const CAUSE_CATEGORIES = ["place", "risque", "defaut", "absence"];
const ACTION_STATUTS = ["a_faire", "en_cours", "termine"];

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, maxFileSize: 20 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function toDateString(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const y = parsed.y;
    const m = String(parsed.m).padStart(2, "0");
    const d = String(parsed.d).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dt = new Date(trimmed);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }
  return null;
}

function toIntOrDefault(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.trunc(n);
}

function toIntOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.trunc(n);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Méthode non autorisée." });
  }

  let fields, files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (err) {
    return res.status(400).json({ message: "Fichier invalide.", detail: err.message });
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) {
    return res.status(400).json({ message: "Aucun fichier fourni." });
  }

  let workbook;
  try {
    const buffer = fs.readFileSync(file.filepath);
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (err) {
    try {
      fs.unlinkSync(file.filepath);
    } catch (_) {}
    return res.status(400).json({ message: "Impossible de lire le fichier Excel.", detail: err.message });
  }

  const pool = getPool();
  let connection;

  try {
    const sheetsRows = await query("SELECT id, code FROM sheets");
    const codeToId = new Map(sheetsRows.map((s) => [s.code, s.id]));

    const errors = [];
    const kpiInserts = [];
    const tempsInserts = [];
    const causesInserts = [];
    const actionsInserts = [];

    const kpiSheetName = workbook.SheetNames.find((n) => n === "KPI_Params");
    if (kpiSheetName) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[kpiSheetName], { defval: "" });
      rows.forEach((row, idx) => {
        const line = idx + 2;
        const feuilleCode = String(row.FeuilleCode || "").trim();
        const kpiKey = String(row.KPI || "").trim().toUpperCase();
        const dateJour = toDateString(row.Date);

        if (!feuilleCode) {
          errors.push(`KPI_Params ligne ${line}: FeuilleCode manquant.`);
          return;
        }
        if (!codeToId.has(feuilleCode)) {
          errors.push(`KPI_Params ligne ${line}: feuille "${feuilleCode}" introuvable.`);
          return;
        }
        if (!KPI_KEYS.includes(kpiKey)) {
          errors.push(`KPI_Params ligne ${line}: KPI "${row.KPI}" invalide.`);
          return;
        }
        if (!dateJour) {
          errors.push(`KPI_Params ligne ${line}: date invalide.`);
          return;
        }

        let data = {};
        if (kpiKey === "S") {
          const accidents = toIntOrDefault(row.Accidents, 0);
          const risques = toIntOrDefault(row.Risques, 0);
          if (Number.isNaN(accidents) || Number.isNaN(risques)) {
            errors.push(`KPI_Params ligne ${line}: valeurs numériques invalides pour S.`);
            return;
          }
          data = { accidents, risques };
        } else if (kpiKey === "Q") {
          const retoursClients = toIntOrDefault(row.RetoursClients, 0);
          const rebuts = toIntOrDefault(row.Rebuts, 0);
          const quantiteTotale = toIntOrDefault(row.QuantiteTotale, 0);
          if ([retoursClients, rebuts, quantiteTotale].some(Number.isNaN)) {
            errors.push(`KPI_Params ligne ${line}: valeurs numériques invalides pour Q.`);
            return;
          }
          data = { retoursClients, rebuts, quantiteTotale };
        } else if (kpiKey === "C") {
          const quantiteProduite = toIntOrDefault(row.QuantiteProduite, 0);
          const quantiteObjectif = toIntOrDefault(row.QuantiteObjectif, 0);
          if ([quantiteProduite, quantiteObjectif].some(Number.isNaN)) {
            errors.push(`KPI_Params ligne ${line}: valeurs numériques invalides pour C.`);
            return;
          }
          data = { quantiteProduite, quantiteObjectif };
        } else if (kpiKey === "D") {
          const quantiteProduite = toIntOrDefault(row.QuantiteProduite, 0);
          const quantitePlanifiee = toIntOrDefault(row.QuantitePlanifiee, 0);
          if ([quantiteProduite, quantitePlanifiee].some(Number.isNaN)) {
            errors.push(`KPI_Params ligne ${line}: valeurs numériques invalides pour D.`);
            return;
          }
          data = { quantiteProduite, quantitePlanifiee };
        } else if (kpiKey === "P") {
          const absents = toIntOrDefault(row.Absents, 0);
          if (Number.isNaN(absents)) {
            errors.push(`KPI_Params ligne ${line}: valeur numérique invalide pour P.`);
            return;
          }
          data = { absents };
        }

        kpiInserts.push({
          sheetId: codeToId.get(feuilleCode),
          kpiKey,
          dateJour,
          data: JSON.stringify(data),
        });
      });
    }

    const tempsSheetName = workbook.SheetNames.find((n) => n === "Causes_Temps");
    if (tempsSheetName) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[tempsSheetName], { defval: "" });
      rows.forEach((row, idx) => {
        const line = idx + 2;
        const feuilleCode = String(row.FeuilleCode || "").trim();
        const dateJour = toDateString(row.Date);

        if (!feuilleCode) {
          errors.push(`Causes_Temps ligne ${line}: FeuilleCode manquant.`);
          return;
        }
        if (!codeToId.has(feuilleCode)) {
          errors.push(`Causes_Temps ligne ${line}: feuille "${feuilleCode}" introuvable.`);
          return;
        }
        if (!dateJour) {
          errors.push(`Causes_Temps ligne ${line}: date invalide.`);
          return;
        }

        const fieldsMap = {
          ouverture: toIntOrDefault(row.Ouverture, 0),
          planifie: toIntOrDefault(row.Planifie, 0),
          arret: toIntOrDefault(row.Arret, 0),
          changement: toIntOrDefault(row.Changement, 0),
          rupture: toIntOrDefault(row.Rupture, 0),
          autre: toIntOrDefault(row.Autre, 0),
          gammes: toIntOrDefault(row.Gammes, 0),
        };
        if (Object.values(fieldsMap).some(Number.isNaN)) {
          errors.push(`Causes_Temps ligne ${line}: valeurs numériques invalides.`);
          return;
        }

        tempsInserts.push({
          sheetId: codeToId.get(feuilleCode),
          dateJour,
          ...fieldsMap,
        });
      });
    }

    const causesSheetName = workbook.SheetNames.find((n) => n === "Causes_Selections");
    if (causesSheetName) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[causesSheetName], { defval: "" });
      rows.forEach((row, idx) => {
        const line = idx + 2;
        const feuilleCode = String(row.FeuilleCode || "").trim();
        const dateJour = toDateString(row.Date);
        const categorie = String(row.Categorie || "").trim().toLowerCase();
        const valeur = String(row.Valeur || "").trim();
        const quantite = toIntOrNull(row.Quantite);

        if (!feuilleCode) {
          errors.push(`Causes_Selections ligne ${line}: FeuilleCode manquant.`);
          return;
        }
        if (!codeToId.has(feuilleCode)) {
          errors.push(`Causes_Selections ligne ${line}: feuille "${feuilleCode}" introuvable.`);
          return;
        }
        if (!dateJour) {
          errors.push(`Causes_Selections ligne ${line}: date invalide.`);
          return;
        }
        if (!CAUSE_CATEGORIES.includes(categorie)) {
          errors.push(`Causes_Selections ligne ${line}: catégorie "${row.Categorie}" invalide.`);
          return;
        }
        if (!valeur) {
          errors.push(`Causes_Selections ligne ${line}: Valeur manquante.`);
          return;
        }
        if (Number.isNaN(quantite)) {
          errors.push(`Causes_Selections ligne ${line}: Quantite invalide.`);
          return;
        }

        causesInserts.push({
          sheetId: codeToId.get(feuilleCode),
          dateJour,
          categorie,
          valeur,
          quantite,
        });
      });
    }

    const actionsSheetName = workbook.SheetNames.find((n) => n === "Actions");
    if (actionsSheetName) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[actionsSheetName], { defval: "" });
      rows.forEach((row, idx) => {
        const line = idx + 2;
        const feuilleCode = String(row.FeuilleCode || "").trim();
        const dateJour = toDateString(row.Date);
        const kpiKey = String(row.KPI || "S").trim().toUpperCase();
        const probleme = String(row.Probleme || "").trim();
        const action = String(row.Action || "").trim();
        const pilote = String(row.Pilote || "").trim();
        const statut = String(row.Statut || "a_faire").trim().toLowerCase();

        if (!feuilleCode) {
          errors.push(`Actions ligne ${line}: FeuilleCode manquant.`);
          return;
        }
        if (!codeToId.has(feuilleCode)) {
          errors.push(`Actions ligne ${line}: feuille "${feuilleCode}" introuvable.`);
          return;
        }
        if (!dateJour) {
          errors.push(`Actions ligne ${line}: date invalide.`);
          return;
        }
        if (!KPI_KEYS.includes(kpiKey)) {
          errors.push(`Actions ligne ${line}: KPI "${row.KPI}" invalide.`);
          return;
        }
        if (!probleme) {
          errors.push(`Actions ligne ${line}: Probleme manquant.`);
          return;
        }
        if (!action) {
          errors.push(`Actions ligne ${line}: Action manquante.`);
          return;
        }
        if (!ACTION_STATUTS.includes(statut)) {
          errors.push(`Actions ligne ${line}: Statut "${row.Statut}" invalide.`);
          return;
        }

        actionsInserts.push({
          sheetId: codeToId.get(feuilleCode),
          dateJour,
          kpiKey,
          probleme,
          action,
          pilote,
          statut,
        });
      });
    }

    if (errors.length > 0) {
      try {
        fs.unlinkSync(file.filepath);
      } catch (_) {}
      return res.status(400).json({ message: "Le fichier contient des erreurs.", errors });
    }

    if (
      kpiInserts.length === 0 &&
      tempsInserts.length === 0 &&
      causesInserts.length === 0 &&
      actionsInserts.length === 0
    ) {
      try {
        fs.unlinkSync(file.filepath);
      } catch (_) {}
      return res.status(400).json({ message: "Aucune donnée valide trouvée dans le fichier." });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const row of kpiInserts) {
      await connection.execute(
        `INSERT INTO kpi_daily_params (sheet_id, kpi_key, date_jour, data)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [row.sheetId, row.kpiKey, row.dateJour, row.data]
      );
    }

    for (const row of tempsInserts) {
      await connection.execute(
        `INSERT INTO cause_temps (sheet_id, date_jour, ouverture, planifie, arret, changement, rupture, autre, gammes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           ouverture = VALUES(ouverture),
           planifie = VALUES(planifie),
           arret = VALUES(arret),
           changement = VALUES(changement),
           rupture = VALUES(rupture),
           autre = VALUES(autre),
           gammes = VALUES(gammes)`,
        [row.sheetId, row.dateJour, row.ouverture, row.planifie, row.arret, row.changement, row.rupture, row.autre, row.gammes]
      );
    }

    for (const row of causesInserts) {
      await connection.execute(
        `INSERT INTO cause_selections (sheet_id, date_jour, categorie, valeur, quantite)
         VALUES (?, ?, ?, ?, ?)`,
        [row.sheetId, row.dateJour, row.categorie, row.valeur, row.quantite]
      );
    }

    for (const row of actionsInserts) {
      await connection.execute(
        `INSERT INTO actions (sheet_id, date_jour, probleme, action, pilote, statut, kpi_key)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.sheetId, row.dateJour, row.probleme, row.action, row.pilote, row.statut, row.kpiKey]
      );
    }

    await connection.commit();
    connection.release();
    connection = null;

    try {
      fs.unlinkSync(file.filepath);
    } catch (_) {}

    return res.status(200).json({
      message: "Import terminé avec succès.",
      counts: {
        kpi: kpiInserts.length,
        temps: tempsInserts.length,
        causes: causesInserts.length,
        actions: actionsInserts.length,
      },
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
      connection.release();
    }
    try {
      fs.unlinkSync(file.filepath);
    } catch (_) {}
    return res.status(500).json({ message: "Erreur lors de l'import.", detail: err.message });
  }
}