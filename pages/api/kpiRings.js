import { query } from "../../lib/db";
import { KPI_ORDER, getRingConfig, computeRingValue } from "../../lib/kpiLogic";
import { computeDays } from "../../lib/dateUtils";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  const { sheetId, periode, startDate, endDate, sheetType } = req.query;

  try {
    const days = computeDays(periode, startDate, endDate);
    const first = days[0];
    const last = days[days.length - 1];

    const rows = await query(
      "SELECT kpi_key, date_jour, data FROM kpi_daily_params WHERE sheet_id = ? AND date_jour BETWEEN ? AND ?",
      [sheetId, first, last]
    );

    const byKpiDate = {};
    rows.forEach((r) => {
      const iso = new Date(
        r.date_jour.getTime() + (60 * 60 * 1000)
      )
        .toISOString()
        .slice(0, 10);
      let data = r.data;
      if (typeof data === "string") {
        data = JSON.parse(data);
      }
      byKpiDate[`${r.kpi_key}|${iso}`] = data;
    });

    const kpis = {};
    KPI_ORDER.forEach((k) => {
      const ringConfig = getRingConfig(k, sheetType);
      kpis[k] = ringConfig.map((cfg) => ({
        name: cfg.name,
        type: cfg.type,
        cells: days.map((iso) => {
          const params = byKpiDate[`${k}|${iso}`];
          const { value, status } = computeRingValue(k, cfg.name, params);
          return { value, status };
        }),
      }));
    });

    res.status(200).json({ days, kpis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
