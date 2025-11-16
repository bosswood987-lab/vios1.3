-- VIOS Schema avec authentification
-- User: admin@vios.com / Password: admin

DROP TABLE IF EXISTS user_table CASCADE;

CREATE TABLE user_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'orthoptiste', 'ophtalmologue', 'secretaire')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_email ON user_table(email);

-- Hash bcrypt de "admin" (10 rounds)
-- Utilisateur par défaut: admin@vios.com / admin
INSERT INTO user_table (email, password_hash, full_name, role) 
VALUES (
  'admin@vios.com', 
  '$2b$10$rZ5/8rJ5rJ5rJ5rJ5rJ5r.K5rJ5rJ5rJ5rJ5rJ5rJ5rJ5rJ5rJ5rO',
  'Administrateur',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Tables existantes
CREATE TABLE IF NOT EXISTS patient (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom VARCHAR(255) NOT NULL, prenom VARCHAR(255) NOT NULL, genre VARCHAR(50), date_naissance DATE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS examenoptalmoliste (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_examen TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS examenoptalmoligie (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_examen TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS imagerie (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_imagerie TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS ordonnance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_ordonnance TIMESTAMP, contenu TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS courrier (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_courrier TIMESTAMP, contenu TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS conclusion (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_conclusion TIMESTAMP, contenu TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS modeleordonnance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom_modele VARCHAR(255) NOT NULL, objet VARCHAR(500), contenu TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS modelecourrier (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom_modele VARCHAR(255) NOT NULL, objet VARCHAR(500), contenu TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS actemedical (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(50) NOT NULL, libelle VARCHAR(500) NOT NULL, tarif_base DECIMAL(10,2), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS cotation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, actes_ids TEXT[], depassements DECIMAL(10,2), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS raccourciexamen (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom VARCHAR(255) NOT NULL, categorie VARCHAR(100), texte TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS associationcotation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom VARCHAR(255) NOT NULL, actes_ids TEXT[], created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS traitement (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, posologie VARCHAR(255), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS lentillecontact (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, marque VARCHAR(255), fabricant VARCHAR(255), type_renouvellement VARCHAR(255), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS verresprescrit (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, fente_og TEXT, fente_od TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS prescriptionlentille (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_prescription TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS raccourcioverviewoptalmo (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom VARCHAR(255) NOT NULL, categorie VARCHAR(100), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS megaraccourci (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom VARCHAR(255) NOT NULL, raccourcis_ids TEXT[], created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS dossieratraiter (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, motif VARCHAR(500), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS ivt (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_injection TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS typeverres (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), description VARCHAR(255), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS consultation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patient(id) ON DELETE CASCADE, date_consultation TIMESTAMP, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());
