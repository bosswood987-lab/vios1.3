-- ==================================================================================
-- VIOS - Vision Information & Ophthalmology System
-- HDS-COMPLIANT CONSOLIDATED DATABASE SCHEMA
-- ==================================================================================
-- 
-- Purpose: Production-ready schema for HDS (Hébergeur de Données de Santé) server
-- Compliance: RGPD, HDS certification requirements
-- Database: PostgreSQL 13+ (Google Cloud SQL compatible)
-- 
-- Deployment: Run this single file to create complete database structure
-- Created: 2025-11-19
-- Version: 1.0 HDS
-- 
-- SECURITY NOTES:
-- - Enable SSL/TLS for all connections
-- - Use Google Cloud SQL encryption at rest
-- - Enable audit logging at database level
-- - Implement row-level security for multi-tenant if needed
-- - Regular automated backups (minimum daily)
-- - Data retention: 20 years minimum for medical records (French law)
-- 
-- ==================================================================================

-- ==================================================================================
-- SECTION 1: SECURITY & AUDIT (HDS COMPLIANCE)
-- ==================================================================================

-- Audit Log Table - Tracks all user actions for HDS compliance
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  patient_id UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  CONSTRAINT chk_audit_action CHECK (action IN (
    'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
    'EXPORT', 'PRINT', 'ACCESS_DENIED'
  ))
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_patient_id ON audit_log(patient_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_action ON audit_log(action);

COMMENT ON TABLE audit_log IS 'HDS Compliance: Complete audit trail of all system actions';
COMMENT ON COLUMN audit_log.ip_address IS 'Source IP for security tracking';
COMMENT ON COLUMN audit_log.details IS 'Additional context (before/after values)';

-- ==================================================================================
-- SECTION 2: USER MANAGEMENT & AUTHENTICATION
-- ==================================================================================

-- User Table with Enhanced Security
CREATE TABLE IF NOT EXISTS user_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'ophtalmologue', 'orthoptiste', 'secretaire', 'user')),
  specialite VARCHAR(100),
  nom_affichage VARCHAR(255),
  entete_ordonnance TEXT,
  signature_image_url TEXT,
  message_email_pdf TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  password_changed_at TIMESTAMP DEFAULT NOW(),
  must_change_password BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_user_email ON user_table(email);
