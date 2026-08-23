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

export default function Sidebar({ variant }) {
  const router = useRouter();
  const [allSheets, setAllSheets] = useState([]);
  const [session, setSession] = useState(null);

  useEffect(() => {
    apiGet("/api/sheets").then(setAllSheets).catch(() => {});
  }, []);

  useEffect(() => {
    apiGet("/api/me").then(setSession).catch(() => {});
  }, []);

  const sheetCode = router.query.sheet;
  const isAdmin = session?.role === "admin";
  const currentPath = router.pathname;

  // Fonction pour déterminer si un lien est actif
  const isLinkActive = (path) => {
    if (path.startsWith("/dashboard/")) {
      return currentPath.startsWith("/dashboard/") && (currentPath === path || (path === `/dashboard/${sheetCode}` && currentPath === `/dashboard/${sheetCode}`));
    }
    return currentPath === path;
  };

  // Style commun pour les liens
  const getLinkStyle = (path, isWide = false) => {
    const baseStyle = isWide
      ? "flex items-center gap-3 px-3 py-3 rounded-lg font-medium"
      : "flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg font-medium";
    const isActive = isLinkActive(path);
    return `${baseStyle} ${isActive ? "bg-[#7A1E22] text-white" : "text-gray-300 hover:bg-white/5"}`;
  };

  // Contenu commun pour les liens de navigation
  const renderNavLinks = (isWide) => {
    const iconSize = isWide ? "text-sm" : "text-[7px]";
    return (
      <>
        {allSheets.map((s) => (
          <Link
            key={s.id}
            href={`/dashboard/${s.code}`}
            className={getLinkStyle(`/dashboard/${s.code}`, isWide)}
          >
            {s.type === "machine" ? <FaCogs className={iconSize} /> : <FaPlane className={iconSize} />}
            {s.label}
          </Link>
        ))}
        <Link href="/supervision" className={getLinkStyle("/supervision", isWide)}>
          <FaChartBar className={iconSize} />
          Supervision hebdomadaire
        </Link>
        <Link href="/rp" className={getLinkStyle("/rp", isWide)}>
          <FaClipboardList className={iconSize} />
          Résolution de problèmes
        </Link>
        <Link href="/chat" className={getLinkStyle("/chat", isWide)}>
          <FaRobot className={iconSize} />
          Assistant IA
        </Link>
        <Link href="/notifications" className={getLinkStyle("/notifications", isWide)}>
          <FaBell className={iconSize} />
          Notifications
        </Link>
        <Link href="/workflow" className={getLinkStyle("/workflow", isWide)}>
          <FaIndustry className={iconSize} />
          Workflow de production
        </Link>
        <Link
          href={`/prediction${sheetCode ? `?sheet=${sheetCode}` : ""}`}
          className={getLinkStyle("/prediction", isWide)}
        >
          <FaChartLine className={iconSize} />
          Prédictions
        </Link>
      </>
    );
  };

  // Contenu commun pour le bas du sidebar (logout + paramètres)
  const renderBottomSection = (isWide) => {
    const iconSize = isWide ? "text-sm" : "text-[7px]";
    return (
      <div className={isWide ? "px-3 pb-4" : "px-1.5 pb-2"}>
        {isAdmin && (
          <>
            <div className={`px-1 pt-1.5 pb-1 text-[${isWide ? "10px" : "6px"}] tracking-wider text-gray-400 font-semibold border-t border-white/10`}>
              PARAMÈTRES GÉNÉRAUX
            </div>
            <Link href="/settings" className={getLinkStyle("/settings", isWide)}>
              <FaCog className={iconSize} />
              Paramètres
            </Link>
          </>
        )}
        <Link href="/api/auth/logout" className={`${getLinkStyle("/api/auth/logout", isWide)} text-red-400 mt-1`}>
          <FaSignOutAlt className={iconSize} />
          LOGOUT
        </Link>
      </div>
    );
  };

  // Variant pour les sidebars étroits (dashboard, supervision, prediction)
  if (variant === "dashboard" || variant === "supervision" || variant === "prediction") {
    return (
      <aside className="w-[105px] shrink-0 bg-[#0B1526] text-white flex flex-col justify-between">
        <div>
          <Link href="/" className="flex flex-col items-center gap-1 px-2.5 py-2.5 border-b border-white/10">
            <img src="/banner.png" className="w-full" />
            <span className="font-bold tracking-wide text-[8px]">
              MES <span className="font-extrabold">PERFORMANCE</span>
            </span>
          </Link>
          <div className="px-2.5 pt-2.5 pb-1 text-[6px] tracking-wider text-gray-400 font-semibold">SÉLECTION</div>
          <nav className="px-1.5 flex flex-col gap-0.5">{renderNavLinks(false)}</nav>
        </div>
        {renderBottomSection(false)}
      </aside>
    );
  }

  // Variant pour les sidebars larges (settings, rp, chat, notifications, workflow)
  if (variant === "settings" || variant === "rp" || variant === "chat" || variant === "notifications" || variant === "workflow") {
    return (
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
          <nav className="px-3 flex flex-col gap-1">{renderNavLinks(true)}</nav>
        </div>
        {renderBottomSection(true)}
      </aside>
    );
  }

  return null;
}