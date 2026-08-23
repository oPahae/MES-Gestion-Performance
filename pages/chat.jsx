import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FaCogs,
  FaPlane,
  FaChartBar,
  FaClipboardList,
  FaSignOutAlt,
  FaPaperPlane,
  FaRobot,
  FaUser,
  FaLightbulb,
} from "react-icons/fa";
import { apiGet, apiPost } from "../lib/apiClient";
import { verifyAuth } from "../middlewares/auth";

const SUGGESTED_QUESTIONS = [
  "Comment saisir les paramètres du KPI Qualité ?",
  "Quelle est la formule du taux de disponibilité ?",
  "Quelle feuille a le plus de rebuts ce mois-ci ?",
  "Combien de problèmes 8D sont encore ouverts ?",
  "Quelles sont les actions en cours non terminées ?",
  "Comment fonctionne la prédiction des indicateurs ?",
  "Quel est le taux de rebut sur les 30 derniers jours ?",
  "Comment ajouter un nouvel utilisateur ?",
];

function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-start gap-2 max-w-[75%] ${isUser ? "flex-row-reverse" : ""}`}>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isUser ? "bg-blue-600 text-white" : "bg-purple-100 text-purple-600"
          }`}
        >
          {isUser ? <FaUser className="text-xs" /> : <FaRobot className="text-xs" />}
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm"
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [allSheets, setAllSheets] = useState([]);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Bonjour ! Je suis l'assistant de MES Performance. Posez-moi une question sur l'utilisation de l'application ou sur vos données de production." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contextData, setContextData] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    apiGet("/api/sheets").then(setAllSheets).catch(() => {});
    apiGet("/api/ai/context").then(setContextData).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function send(text) {
    const finalText = (text ?? input).trim();
    if (!finalText || loading) return;

    const newMessages = [...messages, { role: "user", content: finalText }];
    setMessages(newMessages);
    setInput("");
    setError("");
    setLoading(true);

    apiPost("/api/ai/chat", {
      message: finalText,
      history: newMessages.filter((m) => m.role === "user" || m.role === "assistant"),
      context: contextData,
    })
      .then((res) => {
        setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
      })
      .catch((e) => {
        setError(e.message || "Erreur lors de la génération de la réponse.");
        setMessages((prev) => [...prev, { role: "assistant", content: "Désolé, je n'ai pas pu répondre. Réessayez dans un instant." }]);
      })
      .finally(() => setLoading(false));
  }

  const hasStartedChat = messages.length > 1;

  return (
    <div className="h-screen overflow-hidden flex bg-[#EEF1F6] text-xs">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white border-b border-gray-200 h-[64px] flex items-center px-6">
          <h1 className="font-bold text-lg text-gray-800 tracking-tight flex items-center gap-2">
            <FaRobot className="text-purple-500" /> ASSISTANT IA
          </h1>
        </header>

        <main className="flex-1 min-h-0 flex flex-col">
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto px-6 py-5 flex flex-col gap-4">
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <FaRobot className="text-xs" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!hasStartedChat && (
            <div className="px-6 pb-3">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500">
                <FaLightbulb className="text-amber-400" /> Suggestions de questions
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 rounded-full px-3 py-1.5 transition-all duration-150"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
            {error && <p className="text-xs text-red-500 font-semibold mb-2">{error}</p>}
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Posez votre question sur l'application ou vos données..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                <FaPaperPlane className="text-xs" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res }) {
  const user = verifyAuth(req, res);
  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  return { props: {} };
}