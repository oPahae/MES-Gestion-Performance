import { query } from "../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    const { date } = req.body;
    try {
      const rows = await query("SELECT action_id FROM planning_tickets WHERE id = ?", [id]);
      const actionId = rows[0] && rows[0].action_id;

      await query("UPDATE planning_tickets SET date_fin = ? WHERE id = ?", [date, id]);

      if (actionId) {
        await query("UPDATE actions SET date_fin = ? WHERE id = ?", [date, actionId]);
      }

      res.status(200).json({ ok: true, actionId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await query("DELETE FROM planning_tickets WHERE id = ?", [id]);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}