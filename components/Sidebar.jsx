import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaCogs,
  FaPlane,
  FaChartBar,
  FaChartLine,
  FaClipboardList,
  FaRobot,
  FaBell,
  FaIndustry,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import { apiGet } from "../lib/apiClient";

const NOTIF_ROLES = ["methodiste", "logistique", "qualite"];

export default function Sidebar({ compact = false }) {
  const router = useRouter();
  const [allSheets, setAllSheets] = useState([]);
  const [session, setSession] = useState(null);

  useEffect(() => {
    apiGet("/api/sheets").then(setAllSheets).catch(() => {});
    apiGet("/api/me").then(setSession).catch(() => {});
  }, []);

  const isAdmin = session?.role === "admin";
  const canSeeNotifications = session && NOTIF_ROLES.includes(session.role);

  function isActive(path, exact = false) {
    if (exact) return router.pathname === path;
    return router.asPath === path || router.asPath.startsWith(`${path}?`) || router.asPath.startsWith(`${path}/`);
  }
  function isSheetActive(code) {
    return router.pathname.startsWith("/dashboard") && router.query.sheet === code;
  }

  const asideCls = compact ? "w-[105px] shrink-0 bg-[#0B1526] text-white flex flex-col justify-between" : "w-[210px] shrink-0 bg-[#0B1526] text-white flex flex-col justify-between";
  const logoLinkCls = compact ? "flex items-center gap-1 px-2.5 py-2.5 border-b border-white/10" : "flex items-center gap-2 px-5 py-5 border-b border-white/10";
  const logoIconWrapCls = compact ? "w-4 h-4 rounded-md bg-white/10 flex items-center justify-center" : "w-8 h-8 rounded-md bg-white/10 flex items-center justify-center";
  const logoIconTextCls = compact ? "text-white text-[7px]" : "text-white text-sm";
  const logoTextCls = compact ? "font-bold tracking-wide text-[8px]" : "font-bold tracking-wide text-base";
  const sectionLabelCls = compact
    ? "px-2.5 pt-2.5 pb-1 text-[6px] tracking-wider text-gray-400 font-semibold"
    : "px-5 pt-5 pb-2 text-xs tracking-wider text-gray-400 font-semibold";
  const navCls = compact ? "px-1.5 flex flex-col gap-0.5" : "px-3 flex flex-col gap-1";
  const linkCls = compact
    ? "flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg font-medium"
    : "flex items-center gap-3 px-3 py-3 rounded-lg font-medium";
  const linkInactive = "text-gray-300 hover:bg-white/5";
  const linkActive = "bg-[#7A1E22] text-white";
  const linkIconCls = compact ? "text-[7px]" : "text-sm";
  const bottomWrapCls = compact ? "px-1.5 pb-2" : "px-3 pb-4";
  const bottomLabelCls = compact
    ? "px-1 pt-1.5 pb-1 text-[6px] tracking-wider text-gray-400 font-semibold border-t border-white/10"
    : "px-3 pt-3 pb-1 text-xs tracking-wider text-gray-400 font-semibold border-t border-white/10";

  return (
    <aside className={asideCls}>
      <div>
        <Link href="/" className={logoLinkCls}>
          <div className={logoIconWrapCls}>
            <FaCogs className={logoIconTextCls} />
          </div>
          <span className={logoTextCls}>
            MES <span className="font-extrabold">PERFORMANCE</span>
          </span>
        </Link>
        <div className={sectionLabelCls}>SÉLECTION</div>
        <nav className={navCls}>
          {allSheets.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/${s.code}`}
              className={`${linkCls} ${isSheetActive(s.code) ? linkActive : linkInactive}`}
            >
              {s.type === "machine" ? <FaCogs className={linkIconCls} /> : <FaPlane className={linkIconCls} />}
              {s.label}
            </Link>
          ))}
          <Link href="/supervision" className={`${linkCls} ${isActive("/supervision") ? linkActive : linkInactive} text-left`}>
            <FaChartBar className={linkIconCls} />
            Supervision hebdomadaire
          </Link>
          <Link
            href="/prediction"
            className={`${linkCls} ${isActive("/prediction") ? linkActive : linkInactive} text-left`}
          >
            <FaChartLine className={linkIconCls} />
            Prédiction
          </Link>
          <Link
            href="/rp"
            className={`${linkCls} ${router.pathname === "/rp" || router.pathname === "/probleme" ? linkActive : linkInactive} text-left`}
          >
            <FaClipboardList className={linkIconCls} />
            Résolution de problèmes
          </Link>
          <Link href="/chat" className={`${linkCls} ${isActive("/chat") ? linkActive : linkInactive} text-left`}>
            <FaRobot className={linkIconCls} />
            Assistant IA
          </Link>
          {canSeeNotifications && (
            <Link href="/notifications" className={`${linkCls} ${isActive("/notifications") ? linkActive : linkInactive} text-left`}>
              <FaBell className={linkIconCls} />
              Notifications
            </Link>
          )}
          {isAdmin && (
            <Link href="/workflow" className={`${linkCls} ${isActive("/workflow") ? linkActive : linkInactive} text-left`}>
              <FaIndustry className={linkIconCls} />
              Workflow de production
            </Link>
          )}
        </nav>
      </div>
      <div className={bottomWrapCls}>
        {isAdmin && (
          <>
            <div className={bottomLabelCls}>PARAMÈTRES GÉNÉRAUX</div>
            <Link href="/settings" className={`${linkCls} ${isActive("/settings") ? linkActive : linkInactive} text-left`}>
              <FaCog className={linkIconCls} />
              Paramètres
            </Link>
          </>
        )}
        <Link
          href="/api/auth/logout"
          className={`${linkCls} text-red-400 hover:bg-white/5 ${compact ? "" : "mt-1"}`}
        >
          <FaSignOutAlt className={linkIconCls} />
          {compact ? "QUITTER" : "LOGOUT"}
        </Link>
      </div>
    </aside>
  );
}