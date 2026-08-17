import { query } from "../../../lib/db";
import { todayIso } from "../../../lib/dateUtils";

const MAIL_URL = "https://pahae-utils.vercel.app/api/mail";

const ROLE_LABELS = {
  logistique: "Logistique",
  qualite: "Contrôle de qualité",
  methodiste: "Méthodiste",
  chef_equipe: "Chef d'équipe",
};

function buildEmail({ nom, sheetLabel, anomalies }) {
  const subject = `[MES Performance] ${anomalies.length} anomalie(s) détectée(s) — ${sheetLabel}`;

  const textLines = [
    `Bonjour ${nom},`,
    "",
    `Les anomalies suivantes ont été détectées aujourd'hui sur la feuille "${sheetLabel}" :`,
    "",
    ...anomalies.map((a) => `- ${a}`),
    "",
    "Merci de vérifier le tableau de bord MES Performance dès que possible.",
  ];
  const text = textLines.join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937;">
      <p>Bonjour <strong>${nom}</strong>,</p>
      <p>Les anomalies suivantes ont été détectées aujourd'hui sur la feuille <strong>${sheetLabel}</strong> :</p>
      <ul style="padding-left: 18px;">
        ${anomalies.map((a) => `<li style="margin-bottom: 4px;">${a}</li>`).join("")}
      </ul>
      <p>Merci de vérifier le <strong>tableau de bord MES Performance</strong> dès que possible.</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Ceci est une notification automatique du système MES Performance.</p>
    </div>
  `.trim();

  return { subject, text, html };
}

async function sendMail(email, subject, text, html) {
  const params = new URLSearchParams({ email, subject, text, html });
  const res = await fetch(`${MAIL_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Échec envoi email à ${email} (statut ${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const today = todayIso();

    const sheets = await query("SELECT id, code, label FROM sheets");
    const usersRaw = await query(
      "SELECT nom, email, role FROM users WHERE actif = 1 AND role IN ('methodiste','logistique','qualite')"
    );
    const usersByRole = { methodiste: [], logistique: [], qualite: [] };
    usersRaw.forEach((u) => usersByRole[u.role].push(u));

    const kpiRows = await query(
      "SELECT sheet_id, kpi_key, data FROM kpi_daily_params WHERE date_jour = ? AND kpi_key IN ('S','Q','D')",
      [today]
    );

    const byId = {};
    kpiRows.forEach((r) => {
      const key = `${r.sheet_id}|${r.kpi_key}`;
      byId[key] = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    });

    const results = [];
    const errors = [];

    for (const sheet of sheets) {
      const sData = byId[`${sheet.id}|S`];
      const qData = byId[`${sheet.id}|Q`];
      const dData = byId[`${sheet.id}|D`];

      const anomaliesByRole = { methodiste: [], logistique: [], qualite: [] };

      if (sData) {
        const accidents = Number(sData.accidents) || 0;
        const risques = Number(sData.risques) || 0;
        if (risques > 5) anomaliesByRole.methodiste.push(`Nombre de risques anormalement élevé : ${risques} (seuil : 5)`);
        if (accidents > 1) anomaliesByRole.methodiste.push(`Nombre d'accidents anormalement élevé : ${accidents} (seuil : 1)`);
      }

      if (dData) {
        const produite = Number(dData.quantiteProduite) || 0;
        const planifiee = Number(dData.quantitePlanifiee) || 0;
        if (planifiee > 0) {
          const pdp = (produite / planifiee) * 100;
          if (pdp < 100) {
            anomaliesByRole.logistique.push(`PDP inférieur à 100% : ${pdp.toFixed(1)}% (produit : ${produite}, planifié : ${planifiee})`);
          }
        }
      }

      if (qData) {
        const rebuts = Number(qData.rebuts) || 0;
        const quantiteTotale = Number(qData.quantiteTotale) || 0;
        if (quantiteTotale > 0) {
          const tauxRebut = (rebuts / quantiteTotale) * 100;
          if (tauxRebut > 20) {
            anomaliesByRole.qualite.push(`Taux de rebut élevé : ${tauxRebut.toFixed(1)}% (${rebuts} rebuts sur ${quantiteTotale} pièces, seuil : 20%)`);
          }
        }
      }

      for (const role of ["methodiste", "logistique", "qualite"]) {
        if (anomaliesByRole[role].length === 0) continue;
        const message = `Feuille "${sheet.label}" — ${anomaliesByRole[role].join(" ; ")}`;

        for (const user of usersByRole[role]) {
          const already = await query(
            "SELECT id FROM anomaly_notifications WHERE sheet_id = ? AND role = ? AND destinataire_email = ? AND date_jour = ?",
            [sheet.id, role, user.email, today]
          );
          if (already.length > 0) {
            await query(
              "UPDATE anomaly_notifications SET message = ?, lu = 0 WHERE id = ?",
              [message, already[0].id]
            );
          } else {
            await query(
              "INSERT INTO anomaly_notifications (sheet_id, role, destinataire_email, destinataire_nom, date_jour, message, lu) VALUES (?, ?, ?, ?, ?, ?, 0)",
              [sheet.id, role, user.email, user.nom, today, message]
            );
          }

          const { subject, text, html } = buildEmail({
            nom: user.nom,
            sheetLabel: sheet.label,
            anomalies: anomaliesByRole[role],
          });
          try {
            await sendMail(user.email, subject, text, html);
            results.push({ sheet: sheet.label, role: ROLE_LABELS[role], destinataire: user.email, anomalies: anomaliesByRole[role] });
          } catch (err) {
            errors.push({ sheet: sheet.label, role: ROLE_LABELS[role], destinataire: user.email, error: err.message });
          }
        }
      }
    }

    res.status(200).json({
      date: today,
      totalEmailsEnvoyes: results.length,
      totalErreurs: errors.length,
      envois: results,
      erreurs: errors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}