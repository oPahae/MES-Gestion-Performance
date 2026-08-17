import { query } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  try {
    const postes = await query("SELECT id, numero, titre, sous_titre, couleur, resultat_attendu, ordre FROM workflow_postes ORDER BY ordre");
    const etapes = await query("SELECT id, poste_id, numero, description FROM workflow_etapes ORDER BY poste_id, numero");
    const pieces = await query("SELECT id, poste_id, nom, quantite FROM workflow_pieces ORDER BY poste_id, id");
    const defauts = await query("SELECT id, poste_id, categorie, libelle, est_bon FROM workflow_defauts ORDER BY poste_id, categorie, id");

    const byPoste = (rows) => {
      const map = {};
      rows.forEach((r) => {
        map[r.poste_id] = map[r.poste_id] || [];
        map[r.poste_id].push(r);
      });
      return map;
    };

    const etapesByPoste = byPoste(etapes);
    const piecesByPoste = byPoste(pieces);
    const defautsByPoste = byPoste(defauts);

    const result = postes.map((p) => ({
      ...p,
      etapes: etapesByPoste[p.id] || [],
      pieces: piecesByPoste[p.id] || [],
      defauts: defautsByPoste[p.id] || [],
    }));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}