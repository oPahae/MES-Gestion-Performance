import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaCogs,
  FaPlane,
  FaChartBar,
  FaClipboardList,
  FaSignOutAlt,
  FaRobot,
  FaBell,
  FaIndustry,
  FaCheckCircle,
  FaCircle,
  FaLock,
  FaPlay,
  FaUndo,
  FaTimesCircle,
  FaListOl,
  FaPuzzlePiece,
  FaExclamationTriangle,
  FaThumbsUp,
} from "react-icons/fa";
import { apiGet, apiPost } from "../lib/apiClient";
import { RUN_STATUT_LABELS } from "../lib/workflowLogic";
import { verifyAuth } from "../middlewares/auth";

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function PosteCard({ poste, statePoste, isActive, isLocked, onClick }) {
  const done = statePoste?.valide;
  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-150 ${
        isLocked
          ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100"
          : isActive
          ? "bg-white border-2 shadow-md"
          : "bg-white border-gray-100 hover:shadow-sm"
      }`}
      style={isActive && !isLocked ? { borderColor: poste.couleur } : {}}
    >
      <div className="flex items-center justify-between w-full">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
          style={{ backgroundColor: poste.couleur }}
        >
          {poste.numero}
        </span>
        {isLocked ? (
          <FaLock className="text-gray-300 text-sm" />
        ) : done ? (
          <FaCheckCircle className="text-green-500 text-sm" />
        ) : (
          <FaCircle className="text-gray-200 text-[10px]" />
        )}
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-700">{poste.titre}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{poste.sous_titre}</p>
      </div>
    </button>
  );
}

function StepList({ etapes }) {
  return (
    <div className="flex flex-col gap-2">
      {etapes.map((e) => (
        <div key={e.id} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
          <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
            {e.numero}
          </span>
          <p className="text-sm text-gray-700 leading-relaxed">{e.description}</p>
        </div>
      ))}
    </div>
  );
}

function PiecesList({ pieces }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {pieces.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-600">{p.nom}</span>
          <span className="text-[11px] font-bold text-gray-400 bg-gray-50 rounded-full px-2 py-0.5 shrink-0">×{p.quantite}</span>
        </div>
      ))}
    </div>
  );
}

function DefautsList({ defauts }) {
  const byCategorie = useMemo(() => {
    const map = {};
    defauts.forEach((d) => {
      map[d.categorie] = map[d.categorie] || [];
      map[d.categorie].push(d);
    });
    return map;
  }, [defauts]);

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(byCategorie).map(([categorie, items]) => (
        <div key={categorie}>
          <p className="text-xs font-bold text-gray-500 mb-1.5">{categorie}</p>
          <div className="flex flex-wrap gap-2">
            {items.map((d) => (
              <span
                key={d.id}
                className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 border ${
                  d.est_bon ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-100 text-red-500"
                }`}
              >
                {d.est_bon ? <FaThumbsUp className="text-[10px]" /> : <FaExclamationTriangle className="text-[10px]" />}
                {d.libelle}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkflowPage() {
  const [allSheets, setAllSheets] = useState([]);
  const [reference, setReference] = useState([]);
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [progress, setProgress] = useState([]);
  const [selectedPosteNumero, setSelectedPosteNumero] = useState(1);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiGet("/api/sheets").then(setAllSheets).catch(() => {});
    apiGet("/api/workflow/reference").then(setReference).catch(() => {});
    apiGet("/api/workflow/runs").then(setRuns).catch(() => {});
  }, []);

  function loadRun(id) {
    apiGet(`/api/workflow/runs/${id}`).then((data) => {
      setActiveRun(data.run);
      setProgress(data.progress);
      const firstUnvalidated = reference.find((p) => {
        const st = data.progress.find((pr) => pr.poste_id === p.id);
        return !st?.valide;
      });
      setSelectedPosteNumero(firstUnvalidated ? firstUnvalidated.numero : 1);
    });
  }

  function startFabrication() {
    setStarting(true);
    apiPost("/api/workflow/runs", {})
      .then((res) => {
        apiGet("/api/workflow/runs").then(setRuns);
        loadRun(res.id);
      })
      .finally(() => setStarting(false));
  }

  const progressByPosteId = useMemo(() => {
    const map = {};
    progress.forEach((p) => (map[p.poste_id] = p));
    return map;
  }, [progress]);

  const orderedPostes = useMemo(() => [...reference].sort((a, b) => a.ordre - b.ordre), [reference]);
  const selectedPoste = orderedPostes.find((p) => p.numero === selectedPosteNumero);
  const selectedProgress = selectedPoste ? progressByPosteId[selectedPoste.id] : null;

  function isPosteLocked(poste) {
    if (!activeRun) return true;
    const idx = orderedPostes.findIndex((p) => p.id === poste.id);
    for (let i = 0; i < idx; i++) {
      const st = progressByPosteId[orderedPostes[i].id];
      if (!st?.valide) return true;
    }
    return false;
  }

  function validateSelectedPoste(controleQualiteOk) {
    if (!activeRun || !selectedPoste) return;
    apiPost(`/api/workflow/runs/${activeRun.id}/validate`, { posteId: selectedPoste.id, controleQualiteOk }).then((data) => {
      setActiveRun(data.run);
      setProgress(data.progress);
      const nextIdx = orderedPostes.findIndex((p) => p.id === selectedPoste.id) + 1;
      if (nextIdx < orderedPostes.length) setSelectedPosteNumero(orderedPostes[nextIdx].numero);
      apiGet("/api/workflow/runs").then(setRuns);
    });
  }

  function resetSelectedPoste() {
    if (!activeRun || !selectedPoste) return;
    if (!window.confirm("Réinitialiser la validation de cette étape ?")) return;
    apiPost(`/api/workflow/runs/${activeRun.id}/reset`, { posteId: selectedPoste.id }).then((data) => {
      setActiveRun(data.run);
      setProgress(data.progress);
    });
  }

  const completedCount = progress.filter((p) => p.valide).length;
  const totalCount = orderedPostes.length;

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
              <Link key={s.id} href={`/dashboard/${s.code}`} className="flex items-center gap-3 px-3 py-3 rounded-lg font-medium text-gray-300 hover:bg-white/5">
                {s.type === "machine" ? <FaCogs className="text-sm" /> : <FaPlane className="text-sm" />}
                {s.label}
              </Link>
            ))}
            <Link href="/supervision" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/5 text-left">
              <FaChartBar className="text-sm" />
              Supervision hebdomadaire
            </Link>
            <Link href="/rp" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/5 text-left">
              <FaClipboardList className="text-sm" />
              Résolution de problèmes
            </Link>
            <Link href="/chat" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/5 text-left">
              <FaRobot className="text-sm" />
              Assistant IA
            </Link>
            <Link href="/notifications" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-white/5 text-left">
              <FaBell className="text-sm" />
              Notifications
            </Link>
            <Link href="/workflow" className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#7A1E22] text-white text-left">
              <FaIndustry className="text-sm" />
              Workflow de production
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
        <header className="shrink-0 bg-white border-b border-gray-200 h-[64px] flex items-center justify-between px-6">
          <div>
            <h1 className="font-bold text-lg text-gray-800 tracking-tight">WORKFLOW DE PRODUCTION</h1>
            <p className="text-xs text-gray-400">Cycle de fabrication — Avion LEGO</p>
          </div>
          {activeRun ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-700">{activeRun.reference}</p>
                <p className="text-[11px] text-gray-400">
                  {completedCount}/{totalCount} étapes — {RUN_STATUT_LABELS[activeRun.statut]}
                </p>
              </div>
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  activeRun.statut === "termine" ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600"
                }`}
              >
                {RUN_STATUT_LABELS[activeRun.statut]}
              </span>
            </div>
          ) : (
            <button
              onClick={startFabrication}
              disabled={starting}
              className="flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              <FaPlay className="text-xs" /> {starting ? "Lancement..." : "Lancer une fabrication"}
            </button>
          )}
        </header>

        <main className="flex-1 min-h-0 flex overflow-hidden">
          <div className="w-[280px] shrink-0 border-r border-gray-100 bg-white p-4 overflow-auto flex flex-col gap-3">
            {!activeRun && (
              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400">
                Aucune fabrication active. Lancez une nouvelle fabrication pour démarrer le suivi des postes.
              </div>
            )}
            {orderedPostes.map((p) => (
              <PosteCard
                key={p.id}
                poste={p}
                statePoste={progressByPosteId[p.id]}
                isActive={selectedPosteNumero === p.numero}
                isLocked={isPosteLocked(p)}
                onClick={() => setSelectedPosteNumero(p.numero)}
              />
            ))}

            {runs.length > 0 && (
              <div className="mt-2 pt-3 border-t border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 mb-2">Fabrications récentes</p>
                <div className="flex flex-col gap-1">
                  {runs.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => loadRun(r.id)}
                      className={`flex items-center justify-between text-left px-2.5 py-2 rounded-lg text-[11px] ${
                        activeRun?.id === r.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className="font-mono">{r.reference}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full font-semibold ${
                          r.statut === "termine" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {RUN_STATUT_LABELS[r.statut]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-6">
            {selectedPoste && (
              <div className="flex flex-col gap-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{selectedPoste.titre}</h2>
                    <p className="text-sm text-gray-400">{selectedPoste.sous_titre}</p>
                  </div>
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                    style={{ backgroundColor: selectedPoste.couleur }}
                  >
                    {selectedPoste.numero}
                  </span>
                </div>

                {selectedPoste.resultat_attendu && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <p className="text-xs font-bold text-gray-500 mb-1.5">Résultat attendu</p>
                    <p className="text-sm text-gray-600">{selectedPoste.resultat_attendu}</p>
                  </div>
                )}

                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                    <FaListOl /> Étapes de montage
                  </p>
                  <StepList etapes={selectedPoste.etapes} />
                </div>

                {selectedPoste.pieces.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <p className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                      <FaPuzzlePiece /> Pièces nécessaires
                    </p>
                    <PiecesList pieces={selectedPoste.pieces} />
                  </div>
                )}

                {selectedPoste.defauts.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <p className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
                      <FaExclamationTriangle /> Défauthèque — points de contrôle qualité
                    </p>
                    <DefautsList defauts={selectedPoste.defauts} />
                  </div>
                )}

                {activeRun && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
                    {selectedProgress?.valide ? (
                      <>
                        <div className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                          <FaCheckCircle /> Étape validée le {fmtDateTime(selectedProgress.valide_at)}
                          {selectedProgress.controle_qualite_ok ? (
                            <span className="text-[11px] bg-green-100 text-green-700 rounded-full px-2 py-0.5">Contrôle qualité OK</span>
                          ) : (
                            <span className="text-[11px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">Sans contrôle qualité</span>
                          )}
                        </div>
                        <button
                          onClick={resetSelectedPoste}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50"
                        >
                          <FaUndo className="text-[10px]" /> Réinitialiser
                        </button>
                      </>
                    ) : isPosteLocked(selectedPoste) ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <FaLock /> Validez les étapes précédentes pour débloquer ce poste.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full justify-end">
                        <button
                          onClick={() => validateSelectedPoste(false)}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-50"
                        >
                          <FaTimesCircle className="text-[11px]" /> Valider sans contrôle
                        </button>
                        <button
                          onClick={() => validateSelectedPoste(true)}
                          className="flex items-center gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 active:scale-95"
                        >
                          <FaCheckCircle className="text-xs" /> Valider l&apos;étape (contrôle qualité OK)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeRun?.statut === "termine" && selectedPoste.numero === orderedPostes[orderedPostes.length - 1].numero && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
                    <FaCheckCircle /> Fabrication {activeRun.reference} terminée avec succès — produit fini déposé en zone finale.
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res }) {
  const user = verifyAuth(req, res);
  if (!user || user.role !== "admin") {
    return { redirect: { destination: "/login", permanent: false } };
  }
  return { props: {} };
}