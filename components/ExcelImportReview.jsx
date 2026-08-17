import { useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaMagic, FaBan, FaUndo } from "react-icons/fa";
import { suggestFix } from "../lib/importAiSuggest";

const SHEET_LABELS = {
  KPI_Params: "Paramètres KPI",
  Causes_Temps: "Temps (Coût)",
  Causes_Selections: "Causes",
  Actions: "Actions",
};

const SHEET_COLUMNS = {
  KPI_Params: ["FeuilleCode", "KPI", "Date", "Accidents", "Risques", "RetoursClients", "Rebuts", "QuantiteTotale", "QuantiteProduite", "QuantiteObjectif", "QuantitePlanifiee", "Absents"],
  Causes_Temps: ["FeuilleCode", "Date", "Ouverture", "Planifie", "Arret", "Changement", "Rupture", "Autre", "Gammes"],
  Causes_Selections: ["FeuilleCode", "Date", "Categorie", "Valeur", "Quantite"],
  Actions: ["FeuilleCode", "Date", "KPI", "Probleme", "Action", "Pilote", "Statut"],
};

const ENUM_OPTIONS = {
  KPI: ["S", "Q", "C", "D", "P"],
  Categorie: ["place", "risque", "defaut", "absence"],
  Statut: ["a_faire", "en_cours", "termine"],
};

