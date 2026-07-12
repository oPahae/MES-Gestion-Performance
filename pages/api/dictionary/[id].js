import { query } from "../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    const { libelle, posteId } = req.body || {};
    if (!libelle) return res.status(400).json({ error: "libelle est requis." });
    await query("UPDATE cause_dictionary SET libelle = ?, poste_id = ? WHERE id = ?", [
      libelle.trim(),
      posteId || null,
      id,
    ]);
    const [row] = await query(
      `SELECT d.*, p.nom AS poste_nom FROM cause_dictionary d
       LEFT JOIN postes p ON p.id = d.poste_id WHERE d.id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ error: "Élément introuvable." });
    return res.status(200).json(row);
  }

  if (req.method === "DELETE") {
    // Les sélections déjà enregistrées (cause_selections) qui référencent ce libellé
    // restent en base pour préserver l'historique des jours passés (aucune clé
    // étrangère ne pointe vers cause_dictionary, donc rien ne bloque la suppression).
    try {
      await query("DELETE FROM cause_dictionary WHERE id = ?", [id]);
      // Réponse JSON explicite (200) plutôt que 204 sans corps : certains clients fetch
      // plantent en essayant de parser un corps vide en JSON, ce qui remontait comme
      // une fausse "erreur" côté interface alors que la suppression avait réussi.
      return res.status(200).json({ success: true, id: Number(id) });
    } catch (e) {
      if (e.code === "ER_ROW_IS_REFERENCED_2" || e.code === "ER_ROW_IS_REFERENCED") {
        return res.status(409).json({ error: "Impossible de supprimer : cet élément est encore référencé ailleurs." });
      }
      return res.status(500).json({ error: "Erreur lors de la suppression de l'élément." });
    }
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}