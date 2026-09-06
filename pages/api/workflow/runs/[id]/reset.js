import { query } from "../../../../../lib/db";
import { verifyAuth } from "../../../../../middlewares/auth";

async function canActOnPoste(req, res, runId, posteId) {
  const authUser = verifyAuth(req, res);
  if (!authUser) return null;
  if (authUser.role === "admin") return authUser;
  const rows = await query("SELECT assigned_user FROM workflow_run_postes WHERE run_id = ? AND poste_id = ?", [runId, posteId]);
  if (!rows.length) return null;
  const userRows = await query("SELECT nom FROM users WHERE email = ?", [authUser.email]);
  const nom = userRows.length ? userRows[0].nom : authUser.nom;
  if (rows[0].assigned_user && rows[0].assigned_user === nom) return authUser;
  return null;
}

async function reloadAndReturn(res, id) {
  const progress = await query(
    "SELECT poste_id, valide, valide_at, controle_qualite_ok, assigned_user FROM workflow_run_postes WHERE run_id = ?",
    [id]
  );
  const etapeProgress = await query(
    "SELECT re.etape_id, re.valide, re.valide_at, e.poste_id FROM workflow_run_etapes re JOIN workflow_etapes e ON e.id = re.etape_id WHERE re.run_id = ?",
    [id]
  );
  const runRows = await query("SELECT id, reference, statut, started_by, started_at, finished_at FROM workflow_runs WHERE id = ?", [id]);
  res.status(200).json({ run: runRows[0], progress, etapeProgress });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  const { id } = req.query;
  const { posteId } = req.body || {};

  const allowed = await canActOnPoste(req, res, id, posteId);
  if (!allowed) {
    res.status(403).json({ error: "Vous n'êtes pas autorisé à modifier ce poste." });
    return;
  }

  try {
    await query(
      "UPDATE workflow_run_postes SET valide = 0, valide_at = NULL, controle_qualite_ok = 0 WHERE run_id = ? AND poste_id = ?",
      [id, posteId]
    );
    await query("UPDATE workflow_runs SET statut = 'en_cours', finished_at = NULL WHERE id = ?", [id]);

    await reloadAndReturn(res, id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}