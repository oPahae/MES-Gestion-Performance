import { query } from "../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    const { code, label, type } = req.body || {};
    if (!code || !label || !type) {
      return res.status(400).json({ error: "code, label et type sont requis." });
    }
    if (!["ligne", "machine"].includes(type)) {
      return res.status(400).json({ error: "type doit être 'ligne' ou 'machine'." });
    }
    try {
      await query("UPDATE sheets SET code = ?, label = ?, type = ? WHERE id = ?", [
        code.trim(),
        label.trim(),
        type,
        id,
      ]);
      const [row] = await query("SELECT * FROM sheets WHERE id = ?", [id]);
      if (!row) return res.status(404).json({ error: "Feuille introuvable." });
      return res.status(200).json(row);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Ce code de feuille existe déjà." });
      }
      return res.status(500).json({ error: "Erreur lors de la mise à jour de la feuille." });
    }
  }

  if (req.method === "DELETE") {
    // ON DELETE CASCADE côté BDD supprime aussi postes, kpi_daily_params,
    // cause_dictionary, cause_selections, cause_temps, actions,
    // planning_tickets, pareto_tickets, retour_client_notifications liés.
    await query("DELETE FROM sheets WHERE id = ?", [id]);
    // Réponse JSON explicite (200) plutôt que 204 sans corps : certains clients fetch
    // plantent en essayant de parser un corps vide en JSON.
    return res.status(200).json({ success: true, id: Number(id) });
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}