import { query } from "../../../../lib/db";
import { verifyAuth } from "../../../../middlewares/auth";

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
    const user = verifyAuth(req, res);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Seul l'administrateur peut lancer une fabrication." });
      return;
    }
    try {
      const { assignments } = req.body || {};
      const now = new Date();
      const reference = `AVION-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;
      const result = await query(
        "INSERT INTO workflow_runs (reference, statut, started_by) VALUES (?, 'en_cours', ?)",
        [reference, user.nom || user.email || null]
      );
      const postes = await query("SELECT id FROM workflow_postes");
      const etapes = await query("SELECT id, poste_id FROM workflow_etapes");
      for (const p of postes) {
        const assignedUser = (assignments && assignments[p.id]) || null;
        await query("INSERT INTO workflow_run_postes (run_id, poste_id, valide, assigned_user) VALUES (?, ?, 0, ?)", [
          result.insertId,
          p.id,
          assignedUser,
        ]);
      }
      for (const e of etapes) {
        await query("INSERT INTO workflow_run_etapes (run_id, etape_id, valide) VALUES (?, ?, 0)", [result.insertId, e.id]);
      }
      res.status(201).json({ id: result.insertId, reference });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}