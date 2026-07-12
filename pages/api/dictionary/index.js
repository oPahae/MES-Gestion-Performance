import { query } from "../../../lib/db";

const CATEGORIES = ["risque", "defaut", "absence"];

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { sheetId, categorie } = req.query;
    if (!sheetId) return res.status(400).json({ error: "sheetId est requis." });

    let sql = `SELECT d.*, p.nom AS poste_nom
               FROM cause_dictionary d
               LEFT JOIN postes p ON p.id = d.poste_id
               WHERE d.sheet_id = ?`;
    const params = [sheetId];
    if (categorie) {
      sql += " AND d.categorie = ?";
      params.push(categorie);
    }
    sql += " ORDER BY d.categorie ASC, d.libelle ASC";
    const rows = await query(sql, params);
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { sheetId, categorie, libelle, posteId } = req.body || {};
    if (!sheetId || !categorie || !libelle) {
      return res.status(400).json({ error: "sheetId, categorie et libelle sont requis." });
    }
    if (!CATEGORIES.includes(categorie)) {
      return res.status(400).json({ error: "categorie invalide." });
    }
    const result = await query(
      "INSERT INTO cause_dictionary (sheet_id, categorie, libelle, poste_id) VALUES (?, ?, ?, ?)",
      [sheetId, categorie, libelle.trim(), posteId || null]
    );
    const [row] = await query(
      `SELECT d.*, p.nom AS poste_nom FROM cause_dictionary d
       LEFT JOIN postes p ON p.id = d.poste_id WHERE d.id = ?`,
      [result.insertId]
    );
    return res.status(201).json(row);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}
