import { query } from "../../lib/db";
import { verifyAuth } from "../../middlewares/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  const authUser = verifyAuth(req, res);
  if (!authUser) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  if (authUser.role === "admin") {
    res.status(200).json({ nom: authUser.nom || "Admin", role: "admin" });
    return;
  }

  try {
    const rows = await query("SELECT nom, role FROM users WHERE email = ?", [authUser.email]);
    const row = rows[0];
    res.status(200).json({ nom: row ? row.nom : authUser.nom, role: row ? row.role : "chef_equipe" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}