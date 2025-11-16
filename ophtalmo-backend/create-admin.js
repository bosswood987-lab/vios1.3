const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

async function createAdmin() {
  const password = 'admin';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n🔐 Hash généré pour le mot de passe "admin":');
  console.log(hash);
  console.log('\n📋 Insertion dans la base de données...\n');

  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    await pool.query(`
      INSERT INTO user_table (email, password_hash, full_name, role) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) 
      DO UPDATE SET password_hash = $2
    `, ['admin', hash, 'Administrateur', 'admin']);

    console.log('✅ Utilisateur admin créé avec succès !');
    console.log('   Username: admin');
    console.log('   Password: admin');
    console.log('');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createAdmin();
