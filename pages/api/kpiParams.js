import { query } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { sheetId, date, kpi } = req.query;
    try {
      const rows = await query(
        "SELECT data FROM kpi_daily_params WHERE sheet_id = ? AND kpi_key = ? AND date_jour = ?",
        [sheetId, kpi, date]
      );
      res.status(200).json(rows.length ? rows[0].data : null);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const { sheetId, date, kpi, data } = req.body;
    try {
      await query(
        "INSERT INTO kpi_daily_params (sheet_id, kpi_key, date_jour, data) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
        [sheetId, kpi, date, JSON.stringify(data)]
      );
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}
