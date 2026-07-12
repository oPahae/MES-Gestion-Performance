import { query } from "../../lib/db";
import { KPI_ORDER, getRingConfig, computeRingValue } from "../../lib/kpiLogic";
import { computeDays } from "../../lib/dateUtils";

const SEVERITY = { red: 4, orange: 3, gray: 2, green: 1, white: 0 };

function worstStatus(statuses) {
  return statuses.reduce((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), "white");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  try {
    const sheets = await query("SELECT id, code, label, type FROM sheets ORDER BY id");
    const days = computeDays("semaine");
    const first = days[0];
    const last = days[days.length - 1];

    const result = [];
    for (const sheet of sheets) {
      const rows = await query("SELECT kpi_key, date_jour, data FROM kpi_daily_params WHERE sheet_id = ? AND date_jour BETWEEN ? AND ?", [
        sheet.id,
        first,
        last,
      ]);
      const kpiStatus = {};
      KPI_ORDER.forEach((k) => {
        const ringConfig = getRingConfig(k, sheet.type);
        const kpiRows = rows.filter((r) => r.kpi_key === k);
        const statuses = [];
        kpiRows.forEach((r) => {
          ringConfig.forEach((cfg) => {
            const { status } = computeRingValue(k, cfg.name, r.data);
            statuses.push(status);
          });
        });
        kpiStatus[k] = worstStatus(statuses);
      });
      result.push({ id: sheet.id, code: sheet.code, label: sheet.label, type: sheet.type, kpiStatus });
    }

    res.status(200).json({ days, sheets: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
