-- =====================================================
-- MedFinder database
-- Run this file once to create the database, the tables
-- and the admin account. It is safe to run again: it
-- skips what exists and adds anything that is missing.
-- =====================================================

CREATE DATABASE IF NOT EXISTS medfinder
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medfinder;

-- All accounts: medicine seekers, pharmacy owners and the admin
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','pharmacy','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
  MODIFY role ENUM('user','pharmacy','admin') NOT NULL DEFAULT 'user';

-- Pharmacy details, one row per pharmacy owner
-- is_verified: 0 = waiting for review, 1 = approved, 2 = rejected
CREATE TABLE IF NOT EXISTS pharmacies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  license_number VARCHAR(60) NOT NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL,
  opening_time TIME NULL,
  closing_time TIME NULL,
  latitude DECIMAL(9,6) NULL,
  longitude DECIMAL(9,6) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  rejection_reason VARCHAR(255) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- For databases created by an older version: add the review columns if missing
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pharmacies' AND COLUMN_NAME = 'rejection_reason');
SET @q := IF(@c = 0, 'ALTER TABLE pharmacies ADD COLUMN rejection_reason VARCHAR(255) NULL', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pharmacies' AND COLUMN_NAME = 'reviewed_at');
SET @q := IF(@c = 0, 'ALTER TABLE pharmacies ADD COLUMN reviewed_at TIMESTAMP NULL', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- Map position of each pharmacy (used for "nearby" search). Stays empty until the pharmacy sets a pin.
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pharmacies' AND COLUMN_NAME = 'latitude');
SET @q := IF(@c = 0, 'ALTER TABLE pharmacies ADD COLUMN latitude DECIMAL(9,6) NULL, ADD COLUMN longitude DECIMAL(9,6) NULL', 'SELECT 1');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

-- Medicine catalog shared by all pharmacies (a medicine exists once here)
CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  generic_name VARCHAR(150) NULL,
  form VARCHAR(30) NOT NULL,
  strength VARCHAR(40) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_medicine (name, strength, form),
  INDEX idx_generic (generic_name)
);

-- Stock: which pharmacy has which medicine, at what price, and how many
CREATE TABLE IF NOT EXISTS stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pharmacy_id INT NOT NULL,
  medicine_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pharmacy_medicine (pharmacy_id, medicine_id),
  INDEX idx_medicine (medicine_id),
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
);

-- Reservations: medicine a customer holds for pickup for a short time
CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pharmacy_id INT NOT NULL,
  medicine_id INT NOT NULL,
  stock_id INT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  hold_minutes INT NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('active','collected','cancelled','expired') NOT NULL DEFAULT 'active',
  cancelled_by ENUM('customer','pharmacy','system') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_res_user (user_id, status),
  INDEX idx_res_pharmacy (pharmacy_id, status),
  INDEX idx_res_expiry (status, expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stock(id) ON DELETE SET NULL
);

-- A few common medicines so the suggestions list is not empty (sample data)
INSERT IGNORE INTO medicines (name, generic_name, form, strength) VALUES
  ('Panadol',   'Paracetamol',                 'Tablet',  '500 mg'),
  ('Calpol',    'Paracetamol',                 'Syrup',   '120 mg/5 ml'),
  ('Brufen',    'Ibuprofen',                   'Tablet',  '400 mg'),
  ('Disprin',   'Aspirin',                     'Tablet',  '300 mg'),
  ('Augmentin', 'Amoxicillin + clavulanic acid', 'Tablet', '625 mg'),
  ('Flagyl',    'Metronidazole',               'Tablet',  '400 mg'),
  ('Zyrtec',    'Cetirizine',                  'Tablet',  '10 mg'),
  ('Risek',     'Omeprazole',                  'Capsule', '20 mg');

-- Admin account (reviews pharmacies inside the app)
--   email:    admin@medfinder.com
--   password: Admin12345   <- change it, see server/hash-password.js
INSERT INTO users (name, email, password_hash, role)
VALUES ('Administrator', 'admin@medfinder.com',
        '$2b$10$cN2.cxc5jdcYOxDiOpt7XOecqOgUohBDswUf/eFDNHuIuXOdrbLjG', 'admin')
ON DUPLICATE KEY UPDATE role = 'admin';
