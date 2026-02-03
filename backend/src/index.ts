import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Inizializza Prisma
export const prisma = new PrismaClient();

// Inizializza Express
const app = express();
const PORT = process.env.PORT || 3001;

// Configurazione admin (richiede variabile d'ambiente)
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
  console.error('⚠️ ADMIN_SECRET non configurato! Impostalo nel file .env');
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

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
// ADMIN LOGIN
// ============================================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { firstName, lastName, tableCode, adminPassword } = req.body;

    // Verifica credenziali admin
    const isValidAdmin = (
      (firstName === 'Matteo' && lastName === 'Polverino') ||
      (firstName === 'Alessandro' && lastName === 'Bartolini')
    ) && tableCode === '001' && adminPassword === ADMIN_SECRET;

    if (isValidAdmin) {
      console.log(`Admin login successful: ${firstName} ${lastName}`);
      res.json({
        success: true,
        isAdmin: true,
        message: 'Login admin effettuato con successo'
      });
    } else {
      console.log(`Admin login failed: ${firstName} ${lastName}`);
      res.status(401).json({
        success: false,
        isAdmin: false,
        error: 'Credenziali admin non valide'
      });
    }
  } catch (error) {
    console.error('Error in admin login:', error);
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

// Get all table codes (admin)
app.get('/api/table-codes', async (req, res) => {
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

// Debug endpoint
app.get('/api/debug-keys', async (req, res) => {
  try {
    const tables = await prisma.table.findMany();

    const tableCodes = tables.map(t => ({
      key: `table:${t.id}:code`,
      tableNumber: t.id,
      code: t.code
    }));

    res.json({
      message: 'Debug endpoint',
      count: tableCodes.length,
      tableCodes
    });
  } catch (error) {
    console.error('Error in debug-keys:', error);
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

// Start game
app.post('/api/admin/start-game', async (req, res) => {
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

// Pause game
app.post('/api/admin/pause-game', async (req, res) => {
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

// Resume game
app.post('/api/admin/resume-game', async (req, res) => {
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

// End game
app.post('/api/admin/end-game', async (req, res) => {
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

// Reset game
app.post('/api/admin/reset-game', async (req, res) => {
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

// Create table code
app.post('/api/admin/create-table-code', async (req, res) => {
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

// Delete table
app.delete('/api/admin/delete-table/:tableNumber', async (req, res) => {
  try {
    const tableId = req.params.tableNumber;

    await prisma.table.delete({
      where: { id: tableId }
    });

    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all messages (admin)
app.get('/api/admin/all-messages', async (req, res) => {
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

// Get active tables (admin)
app.get('/api/admin/active-tables', async (req, res) => {
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

// Send message
app.post('/api/send-message', async (req, res) => {
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

    // Sanitizza contenuto
    const sanitizedContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

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

// Broadcast message (admin)
app.post('/api/admin/broadcast-message', async (req, res) => {
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

    const sanitizedContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

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

// Add reaction
app.post('/api/add-reaction', async (req, res) => {
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

app.post('/api/admin/set-countdown', async (req, res) => {
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

app.post('/api/admin/stop-countdown', async (req, res) => {
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

app.get('/api/admin/table-stats', async (req, res) => {
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
