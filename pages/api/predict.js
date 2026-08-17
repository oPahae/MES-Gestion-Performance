import { query } from "../../lib/db";
import { addDaysIso, todayIso, enumerateDates } from "../../lib/dateUtils";
import { KPI_ORDER, getRingConfig, computeRingValue, computeTempsChain } from "../../lib/kpiLogic";
import { forecastSeries, seriesToMap, worstConfidence } from "../../lib/predictionEngine";

function dateKey(d) {
    if (!(d instanceof Date)) return String(d).slice(0, 10);
    return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

function computeKpiValue(kpiKey, params) {
    if (!params) return null;
    if (kpiKey === "S") return (Number(params.accidents) || 0) + (Number(params.risques) || 0);
    if (kpiKey === "Q") {
        const total = Number(params.quantiteTotale) || 0;
        const rebuts = Number(params.rebuts) || 0;
        return total > 0 ? Number(((rebuts / total) * 100).toFixed(1)) : 0;
    }
    if (kpiKey === "C") {
        const objectif = Number(params.quantiteObjectif) || 0;
        const produite = Number(params.quantiteProduite) || 0;
        return objectif > 0 ? Number(((produite / objectif) * 100).toFixed(1)) : 0;
    }
    if (kpiKey === "D") {
        const planifiee = Number(params.quantitePlanifiee) || 0;
        const produite = Number(params.quantiteProduite) || 0;
        return planifiee > 0 ? Number(((produite / planifiee) * 100).toFixed(1)) : 0;
    }
    if (kpiKey === "P") return Number(params.absents) || 0;
    return null;
}

function buildSeries(rows, field, isJson) {
    return rows
        .map((r) => {
            const key = dateKey(r.date_jour);
            let value;
            if (isJson) {
                const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
                value = Number(data[field]);
            } else {
                value = Number(r[field]);
            }
            return { date: key, value };
        })
        .filter((p) => Number.isFinite(p.value));
}

function toProjectedPareto(historicalCounts, predictedTotal, limit) {
    const entries = Object.entries(historicalCounts).sort((a, b) => b[1] - a[1]);
    const histTotal = entries.reduce((s, [, c]) => s + c, 0) || 1;
    if (predictedTotal <= 0 || entries.length === 0) return [];
    let cumulative = 0;
    const top = entries.slice(0, limit || entries.length);
    const rest = entries.slice(limit || entries.length);
    const scaled = top.map(([name, count]) => Math.round((count / histTotal) * predictedTotal));
    const restSum = Math.round((rest.reduce((s, [, c]) => s + c, 0) / histTotal) * predictedTotal);
    const total = scaled.reduce((a, b) => a + b, 0) + restSum || 1;
    const list = top.map(([name], i) => {
        cumulative += scaled[i];
        return { name, nombre: scaled[i], cumule: Math.round((cumulative / total) * 100) };
    });
    if (restSum > 0) {
        cumulative += restSum;
        list.push({ name: "Autre", nombre: restSum, cumule: Math.round((cumulative / total) * 100) });
    }
    return list;
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.status(405).json({ error: "Méthode non autorisée" });
        return;
    }

    const { sheetId, startDate, endDate, sheetType } = req.query;
    if (!sheetId || !startDate || !endDate) {
        res.status(400).json({ error: "Paramètres manquants" });
        return;
    }

    try {
        const today = todayIso();
        const histStart = addDaysIso(today, -180);
        const histEnd = addDaysIso(today, -1);
        const futureDays = enumerateDates(startDate, endDate);

        const kpiRows = await query(
            "SELECT kpi_key, date_jour, data FROM kpi_daily_params WHERE sheet_id = ? AND date_jour BETWEEN ? AND ? ORDER BY date_jour ASC",
            [sheetId, histStart, histEnd]
        );
        const tempsRows = await query(
            "SELECT date_jour, ouverture, planifie, arret, changement, rupture, autre, gammes FROM cause_temps WHERE sheet_id = ? AND date_jour BETWEEN ? AND ? ORDER BY date_jour ASC",
            [sheetId, histStart, histEnd]
        );
        const causeRows = await query(
            "SELECT categorie, valeur FROM cause_selections WHERE sheet_id = ? AND date_jour BETWEEN ? AND ?",
            [sheetId, histStart, histEnd]
        );

        const rowsByKpi = { S: [], Q: [], C: [], D: [], P: [] };
        kpiRows.forEach((r) => {
            if (rowsByKpi[r.kpi_key]) rowsByKpi[r.kpi_key].push(r);
        });

        const fieldsByKpi = {
            S: ["accidents", "risques"],
            Q: ["retoursClients", "rebuts", "quantiteTotale"],
            C: ["quantiteProduite", "quantiteObjectif"],
            D: ["quantiteProduite", "quantitePlanifiee"],
            P: ["absents"],
        };

        const predictedByKpiField = {};
        KPI_ORDER.forEach((k) => {
            predictedByKpiField[k] = {};
            fieldsByKpi[k].forEach((f) => {
                const series = buildSeries(rowsByKpi[k], f, true);
                predictedByKpiField[k][f] = seriesToMap(forecastSeries(series, futureDays, `${k}-${f}`));
            });
        });

        const tempsFields = ["ouverture", "planifie", "arret", "changement", "rupture", "autre", "gammes"];
        const predictedTemps = {};
        tempsFields.forEach((f) => {
            const series = buildSeries(tempsRows, f, false);
            predictedTemps[f] = seriesToMap(forecastSeries(series, futureDays, `temps-${f}`));
        });

        const predictedParamsByKpiDate = { S: {}, Q: {}, C: {}, D: {}, P: {} };
        const confidenceByKpiDate = { S: {}, Q: {}, C: {}, D: {}, P: {} };
        futureDays.forEach((date) => {
            KPI_ORDER.forEach((k) => {
                const params = {};
                const confs = [];
                fieldsByKpi[k].forEach((f) => {
                    const point = predictedByKpiField[k][f][date];
                    params[f] = point ? point.value : 0;
                    confs.push(point ? point.confidence : "faible");
                });
                predictedParamsByKpiDate[k][date] = params;
                confidenceByKpiDate[k][date] = worstConfidence(confs);
            });
        });

        const kpis = {};
        KPI_ORDER.forEach((k) => {
            const ringConfig = getRingConfig(k, sheetType);
            kpis[k] = {
                ringCells: ringConfig.map((cfg) => ({
                    name: cfg.name,
                    type: cfg.type,
                    cells: futureDays.map((date) => {
                        const { value, status } = computeRingValue(k, cfg.name, predictedParamsByKpiDate[k][date]);
                        return { value, status };
                    }),
                })),
                params: futureDays.map((date) => ({
                    date,
                    ...predictedParamsByKpiDate[k][date],
                    confidence: confidenceByKpiDate[k][date],
                })),
                trend: futureDays.map((date) => ({
                    date,
                    valeur: computeKpiValue(k, predictedParamsByKpiDate[k][date]),
                })),
            };
        });

        const tempsChainPerDay = futureDays.map((date) => {
            const temps = {
                ouverture: predictedTemps.ouverture[date]?.value || 0,
                planifie: predictedTemps.planifie[date]?.value || 0,
                arret: predictedTemps.arret[date]?.value || 0,
                changement: predictedTemps.changement[date]?.value || 0,
                rupture: predictedTemps.rupture[date]?.value || 0,
                autre: predictedTemps.autre[date]?.value || 0,
                gammes: predictedTemps.gammes[date]?.value || 0,
            };
            const qtyProduite = predictedParamsByKpiDate.C[date]?.quantiteProduite || 0;
            const qtyRebut = predictedParamsByKpiDate.Q[date]?.rebuts || 0;
            const chain = computeTempsChain(temps, qtyProduite, qtyRebut);
            return { date, ...chain };
        });

        kpis.C.tempsTrend = tempsChainPerDay.map((c) => ({
            date: c.date,
            disponibilite: c.tempsRequisH > 0 ? Number(((c.tempsFonctionnementH / c.tempsRequisH) * 100).toFixed(1)) : 0,
            performance: c.tempsRequisH > 0 ? Number(((c.tempsNetH / c.tempsRequisH) * 100).toFixed(1)) : 0,
            qualite: c.tempsRequisH > 0 ? Number(((c.tempsUtileH / c.tempsRequisH) * 100).toFixed(1)) : 0,
        }));

        const sumH = (field) => Math.round(tempsChainPerDay.reduce((s, c) => s + (c[field] || 0), 0) * 100) / 100;
        const tempsCout = [
            { name: "Arrêt\nmachine", valeur: sumH("arret") || sumTemp(predictedTemps.arret, futureDays, 60) },
            { name: "Changement\nsérie", valeur: sumTemp(predictedTemps.changement, futureDays, 60) },
            { name: "Rupture\nstock", valeur: sumTemp(predictedTemps.rupture, futureDays, 60) },
            { name: "Non\nqualité", valeur: sumH("tempsNonQualiteH") },
            { name: "Ralentissement", valeur: sumH("tempsRalentissementH") },
        ];

        const countsByCategorie = { place: {}, risque: {}, defaut: {}, absence: {} };
        causeRows.forEach((r) => {
            if (r.categorie === "defaut") {
                const key = r.valeur.split(" — ")[0];
                countsByCategorie.defaut[key] = (countsByCategorie.defaut[key] || 0) + 1;
                return;
            }
            countsByCategorie[r.categorie][r.valeur] = (countsByCategorie[r.categorie][r.valeur] || 0) + 1;
        });

        const predictedRisquesTotal = futureDays.reduce((s, d) => s + (predictedParamsByKpiDate.S[d]?.risques || 0), 0);
        const predictedRebutsTotal = futureDays.reduce((s, d) => s + (predictedParamsByKpiDate.Q[d]?.rebuts || 0), 0);
        const predictedAbsentsTotal = futureDays.reduce((s, d) => s + (predictedParamsByKpiDate.P[d]?.absents || 0), 0);

        const risquesPareto = toProjectedPareto(countsByCategorie.risque, predictedRisquesTotal, 4);
        const defautsPareto = toProjectedPareto(countsByCategorie.defaut, predictedRebutsTotal, 4);
        const absencesRaw = toProjectedPareto(countsByCategorie.absence, predictedAbsentsTotal, 100);
        const absences = absencesRaw.map((a) => ({ name: a.name, valeur: a.nombre }));

        const placeHistTotal = Object.values(countsByCategorie.place).reduce((a, b) => a + b, 0) || 1;
        const placeCounts = Object.entries(countsByCategorie.place).map(([place, count]) => ({
            place,
            count: Math.round((count / placeHistTotal) * predictedRisquesTotal),
        }));

        const overallConfidence = worstConfidence(
            KPI_ORDER.flatMap((k) => kpis[k].params.map((p) => p.confidence))
        );

        res.status(200).json({
            days: futureDays,
            kpis,
            pareto: { risquesPareto, defautsPareto, absences, placeCounts, tempsCout },
            meta: { historicalWindowStart: histStart, historicalWindowEnd: histEnd, overallConfidence },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

function sumTemp(map, days, divisor) {
    const totalMin = days.reduce((s, d) => s + (map[d]?.value || 0), 0);
    return Math.round((totalMin / divisor) * 100) / 100;
}