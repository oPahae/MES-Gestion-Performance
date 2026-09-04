import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaExclamationTriangle,
  FaTimes,
  FaTasks,
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

import { apiGet } from "../../../lib/apiClient";
import {
  KPI_ORDER,
  KPI_INFO,
  STATUS_COLORS,
  STATUS_LEGEND,
  getRingConfig,
  computeRingValue,
  URGENCE_INFO,
} from "../../../lib/kpiLogic";
import {
  computeDays,
  addDaysIso,
  todayIso,
  fmtFR,
  formatShortDay,
} from "../../../lib/dateUtils";
import { verifyAuth } from "../../../middlewares/auth";

/* =========================================================
   UTILITAIRES
========================================================= */

function polarToCartesian(cx, cy, r, angleDeg) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;

  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);

  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";

  return `M ${start.x} ${start.y}
          A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function formatRingValue(value, type) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "–";
  }

  return type === "percent"
    ? `${value}%`
    : `${value}`;
}

function getPeriodLabel(periode, days) {
  if (!days.length) return "";

  return `${fmtFR(days[0])} → ${fmtFR(days[days.length - 1])}`;
}

function getStatusLabel(status) {
  const item = STATUS_LEGEND.find((x) => x.key === status);

  return item ? item.label : "Pas de donnée";
}

/* =========================================================
   CERCLE KPI
========================================================= */

function MobileKpiRing({
  kpiKey,
  ringConfig,
  days,
  today,
  selectedDate,
  onSelectDate,
}) {
  const info = KPI_INFO[kpiKey];

  const size = 250;
  const cx = size / 2;
  const cy = size / 2;

  const baseR = 34;
  const ringWidth = 24;
  const ringGap = 3;

  const segments = Math.max(days.length, 1);
  const anglePer = 360 / segments;

  const gapDeg = segments > 25 ? 1 : 2.5;

  const todayIndex = days.indexOf(today);
  const selectedIndex = days.indexOf(selectedDate);

  const allRings = [
    {
      name: "Jours",
      type: "day",
      cells: days.map((_, index) => ({
        status:
          index === selectedIndex
            ? "selected"
            : index === todayIndex
              ? "today"
              : "white",
        text: `${index + 1}`,
      })),
    },
    ...ringConfig.map((ring) => ({
      ...ring,
      cells: ring.cells.map((cell) => ({
        ...cell,
        text: formatRingValue(cell.value, ring.type),
      })),
    })),
  ];

  return (
    <div className="w-full flex justify-center">
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="max-w-full h-auto"
        >
          {allRings.map((ring, ringIndex) => {
            const rInner =
              baseR + ringIndex * (ringWidth + ringGap);

            const rOuter = rInner + ringWidth;

            return (
              <g key={`${ring.name}-${ringIndex}`}>
                {ring.cells.map((cell, index) => {
                  const start =
                    index * anglePer + gapDeg / 2;

                  const end =
                    (index + 1) * anglePer - gapDeg / 2;

                  const path = describeArc(
                    cx,
                    cy,
                    (rInner + rOuter) / 2,
                    start,
                    end
                  );

                  const middle = (start + end) / 2;

                  const labelPosition = polarToCartesian(
                    cx,
                    cy,
                    (rInner + rOuter) / 2,
                    middle
                  );

                  const isDayRing = ring.type === "day";

                  const textColor = isDayRing
                    ? cell.status === "today"
                      ? "#2563EB"
                      : cell.status === "selected"
                        ? "#B45309"
                        : "#475569"
                    : cell.status === "white"
                      ? "#64748B"
                      : "#FFFFFF";

                  return (
                    <g
                      key={`${ring.name}-${index}`}
                      onClick={() => {
                        if (isDayRing) {
                          onSelectDate(days[index]);
                        }
                      }}
                      className={isDayRing ? "cursor-pointer" : ""}
                    >
                      <path
                        d={path}
                        fill="none"
                        stroke={
                          STATUS_COLORS[cell.status] ||
                          STATUS_COLORS.white
                        }
                        strokeWidth={ringWidth}
                      />

                      <text
                        x={labelPosition.x}
                        y={labelPosition.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={segments > 25 ? 7 : 9}
                        fontWeight="700"
                        fill={textColor}
                      >
                        {cell.text}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <circle
            cx={cx}
            cy={cy}
            r={baseR - 8}
            fill="white"
          />

          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fontSize="32"
            fontWeight="800"
            fill={info.color}
          >
            {kpiKey}
          </text>

          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#64748B"
          >
            {info.label}
          </text>
        </svg>
      </div>
    </div>
  );
}

/* =========================================================
   CARTE PARAMÈTRE
========================================================= */

function ParameterCard({ label, value, unit }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-medium text-slate-500">
        {label}
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-bold text-slate-800">
          {value === undefined ||
          value === null ||
          value === ""
            ? "–"
            : value}
        </span>

        {unit && (
          <span className="text-[11px] font-medium text-slate-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PARAMÈTRES KPI
========================================================= */

function KpiParameters({ kpi, params, sheetType }) {
  const data = params || {};

  if (kpi === "S") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <ParameterCard
          label="Accidents"
          value={data.accidents}
        />

        <ParameterCard
          label="Risques"
          value={data.risques}
        />

        <ParameterCard
          label="Retours / signalements"
          value={data.retours}
        />

        <ParameterCard
          label="Total"
          value={
            (Number(data.accidents) || 0) +
            (Number(data.risques) || 0)
          }
        />
      </div>
    );
  }

  if (kpi === "Q") {
    const total = Number(data.quantiteTotale) || 0;
    const rebuts = Number(data.rebuts) || 0;

    const taux =
      total > 0
        ? ((rebuts / total) * 100).toFixed(1)
        : "0";

    return (
      <div className="grid grid-cols-2 gap-2">
        <ParameterCard
          label="Quantité totale"
          value={data.quantiteTotale}
          unit="pcs"
        />

        <ParameterCard
          label="Rebuts"
          value={data.rebuts}
          unit="pcs"
        />

        <ParameterCard
          label="Retours clients"
          value={data.retoursClients}
        />

        <ParameterCard
          label="Taux de rebut"
          value={taux}
          unit="%"
        />
      </div>
    );
  }

  if (kpi === "C") {
    const objectif = Number(data.quantiteObjectif) || 0;
    const produite = Number(data.quantiteProduite) || 0;

    const efficience =
      objectif > 0
        ? ((produite / objectif) * 100).toFixed(1)
        : "0";

    return (
      <div className="grid grid-cols-2 gap-2">
        <ParameterCard
          label="Objectif"
          value={data.quantiteObjectif}
          unit="pcs"
        />

        <ParameterCard
          label="Produite"
          value={data.quantiteProduite}
          unit="pcs"
        />

        <ParameterCard
          label={sheetType === "machine" ? "TRS" : "Efficience"}
          value={efficience}
          unit="%"
        />

        <ParameterCard
          label="Temps cycle"
          value={data.tempsCycle}
          unit="min"
        />
      </div>
    );
  }

  if (kpi === "D") {
    const planifiee = Number(data.quantitePlanifiee) || 0;
    const produite = Number(data.quantiteProduite) || 0;

    const pdp =
      planifiee > 0
        ? ((produite / planifiee) * 100).toFixed(1)
        : "0";

    return (
      <div className="grid grid-cols-2 gap-2">
        <ParameterCard
          label="Quantité planifiée"
          value={data.quantitePlanifiee}
          unit="pcs"
        />

        <ParameterCard
          label="Quantité produite"
          value={data.quantiteProduite}
          unit="pcs"
        />

        <ParameterCard
          label="PDP"
          value={pdp}
          unit="%"
        />

        <ParameterCard
          label="Temps cycle"
          value={data.tempsCycle}
          unit="min"
        />
      </div>
    );
  }

  if (kpi === "P") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <ParameterCard
          label="Absents"
          value={data.absents}
        />

        <ParameterCard
          label="Présents"
          value={data.presentes}
        />

        <ParameterCard
          label="Effectif"
          value={data.effectif}
        />

        <ParameterCard
          label="Remplacements"
          value={data.remplacements}
        />
      </div>
    );
  }

  return null;
}

/* =========================================================
   POPUP PARETO
========================================================= */

function ParetoChart({ data, color }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-400">
        Aucune donnée pour cette période.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 10,
            right: 8,
            left: -12,
            bottom: 50,
          }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#E2E8F0"
          />

          <XAxis
            dataKey="name"
            interval={0}
            angle={-35}
            textAnchor="end"
            height={65}
            tick={{
              fontSize: 10,
              fill: "#64748B",
            }}
          />

          <YAxis
            yAxisId="left"
            allowDecimals={false}
            tick={{
              fontSize: 10,
              fill: "#64748B",
            }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{
              fontSize: 10,
              fill: "#64748B",
            }}
          />

          <Tooltip />

          <Bar
            yAxisId="left"
            dataKey="nombre"
            fill={color}
            radius={[5, 5, 0, 0]}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumule"
            stroke="#2563EB"
            strokeWidth={3}
            dot={{
              r: 3,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  icon,
  children,
  onClose,
  fullScreenMobile = false,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden ${
          fullScreenMobile
            ? "max-h-[92vh]"
            : "max-h-[88vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                {icon}
              </div>
            )}

            <h2 className="text-base font-bold text-slate-800">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95"
            aria-label="Fermer"
          >
            <FaTimes />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(88vh-65px)] p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function MobileDashboardPage() {
  const router = useRouter();

  const { sheet: sheetCode } = router.query;

  const [sheet, setSheet] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [periode, setPeriode] = useState("semaine");

  const today = todayIso();

  const [customStart, setCustomStart] = useState(
    addDaysIso(today, -6)
  );

  const [customEnd, setCustomEnd] = useState(today);

  const days = useMemo(
    () =>
      computeDays(
        periode,
        customStart,
        customEnd
      ),
    [periode, customStart, customEnd]
  );

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [selectedKpi, setSelectedKpi] =
    useState("S");

  const [kpiRings, setKpiRings] =
    useState(null);

  const [params, setParams] = useState({});

  const [paretoStats, setParetoStats] =
    useState(null);

  const [paretoPeriod, setParetoPeriod] =
    useState("jour");

  const [actions, setActions] = useState([]);

  const [planningTickets, setPlanningTickets] =
    useState([]);

  const [activeModal, setActiveModal] =
    useState(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const sheetType = sheet?.type || "ligne";

  /* =======================================================
     CHARGEMENT FEUILLE
  ======================================================= */

  useEffect(() => {
    if (!router.isReady || !sheetCode) return;

    let cancelled = false;

    setLoading(true);
    setLoadError("");

    apiGet("/api/sheets")
      .then((rows) => {
        if (cancelled) return;

        const found = rows.find(
          (item) => item.code === sheetCode
        );

        if (!found) {
          setLoadError("Feuille inconnue.");
          setSheet(null);
        } else {
          setSheet(found);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error?.message ||
              "Impossible de charger la feuille."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router.isReady, sheetCode]);

  /* =======================================================
     CORRECTION DATE SÉLECTIONNÉE
  ======================================================= */

  useEffect(() => {
    if (!days.length) return;

    if (!days.includes(selectedDate)) {
      setSelectedDate(days[days.length - 1]);
    }
  }, [days, selectedDate]);

  /* =======================================================
     KPI RINGS
  ======================================================= */

  async function refreshKpiRings() {
    if (!sheet || !days.length) return;

    try {
      const query = new URLSearchParams({
        sheetId: String(sheet.id),
        periode,
        sheetType,
        startDate: customStart,
        endDate: customEnd,
      });

      const data = await apiGet(
        `/api/kpiRings?${query.toString()}`
      );

      setKpiRings(data);
    } catch (error) {
      console.error(
        "Erreur chargement KPI rings:",
        error
      );
    }
  }

  useEffect(() => {
    refreshKpiRings();
  }, [
    sheet,
    periode,
    customStart,
    customEnd,
    sheetType,
  ]);

  /* =======================================================
     PARAMÈTRES DU JOUR
  ======================================================= */

  async function refreshParams() {
    if (!sheet || !selectedDate) return;

    try {
      const data = await apiGet(
        `/api/kpiParams?sheetId=${sheet.id}&date=${selectedDate}`
      );

      setParams(data || {});
    } catch (error) {
      console.error(
        "Erreur chargement paramètres:",
        error
      );
    }
  }

  useEffect(() => {
    refreshParams();
  }, [sheet, selectedDate]);

  /* =======================================================
     PARETO
  ======================================================= */

  async function refreshPareto() {
    if (!sheet) return;

    try {
      let start = selectedDate;

      if (paretoPeriod === "semaine") {
        start = addDaysIso(selectedDate, -6);
      }

      if (paretoPeriod === "mois") {
        start = addDaysIso(selectedDate, -29);
      }

      const query = new URLSearchParams({
        sheetId: String(sheet.id),
        periode: paretoPeriod,
        startDate: start,
        endDate: selectedDate,
      });

      const data = await apiGet(
        `/api/paretoStats?${query.toString()}`
      );

      setParetoStats(data);
    } catch (error) {
      console.error(
        "Erreur chargement Pareto:",
        error
      );

      setParetoStats(null);
    }
  }

  useEffect(() => {
    refreshPareto();
  }, [
    sheet,
    selectedDate,
    paretoPeriod,
  ]);

  /* =======================================================
     PROBLÈMES
  ======================================================= */

  async function refreshActions() {
    if (!sheet) return;

    try {
      const query = new URLSearchParams({
        sheetId: String(sheet.id),
        startDate: days[0] || selectedDate,
        endDate: days[days.length - 1] || selectedDate,
        kpi: selectedKpi,
      });

      const data = await apiGet(
        `/api/actions?${query.toString()}`
      );

      setActions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "Erreur chargement problèmes:",
        error
      );

      setActions([]);
    }
  }

  useEffect(() => {
    refreshActions();
  }, [
    sheet,
    selectedKpi,
    selectedDate,
    periode,
    customStart,
    customEnd,
  ]);

  /* =======================================================
     TÂCHES / PLANNING
  ======================================================= */

  async function refreshPlanning() {
    if (!sheet) return;

    try {
      const start =
        days[0] || selectedDate;

      const end =
        days[days.length - 1] || selectedDate;

      const query = new URLSearchParams({
        sheetId: String(sheet.id),
        startDate: start,
        endDate: end,
        kpi: selectedKpi,
      });

      const data = await apiGet(
        `/api/planningTickets?${query.toString()}`
      );

      setPlanningTickets(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Erreur chargement tâches:",
        error
      );

      setPlanningTickets([]);
    }
  }

  useEffect(() => {
    refreshPlanning();
  }, [
    sheet,
    selectedKpi,
    periode,
    customStart,
    customEnd,
  ]);

  /* =======================================================
     REFRESH GLOBAL
  ======================================================= */

  async function handleRefresh() {
    setRefreshing(true);

    await Promise.all([
      refreshKpiRings(),
      refreshParams(),
      refreshPareto(),
      refreshActions(),
      refreshPlanning(),
    ]);

    setRefreshing(false);
  }

  /* =======================================================
     DONNÉES KPI ACTUEL
  ======================================================= */

  const currentRingConfig =
    kpiRings?.kpis?.[selectedKpi] || [];

  const currentParams =
    params?.[selectedKpi] || {};

  const currentKpiInfo =
    KPI_INFO[selectedKpi];

  const selectedDayIndex =
    days.indexOf(selectedDate);

  /* =======================================================
     DONNÉES PARETO
  ======================================================= */

  const currentParetoData =
    useMemo(() => {
      if (!paretoStats) return [];

      if (selectedKpi === "S") {
        return paretoStats.risquesPareto || [];
      }

      if (selectedKpi === "Q") {
        return paretoStats.defautsPareto || [];
      }

      if (selectedKpi === "P") {
        return (paretoStats.absences || []).map(
          (item) => ({
            name: item.name,
            nombre: item.valeur,
            cumule: 0,
          })
        );
      }

      if (selectedKpi === "C") {
        return (paretoStats.tempsCout || []).map(
          (item) => ({
            name: item.name,
            nombre: item.valeur,
            cumule: 0,
          })
        );
      }

      return [];
    }, [paretoStats, selectedKpi]);

  /* =======================================================
     ÉTAT CHARGEMENT / ERREUR
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />

          <p className="mt-3 text-sm text-slate-500">
            Chargement du tableau de bord...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !sheet) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <FaExclamationTriangle size={22} />
          </div>

          <h1 className="mt-4 text-lg font-bold text-slate-800">
            Impossible de charger la feuille
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {loadError || "Feuille inconnue."}
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
          >
            <FaArrowLeft />
            Retour
          </Link>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 pb-8">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95"
            >
              <FaArrowLeft size={14} />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                Tableau de bord
              </p>

              <h1 className="text-base font-bold truncate text-slate-800">
                {sheet.label}
              </h1>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center active:scale-95 disabled:opacity-50"
              aria-label="Actualiser"
            >
              <span
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              >
                ↻
              </span>
            </button>
          </div>

          {/* Périodes */}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setPeriode("semaine")}
              className={`py-2.5 rounded-xl text-xs font-semibold border transition ${
                periode === "semaine"
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              7 jours
            </button>

            <button
              onClick={() => setPeriode("mois")}
              className={`py-2.5 rounded-xl text-xs font-semibold border transition ${
                periode === "mois"
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              30 jours
            </button>
          </div>

          {/* Date */}

          <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
            <FaCalendarAlt className="text-slate-400 shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                Période
              </div>

              <div className="text-xs font-semibold text-slate-700 truncate">
                {getPeriodLabel(periode, days)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4 max-w-xl mx-auto">
        {/* =================================================
            KPI SELECTOR
        ================================================= */}

        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Indicateurs
              </h2>

              <p className="text-[11px] text-slate-400">
                Sélectionnez un KPI
              </p>
            </div>

            <span className="text-[10px] text-slate-400">
              {selectedDayIndex >= 0
                ? `Jour ${selectedDayIndex + 1}`
                : ""}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {KPI_ORDER.map((key) => {
              const info = KPI_INFO[key];

              const active =
                selectedKpi === key;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedKpi(key)}
                  className={`rounded-xl py-2.5 border transition active:scale-95 ${
                    active
                      ? "shadow-sm"
                      : "bg-white border-slate-200"
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor:
                            `${info.color}12`,
                          borderColor:
                            `${info.color}55`,
                        }
                      : undefined
                  }
                >
                  <div
                    className="text-base font-extrabold"
                    style={{
                      color: info.color,
                    }}
                  >
                    {key}
                  </div>

                  <div className="text-[8px] font-medium text-slate-500 truncate px-1">
                    {info.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* =================================================
            DATE NAVIGATION
        ================================================= */}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                if (selectedDayIndex > 0) {
                  setSelectedDate(
                    days[selectedDayIndex - 1]
                  );
                }
              }}
              disabled={
                selectedDayIndex <= 0
              }
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center disabled:opacity-30"
            >
              <FaChevronLeft size={11} />
            </button>

            <div className="text-center flex-1">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                Journée sélectionnée
              </div>

              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {fmtFR(selectedDate)}
              </div>
            </div>

            <button
              onClick={() => {
                if (
                  selectedDayIndex >= 0 &&
                  selectedDayIndex <
                    days.length - 1
                ) {
                  setSelectedDate(
                    days[selectedDayIndex + 1]
                  );
                }
              }}
              disabled={
                selectedDayIndex < 0 ||
                selectedDayIndex >=
                  days.length - 1
              }
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center disabled:opacity-30"
            >
              <FaChevronRight size={11} />
            </button>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {days.map((day, index) => {
              const active =
                day === selectedDate;

              const isToday =
                day === today;

              return (
                <button
                  key={day}
                  onClick={() =>
                    setSelectedDate(day)
                  }
                  className={`shrink-0 min-w-[52px] rounded-xl px-2 py-2 border text-center ${
                    active
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="text-[9px] font-medium">
                    J{index + 1}
                  </div>

                  <div className="text-[10px] font-bold mt-0.5">
                    {day.slice(8, 10)}/
                    {day.slice(5, 7)}
                  </div>

                  {isToday && (
                    <div
                      className={`text-[7px] mt-0.5 font-bold ${
                        active
                          ? "text-blue-100"
                          : "text-blue-500"
                      }`}
                    >
                      AUJ.
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* =================================================
            CERCLE
        ================================================= */}

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {currentKpiInfo.label}
              </h2>

              <p className="text-[11px] text-slate-400 mt-0.5">
                Vue synthétique de la période
              </p>
            </div>

            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold"
              style={{
                color: currentKpiInfo.color,
                backgroundColor:
                  `${currentKpiInfo.color}12`,
              }}
            >
              {selectedKpi}
            </div>
          </div>

          <div className="px-2 py-3">
            <MobileKpiRing
              kpiKey={selectedKpi}
              ringConfig={currentRingConfig}
              days={days}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          {/* Légende */}

          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_LEGEND.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        STATUS_COLORS[item.key],
                    }}
                  />

                  <span className="text-[9px] text-slate-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton détails */}

          <button
            onClick={() =>
              setActiveModal("details")
            }
            className="w-full border-t border-slate-100 px-4 py-3.5 flex items-center justify-between active:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor:
                    `${currentKpiInfo.color}12`,
                  color: currentKpiInfo.color,
                }}
              >
                <FaChartBar size={13} />
              </div>

              <div className="text-left">
                <div className="text-xs font-bold text-slate-700">
                  Voir les détails
                </div>

                <div className="text-[10px] text-slate-400">
                  Paramètres et indicateurs
                </div>
              </div>
            </div>

            <FaChevronRight
              size={11}
              className="text-slate-400"
            />
          </button>
        </section>

        {/* =================================================
            ACTIONS RAPIDES
        ================================================= */}

        <section>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                setActiveModal("pareto")
              }
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-left active:scale-[0.98] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <FaChartBar size={17} />
              </div>

              <div className="mt-3 text-sm font-bold text-slate-800">
                Pareto
              </div>

              <div className="mt-1 text-[10px] text-slate-400">
                Analyse des causes
              </div>
            </button>

            <button
              onClick={() =>
                setActiveModal("actions")
              }
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-left active:scale-[0.98] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FaTasks size={17} />
              </div>

              <div className="mt-3 text-sm font-bold text-slate-800">
                Problèmes & tâches
              </div>

              <div className="mt-1 text-[10px] text-slate-400">
                Suivi des actions
              </div>
            </button>
          </div>
        </section>

        {/* =================================================
            RÉSUMÉ DU JOUR
        ================================================= */}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Résumé
              </h2>

              <p className="text-[10px] text-slate-400">
                {formatShortDay(selectedDate)}
              </p>
            </div>

            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                color: currentKpiInfo.color,
                backgroundColor:
                  `${currentKpiInfo.color}12`,
              }}
            >
              {selectedKpi}
            </div>
          </div>

          <div className="mt-3">
            <KpiParameters
              kpi={selectedKpi}
              params={currentParams}
              sheetType={sheetType}
            />
          </div>
        </section>
      </main>

      {/* =====================================================
          MODAL DÉTAILS KPI
      ===================================================== */}

      {activeModal === "details" && (
        <Modal
          title={`Détails — ${currentKpiInfo.label}`}
          onClose={() => setActiveModal(null)}
          icon={
            <span
              style={{
                color: currentKpiInfo.color,
              }}
            >
              {selectedKpi}
            </span>
          }
        >
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              backgroundColor:
                `${currentKpiInfo.color}0D`,
              border: `1px solid ${currentKpiInfo.color}25`,
            }}
          >
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Date
            </div>

            <div className="mt-1 text-lg font-bold text-slate-800">
              {fmtFR(selectedDate)}
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-800 mb-2">
            Paramètres
          </h3>

          <KpiParameters
            kpi={selectedKpi}
            params={currentParams}
            sheetType={sheetType}
          />

          <h3 className="text-sm font-bold text-slate-800 mt-5 mb-2">
            Indicateurs du cercle
          </h3>

          <div className="space-y-2">
            {currentRingConfig.map(
              (ring, index) => {
                const cell =
                  ring.cells?.[selectedDayIndex];

                const value = cell?.value;
                const status =
                  cell?.status || "white";

                return (
                  <div
                    key={`${ring.name}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 p-3"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-700">
                        {ring.name}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {getStatusLabel(status)}
                      </div>
                    </div>

                    <div className="text-lg font-bold text-slate-800">
                      {formatRingValue(
                        value,
                        ring.type
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </Modal>
      )}

      {/* =====================================================
          MODAL PARETO
      ===================================================== */}

      {activeModal === "pareto" && (
        <Modal
          title={`Pareto — ${currentKpiInfo.label}`}
          onClose={() => setActiveModal(null)}
          icon={
            <FaChartBar
              style={{
                color: currentKpiInfo.color,
              }}
            />
          }
        >
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {[
              {
                key: "jour",
                label: "Jour",
              },
              {
                key: "semaine",
                label: "7 jours",
              },
              {
                key: "mois",
                label: "30 jours",
              },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  setParetoPeriod(item.key)
                }
                className={`py-2 rounded-xl text-[10px] font-semibold border ${
                  paretoPeriod === item.key
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="mb-2">
              <div className="text-sm font-bold text-slate-800">
                {selectedKpi === "S"
                  ? "Risques"
                  : selectedKpi === "Q"
                    ? "Défauts"
                    : selectedKpi === "C"
                      ? "Temps"
                      : selectedKpi === "P"
                        ? "Absences"
                        : "Analyse"}
              </div>

              <div className="text-[10px] text-slate-400">
                {paretoPeriod === "jour"
                  ? `Journée du ${fmtFR(selectedDate)}`
                  : paretoPeriod === "semaine"
                    ? "7 derniers jours"
                    : "30 derniers jours"}
              </div>
            </div>

            <ParetoChart
              data={currentParetoData}
              color={currentKpiInfo.color}
            />
          </div>

          {selectedKpi === "S" &&
            paretoStats?.placeCounts?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2">
                  Localisation des blessures
                </h3>

                <div className="space-y-1.5">
                  {paretoStats.placeCounts.map(
                    (item) => (
                      <div
                        key={item.place}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="text-xs text-slate-600">
                          {item.place}
                        </span>

                        <span className="text-xs font-bold text-red-500">
                          {item.count}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {selectedKpi === "C" &&
            paretoStats?.tempsCout?.length > 0 && (
              <div className="mt-4 rounded-2xl bg-orange-50 border border-orange-100 p-3">
                <div className="text-xs font-bold text-orange-700">
                  Analyse des temps
                </div>

                <div className="mt-2 space-y-1">
                  {paretoStats.tempsCout.map(
                    (item) => (
                      <div
                        key={item.name}
                        className="flex justify-between text-[11px]"
                      >
                        <span className="text-slate-600">
                          {item.name.replace(
                            "\n",
                            " "
                          )}
                        </span>

                        <span className="font-bold text-orange-700">
                          {item.valeur} h
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </Modal>
      )}

      {/* =====================================================
          MODAL PROBLÈMES & TÂCHES
      ===================================================== */}

      {activeModal === "actions" && (
        <Modal
          title="Problèmes & tâches"
          onClose={() => setActiveModal(null)}
          icon={
            <FaClipboardList className="text-blue-600" />
          }
          fullScreenMobile
        >
          {/* PROBLÈMES */}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Problèmes
                </h3>

                <p className="text-[10px] text-slate-400">
                  KPI : {currentKpiInfo.label}
                </p>
              </div>

              <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold">
                {actions.length}
              </span>
            </div>

            {actions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <FaCheckCircle className="mx-auto text-2xl text-green-500" />

                <p className="mt-2 text-xs font-semibold text-slate-600">
                  Aucun problème
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Aucun problème enregistré pour cette période.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((item) => {
                  const status =
                    item.statut || "À faire";

                  const statusClass =
                    status === "Terminé"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : status === "En cours"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-blue-50 text-blue-700 border-blue-200";

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-3 bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-700">
                            {item.probleme ||
                              "Problème sans titre"}
                          </div>

                          {item.action && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {item.action}
                            </div>
                          )}
                        </div>

                        <span
                          className={`shrink-0 px-2 py-1 rounded-lg border text-[9px] font-bold ${statusClass}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9px] text-slate-400">
                            Pilote
                          </div>

                          <div className="text-[10px] font-semibold text-slate-600">
                            {item.pilote || "–"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[9px] text-slate-400">
                            Date
                          </div>

                          <div className="text-[10px] font-semibold text-slate-600">
                            {item.date
                              ? fmtFR(item.date)
                              : "–"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TÂCHES */}

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Tâches / planning
                </h3>

                <p className="text-[10px] text-slate-400">
                  Tâches associées au KPI
                </p>
              </div>

              <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-600 text-[10px] font-bold">
                {planningTickets.length}
              </span>
            </div>

            {planningTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <FaTasks className="mx-auto text-2xl text-slate-300" />

                <p className="mt-2 text-xs font-semibold text-slate-600">
                  Aucune tâche
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Aucun ticket de planning pour cette période.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {planningTickets.map((ticket) => {
                  const status =
                    ticket.statut || "À faire";

                  const statusClass =
                    status === "Terminé"
                      ? "bg-green-50 border-green-200"
                      : status === "En cours"
                        ? "bg-orange-50 border-orange-200"
                        : "bg-blue-50 border-blue-200";

                  return (
                    <div
                      key={ticket.id}
                      className={`rounded-2xl border p-3 ${statusClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-700">
                            {ticket.probleme ||
                              ticket.texte ||
                              "Tâche"}
                          </div>

                          {ticket.detailAction && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {ticket.detailAction}
                            </div>
                          )}
                        </div>

                        <span className="shrink-0 text-[9px] font-bold text-slate-500">
                          {status}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          {ticket.date
                            ? fmtFR(ticket.date)
                            : "–"}
                        </span>

                        {ticket.pilote && (
                          <span className="font-semibold text-slate-500">
                            {ticket.pilote}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   AUTHENTIFICATION
========================================================= */

export async function getServerSideProps({
  req,
  res,
}) {
  const user = verifyAuth(req, res);

  if (!user) {
    return {
      redirect: {
        destination: "./login",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
