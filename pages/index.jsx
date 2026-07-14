import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaPlane, FaCogs, FaChartBar, FaArrowRight, FaCog } from "react-icons/fa";
import { apiGet } from "../lib/apiClient";
import { verifyAuth } from "../middlewares/auth";

const ICONS = { ligne: FaPlane, machine: FaCogs };
const CARD_HEIGHT = 144;
const CARD_GAP = 32;

export default function Home({ isAdmin }) {
  const [sheets, setSheets] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/api/sheets")
      .then(setSheets)
      .catch((e) => setError(e.message));
  }, []);

  const totalHeight = sheets.length > 0 ? sheets.length * CARD_HEIGHT + (sheets.length - 1) * CARD_GAP : 0;
  const lineOffsets = useMemo(
    () => sheets.map((_, i) => i * (CARD_HEIGHT + CARD_GAP) + CARD_HEIGHT / 2),
    [sheets]
  );
  const trunkTop = lineOffsets.length ? lineOffsets[0] : 0;
  const trunkHeight = lineOffsets.length ? lineOffsets[lineOffsets.length - 1] - lineOffsets[0] : 0;
  const midOffset = lineOffsets.length ? trunkTop + trunkHeight / 2 : 0;

  const LeftCard = ({ s, className = "" }) => {
    const Icon = ICONS[s.type] || FaCogs;
    return (
      <Link
        href={`/dashboard/${s.code}`}
        className={`group relative z-10 w-72 h-36 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-2xl px-6 py-2 flex flex-col justify-center items-center gap-3 transition ${className}`}
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Icon className="text-blue-400 text-xl" />
        </div>
        <div className="flex flex-col justify-center items-center">
          <h2 className="text-white font-semibold text-lg">{s.label}</h2>
          <p className="text-gray-400 text-xs mt-1">Tableau de bord complet</p>
        </div>
        <span className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mt-auto transition">
          Ouvrir <FaArrowRight className="text-[10px]" />
        </span>
      </Link>
    );
  };

  const SupervisionCard = ({ className = "" }) => (
    <Link
      href="/supervision"
      className={`group relative z-10 w-80 h-36 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 rounded-2xl px-6 py-2 flex flex-col justify-center items-center gap-3 transition ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
        <FaChartBar className="text-amber-400 text-xl" />
      </div>
      <div>
        <h2 className="text-white font-semibold text-lg">Supervision hebdomadaire</h2>
        <p className="text-gray-400 text-xs mt-1">Vue d&apos;ensemble de toutes les feuilles</p>
      </div>
      <span className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mt-auto transition">
        Ouvrir <FaArrowRight className="text-[10px]" />
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen w-full bg-[#0B1526] flex flex-col noscroll">
      <header className="flex justify-between items-center gap-3 px-8 pt-6">
        <div className="flex gap-2 justify-center items-center">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <FaCogs className="text-white text-lg" />
          </div>
          <span className="text-white font-bold tracking-wide text-xl">
            MES <span className="font-extrabold text-blue-400">PERFORMANCE</span>
          </span>
        </div>

        <div className="flex gap-4 justify-center items-center">
          {isAdmin &&
            <div className="flex gap-2 justify-center items-center">
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                <FaCog className="text-white text-xs" />
              </div>
              <Link href="/settings" className="text-white font-bold tracking-wide text-xs">
                Paramètres
              </Link>
            </div>
          }
          <div className="flex gap-2 justify-center items-center">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
              <FaArrowRight className="text-red-500 text-xs" />
            </div>
            <Link href="/api/auth/logout" className="text-red-500 font-bold tracking-wide text-xs">
              LOGOUT
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="text-white text-2xl font-bold mb-2 text-center">Sélectionnez une feuille</h1>
        <p className="text-gray-400 text-sm mb-10 text-center">Choisissez la ligne, la machine ou la vue de supervision à consulter</p>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        <div className="hidden lg:flex flex-row items-stretch justify-center">
          <div className="flex flex-col gap-8" style={{ height: totalHeight || undefined }}>
            {sheets.map((s) => (
              <LeftCard key={s.id} s={s} />
            ))}
          </div>

          <div className="relative w-24" style={{ height: totalHeight || undefined }}>
            {lineOffsets.map((top, i) => (
              <div key={i} className="absolute left-0 w-1/2 h-0 border-t-2 border-blue-500/40" style={{ top }} />
            ))}

            {trunkHeight > 0 && (
              <div
                className="absolute left-1/2 w-0 border-l-2 border-blue-500/40 -translate-x-1/2"
                style={{ top: trunkTop, height: trunkHeight }}
              />
            )}

            {lineOffsets.length > 0 && (
              <div className="absolute left-1/2 w-1/2 h-0 border-t-2 border-blue-500/40 -translate-y-1/2" style={{ top: midOffset }} />
            )}
          </div>

          <div className="flex items-center" style={{ height: totalHeight || undefined }}>
            <SupervisionCard />
          </div>
        </div>

        <div className="flex lg:hidden flex-col items-center gap-5 w-full max-w-sm">
          {sheets.map((s) => (
            <LeftCard key={s.id} s={s} className="w-full" />
          ))}
          <SupervisionCard className="w-full" />
        </div>
      </main>

      {/* <footer className="text-center text-gray-500 text-[11px] py-4">MES Performance — Gestion de performance industrielle</footer> */}
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
      isAdmin: user.role === "admin",
    }
  };
}