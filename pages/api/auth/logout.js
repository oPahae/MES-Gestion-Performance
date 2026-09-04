import { serialize } from "cookie";

export default function handler(req, res) {
  const isMobile = req.query || false;
  if (req.method === "GET" || req.method === "POST") {
    res.setHeader(
      "Set-Cookie",
      serialize("authToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(0),
      })
    );
    res.writeHead(302, { Location: `${isMobile ? '/mobile' : '' }/login` });
    res.end();
    return;
  }
  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: `Méthode ${req.method} non autorisée` });
}
