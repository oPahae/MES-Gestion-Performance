DROP DATABASE IF EXISTS mes_performance;
CREATE DATABASE mes_performance CHARACTER SET utf8mb4;
USE mes_performance;

CREATE TABLE sheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  type ENUM('ligne', 'machine') NOT NULL
);

CREATE TABLE postes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  nom VARCHAR(100) NOT NULL,
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
);

CREATE TABLE kpi_daily_params (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  kpi_key ENUM('S', 'Q', 'C', 'D', 'P') NOT NULL,
  date_jour DATE NOT NULL,
  data JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_sheet_kpi_day (sheet_id, kpi_key, date_jour),
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
);

CREATE TABLE cause_dictionary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  categorie ENUM('risque', 'defaut', 'absence') NOT NULL,
  libelle VARCHAR(150) NOT NULL,
  poste_id INT NULL,
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE,
  FOREIGN KEY (poste_id) REFERENCES postes(id) ON DELETE SET NULL
);

CREATE TABLE cause_selections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  date_jour DATE NOT NULL,
  categorie ENUM('place', 'risque', 'defaut', 'absence') NOT NULL,
  valeur VARCHAR(150) NOT NULL,
  quantite INT NULL,
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
);

CREATE TABLE cause_temps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  date_jour DATE NOT NULL,
  ouverture INT NOT NULL DEFAULT 0,
  planifie INT NOT NULL DEFAULT 0,
  arret INT NOT NULL DEFAULT 0,
  changement INT NOT NULL DEFAULT 0,
  rupture INT NOT NULL DEFAULT 0,
  autre INT NOT NULL DEFAULT 0,
  gammes INT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_sheet_temps_day (sheet_id, date_jour),
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
);

CREATE TABLE retour_client_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  date_jour DATE NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  texte TEXT NOT NULL,
  image LONGBLOB NULL,
  image_mime VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
);

CREATE TABLE actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  date_jour DATE NOT NULL,
  date_fin DATE NULL,
  probleme VARCHAR(200) NOT NULL,
  action VARCHAR(200) NOT NULL,
  pilote VARCHAR(100) NOT NULL DEFAULT '',
  statut ENUM('a_faire', 'en_cours', 'termine') NOT NULL DEFAULT 'a_faire',
  kpi_key ENUM('S','Q','C','D','P') NOT NULL DEFAULT 'S',
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
);

CREATE TABLE planning_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  date_jour DATE NOT NULL,
  date_fin DATE NULL,
  texte VARCHAR(200) NOT NULL,
  action_id INT NULL,
  kpi_key ENUM('S','Q','C','D','P') NULL,
  probleme VARCHAR(200) NULL,
  detail_action VARCHAR(200) NULL,
  pilote VARCHAR(100) NULL,
  statut ENUM('a_faire','en_cours','termine') NULL,
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_planning_action FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

CREATE TABLE pareto_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  titre VARCHAR(150) NOT NULL,
  sous_titre VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO sheets (code, label, type) VALUES
  ('ligneAvion1', 'Ligne Avion 1', 'ligne'),
  ('ligneAvion2', 'Ligne Avion 2', 'ligne'),
  ('machineDeProduction', 'Machine de Production', 'machine');

INSERT INTO postes (sheet_id, nom) VALUES
  (1, 'Poste 1'), (1, 'Poste 2'), (1, 'Poste 3'),
  (2, 'Poste 1'), (2, 'Poste 2'),
  (3, 'Poste 1'), (3, 'Poste 2');

INSERT INTO kpi_daily_params (sheet_id, kpi_key, date_jour, data) VALUES
  (1, 'S', CURDATE(), JSON_OBJECT('accidents', 0, 'risques', 1)),
  (1, 'Q', CURDATE(), JSON_OBJECT('retoursClients', 1, 'rebuts', 8, 'quantiteTotale', 480)),
  (1, 'C', CURDATE(), JSON_OBJECT('quantiteProduite', 460, 'quantiteObjectif', 500)),
  (1, 'D', CURDATE(), JSON_OBJECT('quantiteProduite', 460, 'quantitePlanifiee', 500)),
  (1, 'P', CURDATE(), JSON_OBJECT('absents', 1));

INSERT INTO cause_dictionary (sheet_id, categorie, libelle, poste_id) VALUES
  (1, 'risque', 'Chute de plain-pied', NULL),
  (1, 'risque', 'Coupure', NULL),
  (1, 'risque', 'Risque électrique', NULL),
  (1, 'defaut', 'Rayure', 1),
  (1, 'defaut', 'Perçage mauvais diamètre', 2),
  (1, 'absence', 'Maladie', NULL),
  (1, 'absence', 'RDV médical', NULL);

CREATE TABLE problemes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  probleme VARCHAR(255) NOT NULL DEFAULT '',
  ligne VARCHAR(150) NOT NULL DEFAULT '',
  pilote VARCHAR(150) NOT NULL DEFAULT '',
  date_ouverture DATETIME NOT NULL,
  quoi TEXT NULL,
  qui TEXT NULL,
  ou TEXT NULL,
  quand_txt TEXT NULL,
  combien TEXT NULL,
  comment_txt TEXT NULL,
  pourquoi TEXT NULL,
  autre_ligne_existe BOOLEAN NOT NULL DEFAULT FALSE,
  validation_nom VARCHAR(150) NULL,
  validation_date DATE NULL,
  validation_signature BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE probleme_equipe (
  id INT AUTO_INCREMENT PRIMARY KEY,
  probleme_id INT NOT NULL,
  nom VARCHAR(150) NOT NULL,
  FOREIGN KEY (probleme_id) REFERENCES problemes(id) ON DELETE CASCADE
);

CREATE TABLE probleme_causes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  probleme_id INT NOT NULL,
  bloc ENUM('milieu','methode','machine','main_oeuvre','matiere') NOT NULL,
  parent_id INT NULL,
  niveau INT NOT NULL DEFAULT 0,
  texte VARCHAR(255) NOT NULL,
  cause_racine BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (probleme_id) REFERENCES problemes(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES probleme_causes(id) ON DELETE CASCADE
);

CREATE TABLE probleme_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  probleme_id INT NOT NULL,
  type ENUM('d3','d56','d7_transverse','d7_autre_ligne') NOT NULL,
  cause_id INT NULL,
  ligne VARCHAR(150) NULL,
  action VARCHAR(255) NOT NULL DEFAULT '',
  pilote VARCHAR(150) NOT NULL DEFAULT '',
  date_debut DATE NULL,
  date_fin DATE NULL,
  date_replanification DATE NULL,
  statut ENUM('a_faire','en_cours','termine') NOT NULL DEFAULT 'a_faire',
  piece_jointe LONGBLOB NULL,
  piece_jointe_mime VARCHAR(100) NULL,
  piece_jointe_nom VARCHAR(200) NULL,
  FOREIGN KEY (probleme_id) REFERENCES problemes(id) ON DELETE CASCADE,
  FOREIGN KEY (cause_id) REFERENCES probleme_causes(id) ON DELETE SET NULL
);