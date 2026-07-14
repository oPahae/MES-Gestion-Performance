import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaPlane,
  FaCogs,
  FaChartBar,
  FaCog,
  FaUsers,
  FaSignOutAlt,
  FaBell,
  FaCalendarAlt,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaTimes,
  FaChevronDown,
  FaCheckCircle,
  FaSave,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { apiGet, apiPost, apiPut, apiDelete } from "../../lib/apiClient";
import { computeDays, addDaysIso, todayIso, fmtFR, formatShortDay } from "../../lib/dateUtils";
import {
  KPI_ORDER,
  KPI_INFO,
  STATUS_COLORS,
  STATUS_LEGEND,
  PLACE_OPTIONS,
  PLACE_COORDS,
  getRingConfig,
  computeQuantiteObjectif,
} from "../../lib/kpiLogic";
import { verifyAuth } from "../../middlewares/auth";

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function formatCellText(value, type) {
  if (value === undefined || value === null) return "–";
  return type === "percent" ? `${value}%` : `${value}`;
}

function MiniKeyboard({ type, onKeyClick, onBackspace, onClear, dragHandleProps }) {
  const isNumber = type === "number";
  const [mode, setMode] = useState("lettres"); // "lettres" | "chiffres" | "symboles"

  const numberKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "-"];
  const letterKeys = [
    "a", "z", "e", "r", "t", "y", "u", "i", "o", "p",
    "q", "s", "d", "f", "g", "h", "j", "k", "l", "m",
    "w", "x", "c", "v", "b", "n",
    "é", "è", "ê", "à", "ù", "ç", "œ", "â", "î", "ô", "û", "ë", "ï", "ü",
  ];
  const symbolKeys = [
    "!", "@", "#", "$", "%", "^", "&", "*", "(", ")",
    "-", "_", "=", "+", "[", "]", "{", "}", ";", ":",
    "'", '"', ",", ".", "<", ">", "/", "?", "~", "`", "|", "\\",
  ];

  const keys = isNumber ? numberKeys : mode === "chiffres" ? numberKeys : mode === "symboles" ? symbolKeys : letterKeys;
  const columns = isNumber ? 3 : 10;

  return (
    <div
      className="bg-white border border-gray-300 rounded-md shadow-lg p-0.5 select-none"
      style={{ width: isNumber ? 90 : 205 }}
    >
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="flex items-center justify-center h-2.5 mb-0.5 bg-gray-100 hover:bg-gray-200 rounded cursor-move text-[5px] text-gray-400 tracking-widest"
        >
          ⠿ ⠿ ⠿
        </div>
      )}

      {!isNumber && (
        <div className="flex gap-0.5 mb-0.5">
          {[
            { key: "lettres", label: "ABC" },
            { key: "chiffres", label: "123" },
            { key: "symboles", label: "#+=" },
          ].map((m) => (
            <button
              key={m.key}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                setMode(m.key);
              }}
              className={`flex-1 text-[5px] font-semibold rounded px-0.5 py-0.5 border ${mode === m.key ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 border-gray-200 text-gray-600"
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {keys.map((key, idx) => (
          <button
            key={`${key}-${idx}`}
            onClick={(e) => {
              e.preventDefault();
              onKeyClick(key);
            }}
            className="text-[5px] font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded px-0.5 py-0.5"
          >
            {key}
          </button>
        ))}
        {!isNumber && mode === "lettres" && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onKeyClick(" ");
            }}
            className="text-[5px] font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded px-0.5 py-0.5 col-span-4"
          >
            Espace
          </button>
        )}
      </div>

      <div className="flex gap-0.5 mt-0.5">
        <button
          onClick={(e) => {
            e.preventDefault();
            onClear();
          }}
          className="flex-1 text-[5px] font-semibold bg-red-50 hover:bg-red-100 border border-red-200 rounded px-0.5 py-0.5 text-red-600"
        >
          Effacer
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            onBackspace();
          }}
          className="flex-1 text-[5px] font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded px-0.5 py-0.5"
        >
          ←
        </button>
      </div>
    </div>
  );
}

function InputWithKeyboard({ type, value, onChange, className = "", ...props }) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [pos, setPos] = useState(null);
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value === undefined || value === null ? "" : String(value));
  const inputRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!focused) {
      setLocalValue(value === undefined || value === null ? "" : String(value));
    }
  }, [value, focused]);

  const emitChange = (newValue) => {
    setLocalValue(newValue);
    onChange({ target: { value: newValue } });
  };

  const handleKeyClick = (key) => {
    if (type === "number" && !/^[0-9.\-]$/.test(key)) return;
    const newValue = (localValue || "") + key;
    emitChange(newValue);
  };

  const handleBackspace = () => {
    const newValue = (localValue || "").slice(0, -1);
    emitChange(newValue);
  };

  const handleClear = () => {
    emitChange("");
  };

  function openKeyboard() {
    const kbWidth = type === "number" ? 90 : 205;
    const kbHeight = type === "number" ? 90 : 110;
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 4;
      if (left + kbWidth > window.innerWidth) left = window.innerWidth - kbWidth - 8;
      if (top + kbHeight > window.innerHeight) top = rect.top - kbHeight - 4;
      setPos({ x: Math.max(4, left), y: Math.max(4, top) });
    }
    setShowKeyboard(true);
  }

  function onDragMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    window.addEventListener("mousemove", onDragMouseMove);
    window.addEventListener("mouseup", onDragMouseUp);
  }
  function onDragMouseMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const kbWidth = type === "number" ? 90 : 205;
    const kbHeight = type === "number" ? 90 : 130;
    let x = dragRef.current.origX + dx;
    let y = dragRef.current.origY + dy;
    x = Math.min(Math.max(0, x), window.innerWidth - kbWidth);
    y = Math.min(Math.max(0, y), window.innerHeight - kbHeight);
    setPos({ x, y });
  }
  function onDragMouseUp() {
    dragRef.current = null;
    window.removeEventListener("mousemove", onDragMouseMove);
    window.removeEventListener("mouseup", onDragMouseUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onDragMouseMove);
      window.removeEventListener("mouseup", onDragMouseUp);
    };
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type === "number" ? "text" : type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={localValue}
        onChange={(e) => emitChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          openKeyboard();
        }}
        onBlur={() => {
          setFocused(false);
          setShowKeyboard(false);
        }}
        className={className}
        {...props}
      />
      {showKeyboard && pos && (
        <div
          className="fixed z-50"
          style={{ left: pos.x, top: pos.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <MiniKeyboard
            type={type}
            onKeyClick={handleKeyClick}
            onBackspace={handleBackspace}
            onClear={handleClear}
            dragHandleProps={{ onMouseDown: onDragMouseDown }}
          />
        </div>
      )}
    </div>
  );
}

function MultiRingGauge({ kpiKey, ringConfig, days, todayIndex, selectedIndex, isActive, onClick }) {
  const info = KPI_INFO[kpiKey];
  const size = 130;
  const cx = size / 2;
  const cy = size / 2;
  const baseR = 20;
  const ringWidth = 14;
  const ringGap = 1;
  const segments = Math.max(days.length, 1);
  const gapDeg = segments > 20 ? 1.2 : 3.5;
  const anglePer = 360 / segments;
  const fontSize = segments > 25 ? 3 : segments > 15 ? 4 : 5;

  const dayRingCells = days.map((d, i) => ({
    status: i === todayIndex ? "today" : i === selectedIndex ? "selected" : "white",
    text: `${i + 1}`,
  }));

  const allRings = [
    { name: "Jours", isDayRing: true, cells: dayRingCells },
    ...(ringConfig || []).map((r) => ({ name: r.name, type: r.type, cells: r.cells.map((c) => ({ ...c, text: formatCellText(c.value, r.type) })) })),
  ];

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center rounded-xl px-1 py-1 transition ${isActive ? "bg-gray-50" : "hover:bg-gray-50"}`}
      style={isActive ? { boxShadow: `0 0 0 2px ${info.color}55` } : {}}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {allRings.map((ring, ringIdx) => {
          const rInner = baseR + ringIdx * (ringWidth + ringGap);
          const rOuter = rInner + ringWidth;
          return (
            <g key={ringIdx}>
              {ring.cells.map((cell, i) => {
                const start = i * anglePer + gapDeg / 2;
                const end = (i + 1) * anglePer - gapDeg / 2;
                const path = describeArc(cx, cy, (rInner + rOuter) / 2, start, end);
                const mid = (start + end) / 2;
                const labelPos = polarToCartesian(cx, cy, (rInner + rOuter) / 2, mid);
                const textColor = ring.isDayRing ? (i === todayIndex || i === selectedIndex ? "#1E3A8A" : "#374151") : cell.status === "white" ? "#4B5563" : "#FFFFFF";
                return (
                  <g key={i}>
                    <path d={path} fill="none" stroke={STATUS_COLORS[cell.status]} strokeWidth={ringWidth}>
                      <title>
                        {ring.name} — Jour {i + 1} : {ring.isDayRing ? "" : cell.text}
                      </title>
                    </path>
                    <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fontWeight="700" fill={textColor}>
                      {cell.text}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={baseR - 6} fill="white" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="700" fill={info.color}>
          {kpiKey}
        </text>
      </svg>
      <span className="text-[6px] font-bold tracking-wide text-gray-700 mt-0.5 uppercase">{info.label}</span>
    </button>
  );
}

function BodySilhouette({ injuries }) {
  const [hovered, setHovered] = useState(null);
  const maxCount = Math.max(1, ...injuries.map((b) => b.count));

  return (
    <div className="relative flex justify-center" style={{ width: 55, height: 115 }}>
      <svg width="55" height="115" viewBox="0 0 110 230">
        <circle cx="55" cy="20" r="14" fill="#CBD5E1" />
        <rect x="40" y="36" width="30" height="45" rx="10" fill="#CBD5E1" />
        <rect x="20" y="40" width="14" height="60" rx="7" fill="#CBD5E1" />
        <rect x="76" y="40" width="14" height="60" rx="7" fill="#CBD5E1" />
        <rect x="42" y="80" width="26" height="55" rx="10" fill="#CBD5E1" />
        <rect x="40" y="132" width="13" height="70" rx="6" fill="#CBD5E1" />
        <rect x="57" y="132" width="13" height="70" rx="6" fill="#CBD5E1" />
        {injuries.map((b) => {
          const r = 2 + (b.count / maxCount) * 4.5;
          return (
            <circle
              key={b.place}
              cx={b.x}
              cy={b.y}
              r={r}
              fill="#EF4444"
              stroke="white"
              strokeWidth="1"
              className="cursor-pointer"
              onMouseEnter={() => setHovered(b)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      {injuries.length === 0 && <span className="absolute inset-0 flex items-center justify-center text-[5px] text-gray-300 text-center px-2">Aucune blessure sur la période</span>}
      {hovered && (
        <div
          className="absolute bg-white text-[5px] leading-tight border border-gray-200 rounded-md shadow-md px-1 py-0.5 pointer-events-none z-10"
          style={{ left: `${(hovered.x / 110) * 100}%`, top: `${(hovered.y / 230) * 100}%` }}
        >
          <div className="font-semibold text-gray-800">{hovered.place}</div>
          <div className="text-gray-500">Total : {hovered.count}</div>
        </div>
      )}
    </div>
  );
}

function SearchDropdown({ label, options, selected, onToggleOption, allowAdd, onAddNew, addExtra, onClose }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newExtra, setNewExtra] = useState(addExtra && addExtra.options.length ? addExtra.options[0] : "");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        if (onClose) onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, onClose]);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  function submitNew() {
    const val = newText.trim();
    if (!val) return;
    onAddNew(addExtra ? { label: val, extra: newExtra } : val);
    setNewText("");
    setAdding(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setOpen((o) => !o)} className="border border-gray-200 rounded-lg p-1 flex items-start justify-between min-h-[32px] cursor-pointer">
        <div className="flex flex-wrap gap-1">
          {selected.length === 0 && <span className="text-[6px] text-gray-300 mt-0.5">Aucune sélection...</span>}
          {selected.map((s) => (
            <span key={s} className="flex items-center gap-0.5 bg-gray-100 text-gray-600 text-[6px] font-medium px-1 py-0.5 rounded-md">
              {s}
              <FaTimes
                className="text-[4px] text-gray-400 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleOption(s);
                }}
              />
            </span>
          ))}
        </div>
        <FaChevronDown className={`text-gray-300 text-[6px] mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute z-20 mt-0.5 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-1">
          <div className="flex items-center gap-1 border border-gray-200 rounded-md px-1 py-1 mb-1">
            <FaSearch className="text-gray-300 text-[6px]" />
            <InputWithKeyboard
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Rechercher ${label.toLowerCase()}...`}
              className="text-[6px] outline-none flex-1"
            />
          </div>
          <div className="max-h-16 overflow-auto flex flex-col mb-0.5">
            {filtered.length === 0 && <span className="text-[6px] text-gray-300 px-1 py-0.5">Aucun résultat</span>}
            {filtered.map((opt) => (
              <label key={opt} className="flex items-center gap-1 px-1 py-1 rounded-md hover:bg-gray-50 cursor-pointer text-[6px]">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggleOption(opt)} className="accent-blue-600" />
                {opt}
              </label>
            ))}
          </div>
          {allowAdd && (
            <div className="border-t border-gray-100 pt-1">
              {adding ? (
                <div className="flex flex-col gap-1">
                  <InputWithKeyboard
                    autoFocus
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Nouvelle valeur..."
                    className="border border-gray-200 rounded-md px-1 py-1 text-[6px] outline-none"
                  />
                  {addExtra && (
                    <select value={newExtra} onChange={(e) => setNewExtra(e.target.value)} className="border border-gray-200 rounded-md px-1 py-1 text-[6px]">
                      {addExtra.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center gap-1">
                    <button onClick={submitNew} className="flex items-center gap-0.5 bg-blue-600 text-white text-[6px] font-semibold px-1.5 py-1 rounded-md">
                      <FaSave className="text-[5px]" /> Enregistrer
                    </button>
                    <button onClick={() => setAdding(false)} className="text-gray-400 text-[6px] px-0.5">
                      <FaTimes />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-blue-600 text-[6px] font-semibold">
                  <FaPlus className="text-[4px]" /> Ajouter un nouveau
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NumField({ label, unit, value, onChange, compact }) {
  return (
    <div className={compact ? "mb-1" : "mb-1.5"}>
      <label className="text-[6px] text-gray-500 flex items-center gap-0.5">{label}</label>
      <div className="flex items-center gap-1 mt-0.5">
        <InputWithKeyboard
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={`${compact ? "w-full" : "w-12"} border border-gray-300 rounded-md px-1 py-1 text-[6px]`}
        />
        <span className="text-[6px] text-gray-500">{unit}</span>
      </div>
    </div>
  );
}
function TimeResult({ label, hours }) {
  return (
    <div className="bg-gray-50 rounded-lg px-1 py-1 text-center">
      <div className="text-[5px] text-gray-400">{label}</div>
      <div className="text-[7px] font-bold text-gray-700">{hours} h</div>
    </div>
  );
}
function ParetoCard({ title, color, letter, children }) {
  return (
    <div className="border border-gray-100 rounded-lg p-1.5 flex flex-col">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="w-2 h-2 rounded-full flex items-center justify-center text-white text-[4px] font-bold" style={{ backgroundColor: color }}>
          {letter}
        </span>
        <span className="text-[6px] font-bold" style={{ color }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
function ChartLegend({ barLabel, barColor }) {
  return (
    <div className="flex items-center gap-1.5 text-[5px] text-gray-400 mt-0.5">
      <span className="flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: barColor }} />
        {barLabel}
      </span>
      <span className="flex items-center gap-0.5">
        <span className="w-1.5 h-0.5 bg-blue-500 inline-block" />
        Cumulé (%)
      </span>
    </div>
  );
}
function MiniPareto({ data, barColor, lineColor }) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 2, right: 2, left: 0, bottom: 14 }}>
          <CartesianGrid vertical={false} stroke="#F1F5F9" />
          <XAxis dataKey="name" tick={{ fontSize: 4 }} interval={0} angle={-40} textAnchor="end" height={30} tickMargin={2} />
          <YAxis yAxisId="left" tick={{ fontSize: 5 }} width={18} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 5 }} width={13} />
          <Tooltip />
          <Bar yAxisId="left" dataKey="nombre" fill={barColor} radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="cumule" stroke={lineColor} strokeWidth={1} dot={{ r: 1.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const DEFAULT_TEMPS = { ouverture: 8, planifie: 30, arret: 20, changement: 15, rupture: 10, autre: 0, gammes: 5 };
const DEFAULT_SELECTIONS = { place: [], risque: [], defaut: [], absence: [] };

export default function DashboardPage({ session }) {
  const router = useRouter();
  const { sheet: sheetCode } = router.query;

  const [sheet, setSheet] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [allSheets, setAllSheets] = useState([]);

  useEffect(() => {
    apiGet("/api/sheets").then((rows) => {
      setAllSheets(rows);
      const found = rows.find((s) => s.code === sheetCode);
      if (sheetCode) {
        if (found) setSheet(found);
        else setLoadError("Feuille inconnue.");
      }
    }).catch((e) => setLoadError(e.message));
  }, [sheetCode]);

  const today = todayIso();
  const [periode, setPeriode] = useState("mois");
  const [customStart, setCustomStart] = useState(addDaysIso(today, -6));
  const [customEnd, setCustomEnd] = useState(today);
  const days = useMemo(() => computeDays(periode, customStart, customEnd), [periode, customStart, customEnd]);
  const todayIndex = days.indexOf(today);
  const periodLabel =
    periode === "semaine" ? `${fmtFR(days[0])} → ${fmtFR(days[days.length - 1])}` : periode === "mois" ? `${fmtFR(days[0])} → ${fmtFR(days[days.length - 1])}` : `${fmtFR(customStart)} → ${fmtFR(customEnd)}`;

  const [selectedDateIso, setSelectedDateIso] = useState(today);
  const selectedIndexInPeriod = days.indexOf(selectedDateIso);

  const [selectedKpi, setSelectedKpi] = useState("S");
  const sheetType = sheet ? sheet.type : "ligne";

  const [kpiRings, setKpiRings] = useState(null);

  function refreshKpiRings() {
    if (!sheet || !days || days.length === 0) return;
    const params = new URLSearchParams({ sheetId: sheet.id, periode, sheetType, startDate: customStart, endDate: customEnd });
    apiGet(`/api/kpiRings?${params.toString()}`).then(setKpiRings).catch(() => { });
  }
  useEffect(refreshKpiRings, [sheet, periode, customStart, customEnd]);

  const [allParams, setAllParams] = useState({});
  const [paramsDraft, setParamsDraft] = useState({});
  const [savedMsg, setSavedMsg] = useState("");
  const loadedParamsRef = useRef("{}");
  const paramsSaveTimeout = useRef(null);

  function flashSaved(msg) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 2500);
  }

  useEffect(() => {
    if (!sheet) return;
    let cancelled = false;
    apiGet(`/api/kpiParams?sheetId=${sheet.id}&date=${selectedDateIso}`).then((data) => {
      if (cancelled) return;
      const loaded = data || {};
      setAllParams(loaded);
      const currentKpiParams = loaded[selectedKpi] || {};
      loadedParamsRef.current = JSON.stringify(currentKpiParams);
      setParamsDraft(currentKpiParams);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, selectedDateIso]);

  useEffect(() => {
    if (!sheet) return;
    const currentKpiParams = allParams[selectedKpi] || {};
    loadedParamsRef.current = JSON.stringify(currentKpiParams);
    setParamsDraft(currentKpiParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKpi]);

  useEffect(() => {
    if (!sheet) return;
    if (JSON.stringify(paramsDraft) === loadedParamsRef.current) return;
    if (paramsSaveTimeout.current) clearTimeout(paramsSaveTimeout.current);
    paramsSaveTimeout.current = setTimeout(() => {
      apiPost("/api/kpiParams", { sheetId: sheet.id, date: selectedDateIso, kpi: selectedKpi, data: paramsDraft }).then(() => {
        loadedParamsRef.current = JSON.stringify(paramsDraft);
        flashSaved(`Données du ${fmtFR(selectedDateIso)} enregistrées automatiquement`);
        apiGet(`/api/kpiParams?sheetId=${sheet.id}&date=${selectedDateIso}`).then((data) => setAllParams(data || {}));
        refreshKpiRings();
        refreshKpiTrend();
      });
    }, 600);
    return () => clearTimeout(paramsSaveTimeout.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsDraft]);

  const paramsQ = allParams.Q || {};
  const paramsC = allParams.C || {};
  const paramsD = allParams.D || {};

  const tauxRebut = Number(paramsQ.quantiteTotale) > 0 ? (Number(paramsQ.rebuts || 0) / Number(paramsQ.quantiteTotale)) * 100 : 0;
  const efficience = Number(paramsC.quantiteObjectif) > 0 ? (Number(paramsC.quantiteProduite || 0) / Number(paramsC.quantiteObjectif)) * 100 : 0;
  const pdp = Number(paramsD.quantitePlanifiee) > 0 ? (Number(paramsD.quantiteProduite || 0) / Number(paramsD.quantitePlanifiee)) * 100 : 0;
  const efficienceLabel = sheetType === "machine" ? "TRS" : "Efficience";

  function setDraftField(field, value) {
    if (field === 'quantiteProduite' && (selectedKpi === 'C' || selectedKpi === 'D')) {
      const newParamsC = { ...(allParams.C || {}), quantiteProduite: value };
      const newParamsD = { ...(allParams.D || {}), quantiteProduite: value };
      const newParamsQ = {
        ...(allParams.Q || {}),
        quantiteTotale: Number(value) || 0
      };
      setAllParams(prev => ({ ...prev, C: newParamsC, D: newParamsD, Q: newParamsQ }));
    } else if (field === 'rebuts' && selectedKpi === 'Q') {
      const newParamsQ = {
        ...(allParams.Q || {}),
        rebuts: value,
        quantiteTotale: Number(allParams.C?.quantiteProduite) || 0
      };
      setAllParams(prev => ({ ...prev, Q: newParamsQ }));
    } else if (field === 'quantiteTotale' && selectedKpi === 'Q') {
      const newParamsQ = { ...(allParams.Q || {}), quantiteTotale: value };
      setAllParams(prev => ({ ...prev, Q: newParamsQ }));
    }

    setParamsDraft((prev) => ({ ...prev, [field]: value }));
  }

  const [kpiTrend, setKpiTrend] = useState([]);
  const trendStart = addDaysIso(selectedDateIso, -6);

  function refreshKpiTrend() {
    if (!sheet) return;
    const params = new URLSearchParams({
      sheetId: sheet.id,
      kpi: selectedKpi,
      startDate: trendStart,
      endDate: selectedDateIso,
    });
    apiGet(`/api/kpiTrend?${params.toString()}`).then(setKpiTrend).catch(() => { });
  }
  useEffect(refreshKpiTrend, [sheet, selectedKpi, selectedDateIso]);

  const [causesData, setCausesData] = useState(null);
  function refreshCauses() {
    if (!sheet) return;
    apiGet(`/api/causes?sheetId=${sheet.id}&date=${selectedDateIso}`).then(setCausesData).catch(() => { });
  }
  useEffect(refreshCauses, [sheet, selectedDateIso]);

  const currentSelections = (causesData && causesData.selections) || DEFAULT_SELECTIONS;
  const dictionary = (causesData && causesData.dictionary) || { risque: [], defaut: [], absence: [] };

  const absenceQuantities = (causesData && causesData.absenceQuantities) || {};
  const absenceSum = currentSelections.absence.reduce((s, v) => s + (Number(absenceQuantities[v]) || 0), 0);

  const risqueQuantities = (causesData && causesData.risqueQuantities) || {};
  const risqueSum = currentSelections.risque.reduce((s, v) => s + (Number(risqueQuantities[v]) || 0), 0);

  const defautQuantities = (causesData && causesData.defautQuantities) || {};
  const defautSum = currentSelections.defaut.reduce((s, v) => s + (Number(defautQuantities[v]) || 0), 0);

  const [tempsLocal, setTempsLocal] = useState(DEFAULT_TEMPS);
  useEffect(() => {
    if (causesData) setTempsLocal(causesData.temps || DEFAULT_TEMPS);
  }, [causesData]);

  const [postes, setPostes] = useState([]);
  useEffect(() => {
    if (!sheet) return;
    apiGet(`/api/postes?sheetId=${sheet.id}`).then((rows) => setPostes(rows.map((p) => p.nom))).catch(() => { });
  }, [sheet]);

  function toggleSelection(categorie, valeur) {
    if (!sheet) return;
    const already = currentSelections[categorie].includes(valeur);
    apiPost("/api/causes", { type: "selection", sheetId: sheet.id, date: selectedDateIso, categorie, valeur, action: already ? "remove" : "add" }).then((res) => {
      setCausesData((prev) => ({ ...prev, ...res }));
      refreshParetoStats();
      refreshKpiRings();
    });
  }
  function addDictionaryEntry(categorie, libelle, posteLabel) {
    if (!sheet) return;
    apiPost("/api/causes", { type: "dictionary", sheetId: sheet.id, date: selectedDateIso, categorie, libelle, posteLabel }).then((res) => {
      setCausesData((prev) => ({ ...prev, ...res }));
      const valeur = posteLabel ? `${libelle} — ${posteLabel}` : libelle;
      toggleSelection(categorie, valeur);
    });
  }

  const absenceQtyDebounce = useRef({});
  const risqueQtyDebounce = useRef({});
  const defautQtyDebounce = useRef({});

  function setCauseQuantity(categorie, valeur, qty) {
    let stateSetter, debounceRef, apiType;

    if (categorie === 'absence') {
      stateSetter = (prev) => ({ ...prev, absenceQuantities: { ...(prev.absenceQuantities || {}), [valeur]: qty } });
      debounceRef = absenceQtyDebounce;
      apiType = 'absenceQuantity';
    } else if (categorie === 'risque') {
      stateSetter = (prev) => ({ ...prev, risqueQuantities: { ...(prev.risqueQuantities || {}), [valeur]: qty } });
      debounceRef = risqueQtyDebounce;
      apiType = 'risqueQuantity';
    } else if (categorie === 'defaut') {
      stateSetter = (prev) => ({ ...prev, defautQuantities: { ...(prev.defautQuantities || {}), [valeur]: qty } });
      debounceRef = defautQtyDebounce;
      apiType = 'defautQuantity';
    } else {
      return;
    }

    setCausesData(stateSetter);

    if (debounceRef.current[valeur]) clearTimeout(debounceRef.current[valeur]);
    debounceRef.current[valeur] = setTimeout(() => {
      if (!sheet) return;
      apiPost("/api/causes", { type: apiType, sheetId: sheet.id, date: selectedDateIso, valeur, quantite: qty }).then(() => refreshParetoStats());
    }, 500);
  }

  const tempsDebounce = useRef(null);
  function setTempsField(field, value) {
    const updated = { ...tempsLocal, [field]: value };
    setTempsLocal(updated);
    if (tempsDebounce.current) clearTimeout(tempsDebounce.current);
    tempsDebounce.current = setTimeout(() => {
      if (!sheet) return;
      apiPost("/api/causes", { type: "temps", sheetId: sheet.id, date: selectedDateIso, temps: updated }).then(() => refreshParetoStats());
    }, 500);
  }

  const tempsRequisMin = (Number(tempsLocal.ouverture * 60) || 0) - (Number(tempsLocal.planifie) || 0);
  const tempsFonctionnementMin =
    tempsRequisMin - ((Number(tempsLocal.arret) || 0) + (Number(tempsLocal.changement) || 0) + (Number(tempsLocal.rupture) || 0) + (Number(tempsLocal.autre) || 0));
  const qtyProducedForTemps = Number(paramsC.quantiteProduite) || 0;
  const qtyRebutForTemps = Number(paramsQ.rebuts) || 0;
  const tempsUtileMin = qtyProducedForTemps * (Number(tempsLocal.gammes) || 0);
  const tempsNonQualiteMin = qtyRebutForTemps * (Number(tempsLocal.gammes) || 0);
  const tempsNetMin = tempsUtileMin + tempsNonQualiteMin;
  const tempsRalentissementMin = tempsFonctionnementMin - tempsNetMin;
  const toH = (min) => (min / 60).toFixed(2);

  useEffect(() => {
    if (selectedKpi !== "C") return;
    const cycle = Number(paramsDraft.tempsCycleLigne) || 0;
    if (cycle <= 0) return;
    const computed = computeQuantiteObjectif(cycle, tempsRequisMin / 60);
    if (Number(paramsC.quantiteObjectif || 0) !== computed) {
      setDraftField("quantiteObjectif", computed);
    }
  }, [selectedKpi, paramsC.tempsCycleLigne, tempsRequisMin]);

  const [notifications, setNotifications] = useState([]);
  const [retourClientNote, setRetourClientNote] = useState("");
  const [retourClientImage, setRetourClientImage] = useState(null);
  const [viewedNotification, setViewedNotification] = useState(null);

  function refreshNotifications() {
    if (!sheet) return;
    apiGet(`/api/notifications?sheetId=${sheet.id}`).then(setNotifications).catch(() => { });
  }
  useEffect(refreshNotifications, [sheet]);

  function markAllAsRead() {
    if (!sheet) return;
    apiPut("/api/notifications", { sheetId: sheet.id })
      .then(() => refreshNotifications())
      .catch(() => { });
  }

  function openNotification(n) {
    setViewedNotification(n);
    if (!n.lu) markAllAsRead();
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) {
      setRetourClientImage(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRetourClientImage({ base64: reader.result.split(",")[1], mime: file.type });
    };
    reader.readAsDataURL(file);
  }

  function submitNotification() {
    if (!retourClientNote.trim() || !sheet) return;
    apiPost("/api/notifications", {
      sheetId: sheet.id,
      date: selectedDateIso,
      texte: retourClientNote.trim(),
      imageBase64: retourClientImage ? retourClientImage.base64 : null,
      imageMime: retourClientImage ? retourClientImage.mime : null,
    }).then(() => {
      setRetourClientNote("");
      setRetourClientImage(null);
      refreshNotifications();
      flashSaved("Cause enregistrée dans les notifications");
    });
  }

  const [actionsTab, setActionsTab] = useState("tableau");
  const [actions, setActions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  function refreshActions() {
    if (!sheet) return;
    apiGet(`/api/actions?sheetId=${sheet.id}&date=${selectedDateIso}&kpi=${selectedKpi}`).then(setActions).catch(() => { });
  }
  useEffect(refreshActions, [sheet, selectedDateIso, selectedKpi]);

  function addRow() {
    if (!sheet) return;
    apiPost("/api/actions", { sheetId: sheet.id, date: selectedDateIso, kpi: selectedKpi, probleme: "Nouveau problème", action: "Nouvelle action", pilote: "", statut: "À faire" }).then((row) => {
      setActions((prev) => [...prev, row]);
      setEditingId(row.id);
      setDraft(row);
      refreshPlanning();
    });
  }
  function startEdit(row) {
    setEditingId(row.id);
    setDraft(row);
  }
  function saveEdit() {
    apiPut(`/api/actions/${editingId}`, draft).then(() => {
      setActions((prev) => prev.map((r) => (r.id === editingId ? draft : r)));
      setEditingId(null);
      setDraft(null);
      refreshPlanning();
    });
  }
  function deleteRow(id) {
    apiDelete(`/api/actions/${id}`).then(() => {
      setActions((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setDraft(null);
      }
      refreshPlanning();
    });
  }

  const [planningWeekStart, setPlanningWeekStart] = useState(addDaysIso(today, -((new Date(today).getDay() + 6) % 7)));
  const selectedWeekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => addDaysIso(planningWeekStart, i)), [planningWeekStart]);
  const nextWeekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(planningWeekStart, 7 + i)), [planningWeekStart]);
  const weekAfterDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(planningWeekStart, 14 + i)), [planningWeekStart]);

  const [ticketsByDate, setTicketsByDate] = useState({});
  const [dragInfo, setDragInfo] = useState(null);

  function refreshPlanning() {
    if (!sheet) return;
    apiGet(`/api/planningTickets?sheetId=${sheet.id}&startDate=${planningWeekStart}&endDate=${addDaysIso(planningWeekStart, 20)}&kpi=${selectedKpi}`).then((rows) => {
      const grouped = {};
      rows.forEach((t) => {
        grouped[t.date] = grouped[t.date] || [];
        grouped[t.date].push(t);
      });
      setTicketsByDate(grouped);
    });
  }
  useEffect(refreshPlanning, [sheet, planningWeekStart, selectedKpi]);

  function moveTicket(id, toDate) {
    apiPut(`/api/planningTickets/${id}`, { date: toDate }).then(refreshPlanning);
  }

  const [paretoPeriod, setParetoPeriod] = useState("jour");
  const [paretoPoste, setParetoPoste] = useState("");
  const [paretoStats, setParetoStats] = useState(null);
  function refreshParetoStats() {
    if (!sheet) return;
    let start = selectedDateIso;
    if (paretoPeriod === "semaine") start = addDaysIso(selectedDateIso, -6);
    if (paretoPeriod === "mois") start = addDaysIso(selectedDateIso, -29);
    const params = new URLSearchParams({ sheetId: sheet.id, periode: paretoPeriod, startDate: start, endDate: selectedDateIso });
    if (paretoPoste) params.set("poste", paretoPoste);
    apiGet(`/api/paretoStats?${params.toString()}`).then(setParetoStats).catch(() => { });
  }
  useEffect(refreshParetoStats, [sheet, paretoPeriod, paretoPoste, selectedDateIso]);

  const [tickets, setTickets] = useState([]);
  const [addingTicket, setAddingTicket] = useState(false);
  const [newTicketTitre, setNewTicketTitre] = useState("");
  const [newTicketSous, setNewTicketSous] = useState("");
  function refreshParetoTickets() {
    if (!sheet) return;
    apiGet(`/api/paretoTickets?sheetId=${sheet.id}`).then(setTickets).catch(() => { });
  }
  useEffect(refreshParetoTickets, [sheet]);
  function handleAddTicket() {
    if (!newTicketTitre.trim() || !sheet) return;
    apiPost("/api/paretoTickets", { sheetId: sheet.id, titre: newTicketTitre.trim(), sous: newTicketSous.trim() }).then(() => {
      setNewTicketTitre("");
      setNewTicketSous("");
      setAddingTicket(false);
      refreshParetoTickets();
    });
  }

  const bodyInjuries = useMemo(() => {
    if (!paretoStats) return [];
    return paretoStats.placeCounts
      .map((p) => ({ place: p.place, count: p.count, ...(PLACE_COORDS[p.place] || { x: 55, y: 100 }) }))
      .filter((p) => p.x !== undefined);
  }, [paretoStats]);

  if (loadError) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#EEF1F6] gap-1.5">
        <p className="text-red-500 font-semibold">{loadError}</p>
        <Link href="/" className="text-blue-600 text-[7px] font-semibold">Retour à l&apos;accueil</Link>
      </div>
    );
  }
  if (!sheet) {
    return <div className="min-h-screen w-screen flex items-center justify-center bg-[#EEF1F6] text-gray-400 text-[7px]">Chargement...</div>;
  }

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-[#EEF1F6] text-[6px]">
      <aside className="w-[105px] shrink-0 bg-[#0B1526] text-white flex flex-col justify-between">
        <div>
          <Link href="/" className="flex flex-col items-center gap-1 px-2.5 py-2.5 border-b border-white/10">
            <img src="/banner.png" className="w-full" />
            <span className="font-bold tracking-wide text-[8px]">
              MES <span className="font-extrabold">PERFORMANCE</span>
            </span>
          </Link>
          <div className="px-2.5 pt-2.5 pb-1 text-[6px] tracking-wider text-gray-400 font-semibold">SÉLECTION</div>
          <nav className="px-1.5 flex flex-col gap-0.5">
            {allSheets.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/${s.code}`}
                className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg font-medium ${s.code === sheetCode ? "bg-[#7A1E22] text-white" : "text-gray-300 hover:bg-white/5"}`}
              >
                {s.type === "machine" ? <FaCogs className="text-[7px]" /> : <FaPlane className="text-[7px]" />}
                {s.label}
              </Link>
            ))}
            <Link href="/supervision" className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-gray-300 hover:bg-white/5 text-left">
              <FaChartBar className="text-[7px]" />
              Supervision hebdomadaire
            </Link>
          </nav>
        </div>
        <div className="px-1.5 pb-2">
          {session.isAdmin &&
            <>
              <div className="px-1 pt-1.5 pb-1 text-[6px] tracking-wider text-gray-400 font-semibold border-t border-white/10">PARAMÈTRES GÉNÉRAUX</div>
              <Link href="/settings" className="w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-gray-300 hover:bg-white/5">
                <FaCog className="text-[7px]" />
                Paramètres
              </Link>
            </>
          }
          <Link href="/api/auth/logout" className="w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-red-400 hover:bg-white/5 mt-1">
            <FaSignOutAlt className="text-[7px]" />
            LOGOUT
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white border-b border-gray-200">
          <div className="h-[32px] flex items-center justify-between px-3">
            <h1 className="font-bold text-[9px] text-gray-800 tracking-tight">TABLEAU DE BORD - {sheet.label.toUpperCase()}</h1>
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-semibold text-gray-400 mr-0.5">PÉRIODE</span>
              <button onClick={() => setPeriode("semaine")} className={`px-1.5 py-1 rounded-md text-[6px] font-semibold ${periode === "semaine" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                Dernière semaine
              </button>
              <button onClick={() => setPeriode("mois")} className={`px-1.5 py-1 rounded-md text-[6px] font-semibold ${periode === "mois" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                Dernier mois
              </button>
              <button onClick={() => setPeriode("intervalle")} className={`px-1.5 py-1 rounded-md text-[6px] font-semibold ${periode === "intervalle" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                Intervalle précis
              </button>
              {periode !== "intervalle" && (
                <div className="flex items-center gap-1 ml-1 px-1.5 py-1 rounded-md bg-gray-100 text-[6px] font-medium text-gray-600">
                  {periodLabel}
                  <FaCalendarAlt className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[6px] text-gray-400">Aujourd&apos;hui : {fmtFR(today)}</span>
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[6px] font-bold">{session.nom.slice(0, 1).toUpperCase()}</div>
            </div>
          </div>
          {periode === "intervalle" && (
            <div className="flex items-center gap-1.5 px-3 pb-1.5 -mt-0.5">
              <FaCalendarAlt className="text-gray-400 text-[6px]" />
              <span className="text-[6px] text-gray-500">Du</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  if (e.target.value) setCustomStart(e.target.value);
                }}
                className="border border-gray-200 rounded-md px-1 py-0.5 text-[6px]"
              />
              <span className="text-[6px] text-gray-500">au</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  if (e.target.value) setCustomEnd(e.target.value);
                }}
                className="border border-gray-200 rounded-md px-1 py-0.5 text-[6px]"
              />
              <span className="text-[6px] font-semibold text-blue-600 ml-1">
                {fmtFR(customStart)} → {fmtFR(customEnd)} ({days.length} jour{days.length > 1 ? "s" : ""})
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 min-h-0 p-2 flex flex-col gap-2 overflow-auto">
          <div className="w-full flex gap-2">
            <div className="w-full flex flex-col gap-2">
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2 shrink-0">
                <h2 className="text-[6px] font-bold tracking-wide text-gray-700 mb-1">I. INDICATEURS KPI</h2>
                <div className="flex items-stretch gap-2">
                  <div className="flex items-center justify-around flex-1">
                    {KPI_ORDER.map((k) => (
                      <MultiRingGauge
                        key={k}
                        kpiKey={k}
                        ringConfig={kpiRings ? kpiRings.kpis[k] : []}
                        days={days}
                        todayIndex={todayIndex}
                        selectedIndex={selectedIndexInPeriod}
                        isActive={selectedKpi === k}
                        onClick={() => setSelectedKpi(k)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-start justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                  <div>
                    <p className="text-[6px] font-bold text-gray-500 mb-0.5">Anneaux — {KPI_INFO[selectedKpi].label} (du centre vers l&apos;extérieur)</p>
                    <div className="flex flex-wrap gap-1.5 text-[6px] text-gray-500">
                      <span className="px-1 py-0.5 rounded bg-gray-100 font-medium">1. Jours de la période (1, 2, 3...)</span>
                      {getRingConfig(selectedKpi, sheetType).map((r, i) => (
                        <span key={r.name} className="px-1 py-0.5 rounded bg-gray-100 font-medium">
                          {i + 2}. {r.name} ({r.type === "percent" ? "%" : "nombre"})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[6px] font-bold text-gray-500 mb-0.5">Signification des couleurs</p>
                    <div className="flex flex-wrap gap-1.5 text-[6px] text-gray-500">
                      {STATUS_LEGEND.map((s) => (
                        <span key={s.key} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full inline-block border border-gray-300" style={{ backgroundColor: STATUS_COLORS[s.key] }} />
                          {s.label}
                        </span>
                      ))}
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full inline-block border border-gray-300" style={{ backgroundColor: STATUS_COLORS.today }} />
                        Aujourd&apos;hui
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full inline-block border border-gray-300" style={{ backgroundColor: STATUS_COLORS.selected }} />
                        Jour sélectionné
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-200 shadow-sm px-2 py-1.5 shrink-0 flex-wrap">
                <FaCalendarAlt className="text-blue-500 text-[6px]" />
                <span className="text-[6px] font-semibold text-gray-600">Jour affiché (Paramètres, Causes, Actions) :</span>
                <input
                  type="date"
                  value={selectedDateIso}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDateIso(e.target.value);
                  }}
                  className="border border-gray-200 rounded-md px-1 py-0.5 text-[6px]"
                />
                <button onClick={() => setSelectedDateIso(today)} className="text-[6px] font-semibold text-blue-600 hover:underline">
                  Revenir à aujourd&apos;hui
                </button>
                <span className="text-[6px] font-bold text-gray-700 ml-0.5">
                  → {fmtFR(selectedDateIso)}
                  {selectedDateIso === today ? " (aujourd'hui)" : " (historique)"}
                </span>
                {selectedIndexInPeriod === -1 && (
                  <span className="text-[5px] text-amber-600 bg-amber-50 rounded-md px-1 py-0.5">Ce jour n&apos;apparaît pas dans les anneaux pour la période active.</span>
                )}
              </div>
            </div>
            <div className="bg-white w-32 shrink-0 border border-gray-200 rounded-lg p-1.5 flex flex-col">
              <h3 className="text-[6px] font-bold text-gray-600 mb-1 flex items-center gap-1">
                <FaBell className="text-[6px]" /> III. Notifications
              </h3>
              <div className="flex-1 overflow-y-scroll flex flex-col gap-1 max-h-[200px]">
                {notifications.length === 0 && <span className="text-[5px] text-gray-300">Aucune notification</span>}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`text-left px-1 py-0.5 rounded-md text-[5px] ${!n.lu ? "bg-blue-50" : "bg-gray-50"}`}
                  >
                    <div className="text-gray-400">{new Date(n.date_jour).toLocaleDateString('FR-fr')}</div>
                    <div className="text-gray-700 truncate">{n.texte}</div>
                    {n.hasImage && <span className="text-blue-500 font-semibold">Voir l&apos;image</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <section className="grid grid-cols-12 gap-2" style={{ minHeight: 190 }}>
            <div className="col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex flex-col min-h-0">
              <h2 className="text-[6px] font-bold tracking-wide text-gray-700">II. PARAMÈTRES & CAUSES DE NON-PERFORMANCE</h2>
              <p className="text-[5px] text-gray-400 mb-1.5">Données du {fmtFR(selectedDateIso)}</p>

              <div className="flex gap-1.5 flex-1 min-h-0">
                <div className="flex flex-col gap-1 w-[60px] shrink-0">
                  {KPI_ORDER.map((k) => (
                    <button
                      key={k}
                      onClick={() => setSelectedKpi(k)}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-left text-[6px] font-semibold border ${selectedKpi === k ? "border-red-400 text-red-500 bg-red-50" : "border-transparent text-gray-600 hover:bg-gray-50"}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex items-center justify-center text-white text-[5px] font-bold shrink-0" style={{ backgroundColor: KPI_INFO[k].color }}>
                        {k}
                      </span>
                      <span className="truncate">{KPI_INFO[k].label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-h-0 flex flex-row gap-1.5">
                  <div className="w-1/5 border border-gray-200 rounded-lg p-1.5 overflow-auto flex flex-col">
                    <h3 className="text-[6px] font-bold text-gray-500 mb-1">Paramètres</h3>
                    {selectedKpi === "S" && (
                      <>
                        <NumField label="Accidents" unit="accident" value={paramsDraft.accidents ?? ""} onChange={(v) => setDraftField("accidents", v)} />
                        <NumField label="Risques" unit="risque" value={paramsDraft.risques ?? ""} onChange={(v) => setDraftField("risques", v)} />
                      </>
                    )}
                    {selectedKpi === "Q" && (
                      <>
                        <NumField label="Retours clients" unit="retour" value={paramsDraft.retoursClients ?? ""} onChange={(v) => setDraftField("retoursClients", v)} />
                        <NumField label="Nombre de rebuts" unit="pièce" value={paramsDraft.rebuts ?? ""} onChange={(v) => setDraftField("rebuts", v)} />
                        <div className="mb-1.5">
                          <label className="text-[6px] text-gray-500 flex items-center gap-0.5">Quantité totale produite</label>
                          <div className="flex items-center gap-1 mt-0.5">
                            <InputWithKeyboard
                              type="number"
                              readOnly
                              value={paramsQ.quantiteTotale ?? ""}
                              onChange={() => { }}
                              className="w-12 border border-gray-300 rounded-md px-1 py-1 text-[6px] bg-gray-50"
                            />
                            <span className="text-[6px] text-gray-500">pièce</span>
                          </div>
                        </div>
                        <p className="text-[6px] text-gray-500 mt-0.5">
                          Taux de rebut calculé : <span className="font-bold text-gray-700">{tauxRebut.toFixed(1)}%</span>
                        </p>
                      </>
                    )}
                    {selectedKpi === "C" && (
                      <>
                        <NumField label="Quantité produite" unit="pièce" value={paramsC.quantiteProduite ?? ""} onChange={(v) => setDraftField("quantiteProduite", v)} />
                        <NumField label="Temps de cycle ligne" unit="min/pièce" value={paramsDraft.tempsCycleLigne ?? ""} onChange={(v) => setDraftField("tempsCycleLigne", v)} />
                        <p className="text-[6px] text-gray-500 mt-0.5">
                          Quantité objectif (calculée) : <span className="font-bold text-gray-700">{paramsC.quantiteObjectif || 0}</span> pièce
                        </p>
                        <p className="text-[6px] text-gray-500 mt-0.5">
                          {efficienceLabel} calculé(e) : <span className="font-bold text-gray-700">{efficience.toFixed(1)}%</span>
                        </p>
                        <p className="text-[5px] text-gray-400 mt-0.5">Feuille de type « {sheetType === "machine" ? "machine" : "ligne"} »</p>
                      </>
                    )}
                    {selectedKpi === "D" && (
                      <>
                        <NumField label="Quantité produite" unit="pièce" value={paramsD.quantiteProduite ?? ""} onChange={(v) => setDraftField("quantiteProduite", v)} />
                        <NumField label="Quantité planifiée" unit="pièce" value={paramsDraft.quantitePlanifiee ?? ""} onChange={(v) => setDraftField("quantitePlanifiee", v)} />
                        <p className="text-[6px] text-gray-500 mt-0.5">
                          PDP calculé : <span className="font-bold text-gray-700">{pdp.toFixed(1)}%</span>
                        </p>
                      </>
                    )}
                    {selectedKpi === "P" && <NumField label="Absents" unit="personne" value={paramsDraft.absents ?? ""} onChange={(v) => setDraftField("absents", v)} />}

                    {savedMsg && (
                      <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-lg px-1.5 py-1 text-[6px] font-medium mt-auto">
                        <FaCheckCircle />
                        {savedMsg}
                      </div>
                    )}
                  </div>

                  <div className="w-2/5 border border-gray-200 rounded-lg p-1.5 overflow-auto flex flex-col">
                    <h3 className="text-[6px] font-bold text-gray-500 mb-1">Causes de non-performance</h3>

                    {selectedKpi === "S" && (
                      <div className="flex flex-col gap-1.5">
                        <div>
                          <h4 className="text-[6px] font-semibold text-gray-500 mb-1">Place d&apos;injure</h4>
                          <SearchDropdown label="une zone" options={PLACE_OPTIONS} selected={currentSelections.place} onToggleOption={(v) => toggleSelection("place", v)} allowAdd={false} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[6px] font-semibold text-gray-500 mb-1 flex items-center gap-0.5">
                            Risques
                          </h4>
                          <SearchDropdown
                            label="un risque"
                            options={dictionary.risque}
                            selected={currentSelections.risque}
                            onToggleOption={(v) => toggleSelection("risque", v)}
                            allowAdd
                            onAddNew={(val) => addDictionaryEntry("risque", val)}
                          />
                          {currentSelections.risque.length > 0 && (
                            <div className="flex flex-col gap-1 mt-1">
                              {currentSelections.risque.map((v) => (
                                <div key={v} className="flex items-center justify-between gap-1 bg-gray-50 rounded-md px-1 py-0.5">
                                  <span className="text-[6px] text-gray-600 truncate">{v}</span>
                                  <InputWithKeyboard
                                    type="number"
                                    value={risqueQuantities[v] ?? 0}
                                    onChange={(e) => setCauseQuantity('risque', v, Number(e.target.value) || 0)}
                                    className="w-8 border border-gray-300 rounded px-0.5 py-0.5 text-[6px]"
                                  />
                                </div>
                              ))}
                              <p className={`text-[6px] mt-0.5 font-semibold ${risqueSum === (Number(paramsDraft.risques) || 0) ? "text-green-600" : "text-red-500"}`}>
                                Total réparti : {risqueSum} / {Number(paramsDraft.risques) || 0}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedKpi === "Q" && (
                      <div className="flex flex-col gap-1.5">
                        <div>
                          <h4 className="text-[6px] font-semibold text-gray-500 mb-1">Causes des retours client (notifications uniquement)</h4>
                          <textarea
                            value={retourClientNote}
                            onChange={(e) => setRetourClientNote(e.target.value)}
                            placeholder="Décrire la cause du retour client..."
                            className="w-full border border-gray-200 rounded-lg px-1 py-1 text-[6px] outline-none h-8 resize-none"
                          />
                          <input type="file" accept="image/*" onChange={handleImageSelect} className="text-[5px] mt-1" />
                          <button onClick={submitNotification} className="flex items-center gap-1 bg-blue-600 text-white text-[6px] font-semibold px-1.5 py-1 rounded-md mt-1">
                            <FaSave className="text-[5px]" /> Enregistrer (notifications)
                          </button>
                          <p className="text-[5px] text-gray-400 mt-0.5">{notifications.length} notification(s) — exclues des diagrammes.</p>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[6px] font-semibold text-gray-500 mb-1">Type de défaut (avec poste)</h4>
                          <SearchDropdown
                            label="un type de défaut"
                            options={dictionary.defaut}
                            selected={currentSelections.defaut}
                            onToggleOption={(v) => toggleSelection("defaut", v)}
                            allowAdd
                            addExtra={{ options: postes }}
                            onAddNew={({ label, extra }) => addDictionaryEntry("defaut", label, extra)}
                          />
                          {currentSelections.defaut.length > 0 && (
                            <div className="flex flex-col gap-1 mt-1">
                              {currentSelections.defaut.map((v) => (
                                <div key={v} className="flex items-center justify-between gap-1 bg-gray-50 rounded-md px-1 py-0.5">
                                  <span className="text-[6px] text-gray-600 truncate">{v}</span>
                                  <InputWithKeyboard
                                    type="number"
                                    value={defautQuantities[v] ?? 0}
                                    onChange={(e) => setCauseQuantity('defaut', v, Number(e.target.value) || 0)}
                                    className="w-8 border border-gray-300 rounded px-0.5 py-0.5 text-[6px]"
                                  />
                                </div>
                              ))}
                              <p className={`text-[6px] mt-0.5 font-semibold ${defautSum === (Number(paramsDraft.rebuts) || 0) ? "text-green-600" : "text-red-500"}`}>
                                Total réparti : {defautSum} / {Number(paramsDraft.rebuts) || 0}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedKpi === "C" && (
                      <div>
                        <h4 className="text-[6px] font-semibold text-gray-500 mb-1">Temps (min → h automatique)</h4>
                        <div className="grid grid-cols-2 gap-1">
                          <NumField label="Temps d'ouverture" unit="hrs" value={tempsLocal.ouverture} onChange={(v) => setTempsField("ouverture", v)} compact />
                          <NumField label="Temps planifié" unit="min" value={tempsLocal.planifie} onChange={(v) => setTempsField("planifie", v)} compact />
                          <NumField label="Arrêts machine" unit="min" value={tempsLocal.arret} onChange={(v) => setTempsField("arret", v)} compact />
                          <NumField label="Changement série" unit="min" value={tempsLocal.changement} onChange={(v) => setTempsField("changement", v)} compact />
                          <NumField label="Rupture de stock" unit="min" value={tempsLocal.rupture} onChange={(v) => setTempsField("rupture", v)} compact />
                          <NumField label="Autre" unit="min" value={tempsLocal.autre} onChange={(v) => setTempsField("autre", v)} compact />
                          <NumField label="Temps de gammes" unit="min/pièce" value={tempsLocal.gammes} onChange={(v) => setTempsField("gammes", v)} compact />
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <TimeResult label="Temps requis" hours={toH(tempsRequisMin)} />
                          <TimeResult label="Temps de fonctionnement" hours={toH(tempsFonctionnementMin)} />
                          <TimeResult label="Temps utile" hours={toH(tempsUtileMin)} />
                          <TimeResult label="Temps de non qualité" hours={toH(tempsNonQualiteMin)} />
                          <TimeResult label="Temps net" hours={toH(tempsNetMin)} />
                          <TimeResult label="Temps de ralentissement" hours={toH(tempsRalentissementMin)} />
                        </div>
                        /* {tempsRalentissementMin < 0 &&
                          <div className="w-full flex justify-center items-center gap-1 text-red-500 font-bold mt-2">
                            <FaExclamationTriangle size={8} className="-translate-y-[1px]" />Impossible de produire cette quantité dans ce temps de fonctionnement
                          </div>
                        } */
                      </div>
                    )}

                    {selectedKpi === "D" && (
                      <div>
                        <h4 className="text-[6px] font-semibold text-gray-500 mb-1">Tickets attachés au bord</h4>
                        <div className="flex flex-col gap-1 max-h-20 overflow-auto">
                          {tickets.map((t) => (
                            <div key={t.id} className="flex items-start gap-1 bg-amber-50 border border-amber-100 rounded-lg px-1.5 py-1">
                              <span className="text-amber-500 font-bold text-[6px] mt-0.5">+</span>
                              <div className="text-[6px] leading-tight">
                                <div className="font-semibold text-gray-700">{t.titre}</div>
                                <div className="text-gray-400">{t.sous}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[5px] text-gray-400 mt-1">Gérez l&apos;ajout de tickets depuis la section IV. Parétos.</p>
                      </div>
                    )}

                    {selectedKpi === "P" && (
                      <div>
                        <h4 className="text-[6px] font-semibold text-gray-500 mb-1">Causes de l&apos;absence</h4>
                        <SearchDropdown
                          label="une cause"
                          options={dictionary.absence}
                          selected={currentSelections.absence}
                          onToggleOption={(v) => toggleSelection("absence", v)}
                          allowAdd
                          onAddNew={(val) => addDictionaryEntry("absence", val)}
                        />
                        {currentSelections.absence.length > 0 && (
                          <div className="flex flex-col gap-1 mt-1">
                            {currentSelections.absence.map((v) => (
                              <div key={v} className="flex items-center justify-between gap-1 bg-gray-50 rounded-md px-1 py-0.5">
                                <span className="text-[6px] text-gray-600 truncate">{v}</span>
                                <InputWithKeyboard
                                  type="number"
                                  value={absenceQuantities[v] ?? 0}
                                  onChange={(e) => setCauseQuantity('absence', v, Number(e.target.value) || 0)}
                                  className="w-8 border border-gray-300 rounded px-0.5 py-0.5 text-[6px]"
                                />
                              </div>
                            ))}
                            <p className={`text-[6px] mt-0.5 font-semibold ${absenceSum === (Number(paramsDraft.absents) || 0) ? "text-green-600" : "text-red-500"}`}>
                              Total réparti : {absenceSum} / {Number(paramsDraft.absents) || 0}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg p-1.5 w-2/5">
                    <h4 className="text-[6px] font-semibold text-gray-500 mb-1">
                      Tendance hebdomadaire — {KPI_INFO[selectedKpi].label}
                      <span className="text-gray-400 font-normal ml-0.5">
                        ({fmtFR(trendStart)} → {fmtFR(selectedDateIso)})
                      </span>
                    </h4>
                    <div style={{ width: "100%", height: "100%" }}>
                      <ResponsiveContainer>
                        <ComposedChart data={kpiTrend}>
                          <CartesianGrid vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="date" tick={{ fontSize: 5 }} tickFormatter={(d) => fmtFR(d)} />
                          <YAxis tick={{ fontSize: 5 }} width={15} />
                          <Tooltip labelFormatter={(d) => fmtFR(d)} />
                          <Line type="monotone" dataKey="valeur" stroke={KPI_INFO[selectedKpi].color} strokeWidth={1} dot={{ r: 1.5 }} connectNulls />
                          {selectedKpi === "C" && (
                            <>
                              <Line type="monotone" dataKey="disponibilite" stroke="#1E88E5" strokeWidth={1} dot={{ r: 1 }} connectNulls />
                              <Line type="monotone" dataKey="performance" stroke="#43A047" strokeWidth={1} dot={{ r: 1 }} connectNulls />
                              <Line type="monotone" dataKey="qualite" stroke="#8E24AA" strokeWidth={1} dot={{ r: 1 }} connectNulls />
                            </>
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {selectedKpi === "C" && (
                      <div className="flex items-center gap-1.5 text-[5px] text-gray-400 mt-0.5">
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-0.5 bg-[#FB8C00] inline-block" />TRS/Efficience</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-0.5 bg-[#1E88E5] inline-block" />Disponibilité</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-0.5 bg-[#43A047] inline-block" />Performance</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-0.5 bg-[#8E24AA] inline-block" />Qualité</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex flex-col min-h-0">
              <h2 className="text-[6px] font-bold tracking-wide text-gray-700">V. PLAN D&apos;ACTIONS</h2>
              <p className="text-[5px] text-gray-400 mb-1">
                {actionsTab === "tableau"
                  ? `Problèmes ${KPI_INFO[selectedKpi].label} du ${fmtFR(selectedDateIso)}`
                  : `Planning dynamique — ${KPI_INFO[selectedKpi].label}`}
              </p>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                  <button onClick={() => setActionsTab("tableau")} className={`px-1.5 py-1 rounded-md text-[6px] font-semibold ${actionsTab === "tableau" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
                    Tableau des problèmes
                  </button>
                  <button onClick={() => setActionsTab("planning")} className={`px-1.5 py-1 rounded-md text-[6px] font-semibold ${actionsTab === "planning" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
                    Planning dynamique
                  </button>
                </div>
              </div>

              {actionsTab === "tableau" && (
                <>
                  <div className="flex items-center gap-1 mb-1.5">
                    <button onClick={addRow} className="flex items-center gap-1 bg-blue-600 text-white text-[6px] font-semibold px-1.5 py-1 rounded-md">
                      <FaPlus className="text-[5px]" /> Ajouter une ligne
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full text-[6px]">
                      <thead>
                        <tr className="text-gray-400 text-left border-b border-gray-100">
                          <th className="py-1 font-semibold">Problème</th>
                          <th className="py-1 font-semibold">Action</th>
                          <th className="py-1 font-semibold">Pilote</th>
                          <th className="py-1 font-semibold">Statut</th>
                          <th className="py-1 font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {actions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-gray-300 py-3 text-[6px]">
                              Aucun problème pour ce jour.
                            </td>
                          </tr>
                        )}
                        {actions.map((row) => {
                          const isEditing = editingId === row.id;
                          return (
                            <tr key={row.id} className="border-b border-gray-50 align-top">
                              {isEditing ? (
                                <>
                                  <td className="py-1 pr-0.5">
                                    <InputWithKeyboard
                                      value={draft.probleme}
                                      onChange={(e) => setDraft({ ...draft, probleme: e.target.value })}
                                      className="w-full border border-gray-200 rounded px-1 py-0.5 text-[6px]"
                                    />
                                  </td>
                                  <td className="py-1 pr-0.5">
                                    <InputWithKeyboard
                                      value={draft.action}
                                      onChange={(e) => setDraft({ ...draft, action: e.target.value })}
                                      className="w-full border border-gray-200 rounded px-1 py-0.5 text-[6px]"
                                    />
                                  </td>
                                  <td className="py-1 pr-0.5">
                                    <InputWithKeyboard
                                      value={draft.pilote}
                                      onChange={(e) => setDraft({ ...draft, pilote: e.target.value })}
                                      className="w-full border border-gray-200 rounded px-1 py-0.5 text-[6px]"
                                    />
                                  </td>
                                  <td className="py-1 pr-0.5">
                                    <select value={draft.statut} onChange={(e) => setDraft({ ...draft, statut: e.target.value })} className="w-full border border-gray-200 rounded px-0.5 py-0.5 text-[6px]">
                                      <option>À faire</option>
                                      <option>En cours</option>
                                      <option>Terminé</option>
                                    </select>
                                  </td>
                                  <td className="py-1">
                                    <button onClick={saveEdit} className="text-green-600 p-0.5">
                                      <FaSave className="text-[6px]" />
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-1 text-gray-700">{row.probleme}</td>
                                  <td className="py-1 text-gray-500">{row.action}</td>
                                  <td className="py-1 text-gray-500">{row.pilote}</td>
                                  <td className="py-1">
                                    <span
                                      className={`px-1 py-0.5 rounded-md text-[5px] font-semibold ${row.statut === "En cours" ? "bg-orange-100 text-orange-600" : row.statut === "Terminé" ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-500"
                                        }`}
                                    >
                                      {row.statut}
                                    </span>
                                  </td>
                                  <td className="py-1">
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => startEdit(row)} className="text-gray-400 hover:text-blue-600">
                                        <FaEdit className="text-[6px]" />
                                      </button>
                                      <button onClick={() => deleteRow(row.id)} className="text-gray-400 hover:text-red-600">
                                        <FaTrash className="text-[6px]" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {actionsTab === "planning" && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-1 mb-1">
                    <button onClick={() => setPlanningWeekStart(addDaysIso(planningWeekStart, -7))} className="p-1 border border-gray-200 rounded-md text-gray-500">
                      <FaChevronLeft className="text-[5px]" />
                    </button>
                    <input
                      type="date"
                      value={planningWeekStart}
                      onChange={(e) => {
                        if (e.target.value) setPlanningWeekStart(e.target.value);
                      }}
                      className="border border-gray-200 rounded-md px-1 py-0.5 text-[6px]"
                    />
                    <button onClick={() => setPlanningWeekStart(addDaysIso(planningWeekStart, 7))} className="p-1 border border-gray-200 rounded-md text-gray-500">
                      <FaChevronRight className="text-[5px]" />
                    </button>
                    <span className="text-[5px] text-gray-400 ml-0.5">Glissez-déposez un ticket entre les jours</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto grid grid-cols-7 gap-1 text-[5px]">
                    {selectedWeekDays.map((d) => (
                      <div
                        key={d}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragInfo) moveTicket(dragInfo.id, d);
                          setDragInfo(null);
                        }}
                        className="bg-gray-50 rounded-lg p-1 flex flex-col gap-0.5 min-w-[35px] border border-transparent hover:border-blue-200"
                      >
                        <span className="font-bold text-gray-600 capitalize">{formatShortDay(d)}</span>
                        <div className="flex-1 flex flex-col gap-0.5">
                          {(ticketsByDate[d] || []).map((t) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={() => setDragInfo({ id: t.id })}
                              onDragEnd={() => setDragInfo(null)}
                              className={`rounded-md border-y-2 px-1 py-1 cursor-grab active:cursor-grabbing shadow-sm ${t.statut === "En cours" ? "bg-orange-50 border-orange-400" : t.statut === "Terminé" ? "bg-green-50 border-green-400" : "bg-blue-50 border-blue-400"
                                }`}
                            >
                              <div className="font-semibold text-gray-700 break-words whitespace-normal">{t.probleme}</div>
                              {t.detailAction && <div className="text-gray-500 break-words whitespace-normal">{t.detailAction}</div>}
                              <div className="flex items-center justify-between mt-0.5">
                                {t.pilote && <span className="text-[4px] bg-white border border-gray-200 rounded-full px-1 py-0.5 text-gray-500">{t.pilote}</span>}
                                {t.statut && <span className="text-[4px] font-semibold text-gray-400">{t.statut}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="bg-blue-50 rounded-lg p-1 flex flex-col gap-0.5 overflow-auto">
                      <span className="font-bold text-blue-700">Sem. suivante</span>
                      <span className="text-blue-400 text-[4px]">Lecture seule</span>
                      {nextWeekDays.flatMap((d) => (ticketsByDate[d] || []).map((t) => (
                        <div key={t.id} className="bg-white border border-blue-100 rounded px-1 py-0.5 text-gray-600">
                          <span className="font-semibold capitalize">{formatShortDay(d)}</span> : {t.probleme}
                        </div>
                      )))}
                    </div>
                    <div className="bg-purple-50 rounded-lg p-1 flex flex-col gap-0.5 overflow-auto">
                      <span className="font-bold text-purple-700">Sem. +2</span>
                      <span className="text-purple-400 text-[4px]">Lecture seule</span>
                      {weekAfterDays.flatMap((d) => (ticketsByDate[d] || []).map((t) => (
                        <div key={t.id} className="bg-white border border-purple-100 rounded px-1 py-0.5 text-gray-600">
                          <span className="font-semibold capitalize">{formatShortDay(d)}</span> : {t.probleme}
                        </div>
                      )))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-[6px] font-bold tracking-wide text-gray-700">IV. PARETOS</h2>
              <div className="flex items-center gap-1 text-[6px] text-gray-500">
                Période Pareto :
                <select value={paretoPeriod} onChange={(e) => setParetoPeriod(e.target.value)} className="border border-gray-200 rounded-md px-1 py-0.5 text-[6px]">
                  <option value="jour">Cette journée</option>
                  <option value="semaine">Dernière semaine</option>
                  <option value="mois">Dernier mois</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <ParetoCard title="SÉCURITÉ" color="#E53935" letter="S">
                <p className="text-[6px] text-gray-400 mb-0.5">Bilan des blessures</p>
                <div className="flex items-center gap-0.5">
                  <BodySilhouette injuries={bodyInjuries} />
                  <MiniPareto data={paretoStats ? paretoStats.risquesPareto : []} barColor="#E53935" lineColor="#3B82F6" />
                </div>
                <ChartLegend barLabel="Nombre" barColor="#E53935" />
              </ParetoCard>

              <ParetoCard title="QUALITÉ" color="#8E24AA" letter="Q">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[6px] text-gray-400">Types de défaut (Pareto)</p>
                  <select value={paretoPoste} onChange={(e) => setParetoPoste(e.target.value)} className="border border-gray-200 rounded-md px-1 py-0.5 text-[5px]">
                    <option value="">Tous les postes</option>
                    {postes.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <MiniPareto data={paretoStats ? paretoStats.defautsPareto : []} barColor="#A855F7" lineColor="#3B82F6" />
                <ChartLegend barLabel="Nombre" barColor="#A855F7" />
              </ParetoCard>

              <ParetoCard title="COÛT" color="#FB8C00" letter="C">
                <p className="text-[6px] text-gray-400 mb-0.5">Temps (heures, somme période)</p>
                <div style={{ width: "100%", height: 150 }}>
                  <ResponsiveContainer>
                    <BarChart data={paretoStats ? paretoStats.tempsCout.filter(item => item.name !== "Temps\nrequis") : []} margin={{ top: 2, right: 2, left: 0, bottom: 14 }}>
                      <CartesianGrid vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 4 }} interval={0} angle={-40} textAnchor="end" height={30} tickMargin={2} />
                      <YAxis tick={{ fontSize: 5 }} width={20} />
                      <Tooltip />
                      <Bar dataKey="valeur" fill="#FB8C00" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ParetoCard>

              <ParetoCard title="DÉLAI" color="#1E88E5" letter="D">
                <p className="text-[6px] text-gray-400 mb-1">Tableau des tickets</p>
                <div className="flex flex-col gap-1 max-h-[75px] overflow-auto">
                  {tickets.map((t) => (
                    <div key={t.id} className="flex items-start gap-1 bg-amber-50 border border-amber-100 rounded-lg px-1.5 py-1">
                      <span className="text-amber-500 font-bold text-[6px] mt-0.5">+</span>
                      <div className="text-[6px] leading-tight">
                        <div className="font-semibold text-gray-700">{t.titre}</div>
                        <div className="text-gray-400">{t.sous}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {addingTicket ? (
                  <div className="flex flex-row flex-wrap gap-1 mt-1">
                    <InputWithKeyboard
                      autoFocus
                      value={newTicketTitre}
                      onChange={(e) => setNewTicketTitre(e.target.value)}
                      placeholder="Titre du ticket..."
                      className="border border-gray-200 rounded-md px-1 py-1 text-[6px] outline-none"
                    />
                    <InputWithKeyboard
                      value={newTicketSous}
                      onChange={(e) => setNewTicketSous(e.target.value)}
                      placeholder="Détail..."
                      className="border border-gray-200 rounded-md px-1 py-1 text-[6px] outline-none"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={handleAddTicket} className="flex items-center gap-0.5 bg-blue-600 text-white text-[6px] font-semibold px-1.5 py-1 rounded-md">
                        <FaSave className="text-[5px]" /> Enregistrer
                      </button>
                      <button
                        onClick={() => {
                          setAddingTicket(false);
                          setNewTicketTitre("");
                          setNewTicketSous("");
                        }}
                        className="text-gray-400 text-[6px] px-0.5"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingTicket(true)} className="flex items-center gap-1 text-blue-600 text-[6px] font-semibold mt-1">
                    <FaPlus className="text-[4px]" /> Ajouter un ticket
                  </button>
                )}
              </ParetoCard>

              <ParetoCard title="PERSONNEL" color="#43A047" letter="P">
                <p className="text-[6px] text-gray-400 mb-0.5">Causes d&apos;absence</p>
                <div style={{ width: "100%", height: 140 }}>
                  <ResponsiveContainer>
                    <BarChart data={paretoStats ? paretoStats.absences : []} margin={{ top: 2, right: 2, left: 0, bottom: 14 }}>
                      <CartesianGrid vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 5 }} interval={0} angle={-40} textAnchor="end" height={30} tickMargin={2} />
                      <YAxis tick={{ fontSize: 5 }} width={20} />
                      <Tooltip />
                      <Bar dataKey="valeur" fill="#43A047" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ParetoCard>
            </div>
          </section>
        </main>
      </div>

      {viewedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewedNotification(null)}>
          <div className="bg-white rounded-lg p-2 max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[6px] font-bold text-gray-700">{new Date(viewedNotification.date_jour).toLocaleDateString('FR-fr')}</span>
              <button onClick={() => setViewedNotification(null)} className="text-gray-400">
                <FaTimes />
              </button>
            </div>
            <p className="text-[6px] text-gray-600 mb-1">{viewedNotification.texte}</p>
            {viewedNotification.hasImage ? (
              <img src={`/api/notifications/${viewedNotification.id}`} alt="notification" className="max-w-full rounded-md" />
            ) : (
              <p className="text-[5px] text-gray-300">Aucune image</p>
            )}
          </div>
        </div>
      )}
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
