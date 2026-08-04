import bcrypt from "bcryptjs";
import { query } from "../../../lib/db";
import { USER_ROLES } from "../../../lib/userLogic";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PUT") {
    const { nom, email, actif, password, role } = req.body || {};
    if (!nom || !email) {
      return res.status(400).json({ error: "nom et email sont requis." });
    }
    const finalRole = role && USER_ROLES.includes(role) ? role : undefined;
    try {
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        await query("UPDATE users SET nom = ?, email = ?, actif = ?, password_hash = ?, role = COALESCE(?, role) WHERE id = ?", [
          nom.trim(),
          email.trim().toLowerCase(),
          actif ?? true,
          passwordHash,
          finalRole || null,
          id,
        ]);
      } else {
        await query("UPDATE users SET nom = ?, email = ?, actif = ?, role = COALESCE(?, role) WHERE id = ?", [
          nom.trim(),
          email.trim().toLowerCase(),
          actif ?? true,
          finalRole || null,
          id,
        ]);
      }
      const [row] = await query("SELECT id, nom, email, role, actif, created_at FROM users WHERE id = ?", [id]);
      if (!row) return res.status(404).json({ error: "Utilisateur introuvable." });
      return res.status(200).json(row);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Cet email est déjà utilisé." });
      }
      return res.status(500).json({ error: "Erreur lors de la mise à jour de l'utilisateur." });
    }
  }

  if (req.method === "DELETE") {
    await query("DELETE FROM users WHERE id = ?", [id]);
    return res.status(200).json({ success: true, id: Number(id) });
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}