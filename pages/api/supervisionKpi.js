import { query } from "../../lib/db";
import { KPI_ORDER, getRingConfig, computeRingValue } from "../../lib/kpiLogic";
import { addDaysIso } from "../../lib/dateUtils";

function dateKey(d) {
  if (!(d instanceof Date)) return String(d).slice(0, 10);
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  const { sheetId, weeks, sheetType } = req.query;
  if (!sheetId || !weeks) {
    res.status(400).json({ error: "Paramètres manquants" });
    return;
  }

  try {
    const weekStarts = weeks.split(",");
    const first = weekStarts[0];
    const last = addDaysIso(weekStarts[weekStarts.length - 1], 6);

    const rows = await query(
      "SELECT kpi_key, date_jour, data FROM kpi_daily_params WHERE sheet_id = ? AND date_jour BETWEEN ? AND ?",
      [sheetId, first, last]
    );

    function weekOf(iso) {
      return weekStarts.find((w) => iso >= w && iso <= addDaysIso(w, 6));
    }

    const byWeekKpi = {};
    rows.forEach((r) => {
      const iso = dateKey(r.date_jour);
      const wk = weekOf(iso);
      if (!wk) return;
      const key = `${wk}|${r.kpi_key}`;
      byWeekKpi[key] = byWeekKpi[key] || {};
      const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      Object.entries(data || {}).forEach(([f, v]) => {
        byWeekKpi[key][f] = (byWeekKpi[key][f] || 0) + (Number(v) || 0);
      });
    });

    const kpis = {};
    KPI_ORDER.forEach((k) => {
      const ringConfig = getRingConfig(k, sheetType);
      kpis[k] = ringConfig.map((cfg) => ({
        name: cfg.name,
        type: cfg.type,
        cells: weekStarts.map((wk) => {
          const params = byWeekKpi[`${wk}|${k}`] || null;
          const { value, status } = computeRingValue(k, cfg.name, params);
          return { value, status };
        }),
      }));
    });

    res.status(200).json({ weeks: weekStarts, kpis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}