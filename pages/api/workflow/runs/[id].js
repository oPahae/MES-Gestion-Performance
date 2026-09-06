import { query } from "../../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const runRows = await query(
        "SELECT id, reference, statut, started_by, started_at, finished_at FROM workflow_runs WHERE id = ?",
        [id]
      );
      if (!runRows.length) {
        res.status(404).json({ error: "Fabrication introuvable" });
        return;
      }
      const progress = await query(
        "SELECT poste_id, valide, valide_at, controle_qualite_ok, assigned_user FROM workflow_run_postes WHERE run_id = ?",
        [id]
      );
      const etapeProgress = await query(
        "SELECT re.etape_id, re.valide, re.valide_at, e.poste_id FROM workflow_run_etapes re JOIN workflow_etapes e ON e.id = re.etape_id WHERE re.run_id = ?",
        [id]
      );
      res.status(200).json({ run: runRows[0], progress, etapeProgress });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await query("DELETE FROM workflow_runs WHERE id = ?", [id]);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}