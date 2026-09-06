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
  role ENUM('logistique','qualite','methodiste','chef_equipe') NOT NULL DEFAULT 'chef_equipe',
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
  role VARCHAR(50) NULL,
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

CREATE TABLE anomaly_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  role ENUM('methodiste','logistique','qualite') NOT NULL,
  destinataire_email VARCHAR(150) NOT NULL,
  destinataire_nom VARCHAR(150) NOT NULL,
  date_jour DATE NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
);

CREATE TABLE workflow_postes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero INT NOT NULL UNIQUE,
  titre VARCHAR(150) NOT NULL,
  sous_titre VARCHAR(200) NOT NULL,
  couleur VARCHAR(20) NOT NULL,
  resultat_attendu TEXT NULL,
  ordre INT NOT NULL
);

CREATE TABLE workflow_etapes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poste_id INT NOT NULL,
  numero INT NOT NULL,
  description TEXT NOT NULL,
  FOREIGN KEY (poste_id) REFERENCES workflow_postes(id) ON DELETE CASCADE
);

CREATE TABLE workflow_pieces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poste_id INT NOT NULL,
  nom VARCHAR(200) NOT NULL,
  quantite INT NOT NULL DEFAULT 1,
  FOREIGN KEY (poste_id) REFERENCES workflow_postes(id) ON DELETE CASCADE
);

CREATE TABLE workflow_defauts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poste_id INT NULL,
  categorie VARCHAR(150) NOT NULL,
  libelle VARCHAR(200) NOT NULL,
  est_bon BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (poste_id) REFERENCES workflow_postes(id) ON DELETE CASCADE
);

CREATE TABLE workflow_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  statut ENUM('en_cours','termine','annule') NOT NULL DEFAULT 'en_cours',
  started_by VARCHAR(150) NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL
);

CREATE TABLE workflow_run_postes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_id INT NOT NULL,
  poste_id INT NOT NULL,
  valide BOOLEAN NOT NULL DEFAULT FALSE,
  valide_at TIMESTAMP NULL,
  controle_qualite_ok BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_user VARCHAR(150) NULL,
  UNIQUE KEY uniq_run_poste (run_id, poste_id),
  FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (poste_id) REFERENCES workflow_postes(id) ON DELETE CASCADE
);

CREATE TABLE workflow_run_etapes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_id INT NOT NULL,
  etape_id INT NOT NULL,
  valide BOOLEAN NOT NULL DEFAULT FALSE,
  valide_at TIMESTAMP NULL,
  UNIQUE KEY uniq_run_etape (run_id, etape_id),
  FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (etape_id) REFERENCES workflow_etapes(id) ON DELETE CASCADE
);

INSERT INTO workflow_postes
(numero, titre, sous_titre, couleur, resultat_attendu, ordre)
VALUES
(1, 'POSTE 01', 'Montage de la tête de l''avion', '#C1440E',
'Tête de l''avion assemblée avec pare-brise et support de train avant.', 1),
(2, 'POSTE 02', 'Montage des ailes de l''avion', '#1E4FA0',
'Ailes assemblées avec les deux réacteurs fixés symétriquement.', 2),
(3, 'POSTE 03', 'Montage de la queue de l''avion', '#4C7A2A',
'Queue assemblée avec dérive verticale jaune et rouge.', 3),
(4, 'POSTE 04', 'Assemblage complet de l''avion', '#5B3E9E',
'Avion complet, contrôlé et déposé en zone produits finis.', 4);

