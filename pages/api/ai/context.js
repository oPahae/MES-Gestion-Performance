import { query } from "../../../lib/db";
import { addDaysIso, todayIso } from "../../../lib/dateUtils";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const today = todayIso();
    const last30 = addDaysIso(today, -30);

    const sheets = await query("SELECT id, code, label, type FROM sheets ORDER BY id");
    const users = await query("SELECT nom, role, actif FROM users ORDER BY nom");

    const kpiRows = await query(
      "SELECT sheet_id, kpi_key, date_jour, data FROM kpi_daily_params WHERE date_jour BETWEEN ? AND ?",
      [last30, today]
    );

    const bySheetKpi = {};
    kpiRows.forEach((r) => {
      const key = `${r.sheet_id}|${r.kpi_key}`;
      bySheetKpi[key] = bySheetKpi[key] || [];
      const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      bySheetKpi[key].push(data);
    });

    function sum(arr, field) {
      return arr.reduce((s, d) => s + (Number(d[field]) || 0), 0);
    }

    const kpiSummary = sheets.map((s) => {
      const summary = { sheet: s.label, code: s.code, type: s.type };
      const sData = bySheetKpi[`${s.id}|S`] || [];
      const qData = bySheetKpi[`${s.id}|Q`] || [];
      const cData = bySheetKpi[`${s.id}|C`] || [];
      const dData = bySheetKpi[`${s.id}|D`] || [];
      const pData = bySheetKpi[`${s.id}|P`] || [];

      summary.securite_30j = { accidents: sum(sData, "accidents"), risques: sum(sData, "risques") };
      const rebuts = sum(qData, "rebuts");
      const qtyTotale = sum(qData, "quantiteTotale");
      summary.qualite_30j = { retoursClients: sum(qData, "retoursClients"), rebuts, tauxRebutPct: qtyTotale > 0 ? Number(((rebuts / qtyTotale) * 100).toFixed(1)) : null };
      const produiteC = sum(cData, "quantiteProduite");
      const objectifC = sum(cData, "quantiteObjectif");
      summary.cout_30j = { quantiteProduite: produiteC, quantiteObjectif: objectifC, tauxPct: objectifC > 0 ? Number(((produiteC / objectifC) * 100).toFixed(1)) : null };
      const produiteD = sum(dData, "quantiteProduite");
      const planifieeD = sum(dData, "quantitePlanifiee");
      summary.delai_30j = { quantiteProduite: produiteD, quantitePlanifiee: planifieeD, pdpPct: planifieeD > 0 ? Number(((produiteD / planifieeD) * 100).toFixed(1)) : null };
      summary.personnel_30j = { absents: sum(pData, "absents") };

      return summary;
    });

    const causeCounts = await query(
      "SELECT sheet_id, categorie, valeur, COUNT(*) as n FROM cause_selections WHERE date_jour BETWEEN ? AND ? GROUP BY sheet_id, categorie, valeur ORDER BY n DESC LIMIT 40",
      [last30, today]
    );

    const openActions = await query(
      "SELECT sheet_id, kpi_key, probleme, pilote, statut FROM actions WHERE statut != 'termine' ORDER BY id DESC LIMIT 20"
    );

    const openProblemes = await query(
      "SELECT numero, probleme, ligne, pilote, date_ouverture FROM problemes WHERE validation_signature = 0 ORDER BY date_ouverture DESC LIMIT 15"
    );

    const notifications = await query(
      "SELECT sheet_id, date_jour, texte, lu FROM retour_client_notifications ORDER BY created_at DESC LIMIT 15"
    );

    res.status(200).json({
      generatedAt: today,
      fenetre: `${last30} → ${today}`,
      sheets,
      users: users.map((u) => ({ nom: u.nom, role: u.role, actif: !!u.actif })),
      kpiSummary,
      topCauses30j: causeCounts,
      actionsOuvertes: openActions,
      problemes8dNonClotures: openProblemes,
      notificationsRecentes: notifications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}