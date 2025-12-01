const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { body, param, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// ==================== LOGGING ====================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ==================== JWT SECRET VALIDATION ====================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is required but not configured');
  logger.error('Please set JWT_SECRET in your .env file');
  logger.error('Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

// ==================== DATABASE ====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

// Test database connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    logger.error('Database connection failed', { error: err.message });
    process.exit(1);
  }
  logger.info('Database connected successfully');
});

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Create logs directory
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// ==================== FILE UPLOAD ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// ==================== ERROR CLASSES ====================
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists and is active
    const result = await pool.query(
      'SELECT id, email, full_name, role, specialite FROM user_table WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      throw new AuthenticationError('User not found or inactive');
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Invalid or expired token'));
    } else {
      next(error);
    }
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError());
    }
    next();
  };
};

// ==================== AUDIT LOGGING ====================
const logAudit = async (userId, action, resource, patientId = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, resource, patient_id, timestamp) 
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [userId, action, resource, patientId]
    );
  } catch (error) {
    logger.error('Audit logging failed', { error: error.message });
  }
};

// ==================== VALIDATION HELPERS ====================
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError(JSON.stringify(errors.array())));
  }
  next();
};

// ==================== ENTITY CONFIGURATION ====================
const ENTITIES = {
  Patient: {
    table: 'patient',
    validation: {
      create: [
        body('nom').notEmpty().trim(),
        body('prenom').notEmpty().trim(),
        body('email').optional().isEmail().normalizeEmail()
      ],
      update: [
        body('nom').optional().notEmpty().trim(),
        body('prenom').optional().notEmpty().trim(),
        body('email').optional().isEmail().normalizeEmail()
      ]
    }
  },
  ExamenOrthoptiste: { table: 'examenorthoptiste' },
  ExamenOphtalmologie: { table: 'examenophtalmologie' },
  Imagerie: { table: 'imagerie' },
  Ordonnance: { table: 'ordonnance' },
  Courrier: { table: 'courrier' },
  Conclusion: { table: 'conclusion' },
  ModeleOrdonnance: { table: 'modeleordonnance' },
  ModeleCourrier: { table: 'modelecourrier' },
  ActeMedical: { table: 'actemedical' },
  Cotation: { table: 'cotation' },
  RaccourciExamen: { table: 'raccourciexamen' },
  AssociationCotation: { table: 'associationcotation' },
  Traitement: { table: 'traitement' },
  LentilleContact: { table: 'lentillecontact' },
  VerresPrescrit: { table: 'verresprescrit' },
  PrescriptionLentille: { table: 'prescriptionlentille' },
  RaccourciOverviewOphtalmo: { table: 'raccourcioverviewophtalmo' },
  MegaRaccourci: { table: 'megaraccourci' },
  DossierATraiter: { table: 'dossieratraiter' },
  IVT: { table: 'ivt' },
  TypeVerres: { table: 'typeverres' },
  Consultation: { table: 'consultation' }
  // *** THE FIX IS HERE: 'Abbreviation' has been removed from this list. ***
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      const result = await pool.query(
        'SELECT id, email, password_hash, full_name, role, specialite, is_active, failed_login_attempts, locked_until FROM user_table WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        throw new AuthenticationError('Invalid email or password');
      }
      
      const user = result.rows[0];
      
      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new AuthenticationError('Account is temporarily locked. Please try again later.');
      }
      
      // Check if account is active
      if (!user.is_active) {
        throw new AuthenticationError('Account is inactive');
      }
      
      // Check if password_hash exists
      if (!user.password_hash) {
        logger.error('User has no password_hash', { email: user.email });
        throw new AuthenticationError('Account setup incomplete. Please contact administrator.');
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        
        await pool.query(
          'UPDATE user_table SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [failedAttempts, lockUntil, user.id]
        );
        
        throw new AuthenticationError('Invalid email or password');
      }
      
      // Reset failed login attempts and update last_login
      await pool.query(
        'UPDATE user_table SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      await logAudit(user.id, 'login', 'auth', null);
      
      logger.info('User logged in', { userId: user.id, email: user.email });
      
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          specialite: user.specialite
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create user (admin only)
app.post('/api/User',
  authMiddleware,
  authorize('admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').notEmpty().trim(),
    body('specialite').notEmpty().trim()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, full_name, specialite } = req.body;
      
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM user_table WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        throw new ValidationError('A user with this email already exists');
      }
      
      // Hash the password
      const password_hash = await bcrypt.hash(password, 10);
      
      // Create user
      const query = `
        INSERT INTO user_table (email, password_hash, full_name, specialite, role, is_active, created_by, created_date, updated_date)
        VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
        RETURNING id, email, full_name, specialite, role, is_active, created_date
      `;
      
      const result = await pool.query(query, [
        email,
        password_hash,
        full_name,
        specialite,
        specialite, // role = specialite
        req.user.email
      ]);
      
      await logAudit(req.user.id, 'create', 'user_table', null);
      
      logger.info('User created', { 
        id: result.rows[0].id, 
        email: result.rows[0].email,
        createdBy: req.user.email 
      });
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// Update user (admin only)
app.put('/api/User/:id',
  authMiddleware,
  authorize('admin'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { full_name, specialite, role } = req.body;
      
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (full_name) {
        updates.push(`full_name = $${paramCount++}`);
        values.push(full_name);
      }
      
      if (specialite) {
        updates.push(`specialite = $${paramCount++}`);
        values.push(specialite);
      }
      
      if (role) {
        updates.push(`role = $${paramCount++}`);
        values.push(role);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push(`updated_date = NOW()`);
      values.push(req.params.id);
      
      const query = `
        UPDATE user_table
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, full_name, specialite, role, is_active, created_date, updated_date
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }
      
      await logAudit(req.user.id, 'update', 'user_table', null);
      
      logger.info('User updated', { id: req.params.id, updatedBy: req.user.email });
      
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// Delete user (admin only)
app.delete('/api/User/:id',
  authMiddleware,
  authorize('admin'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      // Prevent self-deletion
      if (req.params.id === req.user.id) {
        throw new ValidationError('You cannot delete your own account');
      }
      
      const result = await pool.query(
        'UPDATE user_table SET deleted_at = NOW() WHERE id = $1 RETURNING id',
        [req.params.id]
      );
      
      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }
      
      await logAudit(req.user.id, 'delete', 'user_table', null);
      
      logger.info('User deleted', { id: req.params.id, deletedBy: req.user.email });
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Get all users (admin only)
app.get('/api/User',
  authMiddleware,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        'SELECT id, email, full_name, specialite, role, is_active, created_date, last_login FROM user_table WHERE deleted_at IS NULL ORDER BY created_date DESC'
      );
      
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, specialite, is_active FROM user_table WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update current user profile
app.put('/api/auth/me', 
  authMiddleware,
  [
    body('full_name').optional().notEmpty().trim(),
    body('specialite').optional().notEmpty().trim()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { full_name, specialite, nom_affichage, entete_ordonnance, signature_image_url, message_email_pdf } = req.body;
      
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (full_name) {
        updates.push(`full_name = $${paramCount++}`);
        values.push(full_name);
      }
      
      if (specialite) {
        updates.push(`specialite = $${paramCount++}`);
        values.push(specialite);
      }
      
      if (nom_affichage !== undefined) {
        updates.push(`nom_affichage = $${paramCount++}`);
        values.push(nom_affichage);
      }
      
      if (entete_ordonnance !== undefined) {
        updates.push(`entete_ordonnance = $${paramCount++}`);
        values.push(entete_ordonnance);
      }
      
      if (signature_image_url !== undefined) {
        updates.push(`signature_image_url = $${paramCount++}`);
        values.push(signature_image_url);
      }
      
      if (message_email_pdf !== undefined) {
        updates.push(`message_email_pdf = $${paramCount++}`);
        values.push(message_email_pdf);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push(`updated_date = NOW()`);
      values.push(req.user.id);
      
      const query = `
        UPDATE user_table
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, full_name, specialite, role, nom_affichage, entete_ordonnance, signature_image_url, message_email_pdf
      `;
      
      const result = await pool.query(query, values);
      
      await logAudit(req.user.id, 'update', 'user_profile', null);
      
      logger.info('User profile updated', { userId: req.user.id });
      
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// Change password
app.post('/api/auth/change-password',
  authMiddleware,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 6 })
  ],
  validate,
  async (req, res, next) => {
    try {
      const { current_password, new_password } = req.body;
      
      // Get current password hash
      const result = await pool.query(
        'SELECT password_hash FROM user_table WHERE id = $1',
        [req.user.id]
      );
      
      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }
      
      // Verify current password
      const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
      if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
      }
      
      // Hash new password
      const password_hash = await bcrypt.hash(new_password, 10);
      
      // Update password
      await pool.query(
        'UPDATE user_table SET password_hash = $1, updated_date = NOW() WHERE id = $2',
        [password_hash, req.user.id]
      );
      
      await logAudit(req.user.id, 'change_password', 'auth', null);
      
      logger.info('Password changed', { userId: req.user.id });
      
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== CUSTOM ABBREVIATION ROUTES ====================
// Custom routes for Abbreviation to filter by user_id and global abbreviations
// These routes are defined before generic CRUD to take precedence

// GET all abbreviations (user-specific + global)
app.get('/api/Abbreviation',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { limit, offset, orderBy = 'created_date', order = 'DESC' } = req.query;
      
      // Return global abbreviations OR abbreviations created by the current user
      let query = `
        SELECT * FROM abbreviation 
        WHERE deleted_at IS NULL 
        AND (is_global = true OR user_id = $1)
      `;
      
      // Add ordering
      if (orderBy) {
        query += ` ORDER BY ${orderBy} ${order}`;
      }
      
      // Add pagination
      if (limit) {
        query += ` LIMIT ${parseInt(limit)}`;
      }
      if (offset) {
        query += ` OFFSET ${parseInt(offset)}`;
      }
      
      const result = await pool.query(query, [req.user.id]);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }
);

// GET one abbreviation
app.get('/api/Abbreviation/:id',
  authMiddleware,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        'SELECT * FROM abbreviation WHERE id = $1 AND (is_global = true OR user_id = $2)',
        [req.params.id, req.user.id]
      );
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Abbreviation not found');
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// CREATE abbreviation
app.post('/api/Abbreviation',
  authMiddleware,
  [
    body('abbreviation').notEmpty().trim(),
    body('full_text').notEmpty().trim(),
    body('description').optional().trim(),
    body('is_global').optional().isBoolean()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { abbreviation, full_text, description, is_global } = req.body;
      
      const query = `
        INSERT INTO abbreviation (abbreviation, full_text, description, is_global, user_id, created_by, created_date, updated_date)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        abbreviation,
        full_text,
        description || null,
        is_global || false,
        req.user.id,
        req.user.email
      ]);
      
      await logAudit(req.user.id, 'create', 'abbreviation', null);
      
      logger.info('Abbreviation created', { id: result.rows[0].id, user: req.user.email });
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// UPDATE abbreviation
app.put('/api/Abbreviation/:id',
  authMiddleware,
  [
    param('id').isUUID(),
    body('abbreviation').optional().notEmpty().trim(),
    body('full_text').optional().notEmpty().trim(),
    body('description').optional().trim(),
    body('is_global').optional().isBoolean()
  ],
  validate,
  async (req, res, next) => {
    try {
      const { abbreviation, full_text, description, is_global } = req.body;
      
      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (abbreviation !== undefined) {
        updates.push(`abbreviation = $${paramCount++}`);
        values.push(abbreviation);
      }
      
      if (full_text !== undefined) {
        updates.push(`full_text = $${paramCount++}`);
        values.push(full_text);
      }
      
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      
      if (is_global !== undefined) {
        updates.push(`is_global = $${paramCount++}`);
        values.push(is_global);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push(`updated_date = NOW()`);
      values.push(req.params.id);
      values.push(req.user.id);
      
      const query = `
        UPDATE abbreviation
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Abbreviation not found or you do not have permission to update it');
      }
      
      await logAudit(req.user.id, 'update', 'abbreviation', null);
      
      logger.info('Abbreviation updated', { id: req.params.id, user: req.user.email });
      
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE abbreviation (soft delete)
app.delete('/api/Abbreviation/:id',
  authMiddleware,
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        'UPDATE abbreviation SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
        [req.params.id, req.user.id]
      );
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Abbreviation not found or you do not have permission to delete it');
      }
      
      await logAudit(req.user.id, 'delete', 'abbreviation', null);
      
      logger.info('Abbreviation deleted', { id: req.params.id, user: req.user.email });
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== GENERIC CRUD ROUTES ====================
Object.entries(ENTITIES).forEach(([entityName, config]) => {
  const { table, validation = {} } = config;
  
  // GET ALL
  app.get(`/api/${entityName}`,
    authMiddleware,
    async (req, res, next) => {
      try {
        const { limit, offset, orderBy = 'created_date', order = 'DESC' } = req.query;
        
        let query = `SELECT * FROM ${table} WHERE deleted_at IS NULL`;
        
        // Add ordering
        if (orderBy) {
          query += ` ORDER BY ${orderBy} ${order}`;
        }
        
        // Add pagination
        if (limit) {
          query += ` LIMIT ${parseInt(limit)}`;
        }
        if (offset) {
          query += ` OFFSET ${parseInt(offset)}`;
        }
        
        const result = await pool.query(query);
        res.json(result.rows);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // GET ONE
  app.get(`/api/${entityName}/:id`,
    authMiddleware,
    [param('id').isUUID()],
    validate,
    async (req, res, next) => {
      try {
        const result = await pool.query(
          `SELECT * FROM ${table} WHERE id = $1`,
          [req.params.id]
        );
        
        if (result.rows.length === 0) {
          throw new NotFoundError(`${entityName} not found`);
        }
        
        res.json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // CREATE
  app.post(`/api/${entityName}`,
    authMiddleware,
    validation.create || [],
    validate,
    async (req, res, next) => {
      try {
        const data = req.body;
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${table} (${columns.join(', ')}, created_by, created_date, updated_date)
          VALUES (${placeholders}, $${values.length + 1}, NOW(), NOW())
          RETURNING *
        `;
        
        const result = await pool.query(query, [...values, req.user.email]);
        
        await logAudit(req.user.id, 'create', table, data.patient_id || null);
        
        logger.info(`${entityName} created`, { id: result.rows[0].id, user: req.user.email });
        
        res.status(201).json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // UPDATE
  app.put(`/api/${entityName}/:id`,
    authMiddleware,
    [param('id').isUUID()],
    validation.update || [],
    validate,
    async (req, res, next) => {
      try {
        const data = req.body;
        const keys = Object.keys(data);
        const values = Object.values(data);
        
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        
        const query = `
          UPDATE ${table}
          SET ${setClause}, updated_date = NOW()
          WHERE id = $${keys.length + 1}
          RETURNING *
        `;
        
        const result = await pool.query(query, [...values, req.params.id]);
        
        if (result.rows.length === 0) {
          throw new NotFoundError(`${entityName} not found`);
        }
        
        await logAudit(req.user.id, 'update', table, data.patient_id || null);
        
        logger.info(`${entityName} updated`, { id: req.params.id, user: req.user.email });
        
        res.json(result.rows[0]);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // DELETE (soft delete)
  app.delete(`/api/${entityName}/:id`,
    authMiddleware,
    [param('id').isUUID()],
    validate,
    async (req, res, next) => {
      try {
        const result = await pool.query(
          `UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 RETURNING id`,
          [req.params.id]
        );
        
        if (result.rows.length === 0) {
          throw new NotFoundError(`${entityName} not found`);
        }
        
        await logAudit(req.user.id, 'delete', table, null);
        
        logger.info(`${entityName} deleted`, { id: req.params.id, user: req.user.email });
        
        res.json({ success: true });
      } catch (error) {
        next(error);
      }
    }
  );
});

// ==================== FILE UPLOAD ====================
app.post('/api/upload',
  authMiddleware,
  upload.single('file'),
  (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }
      
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      
      logger.info('File uploaded', { 
        filename: req.file.filename, 
        size: req.file.size,
        user: req.user.email 
      });
      
      res.json({ file_url: fileUrl });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== HEALTH CHECK ====================
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.email
  });
  
  // Handle operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode
    });
  }
  
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.message,
      statusCode: 400
    });
  }
  
  // Handle database errors
  if (err.code) {
    const dbErrors = {
      '23505': { message: 'Duplicate entry', status: 409 },
      '23503': { message: 'Referenced record not found', status: 400 },
      '22P02': { message: 'Invalid input syntax', status: 400 }
    };
    
    const dbError = dbErrors[err.code];
    if (dbError) {
      return res.status(dbError.status).json({
        error: dbError.message,
        statusCode: dbError.status
      });
    }
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    statusCode: 500
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = app;
