import { query } from "../../../lib/db";

const EXTERNAL_AI_URL = "https://pahae-utils.vercel.app/api/responseAI";
const VALID_BLOCS = ["milieu", "methode", "machine", "main_oeuvre", "matiere"];

async function fetchHistoricalCauses(currentId) {
  const rows = await query(
    `SELECT bloc, texte FROM probleme_causes
     WHERE probleme_id != ? AND niveau = 0
     ORDER BY id DESC LIMIT 10`,
    [currentId]
  );
  return rows;
}

async function fetchHistoricalActions(currentId) {
  const rows = await query(
    `SELECT action, pilote FROM probleme_actions
     WHERE probleme_id != ? AND type = 'd3' AND action != ''
     ORDER BY id DESC LIMIT 10`,
    [currentId]
  );
  return rows;
}

function extractJson(text) {
  if (!text) return null;
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return null;
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch (e) {
    return null;
  }
}

async function callAi(dataPayload, prompt) {
  const params = new URLSearchParams({ data: JSON.stringify(dataPayload), prompt });
  const res = await fetch(`${EXTERNAL_AI_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Le service IA n'a pas répondu correctement.");
  const json = await res.json();
  const parsed = extractJson(json.response);
  if (!parsed) throw new Error("Réponse IA illisible ou tronquée.");
  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "id requis" });

  try {
    const rows = await query(
      "SELECT probleme, ligne, quoi, qui, ou, quand_txt, combien, comment_txt, pourquoi FROM problemes WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Problème introuvable" });
    const p = rows[0];

    const complete = p.quoi && p.qui && p.ou && p.quand_txt && p.combien && p.comment_txt && p.pourquoi;
    if (!complete) {
      return res.status(400).json({ error: "Le QQOQCCP (D2) doit être complet." });
    }

    const qqoqccp = {
      quoi: p.quoi,
      qui: p.qui,
      ou: p.ou,
      quand: p.quand_txt,
      combien: p.combien,
      comment: p.comment_txt,
      pourquoi: p.pourquoi,
    };

    const [historiqueActions, historiqueCauses] = await Promise.all([
      fetchHistoricalActions(id),
      fetchHistoricalCauses(id),
    ]);

    let actionsD3 = [];
    let causesD4 = [];
    let partialError = "";

    try {
      const dataD3 = { probleme: p.probleme, ligne: p.ligne, qqoqccp, historique_actions: historiqueActions };
      const promptD3 = [
        "Expert 8D industriel. À partir du QQOQCCP et de l'historique, propose 3 actions de sécurisation immédiates (D3).",
        "Réponds UNIQUEMENT en JSON compact, sans texte autour, sans retour à la ligne inutile:",
        '{"actions_d3":[{"action":"...","pilote":"..."}]}',
        "Chaque action en moins de 15 mots. Chaque pilote en 2-3 mots (rôle générique). Maximum 3 actions.",
      ].join(" ");
      const parsed = await callAi(dataD3, promptD3);
      actionsD3 = Array.isArray(parsed.actions_d3)
        ? parsed.actions_d3
            .filter((a) => a && a.action)
            .slice(0, 5)
            .map((a) => ({ action: String(a.action).slice(0, 255), pilote: a.pilote ? String(a.pilote).slice(0, 150) : "" }))
        : [];
    } catch (e) {
      partialError = e.message;
    }

    try {
      const dataD4 = { probleme: p.probleme, ligne: p.ligne, qqoqccp, historique_causes: historiqueCauses };
      const promptD4 = [
        "Expert 8D industriel. À partir du QQOQCCP et de l'historique, propose 5 causes potentielles réparties sur les 5M (Ishikawa).",
        "Réponds UNIQUEMENT en JSON compact, sans texte autour, sans retour à la ligne inutile:",
        '{"causes_d4":[{"bloc":"...","texte":"..."}]}',
        "Le bloc doit être exactement l'un de: milieu, methode, machine, main_oeuvre, matiere.",
        "Chaque texte en moins de 10 mots. Maximum 5 causes.",
      ].join(" ");
      const parsed = await callAi(dataD4, promptD4);
      causesD4 = Array.isArray(parsed.causes_d4)
        ? parsed.causes_d4
            .filter((c) => c && c.texte && VALID_BLOCS.includes(c.bloc))
            .slice(0, 8)
            .map((c) => ({ bloc: c.bloc, texte: String(c.texte).slice(0, 255) }))
        : [];
    } catch (e) {
      partialError = partialError ? `${partialError} / ${e.message}` : e.message;
    }

    if (actionsD3.length === 0 && causesD4.length === 0) {
      return res.status(502).json({ error: partialError || "Réponse IA illisible." });
    }

    res.status(200).json({ actionsD3, causesD4, warning: partialError || undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}