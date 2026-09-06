import { query } from "../../../../../lib/db";
import { verifyAuth } from "../../../../../middlewares/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  const { id } = req.query;
  const { etapeId, valide } = req.body || {};

  const authUser = verifyAuth(req, res);
  if (!authUser) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  try {
    const etapeRows = await query("SELECT poste_id FROM workflow_etapes WHERE id = ?", [etapeId]);
    if (!etapeRows.length) {
      res.status(404).json({ error: "Étape introuvable" });
      return;
    }
    const posteId = etapeRows[0].poste_id;

    if (authUser.role !== "admin") {
      const runPosteRows = await query("SELECT assigned_user FROM workflow_run_postes WHERE run_id = ? AND poste_id = ?", [id, posteId]);
      const userRows = await query("SELECT nom FROM users WHERE email = ?", [authUser.email]);
      const nom = userRows.length ? userRows[0].nom : authUser.nom;
      if (!runPosteRows.length || runPosteRows[0].assigned_user !== nom) {
        res.status(403).json({ error: "Vous n'êtes pas autorisé à modifier cette sous-étape." });
        return;
      }
    }

    if (valide) {
      await query("UPDATE workflow_run_etapes SET valide = 1, valide_at = NOW() WHERE run_id = ? AND etape_id = ?", [id, etapeId]);
    } else {
      await query("UPDATE workflow_run_etapes SET valide = 0, valide_at = NULL WHERE run_id = ? AND etape_id = ?", [id, etapeId]);
      await query("UPDATE workflow_run_postes SET valide = 0, valide_at = NULL WHERE run_id = ? AND poste_id = ?", [id, posteId]);
      await query("UPDATE workflow_runs SET statut = 'en_cours', finished_at = NULL WHERE id = ?", [id]);
    }

    const totalEtapes = await query("SELECT COUNT(*) AS c FROM workflow_etapes WHERE poste_id = ?", [posteId]);
    const doneEtapes = await query(
      "SELECT COUNT(*) AS c FROM workflow_run_etapes re JOIN workflow_etapes e ON e.id = re.etape_id WHERE re.run_id = ? AND e.poste_id = ? AND re.valide = 1",
      [id, posteId]
    );
    if (totalEtapes[0].c > 0 && totalEtapes[0].c === doneEtapes[0].c) {
      await query(
        "UPDATE workflow_run_postes SET valide = 1, valide_at = NOW() WHERE run_id = ? AND poste_id = ? AND valide = 0",
        [id, posteId]
      );
      const remaining = await query("SELECT COUNT(*) AS c FROM workflow_run_postes WHERE run_id = ? AND valide = 0", [id]);
      if (remaining[0].c === 0) {
        await query("UPDATE workflow_runs SET statut = 'termine', finished_at = NOW() WHERE id = ?", [id]);
      }
    }

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}