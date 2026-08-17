import * as XLSX from "xlsx";

export function toDateString(value) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dt = new Date(trimmed);
    if (!isNaN(dt.getTime())) {
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    }
    return "";
  }
  return "";
}

export function readWorkbookSheet(workbook, sheetName, columns) {
  const found = workbook.SheetNames.find((n) => n === sheetName);
  if (!found) return null;
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[found], { defval: "" });
  return rows.map((r) => {
    const out = {};
    columns.forEach((col) => {
      out[col] = col === "Date" ? toDateString(r[col]) : r[col] === "" || r[col] === undefined ? "" : r[col];
    });
    return out;
  });
}