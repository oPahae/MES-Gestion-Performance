export const APP_USAGE_GUIDE = `
Application "MES Performance" — guide d'utilisation.

PAGES PRINCIPALES :
- Page d'accueil (/) : sélection d'une feuille de production (ligne ou machine) ou accès à la supervision hebdomadaire, à la résolution de problèmes ou à la prédiction.
- Tableau de bord (/dashboard/[sheet]) : suivi quotidien d'une feuille. Contient :
  I. Indicateurs KPI (cercles multicouches Sécurité/Qualité/Coût/Délai/Personnel) sur une période (semaine/mois/intervalle).
  II. Paramètres & causes de non-performance : saisie journalière des données de chaque KPI, causes (risques, défauts, absences) avec quantités réparties, temps industriels pour le Coût (ouverture, arrêts, gammes...).
  IV. Parétos : analyse des causes principales par KPI, filtrable par jour/semaine/mois.
  V. Plan d'actions : tableau des problèmes ou planning dynamique par semaine.
- Supervision hebdomadaire (/supervision) : vue consolidée en lecture seule, semaine par semaine, avec tendances sur 8 semaines glissantes (calculées en ratio des sommes, jamais en moyenne des taux).
- Résolution de problèmes (/rp et /probleme) : méthode 8D complète (D0 à D8), avec diagramme d'Ishikawa, arbre des causes racines, plans d'actions par étape, équipe avec rôles (logistique, qualité, méthodiste, chef d'équipe).
- Prédiction (/prediction) : prévisions futures des indicateurs basées sur l'historique (moyenne pondérée par jour de semaine + tendance récente).
- Paramètres admin (/settings) : gestion des feuilles/postes, listes déroulantes, utilisateurs (avec rôle), import/export Excel, compte admin.

FORMULES CLÉS :
- Taux de rebut = Nombre de rebuts / Quantité totale produite.
- Efficience (ligne) ou TRS (machine) = Quantité produite / Quantité objectif.
- PDP = Quantité produite / Quantité planifiée.
- Temps requis = Temps d'ouverture − Temps planifié.
- Temps de fonctionnement = Temps requis − (Arrêt + Changement + Rupture + Autre).
- Temps utile = Σ (Temps de gamme × Quantité produite). Temps de non qualité = Σ (Temps de gamme × Rebuts).
- Temps net = Temps utile + Temps de non qualité. Temps de ralentissement = Temps de fonctionnement − Temps net.
- Taux de disponibilité = Temps de fonctionnement / Temps requis. Taux de performance = Temps net / Temps requis. Taux de qualité = Temps utile / Temps requis.
- Toute agrégation hebdomadaire ou multi-jours utilise le ratio des sommes (jamais la moyenne des taux journaliers), pour éviter que les jours à faible volume ne faussent les résultats.

RÔLES : Utilisateur (accès à toutes les feuilles, saisie quotidienne) et Administrateur (configuration complète via /settings).
`.trim();