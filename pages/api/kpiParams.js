// pages/api/kpiParams.js
import { query } from "../../lib/db";

async function getParams(sheetId, date, kpi) {
  const rows = await query(
    "SELECT data FROM kpi_daily_params WHERE sheet_id = ? AND kpi_key = ? AND date_jour = ?",
    [sheetId, kpi, date]
  );
  if (!rows.length) return {};
  return typeof rows[0].data === "string" ? JSON.parse(rows[0].data) : rows[0].data;
}

async function saveParams(sheetId, date, kpi, data) {
  await query(
    "INSERT INTO kpi_daily_params (sheet_id, kpi_key, date_jour, data) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
    [sheetId, kpi, date, JSON.stringify(data)]
  );
}

async function syncQuantiteProduite(sheetId, date, sourceKpi, quantiteProduite) {
  const otherKpi = sourceKpi === "C" ? "D" : "C";
  const otherData = await getParams(sheetId, date, otherKpi);
  otherData.quantiteProduite = quantiteProduite;
  await saveParams(sheetId, date, otherKpi, otherData);

  const qData = await getParams(sheetId, date, "Q");
  qData.quantiteTotale = Number(quantiteProduite) || 0;
  await saveParams(sheetId, date, "Q", qData);
}

async function syncRebuts(sheetId, date, rebuts) {
  const qData = await getParams(sheetId, date, "Q");
  const cData = await getParams(sheetId, date, "C");
  qData.rebuts = rebuts;
  qData.quantiteTotale = Number(cData.quantiteProduite) || 0;
  await saveParams(sheetId, date, "Q", qData);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { sheetId, date } = req.query;
    try {
      const rows = await query(
        "SELECT kpi_key, data FROM kpi_daily_params WHERE sheet_id = ? AND date_jour = ?",
        [sheetId, date]
      );
      const result = {};
      rows.forEach((r) => {
        result[r.kpi_key] = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      });
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const { sheetId, date, kpi, data } = req.body;
    try {
      if (kpi === "Q") {
        const cData = await getParams(sheetId, date, "C");
        data.quantiteTotale = Number(cData.quantiteProduite) || 0;
      }
      
      await saveParams(sheetId, date, kpi, data);

      if ((kpi === "C" || kpi === "D") && data.quantiteProduite !== undefined) {
        await syncQuantiteProduite(sheetId, date, kpi, data.quantiteProduite);
      }
      if (kpi === "Q" && data.rebuts !== undefined) {
        await syncRebuts(sheetId, date, data.rebuts);
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}