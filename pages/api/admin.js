import bcrypt from "bcryptjs";
import { query } from "../../lib/db";

// Pas de système d'authentification pour le moment : on considère que
// l'admin actuellement connecté est toujours celui d'id = 1.
const CURRENT_ADMIN_ID = 1;

export default async function handler(req, res) {
  if (req.method === "GET") {
    const [row] = await query("SELECT id, email, updated_at FROM admins WHERE id = ?", [CURRENT_ADMIN_ID]);
    if (!row) return res.status(404).json({ error: "Compte admin introuvable." });
    return res.status(200).json(row);
  }

  if (req.method === "PUT") {
    const { currentPassword, newEmail, newPassword } = req.body || {};
    if (!currentPassword) {
      return res.status(400).json({ error: "Le mot de passe actuel est requis pour confirmer les changements." });
    }
    const [admin] = await query("SELECT * FROM admins WHERE id = ?", [CURRENT_ADMIN_ID]);
    if (!admin) return res.status(404).json({ error: "Compte admin introuvable." });

    const ok = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Mot de passe actuel incorrect." });
    }

    if (!newEmail && !newPassword) {
      return res.status(400).json({ error: "Renseignez un nouvel email et/ou un nouveau mot de passe." });
    }
    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
    }

    try {
      const email = newEmail ? newEmail.trim().toLowerCase() : admin.email;
      const passwordHash = newPassword ? await bcrypt.hash(newPassword, 10) : admin.password_hash;
      await query("UPDATE admins SET email = ?, password_hash = ? WHERE id = ?", [
        email,
        passwordHash,
        CURRENT_ADMIN_ID,
      ]);
      return res.status(200).json({ id: CURRENT_ADMIN_ID, email });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Cet email est déjà utilisé." });
      }
      return res.status(500).json({ error: "Erreur lors de la mise à jour du compte." });
    }
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}
