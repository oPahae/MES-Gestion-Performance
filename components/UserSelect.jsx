import { useEffect, useRef, useState } from "react";
import { FaSearch, FaChevronDown, FaTimes } from "react-icons/fa";
import { ROLE_LABELS } from "../lib/userLogic";

export default function UserSelect({ users, value, onChange, placeholder = "Sélectionner...", allowClear = true, compact = false, floating = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openDropdown() {
    if (floating && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropWidth = 220;
      let left = rect.left;
      let top = rect.bottom + 4;
      if (left + dropWidth > window.innerWidth) left = window.innerWidth - dropWidth - 8;
      if (top > window.innerHeight) top = rect.top - 224;
      // if (top + 220 > window.innerHeight) top = rect.top - 224;
      setPos({ x: Math.max(4, left), y: Math.max(4, top), width: dropWidth });
    }
    setOpen((o) => !o);
  }

  const filtered = (users || []).filter(
    (u) => u.nom.toLowerCase().includes(search.toLowerCase()) || (ROLE_LABELS[u.role] || "").toLowerCase().includes(search.toLowerCase())
  );
  const selectedUser = (users || []).find((u) => u.nom === value);

  const textSize = compact ? "text-[6px]" : "text-sm";
  const padding = compact ? "px-1 py-1" : "px-3 py-2";

  const dropdownContent = (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-lg ${compact ? "p-1" : "p-2"}`}
      style={floating ? { width: pos ? pos.width : 220 } : undefined}
    >
      <div className={`flex items-center gap-1 border border-gray-200 rounded-md ${compact ? "px-1 py-0.5" : "px-2 py-1.5"} mb-1`}>
        <FaSearch className={`text-gray-300 ${compact ? "text-[5px]" : "text-xs"}`} />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className={`outline-none flex-1 ${textSize}`}
        />
      </div>
      <div className={`${compact ? "max-h-24" : "max-h-48"} overflow-auto flex flex-col`}>
        {filtered.length === 0 && (
          <span className={`text-gray-300 ${compact ? "px-1 py-0.5" : "px-2 py-1.5"} ${textSize}`}>Aucun résultat</span>
        )}
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => {
              onChange(u.nom);
              setOpen(false);
              setSearch("");
            }}
            className={`flex items-center justify-between text-left rounded-md hover:bg-gray-50 ${compact ? "px-1 py-1" : "px-2 py-1.5"} ${textSize} ${
              value === u.nom ? "bg-blue-50" : ""
            }`}
          >
            <span className="text-gray-700 font-medium truncate">{u.nom}</span>
            <span
              className={`shrink-0 ${compact ? "text-[5px]" : "text-[10px]"} font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5 ml-1`}
            >
              {ROLE_LABELS[u.role] || u.role}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      <div
        ref={triggerRef}
        onClick={openDropdown}
        className={`border border-gray-200 rounded-lg ${padding} flex items-center justify-between cursor-pointer bg-white ${textSize}`}
      >
        <span className={selectedUser ? "text-gray-700 font-medium truncate" : "text-gray-300 truncate"}>
          {selectedUser ? `${selectedUser.nom} — ${ROLE_LABELS[selectedUser.role] || selectedUser.role}` : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selectedUser && (
            <FaTimes
              className="text-gray-300 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
          <FaChevronDown className={`text-gray-300 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && !floating && (
        <div className="absolute z-30 mt-1 w-full" onMouseDown={(e) => e.stopPropagation()}>
          {dropdownContent}
        </div>
      )}

      {open && floating && pos && (
        <div className="fixed z-50" style={{ left: pos.x, top: pos.y }} onMouseDown={(e) => e.stopPropagation()}>
          {dropdownContent}
        </div>
      )}
    </div>
  );
}