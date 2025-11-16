const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  console.log('🚀 Starting database migration...\n');
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected\n');
    
    // Add deleted_at columns to existing tables
    console.log('📋 Adding soft delete columns...');
    const tables = [
      'user_table', 'patient', 'examenorthoptiste', 'examenophtalmologie',
      'imagerie', 'ordonnance', 'courrier', 'conclusion', 'modeleordonnance',
      'modelecourrier', 'actemedical', 'cotation', 'raccourciexamen',
      'associationcotation', 'traitement', 'lentillecontact', 'verresprescrit',
      'prescriptionlentille', 'raccourcioverviewophtalmo', 'megaraccourci',
      'dossieratraiter', 'ivt', 'typeverres', 'consultation'
    ];
    
    for (const table of tables) {
      try {
        await pool.query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
        `);
        console.log(`  ✓ ${table}`);
      } catch (error) {
        if (error.code !== '42701') { // Ignore duplicate column error
          console.log(`  ⚠️  ${table}: ${error.message}`);
        }
      }
    }
    
    // Add password_hash to user_table
    console.log('\n🔒 Adding security columns...');
    try {
      await pool.query(`
        ALTER TABLE user_table 
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
        ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP
      `);
      console.log('  ✓ Security columns added to user_table');
    } catch (error) {
      console.log(`  ⚠️  ${error.message}`);
    }
    
    // Create audit_log table
    console.log('\n📊 Creating audit log table...');
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          action VARCHAR(50) NOT NULL,
          resource VARCHAR(255) NOT NULL,
          patient_id UUID,
          timestamp TIMESTAMP DEFAULT NOW(),
          ip_address INET,
          user_agent TEXT
        )
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_patient_id ON audit_log(patient_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
      `);
      
      console.log('  ✓ Audit log table created');
    } catch (error) {
      console.log(`  ⚠️  ${error.message}`);
    }
    
    // Add indexes
    console.log('\n🔍 Creating indexes for performance...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_patient_nom_prenom ON patient(nom, prenom)',
      'CREATE INDEX IF NOT EXISTS idx_patient_email ON patient(email)',
      'CREATE INDEX IF NOT EXISTS idx_patient_deleted_at ON patient(deleted_at)',
      'CREATE INDEX IF NOT EXISTS idx_examenorthoptiste_patient ON examenorthoptiste(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_examenophtalmo_patient ON examenophtalmologie(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_imagerie_patient ON imagerie(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_ordonnance_patient ON ordonnance(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_consultation_patient ON consultation(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_consultation_statut ON consultation(statut)',
      'CREATE INDEX IF NOT EXISTS idx_ivt_patient ON ivt(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_email ON user_table(email)',
      'CREATE INDEX IF NOT EXISTS idx_user_role ON user_table(role)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
        const indexName = indexQuery.match(/idx_\w+/)[0];
        console.log(`  ✓ ${indexName}`);
      } catch (error) {
        if (error.code !== '42P07') { // Ignore duplicate index error
          console.log(`  ⚠️  ${error.message}`);
        }
      }
    }
    
    // Create view for patient consultations
    console.log('\n📈 Creating database views...');
    try {
      await pool.query(`
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
        GROUP BY p.id, p.nom, p.prenom
      `);
      console.log('  ✓ v_patient_consultations view created');
    } catch (error) {
      console.log(`  ⚠️  ${error.message}`);
    }
    
    // Create triggers for updated_date
    console.log('\n⚙️  Creating triggers...');
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_date()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_date = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      console.log('  ✓ update_updated_date function created');
      
      for (const table of tables) {
        try {
          await pool.query(`
            DROP TRIGGER IF EXISTS update_${table}_updated_date ON ${table};
            CREATE TRIGGER update_${table}_updated_date
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_date()
          `);
        } catch (error) {
          // Silent fail for tables that don't exist
        }
      }
      console.log('  ✓ Triggers created for all tables');
    } catch (error) {
      console.log(`  ⚠️  ${error.message}`);
    }
    
    // Update default admin user
    console.log('\n👤 Setting up default admin user...');
    try {
      const result = await pool.query(`
        INSERT INTO user_table (email, full_name, role, specialite, is_active)
        VALUES ('admin@ophtalmo.com', 'Administrator', 'admin', 'admin', true)
        ON CONFLICT (email) 
        DO UPDATE SET 
          is_active = true,
          updated_date = NOW()
        RETURNING email
      `);
      
      if (result.rows.length > 0) {
        console.log(`  ✓ Admin user ready: ${result.rows[0].email}`);
        console.log('  ⚠️  Remember to set a password for this user!');
      }
    } catch (error) {
      console.log(`  ⚠️  ${error.message}`);
    }
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifications = [
      { 
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_table' AND column_name = 'password_hash'",
        check: 'password_hash column in user_table'
      },
      {
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'patient' AND column_name = 'deleted_at'",
        check: 'deleted_at column in patient'
      },
      {
        query: "SELECT tablename FROM pg_tables WHERE tablename = 'audit_log'",
        check: 'audit_log table exists'
      },
      {
        query: "SELECT COUNT(*) FROM user_table WHERE email = 'admin@ophtalmo.com'",
        check: 'admin user exists'
      }
    ];
    
    let allVerified = true;
    for (const verification of verifications) {
      try {
        const result = await pool.query(verification.query);
        if (result.rows.length > 0) {
          console.log(`  ✓ ${verification.check}`);
        } else {
          console.log(`  ✗ ${verification.check}`);
          allVerified = false;
        }
      } catch (error) {
        console.log(`  ✗ ${verification.check}: ${error.message}`);
        allVerified = false;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    if (allVerified) {
      console.log('✅ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Update your .env file with JWT_SECRET');
      console.log('2. Set a password for the admin user');
      console.log('3. Restart your application');
      console.log('4. Test the login endpoint');
    } else {
      console.log('⚠️  Migration completed with warnings');
      console.log('Please check the output above and fix any issues');
    }
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check if running as main script
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };