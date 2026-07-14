import { query } from "../../../lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "votre_cle_secrete_ici";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe sont obligatoires." });
  }

  try {
    const admins = await query("SELECT id, email, password_hash FROM admins WHERE email = ?", [email]);
    if (admins.length > 0) {
      const admin = admins[0];
      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect." });
      }
      const token = jwt.sign({ id: admin.id, nom: admin.email.split("@")[0].replace(".", " "), email: admin.email, role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
      const serialized = serialize("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
      res.setHeader("Set-Cookie", serialized);
      return res.status(200).json({ role: "admin" });
    }

    const users = await query("SELECT id, nom, email, password_hash, actif FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }
    const user = users[0];
    if (!user.actif) {
      return res.status(403).json({ error: "Ce compte est désactivé." });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }
    const token = jwt.sign({ id: user.id, nom: user.nom, email: user.email, role: "user" }, JWT_SECRET, { expiresIn: "1d" });
    const serialized = serialize("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    res.setHeader("Set-Cookie", serialized);
    return res.status(200).json({ role: "user" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Une erreur est survenue lors de la connexion." });
  }
}