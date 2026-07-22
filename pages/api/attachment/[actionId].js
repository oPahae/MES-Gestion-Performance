import { query } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  const { actionId } = req.query;
  try {
    const rows = await query(
      "SELECT piece_jointe, piece_jointe_mime, piece_jointe_nom FROM probleme_actions WHERE id = ?",
      [actionId]
    );
    if (!rows.length || !rows[0].piece_jointe) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", rows[0].piece_jointe_mime || "application/octet-stream");
    if (rows[0].piece_jointe_nom) {
      res.setHeader("Content-Disposition", `inline; filename="${rows[0].piece_jointe_nom}"`);
    }
    res.status(200).send(rows[0].piece_jointe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}