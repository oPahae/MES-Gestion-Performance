import { APP_USAGE_GUIDE } from "../../../lib/appKnowledge";

const EXTERNAL_AI_URL = "https://pahae-utils.vercel.app/api/responseAI";

function buildHistoryText(history) {
  if (!Array.isArray(history) || history.length === 0) return "Aucun échange précédent.";
  return history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const { message, history, context } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: "Message vide." });

  try {
    const dataPayload = {
      guide_utilisation: APP_USAGE_GUIDE,
      donnees_temps_reel: context || {},
      historique_conversation: buildHistoryText(history),
      question: message.trim(),
    };

    const prompt = [
      "Tu es l'assistant intégré de l'application MES Performance, un outil industriel de suivi de la performance (SQCDP).",
      "Tu réponds en français, de façon concise et directe, en te basant STRICTEMENT sur le guide d'utilisation et les données temps réel fournies.",
      "Si la question porte sur l'utilisation de l'application, explique clairement où aller et quoi faire.",
      "Si la question porte sur des données (KPI, causes, actions, problèmes 8D...), utilise les chiffres fournis dans donnees_temps_reel et cite-les précisément.",
      "Si une information n'est pas disponible dans les données fournies, dis-le clairement plutôt que d'inventer.",
      "Ne réponds jamais avec du JSON. Réponds en texte simple, avec des puces si utile, sans formule mathématique en LaTeX.",
    ].join(" ");

    const params = new URLSearchParams({ data: JSON.stringify(dataPayload), prompt });
    const aiRes = await fetch(`${EXTERNAL_AI_URL}?${params.toString()}`);
    if (!aiRes.ok) {
      return res.status(502).json({ error: "Le service IA n'a pas répondu correctement." });
    }
    const aiJson = await aiRes.json();
    const answer = aiJson.response || "Je n'ai pas pu générer de réponse.";
    res.status(200).json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}