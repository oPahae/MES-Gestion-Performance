import { query } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await query("SELECT kpi_key, label FROM kpi_labels ORDER BY FIELD(kpi_key,'S','Q','C','D','P')");
    return res.status(200).json(rows);
  }

  if (req.method === "PUT") {
    const { kpiKey, label } = req.body || {};
    if (!kpiKey || !label) {
      return res.status(400).json({ error: "kpiKey et label sont requis." });
    }
    if (!["S", "Q", "C", "D", "P"].includes(kpiKey)) {
      return res.status(400).json({ error: "kpiKey invalide." });
    }
    await query("UPDATE kpi_labels SET label = ? WHERE kpi_key = ?", [label.trim(), kpiKey]);
    const [row] = await query("SELECT kpi_key, label FROM kpi_labels WHERE kpi_key = ?", [kpiKey]);
    return res.status(200).json(row);
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).end(`Méthode ${req.method} non autorisée`);
}
