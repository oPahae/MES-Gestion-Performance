import { query } from "../../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "POST") {
    try {
      const { bloc, parent_id, niveau, texte } = req.body;
      if (!texte || !texte.trim()) {
        res.status(400).json({ error: "Texte requis" });
        return;
      }
      if (parent_id) {
        const parentRows = await query("SELECT niveau FROM probleme_causes WHERE id = ?", [parent_id]);
        if (!parentRows.length) {
          res.status(400).json({ error: "Parent introuvable" });
          return;
        }
        if (parentRows[0].niveau >= 3) {
          res.status(400).json({ error: "Profondeur maximale atteinte" });
          return;
        }
      }
      const result = await query(
        "INSERT INTO probleme_causes (probleme_id, bloc, parent_id, niveau, texte, cause_racine) VALUES (?, ?, ?, ?, ?, 0)",
        [id, bloc || null, parent_id || null, niveau || 0, texte.trim()]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const { causeId, texte, cause_racine } = req.body;
      const fields = [];
      const values = [];
      if (texte !== undefined) {
        fields.push("texte = ?");
        values.push(texte);
      }
      if (cause_racine !== undefined) {
        fields.push("cause_racine = ?");
        values.push(cause_racine ? 1 : 0);
      }
      if (fields.length === 0) {
        res.status(400).json({ error: "Rien à modifier" });
        return;
      }
      values.push(causeId, id);
      await query(`UPDATE probleme_causes SET ${fields.join(", ")} WHERE id = ? AND probleme_id = ?`, values);

      if (cause_racine === true) {
        const causeRows = await query("SELECT texte FROM probleme_causes WHERE id = ?", [causeId]);
        const existing = await query(
          "SELECT id FROM probleme_actions WHERE probleme_id = ? AND type = 'd56' AND cause_id = ?",
          [id, causeId]
        );
        if (!existing.length && causeRows.length) {
          await query(
            "INSERT INTO probleme_actions (probleme_id, type, cause_id, action, pilote, statut) VALUES (?, 'd56', ?, '', '', 'a_faire')",
            [id, causeId]
          );
        }
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const { causeId } = req.query;
      await query("DELETE FROM probleme_causes WHERE id = ? AND probleme_id = ?", [causeId, id]);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}