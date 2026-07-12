import { query } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { sheetId } = req.query;
    if (sheetId) {
      const rows = await query("SELECT * FROM postes WHERE sheet_id = ? ORDER BY nom ASC", [sheetId]);
      return res.status(200).json(rows);
    }
    // Sans sheetId : renvoie tous les postes avec le label de la feuille (utile pour la page réglages)
    const rows = await query(
      `SELECT p.*, s.label AS sheet_label
       FROM postes p
       JOIN sheets s ON s.id = p.sheet_id
       ORDER BY s.label ASC, p.nom ASC`
    );
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { sheetId, nom } = req.body || {};
    if (!sheetId || !nom) {
      return res.status(400).json({ error: "sheetId et nom sont requis." });
    }
    const result = await query("INSERT INTO postes (sheet_id, nom) VALUES (?, ?)", [sheetId, nom.trim()]);
    const [row] = await query("SELECT * FROM postes WHERE id = ?", [result.insertId]);
    return res.status(201).json(row);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}
