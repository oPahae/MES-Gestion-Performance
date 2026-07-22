import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaCogs, FaPlane, FaChartBar, FaSignOutAlt, FaPlus, FaClipboardList, FaUsers } from "react-icons/fa";
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

export default function ResolutionProblemesPage() {
  const router = useRouter();
  const [allSheets, setAllSheets] = useState([]);
  const [problemes, setProblemes] = useState([]);
  const [, setNow] = useState(Date.now());

  function refresh() {
    apiGet("/api/problemes").then(setProblemes).catch(() => {});
  }

  useEffect(() => {
    apiGet("/api/sheets").then(setAllSheets).catch(() => {});
    refresh();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-[#EEF1F6] text-xs">
      <aside className="w-[210px] shrink-0 bg-[#0B1526] text-white flex flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
            <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
              <FaCogs className="text-white text-sm" />
            </div>
            <span className="font-bold tracking-wide text-base">
              MES <span className="font-extrabold">PERFORMANCE</span>
            </span>
          </Link>
          <div className="px-5 pt-5 pb-2 text-xs tracking-wider text-gray-400 font-semibold">SÉLECTION</div>
          <nav className="px-3 flex flex-col gap-1">
            {allSheets.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/${s.code}`}
                className="flex items-center gap-3 px-3 py-3 rounded-lg font-medium text-gray-300 hover:bg-white/5"
              >
                {s.type === "machine" ? <FaCogs className="text-sm" /> : <FaPlane className="text-sm" />}
                {s.label}
              </Link>
            ))}
            <Link href="/supervision" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/5 text-left">
              <FaChartBar className="text-sm" />
              Supervision hebdomadaire
            </Link>
            <Link href="/rp" className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#7A1E22] text-white text-left">
              <FaClipboardList className="text-sm" />
              Résolution de problèmes
            </Link>
          </nav>
        </div>
        <div className="px-3 pb-4">
          <Link href="/api/auth/logout" className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-white/5">
            <FaSignOutAlt className="text-sm" />
            LOGOUT
          </Link>
        </div>
      </aside>

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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statutColor(p.statut)}`}>{p.statut}</span>
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
    return { redirect: { destination: "/login", permanent: false } };
  }
  return { props: {} };
}