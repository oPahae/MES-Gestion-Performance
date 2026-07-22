import { query } from "../../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "POST") {
    try {
      const { nom } = req.body;
      if (!nom || !nom.trim()) {
        res.status(400).json({ error: "Nom requis" });
        return;
      }
      const result = await query("INSERT INTO probleme_equipe (probleme_id, nom) VALUES (?, ?)", [id, nom.trim()]);
      res.status(201).json({ id: result.insertId, nom: nom.trim() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const { memberId } = req.query;
      await query("DELETE FROM probleme_equipe WHERE id = ? AND probleme_id = ?", [memberId, id]);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}