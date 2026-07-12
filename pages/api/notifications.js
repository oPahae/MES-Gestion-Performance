export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

import { query } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { sheetId, startDate, endDate } = req.query;
    try {
      let sql = "SELECT id, date_jour, texte, created_at, lu, (image IS NOT NULL) AS hasImage FROM retour_client_notifications WHERE sheet_id = ?";
      const params = [sheetId];
      if (startDate && endDate) {
        sql += " AND date_jour BETWEEN ? AND ?";
        params.push(startDate, endDate);
      }
      sql += " ORDER BY created_at DESC LIMIT 100";
      const rows = await query(sql, params);
      res.status(200).json(rows.map((r) => ({ ...r, hasImage: !!r.hasImage })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const { sheetId, date, texte, imageBase64, imageMime } = req.body;
    try {
      const buffer = imageBase64 ? Buffer.from(imageBase64, "base64") : null;
      const result = await query(
        "INSERT INTO retour_client_notifications (sheet_id, date_jour, texte, lu, image, image_mime) VALUES (?, ?, ?, 0, ?, ?)",
        [sheetId, date, texte, buffer, imageMime || null]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "PUT") {
    const { sheetId } = req.body;
    try {
      await query("UPDATE retour_client_notifications SET lu = 1 WHERE sheet_id = ?", [sheetId]);
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}