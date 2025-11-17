const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { body, param, query, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== LOGGER ====================
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
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ 
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Request logging
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// Rate limiting - more lenient for authenticated users
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased)
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for authenticated users to prevent lockout
    const token = req.headers.authorization?.split(' ')[1];
    return !!token;
  }
});
app.use('/api/', limiter);

// ==================== FILE UPLOAD ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, DOCX allowed.'));
  }
});

// ==================== ERROR CLASSES ====================
class AppError extends Error {
  constructor(message, statusCode = 500) {
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
  constructor(message = 'Insufficient permissions') {
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
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, email, full_name, role, specialite FROM user_table WHERE email = $1',
      [decoded.email]
    );
    
    if (result.rows.length === 0) {
      throw new AuthenticationError('User not found');
    }
    
    req.user = result.rows[0];
    
    // Log access for audit
    await logAudit(req.user.id, 'access', req.path, null);
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired'));
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
    searchFields: ['nom', 'prenom', 'email', 'telephone'],
    validation: {
      create: [
        body('nom').notEmpty().trim().escape(),
        body('prenom').notEmpty().trim().escape(),
        body('email').optional().isEmail().normalizeEmail(),
        body('telephone').optional().trim(),
      ],
      update: [
        body('nom').optional().trim().escape(),
        body('prenom').optional().trim().escape(),
        body('email').optional().isEmail().normalizeEmail(),
      ]
    }
  },
  ExamenOrthoptiste: { table: 'examenorthoptiste', searchFields: [] },
  ExamenOphtalmologie: { table: 'examenophtalmologie', searchFields: [] },
  Imagerie: { table: 'imagerie', searchFields: ['type_examen'] },
  Ordonnance: { table: 'ordonnance', searchFields: ['type_ordonnance'] },
  Courrier: { table: 'courrier', searchFields: [] },
  Conclusion: { table: 'conclusion', searchFields: [] },
  ModeleOrdonnance: { table: 'modeleordonnance', searchFields: ['nom_modele', 'type'] },
  ModeleCourrier: { table: 'modelecourrier', searchFields: ['nom_modele', 'objet'] },
  ActeMedical: { table: 'actemedical', searchFields: ['code', 'libelle'] },
  Cotation: { table: 'cotation', searchFields: [] },
  RaccourciExamen: { table: 'raccourciexamen', searchFields: ['nom', 'categorie'] },
  AssociationCotation: { table: 'associationcotation', searchFields: ['nom'] },
  Traitement: { table: 'traitement', searchFields: ['nom_medicament', 'indication'] },
  LentilleContact: { table: 'lentillecontact', searchFields: ['marque', 'fabricant'] },
  VerresPrescrit: { table: 'verresprescrit', searchFields: [] },
  PrescriptionLentille: { table: 'prescriptionlentille', searchFields: [] },
  RaccourciOverviewOphtalmo: { table: 'raccourcioverviewophtalmo', searchFields: ['nom', 'categorie'] },
  MegaRaccourci: { table: 'megaraccourci', searchFields: ['nom'] },
  DossierATraiter: { table: 'dossieratraiter', searchFields: ['motif', 'statut'] },
  IVT: { table: 'ivt', searchFields: [] },
  TypeVerres: { table: 'typeverres', searchFields: ['nom'] },
  Consultation: { table: 'consultation', searchFields: ['statut', 'motif'] },
  User: { table: 'user_table', searchFields: ['email', 'full_name'] }
};

// ==================== USER CREATION (Special handling) ====================
app.post('/api/User',
  authMiddleware,
  authorize('admin'), // Only admins can create users
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').notEmpty().trim(),
    body('specialite').notEmpty(),
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
        updates.push(`full_name = ${paramCount++}`);
        values.push(full_name);
      }
      
      if (specialite) {
        updates.push(`specialite = ${paramCount++}`);
        values.push(specialite);
      }
      
      if (role) {
        updates.push(`role = ${paramCount++}`);
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
        WHERE id = ${paramCount}
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
        'DELETE FROM user_table WHERE id = $1 RETURNING id, email',
        [req.params.id]
      );
      
      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }
      
      await logAudit(req.user.id, 'delete', 'user_table', null);
      
      logger.info('User deleted', { 
        id: req.params.id, 
        email: result.rows[0].email,
        deletedBy: req.user.email 
      });
      
      res.json({ success: true, id: req.params.id });
    } catch (error) {
      next(error);
    }
  }
);

