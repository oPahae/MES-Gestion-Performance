import { query } from "../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    const { nom } = req.body || {};
    if (!nom) return res.status(400).json({ error: "nom est requis." });
    await query("UPDATE postes SET nom = ? WHERE id = ?", [nom.trim(), id]);
    const [row] = await query("SELECT * FROM postes WHERE id = ?", [id]);
    if (!row) return res.status(404).json({ error: "Poste introuvable." });
    return res.status(200).json(row);
  }

  if (req.method === "DELETE") {
    // cause_dictionary.poste_id passe à NULL automatiquement (ON DELETE SET NULL)
    await query("DELETE FROM postes WHERE id = ?", [id]);
    return res.status(200).json({ success: true, id: Number(id) });
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}