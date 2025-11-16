-- Script de création de l'utilisateur admin
-- Généré automatiquement le 2025-11-15 16:57:01

-- Créer la table user_table si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'orthoptiste', 'ophtalmologue', 'secretaire')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Créer un index sur l'email
CREATE INDEX IF NOT EXISTS idx_user_email ON user_table(email);

-- Insérer l'utilisateur admin (username: admin, password: admin)
INSERT INTO user_table (email, password_hash, full_name, role) 
VALUES ('admin', '$2b$10$ldFjdC/qzE6k79JHr0dRVu9bXztbUixznfsgrZtgXs4fH2Izxk1hC', 'Administrateur', 'admin')
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

-- Vérification
SELECT email, full_name, role, created_at FROM user_table WHERE email = 'admin';
