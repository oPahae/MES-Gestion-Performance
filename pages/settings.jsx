import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaCogs,
  FaPlane,
  FaChartBar,
  FaCog,
  FaUsers,
  FaSignOutAlt,
  FaListUl,
  FaUserShield,
  FaIndustry,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaFileExcel,
  FaUpload,
  FaExclamationTriangle,
} from "react-icons/fa";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/apiClient";
import { verifyAuth } from "../middlewares/auth";

const TABS = [
  { key: "sheets", label: "Feuilles & Postes", icon: FaIndustry, color: "#1E88E5" },
  { key: "listes", label: "Listes déroulantes", icon: FaListUl, color: "#8E24AA" },
  { key: "users", label: "Utilisateurs", icon: FaUsers, color: "#43A047" },
  { key: "import", label: "Import / Export", icon: FaFileExcel, color: "#FB8C00" },
  { key: "compte", label: "Mon compte", icon: FaUserShield, color: "#E53935" },
];

const CATEGORIES = [
  { key: "risque", label: "Risques (KPI Sécurité)" },
  { key: "defaut", label: "Types de défaut (KPI Qualité)" },
  { key: "absence", label: "Causes d'absence (KPI Personnel)" },
];

function SectionCard({ title, children, right, accent = "#3B82F6", className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-5 flex flex-col animate-fadein ${className}`}
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold tracking-wide text-gray-700">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-semibold">{label}</label>
      {children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 hover:border-gray-300 ${props.className || ""}`}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 hover:border-gray-300 cursor-pointer ${props.className || ""}`}
    />
  );
}

function PrimaryButton({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={`flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:hover:shadow-sm disabled:active:scale-100 ${className || ""}`}
    >
      {children}
    </button>
  );
}

function IconButton({ children, danger, ...props }) {
  return (
    <button
      {...props}
      className={`p-2 rounded-lg transition-all duration-150 active:scale-90 ${
        danger ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
      }`}
    >
      {children}
    </button>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shrink-0 shadow-sm animate-toastin ${
        isError ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"
      }`}
    >
      {isError ? <FaExclamationCircle /> : <FaCheckCircle />}
      {toast.message}
    </div>
  );
}

