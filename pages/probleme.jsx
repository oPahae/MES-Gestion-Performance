import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaCogs,
  FaPlane,
  FaChartBar,
  FaSignOutAlt,
  FaClipboardList,
  FaCheckCircle,
  FaCircle,
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaPaperclip,
  FaUserPlus,
  FaFileUpload,
  FaFilePdf,
  FaFileImage,
} from "react-icons/fa";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/apiClient";
import { D_STEPS, BLOCS, ACTION_STATUT_LABELS, computeCompletion, fmtLead } from "../lib/problemeLogic";
import { verifyAuth } from "../middlewares/auth";

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Field({ label, questions = [], children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-semibold">{label}</label>
      <ul className="text-xs text-gray-500 font-normal">
        {questions.length > 0 && questions.map((q, i) => <li key={i}>- {q}</li>)}
      </ul>
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
function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 hover:border-gray-300 resize-none ${props.className || ""}`}
    />
  );
}
function SelectInput(props) {
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
      className={`flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50 ${className || ""}`}
    >
      {children}
    </button>
  );
}
function IconButton({ children, danger, ...props }) {
  return (
    <button
      {...props}
      className={`p-2 rounded-lg transition-all duration-150 active:scale-90 ${danger ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
        }`}
    >
      {children}
    </button>
  );
}

function LigneSelect({ value, onChange, allSheets, className = "" }) {
  return (
    <SelectInput value={value || ""} onChange={onChange} className={className}>
      <option value="">— Sélectionner une ligne —</option>
      {allSheets.map((s) => (
        <option key={s.id} value={s.label}>
          {s.label}
        </option>
      ))}
    </SelectInput>
  );
}

function FileDropInput({ file, existing, hasExisting, onFile, accept = "image/*,.pdf" }) {
  const inputRef = useRef(null);
  const isPdf = file ? file.type === "application/pdf" : false;
  return (
    <div
      onClick={() => inputRef.current && inputRef.current.click()}
      className="flex items-center gap-2 border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-lg px-3 py-2 cursor-pointer transition-all duration-150"
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
      {file ? (
        <>
          {isPdf ? <FaFilePdf className="text-red-400" /> : <FaFileImage className="text-blue-400" />}
          <span className="text-xs text-gray-600 truncate max-w-[140px]">{file.name}</span>
        </>
      ) : hasExisting ? (
        <>
          <FaPaperclip className="text-green-500" />
          <span className="text-xs text-green-600 font-medium">Fichier existant — cliquer pour remplacer</span>
        </>
      ) : (
        <>
          <FaFileUpload className="text-gray-400" />
          <span className="text-xs text-gray-400">Cliquer pour joindre une image ou un PDF</span>
        </>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ActionFormFields({ draft, setDraft, showCauseColumn, showLigneColumn, causesOptions, allSheets, file, setFile, hasExistingFile }) {
  return (
    <div className="flex flex-col gap-3">
      {showCauseColumn && (
        <Field label="Cause racine associée">
          <SelectInput value={draft.cause_id} onChange={(e) => setDraft({ ...draft, cause_id: e.target.value })}>
            <option value="">Aucune (générale)</option>
            {(causesOptions || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.texte}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}
      {showLigneColumn && (
        <Field label="Ligne">
          <LigneSelect value={draft.ligne} onChange={(e) => setDraft({ ...draft, ligne: e.target.value })} allSheets={allSheets} />
        </Field>
      )}
      <Field label="Action">
        <TextInput value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} placeholder="Description de l'action..." />
      </Field>
      <Field label="Pilote">
        <TextInput value={draft.pilote} onChange={(e) => setDraft({ ...draft, pilote: e.target.value })} placeholder="Nom du pilote..." />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Date début">
          <TextInput type="date" value={draft.date_debut} onChange={(e) => setDraft({ ...draft, date_debut: e.target.value })} />
        </Field>
        <Field label="Date fin">
          <TextInput type="date" value={draft.date_fin} min={draft.date_debut} onChange={(e) => setDraft({ ...draft, date_fin: e.target.value })} />
        </Field>
        <Field label="Replanification">
          <TextInput type="date" value={draft.date_replanification} onChange={(e) => setDraft({ ...draft, date_replanification: e.target.value })} />
        </Field>
      </div>
      <Field label="Statut">
        <SelectInput value={draft.statut} onChange={(e) => setDraft({ ...draft, statut: e.target.value })}>
          <option value="a_faire">À faire</option>
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
        </SelectInput>
      </Field>
      <Field label="Pièce jointe (évidence de clôture)">
        <FileDropInput file={file} hasExisting={hasExistingFile} onFile={setFile} />
      </Field>
    </div>
  );
}

const EMPTY_DRAFT = { action: "", pilote: "", date_debut: new Date().toISOString().split("T")[0], date_fin: "", date_replanification: "", statut: "a_faire", ligne: "", cause_id: "" };

function ActionsTable({ problemeId, type, showCauseColumn, showLigneColumn, causesOptions, allSheets, onChanged }) {
  const [rows, setRows] = useState([]);
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [draftFile, setDraftFile] = useState(null);

  function refresh() {
    if (!problemeId) return;
    apiGet(`/api/problemes/${problemeId}/actions?type=${type}`)
      .then((r) => {
        setRows(r);
        if (onChanged) onChanged();
      })
      .catch(() => { });
  }
  useEffect(refresh, [problemeId, type]);

  function openAddModal() {
    setDraft(EMPTY_DRAFT);
    setDraftFile(null);
    setModalMode("add");
  }

  function openEditModal(row) {
    setEditingId(row.id);
    setDraft({
      action: row.action || "",
      pilote: row.pilote || "",
      date_debut: row.date_debut || "",
      date_fin: row.date_fin || "",
      date_replanification: row.date_replanification || "",
      statut: row.statut || "a_faire",
      ligne: row.ligne || "",
      cause_id: row.cause_id || "",
    });
    setDraftFile(null);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setDraftFile(null);
  }

  function submitAdd() {
    const fd = new FormData();
    fd.append("type", type);
    fd.append("action", draft.action);
    fd.append("pilote", draft.pilote);
    fd.append("date_debut", draft.date_debut);
    fd.append("date_fin", draft.date_fin);
    fd.append("date_replanification", draft.date_replanification);
    fd.append("statut", draft.statut);
    if (showLigneColumn) fd.append("ligne", draft.ligne);
    if (showCauseColumn) fd.append("cause_id", draft.cause_id || "");
    if (draftFile) fd.append("piece_jointe", draftFile);
    fetch(`/api/problemes/${problemeId}/actions`, { method: "POST", body: fd, credentials: "include" }).then(() => {
      refresh();
      closeModal();
    });
  }

  function submitEdit() {
    const fd = new FormData();
    fd.append("actionId", editingId);
    fd.append("action", draft.action);
    fd.append("pilote", draft.pilote);
    fd.append("date_debut", draft.date_debut);
    fd.append("date_fin", draft.date_fin);
    fd.append("date_replanification", draft.date_replanification);
    fd.append("statut", draft.statut);
    if (showLigneColumn) fd.append("ligne", draft.ligne);
    if (showCauseColumn) fd.append("cause_id", draft.cause_id || "");
    if (draftFile) fd.append("piece_jointe", draftFile);
    fetch(`/api/problemes/${problemeId}/actions`, { method: "PUT", body: fd, credentials: "include" }).then(() => {
      refresh();
      closeModal();
    });
  }

  function removeRow(rowId) {
    if (!window.confirm("Supprimer cette action ?")) return;
    apiDelete(`/api/problemes/${problemeId}/actions?actionId=${rowId}`).then(refresh);
  }

  function causeLabel(causeId) {
    if (!causeId) return "—";
    const c = (causesOptions || []).find((x) => x.id === causeId);
    return c ? c.texte : "—";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <PrimaryButton onClick={openAddModal}>
          <FaPlus className="text-xs" /> Ajouter une ligne
        </PrimaryButton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-gray-400 text-left border-b border-gray-100">
              {showCauseColumn && <th className="py-2 font-semibold">Cause racine</th>}
              {showLigneColumn && <th className="py-2 font-semibold">Ligne</th>}
              <th className="py-2 font-semibold">Action</th>
              <th className="py-2 font-semibold">Pilote</th>
              <th className="py-2 font-semibold">Début</th>
              <th className="py-2 font-semibold">Fin</th>
              <th className="py-2 font-semibold">Replanif.</th>
              <th className="py-2 font-semibold">Statut</th>
              <th className="py-2 font-semibold">Pièce jointe</th>
              <th className="py-2 font-semibold w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-gray-300 py-6 text-xs">
                  Aucune action enregistrée.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 align-top hover:bg-gray-50/70 transition-colors duration-150">
                {showCauseColumn && <td className="py-3 pr-2 text-gray-600">{causeLabel(row.cause_id)}</td>}
                {showLigneColumn && <td className="py-3 pr-2 text-gray-600">{row.ligne || "—"}</td>}
                <td className="py-3 pr-2 text-gray-700">{row.action || <span className="text-red-400">Vide</span>}</td>
                <td className="py-3 pr-2 text-gray-500">{row.pilote || <span className="text-red-400">Vide</span>}</td>
                <td className="py-3 pr-2 text-gray-500">{row.date_debut || "—"}</td>
                <td className="py-3 pr-2 text-gray-500">{row.date_fin || "—"}</td>
                <td className="py-3 pr-2 text-gray-500">{row.date_replanification || "—"}</td>
                <td className="py-3 pr-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.statut === "en_cours"
                        ? "bg-orange-100 text-orange-600"
                        : row.statut === "termine"
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-50 text-blue-500"
                      }`}
                  >
                    {ACTION_STATUT_LABELS[row.statut]}
                  </span>
                </td>
                <td className="py-3 pr-2">
                  {row.hasFile ? (
                    <a
                      href={`/api/attachment/${row.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-blue-600 text-xs font-semibold hover:underline"
                    >
                      <FaPaperclip className="text-[10px]" /> Voir
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <IconButton onClick={() => openEditModal(row)}>
                      <FaEdit />
                    </IconButton>
                    <IconButton danger onClick={() => removeRow(row.id)}>
                      <FaTrash />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <Modal title={modalMode === "add" ? "Ajouter une action" : "Modifier l'action"} onClose={closeModal}>
          <ActionFormFields
            draft={draft}
            setDraft={setDraft}
            showCauseColumn={showCauseColumn}
            showLigneColumn={showLigneColumn}
            causesOptions={causesOptions}
            allSheets={allSheets}
            file={draftFile}
            setFile={setDraftFile}
            hasExistingFile={modalMode === "edit" && !!rows.find((r) => r.id === editingId)?.hasFile}
          />
          <div className="flex items-center gap-2 justify-end mt-2">
            <button onClick={closeModal} className="text-xs text-gray-500 font-semibold px-3 py-2 hover:text-gray-700">
              Annuler
            </button>
            <PrimaryButton onClick={modalMode === "add" ? submitAdd : submitEdit}>
              <FaSave className="text-xs" /> Enregistrer
            </PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
}

function IshikawaDiagram({ probleme, causesByBloc, hasRacineDescendant, selectedCauseId, onSelectCause }) {
  const width = 900;
  const height = 380;
  const spineY = 190;
  const spineStartX = 60;
  const spineEndX = 680;

  const topBlocs = BLOCS.filter((b) => b.side === "top");
  const bottomBlocs = BLOCS.filter((b) => b.side === "bottom");

  function branchGeometry(index, total, side) {
    const spacing = (spineEndX - spineStartX - 60) / (total + 1);
    const attachX = spineStartX + 60 + spacing * (index + 1);
    const attachY = spineY;
    const labelX = attachX - 130;
    const labelY = side === "top" ? spineY - 140 : spineY + 140;
    return { attachX, attachY, labelX, labelY };
  }

  function renderBranch(bloc, index, total, side) {
    const { attachX, attachY, labelX, labelY } = branchGeometry(index, total, side);
    const causes = causesByBloc[bloc.key] || [];
    const maxShown = 5;
    const shown = causes.slice(0, maxShown);
    return (
      <g key={bloc.key}>
        <line x1={attachX} y1={attachY} x2={labelX} y2={labelY} stroke="#94A3B8" strokeWidth="2" />
        <text x={labelX} y={side === "top" ? labelY - 8 : labelY + 16} textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">
          {bloc.label}
        </text>
        {shown.map((c, i) => {
          const t = (i + 1) / (shown.length + 1);
          const px = attachX + (labelX - attachX) * t;
          const py = attachY + (labelY - attachY) * t;
          const isSelected = selectedCauseId === c.id;
          const hasRacine = hasRacineDescendant(c.id);
          return (
            <g key={c.id} className="cursor-pointer" onClick={() => onSelectCause(c.id)}>
              <circle
                cx={px}
                cy={py}
                r={isSelected ? 7 : 5}
                fill={hasRacine ? "#16A34A" : "#FFFFFF"}
                stroke={isSelected ? "#2563EB" : "#94A3B8"}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text
                x={px}
                y={side === "top" ? py - 10 : py + 18}
                textAnchor="middle"
                fontSize="10"
                fill={isSelected ? "#2563EB" : "#475569"}
                fontWeight={isSelected ? "700" : "400"}
              >
                {c.texte.length > 16 ? `${c.texte.slice(0, 16)}…` : c.texte}
              </text>
            </g>
          );
        })}
        {causes.length > maxShown && (
          <text x={labelX} y={side === "top" ? labelY - 24 : labelY + 32} textAnchor="middle" fontSize="9" fill="#94A3B8">
            +{causes.length - maxShown} autre(s)
          </text>
        )}
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 380 }}>
      <line x1={spineStartX} y1={spineY} x2={spineEndX} y2={spineY} stroke="#334155" strokeWidth="3" />
      <polygon
        points={`${spineEndX},${spineY - 35} ${spineEndX + 160},${spineY} ${spineEndX},${spineY + 35}`}
        fill="#EFF6FF"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <foreignObject x={spineEndX + 10} y={spineY - 25} width="150" height="50">
        <div className="-translate-x-8 w-full h-full flex items-center justify-center text-center text-[11px] font-bold text-blue-700 px-1 leading-tight">
          {probleme || "Problème non défini"}
        </div>
      </foreignObject>
      {topBlocs.map((b, i) => renderBranch(b, i, topBlocs.length, "top"))}
      {bottomBlocs.map((b, i) => renderBranch(b, i, bottomBlocs.length, "bottom"))}
    </svg>
  );
}

function TreeNodeCard({ node, onToggleRacine, onAddChild, onDelete, isRoot }) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const canAddChild = node.niveau < 3;

  function submitAdd() {
    if (!newText.trim()) return;
    onAddChild(node.id, node.niveau + 1, newText.trim());
    setNewText("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 border shadow-sm whitespace-nowrap ${isRoot ? "bg-blue-600 border-blue-600 text-white" : node.cause_racine ? "bg-red-50 border-red-300" : "bg-white border-gray-200"
          }`}
      >
        {!isRoot && (
          <input
            type="checkbox"
            checked={node.cause_racine}
            onChange={(e) => onToggleRacine(node.id, e.target.checked)}
            className="accent-red-600 w-4 h-4 shrink-0"
            title="Cause racine"
          />
        )}
        <span className={`text-xs font-semibold ${isRoot ? "text-white" : node.cause_racine ? "text-red-700" : "text-gray-700"}`}>
          {node.texte}
        </span>
        {isRoot && <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">Cause retenue</span>}
        <div className="flex items-center gap-0.5 shrink-0">
          {canAddChild && (
            <button
              onClick={() => setAdding((a) => !a)}
              className={`rounded-md p-1 ${isRoot ? "text-white hover:bg-white/20" : "text-blue-600 hover:bg-blue-50"}`}
            >
              <FaPlus className="text-[9px]" />
            </button>
          )}
          {!isRoot && (
            <button onClick={() => onDelete(node.id)} className="text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md p-1">
              <FaTrash className="text-[9px]" />
            </button>
          )}
        </div>
      </div>
      {adding && (
        <div className="flex items-center gap-1 mt-1">
          <TextInput
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Nom..."
            className="py-1 text-xs w-32"
            onKeyDown={(e) => e.key === "Enter" && submitAdd()}
          />
          <button onClick={submitAdd} className="text-blue-600 hover:bg-blue-50 rounded-md p-1.5">
            <FaSave className="text-[10px]" />
          </button>
        </div>
      )}
    </div>
  );
}

function VerticalTreeNode({ node, childrenByParent, onToggleRacine, onAddChild, onDelete, isRoot }) {
  const children = childrenByParent[node.id] || [];
  return (
    <li>
      <TreeNodeCard node={node} onToggleRacine={onToggleRacine} onAddChild={onAddChild} onDelete={onDelete} isRoot={isRoot} />
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <VerticalTreeNode
              key={child.id}
              node={child}
              childrenByParent={childrenByParent}
              onToggleRacine={onToggleRacine}
              onAddChild={onAddChild}
              onDelete={onDelete}
              isRoot={false}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function CauseTree(props) {
  return (
    <div className="w-full overflow-x-auto py-4">
      <style jsx global>{`
        .tree, .tree ul, .tree li {
          list-style: none;
          margin: 0;
          padding: 0;
          position: relative;
        }
        .tree {
          display: flex;
          justify-content: center;
        }
        .tree ul {
          display: flex;
          justify-content: center;
          padding-top: 24px;
          position: relative;
        }
        .tree ul::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          width: 0;
          height: 24px;
          border-left: 2px solid #cbd5e1;
        }
        .tree li {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 14px 0 14px;
          position: relative;
        }
        .tree li::before,
        .tree li::after {
          content: "";
          position: absolute;
          top: 0;
          right: 50%;
          width: 50%;
          height: 24px;
          border-top: 2px solid #cbd5e1;
        }
        .tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #cbd5e1;
        }
        .tree li:only-child {
          padding-top: 0;
        }
        .tree li:only-child::before,
        .tree li:only-child::after {
          display: none;
        }
        .tree li:first-child::before,
        .tree li:last-child::after {
          border: 0 none;
        }
        .tree li:last-child::before {
          border-right: 2px solid #cbd5e1;
          border-radius: 0 6px 0 0;
        }
        .tree li:first-child::after {
          border-radius: 6px 0 0 0;
        }
        .tree > li {
          padding-top: 0;
        }
        .tree > li::before,
        .tree > li::after,
        .tree > li > ul::before {
          display: none;
        }
      `}</style>
      <ul className="tree">
        <VerticalTreeNode {...props} isRoot={true} />
      </ul>
    </div>
  );
}

export default function ProblemePage() {
  const router = useRouter();
  const routerReady = router.isReady;
  const queryId = router.query.id;

  const [allSheets, setAllSheets] = useState([]);
  const [problemeId, setProblemeId] = useState(null);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const creatingRef = useRef(false);

  const [activeStep, setActiveStep] = useState("D0");
  const [selectedCauseId, setSelectedCauseId] = useState(null);

  const [metaDraft, setMetaDraft] = useState(null);
  const loadedMetaRef = useRef("{}");
  const metaSaveTimeout = useRef(null);
  const [savedMsg, setSavedMsg] = useState("");

  function flashSaved() {
    setSavedMsg("Enregistré automatiquement");
    setTimeout(() => setSavedMsg(""), 2000);
  }

  useEffect(() => {
    apiGet("/api/sheets").then(setAllSheets).catch(() => { });
  }, []);

  function loadRecord(recId) {
    apiGet(`/api/problemes/${recId}`)
      .then((data) => {
        setRecord(data);
        const meta = {
          probleme: data.probleme || "",
          ligne: data.ligne || "",
          pilote: data.pilote || "",
          quoi: data.quoi || "",
          qui: data.qui || "",
          ou: data.ou || "",
          quand_txt: data.quand_txt || "",
          combien: data.combien || "",
          comment_txt: data.comment_txt || "",
          pourquoi: data.pourquoi || "",
          autre_ligne_existe: !!data.autre_ligne_existe,
          validation_nom: data.validation_nom || "",
          validation_date: data.validation_date || "",
          validation_signature: !!data.validation_signature,
        };
        loadedMetaRef.current = JSON.stringify(meta);
        setMetaDraft(meta);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!routerReady) return;
    if (queryId) {
      setProblemeId(String(queryId));
      loadRecord(queryId);
      return;
    }
    if (creatingRef.current) return;
    creatingRef.current = true;
    apiPost("/api/problemes", {}).then((res) => {
      router.replace(`/probleme?id=${res.id}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerReady, queryId]);

  useEffect(() => {
    if (!metaDraft || !problemeId) return;
    if (JSON.stringify(metaDraft) === loadedMetaRef.current) return;
    if (metaSaveTimeout.current) clearTimeout(metaSaveTimeout.current);
    metaSaveTimeout.current = setTimeout(() => {
      apiPut(`/api/problemes/${problemeId}`, metaDraft).then((data) => {
        loadedMetaRef.current = JSON.stringify(metaDraft);
        setRecord((prev) => ({ ...prev, ...data }));
        flashSaved();
      });
    }, 600);
    return () => clearTimeout(metaSaveTimeout.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaDraft]);

  function setMeta(field, value) {
    setMetaDraft((prev) => ({ ...prev, [field]: value }));
  }

  function refreshRecord() {
    if (!problemeId) return;
    apiGet(`/api/problemes/${problemeId}`).then(setRecord).catch(() => { });
  }

  const [newMemberName, setNewMemberName] = useState("");
  function addMember() {
    if (!newMemberName.trim() || !problemeId) return;
    apiPost(`/api/problemes/${problemeId}/equipe`, { nom: newMemberName.trim() }).then(() => {
      setNewMemberName("");
      refreshRecord();
    });
  }
  function removeMember(memberId) {
    apiDelete(`/api/problemes/${problemeId}/equipe?memberId=${memberId}`).then(refreshRecord);
  }

  const causes = (record && record.causes) || [];
  const causesByBloc = useMemo(() => {
    const map = {};
    BLOCS.forEach((b) => (map[b.key] = []));
    causes
      .filter((c) => c.niveau === 0)
      .forEach((c) => {
        if (!map[c.bloc]) map[c.bloc] = [];
        map[c.bloc].push(c);
      });
    return map;
  }, [causes]);

  const childrenByParent = useMemo(() => {
    const map = {};
    causes.forEach((c) => {
      if (c.parent_id) {
        map[c.parent_id] = map[c.parent_id] || [];
        map[c.parent_id].push(c);
      }
    });
    return map;
  }, [causes]);

  const causesById = useMemo(() => {
    const map = {};
    causes.forEach((c) => (map[c.id] = c));
    return map;
  }, [causes]);

  function hasRacineDescendant(causeId) {
    const stack = [...(childrenByParent[causeId] || [])];
    while (stack.length) {
      const node = stack.pop();
      if (node.cause_racine) return true;
      const kids = childrenByParent[node.id] || [];
      stack.push(...kids);
    }
    return false;
  }

  const [newCauseTexts, setNewCauseTexts] = useState({});
  function addBlocCause(blocKey) {
    const txt = (newCauseTexts[blocKey] || "").trim();
    if (!txt || !problemeId) return;
    apiPost(`/api/problemes/${problemeId}/causes`, { bloc: blocKey, parent_id: null, niveau: 0, texte: txt }).then(() => {
      setNewCauseTexts((prev) => ({ ...prev, [blocKey]: "" }));
      refreshRecord();
    });
  }
  function deleteBlocCause(causeId) {
    if (!window.confirm("Supprimer cette cause et toutes ses sous-causes ?")) return;
    apiDelete(`/api/problemes/${problemeId}/causes?causeId=${causeId}`).then(() => {
      if (selectedCauseId === causeId) setSelectedCauseId(null);
      refreshRecord();
    });
  }
  function addChildCause(parentId, niveau, texte) {
    const parent = causesById[parentId];
    apiPost(`/api/problemes/${problemeId}/causes`, { bloc: parent ? parent.bloc : null, parent_id: parentId, niveau, texte }).then(refreshRecord);
  }
  function toggleCauseRacine(causeId, value) {
    apiPut(`/api/problemes/${problemeId}/causes`, { causeId, cause_racine: value }).then(refreshRecord);
  }
  function deleteChildCause(causeId) {
    apiDelete(`/api/problemes/${problemeId}/causes?causeId=${causeId}`).then(refreshRecord);
  }

  const completion = useMemo(() => {
    if (!record || !metaDraft) return {};
    return computeCompletion({
      probleme: metaDraft.probleme,
      ligne: metaDraft.ligne,
      pilote: metaDraft.pilote,
      equipe: record.equipe,
      quoi: metaDraft.quoi,
      qui: metaDraft.qui,
      ou: metaDraft.ou,
      quand_txt: metaDraft.quand_txt,
      combien: metaDraft.combien,
      comment_txt: metaDraft.comment_txt,
      pourquoi: metaDraft.pourquoi,
      causes: record.causes,
      actions: record.actions,
      autre_ligne_existe: metaDraft.autre_ligne_existe,
      validation_nom: metaDraft.validation_nom,
      validation_date: metaDraft.validation_date,
      validation_signature: metaDraft.validation_signature,
    });
  }, [record, metaDraft]);

  if (loading) {
    return <div className="min-h-screen w-screen flex items-center justify-center bg-[#EEF1F6] text-gray-400 text-sm">Chargement...</div>;
  }
  if (notFound) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#EEF1F6] gap-2">
        <p className="text-red-500 font-semibold text-sm">Problème introuvable.</p>
        <Link href="/rp" className="text-blue-600 text-sm font-semibold">
          Retour au tableau
        </Link>
      </div>
    );
  }
  if (!record || !metaDraft) {
    return <div className="min-h-screen w-screen flex items-center justify-center bg-[#EEF1F6] text-gray-400 text-sm">Chargement...</div>;
  }

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
        <header className="shrink-0 bg-white border-b border-gray-200 h-[64px] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg text-gray-800 tracking-tight">{record.numero}</h1>
            <span className="text-sm text-gray-400">{metaDraft.probleme || "Problème sans titre"}</span>
            <span className="text-xs text-gray-300">
              Ouvert le {fmtDateTime(record.date_ouverture)} — {fmtLead(record.date_ouverture)}
            </span>
          </div>
          {savedMsg && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg px-3 py-1.5 text-xs font-medium">
              <FaCheckCircle /> {savedMsg}
            </div>
          )}
        </header>

        <div className="flex-1 min-h-0 flex overflow-hidden">
          <nav className="w-[220px] shrink-0 bg-white border-r border-gray-100 p-4 overflow-auto">
            <div className="flex flex-col gap-1">
              {D_STEPS.map((step) => {
                const done = !!completion[step.key];
                const isActive = activeStep === step.key;
                return (
                  <button
                    key={step.key}
                    onClick={() => setActiveStep(step.key)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${isActive ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-600 hover:bg-gray-50 border border-transparent"
                      }`}
                  >
                    {done ? <FaCheckCircle className="text-green-500 shrink-0" /> : <FaCircle className="text-gray-300 shrink-0 text-[8px]" />}
                    <span className="flex-1">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="flex-1 min-h-0 overflow-auto p-6">
            {activeStep === "D0" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-2xl flex flex-col gap-4">
                <h2 className="text-base font-bold text-gray-700">D0 — Définir le problème</h2>
                <Field label="Problème">
                  <TextArea rows={3} value={metaDraft.probleme} onChange={(e) => setMeta("probleme", e.target.value)} placeholder="Décrire le problème..." />
                </Field>
                <Field label="Ligne">
                  <LigneSelect value={metaDraft.ligne} onChange={(e) => setMeta("ligne", e.target.value)} allSheets={allSheets} />
                </Field>
              </div>
            )}

            {activeStep === "D1" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-2xl flex flex-col gap-4">
                <h2 className="text-base font-bold text-gray-700">D1 — Former l&apos;équipe</h2>
                <Field label="Pilote">
                  <TextInput value={metaDraft.pilote} onChange={(e) => setMeta("pilote", e.target.value)} placeholder="Nom du pilote..." />
                </Field>
                <Field label="Membres de l'équipe">
                  <div className="flex items-center gap-2">
                    <TextInput
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Nom du membre..."
                      onKeyDown={(e) => e.key === "Enter" && addMember()}
                    />
                    <PrimaryButton onClick={addMember}>
                      <FaUserPlus className="text-xs" /> Ajouter
                    </PrimaryButton>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {record.equipe.length === 0 && <span className="text-xs text-gray-300">Aucun membre pour le moment.</span>}
                    {record.equipe.map((m) => (
                      <span key={m.id} className="flex items-center gap-2 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                        {m.nom}
                        <FaTimes className="text-gray-400 hover:text-red-600 cursor-pointer" onClick={() => removeMember(m.id)} />
                      </span>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {activeStep === "D2" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-3xl flex flex-col gap-4">
                <h2 className="text-base font-bold text-gray-700">D2 — QQOQCCP</h2>
                <Field label="QUOI ?" questions={[
                  "C'est quoi le problème ?"
                ]}>
                  <TextArea rows={3} value={metaDraft.quoi} onChange={(e) => setMeta("quoi", e.target.value)} />
                </Field>
                <Field label="QUI ?" questions={[
                  "Qui a détecté le problème ?",
                  "Qui a généré le problème ?",
                  "Qui a contrôlé le produit"
                ]}>
                  <TextArea rows={3} value={metaDraft.qui} onChange={(e) => setMeta("qui", e.target.value)} />
                </Field>
                <Field label="OÙ" questions={[
                  "Où on a détecté le problème ?",
                  "Où on a généré le problème (outils, machine, poste) ?",
                  "Quelle position sur le produit ?"
                ]}>
                  <TextArea rows={3} value={metaDraft.ou} onChange={(e) => setMeta("ou", e.target.value)} />
                </Field>
                <Field label="QUAND ?" questions={[
                  "Quand le problème est-t-il apparu ?",
                  "Quand on a détecté le problème ?",
                  "Quelle est la fréquence de l'apparution du problème ?"
                ]}>
                  <TextArea rows={3} value={metaDraft.quand_txt} onChange={(e) => setMeta("quand_txt", e.target.value)} />
                </Field>
                <Field label="COMBIEN ? — défauts / pertes ?" questions={[
                  "Combien de défauts ?",
                  "Combien de pertes ?"
                ]}>
                  <TextArea rows={3} value={metaDraft.combien} onChange={(e) => setMeta("combien", e.target.value)} />
                </Field>
                <Field label="COMMENT ?" questions={[
                  "Quelles sont les circonstances d'occurrence ?",
                  "Quelles sont les circonstances de détection ?"
                ]}>
                  <TextArea rows={3} value={metaDraft.comment_txt} onChange={(e) => setMeta("comment_txt", e.target.value)} />
                </Field>
                <Field label="POURQUOI ? — pourquoi c'est un problème / condition de résolution ?" questions={[
                  "Pourquoi c'est un problème ?",
                  "C'est quoi la condition pour dire qu'on n'a plus ce problème ?"
                ]}>
                  <TextArea rows={3} value={metaDraft.pourquoi} onChange={(e) => setMeta("pourquoi", e.target.value)} />
                </Field>
              </div>
            )}

            {activeStep === "D3" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-700 mb-3">D3 — Actions de sécurisation</h2>
                <ActionsTable
                  problemeId={problemeId}
                  type="d3"
                  showCauseColumn={false}
                  showLigneColumn={false}
                  causesOptions={[]}
                  allSheets={allSheets}
                  onChanged={refreshRecord}
                />
              </div>
            )}

            {activeStep === "D4" && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-base font-bold text-gray-700 mb-3">D4 — Identification des causes racines</h2>
                  <IshikawaDiagram
                    probleme={metaDraft.probleme}
                    causesByBloc={causesByBloc}
                    hasRacineDescendant={hasRacineDescendant}
                    selectedCauseId={selectedCauseId}
                    onSelectCause={setSelectedCauseId}
                  />
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {BLOCS.map((b) => (
                      <div key={b.key} className="border border-gray-100 rounded-xl p-3 flex flex-col gap-2">
                        <span className="text-xs font-bold text-gray-600">{b.label}</span>
                        <div className="flex flex-col gap-1 max-h-28 overflow-auto">
                          {(causesByBloc[b.key] || []).length === 0 && <span className="text-[11px] text-gray-300">Aucune cause</span>}
                          {(causesByBloc[b.key] || []).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedCauseId(c.id)}
                              className={`flex items-center justify-between gap-1 text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${selectedCauseId === c.id ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                              <span className="truncate">{c.texte}</span>
                              <FaTrash
                                className="text-gray-300 hover:text-red-500 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBlocCause(c.id);
                                }}
                              />
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <TextInput
                            value={newCauseTexts[b.key] || ""}
                            onChange={(e) => setNewCauseTexts((prev) => ({ ...prev, [b.key]: e.target.value }))}
                            placeholder="Nouvelle cause..."
                            className="text-[11px] py-1.5"
                            onKeyDown={(e) => e.key === "Enter" && addBlocCause(b.key)}
                          />
                          <button onClick={() => addBlocCause(b.key)} className="text-blue-600 hover:bg-blue-50 rounded-md p-1.5 shrink-0">
                            <FaPlus className="text-[10px]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedCauseId && causesById[selectedCauseId] && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-1">Arbre des causes — {causesById[selectedCauseId].texte}</h3>
                    <p className="text-[11px] text-gray-400 mb-2">Cochez une sous-cause pour la marquer comme cause racine.</p>
                    <CauseTree
                      node={causesById[selectedCauseId]}
                      childrenByParent={childrenByParent}
                      onToggleRacine={toggleCauseRacine}
                      onAddChild={addChildCause}
                      onDelete={deleteChildCause}
                    />
                  </div>
                )}
              </div>
            )}

            {activeStep === "D56" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-700 mb-3">D5/6 — Plan d&apos;actions</h2>
                <ActionsTable
                  problemeId={problemeId}
                  type="d56"
                  showCauseColumn={true}
                  showLigneColumn={false}
                  causesOptions={causes.filter((c) => c.cause_racine)}
                  allSheets={allSheets}
                  onChanged={refreshRecord}
                />
              </div>
            )}

            {activeStep === "D7" && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-base font-bold text-gray-700 mb-3">D7 — Transversalisation</h2>
                  <p className="text-xs text-gray-400 mb-3">Actions pour éviter ce problème à l&apos;avenir.</p>
                  <ActionsTable
                    problemeId={problemeId}
                    type="d7_transverse"
                    showCauseColumn={false}
                    showLigneColumn={false}
                    causesOptions={[]}
                    allSheets={allSheets}
                    onChanged={refreshRecord}
                  />
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-gray-700">Ce problème existe-t-il ailleurs ?</span>
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="radio"
                        checked={metaDraft.autre_ligne_existe === true}
                        onChange={() => setMeta("autre_ligne_existe", true)}
                        className="accent-blue-600"
                      />
                      Oui
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="radio"
                        checked={metaDraft.autre_ligne_existe === false}
                        onChange={() => setMeta("autre_ligne_existe", false)}
                        className="accent-blue-600"
                      />
                      Non
                    </label>
                  </div>
                  {metaDraft.autre_ligne_existe && (
                    <ActionsTable
                      problemeId={problemeId}
                      type="d7_autre_ligne"
                      showCauseColumn={false}
                      showLigneColumn={true}
                      causesOptions={[]}
                      allSheets={allSheets}
                      onChanged={refreshRecord}
                    />
                  )}
                </div>
              </div>
            )}

            {activeStep === "D8" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-lg flex flex-col gap-4">
                <h2 className="text-base font-bold text-gray-700">D8 — Validation</h2>
                <Field label="Nom du responsable">
                  <TextInput value={metaDraft.validation_nom} onChange={(e) => setMeta("validation_nom", e.target.value)} />
                </Field>
                <Field label="Date de validation">
                  <TextInput type="date" value={metaDraft.validation_date} onChange={(e) => setMeta("validation_date", e.target.value)} />
                </Field>
                {(() => {
                  const priorSteps = D_STEPS.filter((s) => s.key !== "D8");
                  const allPriorDone = priorSteps.every((s) => !!completion[s.key]);
                  return (
                    <>
                      <label className={`flex items-center gap-2 text-sm ${allPriorDone ? "text-gray-700" : "text-gray-300"}`}>
                        <input
                          type="checkbox"
                          checked={metaDraft.validation_signature}
                          disabled={!allPriorDone}
                          onChange={(e) => setMeta("validation_signature", e.target.checked)}
                          className="accent-green-600 w-4 h-4 disabled:cursor-not-allowed"
                        />
                        Signature électronique confirmée
                      </label>
                      {!allPriorDone && (
                        <p className="text-[11px] text-orange-500">
                          Toutes les étapes précédentes doivent être complétées avant la clôture.
                        </p>
                      )}
                    </>
                  );
                })()}
                {completion.D8 && (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg px-3 py-2 text-xs font-semibold">
                    <FaCheckCircle /> Problème clôturé
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
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