import bcrypt from "bcryptjs";
import { query } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await query(
      "SELECT id, nom, email, actif, created_at FROM users ORDER BY nom ASC"
    );
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { nom, email, password } = req.body || {};
    if (!nom || !email || !password) {
      return res.status(400).json({ error: "nom, email et mot de passe sont requis." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
    }
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await query(
        "INSERT INTO users (nom, email, password_hash) VALUES (?, ?, ?)",
        [nom.trim(), email.trim().toLowerCase(), passwordHash]
      );
      const [row] = await query(
        "SELECT id, nom, email, actif, created_at FROM users WHERE id = ?",
        [result.insertId]
      );
      return res.status(201).json(row);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Cet email est déjà utilisé." });
      }
      return res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}