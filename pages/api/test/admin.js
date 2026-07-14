import { query } from "../../../lib/db";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { email, password } = req.query;
  if (!email || !password) {
    return res.status(400).json({ error: "email et password sont obligatoires." });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await query(
      "INSERT INTO admins (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
      [email, hash]
    );
    res.status(200).json({ ok: true, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}