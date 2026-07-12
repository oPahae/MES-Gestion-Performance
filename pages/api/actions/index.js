import { query } from "../../../lib/db";
import { STATUT_LABELS } from "../../../lib/kpiLogic";

function toLabel(statut) {
  return STATUT_LABELS[statut] || statut;
}
function fromLabel(label) {
  const entry = Object.entries(STATUT_LABELS).find(([, v]) => v === label);
  return entry ? entry[0] : "a_faire";
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { sheetId, date, startDate, endDate, kpi } = req.query;
    try {
      let sql = "SELECT id, kpi_key, date_jour, probleme, action, pilote, statut FROM actions WHERE sheet_id = ?";
      const params = [sheetId];
      if (startDate && endDate) {
        sql += " AND date_jour BETWEEN ? AND ?";
        params.push(startDate, endDate);
      } else if (date) {
        sql += " AND date_jour = ?";
        params.push(date);
      }
      if (kpi) {
        sql += " AND kpi_key = ?";
        params.push(kpi);
      }
      sql += " ORDER BY date_jour DESC, id DESC";
      const rows = await query(sql, params);
      res.status(200).json(
        rows.map((r) => ({
          ...r,
          date: r.date_jour instanceof Date ? r.date_jour.toLocaleDateString("fr-CA") : String(r.date_jour).slice(0, 10),
          statut: toLabel(r.statut),
        }))
      );
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const { sheetId, date, kpi, probleme, action, pilote, statut } = req.body;
    try {
      const result = await query(
        "INSERT INTO actions (sheet_id, date_jour, kpi_key, probleme, action, pilote, statut) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sheetId, date, kpi, probleme, action, pilote || "", fromLabel(statut || "À faire")]
      );
      const actionId = result.insertId;
      await query(
        "INSERT INTO planning_tickets (sheet_id, date_jour, texte, action_id, kpi_key, probleme, detail_action, pilote, statut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [sheetId, date, probleme, actionId, kpi, probleme, action, pilote || "", fromLabel(statut || "À faire")]
      );
      res.status(201).json({ id: actionId, kpi_key: kpi, probleme, action, pilote: pilote || "", statut: statut || "À faire" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}