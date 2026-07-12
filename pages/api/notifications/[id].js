import { query } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  const { id } = req.query;
  try {
    const rows = await query("SELECT image, image_mime FROM retour_client_notifications WHERE id = ?", [id]);
    if (!rows.length || !rows[0].image) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", rows[0].image_mime || "image/jpeg");
    res.status(200).send(rows[0].image);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}