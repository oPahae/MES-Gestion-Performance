import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaPlane,
  FaCogs,
  FaChartBar,
  FaClipboardList,
  FaSignOutAlt,
  FaCalendarAlt,
  FaInfoCircle,
} from "react-icons/fa";
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { apiGet } from "../lib/apiClient";
import { addDaysIso, todayIso, fmtFR } from "../lib/dateUtils";
import { KPI_ORDER, KPI_INFO, STATUS_COLORS, STATUS_LEGEND, PLACE_COORDS, getRingConfig } from "../lib/kpiLogic";
import { verifyAuth } from "../middlewares/auth";

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

function FutureRingGauge({ kpiKey, ringConfig, days, isActive, onClick }) {
  const info = KPI_INFO[kpiKey];
  const size = 105;
  const cx = size / 2;
  const cy = size / 2;
  const baseR = 23;
  const ringWidth = 8;
  const ringGap = 1;
  const segments = Math.max(days.length, 1);
  const gapDeg = segments > 20 ? 1.2 : 3.5;
  const anglePer = 360 / segments;
  const fontSize = segments > 25 ? 3 : segments > 15 ? 4 : 5;

  const dayRingCells = days.map((d, i) => ({ status: "white", text: `${i + 1}` }));
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
                const textColor = ring.isDayRing ? "#374151" : cell.status === "white" ? "#4B5563" : "#FFFFFF";
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
          return <circle key={b.place} cx={b.x} cy={b.y} r={r} fill="#EF4444" stroke="white" strokeWidth="1" />;
        })}
      </svg>
      {injuries.length === 0 && <span className="absolute inset-0 flex items-center justify-center text-[5px] text-gray-300 text-center px-2">Aucune projection</span>}
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