export default function SettingsPage() {
  const [allSheets, setAllSheets] = useState([]);
  const [activeTab, setActiveTab] = useState("sheets");
  const [toast, setToast] = useState(null);

  function notify(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function refreshSheets() {
    apiGet("/api/sheets").then(setAllSheets).catch(() => {});
  }
  useEffect(refreshSheets, []);

  const activeTabInfo = TABS.find((t) => t.key === activeTab);

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-[#EEF1F6] text-xs">
      <style jsx global>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastin {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadein { animation: fadein 0.25s ease-out; }
        .animate-toastin { animation: toastin 0.25s ease-out; }
      `}</style>

<aside className="w-[210px] shrink-0 bg-[#0B1526] text-white flex flex-col justify-between">
        <div>
          <Link href="/" className="flex flex-col items-center gap-2 px-5 py-5 border-b border-white/10">
            <img src="/banner.png" className="w-full" />
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
            <h1 className="font-bold text-lg text-gray-800 tracking-tight">PARAMÈTRES DE L&apos;APPLICATION</h1>
            <Toast toast={toast} />
          </div>
          <nav className="flex items-center gap-2 px-6 pb-3 -mt-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={
                    isActive
                      ? { backgroundColor: t.color, color: "white", boxShadow: `0 4px 10px ${t.color}55` }
                      : { backgroundColor: "#F3F4F6", color: "#4B5563" }
                  }
                >
                  <Icon className="text-sm" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 min-h-0 p-4 overflow-auto">
          <div key={activeTab} className="animate-fadein">
            {activeTab === "listes" && <ListesTab allSheets={allSheets} notify={notify} accent={activeTabInfo.color} />}
            {activeTab === "sheets" && <SheetsTab allSheets={allSheets} refreshSheets={refreshSheets} notify={notify} accent={activeTabInfo.color} />}
            {activeTab === "users" && <UsersTab notify={notify} accent={activeTabInfo.color} />}
            {activeTab === "import" && <ImportExportTab allSheets={allSheets} notify={notify} accent={activeTabInfo.color} />}
            {activeTab === "compte" && <CompteTab notify={notify} accent={activeTabInfo.color} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function ListesTab({ allSheets, notify, accent }) {
  const [sheetId, setSheetId] = useState("");
  const [categorie, setCategorie] = useState("risque");
  const [entries, setEntries] = useState([]);
  const [postes, setPostes] = useState([]);
  const [newLibelle, setNewLibelle] = useState("");
  const [newPosteId, setNewPosteId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!sheetId && allSheets.length > 0) setSheetId(String(allSheets[0].id));
  }, [allSheets, sheetId]);

  function refreshEntries() {
    if (!sheetId) return;
    apiGet(`/api/dictionary?sheetId=${sheetId}&categorie=${categorie}`).then(setEntries).catch(() => {});
  }
  useEffect(refreshEntries, [sheetId, categorie]);

  useEffect(() => {
    if (!sheetId) return;
    apiGet(`/api/postes?sheetId=${sheetId}`).then(setPostes).catch(() => {});
  }, [sheetId]);

  function addEntry() {
    if (!newLibelle.trim()) return;
    apiPost("/api/dictionary", {
      sheetId,
      categorie,
      libelle: newLibelle.trim(),
      posteId: categorie === "defaut" ? newPosteId || null : null,
    })
      .then((row) => {
        setEntries((prev) => [...prev, row]);
        setNewLibelle("");
        setNewPosteId("");
        notify("Élément ajouté à la liste.");
      })
      .catch(() => notify("Erreur lors de l'ajout.", "error"));
  }

  function startEdit(row) {
    setEditingId(row.id);
    setDraft({ libelle: row.libelle, posteId: row.poste_id || "" });
  }

  function saveEdit(id) {
    apiPut(`/api/dictionary/${id}`, { libelle: draft.libelle, posteId: draft.posteId || null })
      .then((row) => {
        setEntries((prev) => prev.map((e) => (e.id === id ? row : e)));
        setEditingId(null);
        setDraft(null);
        notify("Élément modifié.");
      })
      .catch(() => notify("Erreur lors de la modification.", "error"));
  }

  function removeEntry(id) {
    if (!window.confirm("Supprimer cet élément de la liste déroulante ?")) return;
    apiDelete(`/api/dictionary/${id}`)
      .then(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        notify("Élément supprimé.");
      })
      .catch(() => notify("Erreur lors de la suppression.", "error"));
  }

  return (
    <SectionCard accent={accent} title="Listes déroulantes — Risques, types de défaut, causes d'absence">
      <div className="flex items-center gap-4 mb-4">
        <Field label="Feuille">
          <Select value={sheetId} onChange={(e) => setSheetId(e.target.value)}>
            {allSheets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catégorie">
          <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex items-end gap-3 mb-4 border border-gray-100 rounded-xl p-3 bg-gradient-to-br from-gray-50 to-white">
        <Field label="Nouvel élément">
          <TextInput value={newLibelle} onChange={(e) => setNewLibelle(e.target.value)} placeholder="Libellé..." />
        </Field>
        {categorie === "defaut" && (
          <Field label="Poste concerné">
            <Select value={newPosteId} onChange={(e) => setNewPosteId(e.target.value)}>
              <option value="">— Aucun —</option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <PrimaryButton onClick={addEntry}>
          <FaPlus className="text-xs" /> Ajouter
        </PrimaryButton>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left border-b border-gray-100">
            <th className="py-2 font-semibold">Libellé</th>
            {categorie === "defaut" && <th className="py-2 font-semibold">Poste</th>}
            <th className="py-2 font-semibold w-20"></th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center text-gray-300 py-6 text-xs">
                Aucun élément dans cette liste.
              </td>
            </tr>
          )}
          {entries.map((row) => {
            const isEditing = editingId === row.id;
            return (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors duration-150">
                {isEditing ? (
                  <>
                    <td className="py-2 pr-2">
                      <TextInput value={draft.libelle} onChange={(e) => setDraft({ ...draft, libelle: e.target.value })} />
                    </td>
                    {categorie === "defaut" && (
                      <td className="py-2 pr-2">
                        <Select value={draft.posteId} onChange={(e) => setDraft({ ...draft, posteId: e.target.value })}>
                          <option value="">— Aucun —</option>
                          {postes.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nom}
                            </option>
                          ))}
                        </Select>
                      </td>
                    )}
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <IconButton onClick={() => saveEdit(row.id)}>
                          <FaSave />
                        </IconButton>
                        <IconButton
                          onClick={() => {
                            setEditingId(null);
                            setDraft(null);
                          }}
                        >
                          <FaTimes />
                        </IconButton>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 text-gray-700">{row.libelle}</td>
                    {categorie === "defaut" && <td className="py-3 text-gray-500">{row.poste_nom || "—"}</td>}
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <IconButton onClick={() => startEdit(row)}>
                          <FaEdit />
                        </IconButton>
                        <IconButton danger onClick={() => removeEntry(row.id)}>
                          <FaTrash />
                        </IconButton>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}

function SheetsTab({ allSheets, refreshSheets, notify, accent }) {
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("ligne");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  const [posteSheetId, setPosteSheetId] = useState("");
  const [postes, setPostes] = useState([]);
  const [newPoste, setNewPoste] = useState("");
  const [editingPosteId, setEditingPosteId] = useState(null);
  const [posteDraft, setPosteDraft] = useState("");

  useEffect(() => {
    if (!posteSheetId && allSheets.length > 0) setPosteSheetId(String(allSheets[0].id));
  }, [allSheets, posteSheetId]);

  function refreshPostes() {
    if (!posteSheetId) return;
    apiGet(`/api/postes?sheetId=${posteSheetId}`).then(setPostes).catch(() => {});
  }
  useEffect(refreshPostes, [posteSheetId]);

  function addSheet() {
    if (!newCode.trim() || !newLabel.trim()) return;
    apiPost("/api/sheets", { code: newCode.trim(), label: newLabel.trim(), type: newType })
      .then(() => {
        setNewCode("");
        setNewLabel("");
        setNewType("ligne");
        refreshSheets();
        notify("Feuille créée.");
      })
      .catch((e) => notify(e.message || "Erreur lors de la création.", "error"));
  }

  function startEditSheet(s) {
    setEditingId(s.id);
    setDraft({ code: s.code, label: s.label, type: s.type });
  }

  function saveSheet(id) {
    apiPut(`/api/sheets/${id}`, draft)
      .then(() => {
        setEditingId(null);
        setDraft(null);
        refreshSheets();
        notify("Feuille mise à jour.");
      })
      .catch((e) => notify(e.message || "Erreur lors de la mise à jour.", "error"));
  }

  function removeSheet(id) {
    if (!window.confirm("Supprimer cette feuille ? Toutes ses données (KPI, causes, actions, postes...) seront définitivement supprimées.")) return;
    apiDelete(`/api/sheets/${id}`)
      .then(() => {
        refreshSheets();
        notify("Feuille supprimée.");
      })
      .catch(() => notify("Erreur lors de la suppression.", "error"));
  }

  function addPoste() {
    if (!newPoste.trim() || !posteSheetId) return;
    apiPost("/api/postes", { sheetId: posteSheetId, nom: newPoste.trim() })
      .then((row) => {
        setPostes((prev) => [...prev, row]);
        setNewPoste("");
        notify("Poste ajouté.");
      })
      .catch(() => notify("Erreur lors de l'ajout du poste.", "error"));
  }

  function startEditPoste(p) {
    setEditingPosteId(p.id);
    setPosteDraft(p.nom);
  }

  function savePoste(id) {
    apiPut(`/api/postes/${id}`, { nom: posteDraft })
      .then((row) => {
        setPostes((prev) => prev.map((p) => (p.id === id ? row : p)));
        setEditingPosteId(null);
        setPosteDraft("");
        notify("Poste mis à jour.");
      })
      .catch(() => notify("Erreur lors de la mise à jour du poste.", "error"));
  }

  function removePoste(id) {
    if (!window.confirm("Supprimer ce poste ?")) return;
    apiDelete(`/api/postes/${id}`)
      .then(() => {
        setPostes((prev) => prev.filter((p) => p.id !== id));
        notify("Poste supprimé.");
      })
      .catch(() => notify("Erreur lors de la suppression du poste.", "error"));
  }

  return (
    <div className="flex gap-4">
      <SectionCard accent={accent} className="w-2/3" title="Feuilles (lignes / machines)">
        <div className="flex flex-wrap items-end gap-3 mb-4 border border-gray-100 rounded-xl p-3 bg-gradient-to-br from-gray-50 to-white">
          <Field label="Code (URL)">
            <TextInput value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="ligneAvion3" />
          </Field>
          <Field label="Nom affiché">
            <TextInput value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ligne Avion 3" />
          </Field>
          <Field label="Type">
            <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="ligne">Ligne</option>
              <option value="machine">Machine</option>
            </Select>
          </Field>
          <PrimaryButton onClick={addSheet}>
            <FaPlus className="text-xs" /> Créer
          </PrimaryButton>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-100">
              <th className="py-2 font-semibold">Code</th>
              <th className="py-2 font-semibold">Nom</th>
              <th className="py-2 font-semibold">Type</th>
              <th className="py-2 font-semibold w-20"></th>
            </tr>
          </thead>
          <tbody>
            {allSheets.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors duration-150">
                  {isEditing ? (
                    <>
                      <td className="py-2 pr-2">
                        <TextInput value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
                      </td>
                      <td className="py-2 pr-2">
                        <TextInput value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
                      </td>
                      <td className="py-2 pr-2">
                        <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                          <option value="ligne">Ligne</option>
                          <option value="machine">Machine</option>
                        </Select>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <IconButton onClick={() => saveSheet(s.id)}>
                            <FaSave />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              setEditingId(null);
                              setDraft(null);
                            }}
                          >
                            <FaTimes />
                          </IconButton>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 text-gray-500">{s.code}</td>
                      <td className="py-3 text-gray-700">{s.label}</td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            s.type === "machine" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {s.type === "machine" ? "Machine" : "Ligne"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <IconButton onClick={() => startEditSheet(s)}>
                            <FaEdit />
                          </IconButton>
                          <IconButton danger onClick={() => removeSheet(s.id)}>
                            <FaTrash />
                          </IconButton>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard
        accent={accent}
        className="w-1/3"
        title="Postes"
        right={
          <Select value={posteSheetId} onChange={(e) => setPosteSheetId(e.target.value)} className="text-xs">
            {allSheets
              .filter((sheet) => sheet.type !== "machine")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
          </Select>
        }
      >
        <div className="flex items-end gap-3 mb-4 border border-gray-100 rounded-xl p-3 bg-gradient-to-br from-gray-50 to-white">
          <Field label="Nouveau poste">
            <TextInput value={newPoste} onChange={(e) => setNewPoste(e.target.value)} placeholder="Poste 4" />
          </Field>
          <PrimaryButton onClick={addPoste}>
            <FaPlus className="text-xs" /> Ajouter
          </PrimaryButton>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-100">
              <th className="py-2 font-semibold">Nom</th>
              <th className="py-2 font-semibold w-20"></th>
            </tr>
          </thead>
          <tbody>
            {postes.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center text-gray-300 py-6 text-xs">
                  Aucun poste pour cette feuille.
                </td>
              </tr>
            )}
            {postes.map((p) => {
              const isEditing = editingPosteId === p.id;
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors duration-150">
                  {isEditing ? (
                    <>
                      <td className="py-2 pr-2">
                        <TextInput value={posteDraft} onChange={(e) => setPosteDraft(e.target.value)} />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <IconButton onClick={() => savePoste(p.id)}>
                            <FaSave />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              setEditingPosteId(null);
                              setPosteDraft("");
                            }}
                          >
                            <FaTimes />
                          </IconButton>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 text-gray-700">{p.nom}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <IconButton onClick={() => startEditPoste(p)}>
                            <FaEdit />
                          </IconButton>
                          <IconButton danger onClick={() => removePoste(p.id)}>
                            <FaTrash />
                          </IconButton>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function UsersTab({ notify, accent }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ nom: "", email: "", password: "" });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  function refresh() {
    apiGet("/api/users").then(setUsers).catch(() => {});
  }
  useEffect(refresh, []);

  function addUser() {
    if (!form.nom.trim() || !form.email.trim() || !form.password) {
      notify("Nom, email et mot de passe sont requis.", "error");
      return;
    }
    apiPost("/api/users", form)
      .then((row) => {
        setUsers((prev) => [...prev, row]);
        setForm({ nom: "", email: "", password: "" });
        notify("Utilisateur créé.");
      })
      .catch((e) => notify(e.message || "Erreur lors de la création.", "error"));
  }

  function startEdit(u) {
    setEditingId(u.id);
    setDraft({ nom: u.nom, email: u.email, actif: !!u.actif, password: "" });
  }

  function saveEdit(id) {
    apiPut(`/api/users/${id}`, { ...draft, password: draft.password || undefined })
      .then((row) => {
        setUsers((prev) => prev.map((u) => (u.id === id ? row : u)));
        setEditingId(null);
        setDraft(null);
        notify("Utilisateur mis à jour.");
      })
      .catch((e) => notify(e.message || "Erreur lors de la mise à jour.", "error"));
  }

  function removeUser(id) {
    if (!window.confirm("Supprimer ce compte utilisateur ?")) return;
    apiDelete(`/api/users/${id}`)
      .then(() => {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        notify("Utilisateur supprimé.");
      })
      .catch((e) => notify(e.message || "Erreur lors de la suppression.", "error"));
  }

  return (
    <SectionCard accent={accent} title="Comptes utilisateurs">
      <p className="text-xs text-gray-400 mb-3">Un utilisateur peut accéder à n&apos;importe quelle feuille, sans restriction.</p>
      <div className="flex items-end gap-3 mb-4 border border-gray-100 rounded-xl p-3 bg-gradient-to-br from-gray-50 to-white flex-wrap">
        <Field label="Nom">
          <TextInput value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom complet" />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="exemple@gmail.com" />
        </Field>
        <Field label="Mot de passe">
          <TextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min. 6 caractères" />
        </Field>
        <PrimaryButton onClick={addUser}>
          <FaPlus className="text-xs" /> Créer
        </PrimaryButton>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left border-b border-gray-100">
            <th className="py-2 font-semibold">Nom</th>
            <th className="py-2 font-semibold">Email</th>
            <th className="py-2 font-semibold">Actif</th>
            <th className="py-2 font-semibold w-28"></th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-gray-300 py-6 text-xs">
                Aucun utilisateur.
              </td>
            </tr>
          )}
          {users.map((u) => {
            const isEditing = editingId === u.id;
            return (
              <tr key={u.id} className="border-b border-gray-50 align-top hover:bg-gray-50/70 transition-colors duration-150">
                {isEditing ? (
                  <>
                    <td className="py-2 pr-2">
                      <TextInput value={draft.nom} onChange={(e) => setDraft({ ...draft, nom: e.target.value })} />
                    </td>
                    <td className="py-2 pr-2">
                      <TextInput type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={draft.actif} onChange={(e) => setDraft({ ...draft, actif: e.target.checked })} className="accent-blue-600 w-4 h-4" />
                    </td>
                    <td className="py-2">
                      <div className="flex flex-col gap-2">
                        <TextInput
                          type="password"
                          placeholder="Nouveau mdp (optionnel)"
                          value={draft.password}
                          onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                          className="w-40"
                        />
                        <div className="flex items-center gap-2">
                          <IconButton onClick={() => saveEdit(u.id)}>
                            <FaSave />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              setEditingId(null);
                              setDraft(null);
                            }}
                          >
                            <FaTimes />
                          </IconButton>
                        </div>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 text-gray-700">{u.nom}</td>
                    <td className="py-3 text-gray-500">{u.email}</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.actif ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                        {u.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <IconButton onClick={() => startEdit(u)}>
                          <FaEdit />
                        </IconButton>
                        <IconButton danger onClick={() => removeUser(u.id)}>
                          <FaTrash />
                        </IconButton>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}

function ImportExportTab({ allSheets, notify, accent }) {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + "01";

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [selectedIds, setSelectedIds] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setSelectedIds(allSheets.map((s) => s.id));
  }, [allSheets]);

  function toggleSheet(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.length === allSheets.length ? [] : allSheets.map((s) => s.id)));
  }

  async function handleDownload() {
    if (!dateFrom || !dateTo) {
      notify("Veuillez renseigner une période complète.", "error");
      return;
    }
    if (dateFrom > dateTo) {
      notify("La date de début doit précéder la date de fin.", "error");
      return;
    }
    if (selectedIds.length === 0) {
      notify("Veuillez sélectionner au moins une feuille.", "error");
      return;
    }
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        sheetIds: selectedIds.join(","),
        dateFrom,
        dateTo,
      });
      const res = await fetch(`/api/exportExcel?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur lors de l'export.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes_performance_export_${dateFrom}_${dateTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify("Export généré avec succès.");
    } catch (err) {
      notify(err.message || "Erreur lors de l'export.", "error");
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      notify("Veuillez sélectionner un fichier Excel.", "error");
      return;
    }
    setUploading(true);
    setImportErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/importExcel", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setImportErrors(data.errors);
        }
        throw new Error(data.message || "Erreur lors de l'import.");
      }
      setFile(null);
      notify(
        `Import réussi : ${data.counts.kpi} KPI, ${data.counts.temps} temps, ${data.counts.causes} causes, ${data.counts.actions} actions.`
      );
    } catch (err) {
      notify(err.message || "Erreur lors de l'import.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    if (confirmText !== "RÉINITIALISER") {
      notify("Veuillez taper exactement RÉINITIALISER pour confirmer.", "error");
      return;
    }
    setResetting(true);
    try {
      await apiPost("/api/resetData", {});
      notify("Toutes les données de performance ont été réinitialisées.");
      setShowResetConfirm(false);
      setConfirmText("");
    } catch (err) {
      notify(err.message || "Erreur lors de la réinitialisation.", "error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard accent={accent} title="Export Excel">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <Field label="Du">
            <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>
          <Field label="Au">
            <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
          <PrimaryButton onClick={handleDownload} disabled={downloading}>
            <FaFileExcel className="text-xs" /> {downloading ? "Génération..." : "Télécharger Excel"}
          </PrimaryButton>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-semibold">Feuilles incluses</span>
            <button onClick={toggleAll} className="text-xs text-blue-600 font-semibold hover:underline transition-all">
              {selectedIds.length === allSheets.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {allSheets.map((s) => {
              const checked = selectedIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border transition-all duration-150 cursor-pointer ${
                    checked ? "border-orange-300 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleSheet(s.id)} className="accent-orange-500 w-4 h-4" />
                  {s.label}
                </label>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <SectionCard accent={accent} title="Import Excel">
        <p className="text-xs text-gray-400 mb-3">
          Le fichier doit respecter la structure exportée (feuilles KPI_Params, Causes_Temps, Causes_Selections, Actions).
        </p>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-600 file:font-semibold hover:file:bg-orange-100 file:transition-colors"
          />
          <PrimaryButton onClick={handleUpload} disabled={uploading}>
            <FaUpload className="text-xs" /> {uploading ? "Import en cours..." : "Importer le fichier"}
          </PrimaryButton>
        </div>
        {importErrors.length > 0 && (
          <div className="mt-4 border border-red-100 bg-red-50 rounded-xl p-3 max-h-48 overflow-auto animate-fadein">
            <p className="text-xs font-semibold text-red-600 mb-2">Erreurs détectées ({importErrors.length}) :</p>
            <ul className="list-disc list-inside text-xs text-red-500 flex flex-col gap-1">
              {importErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard accent="#E53935" title="Zone de danger">
        <p className="text-xs text-gray-400 mb-3">
          Cette action supprime définitivement toutes les données de performance (paramètres KPI, causes,
          temps, actions, tickets et notifications) pour toutes les feuilles. Les feuilles, postes, listes
          déroulantes et comptes utilisateurs sont conservés. Cette action est irréversible.
        </p>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-lg border border-red-200 transition-all duration-200 active:scale-95 w-fit"
          >
            <FaExclamationTriangle className="text-xs" /> Réinitialiser toutes les données
          </button>
        ) : (
          <div className="border border-red-200 bg-red-50/60 rounded-xl p-4 flex flex-col gap-3 max-w-md animate-fadein">
            <p className="text-xs text-red-600 font-semibold">
              Pour confirmer, tapez <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200">RÉINITIALISER</span> ci-dessous :
            </p>
            <TextInput
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RÉINITIALISER"
              className="border-red-200 focus:border-red-400 focus:ring-red-100"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={resetting || confirmText !== "RÉINITIALISER"}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                <FaExclamationTriangle className="text-xs" /> {resetting ? "Réinitialisation..." : "Confirmer la réinitialisation"}
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  setConfirmText("");
                }}
                className="text-xs text-gray-500 font-semibold px-3 py-2 hover:text-gray-700"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function CompteTab({ notify, accent }) {
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function refresh() {
    apiGet("/api/admin").then((row) => setCurrentEmail(row.email)).catch(() => {});
  }
  useEffect(refresh, []);

  function submit() {
    if (!currentPassword) {
      notify("Le mot de passe actuel est requis.", "error");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      notify("La confirmation du nouveau mot de passe ne correspond pas.", "error");
      return;
    }
    if (!newEmail.trim() && !newPassword) {
      notify("Renseignez un nouvel email et/ou un nouveau mot de passe.", "error");
      return;
    }
    apiPut("/api/admin", {
      currentPassword,
      newEmail: newEmail.trim() || undefined,
      newPassword: newPassword || undefined,
    })
      .then((row) => {
        setCurrentEmail(row.email);
        setCurrentPassword("");
        setNewEmail("");
        setNewPassword("");
        setConfirmPassword("");
        notify("Compte mis à jour.");
      })
      .catch((e) => notify(e.message || "Erreur lors de la mise à jour.", "error"));
  }

  return (
    <SectionCard accent={accent} title="Mon compte">
      <div className="flex flex-col gap-4 max-w-xs">
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          Email actuel : <span className="font-semibold text-gray-600">{currentEmail || "…"}</span>
        </p>

        <Field label="Mot de passe actuel (requis pour confirmer)">
          <TextInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </Field>
        <Field label="Nouvel email (optionnel)">
          <TextInput type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={currentEmail} />
        </Field>
        <Field label="Nouveau mot de passe (optionnel, min. 6 caractères)">
          <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </Field>
        {newPassword && (
          <Field label="Confirmer le nouveau mot de passe">
            <TextInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Field>
        )}
        <PrimaryButton onClick={submit} className="self-start">
          <FaSave className="text-xs" /> Enregistrer les modifications
        </PrimaryButton>
      </div>
    </SectionCard>
  );
}

export async function getServerSideProps({ req, res }) {
  const user = verifyAuth(req, res);
  if (!user || user.role !== "admin") {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
  return { props: {} };
}