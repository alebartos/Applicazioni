import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, validatePassword, validateTableCode, sanitizeInput, sanitizeMessageContent } from './utils/auth';
import { parsePermissions, serializePermissions, DEFAULT_PERMISSIONS, type StaffPermissions } from './utils/permissions';
import { generateToken, requireAuth, requireAdmin, requireAdminOrStaff, requirePermission } from './middleware/auth';

// Inizializza Prisma
export const prisma = new PrismaClient();

// Inizializza Express
const app = express();
const PORT = process.env.PORT || 3001;

// Enable trust proxy for reverse proxy deployments
// Trust only the first proxy (nginx in our case) - more secure than 'true'
// This allows express-rate-limit to correctly identify clients via X-Forwarded-For
app.set('trust proxy', 1);

// Configurazione JWT Secret
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET non configurato! Usando valore di default NON SICURO');
}

// Configurazione CORS sicura
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://messaggeria.duckdns.org']; // Default: sviluppo + produzione

console.log('✓ CORS configurato per:', ALLOWED_ORIGINS);

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS sicuro - Solo domini autorizzati
app.use(cors({
  origin: (origin, callback) => {
    // Permetti richieste senza origin (es. Postman, app mobile)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Origin bloccato da CORS: ${origin}`);
      callback(new Error(`Origin non autorizzato da CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser con limite dimensione
app.use(express.json({ limit: '100kb' })); // Max 100KB per richiesta

// Rate limiting globale
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 1000, // Max 1000 richieste per IP
  message: 'Troppe richieste da questo IP, riprova tra 15 minuti',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting per login (più restrittivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 5, // Max 5 tentativi
  message: 'Troppi tentativi di login, riprova tra 15 minuti',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Non conta i login riusciti
});

// Rate limiting per admin operations (molto restrittivo)
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minuti
  max: 50, // Max 50 operazioni admin
  message: 'Troppe operazioni amministrative, riprova tra 5 minuti',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting per messaggi e reazioni (anti-spam)
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20, // Max 20 messaggi/reazioni al minuto per IP
  message: 'Troppi messaggi inviati, attendi un minuto',
  standardHeaders: true,
  legacyHeaders: false
});

// Applica rate limiting globale
app.use('/api/', globalLimiter);

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============================================
// ADMIN SETUP & AUTHENTICATION
// ============================================

// Check if admin exists (for first-time setup detection)
app.get('/api/admin/exists', async (req, res) => {
  try {
    const adminCount = await prisma.admin.count();
    res.json({ exists: adminCount > 0 });
  } catch (error) {
    console.error('Error checking admin existence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// First-time admin setup
app.post('/api/admin/setup', async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !password) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findFirst();
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin già esistente' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        firstName: sanitizeInput(firstName),
        lastName: sanitizeInput(lastName),
        passwordHash,
        secretTableCode: '001' // Default admin code
      }
    });

    console.log(`✓ Admin account created: ${firstName} ${lastName}`);

    // ✅ Genera JWT token per auto-login
    const token = generateToken({
      id: admin.id,
      role: 'admin',
      firstName: admin.firstName,
      lastName: admin.lastName,
      tableCode: admin.secretTableCode
    });

    res.json({
      success: true,
      message: 'Account admin creato con successo',
      token, // ✅ JWT token per auto-login
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        secretTableCode: admin.secretTableCode
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ADMIN LOGIN
// ============================================
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { firstName, lastName, tableCode, adminPassword } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !tableCode || !adminPassword) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // ANTI USER ENUMERATION: Usa sempre lo stesso messaggio di errore
    const GENERIC_ERROR = 'Credenziali non valide';

    // Check if it's admin table code
    const admin = await prisma.admin.findUnique({
      where: { secretTableCode: tableCode.toUpperCase() }
    });

    if (admin) {
      // Admin login attempt
      const nameMatch =
          admin.firstName.toLowerCase() === firstName.trim().toLowerCase() &&
          admin.lastName.toLowerCase() === lastName.trim().toLowerCase();

      // Verify password
      const passwordValid = await verifyPassword(adminPassword, admin.passwordHash);

      // ANTI USER ENUMERATION: Verifica tutto prima di rispondere
      if (!nameMatch || !passwordValid) {
        return res.status(401).json({
          success: false,
          error: GENERIC_ERROR
        });
      }

      // Login SUCCESS - Genera JWT token
      const token = generateToken({
        id: admin.id,
        role: 'admin',
        firstName: admin.firstName,
        lastName: admin.lastName,
        tableCode: admin.secretTableCode
      });

      console.log(`✓ Admin login successful: ${firstName} ${lastName}`);
      return res.json({
        success: true,
        isAdmin: true,
        role: 'admin',
        permissions: 'all',
        token, // ✅ JWT token per autenticazione
        message: 'Login effettuato con successo'
      });
    }

    // ANTI USER ENUMERATION: Stesso messaggio di errore
    return res.status(401).json({
      success: false,
      error: GENERIC_ERROR
    });

  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Staff login endpoint
app.post('/api/staff/login', loginLimiter, async (req, res) => {
  try {
    const { firstName, lastName, tableCode, password } = req.body;

    if (!firstName || !lastName || !tableCode || !password) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // ANTI USER ENUMERATION: Usa sempre lo stesso messaggio di errore
    const GENERIC_ERROR = 'Credenziali non valide';

    // Find staff by table code
    const staff = await prisma.staff.findUnique({
      where: { tableCode: tableCode.toUpperCase() }
    });

    // ANTI USER ENUMERATION: Verifica tutto prima di rispondere
    if (!staff || !staff.isActive) {
      return res.status(401).json({ error: GENERIC_ERROR });
    }

    // Verify name matches (case-insensitive)
    const nameMatch =
        staff.firstName.toLowerCase() === firstName.trim().toLowerCase() &&
        staff.lastName.toLowerCase() === lastName.trim().toLowerCase();

    // Verify password
    const passwordValid = await verifyPassword(password, staff.passwordHash);

    // ANTI USER ENUMERATION: Verifica tutto prima di rispondere
    if (!nameMatch || !passwordValid) {
      return res.status(401).json({ error: GENERIC_ERROR });
    }

    // Parse permissions
    const permissions = parsePermissions(staff.permissions);

    // Login SUCCESS - Genera JWT token
    const token = generateToken({
      id: staff.id,
      role: 'staff',
      firstName: staff.firstName,
      lastName: staff.lastName,
      tableCode: staff.tableCode,
      permissions
    });

    console.log(`✓ Staff login successful: ${firstName} ${lastName} (${tableCode})`);

    res.json({
      success: true,
      isAdmin: false,
      isStaff: true,
      role: 'staff',
      permissions,
      token, // ✅ JWT token per autenticazione
      message: 'Login effettuato con successo'
    });

  } catch (error) {
    console.error('Error in staff login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// CODE TYPE CHECK (PUBBLICO MA SICURO)
// ============================================

// Check code type for login form - richiede nome+cognome+codice per sicurezza
// Non espone informazioni sensibili, restituisce solo il tipo di codice
app.post('/api/check-code-type', async (req, res) => {
  try {
    const { firstName, lastName, tableCode } = req.body;

    // Tutti i campi sono richiesti per sicurezza (anti brute-force sul solo codice)
    if (!firstName || !lastName || !tableCode) {
      return res.json({ codeType: 'game' }); // Default sicuro
    }

    const codeUpperCase = tableCode.toUpperCase();
    const firstNameLower = firstName.trim().toLowerCase();
    const lastNameLower = lastName.trim().toLowerCase();

    // Check if admin code AND name matches
    const admin = await prisma.admin.findUnique({
      where: { secretTableCode: codeUpperCase }
    });

    if (admin) {
      const adminNameMatch =
          admin.firstName.toLowerCase() === firstNameLower &&
          admin.lastName.toLowerCase() === lastNameLower;

      if (adminNameMatch) {
        return res.json({ codeType: 'admin' });
      }
    }

    // Check if staff code AND name matches
    const staff = await prisma.staff.findUnique({
      where: { tableCode: codeUpperCase }
    });

    if (staff && staff.isActive) {
      const staffNameMatch =
          staff.firstName.toLowerCase() === firstNameLower &&
          staff.lastName.toLowerCase() === lastNameLower;

      if (staffNameMatch) {
        return res.json({ codeType: 'staff' });
      }
    }

    // Default: game table code (o credenziali non corrispondenti)
    return res.json({ codeType: 'game' });

  } catch (error) {
    console.error('Error checking code type:', error);
    return res.json({ codeType: 'game' }); // Default sicuro in caso di errore
  }
});

// ============================================
// ADMIN PROFILE MANAGEMENT
// ============================================

// Get admin profile (PROTETTO - Solo admin autenticato)
app.get('/api/admin/profile', requireAuth, requireAdmin, async (req, res) => {
  try {
    const admin = await prisma.admin.findFirst();

    if (!admin) {
      return res.status(404).json({ error: 'Admin non trovato' });
    }

    res.json({
      profile: {
        firstName: admin.firstName,
        lastName: admin.lastName,
        // ⚠️ secretTableCode NON esposto per sicurezza - solo se sei già autenticato
        secretTableCode: admin.secretTableCode,
        createdAt: admin.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update admin secret table code (PROTETTO - Solo admin)
app.put('/api/admin/secret-code', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { newCode } = req.body;

    if (!newCode) {
      return res.status(400).json({ error: 'Nuovo codice richiesto' });
    }

    const validation = validateTableCode(newCode);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const codeUpperCase = newCode.toUpperCase();

    // Check if code conflicts with existing table or staff
    const existingTable = await prisma.table.findUnique({
      where: { code: codeUpperCase }
    });

    if (existingTable) {
      return res.status(400).json({
        error: 'Codice in conflitto con un tavolo di gioco esistente'
      });
    }

    const existingStaff = await prisma.staff.findUnique({
      where: { tableCode: codeUpperCase }
    });

    if (existingStaff) {
      return res.status(400).json({
        error: 'Codice in conflitto con un membro dello staff'
      });
    }

    // Update admin code
    const admin = await prisma.admin.findFirst();
    if (!admin) {
      return res.status(404).json({ error: 'Admin non trovato' });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { secretTableCode: codeUpperCase }
    });

    console.log(`✓ Admin secret code updated to: ${codeUpperCase}`);

    res.json({
      success: true,
      message: 'Codice admin aggiornato con successo',
      newCode: codeUpperCase
    });

  } catch (error) {
    console.error('Error updating admin code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// STAFF MANAGEMENT
// ============================================

// Get all staff members (PROTETTO - Solo admin)
app.get('/api/staff', requireAuth, requireAdmin, async (req, res) => {
  try {
    const staffMembers = await prisma.staff.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const staffList = staffMembers.map(staff => ({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      tableCode: staff.tableCode,
      permissions: parsePermissions(staff.permissions),
      isActive: staff.isActive,
      createdAt: staff.createdAt.toISOString()
    }));

    res.json({ staff: staffList });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new staff member (PROTETTO - Solo admin)
app.post('/api/staff', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, password, tableCode, permissions } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !password || !tableCode) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Validate table code
    const codeValidation = validateTableCode(tableCode);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    const codeUpperCase = tableCode.toUpperCase();

    // Check for conflicts
    const admin = await prisma.admin.findFirst();
    if (admin && admin.secretTableCode === codeUpperCase) {
      return res.status(400).json({
        error: 'Codice in conflitto con il codice admin'
      });
    }

    const existingTable = await prisma.table.findUnique({
      where: { code: codeUpperCase }
    });

    if (existingTable) {
      return res.status(400).json({
        error: 'Codice in conflitto con tavolo di gioco'
      });
    }

    const existingStaff = await prisma.staff.findUnique({
      where: { tableCode: codeUpperCase }
    });

    if (existingStaff) {
      return res.status(400).json({
        error: 'Codice tavolo già in uso da altro staff'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create staff member
    const staff = await prisma.staff.create({
      data: {
        firstName: sanitizeInput(firstName),
        lastName: sanitizeInput(lastName),
        passwordHash,
        tableCode: codeUpperCase,
        permissions: serializePermissions(permissions || {})
      }
    });

    console.log(`✓ Staff member created: ${firstName} ${lastName} (${codeUpperCase})`);

    res.json({
      success: true,
      message: 'Membro staff creato con successo',
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        tableCode: staff.tableCode,
        permissions: parsePermissions(staff.permissions)
      }
    });

  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update staff member (PROTETTO - Solo admin)
app.put('/api/staff/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const staffId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { firstName, lastName, tableCode, isActive, password } = req.body;

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return res.status(404).json({ error: 'Membro staff non trovato' });
    }

    const updateData: any = {};

    if (firstName) updateData.firstName = sanitizeInput(firstName);
    if (lastName) updateData.lastName = sanitizeInput(lastName);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Update table code if provided and different
    if (tableCode && tableCode.toUpperCase() !== staff.tableCode) {
      const codeValidation = validateTableCode(tableCode);
      if (!codeValidation.valid) {
        return res.status(400).json({ error: codeValidation.error });
      }

      const codeUpperCase = tableCode.toUpperCase();

      // Check conflicts
      const admin = await prisma.admin.findFirst();
      if (admin && admin.secretTableCode === codeUpperCase) {
        return res.status(400).json({
          error: 'Codice in conflitto con codice admin'
        });
      }

      const existingStaff = await prisma.staff.findUnique({
        where: { tableCode: codeUpperCase }
      });

      if (existingStaff && existingStaff.id !== staffId) {
        return res.status(400).json({
          error: 'Codice tavolo già in uso'
        });
      }

      updateData.tableCode = codeUpperCase;
    }

    // Update password if provided
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: updateData
    });

    console.log(`✓ Staff member updated: ${updatedStaff.firstName} ${updatedStaff.lastName}`);

    res.json({
      success: true,
      message: 'Membro staff aggiornato con successo',
      staff: {
        id: updatedStaff.id,
        firstName: updatedStaff.firstName,
        lastName: updatedStaff.lastName,
        tableCode: updatedStaff.tableCode,
        isActive: updatedStaff.isActive
      }
    });

  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete staff member (PROTETTO - Solo admin)
app.delete('/api/staff/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const staffId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

    await prisma.staff.delete({ where: { id: staffId } });

    console.log(`✓ Staff member deleted: ID ${staffId}`);
    res.json({ success: true, message: 'Membro staff eliminato con successo' });

  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update staff permissions (PROTETTO - Solo admin)
app.put('/api/staff/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const staffId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ error: 'Oggetto permessi richiesto' });
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return res.status(404).json({ error: 'Membro staff non trovato' });
    }

    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { permissions: serializePermissions(permissions) }
    });

    console.log(`✓ Permissions updated for staff ID ${staffId}`);

    res.json({
      success: true,
      message: 'Permessi aggiornati con successo',
      permissions: parsePermissions(updatedStaff.permissions)
    });

  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TABLE CODES MANAGEMENT
// ============================================

// Validate table code
app.post('/api/validate-table-code', async (req, res) => {
  try {
    const { tableCode } = req.body;

    if (!tableCode) {
      return res.status(400).json({ error: 'Table code is required' });
    }

    console.log(`Looking for table code: ${tableCode}`);

    // Cerca il tavolo con questo codice
    const table = await prisma.table.findUnique({
      where: { code: tableCode }
    });

    if (!table) {
      return res.status(404).json({ error: 'Codice tavolo non valido' });
    }

    res.json({
      valid: true,
      tableNumber: table.id
    });
  } catch (error) {
    console.error('Error validating table code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all table codes (PROTETTO - richiede autenticazione)
app.get('/api/table-codes', requireAuth, async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      select: { id: true, code: true }
    });

    const tableCodes = tables.map(t => ({
      tableNumber: t.id,
      code: t.code
    }));

    res.json({ tableCodes });
  } catch (error) {
    console.error('Error fetching table codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GAME CONTROL
// ============================================

// Get game status
app.get('/api/game-status', async (req, res) => {
  try {
    let session = await prisma.gameSession.findUnique({ where: { id: 1 } });

    // Crea sessione se non esiste
    if (!session) {
      session = await prisma.gameSession.create({
        data: { id: 1, status: 'not_started' }
      });
    }

    res.json({
      status: session.status,
      startedAt: session.startedAt?.toISOString(),
      pausedAt: session.pausedAt?.toISOString()
    });
  } catch (error) {
    console.error('Error fetching game status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start game (PROTETTO - requirePermission manage_game_state)
app.post('/api/admin/start-game', requireAuth, requirePermission('manage_game_state'), adminLimiter, async (req, res) => {
  try {
    const session = await prisma.gameSession.findUnique({ where: { id: 1 } });

    if (session?.status === 'active') {
      return res.status(400).json({ error: 'Game is already active' });
    }

    await prisma.gameSession.upsert({
      where: { id: 1 },
      create: { id: 1, status: 'active', startedAt: new Date() },
      update: { status: 'active', startedAt: new Date(), pausedAt: null }
    });

    res.json({ success: true, message: 'Game started successfully' });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pause game (PROTETTO - requirePermission manage_game_state)
app.post('/api/admin/pause-game', requireAuth, requirePermission('manage_game_state'), adminLimiter, async (req, res) => {
  try {
    const session = await prisma.gameSession.findUnique({ where: { id: 1 } });

    if (session?.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    await prisma.gameSession.update({
      where: { id: 1 },
      data: { status: 'paused', pausedAt: new Date() }
    });

    res.json({ success: true, message: 'Game paused successfully' });
  } catch (error) {
    console.error('Error pausing game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resume game (PROTETTO - requirePermission manage_game_state)
app.post('/api/admin/resume-game', requireAuth, requirePermission('manage_game_state'), adminLimiter, async (req, res) => {
  try {
    const session = await prisma.gameSession.findUnique({ where: { id: 1 } });

    if (session?.status !== 'paused') {
      return res.status(400).json({ error: 'Game is not paused' });
    }

    await prisma.gameSession.update({
      where: { id: 1 },
      data: { status: 'active', pausedAt: null }
    });

    res.json({ success: true, message: 'Game resumed successfully' });
  } catch (error) {
    console.error('Error resuming game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End game (PROTETTO - requirePermission manage_game_state)
app.post('/api/admin/end-game', requireAuth, requirePermission('manage_game_state'), adminLimiter, async (req, res) => {
  try {
    await prisma.gameSession.upsert({
      where: { id: 1 },
      create: { id: 1, status: 'ended', endedAt: new Date() },
      update: { status: 'ended', endedAt: new Date() }
    });

    res.json({ success: true, message: 'Game ended successfully' });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset game (PROTETTO - Solo admin - OPERAZIONE DISTRUTTIVA)
app.post('/api/admin/reset-game', requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  try {
    // Reset game status
    await prisma.gameSession.upsert({
      where: { id: 1 },
      create: { id: 1, status: 'not_started' },
      update: { status: 'not_started', startedAt: null, pausedAt: null, endedAt: null }
    });

    // Cancella tutti i messaggi
    await prisma.message.deleteMany();

    // Rimuovi tutti gli utenti dai tavoli
    await prisma.user.deleteMany();

    res.json({ success: true, message: 'Game reset successfully' });
  } catch (error) {
    console.error('Error resetting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ADMIN - TABLE MANAGEMENT
// ============================================

// Create table code (PROTETTO - requirePermission manage_tables)
app.post('/api/admin/create-table-code', requireAuth, requirePermission('manage_tables'), adminLimiter, async (req, res) => {
  try {
    const { tableNumber, code } = req.body;

    if (!tableNumber || !code) {
      return res.status(400).json({ error: 'Table number and code are required' });
    }

    const tableId = String(tableNumber).trim().toUpperCase();

    if (!tableId || tableId.length === 0 || tableId.length > 10) {
      return res.status(400).json({ error: 'Table ID non valido (max 10 caratteri)' });
    }

    // Verifica se esiste gia'
    const existing = await prisma.table.findUnique({ where: { id: tableId } });
    if (existing) {
      return res.status(400).json({ error: 'Table already exists' });
    }

    // Crea il tavolo
    await prisma.table.create({
      data: { id: tableId, code }
    });

    res.json({ success: true, message: 'Table code created successfully', tableId });
  } catch (error) {
    console.error('Error creating table code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete table (PROTETTO - requirePermission manage_tables)
app.delete('/api/admin/delete-table/:tableNumber', requireAuth, requirePermission('manage_tables'), adminLimiter, async (req, res) => {
  try {
    const tableId = Array.isArray(req.params.tableNumber) ? req.params.tableNumber[0] : req.params.tableNumber;

    await prisma.table.delete({
      where: { id: tableId }
    });

    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all messages (PROTETTO - requirePermission view_messages)
app.get('/api/admin/all-messages', requireAuth, requirePermission('view_messages'), async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { timestamp: 'desc' }
    });

    const formattedMessages = messages.map(m => ({
      id: m.id,
      content: m.content,
      fromTable: m.fromTableId,
      toTable: m.toTableId,
      senderName: m.senderName,
      publicSenderName: m.publicSenderName,
      timestamp: m.timestamp.toISOString(),
      isAnonymous: m.isAnonymous,
      isBroadcast: m.isBroadcast,
      reactions: {
        heart: m.reactionsHeart,
        thumbsup: m.reactionsThumbsup,
        fire: m.reactionsFire,
        laugh: m.reactionsLaugh
      }
    }));

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching all messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active tables (PROTETTO - requirePermission view_users)
app.get('/api/admin/active-tables', requireAuth, requirePermission('view_users'), async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      include: {
        users: {
          select: { firstName: true, lastName: true, joinedAt: true, lastActive: true }
        }
      }
    });

    const activeTables = tables.map(t => ({
      tableNumber: t.id,
      code: t.code,
      users: t.users.map(u => ({
        firstName: u.firstName,
        lastName: u.lastName,
        joinedAt: u.joinedAt.toISOString(),
        lastActive: u.lastActive.toISOString()
      })),
      userCount: t.users.length
    }));

    res.json({ activeTables });
  } catch (error) {
    console.error('Error fetching active tables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

// Add user to table
app.post('/api/add-user-to-table', async (req, res) => {
  try {
    const { tableNumber, firstName, lastName } = req.body;

    if (!tableNumber || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Pulizia automatica utenti inattivi (>10 minuti)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.user.deleteMany({
      where: { lastActive: { lt: tenMinutesAgo } }
    });

    // Cerca utente esistente
    const existingUser = await prisma.user.findFirst({
      where: { tableId: tableNumber, firstName, lastName }
    });

    if (existingUser) {
      // Aggiorna timestamp
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastActive: new Date() }
      });
      console.log(`User ${firstName} ${lastName} updated activity on table ${tableNumber}`);
    } else {
      // Crea nuovo utente
      await prisma.user.create({
        data: { firstName, lastName, tableId: tableNumber }
      });
      console.log(`User ${firstName} ${lastName} added to table ${tableNumber}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding user to table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User heartbeat
app.post('/api/user-heartbeat', async (req, res) => {
  try {
    const { tableNumber, firstName, lastName } = req.body;

    if (!tableNumber || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await prisma.user.findFirst({
      where: { tableId: tableNumber, firstName, lastName }
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() }
      });
      console.log(`Heartbeat received from ${firstName} ${lastName} on table ${tableNumber}`);
    } else {
      console.log(`Heartbeat from unknown user: ${firstName} ${lastName} on table ${tableNumber}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in heartbeat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove user from table
app.post('/api/remove-user-from-table', async (req, res) => {
  try {
    const { tableNumber, firstName, lastName } = req.body;

    if (!tableNumber || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await prisma.user.deleteMany({
      where: { tableId: tableNumber, firstName, lastName }
    });

    console.log(`User ${firstName} ${lastName} removed from table ${tableNumber}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing user from table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users for a table
app.get('/api/table-users/:tableNumber', async (req, res) => {
  try {
    const tableId = req.params.tableNumber;

    if (!tableId) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    const users = await prisma.user.findMany({
      where: { tableId },
      select: { firstName: true, lastName: true, joinedAt: true, lastActive: true }
    });

    res.json({
      users: users.map(u => ({
        firstName: u.firstName,
        lastName: u.lastName,
        joinedAt: u.joinedAt.toISOString(),
        lastActive: u.lastActive.toISOString()
      })),
      tableNumber: tableId,
      userCount: users.length
    });
  } catch (error) {
    console.error('Error fetching table users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// MESSAGES
// ============================================

// Send message (con rate limiting anti-spam)
app.post('/api/send-message', messageLimiter, async (req, res) => {
  try {
    const { content, fromTable, toTable, senderName, isAnonymous } = req.body;

    // Validazione campi obbligatori
    if (!content || !fromTable || !toTable) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    // Validazione lunghezza
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Contenuto messaggio non valido' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Messaggio troppo lungo (max 500 caratteri)' });
    }

    if (content.trim().length < 2) {
      return res.status(400).json({ error: 'Messaggio troppo corto (min 2 caratteri)' });
    }

    const fromTableId = String(fromTable);
    const toTableId = String(toTable);

    // Non puoi mandare a te stesso
    if (fromTableId === toTableId) {
      return res.status(400).json({ error: 'Non puoi inviare messaggi al tuo stesso tavolo' });
    }

    // Verifica che il tavolo destinatario esista
    const destTable = await prisma.table.findUnique({ where: { id: toTableId } });
    if (!destTable) {
      return res.status(404).json({ error: 'Tavolo destinatario non esiste' });
    }

    // ✅ Sanitizza contenuto con sanitizeMessageContent per protezione XSS completa
    const sanitizedContent = sanitizeMessageContent(content);

    // Verifica stato gioco
    const session = await prisma.gameSession.findUnique({ where: { id: 1 } });
    const gameStatus = session?.status || 'not_started';

    if (gameStatus !== 'active') {
      let errorMessage = 'Il gioco non è attivo';
      if (gameStatus === 'not_started') errorMessage = 'Il gioco non è ancora iniziato';
      else if (gameStatus === 'paused') errorMessage = 'Il gioco è in pausa';
      else if (gameStatus === 'ended') errorMessage = 'Il gioco è terminato';
      return res.status(403).json({ error: errorMessage });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await prisma.message.create({
      data: {
        id: messageId,
        content: sanitizedContent,
        fromTableId,
        toTableId,
        senderName: senderName || 'Anonimo',
        publicSenderName: isAnonymous ? null : senderName,
        isAnonymous: Boolean(isAnonymous)
      }
    });

    console.log(`Message sent: ${fromTableId} → ${toTableId} (${isAnonymous ? 'anonymous' : senderName})`);
    res.json({ success: true, messageId });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a table
app.get('/api/messages/:tableNumber', async (req, res) => {
  try {
    const tableId = req.params.tableNumber;

    if (!tableId) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    const messages = await prisma.message.findMany({
      where: { toTableId: tableId },
      orderBy: { timestamp: 'asc' }
    });

    const formattedMessages = messages.map(m => ({
      id: m.id,
      content: m.content,
      fromTable: m.fromTableId,
      toTable: m.toTableId,
      senderName: m.senderName,
      publicSenderName: m.publicSenderName,
      timestamp: m.timestamp.toISOString(),
      isAnonymous: m.isAnonymous,
      isBroadcast: m.isBroadcast,
      reactions: {
        heart: m.reactionsHeart,
        thumbsup: m.reactionsThumbsup,
        fire: m.reactionsFire,
        laugh: m.reactionsLaugh
      },
      reactedTables: JSON.parse(m.reactedTables)
    }));

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active table numbers (for compose dropdown)
app.get('/api/active-table-numbers', async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      select: { id: true }
    });

    res.json({ tableNumbers: tables.map(t => t.id) });
  } catch (error) {
    console.error('Error fetching active table numbers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Broadcast message (PROTETTO - requirePermission send_broadcast)
app.post('/api/admin/broadcast-message', requireAuth, requirePermission('send_broadcast'), adminLimiter, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Contenuto messaggio obbligatorio' });
    }

    if (content.trim().length < 2) {
      return res.status(400).json({ error: 'Messaggio troppo corto' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Messaggio troppo lungo (max 500 caratteri)' });
    }

    // ✅ Usa sanitizeMessageContent per protezione XSS completa
    const sanitizedContent = sanitizeMessageContent(content);

    const tables = await prisma.table.findMany();
    let messagesSent = 0;

    for (const table of tables) {
      const messageId = `msg_${Date.now()}_${table.id}_${Math.random().toString(36).substr(2, 9)}`;

      await prisma.message.create({
        data: {
          id: messageId,
          content: sanitizedContent,
          fromTableId: null,
          toTableId: table.id,
          senderName: 'Amministrazione',
          publicSenderName: '📢 Amministrazione',
          isAnonymous: false,
          isBroadcast: true
        }
      });
      messagesSent++;
    }

    console.log(`Broadcast message sent to ${messagesSent} tables`);
    res.json({
      success: true,
      message: `Messaggio inviato a ${messagesSent} tavoli`,
      tableCount: messagesSent
    });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add reaction (con rate limiting anti-spam)
app.post('/api/add-reaction', messageLimiter, async (req, res) => {
  try {
    const { messageId, reaction, tableNumber } = req.body;

    if (!messageId || !reaction || !tableNumber) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    const validReactions = ['heart', 'thumbsup', 'fire', 'laugh'];
    if (!validReactions.includes(reaction)) {
      return res.status(400).json({ error: 'Reazione non valida' });
    }

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato' });
    }

    const reactedTables = JSON.parse(message.reactedTables);
    const reactionKey = `${tableNumber}_${reaction}`;

    // Determina i nuovi valori delle reazioni
    type ReactionField = 'reactionsHeart' | 'reactionsThumbsup' | 'reactionsFire' | 'reactionsLaugh';
    const reactionFieldMap: Record<string, ReactionField> = {
      heart: 'reactionsHeart',
      thumbsup: 'reactionsThumbsup',
      fire: 'reactionsFire',
      laugh: 'reactionsLaugh'
    };
    const field = reactionFieldMap[reaction];

    let newValue: number;
    if (reactedTables[reactionKey]) {
      // Toggle off
      newValue = Math.max(0, message[field] - 1);
      delete reactedTables[reactionKey];
    } else {
      // Toggle on
      newValue = message[field] + 1;
      reactedTables[reactionKey] = true;
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        [field]: newValue,
        reactedTables: JSON.stringify(reactedTables)
      }
    });

    res.json({
      success: true,
      reactions: {
        heart: field === 'reactionsHeart' ? newValue : message.reactionsHeart,
        thumbsup: field === 'reactionsThumbsup' ? newValue : message.reactionsThumbsup,
        fire: field === 'reactionsFire' ? newValue : message.reactionsFire,
        laugh: field === 'reactionsLaugh' ? newValue : message.reactionsLaugh
      }
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// COUNTDOWN
// ============================================

app.get('/api/countdown', async (req, res) => {
  try {
    let countdown = await prisma.countdown.findUnique({ where: { id: 1 } });

    if (!countdown) {
      countdown = await prisma.countdown.create({
        data: { id: 1, active: false }
      });
    }

    res.json({
      active: countdown.active,
      endsAt: countdown.endsAt?.toISOString(),
      message: countdown.message,
      startedAt: countdown.startedAt?.toISOString()
    });
  } catch (error) {
    console.error('Error fetching countdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/set-countdown', requireAuth, requirePermission('manage_countdown'), async (req, res) => {
  try {
    const { minutes, message } = req.body;

    if (!minutes || minutes < 1 || minutes > 60) {
      return res.status(400).json({ error: 'Minuti non validi (1-60)' });
    }

    const endsAt = new Date(Date.now() + minutes * 60 * 1000);

    await prisma.countdown.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        active: true,
        endsAt,
        message: message || 'Tempo rimanente',
        startedAt: new Date()
      },
      update: {
        active: true,
        endsAt,
        message: message || 'Tempo rimanente',
        startedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Countdown avviato' });
  } catch (error) {
    console.error('Error setting countdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/stop-countdown', requireAuth, requirePermission('manage_countdown'), async (req, res) => {
  try {
    await prisma.countdown.upsert({
      where: { id: 1 },
      create: { id: 1, active: false },
      update: { active: false }
    });

    res.json({ success: true, message: 'Countdown fermato' });
  } catch (error) {
    console.error('Error stopping countdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TABLE STATS (Leaderboard)
// ============================================

app.get('/api/admin/table-stats', requireAuth, requirePermission('view_leaderboard'), async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        fromTableId: { not: null },
        isBroadcast: false
      },
      select: { fromTableId: true }
    });

    // Conta messaggi per tavolo
    const stats: Record<string, number> = {};
    for (const msg of messages) {
      if (msg.fromTableId) {
        stats[msg.fromTableId] = (stats[msg.fromTableId] || 0) + 1;
      }
    }

    // Converti in array e ordina
    const leaderboard = Object.entries(stats)
        .map(([tableId, count]) => ({ tableId, messageCount: count }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10);

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching table stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// AVVIO SERVER
// ============================================

async function main() {
  // Inizializza i singleton se non esistono
  await prisma.gameSession.upsert({
    where: { id: 1 },
    create: { id: 1, status: 'not_started' },
    update: {}
  });

  await prisma.countdown.upsert({
    where: { id: 1 },
    create: { id: 1, active: false },
    update: {}
  });

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║  Digital Messaging Game - Backend Server              ║
╠═══════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}              ║
║  API endpoint: http://localhost:${PORT}/api              ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

main()
    .catch((e) => {
      console.error('Failed to start server:', e);
      process.exit(1);
    });
