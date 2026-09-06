import { useEffect, useMemo, useState } from "react";
import {
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
  FaUserTag,
  FaEye,
} from "react-icons/fa";
import { apiGet, apiPost } from "../lib/apiClient";
import { RUN_STATUT_LABELS } from "../lib/workflowLogic";
import { verifyAuth } from "../middlewares/auth";
import { query } from "../lib/db";

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function OverviewDiagram({ orderedPostes, progressByPosteId, etapesByPosteId, etapeProgressById, activePosteId, onSelectPoste }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shrink-0 overflow-x-auto">
      <p className="text-xs font-bold text-gray-500 mb-3">Avancement de la fabrication</p>
      <div className="flex items-stretch gap-2 min-w-max">
        {orderedPostes.map((poste, idx) => {
          const st = progressByPosteId[poste.id];
          const etapes = etapesByPosteId[poste.id] || [];
          const isActive = activePosteId === poste.id;
          return (
            <div key={poste.id} className="flex items-center gap-2">
              <button
                onClick={() => onSelectPoste(poste.numero)}
                className={`flex flex-col gap-1.5 rounded-xl border p-2.5 w-[150px] shrink-0 text-left transition-all ${
                  isActive ? "border-2 shadow-sm" : "border-gray-100 hover:border-gray-200"
                }`}
                style={isActive ? { borderColor: poste.couleur } : {}}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                    style={{ backgroundColor: poste.couleur }}
                  >
                    {poste.numero}
                  </span>
                  {st?.valide ? (
                    <FaCheckCircle className="text-green-500 text-xs" />
                  ) : (
                    <FaCircle className="text-gray-200 text-[8px]" />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-gray-700 truncate">{poste.titre}</span>
                <div className="flex gap-0.5">
                  {etapes.map((e) => {
                    const done = etapeProgressById[e.id]?.valide;
                    return (
                      <span
                        key={e.id}
                        className={`h-1.5 flex-1 rounded-full ${done ? "" : "bg-gray-150"}`}
                        style={done ? { backgroundColor: poste.couleur } : { backgroundColor: "#E5E7EB" }}
                        title={`Étape ${e.numero}`}
                      />
                    );
                  })}
                </div>
                {st?.assigned_user && (
                  <span className="text-[9px] text-gray-400 truncate flex items-center gap-1">
                    <FaUserTag className="text-[8px]" /> {st.assigned_user}
                  </span>
                )}
              </button>
              {idx < orderedPostes.length - 1 && <div className="w-3 h-0.5 bg-gray-200 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
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
      {statePoste?.assigned_user && (
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <FaUserTag className="text-[9px]" /> {statePoste.assigned_user}
        </span>
      )}
    </button>
  );
}

function StepList({ etapes, etapeProgressById, canValidate, onToggleEtape }) {
  return (
    <div className="flex flex-col gap-2">
      {etapes.map((e) => {
        const done = etapeProgressById[e.id]?.valide;
        return (
          <div key={e.id} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
            {canValidate ? (
              <button
                onClick={() => onToggleEtape(e.id, !done)}
                className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                  done ? "bg-green-500 border-green-500 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-green-300"
                }`}
              >
                {done ? <FaCheckCircle className="text-[11px]" /> : e.numero}
              </button>
            ) : (
              <span
                className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${
                  done ? "bg-green-100 border-green-300 text-green-600" : "bg-white border-gray-200 text-gray-500"
                }`}
              >
                {done ? <FaCheckCircle className="text-[11px]" /> : e.numero}
              </span>
            )}
            <p className={`text-sm leading-relaxed ${done ? "text-gray-400 line-through" : "text-gray-700"}`}>{e.description}</p>
          </div>
        );
      })}
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

function StartFabricationModal({ orderedPostes, users, onClose, onStart, starting }) {
  const [assignments, setAssignments] = useState({});
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-auto p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-gray-700">Lancer une fabrication</h3>
        <p className="text-xs text-gray-400">Affectez un utilisateur à chaque poste (optionnel — vous pouvez tout valider vous-même).</p>
        <div className="flex flex-col gap-3">
          {orderedPostes.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: p.couleur }}
              >
                {p.numero}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{p.titre}</p>
              </div>
              <select
                value={assignments[p.id] || ""}
                onChange={(e) => setAssignments((prev) => ({ ...prev, [p.id]: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none w-40"
              >
                <option value="">— Non affecté —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.nom}>
                    {u.nom}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-xs text-gray-500 font-semibold px-3 py-2 hover:text-gray-700">
            Annuler
          </button>
          <button
            onClick={() => onStart(assignments)}
            disabled={starting}
            className="flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <FaPlay className="text-xs" /> {starting ? "Lancement..." : "Lancer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowPage({ session }) {
  const [reference, setReference] = useState([]);
  const [users, setUsers] = useState([]);
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [progress, setProgress] = useState([]);
  const [etapeProgress, setEtapeProgress] = useState([]);
  const [selectedPosteNumero, setSelectedPosteNumero] = useState(1);
  const [showStartModal, setShowStartModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = session.role === "admin";

  useEffect(() => {
    apiGet("/api/workflow/reference").then(setReference).catch(() => {});
    apiGet("/api/workflow/runs").then(setRuns).catch(() => {});
    if (isAdmin) apiGet("/api/users").then(setUsers).catch(() => {});
  }, []);

  function loadRun(id) {
    apiGet(`/api/workflow/runs/${id}`).then((data) => {
      setActiveRun(data.run);
      setProgress(data.progress);
      setEtapeProgress(data.etapeProgress || []);
      const firstUnvalidated = reference.find((p) => {
        const st = data.progress.find((pr) => pr.poste_id === p.id);
        return !st?.valide;
      });
      setSelectedPosteNumero(firstUnvalidated ? firstUnvalidated.numero : 1);
    });
  }

  useEffect(() => {
    if (runs.length > 0 && !activeRun) {
      const ongoing = runs.find((r) => r.statut === "en_cours") || runs[0];
      if (ongoing) loadRun(ongoing.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs, reference]);

  function startFabrication(assignments) {
    setStarting(true);
    setError("");
    apiPost("/api/workflow/runs", { assignments })
      .then((res) => {
        apiGet("/api/workflow/runs").then(setRuns);
        setShowStartModal(false);
        loadRun(res.id);
      })
      .catch((e) => setError(e.message || "Erreur lors du lancement."))
      .finally(() => setStarting(false));
  }

  const progressByPosteId = useMemo(() => {
    const map = {};
    progress.forEach((p) => (map[p.poste_id] = p));
    return map;
  }, [progress]);

  const etapeProgressById = useMemo(() => {
    const map = {};
    etapeProgress.forEach((e) => (map[e.etape_id] = e));
    return map;
  }, [etapeProgress]);

  const etapesByPosteId = useMemo(() => {
    const map = {};
    reference.forEach((p) => (map[p.id] = p.etapes));
    return map;
  }, [reference]);

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

  function canActOnPoste(poste) {
    if (!poste) return false;
    if (isAdmin) return true;
    const st = progressByPosteId[poste.id];
    return !!(st && st.assigned_user && st.assigned_user === session.nom);
  }

  function refreshFromResponse(data) {
    setActiveRun(data.run);
    setProgress(data.progress);
    setEtapeProgress(data.etapeProgress || []);
  }

  function validateSelectedPoste(controleQualiteOk) {
    if (!activeRun || !selectedPoste) return;
    setError("");
    apiPost(`/api/workflow/runs/${activeRun.id}/validate`, { posteId: selectedPoste.id, controleQualiteOk })
      .then((data) => {
        refreshFromResponse(data);
        const nextIdx = orderedPostes.findIndex((p) => p.id === selectedPoste.id) + 1;
        if (nextIdx < orderedPostes.length) setSelectedPosteNumero(orderedPostes[nextIdx].numero);
        apiGet("/api/workflow/runs").then(setRuns);
      })
      .catch((e) => setError(e.message || "Action non autorisée."));
  }

  function resetSelectedPoste() {
    if (!activeRun || !selectedPoste) return;
    if (!window.confirm("Réinitialiser la validation de cette étape ?")) return;
    setError("");
    apiPost(`/api/workflow/runs/${activeRun.id}/reset`, { posteId: selectedPoste.id })
      .then(refreshFromResponse)
      .catch((e) => setError(e.message || "Action non autorisée."));
  }

  function toggleEtape(etapeId, valide) {
    if (!activeRun) return;
    setError("");
    apiPost(`/api/workflow/runs/${activeRun.id}/validateEtape`, { etapeId, valide })
      .then(refreshFromResponse)
      .catch((e) => setError(e.message || "Action non autorisée."));
  }

  const completedCount = progress.filter((p) => p.valide).length;
  const totalCount = orderedPostes.length;
  const canValidateSelected = canActOnPoste(selectedPoste);

  return (
    <>
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
            {isAdmin && (
              <button
                onClick={() => setShowStartModal(true)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-200"
              >
                <FaPlay className="text-[10px]" /> Nouvelle fabrication
              </button>
            )}
          </div>
        ) : isAdmin ? (
          <button
            onClick={() => setShowStartModal(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 active:scale-95"
          >
            <FaPlay className="text-xs" /> Lancer une fabrication
          </button>
        ) : (
          <span className="flex items-center gap-2 text-xs text-gray-400">
            <FaEye /> Aucune fabrication en cours
          </span>
        )}
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg px-3 py-2">{error}</div>
        )}

        {activeRun && orderedPostes.length > 0 && (
          <div className="px-4 pt-3">
            <OverviewDiagram
              orderedPostes={orderedPostes}
              progressByPosteId={progressByPosteId}
              etapesByPosteId={etapesByPosteId}
              etapeProgressById={etapeProgressById}
              activePosteId={selectedPoste?.id}
              onSelectPoste={setSelectedPosteNumero}
            />
          </div>
        )}

        <div className="flex-1 min-h-0 flex overflow-hidden mt-3">
          <div className="w-[280px] shrink-0 border-r border-gray-100 bg-white p-4 overflow-auto flex flex-col gap-3">
            {!activeRun && (
              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400">
                Aucune fabrication active pour le moment.
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

                {selectedProgress?.assigned_user && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 w-fit">
                    <FaUserTag /> Poste affecté à <span className="font-semibold text-gray-700">{selectedProgress.assigned_user}</span>
                  </div>
                )}
                {activeRun && !canValidateSelected && !isPosteLocked(selectedPoste) && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
                    <FaEye /> Vous consultez ce poste en lecture seule.
                  </div>
                )}

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
                  <StepList
                    etapes={selectedPoste.etapes}
                    etapeProgressById={etapeProgressById}
                    canValidate={!!activeRun && canValidateSelected && !isPosteLocked(selectedPoste)}
                    onToggleEtape={toggleEtape}
                  />
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
                        {canValidateSelected && (
                          <button
                            onClick={resetSelectedPoste}
                            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50"
                          >
                            <FaUndo className="text-[10px]" /> Réinitialiser
                          </button>
                        )}
                      </>
                    ) : isPosteLocked(selectedPoste) ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <FaLock /> Validez les étapes précédentes pour débloquer ce poste.
                      </div>
                    ) : !canValidateSelected ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <FaEye /> Cochez les sous-étapes ci-dessus pour suivre l&apos;avancement (poste non affecté à votre compte).
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
        </div>
      </main>

      {showStartModal && (
        <StartFabricationModal
          orderedPostes={orderedPostes}
          users={users}
          onClose={() => setShowStartModal(false)}
          onStart={startFabrication}
          starting={starting}
        />
      )}
    </>
  );
}

export async function getServerSideProps({ req, res }) {
  const authUser = verifyAuth(req, res);
  if (!authUser) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  let role = authUser.role;
  let nom = authUser.nom;
  if (role !== "admin") {
    try {
      const rows = await query("SELECT nom, role FROM users WHERE email = ?", [authUser.email]);
      if (rows.length) {
        role = rows[0].role;
        nom = rows[0].nom;
      }
    } catch (err) {
      // fall back to token values
    }
  }

  return { props: { session: { nom, role } } };
}