CREATE INDEX idx_user_role ON user_table(role);
CREATE INDEX idx_user_active ON user_table(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE user_table IS 'System users with role-based access control';
COMMENT ON COLUMN user_table.password_hash IS 'Bcrypt hashed password (min 10 rounds)';
COMMENT ON COLUMN user_table.failed_login_attempts IS 'Lock account after 5 failed attempts';
COMMENT ON COLUMN user_table.deleted_at IS 'Soft delete - maintain audit trail';

-- ==================================================================================
-- SECTION 3: PATIENT DATA (RGPD COMPLIANT)
-- ==================================================================================

-- Patient Table - Core patient demographic data
CREATE TABLE IF NOT EXISTS patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  genre VARCHAR(50) CHECK (genre IN ('M', 'F', 'Autre', 'Non spécifié')),
  date_naissance DATE,
  telephone VARCHAR(50),
  email VARCHAR(255),
  adresse TEXT,
  numero_securite_sociale VARCHAR(100),
  medecin_traitant VARCHAR(255),
  antecedents_medicaux TEXT,
  allergie TEXT,
  atcd_ophtalmologiques TEXT,
  ald BOOLEAN DEFAULT FALSE,
  cmu BOOLEAN DEFAULT FALSE,
  suivi_ivt BOOLEAN DEFAULT FALSE,
  statut_salle_attente VARCHAR(50) DEFAULT 'en_attente' CHECK (statut_salle_attente IN (
    'en_attente', 'en_consultation', 'en_dilatation', 'termine', 'absent'
  )),
  date_arrivee TIMESTAMP,
  en_dilatation BOOLEAN DEFAULT FALSE,
  heure_dilatation TIMESTAMP,
  dossier_ouvert_par VARCHAR(255),
  dossier_ouvert_date TIMESTAMP,
  consent_data_processing BOOLEAN DEFAULT TRUE,
  consent_date TIMESTAMP DEFAULT NOW(),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_patient_nom_prenom ON patient(nom, prenom);
CREATE INDEX idx_patient_email ON patient(email);
CREATE INDEX idx_patient_telephone ON patient(telephone);
CREATE INDEX idx_patient_deleted_at ON patient(deleted_at);
CREATE INDEX idx_patient_statut ON patient(statut_salle_attente) WHERE deleted_at IS NULL;

COMMENT ON TABLE patient IS 'RGPD: Patient personal and medical data - 20 year retention';
COMMENT ON COLUMN patient.consent_data_processing IS 'RGPD: Explicit consent for data processing';
COMMENT ON COLUMN patient.deleted_at IS 'Soft delete preserves medical history for legal retention';

-- ==================================================================================
-- SECTION 4: MEDICAL EXAMINATIONS
-- ==================================================================================

-- Orthoptist Examination
CREATE TABLE IF NOT EXISTS examenorthoptiste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_examen TIMESTAMP NOT NULL,
  motif_consultation TEXT,
  allergie TEXT,
  atcd_med TEXT,
  atcd_oph TEXT,
  
  -- Intraocular Pressure
  pio_od VARCHAR(50),
  pio_og VARCHAR(50),
  pachymetrie_od VARCHAR(50),
  pachymetrie_og VARCHAR(50),
  pio_corrige_od VARCHAR(50),
  pio_corrige_og VARCHAR(50),
  
  -- Keratometry
  keratometrie_od_k1 VARCHAR(50),
  keratometrie_od_k1_axe VARCHAR(50),
  keratometrie_od_k2 VARCHAR(50),
  keratometrie_od_k2_axe VARCHAR(50),
  keratometrie_od_km VARCHAR(50),
  keratometrie_od_km_axe VARCHAR(50),
  keratometrie_og_k1 VARCHAR(50),
  keratometrie_og_k1_axe VARCHAR(50),
  keratometrie_og_k2 VARCHAR(50),
  keratometrie_og_k2_axe VARCHAR(50),
  keratometrie_og_km VARCHAR(50),
  keratometrie_og_km_axe VARCHAR(50),
  
  -- Current Glasses
  lunettes_portees_od_sphere VARCHAR(50),
  lunettes_portees_od_cylindre VARCHAR(50),
  lunettes_portees_od_axe VARCHAR(50),
  lunettes_portees_od_av VARCHAR(50),
  lunettes_portees_og_sphere VARCHAR(50),
  lunettes_portees_og_cylindre VARCHAR(50),
  lunettes_portees_og_axe VARCHAR(50),
  lunettes_portees_og_av VARCHAR(50),
  
  -- Autorefraction
  autoref_od_sphere VARCHAR(50),
  autoref_od_cylindre VARCHAR(50),
  autoref_od_axe VARCHAR(50),
  autoref_og_sphere VARCHAR(50),
  autoref_og_cylindre VARCHAR(50),
  autoref_og_axe VARCHAR(50),
  
  -- Pupillary Distance
  pd VARCHAR(50),
  ps_od VARCHAR(50),
  ps_og VARCHAR(50),
  
  -- Subjective Refraction
  ref_subjective_sous_skiacol BOOLEAN DEFAULT FALSE,
  ref_subjective_od_sphere VARCHAR(50),
  ref_subjective_od_cylindre VARCHAR(50),
  ref_subjective_od_axe VARCHAR(50),
  ref_subjective_od_avl VARCHAR(50),
  ref_subjective_od_add VARCHAR(50),
  ref_subjective_od_avp VARCHAR(50),
  ref_subjective_og_sphere VARCHAR(50),
  ref_subjective_og_cylindre VARCHAR(50),
  ref_subjective_og_axe VARCHAR(50),
  ref_subjective_og_avl VARCHAR(50),
  ref_subjective_og_add VARCHAR(50),
  ref_subjective_og_avp VARCHAR(50),
  
  -- Motility
  examen_motilite TEXT,
  convergence TEXT,
  phories TEXT,
  tropies TEXT,
  notes TEXT,
  
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_examenorthoptiste_patient ON examenorthoptiste(patient_id);
CREATE INDEX idx_examenorthoptiste_date ON examenorthoptiste(date_examen);

COMMENT ON TABLE examenorthoptiste IS 'Orthoptist examination records';

-- Ophthalmology Examination
CREATE TABLE IF NOT EXISTS examenophtalmologie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_examen TIMESTAMP NOT NULL,
  lampe_fente_od TEXT,
  lampe_fente_og TEXT,
  fond_oeil_od TEXT,
  fond_oeil_og TEXT,
  diagnostic TEXT,
  conduite_tenir TEXT,
  notes TEXT,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_examenophtalmo_patient ON examenophtalmologie(patient_id);
CREATE INDEX idx_examenophtalmo_date ON examenophtalmologie(date_examen);

COMMENT ON TABLE examenophtalmologie IS 'Ophthalmologist examination records';

-- ==================================================================================
-- SECTION 5: IMAGING & DIAGNOSTICS
-- ==================================================================================

-- Medical Imaging
CREATE TABLE IF NOT EXISTS imagerie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_imagerie TIMESTAMP NOT NULL,
  type_examen VARCHAR(100) NOT NULL CHECK (type_examen IN (
    'OCT', 'Angiographie', 'Rétinographie', 'Champ visuel', 
    'Topographie cornéenne', 'Échographie', 'Biométrie', 'Autre'
  )),
  oeil VARCHAR(50) CHECK (oeil IN ('OD', 'OG', 'ODG')),
  image_url TEXT,
  interpretation TEXT,
  notes TEXT,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_imagerie_patient ON imagerie(patient_id);
CREATE INDEX idx_imagerie_type ON imagerie(type_examen);
CREATE INDEX idx_imagerie_date ON imagerie(date_imagerie);

COMMENT ON TABLE imagerie IS 'Medical imaging records with DICOM references';
COMMENT ON COLUMN imagerie.image_url IS 'Secure storage path - must be encrypted';

-- ==================================================================================
-- SECTION 6: PRESCRIPTIONS & DOCUMENTS
-- ==================================================================================

-- Prescription/Ordonnance
CREATE TABLE IF NOT EXISTS ordonnance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_ordonnance TIMESTAMP NOT NULL,
  type_ordonnance VARCHAR(100) CHECK (type_ordonnance IN (
    'Médicaments', 'Lunettes', 'Lentilles', 'Examens complémentaires', 
    'Rééducation', 'Chirurgie', 'Autre'
  )),
  contenu TEXT,
  modele_utilise VARCHAR(255),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_ordonnance_patient ON ordonnance(patient_id);
CREATE INDEX idx_ordonnance_date ON ordonnance(date_ordonnance);

COMMENT ON TABLE ordonnance IS 'Medical prescriptions - legal document retention required';

-- Medical Letter/Courrier
CREATE TABLE IF NOT EXISTS courrier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_courrier TIMESTAMP NOT NULL,
  destinataire VARCHAR(255),
  objet VARCHAR(500),
  contenu TEXT,
  modele_utilise VARCHAR(255),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_courrier_patient ON courrier(patient_id);
CREATE INDEX idx_courrier_date ON courrier(date_courrier);

COMMENT ON TABLE courrier IS 'Medical correspondence between healthcare providers';

-- Consultation Conclusion
CREATE TABLE IF NOT EXISTS conclusion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_conclusion TIMESTAMP NOT NULL,
  diagnostic TEXT,
  conduite_tenir TEXT,
  notes TEXT,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_conclusion_patient ON conclusion(patient_id);

COMMENT ON TABLE conclusion IS 'Consultation summary and conclusions';

-- ==================================================================================
-- SECTION 7: TEMPLATES & SHORTCUTS
-- ==================================================================================

-- Prescription Templates
CREATE TABLE IF NOT EXISTS modeleordonnance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_modele VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  contenu TEXT NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_modeleordonnance_type ON modeleordonnance(type);
CREATE INDEX idx_modeleordonnance_global ON modeleordonnance(is_global);

-- Letter Templates
CREATE TABLE IF NOT EXISTS modelecourrier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_modele VARCHAR(255) NOT NULL,
  objet VARCHAR(500),
  contenu TEXT NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_modelecourrier_global ON modelecourrier(is_global);

-- Examination Shortcuts
CREATE TABLE IF NOT EXISTS raccourciexamen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  categorie VARCHAR(100) NOT NULL,
  texte TEXT NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_raccourciexamen_categorie ON raccourciexamen(categorie);

-- Mega Shortcuts (Complete exam templates)
CREATE TABLE IF NOT EXISTS megaraccourci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  lampe_fente_od TEXT,
  lampe_fente_og TEXT,
  fond_oeil_od TEXT,
  fond_oeil_og TEXT,
  interpretation_imagerie TEXT,
  diagnostic TEXT,
  conduite_tenir TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

-- Overview Shortcuts for Ophthalmology
CREATE TABLE IF NOT EXISTS raccourcioverviewophtalmo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  categorie VARCHAR(100) NOT NULL,
  texte TEXT NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

-- Abbreviations
CREATE TABLE IF NOT EXISTS abbreviation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation VARCHAR(50) NOT NULL,
  full_text TEXT NOT NULL,
  description VARCHAR(255),
  user_id UUID REFERENCES user_table(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_abbreviation_abbrev ON abbreviation(abbreviation);
CREATE INDEX idx_abbreviation_global ON abbreviation(is_global);
CREATE INDEX idx_abbreviation_user_id ON abbreviation(user_id);

COMMENT ON TABLE abbreviation IS 'Text expansion shortcuts for faster documentation';

-- ==================================================================================
-- SECTION 8: BILLING & CODING
-- ==================================================================================

-- Medical Acts (CCAM/NGAP codes)
CREATE TABLE IF NOT EXISTS actemedical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  libelle VARCHAR(500) NOT NULL,
  tarif_base DECIMAL(10,2) NOT NULL,
  specialite VARCHAR(100),
  type_acte VARCHAR(50) CHECK (type_acte IN ('CCAM', 'NGAP', 'Hors nomenclature')),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_actemedical_code ON actemedical(code);
CREATE INDEX idx_actemedical_specialite ON actemedical(specialite);

COMMENT ON TABLE actemedical IS 'Medical billing codes (CCAM/NGAP)';

-- Billing/Cotation
CREATE TABLE IF NOT EXISTS cotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_cotation TIMESTAMP NOT NULL,
  actes JSONB,
  total_base DECIMAL(10,2),
  total_depassement DECIMAL(10,2),
  total_global DECIMAL(10,2),
  statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN (
    'en_attente', 'transmis', 'paye', 'rejete'
  )),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_cotation_patient ON cotation(patient_id);
CREATE INDEX idx_cotation_date ON cotation(date_cotation);
CREATE INDEX idx_cotation_statut ON cotation(statut);

-- Cotation Associations (Common act combinations)
CREATE TABLE IF NOT EXISTS associationcotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  actes_ids TEXT[],
  depassements DECIMAL(10,2)[],
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

-- ==================================================================================
-- SECTION 9: TREATMENTS & PRESCRIPTIONS DETAILS
-- ==================================================================================

-- Medications Library
CREATE TABLE IF NOT EXISTS traitement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_medicament VARCHAR(255) NOT NULL,
  posologie TEXT NOT NULL,
  duree VARCHAR(100),
  indication TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_traitement_medicament ON traitement(nom_medicament);

-- Glass Lenses Types
CREATE TABLE IF NOT EXISTS typeverres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  notes_impression TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

-- Glass Prescription
CREATE TABLE IF NOT EXISTS verresprescrit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_prescription TIMESTAMP NOT NULL,
  type_vision VARCHAR(100) NOT NULL CHECK (type_vision IN (
    'Vision de loin', 'Vision de près', 'Progressif', 'Mi-distance'
  )),
  type_verres VARCHAR(255),
  type_teinte VARCHAR(255),
  od_sphere VARCHAR(50),
  od_cylindre VARCHAR(50),
  od_axe VARCHAR(50),
  od_addition VARCHAR(50),
  og_sphere VARCHAR(50),
  og_cylindre VARCHAR(50),
  og_axe VARCHAR(50),
  og_addition VARCHAR(50),
  notes TEXT,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_verresprescrit_patient ON verresprescrit(patient_id);

-- Contact Lenses Library
CREATE TABLE IF NOT EXISTS lentillecontact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marque VARCHAR(255) NOT NULL,
  fabricant VARCHAR(255),
  type_renouvellement VARCHAR(100) NOT NULL CHECK (type_renouvellement IN (
    'Journalière', 'Hebdomadaire', 'Mensuelle', 'Trimestrielle', 'Annuelle'
  )),
  rayon VARCHAR(50),
  diametre VARCHAR(50),
  texte_impression TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

-- Contact Lens Prescription
CREATE TABLE IF NOT EXISTS prescriptionlentille (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_prescription TIMESTAMP NOT NULL,
  od_lentille_id UUID REFERENCES lentillecontact(id),
  od_sphere VARCHAR(50),
  od_cylindre VARCHAR(50),
  od_axe VARCHAR(50),
  od_addition VARCHAR(50),
  od_puissance VARCHAR(50),
  od_rayon VARCHAR(50),
  od_diametre VARCHAR(50),
  og_lentille_id UUID REFERENCES lentillecontact(id),
  og_sphere VARCHAR(50),
  og_cylindre VARCHAR(50),
  og_axe VARCHAR(50),
  og_addition VARCHAR(50),
  og_puissance VARCHAR(50),
  og_rayon VARCHAR(50),
  og_diametre VARCHAR(50),
  notes TEXT,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_prescriptionlentille_patient ON prescriptionlentille(patient_id);

-- ==================================================================================
-- SECTION 10: SPECIALIZED TRACKING
-- ==================================================================================

-- IVT (Intravitreal Injection) Tracking
CREATE TABLE IF NOT EXISTS ivt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_injection DATE NOT NULL,
  oeil VARCHAR(10) NOT NULL CHECK (oeil IN ('OD', 'OG')),
  acuite_visuelle VARCHAR(50),
  epaisseur_maculaire DECIMAL(10,2),
  produit_injecte VARCHAR(100) CHECK (produit_injecte IN (
    'Lucentis', 'Eylea', 'Avastin', 'Ozurdex', 'Iluvien', 'Autre'
  )),
  notes TEXT,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_ivt_patient ON ivt(patient_id);
CREATE INDEX idx_ivt_date ON ivt(date_injection);

COMMENT ON TABLE ivt IS 'Intravitreal injection tracking for anti-VEGF therapy';

-- Consultation Management
CREATE TABLE IF NOT EXISTS consultation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_consultation TIMESTAMP NOT NULL,
  statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN (
    'en_attente', 'en_cours', 'termine', 'annule', 'absent'
  )),
  motif TEXT,
  type_consultation VARCHAR(100) CHECK (type_consultation IN (
    'Première consultation', 'Contrôle', 'Urgence', 'IVT', 'Post-opératoire'
  )),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_consultation_patient ON consultation(patient_id);
CREATE INDEX idx_consultation_date ON consultation(date_consultation);
CREATE INDEX idx_consultation_statut ON consultation(statut);

-- Pending Cases (Dossiers à traiter)
CREATE TABLE IF NOT EXISTS dossieratraiter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  motif VARCHAR(255) NOT NULL,
  note TEXT,
  priorite VARCHAR(50) DEFAULT 'normale' CHECK (priorite IN (
    'urgente', 'haute', 'normale', 'basse'
  )),
  statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN (
    'en_attente', 'en_cours', 'termine', 'reporte'
  )),
  assigne_a VARCHAR(255),
  date_echeance DATE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_dossieratraiter_statut ON dossieratraiter(statut);
