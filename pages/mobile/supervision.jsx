import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaArrowLeft,
  FaBell,
  FaCalendarAlt,
  FaChartBar,
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

import { apiGet } from "../../lib/apiClient";

import {
  KPI_ORDER,
  KPI_INFO,
  STATUS_COLORS,
  STATUS_LEGEND,
  PLACE_COORDS,
  getRingConfig,
  KPI_TREND_FIELDS,
} from "../../lib/kpiLogic";

import {
  addDaysIso,
  todayIso,
  fmtFR,
  fmtWeekLabel,
  getMondayIso,
  computeTrailingWeeks,
  fmtWeekLabelShort,
} from "../../lib/dateUtils";

import { verifyAuth } from "../../middlewares/auth";

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
  const start = polarToCartesian(
    cx,
    cy,
    r,
    startAngle
  );

  const end = polarToCartesian(
    cx,
    cy,
    r,
    endAngle
  );

  const largeArc =
    endAngle - startAngle <= 180 ? "0" : "1";

  return `
    M ${start.x} ${start.y}
    A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}
  `;
}

function formatCellText(value, type) {
  if (
    value === undefined ||
    value === null ||
    Number.isNaN(Number(value))
  ) {
    return "–";
  }

  return type === "percent"
    ? `${value}%`
    : `${value}`;
}

function getStatusLabel(status) {
  const item = STATUS_LEGEND.find(
    (item) => item.key === status
  );

  return item ? item.label : "Pas de donnée";
}

function formatDateSafe(value) {
  if (!value) return "–";

  try {
    return fmtFR(String(value).slice(0, 10));
  } catch {
    return String(value).slice(0, 10);
  }
}

/* =========================================================
   CERCLE KPI MOBILE
========================================================= */

