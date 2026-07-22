import { query } from "../../../lib/db";
import { computeCompletion, computeStatutLabel } from "../../../lib/problemeLogic";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const problemes = await query("SELECT * FROM problemes ORDER BY id DESC");
      const equipeRows = await query("SELECT probleme_id, nom FROM probleme_equipe");
      const causeRows = await query("SELECT probleme_id, cause_racine FROM probleme_causes");
      const actionRows = await query("SELECT probleme_id, type, action, pilote, ligne FROM probleme_actions");

      const equipeByPid = {};
      equipeRows.forEach((r) => {
        equipeByPid[r.probleme_id] = equipeByPid[r.probleme_id] || [];
        equipeByPid[r.probleme_id].push(r.nom);
      });
      const causesByPid = {};
      causeRows.forEach((r) => {
        causesByPid[r.probleme_id] = causesByPid[r.probleme_id] || [];
        causesByPid[r.probleme_id].push({ cause_racine: !!r.cause_racine });
      });
      const actionsByPid = {};
      actionRows.forEach((r) => {
        actionsByPid[r.probleme_id] = actionsByPid[r.probleme_id] || [];
        actionsByPid[r.probleme_id].push({ type: r.type, action: r.action, pilote: r.pilote, ligne: r.ligne });
      });

      const result = problemes.map((p) => {
        const data = {
          probleme: p.probleme,
          ligne: p.ligne,
          pilote: p.pilote,
          equipe: equipeByPid[p.id] || [],
          quoi: p.quoi,
          qui: p.qui,
          ou: p.ou,
          quand_txt: p.quand_txt,
          combien: p.combien,
          comment_txt: p.comment_txt,
          pourquoi: p.pourquoi,
          causes: causesByPid[p.id] || [],
          actions: actionsByPid[p.id] || [],
          autre_ligne_existe: !!p.autre_ligne_existe,
          validation_nom: p.validation_nom,
          validation_date: p.validation_date,
          validation_signature: !!p.validation_signature,
        };
        const completion = computeCompletion(data);
        const statutLabel = computeStatutLabel(completion);
        return {
          id: p.id,
          numero: p.numero,
          probleme: p.probleme,
          pilote: p.pilote,
          ligne: p.ligne,
          statut: statutLabel,
          date_ouverture: p.date_ouverture,
          equipe: equipeByPid[p.id] || [],
        };
      });

      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const now = new Date();
      const dateOuverture = now.toISOString().slice(0, 19).replace("T", " ");
      const result = await query(
        "INSERT INTO problemes (numero, probleme, ligne, pilote, date_ouverture) VALUES (?, ?, ?, ?, ?)",
        [`TEMP-${Date.now()}`, "", "", "", dateOuverture]
      );
      const id = result.insertId;
      const year = now.getFullYear();
      const numero = `PRB-${year}-${String(id).padStart(4, "0")}`;
      await query("UPDATE problemes SET numero = ? WHERE id = ?", [numero, id]);
      res.status(201).json({ id, numero });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}