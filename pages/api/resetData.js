import { query } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    await query("DELETE FROM retour_client_notifications");
    await query("DELETE FROM planning_tickets");
    await query("DELETE FROM actions");
    await query("DELETE FROM pareto_tickets");
    await query("DELETE FROM cause_selections");
    await query("DELETE FROM cause_temps");
    await query("DELETE FROM kpi_daily_params");
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}