import { useEffect, useState } from "react";
import Link from "next/link";
import { FaPlane, FaCogs, FaChartBar, FaArrowRight } from "react-icons/fa";
import { apiGet } from "../lib/apiClient";

const ICONS = { ligne: FaPlane, machine: FaCogs };

export default function Home() {
  const [sheets, setSheets] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/api/sheets")
      .then(setSheets)
      .catch((e) => setError(e.message));
  }, []);

  const leftSheets = sheets.slice(0, 3);

  const LeftCard = ({ s }) => {
    const Icon = ICONS[s.type] || FaCogs;
    return (
      <Link
        href={`/dashboard/${s.code}`}
        className="group relative z-10 w-72 h-36 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-2xl px-6 py-2 flex flex-col justify-center items-center gap-3 transition"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Icon className="text-blue-400 text-xl" />
        </div>
        <div>
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
    <div className="min-h-screen w-full bg-[#0B1526] flex flex-col">
      <header className="flex items-center gap-3 px-8 py-6">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          <FaCogs className="text-white text-lg" />
        </div>
        <span className="text-white font-bold tracking-wide text-xl">
          MES <span className="font-extrabold text-blue-400">PERFORMANCE</span>
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <h1 className="text-white text-2xl font-bold mb-2 text-center">Sélectionnez une feuille</h1>
        <p className="text-gray-400 text-sm mb-10 text-center">Choisissez la ligne, la machine ou la vue de supervision à consulter</p>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {/* Desktop : diagramme / organigramme */}
        <div className="hidden lg:flex flex-row items-stretch justify-center">
          {/* Colonne gauche : 3 cartes empilées */}
          <div className="flex flex-col gap-8">
            {leftSheets.map((s) => (
              <LeftCard key={s.id} s={s} />
            ))}
          </div>

          {/* Zone de connexion (lignes) */}
          <div className="relative w-24">
            {/* Ligne horizontale carte 1 -> tronc vertical */}
            <div className="absolute left-0 top-[72px] w-1/2 h-0 border-t-2 border-blue-500/40" />
            {/* Ligne horizontale carte 2 -> tronc vertical */}
            <div className="absolute left-0 top-[248px] w-1/2 h-0 border-t-2 border-blue-500/40" />
            {/* Ligne horizontale carte 3 -> tronc vertical */}
            <div className="absolute left-0 top-[424px] w-1/2 h-0 border-t-2 border-blue-500/40" />

            {/* Tronc vertical reliant les trois cartes */}
            <div className="absolute left-1/2 top-[72px] h-[352px] w-0 border-l-2 border-blue-500/40 -translate-x-1/2" />

            {/* Ligne horizontale tronc -> carte supervision */}
            <div className="absolute left-1/2 top-[248px] w-1/2 h-0 border-t-2 border-blue-500/40 -translate-y-1/2" />
          </div>

          {/* Colonne droite : carte supervision, centrée verticalement */}
          <div className="flex items-center">
            <SupervisionCard />
          </div>
        </div>

        {/* Mobile / tablette : simple empilement, sans lignes */}
        <div className="flex lg:hidden flex-col items-center gap-5 w-full max-w-sm">
          {leftSheets.map((s) => (
            <LeftCard key={s.id} s={s} className="w-full" />
          ))}
          <SupervisionCard className="w-full" />
        </div>
      </main>

      <footer className="text-center text-gray-500 text-[11px] py-4">MES Performance — Gestion de performance industrielle</footer>
    </div>
  );
}