// List users (admin only)
app.get('/api/User',
  authMiddleware,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        'SELECT id, email, full_name, specialite, role, is_active, created_date, updated_date FROM user_table ORDER BY created_date DESC'
      );
      
      res.json({
        data: result.rows,
        pagination: {
          page: 1,
          limit: result.rows.length,
          total: result.rows.length,
          pages: 1
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single user (admin only)
app.get('/api/User/:id',
  authMiddleware,
  authorize('admin'),
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await pool.query(
        'SELECT id, email, full_name, specialite, role, is_active, created_date, updated_date FROM user_table WHERE id = $1',
        [req.params.id]
      );
      
      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== GENERIC CRUD ROUTES ====================
Object.entries(ENTITIES).forEach(([entityName, config]) => {
  const { table, searchFields, validation = {} } = config;
  
  // Skip User entity - it has special handling above
  if (entityName === 'User') return;
  
  // LIST with pagination and search
  app.get(`/api/${entityName}`, 
    authMiddleware,
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().trim(),
    ],
    validate,
    async (req, res, next) => {
      try {
        const { page = 1, limit = 50, search, sortBy = 'created_date', order = 'DESC' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `SELECT * FROM ${table}`;
        const params = [];
        
        // Search functionality
        if (search && searchFields.length > 0) {
          const searchConditions = searchFields.map((field, i) => 
            `${field}::text ILIKE $${i + 1}`
          ).join(' OR ');
          query += ` WHERE ${searchConditions}`;
          searchFields.forEach(() => params.push(`%${search}%`));
        }
        
        // Sorting and pagination
        query += ` ORDER BY ${sortBy} ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        let countQuery = `SELECT COUNT(*) FROM ${table}`;
        if (search && searchFields.length > 0) {
          const searchConditions = searchFields.map((field, i) => 
            `${field}::text ILIKE $${i + 1}`
          ).join(' OR ');
          countQuery += ` WHERE ${searchConditions}`;
        }
        const countResult = await pool.query(
          countQuery, 
          search && searchFields.length > 0 ? searchFields.map(() => `%${search}%`) : []
        );
        
        res.json({
          data: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].count),
            pages: Math.ceil(countResult.rows[0].count / limit)
          }
        });
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
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        
        const query = `
          UPDATE ${table}
          SET ${setClause}, updated_date = NOW()
          WHERE id = $${keys.length + 1}
          RETURNING *
        `;
        
        const result = await pool.query(query, [...Object.values(data), req.params.id]);
        
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
  
  // SOFT DELETE (if column exists) or HARD DELETE
  app.delete(`/api/${entityName}/:id`,
    authMiddleware,
    [param('id').isUUID()],
    validate,
    async (req, res, next) => {
      try {
        // Check if soft delete column exists
        const columnsResult = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = $1 AND column_name = 'deleted_at'`,
          [table]
        );
        
        let result;
        if (columnsResult.rows.length > 0) {
          // Soft delete
          result = await pool.query(
            `UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
            [req.params.id]
          );
        } else {
          // Hard delete
          result = await pool.query(
            `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
            [req.params.id]
          );
        }
        
        if (result.rows.length === 0) {
          throw new NotFoundError(`${entityName} not found or already deleted`);
        }
        
        await logAudit(req.user.id, 'delete', table, null);
        
        logger.info(`${entityName} deleted`, { id: req.params.id, user: req.user.email });
        
        res.json({ success: true, id: req.params.id });
      } catch (error) {
        next(error);
      }
    }
  );
});

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
        'SELECT * FROM user_table WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        throw new AuthenticationError('Invalid credentials');
      }
      
      const user = result.rows[0];
      
      // Require password_hash to exist for security
      if (!user.password_hash) {
        logger.error(`Login attempt for user without password_hash: ${email}`);
        throw new AuthenticationError('Account not properly configured');
      }
      
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        throw new AuthenticationError('Invalid credentials');
      }
      
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      await logAudit(user.id, 'login', 'auth', null);
      
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

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

app.put('/api/auth/me',
  authMiddleware,
  [
    body('full_name').optional().trim(),
    body('specialite').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const data = req.body;
      delete data.email; // Prevent email change
      delete data.role; // Prevent role escalation
      
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return res.json(req.user);
      }
      
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      const query = `
        UPDATE user_table 
        SET ${setClause}, updated_date = NOW() 
        WHERE email = $${keys.length + 1} 
        RETURNING id, email, full_name, role, specialite
      `;
      
      const result = await pool.query(query, [...Object.values(data), req.user.email]);
      
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== FILE UPLOAD ====================
app.post('/api/upload',
  authMiddleware,
  upload.single('file'),
  async (req, res, next) => {
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
      
      res.json({ 
        file_url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== HEALTH CHECK ====================
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ==================== STATISTICS ENDPOINT ====================
app.get('/api/statistics',
  authMiddleware,
  async (req, res, next) => {
    try {
      const stats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM patient) as total_patients,
          (SELECT COUNT(*) FROM consultation WHERE date_consultation > NOW() - INTERVAL '30 days') as consultations_last_month,
          (SELECT COUNT(*) FROM ordonnance WHERE date_ordonnance > NOW() - INTERVAL '30 days') as prescriptions_last_month,
          (SELECT COUNT(*) FROM ivt WHERE date_injection > NOW() - INTERVAL '30 days') as ivt_last_month
      `);
      
      res.json(stats.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  if (err instanceof AppError) {
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
  
  // Database errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Resource already exists',
      statusCode: 409
    });
  }
  
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Foreign key constraint violation',
      statusCode: 400
    });
  }
  
  // Default error
  res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    statusCode: 404,
    path: req.path
  });
});

// ==================== SERVER STARTUP ====================
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Database: ${process.env.DATABASE_URL?.split('@')[1] || 'not configured'}`);
  logger.info(`🔐 JWT Secret: configured`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server gracefully');
  server.close(() => {
    logger.info('Server closed');
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
});

module.exports = app;