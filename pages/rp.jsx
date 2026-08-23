import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaCogs, FaPlane, FaChartBar, FaSignOutAlt, FaPlus, FaClipboardList, FaUsers, FaCog } from "react-icons/fa";
import { apiGet } from "../lib/apiClient";
import { fmtLead } from "../lib/problemeLogic";
import { verifyAuth } from "../middlewares/auth";

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statutColor(statut) {
  if (statut === "Clôturé") return "bg-green-100 text-green-700";
  if (statut === "En attente") return "bg-gray-100 text-gray-500";
  return "bg-orange-100 text-orange-600";
}

export default function ResolutionProblemesPage({ session }) {
  const router = useRouter();
  const [allSheets, setAllSheets] = useState([]);
  const [problemes, setProblemes] = useState([]);
  const [, setNow] = useState(Date.now());

  function refresh() {
    apiGet("/api/problemes").then(setProblemes).catch(() => { });
  }

  useEffect(() => {
    apiGet("/api/sheets").then(setAllSheets).catch(() => { });
    refresh();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-screen overflow-hidden flex bg-[#EEF1F6] text-xs">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white border-b border-gray-200">
          <div className="h-[64px] flex items-center justify-between px-6">
            <h1 className="font-bold text-lg text-gray-800 tracking-tight">TABLEAU DES PROBLÈMES 8D</h1>
            <button
              onClick={() => router.push("/probleme")}
              className="flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 active:scale-95"
            >
              <FaPlus className="text-xs" /> Nouveau problème
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-4 overflow-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-100">
                  <th className="py-2 font-semibold">N°</th>
                  <th className="py-2 font-semibold">Problème</th>
                  <th className="py-2 font-semibold">Pilote</th>
                  <th className="py-2 font-semibold">Ligne</th>
                  <th className="py-2 font-semibold">Statut</th>
                  <th className="py-2 font-semibold">Date d&apos;ouverture</th>
                  <th className="py-2 font-semibold">Lead</th>
                  <th className="py-2 font-semibold">Équipe</th>
                </tr>
              </thead>
              <tbody>
                {problemes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-300 py-8 text-xs">
                      Aucun problème enregistré.
                    </td>
                  </tr>
                )}
                {problemes.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/probleme?id=${p.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors duration-150 cursor-pointer"
                  >
                    <td className="py-3 text-gray-500 font-mono">{p.numero}</td>
                    <td className="py-3 text-gray-700">{p.probleme || <span className="text-gray-300">Sans titre</span>}</td>
                    <td className="py-3 text-gray-500">{p.pilote || "—"}</td>
                    <td className="py-3 text-gray-500">{p.ligne || "—"}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statutColor(p.statut)}`}>{p.statut.split("–")[0]}</span>
                    </td>
                    <td className="py-3 text-gray-500">{fmtDateTime(p.date_ouverture)}</td>
                    <td className="py-3 text-gray-500 font-mono">{fmtLead(p.date_ouverture)}</td>
                    <td className="py-3 text-gray-500">
                      <div className="flex items-center gap-1">
                        <FaUsers className="text-gray-300" />
                        {p.equipe && p.equipe.length > 0 ? p.equipe.join(", ") : "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res }) {
  const user = verifyAuth(req, res);
  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
  return {
    props: {
      session: {
        nom: user.nom,
        isAdmin: user.role === "admin",
      }
    }
  };
}