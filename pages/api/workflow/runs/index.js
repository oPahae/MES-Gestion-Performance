import { query } from "../../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const rows = await query(
        "SELECT id, reference, statut, started_by, started_at, finished_at FROM workflow_runs ORDER BY id DESC LIMIT 30"
      );
      res.status(200).json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { startedBy } = req.body || {};
      const now = new Date();
      const reference = `AVION-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;
      const result = await query(
        "INSERT INTO workflow_runs (reference, statut, started_by) VALUES (?, 'en_cours', ?)",
        [reference, startedBy || null]
      );
      const postes = await query("SELECT id FROM workflow_postes");
      for (const p of postes) {
        await query("INSERT INTO workflow_run_postes (run_id, poste_id, valide) VALUES (?, ?, 0)", [result.insertId, p.id]);
      }
      res.status(201).json({ id: result.insertId, reference });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}