function groupByWeekday(series) {
  const buckets = Array.from({ length: 7 }, () => []);
  series.forEach((p) => {
    const wd = new Date(`${p.date}T00:00:00`).getDay();
    buckets[wd].push(p);
  });
  return buckets;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr, avg) {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - avg) * (v - avg), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function ewma(values, alpha) {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

function recentTrendSlope(series, windowDays) {
  const recent = series.slice(-windowDays);
  if (recent.length < 6) return 0;
  const n = recent.length;
  const xs = recent.map((_, i) => i);
  const ys = recent.map((p) => p.value);
  const meanX = mean(xs);
  const meanY = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) * (xs[i] - meanX);
  }
  return den === 0 ? 0 : num / den;
}

function deterministicResidual(dateStr, seed, amplitude) {
  let hash = 0;
  const str = `${dateStr}-${seed}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const normalized = (hash % 2000) / 1000 - 1;
  return normalized * amplitude;
}

export function forecastSeries(historical, futureDates, seedKey = "v") {
  const clean = (historical || []).filter((p) => Number.isFinite(p.value)).sort((a, b) => (a.date < b.date ? -1 : 1));

  if (clean.length === 0) {
    return futureDates.map((date) => ({ date, value: 0, confidence: "faible" }));
  }

  if (clean.length < 7) {
    const avg = mean(clean.map((p) => p.value));
    return futureDates.map((date, i) => ({
      date,
      value: Math.max(0, Math.round((avg + deterministicResidual(date, seedKey, avg * 0.1)) * 100) / 100),
      confidence: "faible",
    }));
  }

  const weekdayBuckets = groupByWeekday(clean);
  const weekdayStats = weekdayBuckets.map((bucket) => {
    const vals = bucket.map((p) => p.value);
    const recentVals = vals.slice(-8);
    const base = recentVals.length ? ewma(recentVals, 0.35) : mean(vals);
    const avg = mean(vals);
    const sd = stdDev(vals, avg);
    return { base, avg, sd, count: vals.length };
  });

  const overallAvg = mean(clean.map((p) => p.value));
  const overallSd = stdDev(clean.map((p) => p.value), overallAvg) || overallAvg * 0.05 || 1;

  const slope = recentTrendSlope(clean, 28);
  const lastDate = clean[clean.length - 1].date;

  const minCount = Math.min(...weekdayStats.map((w) => w.count));
  let confidence = "moyenne";
  if (clean.length >= 42 && minCount >= 3) confidence = "élevée";
  else if (clean.length < 14 || minCount === 0) confidence = "faible";

  function daysDiff(fromIso, toIso) {
    const a = new Date(`${fromIso}T00:00:00`).getTime();
    const b = new Date(`${toIso}T00:00:00`).getTime();
    return Math.round((b - a) / 86400000);
  }

  return futureDates.map((date) => {
    const wd = new Date(`${date}T00:00:00`).getDay();
    const stat = weekdayStats[wd];
    const daysAhead = Math.max(1, daysDiff(lastDate, date));

    const trendAdjusted = stat.count > 0 ? stat.base + slope * daysAhead : overallAvg + slope * daysAhead;

    const amplitude = stat.count >= 2 ? stat.sd : overallSd;
    const residual = deterministicResidual(date, seedKey, amplitude * 0.6);

    const raw = trendAdjusted + residual;
    return { date, value: Math.max(0, Math.round(raw * 100) / 100), confidence };
  });
}

export function seriesToMap(forecasted) {
  const map = {};
  forecasted.forEach((f) => {
    map[f.date] = f;
  });
  return map;
}

export function worstConfidence(list) {
  if (list.some((c) => c === "faible")) return "faible";
  if (list.some((c) => c === "moyenne")) return "moyenne";
  return "élevée";
}