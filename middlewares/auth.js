import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyAuth(req, res) {
  const token = req.cookies?.authToken;
  if (!token) {
    return null;
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    return { id: user.id, nom: user.nom, email: user.email, role: user.role };
  } catch (error) {
    console.error("Invalid token", error);
    return null;
  }
}

export function requireAuth(req, res) {
  const user = verifyAuth(req, res);
  if (!user) {
    res.status(401).json({ error: "Non authentifié" });
    return null;
  }
  return user;
}

export function requireAdmin(req, res) {
  const user = verifyAuth(req, res);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé" });
    return null;
  }
  return user;
}