INSERT INTO workflow_etapes (poste_id, numero, description) VALUES
  (1, 1, 'Placer la brique rouge 1×6 pour former le corps inférieur de la tête.'),
  (1, 2, 'Insérer la slope transparente 1×1 pour le pare-brise avant et la brique transparente 1×1 en arrière.'),
  (1, 3, 'Ajouter la plaque rouge (1x2), la brique transparente, puis la blanche.'),
  (1, 4, 'Poser la plaque blanche 1x2 et la plaque blanche longue 1×8 sur le dessus pour finaliser la tête.'),
  (1, 5, 'Fixer le support cylindrique gris foncé sur la bague noire au dessous de la plaque blanche spéciale comme support.'),

  (2, 1, 'Positionner la grande plaque noire 2×12 comme base principale des ailes.'),
  (2, 2, 'Placer la brique rouge jumper 2x2 au centre comme point d’ancrage fuselage.'),
  (2, 3, 'Ajouter les slopes rouges aux deux extrémités pour les embouts d’ailes.'),
  (2, 4, 'Établir les deux réacteurs formés par l’ensemble (plaque grise noire × brique spéciale × cône gris × plaque ronde grise).'),
  (2, 5, 'Positionner les deux ensembles à une position des extrémités de la grande plaque noire 2×12.'),

  (3, 1, 'Poser la plaque jaune 1×6 verticalement comme base de la queue.'),
  (3, 2, 'Assembler une brique rouge 1×4 à partir de la première extrémité et une brique rouge transparente 1×1 sur l’autre extrémité de la pièce jaune.'),
  (3, 3, 'Fixer la plaque grise 1×3 horizontalement entre les deux plaques.'),
  (3, 4, 'Fixer la brique rouge 1x2 au dessous de la brique transparente et de la plaque grise.'),
  (3, 5, 'Placer le slope jaune grand sur cette brique rouge, puis installer le slope jaune petit juste devant.'),

  (4, 1, 'Réceptionner les 3 sous-ensembles (tête, ailes, queue) et vérifier leur conformité visuelle.'),
  (4, 2, 'Connecter la plaque noire des ailes au fuselage central comme base.'),
  (4, 3, 'Fixer la tête de l’avion à l’avant via le pivot cylindrique.'),
  (4, 4, 'Assembler la queue à l’arrière et aligner la dérive verticale.'),
  (4, 5, 'Vérifier la solidité de tous les emboîtements et la stabilité globale.'),
  (4, 6, 'Valider l’avion terminé et le déposer en zone produits finis.');

INSERT INTO workflow_pieces (poste_id, nom, quantite) VALUES
  (1, 'Plaque spéciale blanche 1x2', 1),
  (1, 'Plaque rouge 1×6', 1),
  (1, 'Brique blanche 1x1', 1),
  (1, 'Plaque blanche 1×2', 1),
  (1, 'Slope transparent 1×1', 1),
  (1, 'Brique transparente 1×1', 1),
  (1, 'Plaque blanche 1×8', 1),
  (1, 'Plaque ronde noire', 1),
  (1, 'Goupille grise', 1),

  (2, 'Plaque gris noire 2×12', 1),
  (2, 'Slope rouge 1x1', 2),
  (2, 'Plaque 2x2 avec tenon central', 1),
  (2, 'Brique spéciale 1x1 avec tenon latéral', 2),
  (2, 'Cône 1x1 avec rainure supérieure grise', 2),
  (2, 'Plaque ronde 1x1', 2),
  (2, 'Plaque 1x3 grise noire', 2),

  (3, 'Plaque jaune 1×6', 1),
  (3, 'Plaque grise 1×3', 1),
  (3, 'Brique rouge 1×2', 1),
  (3, 'Brique transparente rouge 1×1', 1),
  (3, 'Brique rouge 1×4', 1),
  (3, 'Slope jaune grand', 1),
  (3, 'Slope jaune petit', 1);

INSERT INTO workflow_defauts (poste_id, categorie, libelle, est_bon) VALUES
  (2, 'Réacteur', 'Réacteur bon', 1),
  (2, 'Réacteur', 'Réacteur inversé', 0),
  (2, 'Réacteur', 'Réacteur décalé', 0),

  (2, 'Ailes d’avion', 'Ailes bonnes', 1),
  (2, 'Ailes d’avion', 'Décalage des réacteurs / asymétrie des réacteurs', 0),
  (2, 'Ailes d’avion', 'Décalage des réacteurs', 0),
  (2, 'Ailes d’avion', 'Pièce spéciale non centrée', 0),
  (2, 'Ailes d’avion', 'Position des slopes inversée', 0),

  (3, 'Queue d’avion', 'Queue bon montage', 1),
  (3, 'Queue d’avion', 'Inversion de la position de la brique transparente', 0),
  (3, 'Queue d’avion', 'Inversion de la position de la plaque rouge', 0),
  (3, 'Queue d’avion', 'Plaque décalée', 0),
  (3, 'Queue d’avion', 'Pièce manquante', 0),

  (1, 'Tête d’avion', 'Tête bon montage', 1),
  (1, 'Tête d’avion', 'Oubli de la plaque spéciale blanche', 0),
  (1, 'Tête d’avion', 'Inversion de la goupille', 0),
  (1, 'Tête d’avion', 'Inversion des pièces', 0);