CREATE INDEX idx_dossieratraiter_priorite ON dossieratraiter(priorite);
CREATE INDEX idx_dossieratraiter_assigne ON dossieratraiter(assigne_a);

-- ==================================================================================
-- SECTION 11: VIEWS FOR REPORTING
-- ==================================================================================

-- Patient Consultations Overview
CREATE OR REPLACE VIEW v_patient_consultations AS
SELECT 
  p.id as patient_id,
  p.nom,
  p.prenom,
  p.date_naissance,
  EXTRACT(YEAR FROM AGE(p.date_naissance)) as age,
  COUNT(DISTINCT c.id) as total_consultations,
  MAX(c.date_consultation) as derniere_consultation,
  COUNT(DISTINCT o.id) as total_ordonnances,
  COUNT(DISTINCT i.id) as total_ivt,
  COUNT(DISTINCT img.id) as total_imageries
FROM patient p
LEFT JOIN consultation c ON p.id = c.patient_id AND c.deleted_at IS NULL
LEFT JOIN ordonnance o ON p.id = o.patient_id AND o.deleted_at IS NULL
LEFT JOIN ivt i ON p.id = i.patient_id AND i.deleted_at IS NULL
LEFT JOIN imagerie img ON p.id = img.patient_id AND img.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.nom, p.prenom, p.date_naissance;