function MobileSupervisionGauge({
  kpiKey,
  ringConfig,
  weeks,
  todayWeekIndex,
  selectedWeekIndex,
  active,
  onClick,
}) {
  const info = KPI_INFO[kpiKey];

  const size = 150;
  const cx = size / 2;
  const cy = size / 2;

  const baseR = 23;
  const ringWidth = 17;
  const ringGap = 2;

  const segments = Math.max(weeks.length, 1);
  const anglePer = 360 / segments;

  const gapDeg = segments > 20 ? 1 : 2.5;

  const fontSize =
    segments > 25
      ? 4
      : segments > 15
        ? 5
        : 6;

  const weekCells = weeks.map((_, index) => ({
    status:
      index === selectedWeekIndex
        ? "selected"
        : index === todayWeekIndex
          ? "today"
          : "white",
    text: `S${index + 1}`,
  }));

  const rings = [
    {
      name: "Semaines",
      isWeekRing: true,
      cells: weekCells,
    },
    ...(ringConfig || []).map((ring) => ({
      ...ring,
      cells: (ring.cells || []).map(
        (cell) => ({
          ...cell,
          text: formatCellText(
            cell.value,
            ring.type
          ),
        })
      ),
    })),
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center rounded-2xl p-1.5 transition active:scale-[0.97] ${
        active
          ? "bg-slate-50"
          : "bg-white"
      }`}
      style={
        active
          ? {
              boxShadow: `0 0 0 2px ${info.color}55`,
            }
          : undefined
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-full h-auto"
      >
        {rings.map((ring, ringIndex) => {
          const rInner =
            baseR +
            ringIndex *
              (ringWidth + ringGap);

          const radius =
            rInner + ringWidth / 2;

          return (
            <g key={`${kpiKey}-${ringIndex}`}>
              {ring.cells.map(
                (cell, index) => {
                  const start =
                    index * anglePer +
                    gapDeg / 2;

                  const end =
                    (index + 1) * anglePer -
                    gapDeg / 2;

                  const path =
                    describeArc(
                      cx,
                      cy,
                      radius,
                      start,
                      end
                    );

                  const middle =
                    (start + end) / 2;

                  const labelPos =
                    polarToCartesian(
                      cx,
                      cy,
                      radius,
                      middle
                    );

                  const textColor =
                    ring.isWeekRing
                      ? cell.status ===
                          "selected" ||
                        cell.status === "today"
                        ? "#1E3A8A"
                        : "#475569"
                      : cell.status ===
                          "white"
                        ? "#64748B"
                        : "#FFFFFF";

                  return (
                    <g key={index}>
                      <path
                        d={path}
                        fill="none"
                        stroke={
                          STATUS_COLORS[
                            cell.status
                          ] ||
                          STATUS_COLORS.white
                        }
                        strokeWidth={
                          ringWidth
                        }
                      />

                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={
                          fontSize
                        }
                        fontWeight="700"
                        fill={
                          textColor
                        }
                      >
                        {cell.text}
                      </text>
                    </g>
                  );
                }
              )}
            </g>
          );
        })}

        <circle
          cx={cx}
          cy={cy}
          r={baseR - 7}
          fill="white"
        />

        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="25"
          fontWeight="800"
          fill={info.color}
        >
          {kpiKey}
        </text>
      </svg>

      <span
        className="text-[9px] font-bold mt-1 uppercase"
        style={{
          color: info.color,
        }}
      >
        {info.label}
      </span>
    </button>
  );
}

/* =========================================================
   MINI GRAPHIQUE TENDANCE
========================================================= */

function MobileTrendChart({
  kpiKey,
  data,
}) {
  const fields =
    KPI_TREND_FIELDS[kpiKey] || [];

  const hasPercent = fields.some(
    (field) =>
      field.type === "percent"
  );

  const hasCount = fields.some(
    (field) =>
      field.type === "count"
  );

  const mixedAxes =
    hasPercent && hasCount;

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-slate-400">
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <div className="w-full h-56">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <ComposedChart
          data={data}
          margin={{
            top: 10,
            right: 8,
            left: -10,
            bottom: 35,
          }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#E2E8F0"
          />

          <XAxis
            dataKey="weekStart"
            tickFormatter={(value) =>
              fmtWeekLabelShort(
                value
              )
            }
            tick={{
              fontSize: 9,
              fill: "#64748B",
            }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={42}
          />

          <YAxis
            yAxisId="left"
            tick={{
              fontSize: 9,
              fill: "#64748B",
            }}
            width={30}
          />

          {mixedAxes && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{
                fontSize: 9,
                fill: "#64748B",
              }}
              width={30}
            />
          )}

          <Tooltip
            labelFormatter={(value) =>
              fmtWeekLabel(value)
            }
          />

          {fields.map((field) => (
            <Line
              key={field.key}
              yAxisId={
                mixedAxes &&
                field.type ===
                  "percent"
                  ? "right"
                  : "left"
              }
              type="monotone"
              dataKey={field.key}
              name={field.label}
              stroke={field.color}
              strokeWidth={2}
              dot={{ r: 2.5 }}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
        {fields.map((field) => (
          <span
            key={field.key}
            className="flex items-center gap-1 text-[9px] text-slate-500"
          >
            <span
              className="w-2.5 h-0.5 rounded-full"
              style={{
                backgroundColor:
                  field.color,
              }}
            />

            {field.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   SILHOUETTE BLESSURES
========================================================= */

function BodySilhouette({
  injuries,
}) {
  const [hovered, setHovered] =
    useState(null);

  const maxCount = Math.max(
    1,
    ...(injuries || []).map(
      (item) => Number(item.count) || 0
    )
  );

  return (
    <div className="relative flex justify-center w-[90px] h-[180px]">
      <svg
        width="90"
        height="180"
        viewBox="0 0 110 230"
      >
        <circle
          cx="55"
          cy="20"
          r="14"
          fill="#CBD5E1"
        />

        <rect
          x="40"
          y="36"
          width="30"
          height="45"
          rx="10"
          fill="#CBD5E1"
        />

        <rect
          x="20"
          y="40"
          width="14"
          height="60"
          rx="7"
          fill="#CBD5E1"
        />

        <rect
          x="76"
          y="40"
          width="14"
          height="60"
          rx="7"
          fill="#CBD5E1"
        />

        <rect
          x="42"
          y="80"
          width="26"
          height="55"
          rx="10"
          fill="#CBD5E1"
        />

        <rect
          x="40"
          y="132"
          width="13"
          height="70"
          rx="6"
          fill="#CBD5E1"
        />

        <rect
          x="57"
          y="132"
          width="13"
          height="70"
          rx="6"
          fill="#CBD5E1"
        />

        {(injuries || []).map(
          (item) => {
            const radius =
              3 +
              ((Number(
                item.count
              ) || 0) /
                maxCount) *
                6;

            return (
              <circle
                key={item.place}
                cx={item.x}
                cy={item.y}
                r={radius}
                fill="#EF4444"
                stroke="white"
                strokeWidth="1.5"
                onMouseEnter={() =>
                  setHovered(item)
                }
                onMouseLeave={() =>
                  setHovered(null)
                }
              />
            );
          }
        )}
      </svg>

      {injuries.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[9px] text-slate-300 text-center px-2">
          Aucune blessure
        </div>
      )}

      {hovered && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 bg-white border border-slate-200 shadow-lg rounded-xl px-2.5 py-2 z-10 whitespace-nowrap">
          <div className="text-[10px] font-bold text-slate-700">
            {hovered.place}
          </div>

          <div className="text-[9px] text-slate-400 mt-0.5">
            Total : {hovered.count}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CARTE MODALE
========================================================= */

function MobileModal({
  title,
  icon,
  children,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              {icon}
            </div>

            <h2 className="text-sm font-bold text-slate-800 truncate">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
          >
            <FaTimes size={13} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-65px)] p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CARTE KPI DÉTAIL
========================================================= */

function DetailItem({
  label,
  value,
  unit,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
      <div className="text-[10px] text-slate-400 font-medium">
        {label}
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold text-slate-800">
          {value === undefined ||
          value === null ||
          value === ""
            ? "–"
            : value}
        </span>

        {unit && (
          <span className="text-[9px] text-slate-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function MobileSupervisionPage({
  session,
}) {
  const router = useRouter();

  const {
    sheet: sheetCode,
  } = router.query;

  const [sheet, setSheet] =
    useState(null);

  const [allSheets, setAllSheets] =
    useState([]);

  const [loadError, setLoadError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const today = todayIso();

  const thisMonday =
    getMondayIso(today);

  const [selectedWeekStart, setSelectedWeekStart] =
    useState(thisMonday);

  const [selectedKpi, setSelectedKpi] =
    useState("S");

  const [kpiWeekly, setKpiWeekly] =
    useState(null);

  const [trendData, setTrendData] =
    useState([]);

  const [paretoStats, setParetoStats] =
    useState(null);

  const [postes, setPostes] =
    useState([]);

  const [paretoPoste, setParetoPoste] =
    useState("");

  const [tickets, setTickets] =
    useState([]);

  const [notifications, setNotifications] =
    useState([]);

  const [actions, setActions] =
    useState([]);

  const [viewedNotification, setViewedNotification] =
    useState(null);

  const [modal, setModal] =
    useState(null);

  /* =======================================================
     SEMAINES
  ======================================================= */

  const trailingWeeks = useMemo(
    () =>
      computeTrailingWeeks(
        selectedWeekStart,
        8
      ),
    [selectedWeekStart]
  );

  const selectedWeekIndex =
    trailingWeeks.indexOf(
      selectedWeekStart
    );

  const todayWeekIndex =
    trailingWeeks.indexOf(
      thisMonday
    );

  const weekRangeEnd =
    addDaysIso(
      selectedWeekStart,
      6
    );

  const periodLabel =
    fmtWeekLabel(
      selectedWeekStart
    );

  /* =======================================================
     CHARGEMENT FEUILLES
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError("");

    apiGet("/api/sheets")
      .then((rows) => {
        if (cancelled) return;

        const safeRows =
          Array.isArray(rows)
            ? rows
            : [];

        setAllSheets(safeRows);

        if (!safeRows.length) {
          setLoadError(
            "Aucune feuille disponible."
          );
          return;
        }

        if (sheetCode) {
          const found =
            safeRows.find(
              (item) =>
                item.code ===
                sheetCode
            );

          if (found) {
            setSheet(found);
          } else {
            setSheet(
              safeRows[0]
            );

            router.replace(
              `/mobile/supervision?sheet=${encodeURIComponent(
                safeRows[0].code
              )}`,
              undefined,
              {
                shallow: true,
              }
            );
          }
        } else {
          setSheet(
            safeRows[0]
          );

          router.replace(
            `/mobile/supervision?sheet=${encodeURIComponent(
              safeRows[0].code
            )}`,
            undefined,
            {
              shallow: true,
            }
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error?.message ||
              "Impossible de charger les feuilles."
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
  }, [sheetCode]);

  /* =======================================================
     KPI HEBDOMADAIRES
  ======================================================= */

  useEffect(() => {
    if (!sheet) return;

    const params =
      new URLSearchParams({
        sheetId: String(
          sheet.id
        ),
        weeks:
          trailingWeeks.join(","),
        sheetType:
          sheet.type || "ligne",
      });

    apiGet(
      `/api/supervisionKpi?${params.toString()}`
    )
      .then((data) =>
        setKpiWeekly(data)
      )
      .catch((error) => {
        console.error(
          "Erreur supervisionKpi:",
          error
        );

        setKpiWeekly(null);
      });
  }, [
    sheet,
    trailingWeeks,
  ]);

  /* =======================================================
     TENDANCE DU KPI SÉLECTIONNÉ
  ======================================================= */

  useEffect(() => {
    if (!sheet) return;

    const params =
      new URLSearchParams({
        sheetId: String(
          sheet.id
        ),
        kpi: selectedKpi,
        weeks:
          trailingWeeks.join(","),
      });

    apiGet(
      `/api/supervisionTrend?${params.toString()}`
    )
      .then((data) =>
        setTrendData(
          Array.isArray(data)
            ? data
            : []
        )
      )
      .catch((error) => {
        console.error(
          "Erreur supervisionTrend:",
          error
        );

        setTrendData([]);
      });
  }, [
    sheet,
    selectedKpi,
    trailingWeeks,
  ]);

  /* =======================================================
     POSTES
  ======================================================= */

  useEffect(() => {
    if (!sheet) return;

    apiGet(
      `/api/postes?sheetId=${sheet.id}`
    )
      .then((rows) => {
        setPostes(
          Array.isArray(rows)
            ? rows.map(
                (item) =>
                  item.nom
              )
            : []
        );
      })
      .catch(() => {
        setPostes([]);
      });
  }, [sheet]);

  /* =======================================================
     PARETO
  ======================================================= */

  useEffect(() => {
    if (!sheet) return;

    const params =
      new URLSearchParams({
        sheetId: String(
          sheet.id
        ),
        startDate:
          selectedWeekStart,
        endDate:
          weekRangeEnd,
      });

    if (paretoPoste) {
      params.set(
        "poste",
        paretoPoste
      );
    }

    apiGet(
      `/api/paretoStats?${params.toString()}`
    )
      .then((data) =>
        setParetoStats(data)
      )
      .catch((error) => {
        console.error(
          "Erreur paretoStats:",
          error
        );

        setParetoStats(null);
      });
  }, [
    sheet,
    selectedWeekStart,
    weekRangeEnd,
    paretoPoste,
  ]);

  /* =======================================================
     TICKETS PARETO
  ======================================================= */

  useEffect(() => {
    if (!sheet) return;

    apiGet(
      `/api/paretoTickets?sheetId=${sheet.id}`
    )
      .then((data) =>
        setTickets(
          Array.isArray(data)
            ? data
            : []
        )
      )
      .catch(() => {
        setTickets([]);
      });
  }, [sheet]);

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  useEffect(() => {
    if (!sheet) return;

    const params =
      new URLSearchParams({
        sheetId: String(
          sheet.id
        ),
        startDate:
          selectedWeekStart,
        endDate:
          weekRangeEnd,
      });

    apiGet(
      `/api/notifications?${params.toString()}`
    )
      .then((data) =>
        setNotifications(
          Array.isArray(data)
            ? data
            : []
        )
      )
      .catch(() => {
        setNotifications([]);
      });
  }, [
    sheet,
    selectedWeekStart,
    weekRangeEnd,
  ]);

  /* =======================================================
     PLAN D'ACTIONS
  ======================================================= */

  useEffect(() => {
    if (!sheet) return;

    const params =
      new URLSearchParams({
        sheetId: String(
          sheet.id
        ),
        startDate:
          selectedWeekStart,
        endDate:
          weekRangeEnd,
        kpi: selectedKpi,
      });

    apiGet(
      `/api/actions?${params.toString()}`
    )
      .then((data) =>
        setActions(
          Array.isArray(data)
            ? data
            : []
        )
      )
      .catch(() => {
        setActions([]);
      });
  }, [
    sheet,
    selectedWeekStart,
    weekRangeEnd,
    selectedKpi,
  ]);

  /* =======================================================
     BLESSURES
  ======================================================= */

  const bodyInjuries = useMemo(() => {
    if (!paretoStats) {
      return [];
    }

    return (
      paretoStats.placeCounts ||
      []
    )
      .map((item) => ({
        place: item.place,
        count: item.count,
        ...(PLACE_COORDS[
          item.place
        ] || {
          x: 55,
          y: 100,
        }),
      }))
      .filter(
        (item) =>
          item.x !== undefined
      );
  }, [paretoStats]);

  /* =======================================================
     KPI SÉLECTIONNÉ
  ======================================================= */

  const selectedKpiInfo =
    KPI_INFO[selectedKpi];

  const selectedRingConfig =
    kpiWeekly?.kpis?.[
      selectedKpi
    ] || [];

  /* =======================================================
     AFFICHAGE CHARGEMENT
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />

          <p className="mt-3 text-xs text-slate-500">
            Chargement de la supervision...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERREUR
  ======================================================= */

  if (loadError || !sheet) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <FaExclamationTriangle size={22} />
          </div>

          <h1 className="mt-4 text-base font-bold text-slate-800">
            Supervision indisponible
          </h1>

          <p className="mt-2 text-xs text-slate-500">
            {loadError ||
              "Impossible de charger la feuille."}
          </p>

          <Link
            href="./"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
          >
            <FaArrowLeft size={11} />
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
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 pb-6">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="./"
              className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 active:scale-95"
            >
              <FaArrowLeft size={13} />
            </Link>

            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                Supervision
              </div>

              <h1 className="text-base font-bold text-slate-800 truncate">
                {sheet.label}
              </h1>
            </div>

            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {session?.nom
                ? session.nom
                    .slice(0, 1)
                    .toUpperCase()
                : "U"}
            </div>
          </div>

          {/* Sélection feuille */}

          <div className="relative mt-3">
            <select
              value={sheet.code}
              onChange={(event) => {
                const code =
                  event.target
                    .value;

                router.push(
                  `/mobile/supervision?sheet=${encodeURIComponent(
                    code
                  )}`
                );
              }}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 pr-9 text-xs font-semibold text-slate-700 outline-none"
            >
              {allSheets.map(
                (item) => (
                  <option
                    key={item.id}
                    value={
                      item.code
                    }
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>

            <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
          </div>

          {/* Semaine */}

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <FaCalendarAlt className="text-blue-500 shrink-0" />

              <div className="min-w-0">
                <div className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">
                  Semaine
                </div>

                <div className="text-[11px] font-bold text-slate-700 truncate">
                  {periodLabel}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedWeekStart(
                  thisMonday
                )
              }
              className="shrink-0 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-bold"
            >
              Actuelle
            </button>
          </div>

          {/* Date */}

          <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400">
            <span>
              Aujourd'hui :{" "}
              <strong className="text-slate-600">
                {fmtFR(today)}
              </strong>
            </span>

            <span>
              {selectedWeekStart ===
              thisMonday
                ? "Semaine en cours"
                : "Historique"}
            </span>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 max-w-xl mx-auto space-y-4">
        {/* =================================================
            NAVIGATION SEMAINE
        ================================================= */}

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setSelectedWeekStart(
                  addDaysIso(
                    selectedWeekStart,
                    -7
                  )
                )
              }
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"
            >
              <FaChevronLeft size={11} />
            </button>

            <div className="text-center">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">
                Semaine sélectionnée
              </div>

              <div className="text-sm font-bold text-slate-800 mt-1">
                {periodLabel}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedWeekStart(
                  addDaysIso(
                    selectedWeekStart,
                    7
                  )
                )
              }
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"
            >
              <FaChevronRight size={11} />
            </button>
          </div>
        </section>

        {/* =================================================
            KPI SELECTOR
        ================================================= */}

        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Indicateurs
              </h2>

              <p className="text-[10px] text-slate-400 mt-0.5">
                Touchez un KPI pour consulter son évolution
              </p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {KPI_ORDER.map(
              (kpi) => {
                const info =
                  KPI_INFO[kpi];

                const active =
                  selectedKpi ===
                  kpi;

                return (
                  <button
                    key={kpi}
                    type="button"
                    onClick={() =>
                      setSelectedKpi(
                        kpi
                      )
                    }
                    className={`rounded-xl border py-2.5 transition active:scale-95 ${
                      active
                        ? "shadow-sm"
                        : "bg-white border-slate-200"
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: `${info.color}10`,
                            borderColor: `${info.color}50`,
                          }
                        : undefined
                    }
                  >
                    <div
                      className="text-base font-extrabold"
                      style={{
                        color:
                          info.color,
                      }}
                    >
                      {kpi}
                    </div>

                    <div className="text-[8px] text-slate-500 font-medium truncate px-1">
                      {info.label}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* =================================================
            CERCLES KPI
        ================================================= */}

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Vue KPI
                </h2>

                <p className="text-[10px] text-slate-400 mt-0.5">
                  8 dernières semaines
                </p>
              </div>

              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold"
                style={{
                  color:
                    selectedKpiInfo.color,
                  backgroundColor: `${selectedKpiInfo.color}12`,
                }}
              >
                {selectedKpi}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            {KPI_ORDER.map(
              (kpi) => (
                <MobileSupervisionGauge
                  key={kpi}
                  kpiKey={kpi}
                  ringConfig={
                    kpiWeekly?.kpis?.[
                      kpi
                    ] || []
                  }
                  weeks={
                    trailingWeeks
                  }
                  todayWeekIndex={
                    todayWeekIndex
                  }
                  selectedWeekIndex={
                    selectedWeekIndex
                  }
                  active={
                    selectedKpi ===
                    kpi
                  }
                  onClick={() =>
                    setSelectedKpi(
                      kpi
                    )
                  }
                />
              )
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <div className="text-[9px] font-bold text-slate-500 mb-2">
              Signification
            </div>

            <div className="grid grid-cols-2 gap-y-2 gap-x-3">
              {STATUS_LEGEND.map(
                (status) => (
                  <div
                    key={
                      status.key
                    }
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[
                            status.key
                          ],
                      }}
                    />

                    <span className="text-[9px] text-slate-500">
                      {status.label}
                    </span>
                  </div>
                )
              )}

              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      STATUS_COLORS.today,
                  }}
                />

                <span className="text-[9px] text-slate-500">
                  Semaine actuelle
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      STATUS_COLORS.selected,
                  }}
                />

                <span className="text-[9px] text-slate-500">
                  Semaine sélectionnée
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            TENDANCE KPI
        ================================================= */}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Évolution
              </h2>

              <p className="text-[10px] text-slate-400">
                {selectedKpiInfo.label}
              </p>
            </div>

            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold"
              style={{
                color:
                  selectedKpiInfo.color,
                backgroundColor: `${selectedKpiInfo.color}12`,
              }}
            >
              {selectedKpi}
            </span>
          </div>

          <MobileTrendChart
            kpiKey={
              selectedKpi
            }
            data={trendData}
          />
        </section>

        {/* =================================================
            ACTIONS RAPIDES
        ================================================= */}

        <section>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                setModal("pareto")
              }
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 text-left active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <FaChartBar size={15} />
              </div>

              <div className="mt-2 text-[11px] font-bold text-slate-700">
                Pareto
              </div>

              <div className="text-[9px] text-slate-400 mt-0.5">
                Analyse
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setModal(
                  "notifications"
                )
              }
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 text-left active:scale-[0.98]"
            >
              <div className="relative w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FaBell size={15} />

                {notifications.length >
                  0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {notifications.length >
                    99
                      ? "99+"
                      : notifications.length}
                  </span>
                )}
              </div>

              <div className="mt-2 text-[11px] font-bold text-slate-700">
                Alertes
              </div>

              <div className="text-[9px] text-slate-400 mt-0.5">
                Notifications
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setModal("actions")
              }
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 text-left active:scale-[0.98]"
            >
              <div className="relative w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FaTasks size={15} />

                {actions.length >
                  0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-purple-600 text-white text-[8px] font-bold flex items-center justify-center">
                    {actions.length >
                    99
                      ? "99+"
                      : actions.length}
                  </span>
                )}
              </div>

              <div className="mt-2 text-[11px] font-bold text-slate-700">
                Actions
              </div>

              <div className="text-[9px] text-slate-400 mt-0.5">
                Plan d'action
              </div>
            </button>
          </div>
        </section>

        {/* =================================================
            RÉSUMÉ SEMAINE
        ================================================= */}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Résumé de la semaine
              </h2>

              <p className="text-[10px] text-slate-400 mt-0.5">
                {periodLabel}
              </p>
            </div>

            <div className="text-right">
              <div className="text-[9px] text-slate-400">
                KPI actif
              </div>

              <div
                className="text-sm font-extrabold"
                style={{
                  color:
                    selectedKpiInfo.color,
                }}
              >
                {selectedKpi}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {selectedRingConfig.map(
              (ring, index) => {
                const cell =
                  ring.cells?.[
                    selectedWeekIndex
                  ];

                return (
                  <div
                    key={`${ring.name}-${index}`}
                    className="rounded-2xl bg-slate-50 border border-slate-200 p-3"
                  >
                    <div className="text-[10px] text-slate-400">
                      {ring.name}
                    </div>

                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-800">
                        {formatCellText(
                          cell?.value,
                          ring.type
                        )}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            STATUS_COLORS[
                              cell?.status ||
                                "white"
                            ],
                        }}
                      />

                      <span className="text-[8px] text-slate-400">
                        {getStatusLabel(
                          cell?.status ||
                            "white"
                        )}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>
      </main>

      {/* =====================================================
          MODAL PARETO
      ===================================================== */}

      {modal === "pareto" && (
        <MobileModal
          title={`Pareto — ${periodLabel}`}
          icon={
            <FaChartBar className="text-orange-600" />
          }
          onClose={() =>
            setModal(null)
          }
        >
          {/* Sélection poste */}

          <div className="mb-4">
            <div className="text-xs font-bold text-slate-700 mb-1.5">
              Poste qualité
            </div>

            <div className="relative">
              <select
                value={
                  paretoPoste
                }
                onChange={(event) =>
                  setParetoPoste(
                    event.target
                      .value
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-xs text-slate-600 outline-none"
              >
                <option value="">
                  Tous les postes
                </option>

                {postes.map(
                  (poste) => (
                    <option
                      key={poste}
                      value={
                        poste
                      }
                    >
                      {poste}
                    </option>
                  )
                )}
              </select>

              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] pointer-events-none" />
            </div>
          </div>

          {/* Sécurité */}

          <div className="rounded-2xl border border-red-100 bg-red-50/40 p-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-extrabold">
                S
              </span>

              <div>
                <h3 className="text-xs font-bold text-red-700">
                  Sécurité
                </h3>

                <p className="text-[9px] text-slate-400">
                  Blessures et risques
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <BodySilhouette
                injuries={
                  bodyInjuries
                }
              />

              <div className="flex-1 h-52">
                {paretoStats?.risquesPareto
                  ?.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <ComposedChart
                      data={
                        paretoStats.risquesPareto
                      }
                      margin={{
                        top: 5,
                        right: 5,
                        left: -10,
                        bottom: 45,
                      }}
                    >
                      <CartesianGrid
                        vertical={
                          false
                        }
                        stroke="#E2E8F0"
                      />

                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-40}
                        textAnchor="end"
                        height={55}
                        tick={{
                          fontSize: 8,
                        }}
                      />

                      <YAxis
                        yAxisId="left"
                        allowDecimals={
                          false
                        }
                        tick={{
                          fontSize: 8,
                        }}
                      />

                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[
                          0,
                          100,
                        ]}
                        tick={{
                          fontSize: 8,
                        }}
                      />

                      <Tooltip />

                      <Bar
                        yAxisId="left"
                        dataKey="nombre"
                        fill="#E53935"
                        radius={[
                          4,
                          4,
                          0,
                          0,
                        ]}
                      />

                      <Line
                        yAxisId="right"
                        dataKey="cumule"
                        type="monotone"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{
                          r: 2,
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[10px] text-slate-400 text-center">
                    Aucun risque enregistré.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Qualité */}

          <div className="mt-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-extrabold">
                Q
              </span>

              <div>
                <h3 className="text-xs font-bold text-purple-700">
                  Qualité
                </h3>

                <p className="text-[9px] text-slate-400">
                  Types de défaut
                </p>
              </div>
            </div>

            <div className="h-56">
              {paretoStats?.defautsPareto
                ?.length ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <ComposedChart
                    data={
                      paretoStats.defautsPareto
                    }
                    margin={{
                      top: 5,
                      right: 5,
                      left: -10,
                      bottom: 50,
                    }}
                  >
                    <CartesianGrid
                      vertical={
                        false
                      }
                      stroke="#E2E8F0"
                    />

                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={60}
                      tick={{
                        fontSize: 8,
                      }}
                    />

                    <YAxis
                      yAxisId="left"
                      allowDecimals={
                        false
                      }
                      tick={{
                        fontSize: 8,
                      }}
                    />

                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[
                        0,
                        100,
                      ]}
                      tick={{
                        fontSize: 8,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      yAxisId="left"
                      dataKey="nombre"
                      fill="#A855F7"
                      radius={[
                        4,
                        4,
                        0,
                        0,
                      ]}
                    />

                    <Line
                      yAxisId="right"
                      dataKey="cumule"
                      type="monotone"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{
                        r: 2,
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-400">
                  Aucun défaut enregistré.
                </div>
              )}
            </div>
          </div>

          {/* Coût */}

          <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-extrabold">
                C
              </span>

              <div>
                <h3 className="text-xs font-bold text-orange-700">
                  Coût
                </h3>

                <p className="text-[9px] text-slate-400">
                  Répartition des temps
                </p>
              </div>
            </div>

            <div className="h-56">
              {paretoStats?.tempsCout
                ?.length ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      paretoStats.tempsCout
                    }
                    margin={{
                      top: 5,
                      right: 5,
                      left: -10,
                      bottom: 55,
                    }}
                  >
                    <CartesianGrid
                      vertical={
                        false
                      }
                      stroke="#E2E8F0"
                    />

                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={65}
                      tick={{
                        fontSize: 8,
                      }}
                    />

                    <YAxis
                      allowDecimals
                      tick={{
                        fontSize: 8,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="valeur"
                      fill="#FB8C00"
                      radius={[
                        4,
                        4,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-400">
                  Aucun temps enregistré.
                </div>
              )}
            </div>
          </div>

          {/* Délai */}

          <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold">
                D
              </span>

              <div>
                <h3 className="text-xs font-bold text-blue-700">
                  Délai
                </h3>

                <p className="text-[9px] text-slate-400">
                  Tickets
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {tickets.length ===
              0 ? (
                <div className="text-[10px] text-slate-400 text-center py-4">
                  Aucun ticket.
                </div>
              ) : (
                tickets.map(
                  (ticket) => (
                    <div
                      key={
                        ticket.id
                      }
                      className="rounded-xl bg-white border border-blue-100 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold">
                          +
                        </span>

                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-slate-700">
                            {
                              ticket.titre
                            }
                          </div>

                          {ticket.sous && (
                            <div className="text-[9px] text-slate-400 mt-1">
                              {
                                ticket.sous
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>

          {/* Personnel */}

          <div className="mt-3 rounded-2xl border border-green-100 bg-green-50/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-green-100 text-green-600 flex items-center justify-center font-extrabold">
                P
              </span>

              <div>
                <h3 className="text-xs font-bold text-green-700">
                  Personnel
                </h3>

                <p className="text-[9px] text-slate-400">
                  Causes d'absence
                </p>
              </div>
            </div>

            <div className="h-56">
              {paretoStats?.absences
                ?.length ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      paretoStats.absences
                    }
                    margin={{
                      top: 5,
                      right: 5,
                      left: -10,
                      bottom: 55,
                    }}
                  >
                    <CartesianGrid
                      vertical={
                        false
                      }
                      stroke="#E2E8F0"
                    />

                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={65}
                      tick={{
                        fontSize: 8,
                      }}
                    />

                    <YAxis
                      allowDecimals={
                        false
                      }
                      tick={{
                        fontSize: 8,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="valeur"
                      fill="#43A047"
                      radius={[
                        4,
                        4,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-400">
                  Aucune absence enregistrée.
                </div>
              )}
            </div>
          </div>
        </MobileModal>
      )}

      {/* =====================================================
          MODAL NOTIFICATIONS
      ===================================================== */}

      {modal ===
        "notifications" && (
        <MobileModal
          title="Notifications"
          icon={
            <FaBell className="text-blue-600" />
          }
          onClose={() =>
            setModal(null)
          }
        >
          {notifications.length ===
          0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center">
                <FaBell size={18} />
              </div>

              <p className="mt-3 text-xs font-semibold text-slate-600">
                Aucune notification
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Aucune notification sur cette semaine.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(
                (notification) => (
                  <button
                    key={
                      notification.id
                    }
                    type="button"
                    onClick={() =>
                      setViewedNotification(
                        notification
                      )
                    }
                    className={`w-full text-left rounded-2xl border p-3 ${
                      notification.lu
                        ? "bg-slate-50 border-slate-200"
                        : "bg-blue-50 border-blue-100"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-500 shrink-0">
                        <FaBell size={12} />
                      </div>

                      <div className="min-w-0">
                        <div className="text-[9px] text-slate-400">
                          {formatDateSafe(
                            notification.date_jour
                          )}
                        </div>

                        <div className="mt-1 text-[11px] font-medium text-slate-700">
                          {
                            notification.texte
                          }
                        </div>

                        {notification.hasImage && (
                          <div className="mt-1 text-[9px] font-bold text-blue-600">
                            Voir le détail
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </MobileModal>
      )}

      {/* =====================================================
          MODAL ACTIONS
      ===================================================== */}

      {modal ===
        "actions" && (
        <MobileModal
          title={`Plan d'action — ${selectedKpiInfo.label}`}
          icon={
            <FaClipboardList className="text-purple-600" />
          }
          onClose={() =>
            setModal(null)
          }
        >
          <div className="mb-4 rounded-2xl bg-purple-50 border border-purple-100 p-3">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold"
                style={{
                  color:
                    selectedKpiInfo.color,
                  backgroundColor: `${selectedKpiInfo.color}18`,
                }}
              >
                {selectedKpi}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700">
                  {selectedKpiInfo.label}
                </div>

                <div className="text-[9px] text-slate-400">
                  {periodLabel}
                </div>
              </div>
            </div>
          </div>

          {actions.length ===
          0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-green-50 text-green-500 flex items-center justify-center">
                <FaTasks size={18} />
              </div>

              <p className="mt-3 text-xs font-semibold text-slate-600">
                Aucun problème
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Aucun problème enregistré pour cette semaine.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map(
                (row) => {
                  const status =
                    row.statut ||
                    "À faire";

                  const statusClass =
                    status ===
                    "Terminé"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : status ===
                          "En cours"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-blue-50 text-blue-700 border-blue-200";

                  return (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] text-slate-400">
                            {formatDateSafe(
                              row.date
                            )}
                          </div>

                          <div className="mt-1 text-xs font-bold text-slate-700">
                            {
                              row.probleme
                            }
                          </div>
                        </div>

                        <span
                          className={`shrink-0 px-2 py-1 rounded-lg border text-[8px] font-bold ${statusClass}`}
                        >
                          {status}
                        </span>
                      </div>

                      {row.action && (
                        <div className="mt-2 rounded-xl bg-slate-50 p-2.5">
                          <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold">
                            Action
                          </div>

                          <div className="mt-1 text-[10px] text-slate-600">
                            {row.action}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2 text-[9px]">
                        <div>
                          <span className="text-slate-400">
                            Pilote :{" "}
                          </span>

                          <span className="font-semibold text-slate-600">
                            {row.pilote ||
                              "–"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400">
                            Fin :{" "}
                          </span>

                          <span className="font-semibold text-slate-600">
                            {row.dateFin
                              ? formatDateSafe(
                                  row.dateFin
                                )
                              : "–"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </MobileModal>
      )}

      {/* =====================================================
          MODAL NOTIFICATION DÉTAIL
      ===================================================== */}

      {viewedNotification && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() =>
            setViewedNotification(
              null
            )
          }
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] text-slate-400">
                  Notification
                </div>

                <div className="text-xs font-bold text-slate-700 mt-0.5">
                  {formatDateSafe(
                    viewedNotification.date_jour
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewedNotification(
                    null
                  )
                }
                className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <FaTimes size={13} />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs leading-relaxed text-slate-600">
                {
                  viewedNotification.texte
                }
              </p>
            </div>

            {viewedNotification.hasImage ? (
              <div className="mt-3">
                <img
                  src={`/api/notifications/${viewedNotification.id}`}
                  alt="Notification"
                  className="w-full rounded-2xl border border-slate-200"
                />
              </div>
            ) : (
              <div className="mt-3 text-[10px] text-slate-400 text-center">
                Aucune image associée.
              </div>
            )}
          </div>
        </div>
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
    props: {
      session: {
        nom: user.nom,
        isAdmin:
          user.role === "admin",
      },
    },
  };
}