function ConfidenceBadge({ level }) {
  const map = {
    élevée: { bg: "bg-green-100", text: "text-green-700", label: "Confiance élevée" },
    moyenne: { bg: "bg-amber-100", text: "text-amber-700", label: "Confiance moyenne" },
    faible: { bg: "bg-red-100", text: "text-red-700", label: "Confiance faible" },
  };
  const c = map[level] || map.faible;
  return <span className={`px-1.5 py-0.5 rounded-full text-[5px] font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
}

export default function PredictionPage() {
  const router = useRouter();
  const { sheet: sheetCode } = router.query;

  const [sheet, setSheet] = useState(null);
  const [allSheets, setAllSheets] = useState([]);
  const [loadError, setLoadError] = useState("");

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
  const tomorrow = addDaysIso(today, 1);
  const [periode, setPeriode] = useState("semaine");
  const [customStart, setCustomStart] = useState(tomorrow);
  const [customEnd, setCustomEnd] = useState(addDaysIso(tomorrow, 6));

  const { startDate, endDate } = useMemo(() => {
    if (periode === "semaine") return { startDate: tomorrow, endDate: addDaysIso(tomorrow, 6) };
    if (periode === "mois") return { startDate: tomorrow, endDate: addDaysIso(tomorrow, 29) };
    let s = customStart < tomorrow ? tomorrow : customStart;
    let e = customEnd < s ? s : customEnd;
    return { startDate: s, endDate: e };
  }, [periode, customStart, customEnd, tomorrow]);

  const sheetType = sheet ? sheet.type : "ligne";
  const [selectedKpi, setSelectedKpi] = useState("S");
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    if (!sheet) return;
    const params = new URLSearchParams({ sheetId: sheet.id, startDate, endDate, sheetType });
    apiGet(`/api/predict?${params.toString()}`).then(setPrediction).catch(() => {});
  }, [sheet, startDate, endDate, sheetType]);

  const days = prediction ? prediction.days : [];
  const currentKpiParams = prediction ? prediction.kpis[selectedKpi].params : [];
  const trendFieldsByKpi = {
    S: [{ key: "accidents", label: "Accidents", color: "#E53935" }, { key: "risques", label: "Risques", color: "#FB8C00" }],
    Q: [{ key: "retoursClients", label: "Retours clients", color: "#8E24AA" }, { key: "rebuts", label: "Rebuts", color: "#3B82F6" }, { key: "quantiteTotale", label: "Quantité totale", color: "#22C55E" }],
    C: [{ key: "quantiteProduite", label: "Quantité produite", color: "#FB8C00" }, { key: "quantiteObjectif", label: "Quantité objectif", color: "#1E88E5" }],
    D: [{ key: "quantiteProduite", label: "Quantité produite", color: "#1E88E5" }, { key: "quantitePlanifiee", label: "Quantité planifiée", color: "#22C55E" }],
    P: [{ key: "absents", label: "Absents", color: "#43A047" }],
  };

  const bodyInjuries = useMemo(() => {
    if (!prediction) return [];
    return prediction.pareto.placeCounts
      .map((p) => ({ place: p.place, count: p.count, ...(PLACE_COORDS[p.place] || { x: 55, y: 100 }) }))
      .filter((p) => p.x !== undefined && p.count > 0);
  }, [prediction]);

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
    <div className="h-screen overflow-hidden flex bg-[#EEF1F6] text-[6px]">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white border-b border-gray-200">
          <div className="h-[32px] flex items-center justify-between px-3">
            <h1 className="font-bold text-[9px] text-gray-800 tracking-tight">PRÉDICTION - {sheet.label.toUpperCase()}</h1>
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-semibold text-gray-400 mr-0.5">PÉRIODE FUTURE</span>
              <button onClick={() => setPeriode("semaine")} className={`px-1.5 py-1 rounded-md text-[6px] font-semibold ${periode === "semaine" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                Semaine prochaine
              </button>
              <button onClick={() => setPeriode("mois")} className={`px-1.5 py-1 rounded-md text-[6px] font-semibold ${periode === "mois" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                Mois prochain
              </button>
              <button onClick={() => setPeriode("intervalle")} className={`px-1.5 py-1 rounded-md text-[6px] font-semibold ${periode === "intervalle" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                Intervalle précis
              </button>
              <div className="flex items-center gap-1 ml-1 px-1.5 py-1 rounded-md bg-gray-100 text-[6px] font-medium text-gray-600">
                {fmtFR(startDate)} → {fmtFR(endDate)}
                <FaCalendarAlt className="text-gray-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {prediction && <ConfidenceBadge level={prediction.meta.overallConfidence} />}
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[6px] font-bold">A</div>
            </div>
          </div>
          {periode === "intervalle" && (
            <div className="flex items-center gap-1.5 px-3 pb-1.5 -mt-0.5">
              <FaCalendarAlt className="text-gray-400 text-[6px]" />
              <span className="text-[6px] text-gray-500">Du</span>
              <input type="date" min={tomorrow} value={customStart} onChange={(e) => e.target.value && setCustomStart(e.target.value)} className="border border-gray-200 rounded-md px-1 py-0.5 text-[6px]" />
              <span className="text-[6px] text-gray-500">au</span>
              <input type="date" min={customStart} value={customEnd} onChange={(e) => e.target.value && setCustomEnd(e.target.value)} className="border border-gray-200 rounded-md px-1 py-0.5 text-[6px]" />
            </div>
          )}
        </header>

        <main className="flex-1 min-h-0 p-2 flex flex-col gap-2 overflow-auto">
          <div className="flex items-start gap-1.5 bg-blue-50 border border-blue-100 rounded-xl px-2 py-1.5 text-[6px] text-blue-700 shrink-0">
            <FaInfoCircle className="mt-0.5 shrink-0" />
            <span>
              Prévisions calculées par régression linéaire désaisonnalisée (tendance + effet jour de la semaine) sur l&apos;historique de la feuille
              {prediction ? ` du ${fmtFR(prediction.meta.historicalWindowStart)} au ${fmtFR(prediction.meta.historicalWindowEnd)}` : ""}. Les causes et
              répartitions Pareto sont projetées à partir de la proportion historique des causes. Ces valeurs sont indicatives et non contractuelles.
            </span>
          </div>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2 shrink-0">
            <h2 className="text-[6px] font-bold tracking-wide text-gray-700 mb-1">I. INDICATEURS KPI PRÉDITS</h2>
            <div className="flex items-center justify-around">
              {KPI_ORDER.map((k) => (
                <FutureRingGauge
                  key={k}
                  kpiKey={k}
                  ringConfig={prediction ? prediction.kpis[k].ringCells : []}
                  days={days}
                  isActive={selectedKpi === k}
                  onClick={() => setSelectedKpi(k)}
                />
              ))}
            </div>
            <div className="flex items-start justify-between mt-1.5 pt-1.5 border-t border-gray-100">
              <div>
                <p className="text-[6px] font-bold text-gray-500 mb-0.5">Anneaux — {KPI_INFO[selectedKpi].label} prédits (du centre vers l&apos;extérieur)</p>
                <div className="flex flex-wrap gap-1.5 text-[6px] text-gray-500">
                  <span className="px-1 py-0.5 rounded bg-gray-100 font-medium">1. Jours futurs de la période</span>
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
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 shrink-0">
            <h2 className="text-[6px] font-bold tracking-wide text-gray-700 mb-1.5">II. PARAMÈTRES PRÉDITS PAR KPI</h2>
            <div className="flex gap-1.5">
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

              <div className="flex-1 border border-gray-200 rounded-lg p-1.5 overflow-x-auto">
                <table className="w-full text-[6px]">
                  <thead>
                    <tr className="text-gray-400 text-left border-b border-gray-100">
                      <th className="py-1 pr-2 font-semibold">Date</th>
                      {trendFieldsByKpi[selectedKpi].map((f) => (
                        <th key={f.key} className="py-1 pr-2 font-semibold">{f.label}</th>
                      ))}
                      <th className="py-1 font-semibold">Confiance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentKpiParams.map((row) => (
                      <tr key={row.date} className="border-b border-gray-50">
                        <td className="py-1 pr-2 text-gray-500">{fmtFR(row.date)}</td>
                        {trendFieldsByKpi[selectedKpi].map((f) => (
                          <td key={f.key} className="py-1 pr-2 text-gray-700 font-semibold">{row[f.key]}</td>
                        ))}
                        <td className="py-1"><ConfidenceBadge level={row.confidence} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex-1 border border-gray-200 rounded-lg p-1.5">
                <h4 className="text-[6px] font-semibold text-gray-500 mb-1">Tendance prédite — {KPI_INFO[selectedKpi].label}</h4>
                <div style={{ width: "100%", height: "88%" }}>
                  <ResponsiveContainer>
                    <ComposedChart data={prediction ? prediction.kpis[selectedKpi].trend : []}>
                      <CartesianGrid vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fontSize: 5 }} tickFormatter={(d) => fmtFR(d)} />
                      <YAxis tick={{ fontSize: 5 }} width={15} />
                      <Tooltip labelFormatter={(d) => fmtFR(d)} />
                      <Line type="monotone" dataKey="valeur" stroke={KPI_INFO[selectedKpi].color} strokeWidth={1.5} dot={{ r: 1.5 }} connectNulls />
                      {selectedKpi === "C" && prediction && (
                        <>
                          <Line data={prediction.kpis.C.tempsTrend} type="monotone" dataKey="disponibilite" stroke="#1E88E5" strokeWidth={1} dot={{ r: 1 }} connectNulls />
                          <Line data={prediction.kpis.C.tempsTrend} type="monotone" dataKey="performance" stroke="#43A047" strokeWidth={1} dot={{ r: 1 }} connectNulls />
                          <Line data={prediction.kpis.C.tempsTrend} type="monotone" dataKey="qualite" stroke="#8E24AA" strokeWidth={1} dot={{ r: 1 }} connectNulls />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 shrink-0">
            <h2 className="text-[6px] font-bold tracking-wide text-gray-700 mb-1.5">IV. PARÉTOS PRÉDITS (proportions historiques projetées)</h2>
            <div className="grid grid-cols-5 gap-2">
              <ParetoCard title="SÉCURITÉ" color="#E53935" letter="S">
                <p className="text-[6px] text-gray-400 mb-0.5">Bilan des blessures projeté</p>
                <div className="flex items-center gap-0.5">
                  <BodySilhouette injuries={bodyInjuries} />
                  <MiniPareto data={prediction ? prediction.pareto.risquesPareto : []} barColor="#E53935" lineColor="#3B82F6" />
                </div>
              </ParetoCard>
              <ParetoCard title="QUALITÉ" color="#8E24AA" letter="Q">
                <p className="text-[6px] text-gray-400 mb-0.5">Types de défaut projetés</p>
                <MiniPareto data={prediction ? prediction.pareto.defautsPareto : []} barColor="#A855F7" lineColor="#3B82F6" />
              </ParetoCard>
              <ParetoCard title="COÛT" color="#FB8C00" letter="C">
                <p className="text-[6px] text-gray-400 mb-0.5">Temps projetés (heures, somme période)</p>
                <div style={{ width: "100%", height: 150 }}>
                  <ResponsiveContainer>
                    <BarChart data={prediction ? prediction.pareto.tempsCout : []} margin={{ top: 2, right: 2, left: 0, bottom: 14 }}>
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
                <p className="text-[6px] text-gray-400">La prévision des tickets de délai n&apos;est pas modélisable statistiquement (nature évènementielle). Consultez le tableau de bord.</p>
              </ParetoCard>
              <ParetoCard title="PERSONNEL" color="#43A047" letter="P">
                <p className="text-[6px] text-gray-400 mb-0.5">Causes d&apos;absence projetées</p>
                <div style={{ width: "100%", height: 140 }}>
                  <ResponsiveContainer>
                    <BarChart data={prediction ? prediction.pareto.absences : []} margin={{ top: 2, right: 2, left: 0, bottom: 14 }}>
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