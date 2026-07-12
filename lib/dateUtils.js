function isValidIso(iso) {
  return (
    typeof iso === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(iso) &&
    !isNaN(new Date(`${iso}T00:00:00`).getTime())
  );
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function addDaysIso(iso, n) {
  const base = isValidIso(iso) ? iso : todayIso();
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function computeDays(periode, customStart, customEnd) {
  const today = todayIso();

  let start, end;

  if (periode === "semaine") {
    start = addDaysIso(today, -6);
    end = today;
  } else if (periode === "mois") {
    start = addDaysIso(today, -29);
    end = today;
  } else {
    start = isValidIso(customStart) ? customStart : addDaysIso(today, -6);
    end = isValidIso(customEnd) ? customEnd : today;
    if (end < start) end = start;
  }

  const out = [];
  let cur = start;
  let guard = 0;

  while (cur <= end && guard < 60) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
    guard++;
  }

  return out;
}

export function fmtFR(iso) {
  if (!isValidIso(iso)) return "--/--/----";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatShortDay(iso) {
  if (!isValidIso(iso)) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function getMondayIso(iso) {
  const base = isValidIso(iso) ? iso : todayIso();
  const d = new Date(`${base}T00:00:00`);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeWeeks(periode, customStartWeek, customEndWeek) {
  const thisMonday = getMondayIso(todayIso());
  let start, end;

  if (periode === "4semaines") {
    end = thisMonday;
    start = addDaysIso(thisMonday, -21);
  } else if (periode === "12semaines") {
    end = thisMonday;
    start = addDaysIso(thisMonday, -77);
  } else {
    start = isValidIso(customStartWeek) ? getMondayIso(customStartWeek) : addDaysIso(thisMonday, -21);
    end = isValidIso(customEndWeek) ? getMondayIso(customEndWeek) : thisMonday;
    if (end < start) end = start;
  }

  const out = [];
  let cur = start;
  let guard = 0;

  while (cur <= end && guard < 26) {
    out.push(cur);
    cur = addDaysIso(cur, 7);
    guard++;
  }

  return out;
}

export function computeTrailingWeeks(endWeekIso, count = 8) {
  const end = isValidIso(endWeekIso) ? getMondayIso(endWeekIso) : getMondayIso(todayIso());
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(addDaysIso(end, -7 * i));
  }
  return out;
}

export function fmtWeekLabel(iso) {
  const end = addDaysIso(iso, 6);
  return `${fmtFR(iso)} → ${fmtFR(end)}`;
}

export function fmtWeekLabelShort(iso) {
  const end = addDaysIso(iso, 6);
  const [ys, ms, ds] = iso.split("-");
  const [ye, me, de] = end.split("-");
  if (ys === ye && ms === me) {
    return `${ds} - ${de}/${me}/${ye}`;
  }
  if (ys === ye) {
    return `${ds}/${ms} - ${de}/${me}/${ye}`;
  }
  return `${ds}/${ms}/${ys} - ${de}/${me}/${ye}`;
}