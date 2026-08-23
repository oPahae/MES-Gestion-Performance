import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaCogs,
  FaPlane,
  FaChartBar,
  FaClipboardList,
  FaSignOutAlt,
  FaBell,
  FaRobot,
  FaExclamationTriangle,
} from "react-icons/fa";
import { apiGet, apiPut } from "../lib/apiClient";
import { verifyAuth } from "../middlewares/auth";
import { query } from "../lib/db";

const ROLE_LABELS = {
  logistique: "Logistique",
  qualite: "Contrôle de qualité",
  methodiste: "Méthodiste",
};

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default function NotificationsPage({ role }) {
  const [allSheets, setAllSheets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    apiGet("/api/notifications/anomalies")
      .then((rows) => {
        setNotifications(rows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    apiGet("/api/sheets").then(setAllSheets).catch(() => {});
    refresh();
  }, []);

  useEffect(() => {
    if (notifications.some((n) => !n.lu)) {
      apiPut("/api/notifications/anomalies", {}).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  return (
    <div className="h-screen overflow-hidden flex bg-[#EEF1F6] text-xs">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white border-b border-gray-200 h-[64px] flex items-center justify-between px-6">
          <h1 className="font-bold text-lg text-gray-800 tracking-tight flex items-center gap-2">
            <FaBell className="text-red-500" /> NOTIFICATIONS
          </h1>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">{ROLE_LABELS[role] || role}</span>
        </header>

        <main className="flex-1 min-h-0 p-6 overflow-auto">
          {loading ? (
            <p className="text-gray-400 text-sm">Chargement...</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
              <FaBell className="text-3xl" />
              <p className="text-sm">Aucune notification pour le moment.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    !n.lu ? "bg-red-50/60 border-red-200" : "bg-white border-gray-100"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${!n.lu ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                    <FaExclamationTriangle className="text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-700">{n.sheet_label}</span>
                      <span className="text-[11px] text-gray-400">{fmtDate(n.date_jour)}</span>
                      {!n.lu && <span className="text-[10px] font-bold text-red-600 bg-red-100 rounded-full px-2 py-0.5">Nouveau</span>}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res }) {
  const authUser = verifyAuth(req, res);
  if (!authUser) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  if (authUser.role === "admin") {
    return { redirect: { destination: "/settings", permanent: false } };
  }

  try {
    const rows = await query("SELECT role FROM users WHERE email = ?", [authUser.email]);
    const role = rows[0]?.role;
    if (!role || !["methodiste", "logistique", "qualite"].includes(role)) {
      return { redirect: { destination: "/", permanent: false } };
    }
    return { props: { role } };
  } catch (err) {
    return { redirect: { destination: "/", permanent: false } };
  }
}