# MES Performance

Application de gestion de performance industrielle (MES) — Next.js (Pages Router) + MySQL + TailwindCSS.

## Fonctionnalités

- Page d'accueil : sélection d'une feuille (Ligne Avion 1, Ligne Avion 2, Machine DE) ou de la Supervision hebdomadaire.
- Tableau de bord par feuille (non scrollable, tient sur un écran) :
  - I. Indicateurs KPI (S, Q, C, D, P) sous forme d'anneaux : jours de la période + valeur réelle du paramètre par jour.
  - II. Paramètres des KPI : saisie journalière, calcul automatique, écriture en base.
  - III. Causes de non-performance : listes déroulantes avec recherche et ajout (persistées en base), temps (section Coût), tickets (Délai).
  - IV. Parétos : calculés à partir des données réelles enregistrées (causes, temps, KPI).
  - V. Plan d'actions : tableau CRUD du jour sélectionné + planning dynamique avec glisser-déposer entre les jours.
- Filtre commun (date) pour afficher/éditer les données d'un jour historique dans les sections II, III et V.
- Page Supervision hebdomadaire : vue d'ensemble du statut de chaque KPI pour toutes les feuilles.

## Installation

### 1. Prérequis

- Node.js 18+
- MySQL 8+ (ou MariaDB compatible)

### 2. Installer les dépendances

```bash
npm install
```

### 3. Créer la base de données

```bash
mysql -u root -p < sql/schema.sql
```

Ce script crée la base `mes_performance`, toutes les tables, et insère les 3 feuilles ainsi que quelques données de démonstration.

### 4. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditez `.env` avec vos identifiants MySQL :

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=mes_performance
```

### 5. Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
lib/            logique partagée (connexion MySQL, dates, règles KPI, client HTTP)
pages/          routes Next.js (pages + API)
pages/api/      routes API (accès MySQL)
sql/schema.sql  schéma + données de démonstration
styles/         feuille Tailwind globale
```

Aucune authentification n'est mise en place, conformément au cahier des charges.
