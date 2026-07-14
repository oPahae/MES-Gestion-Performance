import { query } from "../../lib/db";

async function loadDictionary(sheetId) {
  const rows = await query("SELECT id, categorie, libelle, poste_id FROM cause_dictionary WHERE sheet_id = ? ORDER BY id", [sheetId]);
  const dictionary = { risque: [], defaut: [], absence: [] };
  const postesRows = await query("SELECT id, nom FROM postes WHERE sheet_id = ?", [sheetId]);
  const posteById = {};
  postesRows.forEach((p) => (posteById[p.id] = p.nom));
  rows.forEach((r) => {
    if (r.categorie === "defaut") {
      const posteNom = r.poste_id ? posteById[r.poste_id] : null;
      dictionary.defaut.push(posteNom ? `${r.libelle} — ${posteNom}` : r.libelle);
    } else {
      dictionary[r.categorie].push(r.libelle);
    }
  });
  return dictionary;
}

async function loadSelections(sheetId, date) {
  const rows = await query("SELECT categorie, valeur, quantite FROM cause_selections WHERE sheet_id = ? AND date_jour = ?", [sheetId, date]);
  const selections = { place: [], risque: [], defaut: [], absence: [] };
  const absenceQuantities = {};
  rows.forEach((r) => {
    selections[r.categorie].push(r.valeur);
    if (r.categorie === "absence") {
      absenceQuantities[r.valeur] = r.quantite || 0;
    }
  });
  return { selections, absenceQuantities };
}

async function loadTemps(sheetId, date) {
  const rows = await query(
    "SELECT ROUND(ouverture / 60, 2) as ouverture, planifie, arret, changement, rupture, autre, gammes FROM cause_temps WHERE sheet_id = ? AND date_jour = ?",
    [sheetId, date]
  );
  return rows.length ? rows[0] : { ouverture:0, planifie:0, arret:0, changement:0, rupture:0, autre:0, gammes:0 };
}

export default async function handler(req, res) {
  const { sheetId, date } = req.query;

  if (req.method === "GET") {
    try {
      const [dictionary, selectionsData, temps] = await Promise.all([loadDictionary(sheetId), loadSelections(sheetId, date), loadTemps(sheetId, date)]);
      res.status(200).json({ dictionary, selections: selectionsData.selections, absenceQuantities: selectionsData.absenceQuantities, temps });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const body = req.body;
    try {
      if (body.type === "dictionary") {
        let posteId = null;
        if (body.posteLabel) {
          const posteRows = await query("SELECT id FROM postes WHERE sheet_id = ? AND nom = ?", [body.sheetId, body.posteLabel]);
          posteId = posteRows.length ? posteRows[0].id : null;
        }
        await query("INSERT INTO cause_dictionary (sheet_id, categorie, libelle, poste_id) VALUES (?, ?, ?, ?)", [
          body.sheetId,
          body.categorie,
          body.libelle,
          posteId,
        ]);
        const dictionary = await loadDictionary(body.sheetId);
        res.status(201).json({ dictionary });
        return;
      }

      if (body.type === "selection") {
        if (body.action === "add") {
          await query("INSERT INTO cause_selections (sheet_id, date_jour, categorie, valeur, quantite) VALUES (?, ?, ?, ?, ?)", [
            body.sheetId,
            body.date,
            body.categorie,
            body.valeur,
            body.categorie === "absence" ? 0 : null,
          ]);
        } else {
          await query("DELETE FROM cause_selections WHERE sheet_id = ? AND date_jour = ? AND categorie = ? AND valeur = ? LIMIT 1", [
            body.sheetId,
            body.date,
            body.categorie,
            body.valeur,
          ]);
        }
        const { selections, absenceQuantities } = await loadSelections(body.sheetId, body.date);
        res.status(200).json({ selections, absenceQuantities });
        return;
      }

      if (body.type === "absenceQuantity") {
        await query(
          "UPDATE cause_selections SET quantite = ? WHERE sheet_id = ? AND date_jour = ? AND categorie = 'absence' AND valeur = ?",
          [body.quantite, body.sheetId, body.date, body.valeur]
        );
        const { selections, absenceQuantities } = await loadSelections(body.sheetId, body.date);
        res.status(200).json({ selections, absenceQuantities });
        return;
      }

      if (body.type === "temps") {
        const { ouverture, planifie, arret, changement, rupture, autre, gammes } = body.temps;
        await query(
          `INSERT INTO cause_temps (sheet_id, date_jour, ouverture, planifie, arret, changement, rupture, autre, gammes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE ouverture = VALUES(ouverture), planifie = VALUES(planifie), arret = VALUES(arret),
             changement = VALUES(changement), rupture = VALUES(rupture), autre = VALUES(autre), gammes = VALUES(gammes)`,
          [body.sheetId, body.date, ouverture * 60, planifie, arret, changement, rupture, autre, gammes]
        );
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: "Type de requête inconnu" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée" });
}