-- Daily Activity Dashboard
CREATE OR REPLACE VIEW v_daily_activity AS
SELECT 
  DATE(c.date_consultation) as date,
  COUNT(DISTINCT c.patient_id) as patients_vus,
  COUNT(DISTINCT o.id) as ordonnances_emises,
  COUNT(DISTINCT cour.id) as courriers_envoyes,
  COUNT(DISTINCT i.id) as ivt_realises,
  SUM(cot.total_global) as chiffre_affaires
FROM consultation c
LEFT JOIN ordonnance o ON DATE(o.date_ordonnance) = DATE(c.date_consultation)
LEFT JOIN courrier cour ON DATE(cour.date_courrier) = DATE(c.date_consultation)
LEFT JOIN ivt i ON DATE(i.date_injection) = DATE(c.date_consultation)
LEFT JOIN cotation cot ON DATE(cot.date_cotation) = DATE(c.date_consultation)
WHERE c.deleted_at IS NULL
GROUP BY DATE(c.date_consultation)
ORDER BY date DESC;

-- Waiting Room Status
CREATE OR REPLACE VIEW v_salle_attente AS
SELECT 
  p.id,
  p.nom,
  p.prenom,
  p.statut_salle_attente,
  p.date_arrivee,
  p.en_dilatation,
  p.heure_dilatation,
  CASE 
    WHEN p.en_dilatation AND p.heure_dilatation IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (NOW() - p.heure_dilatation))/60
    ELSE NULL 
  END as minutes_dilatation,
  c.motif as motif_consultation
