import { query } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await query("SELECT * FROM sheets ORDER BY id ASC");
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { code, label, type } = req.body || {};
    if (!code || !label || !type) {
      return res.status(400).json({ error: "code, label et type sont requis." });
    }
    if (!["ligne", "machine"].includes(type)) {
      return res.status(400).json({ error: "type doit être 'ligne' ou 'machine'." });
    }
    try {
      const result = await query(
        "INSERT INTO sheets (code, label, type) VALUES (?, ?, ?)",
        [code.trim(), label.trim(), type]
      );
      const [row] = await query("SELECT * FROM sheets WHERE id = ?", [result.insertId]);
      return res.status(201).json(row);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Ce code de feuille existe déjà." });
      }
      return res.status(500).json({ error: "Erreur lors de la création de la feuille." });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}
