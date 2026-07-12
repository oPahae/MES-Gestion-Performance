import { query } from "../../../lib/db";
import { STATUT_LABELS } from "../../../lib/kpiLogic";

function fromLabel(label) {
  const entry = Object.entries(STATUT_LABELS).find(([, v]) => v === label);
  return entry ? entry[0] : "a_faire";
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    const { probleme, action, pilote, statut } = req.body;
    try {
      await query("UPDATE actions SET probleme = ?, action = ?, pilote = ?, statut = ? WHERE id = ?", [
        probleme,
        action,
        pilote || "",
        fromLabel(statut),
        id,
      ]);
      await query(
        "UPDATE planning_tickets SET probleme = ?, detail_action = ?, pilote = ?, statut = ?, texte = ? WHERE action_id = ?",
        [probleme, action, pilote || "", fromLabel(statut), probleme, id]
      );
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await query("DELETE FROM planning_tickets WHERE action_id = ?", [id]);
      await query("DELETE FROM actions WHERE id = ?", [id]);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}