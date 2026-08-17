import { query } from "../../../lib/db";
import { verifyAuth } from "../../../middlewares/auth";

export default async function handler(req, res) {
  const authUser = verifyAuth(req, res);
  if (!authUser) return res.status(401).json({ error: "Non authentifié" });

  const userRows = await query("SELECT id, nom, email, role FROM users WHERE email = ?", [authUser.email]);
  const currentUser = userRows[0];
  if (!currentUser || !["methodiste", "logistique", "qualite"].includes(currentUser.role)) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  if (req.method === "GET") {
    try {
      const rows = await query(
        `SELECT n.id, n.date_jour, n.message, n.lu, n.created_at, s.label AS sheet_label, s.code AS sheet_code
         FROM anomaly_notifications n
         JOIN sheets s ON s.id = n.sheet_id
         WHERE n.destinataire_email = ? AND n.role = ?
         ORDER BY n.date_jour DESC, n.created_at DESC
         LIMIT 100`,
        [currentUser.email, currentUser.role]
      );
      res.status(200).json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      await query(
        "UPDATE anomaly_notifications SET lu = 1 WHERE destinataire_email = ? AND role = ?",
        [currentUser.email, currentUser.role]
      );
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}