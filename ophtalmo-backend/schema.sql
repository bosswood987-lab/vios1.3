-- ==================== AUDIT LOG TABLE ====================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  patient_id UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_patient_id ON audit_log(patient_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- ==================== ENHANCED USER TABLE ====================
CREATE TABLE IF NOT EXISTS user_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  specialite VARCHAR(100),
  nom_affichage VARCHAR(255),
  entete_ordonnance TEXT,
  signature_image_url TEXT,
  message_email_pdf TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_user_email ON user_table(email);
CREATE INDEX idx_user_role ON user_table(role);

-- ==================== PATIENT TABLE ====================
CREATE TABLE IF NOT EXISTS patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  genre VARCHAR(50),
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
  statut_salle_attente VARCHAR(50) DEFAULT 'en_attente',
  date_arrivee TIMESTAMP,
  en_dilatation BOOLEAN DEFAULT FALSE,
  heure_dilatation TIMESTAMP,
  dossier_ouvert_par VARCHAR(255),
  dossier_ouvert_date TIMESTAMP,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_patient_nom_prenom ON patient(nom, prenom);
CREATE INDEX idx_patient_email ON patient(email);
CREATE INDEX idx_patient_telephone ON patient(telephone);
CREATE INDEX idx_patient_deleted_at ON patient(deleted_at);

-- ==================== EXAMEN ORTHOPTISTE ====================
CREATE TABLE IF NOT EXISTS examenorthoptiste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_examen TIMESTAMP NOT NULL,
  motif_consultation TEXT,
  allergie TEXT,
  atcd_med TEXT,
  atcd_oph TEXT,
  pio_od VARCHAR(50),
  pio_og VARCHAR(50),
  pachymetrie_od VARCHAR(50),
  pachymetrie_og VARCHAR(50),
  pio_corrige_od VARCHAR(50),
  pio_corrige_og VARCHAR(50),
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
  lunettes_portees_od_sphere VARCHAR(50),
  lunettes_portees_od_cylindre VARCHAR(50),
  lunettes_portees_od_axe VARCHAR(50),
  lunettes_portees_od_av VARCHAR(50),
  lunettes_portees_og_sphere VARCHAR(50),
  lunettes_portees_og_cylindre VARCHAR(50),
  lunettes_portees_og_axe VARCHAR(50),
  lunettes_portees_og_av VARCHAR(50),
  autoref_od_sphere VARCHAR(50),
  autoref_od_cylindre VARCHAR(50),
  autoref_od_axe VARCHAR(50),
  autoref_og_sphere VARCHAR(50),
  autoref_og_cylindre VARCHAR(50),
  autoref_og_axe VARCHAR(50),
  pd VARCHAR(50),
  ps_od VARCHAR(50),
  ps_og VARCHAR(50),
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

-- ==================== EXAMEN OPHTALMOLOGIE ====================
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

-- ==================== IMAGERIE ====================
CREATE TABLE IF NOT EXISTS imagerie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_imagerie TIMESTAMP NOT NULL,
  type_examen VARCHAR(100) NOT NULL,
  oeil VARCHAR(50),
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

-- ==================== ORDONNANCE ====================
CREATE TABLE IF NOT EXISTS ordonnance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_ordonnance TIMESTAMP NOT NULL,
  type_ordonnance VARCHAR(100),
  contenu TEXT,
  modele_utilise VARCHAR(255),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_ordonnance_patient ON ordonnance(patient_id);
CREATE INDEX idx_ordonnance_date ON ordonnance(date_ordonnance);

-- ==================== COURRIER ====================
CREATE TABLE IF NOT EXISTS courrier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_courrier TIMESTAMP NOT NULL,
  contenu TEXT,
  modele_utilise VARCHAR(255),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_courrier_patient ON courrier(patient_id);

-- ==================== CONCLUSION ====================
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

-- ==================== MODELE ORDONNANCE ====================
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

-- ==================== MODELE COURRIER ====================
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

-- ==================== ACTE MEDICAL ====================
CREATE TABLE IF NOT EXISTS actemedical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  libelle VARCHAR(500) NOT NULL,
  tarif_base DECIMAL(10,2) NOT NULL,
  specialite VARCHAR(100),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_actemedical_code ON actemedical(code);

-- ==================== COTATION ====================
CREATE TABLE IF NOT EXISTS cotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_cotation TIMESTAMP NOT NULL,
  actes JSONB,
  total_base DECIMAL(10,2),
  total_depassement DECIMAL(10,2),
  total_global DECIMAL(10,2),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_cotation_patient ON cotation(patient_id);

-- ==================== RACCOURCI EXAMEN ====================
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

-- ==================== ASSOCIATION COTATION ====================
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

-- ==================== TRAITEMENT ====================
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

-- ==================== LENTILLE CONTACT ====================
CREATE TABLE IF NOT EXISTS lentillecontact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marque VARCHAR(255) NOT NULL,
  fabricant VARCHAR(255),
  type_renouvellement VARCHAR(100) NOT NULL,
  rayon VARCHAR(50),
  diametre VARCHAR(50),
  texte_impression TEXT,
  is_global BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

-- ==================== VERRES PRESCRIT ====================
CREATE TABLE IF NOT EXISTS verresprescrit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_prescription TIMESTAMP NOT NULL,
  type_vision VARCHAR(100) NOT NULL,
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

-- ==================== PRESCRIPTION LENTILLE ====================
CREATE TABLE IF NOT EXISTS prescriptionlentille (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_prescription TIMESTAMP NOT NULL,
  od_lentille_id UUID,
  od_sphere VARCHAR(50),
  od_cylindre VARCHAR(50),
  od_axe VARCHAR(50),
  od_addition VARCHAR(50),
  od_puissance VARCHAR(50),
  od_rayon VARCHAR(50),
  od_diametre VARCHAR(50),
  og_lentille_id UUID,
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

-- ==================== MEGA RACCOURCI ====================
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

-- ==================== DOSSIER A TRAITER ====================
CREATE TABLE IF NOT EXISTS dossieratraiter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  motif VARCHAR(255) NOT NULL,
  note TEXT,
  priorite VARCHAR(50) DEFAULT 'normale',
  statut VARCHAR(50) DEFAULT 'en_attente',
  assigne_a VARCHAR(255),
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_dossieratraiter_statut ON dossieratraiter(statut);
CREATE INDEX idx_dossieratraiter_priorite ON dossieratraiter(priorite);

-- ==================== IVT ====================
CREATE TABLE IF NOT EXISTS ivt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_injection DATE NOT NULL,
  oeil VARCHAR(10) NOT NULL,
  acuite_visuelle VARCHAR(50),
  epaisseur_maculaire DECIMAL(10,2),
  produit_injecte VARCHAR(100),
  notes TEXT,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_ivt_patient ON ivt(patient_id);
CREATE INDEX idx_ivt_date ON ivt(date_injection);

-- ==================== TYPE VERRES ====================
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

-- ==================== ABBREVIATIONS ====================
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

-- ==================== CONSULTATION ====================
CREATE TABLE IF NOT EXISTS consultation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(id) ON DELETE CASCADE,
  date_consultation TIMESTAMP NOT NULL,
  statut VARCHAR(50) DEFAULT 'en_attente',
  motif TEXT,
  created_date TIMESTAMP DEFAULT NOW(),
  updated_date TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_consultation_patient ON consultation(patient_id);
CREATE INDEX idx_consultation_date ON consultation(date_consultation);
CREATE INDEX idx_consultation_statut ON consultation(statut);

-- ==================== RACCOURCI OVERVIEW OPHTALMO ====================
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

-- ==================== DEFAULT USER ====================
-- Note: Default admin user must be created using the create-admin.js script
-- Run: node create-admin.js to create the admin user with a hashed password

-- ==================== VIEWS FOR REPORTING ====================
CREATE OR REPLACE VIEW v_patient_consultations AS
SELECT 
  p.id as patient_id,
  p.nom,
  p.prenom,
  COUNT(DISTINCT c.id) as total_consultations,
  MAX(c.date_consultation) as derniere_consultation,
  COUNT(DISTINCT o.id) as total_ordonnances,
  COUNT(DISTINCT i.id) as total_ivt
FROM patient p
LEFT JOIN consultation c ON p.id = c.patient_id AND c.deleted_at IS NULL
LEFT JOIN ordonnance o ON p.id = o.patient_id AND o.deleted_at IS NULL
LEFT JOIN ivt i ON p.id = i.patient_id AND i.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.nom, p.prenom;

-- ==================== FUNCTIONS ====================
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
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
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_date ON %I;
      CREATE TRIGGER update_%I_updated_date
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_date();
    ', t, t, t, t);
  END LOOP;
END;
$$;