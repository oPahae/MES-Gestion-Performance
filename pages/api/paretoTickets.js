import { query } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { sheetId } = req.query;
    try {
      const rows = await query("SELECT id, titre, sous_titre FROM pareto_tickets WHERE sheet_id = ? ORDER BY id DESC", [sheetId]);
      res.status(200).json(rows.map((r) => ({ id: r.id, titre: r.titre, sous: r.sous_titre })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const { sheetId, titre, sous } = req.body;
    try {
      const result = await query("INSERT INTO pareto_tickets (sheet_id, titre, sous_titre) VALUES (?, ?, ?)", [sheetId, titre, sous || ""]);
      res.status(201).json({ id: result.insertId, titre, sous: sous || "" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}
