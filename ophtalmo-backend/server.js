const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const authMiddleware = (req, res, next) => {
  req.user = { email: 'default@user.com', id: 'default', specialite: 'admin' };
  next();
};

const ENTITIES = [
  'Patient', 'ExamenOrthoptiste', 'ExamenOphtalmologie', 'Imagerie',
  'Ordonnance', 'Courrier', 'Conclusion', 'ModeleOrdonnance', 'ModeleCourrier',
  'ActeMedical', 'Cotation', 'RaccourciExamen', 'AssociationCotation',
  'Traitement', 'LentilleContact', 'VerresPrescrit', 'PrescriptionLentille',
  'RaccourciOverviewOphtalmo', 'MegaRaccourci', 'DossierATraiter', 'IVT',
  'TypeVerres', 'Consultation', 'User'
];

ENTITIES.forEach(entityName => {
  const tableName = entityName.toLowerCase();

  app.get(`/api/${entityName}`, authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_date DESC`);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(`/api/${entityName}/:id`, authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(`/api/${entityName}`, authMiddleware, async (req, res) => {
    try {
      const data = req.body;
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')}, created_by, created_date, updated_date)
        VALUES (${placeholders}, $${values.length + 1}, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await pool.query(query, [...values, req.user.email]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put(`/api/${entityName}/:id`, authMiddleware, async (req, res) => {
    try {
      const data = req.body;
      const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
      
      const query = `
        UPDATE ${tableName}
        SET ${setClause}, updated_date = NOW()
        WHERE id = $${Object.keys(data).length + 1}
        RETURNING *
      `;
      
      const result = await pool.query(query, [...Object.values(data), req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete(`/api/${entityName}/:id`, authMiddleware, async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ file_url: fileUrl });
});

app.get('/api/auth/me', authMiddleware, (req, res) => res.json(req.user));

app.put('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const query = `UPDATE user_table SET ${setClause}, updated_date = NOW() WHERE email = $${Object.keys(data).length + 1} RETURNING *`;
    const result = await pool.query(query, [...Object.values(data), req.user.email]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend: http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL?.split('@')[1] || 'non configurée'}`);
});