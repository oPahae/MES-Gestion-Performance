import { query } from "../../../../lib/db";
import { parseForm, fieldVal, fileVal } from "../../../../lib/parseForm";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const { type } = req.query;
      const rows = await query(
        `SELECT id, type, cause_id, ligne, action, pilote,
         DATE_FORMAT(date_debut, '%Y-%m-%d') AS date_debut,
         DATE_FORMAT(date_fin, '%Y-%m-%d') AS date_fin,
         DATE_FORMAT(date_replanification, '%Y-%m-%d') AS date_replanification,
         statut, piece_jointe_nom, (piece_jointe IS NOT NULL) AS hasFile
         FROM probleme_actions WHERE probleme_id = ? AND type = ? ORDER BY id`,
        [id, type]
      );
      res.status(200).json(rows.map((r) => ({ ...r, hasFile: !!r.hasFile })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { fields, files } = await parseForm(req);
      const type = fieldVal(fields, "type");
      const causeId = fieldVal(fields, "cause_id") || null;
      const ligne = fieldVal(fields, "ligne") || null;
      const action = fieldVal(fields, "action") || "";
      const pilote = fieldVal(fields, "pilote") || "";
      const dateDebut = fieldVal(fields, "date_debut") || null;
      const dateFin = fieldVal(fields, "date_fin") || null;
      const dateReplan = fieldVal(fields, "date_replanification") || null;
      const statut = fieldVal(fields, "statut") || "a_faire";
      const file = fileVal(files, "piece_jointe");

      let buffer = null;
      let mime = null;
      let nom = null;
      if (file && file.filepath) {
        buffer = fs.readFileSync(file.filepath);
        mime = file.mimetype || null;
        nom = file.originalFilename || null;
      }

      const result = await query(
        `INSERT INTO probleme_actions
         (probleme_id, type, cause_id, ligne, action, pilote, date_debut, date_fin, date_replanification, statut, piece_jointe, piece_jointe_mime, piece_jointe_nom)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, type, causeId, ligne, action, pilote, dateDebut, dateFin, dateReplan, statut, buffer, mime, nom]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const { fields, files } = await parseForm(req);
      const actionId = fieldVal(fields, "actionId");
      const has = (k) => Object.prototype.hasOwnProperty.call(fields, k);
      const val = (k) => fieldVal(fields, k, "");

      const sets = [];
      const values = [];
      if (has("ligne")) { sets.push("ligne = ?"); values.push(val("ligne") || null); }
      if (has("action")) { sets.push("action = ?"); values.push(val("action")); }
      if (has("pilote")) { sets.push("pilote = ?"); values.push(val("pilote")); }
      if (has("date_debut")) { sets.push("date_debut = ?"); values.push(val("date_debut") || null); }
      if (has("date_fin")) { sets.push("date_fin = ?"); values.push(val("date_fin") || null); }
      if (has("date_replanification")) { sets.push("date_replanification = ?"); values.push(val("date_replanification") || null); }
      if (has("statut")) { sets.push("statut = ?"); values.push(val("statut")); }
      if (has("cause_id")) { sets.push("cause_id = ?"); values.push(val("cause_id") || null); }

      const file = fileVal(files, "piece_jointe");
      if (file && file.filepath) {
        const buffer = fs.readFileSync(file.filepath);
        sets.push("piece_jointe = ?");
        values.push(buffer);
        sets.push("piece_jointe_mime = ?");
        values.push(file.mimetype || null);
        sets.push("piece_jointe_nom = ?");
        values.push(file.originalFilename || null);
      }
      if (sets.length === 0) {
        res.status(400).json({ error: "Rien à modifier" });
        return;
      }
      values.push(actionId, id);
      await query(`UPDATE probleme_actions SET ${sets.join(", ")} WHERE id = ? AND probleme_id = ?`, values);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const { actionId } = req.query;
      await query("DELETE FROM probleme_actions WHERE id = ? AND probleme_id = ?", [actionId, id]);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}