export default function ExcelImportReview({ initial, onClose, onImported }) {
  const [validCodes] = useState(initial.validCodes || []);
  const sheetKeys = useMemo(() => Object.keys(initial.sheets || {}), [initial]);
  const [activeSheet, setActiveSheet] = useState(sheetKeys[0]);
  const [rowsBySheet, setRowsBySheet] = useState(() => {
    const map = {};
    sheetKeys.forEach((k) => {
      map[k] = initial.sheets[k].map((r) => ({ ...r, ignored: false, data: { ...r.data } }));
    });
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const columns = SHEET_COLUMNS[activeSheet] || [];
  const rows = rowsBySheet[activeSheet] || [];

  function updateCell(sheetKey, rowIdx, field, value) {
    setRowsBySheet((prev) => {
      const copy = { ...prev };
      const rowsCopy = [...copy[sheetKey]];
      const row = { ...rowsCopy[rowIdx] };
      row.data = { ...row.data, [field]: value };
      const errs = { ...row.errors };
      delete errs[field];
      row.errors = errs;
      rowsCopy[rowIdx] = row;
      copy[sheetKey] = rowsCopy;
      return copy;
    });
  }

  function applyAiSuggestion(sheetKey, rowIdx, field) {
    const row = rowsBySheet[sheetKey][rowIdx];
    const suggestion = suggestFix(sheetKey, field, row.data, validCodes);
    if (suggestion !== null && suggestion !== undefined) {
      updateCell(sheetKey, rowIdx, field, suggestion);
    }
  }

  function toggleIgnore(sheetKey, rowIdx) {
    setRowsBySheet((prev) => {
      const copy = { ...prev };
      const rowsCopy = [...copy[sheetKey]];
      rowsCopy[rowIdx] = { ...rowsCopy[rowIdx], ignored: !rowsCopy[rowIdx].ignored };
      copy[sheetKey] = rowsCopy;
      return copy;
    });
  }

  const totalErrors = sheetKeys.reduce((sum, k) => sum + rowsBySheet[k].filter((r) => !r.ignored && Object.keys(r.errors).length > 0).length, 0);
  const totalRows = sheetKeys.reduce((sum, k) => sum + rowsBySheet[k].filter((r) => !r.ignored).length, 0);

  async function handleImport() {
    setSubmitting(true);
    setSubmitError("");
    const payload = { sheets: {} };
    sheetKeys.forEach((k) => {
      payload.sheets[k] = rowsBySheet[k].filter((r) => !r.ignored).map((r) => r.data);
    });
    try {
      const res = await fetch("/api/importExcel/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.sheets) {
          setRowsBySheet((prev) => {
            const merged = { ...prev };
            Object.entries(data.sheets).forEach(([k, errRows]) => {
              const byLine = new Map(errRows.map((r) => [r.line, r.errors]));
              merged[k] = merged[k].map((row) => {
                if (row.ignored) return row;
                const errs = byLine.get(row.line);
                return errs ? { ...row, errors: errs } : row;
              });
            });
            return merged;
          });
        }
        setSubmitError(data.message || "Certaines lignes contiennent encore des erreurs.");
        setSubmitting(false);
        return;
      }
      onImported(data);
    } catch (err) {
      setSubmitError(err.message || "Erreur lors de l'import.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-700">Vérification du fichier Excel</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalRows} ligne(s) à importer
              {totalErrors > 0 ? (
                <span className="text-red-500 font-semibold"> — {totalErrors} ligne(s) en erreur</span>
              ) : (
                <span className="text-green-600 font-semibold"> — toutes les lignes sont valides</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 font-semibold px-3 py-2 hover:text-gray-700">
            Fermer
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-3">
          {sheetKeys.map((k) => {
            const errCount = rowsBySheet[k].filter((r) => !r.ignored && Object.keys(r.errors).length > 0).length;
            return (
              <button
                key={k}
                onClick={() => setActiveSheet(k)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activeSheet === k ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {SHEET_LABELS[k] || k}
                {errCount > 0 && (
                  <span className={`text-[10px] font-bold rounded-full px-1.5 ${activeSheet === k ? "bg-white/20" : "bg-red-100 text-red-600"}`}>{errCount}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-5">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 bg-white text-left text-gray-400 font-semibold pb-2 pr-2">#</th>
                {columns.map((col) => (
                  <th key={col} className="sticky top-0 bg-white text-left text-gray-400 font-semibold pb-2 pr-2 whitespace-nowrap">
                    {col}
                  </th>
                ))}
                <th className="sticky top-0 bg-white text-left text-gray-400 font-semibold pb-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const hasErr = Object.keys(row.errors).length > 0;
                return (
                  <tr key={rowIdx} className={row.ignored ? "opacity-40" : ""}>
                    <td className="py-1 pr-2 text-gray-400">{row.line}</td>
                    {columns.map((col) => {
                      const cellError = row.errors[col];
                      const value = row.data[col] ?? "";
                      return (
                        <td key={col} className="py-1 pr-2 align-top">
                          <div className="relative">
                            {ENUM_OPTIONS[col] ? (
                              <select
                                disabled={row.ignored}
                                value={value}
                                onChange={(e) => updateCell(activeSheet, rowIdx, col, e.target.value)}
                                className={`border rounded-md px-1.5 py-1 text-xs outline-none ${cellError ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                              >
                                <option value="">—</option>
                                {ENUM_OPTIONS[col].map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                            ) : col === "FeuilleCode" ? (
                              <select
                                disabled={row.ignored}
                                value={value}
                                onChange={(e) => updateCell(activeSheet, rowIdx, col, e.target.value)}
                                className={`border rounded-md px-1.5 py-1 text-xs outline-none ${cellError ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                              >
                                <option value="">—</option>
                                {validCodes.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            ) : col === "Date" ? (
                              <input
                                type="date"
                                disabled={row.ignored}
                                value={value}
                                onChange={(e) => updateCell(activeSheet, rowIdx, col, e.target.value)}
                                className={`border rounded-md px-1.5 py-1 text-xs outline-none ${cellError ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                              />
                            ) : (
                              <input
                                disabled={row.ignored}
                                value={value}
                                onChange={(e) => updateCell(activeSheet, rowIdx, col, e.target.value)}
                                className={`border rounded-md px-1.5 py-1 text-xs outline-none w-24 ${cellError ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                              />
                            )}
                            {cellError && !row.ignored && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <span className="text-[10px] text-red-500 leading-tight">{cellError}</span>
                                <button
                                  title="Proposer une correction (IA)"
                                  onClick={() => applyAiSuggestion(activeSheet, rowIdx, col)}
                                  className="shrink-0 text-purple-500 hover:bg-purple-50 rounded p-0.5"
                                >
                                  <FaMagic className="text-[10px]" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-1">
                      {row.ignored ? (
                        <button
                          onClick={() => toggleIgnore(activeSheet, rowIdx)}
                          className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold hover:text-blue-600"
                        >
                          <FaUndo /> Rétablir
                        </button>
                      ) : hasErr ? (
                        <button
                          onClick={() => toggleIgnore(activeSheet, rowIdx)}
                          className="flex items-center gap-1 text-[10px] text-orange-500 font-semibold hover:text-orange-700"
                        >
                          <FaBan /> Ignorer
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                          <FaCheckCircle /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          {submitError ? (
            <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
              <FaExclamationTriangle /> {submitError}
            </p>
          ) : (
            <span />
          )}
          <button
            onClick={handleImport}
            disabled={submitting || totalErrors > 0 || totalRows === 0}
            className="flex items-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <FaCheckCircle className="text-xs" /> {submitting ? "Import en cours..." : `Importer ${totalRows} ligne(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}