import { query } from "../../../lib/db";
import { STATUT_LABELS } from "../../../lib/kpiLogic";

function toLabel(statut) {
  return STATUT_LABELS[statut] || statut;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { sheetId, startDate, endDate, kpi } = req.query;
    try {
      const params = [sheetId, startDate, endDate];
      let sql =
        "SELECT id, date_jour, date_fin, texte, action_id, kpi_key, probleme, detail_action, pilote, statut FROM planning_tickets WHERE sheet_id = ? AND COALESCE(date_fin, date_jour) BETWEEN ? AND ?";
      if (kpi) {
        sql += " AND kpi_key = ?";
        params.push(kpi);
      }
      sql += " ORDER BY id";
      const rows = await query(sql, params);
      res.status(200).json(
        rows.map((r) => {
          const effectiveDate = r.date_fin || r.date_jour;
          return {
            id: r.id,
            date: effectiveDate instanceof Date ? effectiveDate.toLocaleDateString("fr-CA") : String(effectiveDate).slice(0, 10),
            actionId: r.action_id,
            kpi: r.kpi_key,
            probleme: r.probleme || r.texte,
            detailAction: r.detail_action || "",
            pilote: r.pilote || "",
            statut: r.statut ? toLabel(r.statut) : "",
          };
        })
      );
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}