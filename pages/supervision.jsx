import { useEffect, useState, useMemo } from "react";
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
  FaTimes,
  FaChevronDown,
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
import { apiGet } from "../lib/apiClient";
import { addDaysIso, todayIso, fmtFR, fmtWeekLabel, getMondayIso, computeTrailingWeeks, fmtWeekLabelShort } from "../lib/dateUtils";
import { KPI_ORDER, KPI_INFO, STATUS_COLORS, STATUS_LEGEND, PLACE_COORDS, getRingConfig, KPI_TREND_FIELDS } from "../lib/kpiLogic";

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

function MultiRingGauge({ kpiKey, ringConfig, weeks, todayWeekIndex, selectedWeekIndex, isActive, onClick }) {
  const info = KPI_INFO[kpiKey];
  const size = 105;
  const cx = size / 2;
  const cy = size / 2;
  const baseR = 23;
  const ringWidth = 8;
  const ringGap = 1;
  const segments = Math.max(weeks.length, 1);
  const gapDeg = segments > 20 ? 1.2 : 3.5;
  const anglePer = 360 / segments;
  const fontSize = segments > 25 ? 3 : segments > 15 ? 4 : 5;

  const weekRingCells = weeks.map((w, i) => ({
    status: i === todayWeekIndex ? "today" : i === selectedWeekIndex ? "selected" : "white",
    text: `S${i + 1}`,
  }));

  const allRings = [
    { name: "Semaines", isDayRing: true, cells: weekRingCells },
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
                const textColor = ring.isDayRing
                  ? i === todayWeekIndex || i === selectedWeekIndex
                    ? "#1E3A8A"
                    : "#374151"
                  : cell.status === "white"
                    ? "#4B5563"
                    : "#FFFFFF";
                return (
                  <g key={i}>
                    <path d={path} fill="none" stroke={STATUS_COLORS[cell.status]} strokeWidth={ringWidth}>
                      <title>
                        {ring.name} — {weekRingCells[i] ? weekRingCells[i].text : ""} : {ring.isDayRing ? "" : cell.text}
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
          <YAxis yAxisId="left" tick={{ fontSize: 5 }} width={10} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 5 }} width={13} />
          <Tooltip />
          <Bar yAxisId="left" dataKey="nombre" fill={barColor} radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="cumule" stroke={lineColor} strokeWidth={1} dot={{ r: 1.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiTrendMini({ kpiKey, data }) {
  const trendFields = KPI_TREND_FIELDS[kpiKey] || [];
  const hasPercent = trendFields.some((f) => f.type === "percent");
  const hasCount = trendFields.some((f) => f.type === "count");
  const mixedAxes = hasPercent && hasCount;

  return (
    <div className="flex-1 min-w-0 border border-gray-200 rounded-lg p-1 flex flex-col">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="w-2 h-2 rounded-full flex items-center justify-center text-white text-[4px] font-bold shrink-0" style={{ backgroundColor: KPI_INFO[kpiKey].color }}>
          {kpiKey}
        </span>
        <span className="text-[6px] font-bold text-gray-600 truncate">{KPI_INFO[kpiKey].label}</span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 2, right: 2, left: 0, bottom: 14 }}>
            <CartesianGrid vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="weekStart"
              tickFormatter={(v) => fmtWeekLabelShort(v)}
              tick={{ fontSize: 3 }}
              interval={0}
              angle={-60}
              textAnchor="end"
              height={30}
              tickMargin={2}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 4 }} width={12} />
            {mixedAxes && <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 4 }} width={12} />}
            <Tooltip labelFormatter={(v) => fmtWeekLabel(v)} />
            {trendFields.map((f) => (
              <Line
                key={f.key}
                yAxisId={mixedAxes && f.type === "percent" ? "right" : "left"}
                type="monotone"
                dataKey={f.key}
                name={f.label}
                stroke={f.color}
                strokeWidth={1.2}
                dot={{ r: 1 }}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-[4px] text-gray-500 mt-0.5">
        {trendFields.map((f) => (
          <span key={f.key} className="flex items-center gap-0.5">
            <span className="w-1 h-0.5 inline-block" style={{ backgroundColor: f.color }} />
            {f.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SupervisionPage() {
  const router = useRouter();
  const { sheet: sheetCode } = router.query;

  const [sheet, setSheet] = useState(null);
  const [allSheets, setAllSheets] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    apiGet("/api/sheets").then((rows) => {
      setAllSheets(rows);
      if (sheetCode) {
        const found = rows.find((s) => s.code === sheetCode);
        if (found) setSheet(found);
        else if (rows.length) router.replace(`/supervision?sheet=${rows[0].code}`);
        else setLoadError("Aucune feuille disponible.");
      } else if (rows.length) {
        router.replace(`/supervision?sheet=${rows[0].code}`);
      } else {
        setLoadError("Aucune feuille disponible.");
      }
    }).catch((e) => setLoadError(e.message));
  }, [sheetCode]);

  const today = todayIso();
  const thisMonday = getMondayIso(today);

  const [selectedWeekStart, setSelectedWeekStart] = useState(thisMonday);
  const weekRangeEnd = addDaysIso(selectedWeekStart, 6);
  const periodLabel = fmtWeekLabel(selectedWeekStart);

  const trailingWeeks = useMemo(() => computeTrailingWeeks(selectedWeekStart, 8), [selectedWeekStart]);
  const todayWeekIndex = trailingWeeks.indexOf(thisMonday);
  const selectedWeekIndex = trailingWeeks.indexOf(selectedWeekStart);

  const [selectedKpi, setSelectedKpi] = useState("S");
  const sheetType = sheet ? sheet.type : "ligne";

  const [kpiWeekly, setKpiWeekly] = useState(null);
  useEffect(() => {
    if (!sheet) return;
    const params = new URLSearchParams({ sheetId: sheet.id, weeks: trailingWeeks.join(","), sheetType });
    apiGet(`/api/supervisionKpi?${params.toString()}`).then(setKpiWeekly).catch(() => { });
  }, [sheet, trailingWeeks, sheetType]);

  const [trendByKpi, setTrendByKpi] = useState({});
  useEffect(() => {
    if (!sheet) return;
    KPI_ORDER.forEach((k) => {
      const params = new URLSearchParams({ sheetId: sheet.id, kpi: k, weeks: trailingWeeks.join(",") });
      apiGet(`/api/supervisionTrend?${params.toString()}`)
        .then((data) => setTrendByKpi((prev) => ({ ...prev, [k]: data })))
        .catch(() => { });
    });
  }, [sheet, trailingWeeks]);

  const [postes, setPostes] = useState([]);
  useEffect(() => {
    if (!sheet) return;
    apiGet(`/api/postes?sheetId=${sheet.id}`).then((rows) => setPostes(rows.map((p) => p.nom))).catch(() => { });
  }, [sheet]);

  const [paretoPoste, setParetoPoste] = useState("");
  const [paretoStats, setParetoStats] = useState(null);
  useEffect(() => {
    if (!sheet) return;
    const params = new URLSearchParams({ sheetId: sheet.id, startDate: selectedWeekStart, endDate: weekRangeEnd });
    if (paretoPoste) params.set("poste", paretoPoste);
    apiGet(`/api/paretoStats?${params.toString()}`).then(setParetoStats).catch(() => { });
  }, [sheet, selectedWeekStart, weekRangeEnd, paretoPoste]);

  const [tickets, setTickets] = useState([]);
  useEffect(() => {
    if (!sheet) return;
    apiGet(`/api/paretoTickets?sheetId=${sheet.id}`).then(setTickets).catch(() => { });
  }, [sheet]);

  const [notifications, setNotifications] = useState([]);
  const [viewedNotification, setViewedNotification] = useState(null);
  useEffect(() => {
    if (!sheet) return;
    const params = new URLSearchParams({ sheetId: sheet.id, startDate: selectedWeekStart, endDate: weekRangeEnd });
    apiGet(`/api/notifications?${params.toString()}`).then(setNotifications).catch(() => { });
  }, [sheet, selectedWeekStart, weekRangeEnd]);

  const [actions, setActions] = useState([]);
  useEffect(() => {
    if (!sheet) return;
    const params = new URLSearchParams({ sheetId: sheet.id, startDate: selectedWeekStart, endDate: weekRangeEnd, kpi: selectedKpi });
    apiGet(`/api/actions?${params.toString()}`).then(setActions).catch(() => { });
  }, [sheet, selectedWeekStart, weekRangeEnd, selectedKpi]);

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
          <Link href="/" className="flex items-center gap-1 px-2.5 py-2.5 border-b border-white/10">
            <div className="w-4 h-4 rounded-md bg-white/10 flex items-center justify-center">
              <FaCogs className="text-white text-[7px]" />
            </div>
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
                className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg font-medium text-gray-300 hover:bg-white/5"
              >
                {s.type === "machine" ? <FaCogs className="text-[7px]" /> : <FaPlane className="text-[7px]" />}
                {s.label}
              </Link>
            ))}
            <Link href={`/supervision?sheet=${sheet.code}`} className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg bg-[#7A1E22] text-white text-left">
              <FaChartBar className="text-[7px]" />
              Supervision hebdomadaire
            </Link>
          </nav>
        </div>
        <div className="px-1.5 pb-2">
          <div className="px-1 pt-1.5 pb-1 text-[6px] tracking-wider text-gray-400 font-semibold border-t border-white/10">PARAMÈTRES GÉNÉRAUX</div>
          <button className="w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-gray-300 hover:bg-white/5">
            <FaCog className="text-[7px]" />
            Postes
          </button>
          <button className="w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-gray-300 hover:bg-white/5">
            <FaUsers className="text-[7px]" />
            Utilisateurs
          </button>
          <Link href="/" className="w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-red-400 hover:bg-white/5 mt-1">
            <FaSignOutAlt className="text-[7px]" />
            QUITTER
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white border-b border-gray-200">
          <div className="h-[32px] flex items-center justify-between px-3">
            <h1 className="font-bold text-[9px] text-gray-800 tracking-tight">SUPERVISION HEBDOMADAIRE - {sheet.label.toUpperCase()}</h1>
            <div className="flex items-center gap-1">
              <div className="relative">
                <select
                  value={sheet.code}
                  onChange={(e) => router.push(`/supervision?sheet=${e.target.value}`)}
                  className="border border-gray-200 rounded-md pl-1.5 pr-4 py-1 text-[6px] font-semibold text-gray-600 appearance-none"
                >
                  {allSheets.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-[5px] pointer-events-none" />
              </div>
              <span className="text-[6px] font-semibold text-gray-400 mr-0.5 ml-1">SEMAINE</span>
              <FaCalendarAlt className="text-blue-500 text-[6px]" />
              <input
                type="date"
                value={selectedWeekStart}
                onChange={(e) => {
                  if (e.target.value) setSelectedWeekStart(getMondayIso(e.target.value));
                }}
                className="border border-gray-200 rounded-md px-1 py-0.5 text-[6px]"
              />
              <button onClick={() => setSelectedWeekStart(thisMonday)} className="text-[6px] font-semibold text-blue-600 hover:underline">
                Semaine actuelle
              </button>
              <div className="flex items-center gap-1 ml-1 px-1.5 py-1 rounded-md bg-gray-100 text-[6px] font-medium text-gray-600">
                {periodLabel}
                {selectedWeekStart === thisMonday ? " (en cours)" : " (historique)"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[6px] text-gray-400">Aujourd&apos;hui : {fmtFR(today)}</span>
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[6px] font-bold">A</div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-2 flex gap-2 overflow-auto">
          <div className="w-2/3 flex flex-col gap-2 min-w-0">
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2 shrink-0">
              <h2 className="text-[6px] font-bold tracking-wide text-gray-700 mb-1">I. INDICATEURS KPI</h2>
              <div className="flex items-center justify-around">
                {KPI_ORDER.map((k) => (
                  <MultiRingGauge
                    key={k}
                    kpiKey={k}
                    ringConfig={kpiWeekly ? kpiWeekly.kpis[k] : []}
                    weeks={trailingWeeks}
                    todayWeekIndex={todayWeekIndex}
                    selectedWeekIndex={selectedWeekIndex}
                    isActive={selectedKpi === k}
                    onClick={() => setSelectedKpi(k)}
                  />
                ))}
              </div>
              <div className="flex items-start justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                <div>
                  <p className="text-[6px] font-bold text-gray-500 mb-0.5">Anneaux — {KPI_INFO[selectedKpi].label} (8 dernières semaines jusqu&apos;à la semaine sélectionnée)</p>
                  <div className="flex flex-wrap gap-1.5 text-[6px] text-gray-500">
                    <span className="px-1 py-0.5 rounded bg-gray-100 font-medium">1. Semaines (S1 → S8)</span>
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
                      Semaine actuelle
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full inline-block border border-gray-300" style={{ backgroundColor: STATUS_COLORS.selected }} />
                      Semaine sélectionnée
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex-1 min-h-0 flex flex-col">
              <h2 className="text-[6px] font-bold tracking-wide text-gray-700">II. PARAMÈTRES DES KPIS</h2>
              <p className="text-[5px] text-gray-400 mb-1.5">Tendance sur 8 semaines (moyenne somme/somme) — jusqu&apos;au {fmtFR(weekRangeEnd)}</p>

              <div className="flex-1 min-h-0 flex gap-1.5">
                {KPI_ORDER.map((k) => (
                  <KpiTrendMini key={k} kpiKey={k} data={trendByKpi[k] || []} />
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-[6px] font-bold tracking-wide text-gray-700">IV. PARETOS</h2>
                <span className="text-[6px] text-gray-500">{periodLabel}</span>
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
                  <p className="text-[6px] text-gray-400 mb-0.5">Temps (heures, somme semaine)</p>
                  <div style={{ width: "100%", height: 150 }}>
                    <ResponsiveContainer>
                      <BarChart data={paretoStats ? paretoStats.tempsCout : []} margin={{ top: 2, right: 2, left: 0, bottom: 14 }}>
                        <CartesianGrid vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" tick={{ fontSize: 4 }} interval={0} angle={-40} textAnchor="end" height={30} tickMargin={2} />
                        <YAxis tick={{ fontSize: 5 }} width={11} />
                        <Tooltip />
                        <Bar dataKey="valeur" fill="#FB8C00" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ParetoCard>

                <ParetoCard title="DÉLAI" color="#1E88E5" letter="D">
                  <p className="text-[6px] text-gray-400 mb-1">Tableau des tickets</p>
                  <div className="flex flex-col gap-1 max-h-[110px] overflow-auto">
                    {tickets.map((t) => (
                      <div key={t.id} className="flex items-start gap-1 bg-amber-50 border border-amber-100 rounded-lg px-1.5 py-1">
                        <span className="text-amber-500 font-bold text-[6px] mt-0.5">+</span>
                        <div className="text-[6px] leading-tight">
                          <div className="font-semibold text-gray-700">{t.titre}</div>
                          <div className="text-gray-400">{t.sous}</div>
                        </div>
                      </div>
                    ))}
                    {tickets.length === 0 && <span className="text-[6px] text-gray-300">Aucun ticket</span>}
                  </div>
                </ParetoCard>

                <ParetoCard title="PERSONNEL" color="#43A047" letter="P">
                  <p className="text-[6px] text-gray-400 mb-0.5">Causes d&apos;absence</p>
                  <div style={{ width: "100%", height: 140 }}>
                    <ResponsiveContainer>
                      <BarChart data={paretoStats ? paretoStats.absences : []} margin={{ top: 2, right: 2, left: 0, bottom: 14 }}>
                        <CartesianGrid vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" tick={{ fontSize: 5 }} interval={0} angle={-40} textAnchor="end" height={30} tickMargin={2} />
                        <YAxis tick={{ fontSize: 5 }} width={11} />
                        <Tooltip />
                        <Bar dataKey="valeur" fill="#43A047" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ParetoCard>
              </div>
            </section>
          </div>

          <div className="w-1/3 flex flex-col gap-2 min-w-0">
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 shrink-0">
              <h2 className="text-[6px] font-bold tracking-wide text-gray-700 mb-1 flex items-center gap-1">
                <FaBell className="text-[6px]" /> III. NOTIFICATIONS
              </h2>
              <div className="flex flex-col gap-1 max-h-[160px] overflow-auto">
                {notifications.length === 0 && <span className="text-[6px] text-gray-300">Aucune notification sur la semaine</span>}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setViewedNotification(n)}
                    className={`text-left px-1.5 py-1 rounded-md text-[6px] ${!n.lu ? "bg-blue-50" : "bg-gray-50"}`}
                  >
                    <div className="text-gray-400 text-[5px]">{fmtFR(n.date_jour)}</div>
                    <div className="text-gray-700">{n.texte}</div>
                    {n.hasImage && <span className="text-blue-500 font-semibold text-[5px]">Voir l&apos;image</span>}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex-1 min-h-0 flex flex-col">
              <h2 className="text-[6px] font-bold tracking-wide text-gray-700 mb-0.5">V. PLAN D&apos;ACTIONS</h2>
              <p className="text-[5px] text-gray-400 mb-1.5">{KPI_INFO[selectedKpi].label} — {periodLabel}</p>
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-[6px]">
                  <thead>
                    <tr className="text-gray-400 text-left border-b border-gray-100">
                      <th className="py-1 font-semibold">Date</th>
                      <th className="py-1 font-semibold">Problème</th>
                      <th className="py-1 font-semibold">Action</th>
                      <th className="py-1 font-semibold">Pilote</th>
                      <th className="py-1 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-300 py-3 text-[6px]">
                          Aucun problème sur la semaine.
                        </td>
                      </tr>
                    )}
                    {actions.map((row) => (
                      <tr key={row.id} className="border-b border-gray-50 align-top">
                        <td className="py-1 text-gray-400">{fmtFR(row.date)}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {viewedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewedNotification(null)}>
          <div className="bg-white rounded-lg p-2 max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[6px] font-bold text-gray-700">{fmtFR(viewedNotification.date_jour)}</span>
              <button onClick={() => setViewedNotification(null)} className="text-gray-400">
                <FaTimes />
              </button>
            </div>
            <p className="text-[6px] text-gray-600 mb-1">{viewedNotification.texte}</p>
            {viewedNotification.hasImage ? (
              <img src={`/api/notifications/${viewedNotification.id}/image`} alt="notification" className="max-w-full rounded-md" />
            ) : (
              <p className="text-[5px] text-gray-300">Aucune image</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}