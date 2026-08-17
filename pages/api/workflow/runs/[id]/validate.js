import { query } from "../../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  const { id } = req.query;
  const { posteId, controleQualiteOk } = req.body || {};

  try {
    await query(
      "UPDATE workflow_run_postes SET valide = 1, valide_at = NOW(), controle_qualite_ok = ? WHERE run_id = ? AND poste_id = ?",
      [controleQualiteOk ? 1 : 0, id, posteId]
    );

    const remaining = await query(
      "SELECT COUNT(*) AS c FROM workflow_run_postes WHERE run_id = ? AND valide = 0",
      [id]
    );
    if (remaining[0].c === 0) {
      await query("UPDATE workflow_runs SET statut = 'termine', finished_at = NOW() WHERE id = ?", [id]);
    }

    const progress = await query(
      "SELECT poste_id, valide, valide_at, controle_qualite_ok FROM workflow_run_postes WHERE run_id = ?",
      [id]
    );
    const runRows = await query("SELECT id, reference, statut, started_by, started_at, finished_at FROM workflow_runs WHERE id = ?", [id]);

    res.status(200).json({ run: runRows[0], progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}