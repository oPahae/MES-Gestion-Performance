import { query } from "../../../lib/db";

async function loadFull(id) {
  const rows = await query(
    `SELECT id, numero, probleme, ligne, pilote, date_ouverture, quoi, qui, ou, quand_txt, combien, comment_txt, pourquoi,
     autre_ligne_existe, validation_nom, DATE_FORMAT(validation_date, '%Y-%m-%d') AS validation_date, validation_signature
     FROM problemes WHERE id = ?`,
    [id]
  );
  if (!rows.length) return null;
  const p = rows[0];
  const equipe = await query("SELECT id, nom FROM probleme_equipe WHERE probleme_id = ? ORDER BY id", [id]);
  const causes = await query(
    "SELECT id, bloc, parent_id, niveau, texte, cause_racine FROM probleme_causes WHERE probleme_id = ? ORDER BY id",
    [id]
  );
  const actions = await query(
    `SELECT id, type, cause_id, ligne, statut, (piece_jointe IS NOT NULL) AS hasFile
   FROM probleme_actions WHERE probleme_id = ?`,
    [id]
  );
  return {
    id: p.id,
    numero: p.numero,
    probleme: p.probleme,
    ligne: p.ligne,
    pilote: p.pilote,
    date_ouverture: p.date_ouverture,
    quoi: p.quoi || "",
    qui: p.qui || "",
    ou: p.ou || "",
    quand_txt: p.quand_txt || "",
    combien: p.combien || "",
    comment_txt: p.comment_txt || "",
    pourquoi: p.pourquoi || "",
    autre_ligne_existe: !!p.autre_ligne_existe,
    validation_nom: p.validation_nom || "",
    validation_date: p.validation_date,
    validation_signature: !!p.validation_signature,
    equipe: equipe.map((e) => ({ id: e.id, nom: e.nom })),
    causes: causes.map((c) => ({
      id: c.id,
      bloc: c.bloc,
      parent_id: c.parent_id,
      niveau: c.niveau,
      texte: c.texte,
      cause_racine: !!c.cause_racine,
    })),
    actions: actions.map((a) => ({
      id: a.id,
      type: a.type,
      cause_id: a.cause_id,
      ligne: a.ligne,
      statut: a.statut,
      hasFile: !!a.hasFile,
    })),
  };
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const full = await loadFull(id);
      if (!full) {
        res.status(404).json({ error: "Problème introuvable" });
        return;
      }
      res.status(200).json(full);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const b = req.body;
      const fields = [];
      const values = [];
      const map = {
        probleme: b.probleme,
        ligne: b.ligne,
        pilote: b.pilote,
        quoi: b.quoi,
        qui: b.qui,
        ou: b.ou,
        quand_txt: b.quand_txt,
        combien: b.combien,
        comment_txt: b.comment_txt,
        pourquoi: b.pourquoi,
        autre_ligne_existe: b.autre_ligne_existe,
        validation_nom: b.validation_nom,
        validation_date: b.validation_date,
        validation_signature: b.validation_signature,
      };
      Object.entries(map).forEach(([k, v]) => {
        if (v !== undefined) {
          fields.push(`${k} = ?`);
          values.push(typeof v === "boolean" ? (v ? 1 : 0) : v === "" && k === "validation_date" ? null : v);
        }
      });
      if (fields.length > 0) {
        values.push(id);
        await query(`UPDATE problemes SET ${fields.join(", ")} WHERE id = ?`, values);
      }
      const full = await loadFull(id);
      res.status(200).json(full);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await query("DELETE FROM problemes WHERE id = ?", [id]);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}