FROM patient p
LEFT JOIN consultation c ON p.id = c.patient_id 
  AND DATE(c.date_consultation) = CURRENT_DATE
  AND c.deleted_at IS NULL
WHERE p.statut_salle_attente != 'termine'
  AND p.deleted_at IS NULL
ORDER BY p.date_arrivee;

-- ==================================================================================
-- SECTION 12: FUNCTIONS & TRIGGERS
-- ==================================================================================

-- Automatic updated_date trigger function
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_date
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%'
    AND tablename != 'audit_log'
  LOOP
    EXECUTE format(''
      DROP TRIGGER IF EXISTS update_%I_updated_date ON %I;
      CREATE TRIGGER update_%I_updated_date
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_date();
    '', t, t, t, t);
  END LOOP;
END;
$$;

-- Function to anonymize patient data (RGPD right to be forgotten)
CREATE OR REPLACE FUNCTION anonymize_patient(patient_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE patient SET
    nom = 'ANONYME',
    prenom = 'ANONYME',
    telephone = NULL,
    email = NULL,
    adresse = NULL,
    numero_securite_sociale = NULL,
    medecin_traitant = NULL,
    deleted_at = NOW()
  WHERE id = patient_uuid;
  
  -- Log the anonymization
  INSERT INTO audit_log (action, resource, patient_id, details)
  VALUES ('DELETE', 'patient', patient_uuid, '{