import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// ⚠️ CONFIGURAZIONE ADMIN - CAMBIA QUESTA PASSWORD PRIMA DI ANDARE IN PRODUZIONE!
const ADMIN_SECRET = "MESSAGINGAME2025!ADMIN";

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-09febf9d/health", (c) => {
  return c.json({ status: "ok" });
});

// Admin login endpoint (SICURO con password)
app.post("/make-server-09febf9d/admin/login", async (c) => {
  try {
    const { firstName, lastName, tableCode, adminPassword } = await c.req.json();

    // Verifica credenziali admin
    const isValidAdmin = (
      (firstName === 'Matteo' && lastName === 'Polverino') ||
      (firstName === 'Alessandro' && lastName === 'Bartolini')
    ) && tableCode === '001' && adminPassword === ADMIN_SECRET;

    if (isValidAdmin) {
      console.log(`Admin login successful: ${firstName} ${lastName}`);
      return c.json({
        success: true,
        isAdmin: true,
        message: "Login admin effettuato con successo"
      });
    } else {
      console.log(`Admin login failed: ${firstName} ${lastName}`);
      return c.json({
        success: false,
        isAdmin: false,
        error: "Credenziali admin non valide"
      }, 401);
    }
  } catch (error) {
    console.error("Error in admin login:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Table codes management endpoints
// Validate table code
app.post("/make-server-09febf9d/validate-table-code", async (c) => {
  try {
    const { tableCode } = await c.req.json();
    
    if (!tableCode) {
      return c.json({ error: "Table code is required" }, 400);
    }

    console.log(`Looking for table code: ${tableCode}`);

    // Get all table codes from database using the correct format: table:{number}:code
    const allTableCodes = await kv.getByPrefix("table:");
    console.log("All table codes in database:", allTableCodes);

    // Find which table has this code
    let foundTableId: string | null = null;

    // Get list of all table IDs (alfanumerici: A1, B2, DJ, etc.)
    const tableIds = await kv.get("tables:list") || [];

    for (const tableId of tableIds) {
      try {
        const codeFromDB = await kv.get(`table:${tableId}:code`);
        console.log(`Checking table ${tableId}, code in DB: ${codeFromDB}`);

        if (codeFromDB === tableCode) {
          foundTableId = tableId;
          break;
        }
      } catch (error) {
        // Table doesn't exist, continue
        continue;
      }
    }

    if (foundTableId === null) {
      return c.json({ error: "Codice tavolo non valido" }, 404);
    }

    return c.json({
      valid: true,
      tableNumber: foundTableId
    });
  } catch (error) {
    console.log("Error validating table code:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all active table codes (for admin use)
app.get("/make-server-09febf9d/table-codes", async (c) => {
  try {
    // Get all table codes using the correct format: table:{id}:code
    const tableCodes: { tableNumber: string; code: string }[] = [];

    // Get list of all table IDs
    const tableIds = await kv.get("tables:list") || [];

    for (const tableId of tableIds) {
      try {
        const code = await kv.get(`table:${tableId}:code`);
        if (code) {
          tableCodes.push({
            tableNumber: tableId,
            code: code
          });
        }
      } catch (error) {
        // Table doesn't exist, continue
        continue;
      }
    }

    return c.json({ tableCodes });
  } catch (error) {
    console.log("Error fetching table codes:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Debug endpoint to check all keys in database
app.get("/make-server-09febf9d/debug-keys", async (c) => {
  try {
    // Get all table codes using the correct format: table:{id}:code
    const allTableCodes: { key: string; tableNumber: string; code: string }[] = [];

    // Get list of all table IDs
    const tableIds = await kv.get("tables:list") || [];

    for (const tableId of tableIds) {
      try {
        const code = await kv.get(`table:${tableId}:code`);
        if (code) {
          allTableCodes.push({
            key: `table:${tableId}:code`,
            tableNumber: tableId,
            code: code
          });
        }
      } catch (error) {
        // Table doesn't exist, continue
        continue;
      }
    }

    console.log("Found table codes:", allTableCodes);

    return c.json({
      message: "Check server logs for table codes",
      count: allTableCodes.length,
      tableCodes: allTableCodes
    });
  } catch (error) {
    console.log("Error in debug-keys:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Game control endpoints
// Get game status
app.get("/make-server-09febf9d/game-status", async (c) => {
  try {
    const gameStatus = await kv.get("game:status") || "not_started";
    const gameStartedAt = await kv.get("game:started_at");
    const gamePausedAt = await kv.get("game:paused_at");
    
    return c.json({ 
      status: gameStatus,
      startedAt: gameStartedAt,
      pausedAt: gamePausedAt
    });
  } catch (error) {
    console.log("Error fetching game status:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Start game
app.post("/make-server-09febf9d/admin/start-game", async (c) => {
  try {
    const currentStatus = await kv.get("game:status") || "not_started";
    
    if (currentStatus === "active") {
      return c.json({ error: "Game is already active" }, 400);
    }
    
    await kv.set("game:status", "active");
    await kv.set("game:started_at", new Date().toISOString());
    await kv.del("game:paused_at"); // Remove pause timestamp if it exists
    
    return c.json({ success: true, message: "Game started successfully" });
  } catch (error) {
    console.log("Error starting game:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Pause game
app.post("/make-server-09febf9d/admin/pause-game", async (c) => {
  try {
    const currentStatus = await kv.get("game:status") || "not_started";
    
    if (currentStatus !== "active") {
      return c.json({ error: "Game is not active" }, 400);
    }
    
    await kv.set("game:status", "paused");
    await kv.set("game:paused_at", new Date().toISOString());
    
    return c.json({ success: true, message: "Game paused successfully" });
  } catch (error) {
    console.log("Error pausing game:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Resume game
app.post("/make-server-09febf9d/admin/resume-game", async (c) => {
  try {
    const currentStatus = await kv.get("game:status") || "not_started";
    
    if (currentStatus !== "paused") {
      return c.json({ error: "Game is not paused" }, 400);
    }
    
    await kv.set("game:status", "active");
    await kv.del("game:paused_at");
    
    return c.json({ success: true, message: "Game resumed successfully" });
  } catch (error) {
    console.log("Error resuming game:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// End game
app.post("/make-server-09febf9d/admin/end-game", async (c) => {
  try {
    await kv.set("game:status", "ended");
    await kv.set("game:ended_at", new Date().toISOString());
    
    return c.json({ success: true, message: "Game ended successfully" });
  } catch (error) {
    console.log("Error ending game:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Reset game (clear all data)
app.post("/make-server-09febf9d/admin/reset-game", async (c) => {
  try {
    // Reset game status
    await kv.set("game:status", "not_started");
    await kv.del("game:started_at");
    await kv.del("game:paused_at");
    await kv.del("game:ended_at");
    
    // Clear all messages
    const allMessages = await kv.getByPrefix("message:");
    for (const message of allMessages) {
      await kv.del(`message:${message.id}`);
    }
    
    // Clear all users from tables
    const tableIds = await kv.get("tables:list") || [];
    for (const tableId of tableIds) {
      try {
        await kv.del(`table:${tableId}:users`);
      } catch (error) {
        continue;
      }
    }

    return c.json({ success: true, message: "Game reset successfully" });
  } catch (error) {
    console.log("Error resetting game:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Admin endpoints
// Create new table code
app.post("/make-server-09febf9d/admin/create-table-code", async (c) => {
  try {
    const { tableNumber, code } = await c.req.json();

    if (!tableNumber || !code) {
      return c.json({ error: "Table number and code are required" }, 400);
    }

    // Validate tableNumber format (alfanumerico: A1, B2, DJ, 1, 2, etc.)
    const tableId = String(tableNumber).trim().toUpperCase();

    if (!tableId || tableId.length === 0 || tableId.length > 10) {
      return c.json({ error: "Table ID non valido (max 10 caratteri)" }, 400);
    }

    // Check if table already exists
    const existingCode = await kv.get(`table:${tableId}:code`);
    if (existingCode) {
      return c.json({ error: "Table already exists" }, 400);
    }

    // Save the table code
    await kv.set(`table:${tableId}:code`, code);

    // Initialize empty user list for the table
    await kv.set(`table:${tableId}:users`, []);

    // Add table ID to the global list of tables
    const tablesList = await kv.get("tables:list") || [];
    if (!tablesList.includes(tableId)) {
      tablesList.push(tableId);
      await kv.set("tables:list", tablesList);
    }

    return c.json({ success: true, message: "Table code created successfully", tableId });
  } catch (error) {
    console.log("Error creating table code:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all messages (for admin)
app.get("/make-server-09febf9d/admin/all-messages", async (c) => {
  try {
    const allMessages = await kv.getByPrefix("message:");
    const sortedMessages = allMessages.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.log("Error fetching all messages:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get active tables and users (for admin)
app.get("/make-server-09febf9d/admin/active-tables", async (c) => {
  try {
    const activeTables = [];

    // Get list of all table IDs
    const tableIds = await kv.get("tables:list") || [];

    for (const tableId of tableIds) {
      try {
        const code = await kv.get(`table:${tableId}:code`);
        const users = await kv.get(`table:${tableId}:users`) || [];

        if (code) {
          activeTables.push({
            tableNumber: tableId,
            code: code,
            users: users,
            userCount: users.length
          });
        }
      } catch (error) {
        continue;
      }
    }

    return c.json({ activeTables });
  } catch (error) {
    console.log("Error fetching active tables:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete table code (for admin)
app.delete("/make-server-09febf9d/admin/delete-table/:tableNumber", async (c) => {
  try {
    const tableId = c.req.param("tableNumber");

    // Delete table code and users
    await kv.del(`table:${tableId}:code`);
    await kv.del(`table:${tableId}:users`);

    // Remove table ID from the global list
    const tablesList = await kv.get("tables:list") || [];
    const updatedList = tablesList.filter((id: string) => id !== tableId);
    await kv.set("tables:list", updatedList);

    return c.json({ success: true, message: "Table deleted successfully" });
  } catch (error) {
    console.log("Error deleting table:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Add user to table (when user logs in) - CON PULIZIA AUTOMATICA
app.post("/make-server-09febf9d/add-user-to-table", async (c) => {
  try {
    const { tableNumber, firstName, lastName } = await c.req.json();

    if (!tableNumber || !firstName || !lastName) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Get current users for the table
    const currentUsers = await kv.get(`table:${tableNumber}:users`) || [];

    // PULIZIA AUTOMATICA: Rimuovi utenti inattivi (>10 minuti senza heartbeat)
    const now = new Date();
    const activeUsers = currentUsers.filter((user: any) => {
      const lastActive = new Date(user.lastActive || user.joinedAt);
      const diffMinutes = (now.getTime() - lastActive.getTime()) / 60000;
      return diffMinutes < 10; // Mantieni solo utenti attivi negli ultimi 10 min
    });

    // Cerca utente esistente
    const existingUserIndex = activeUsers.findIndex((user: any) =>
      user.firstName === firstName && user.lastName === lastName
    );

    if (existingUserIndex >= 0) {
      // Aggiorna timestamp lastActive
      activeUsers[existingUserIndex].lastActive = now.toISOString();
      console.log(`User ${firstName} ${lastName} updated activity on table ${tableNumber}`);
    } else {
      // Nuovo utente
      const newUser = {
        firstName,
        lastName,
        joinedAt: now.toISOString(),
        lastActive: now.toISOString()
      };
      activeUsers.push(newUser);
      console.log(`User ${firstName} ${lastName} added to table ${tableNumber}`);
    }

    await kv.set(`table:${tableNumber}:users`, activeUsers);

    return c.json({ success: true });
  } catch (error) {
    console.log("Error adding user to table:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Heartbeat endpoint - mantiene l'utente attivo
app.post("/make-server-09febf9d/user-heartbeat", async (c) => {
  try {
    const { tableNumber, firstName, lastName } = await c.req.json();

    if (!tableNumber || !firstName || !lastName) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const currentUsers = await kv.get(`table:${tableNumber}:users`) || [];
    const userIndex = currentUsers.findIndex((user: any) =>
      user.firstName === firstName && user.lastName === lastName
    );

    if (userIndex >= 0) {
      currentUsers[userIndex].lastActive = new Date().toISOString();
      await kv.set(`table:${tableNumber}:users`, currentUsers);
      console.log(`Heartbeat received from ${firstName} ${lastName} on table ${tableNumber}`);
    } else {
      // Utente non trovato, probabilmente è stato rimosso per inattività
      console.log(`Heartbeat from unknown user: ${firstName} ${lastName} on table ${tableNumber}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Error in heartbeat:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Remove user from table (when user logs out or closes page)
app.post("/make-server-09febf9d/remove-user-from-table", async (c) => {
  try {
    const { tableNumber, firstName, lastName } = await c.req.json();

    if (!tableNumber || !firstName || !lastName) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const currentUsers = await kv.get(`table:${tableNumber}:users`) || [];
    const updatedUsers = currentUsers.filter((user: any) =>
      !(user.firstName === firstName && user.lastName === lastName)
    );

    await kv.set(`table:${tableNumber}:users`, updatedUsers);
    console.log(`User ${firstName} ${lastName} removed from table ${tableNumber}`);

    return c.json({ success: true });
  } catch (error) {
    console.log("Error removing user from table:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Messages management endpoints
// Send a message (CON VALIDAZIONE COMPLETA)
app.post("/make-server-09febf9d/send-message", async (c) => {
  try {
    const { content, fromTable, toTable, senderName, isAnonymous } = await c.req.json();

    // VALIDAZIONE CAMPI OBBLIGATORI
    if (!content || !fromTable || !toTable) {
      return c.json({ error: "Campi obbligatori mancanti" }, 400);
    }

    // VALIDAZIONE LUNGHEZZA MESSAGGIO
    if (typeof content !== 'string') {
      return c.json({ error: "Contenuto messaggio non valido" }, 400);
    }

    if (content.length > 500) {
      return c.json({ error: "Messaggio troppo lungo (max 500 caratteri)" }, 400);
    }

    if (content.trim().length < 2) {
      return c.json({ error: "Messaggio troppo corto (min 2 caratteri)" }, 400);
    }

    // VALIDAZIONE ID TAVOLO (ora supporta alfanumerici: A1, B2, DJ, etc.)
    const fromTableId = String(fromTable);
    const toTableId = String(toTable);

    if (!fromTableId || !toTableId) {
      return c.json({ error: "ID tavolo non valido" }, 400);
    }

    // Non puoi mandare messaggi a te stesso
    if (fromTableId === toTableId) {
      return c.json({ error: "Non puoi inviare messaggi al tuo stesso tavolo" }, 400);
    }

    // VERIFICA CHE IL TAVOLO DESTINATARIO ESISTA
    const tableExists = await kv.get(`table:${toTableId}:code`);
    if (!tableExists) {
      return c.json({ error: "Tavolo destinatario non esiste" }, 404);
    }

    // SANITIZZAZIONE CONTENUTO (rimuovi HTML/script pericolosi)
    const sanitizedContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    // Check if game is active
    const gameStatus = await kv.get("game:status") || "not_started";
    if (gameStatus !== "active") {
      let errorMessage = "Il gioco non è attivo";
      if (gameStatus === "not_started") {
        errorMessage = "Il gioco non è ancora iniziato";
      } else if (gameStatus === "paused") {
        errorMessage = "Il gioco è in pausa";
      } else if (gameStatus === "ended") {
        errorMessage = "Il gioco è terminato";
      }
      return c.json({ error: errorMessage }, 403);
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      id: messageId,
      content: sanitizedContent, // Usa versione sanitizzata
      fromTable: fromTableId,
      toTable: toTableId,
      senderName: senderName || "Anonimo", // Always save the real sender name for admin tracking
      publicSenderName: isAnonymous ? null : senderName, // Public display name (null if anonymous)
      timestamp: new Date().toISOString(),
      isAnonymous
    };

    await kv.set(`message:${messageId}`, message);

    console.log(`Message sent: ${fromTableId} → ${toTableId} (${isAnonymous ? 'anonymous' : senderName})`);

    return c.json({ success: true, messageId });
  } catch (error) {
    console.log("Error sending message:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get messages for a specific table
app.get("/make-server-09febf9d/messages/:tableNumber", async (c) => {
  try {
    const tableId = c.req.param("tableNumber");

    if (!tableId) {
      return c.json({ error: "Invalid table ID" }, 400);
    }

    const allMessages = await kv.getByPrefix("message:");
    const tableMessages = allMessages
      .filter(msg => msg.toTable === tableId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return c.json({ messages: tableMessages });
  } catch (error) {
    console.log("Error fetching messages:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get users for a specific table
app.get("/make-server-09febf9d/table-users/:tableNumber", async (c) => {
  try {
    const tableId = c.req.param("tableNumber");

    if (!tableId) {
      return c.json({ error: "Invalid table ID" }, 400);
    }

    const users = await kv.get(`table:${tableId}:users`) || [];

    return c.json({
      users: users,
      tableNumber: tableId,
      userCount: users.length
    });
  } catch (error) {
    console.log("Error fetching table users:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get list of active table numbers (for compose message dropdown)
app.get("/make-server-09febf9d/active-table-numbers", async (c) => {
  try {
    const activeTableIds: string[] = [];

    // Get list of all table IDs (alfanumerici: A1, B2, DJ, 1, 2, etc.)
    const tableIds = await kv.get("tables:list") || [];

    for (const tableId of tableIds) {
      try {
        const code = await kv.get(`table:${tableId}:code`);
        if (code) {
          activeTableIds.push(tableId);
        }
      } catch (error) {
        continue;
      }
    }

    return c.json({ tableNumbers: activeTableIds });
  } catch (error) {
    console.log("Error fetching active table numbers:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Admin broadcast message to all tables
app.post("/make-server-09febf9d/admin/broadcast-message", async (c) => {
  try {
    const { content } = await c.req.json();

    if (!content || typeof content !== 'string') {
      return c.json({ error: "Contenuto messaggio obbligatorio" }, 400);
    }

    if (content.trim().length < 2) {
      return c.json({ error: "Messaggio troppo corto" }, 400);
    }

    if (content.length > 500) {
      return c.json({ error: "Messaggio troppo lungo (max 500 caratteri)" }, 400);
    }

    // Sanitize content
    const sanitizedContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    // Get all active tables
    const tableIds = await kv.get("tables:list") || [];
    let messagesSent = 0;

    // Send message to each table
    for (const tableId of tableIds) {
      try {
        const code = await kv.get(`table:${tableId}:code`);
        if (code) {
          const messageId = `msg_${Date.now()}_${tableId}_${Math.random().toString(36).substr(2, 9)}`;
          const message = {
            id: messageId,
            content: sanitizedContent,
            fromTable: "ADMIN",
            toTable: tableId,
            senderName: "Amministrazione",
            publicSenderName: "📢 Amministrazione",
            timestamp: new Date().toISOString(),
            isAnonymous: false,
            isBroadcast: true
          };

          await kv.set(`message:${messageId}`, message);
          messagesSent++;
        }
      } catch (error) {
        console.error(`Error sending broadcast to table ${tableId}:`, error);
        continue;
      }
    }

    console.log(`Broadcast message sent to ${messagesSent} tables`);

    return c.json({
      success: true,
      message: `Messaggio inviato a ${messagesSent} tavoli`,
      tableCount: messagesSent
    });
  } catch (error) {
    console.log("Error broadcasting message:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Countdown timer endpoints
app.get("/make-server-09febf9d/countdown", async (c) => {
  try {
    const countdown = await kv.get("countdown:active");
    return c.json(countdown || { active: false });
  } catch (error) {
    console.log("Error fetching countdown:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-09febf9d/admin/set-countdown", async (c) => {
  try {
    const { minutes, message } = await c.req.json();

    if (!minutes || minutes < 1 || minutes > 60) {
      return c.json({ error: "Minuti non validi (1-60)" }, 400);
    }

    const endsAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    await kv.set("countdown:active", {
      active: true,
      endsAt,
      message: message || "Tempo rimanente",
      startedAt: new Date().toISOString()
    });

    return c.json({ success: true, message: "Countdown avviato" });
  } catch (error) {
    console.log("Error setting countdown:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-09febf9d/admin/stop-countdown", async (c) => {
  try {
    await kv.set("countdown:active", { active: false });
    return c.json({ success: true, message: "Countdown fermato" });
  } catch (error) {
    console.log("Error stopping countdown:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get table statistics (for leaderboard)
app.get("/make-server-09febf9d/admin/table-stats", async (c) => {
  try {
    const allMessages = await kv.getByPrefix("message:");
    const tableIds = await kv.get("tables:list") || [];

    // Calculate points for each table with new scoring system:
    // - Message sent = 0.5 points
    // - Heart reaction = +2 points
    // - Fire reaction = +1.5 points
    // - Thumbsup reaction = +1 point
    // - Laugh reaction = +0.5 points
    const stats: { [key: string]: number } = {};

    for (const msg of allMessages) {
      if (msg.fromTable && msg.fromTable !== "ADMIN") {
        // Initialize table stats
        if (!stats[msg.fromTable]) {
          stats[msg.fromTable] = 0;
        }

        // Add message points (0.5 per message)
        stats[msg.fromTable] += 0.5;

        // Add reaction points
        if (msg.reactions) {
          stats[msg.fromTable] += (msg.reactions.heart || 0) * 2;      // ❤️ = 2 pts
          stats[msg.fromTable] += (msg.reactions.fire || 0) * 1.5;     // 🔥 = 1.5 pts
          stats[msg.fromTable] += (msg.reactions.thumbsup || 0) * 1;   // 👍 = 1 pt
          stats[msg.fromTable] += (msg.reactions.laugh || 0) * 0.5;    // 😂 = 0.5 pts
        }
      }
    }

    // Convert to array and sort by points
    const leaderboard = Object.entries(stats)
      .map(([tableId, points]) => ({
        tableId,
        points: Math.round(points * 10) / 10 // Round to 1 decimal place
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10); // Top 10

    return c.json({ leaderboard });
  } catch (error) {
    console.log("Error fetching table stats:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Add reaction to message
app.post("/make-server-09febf9d/add-reaction", async (c) => {
  try {
    const { messageId, reaction, tableNumber } = await c.req.json();

    if (!messageId || !reaction || !tableNumber) {
      return c.json({ error: "Campi obbligatori mancanti" }, 400);
    }

    // Valid reactions: heart, thumbsup, fire, laugh
    const validReactions = ['heart', 'thumbsup', 'fire', 'laugh'];
    if (!validReactions.includes(reaction)) {
      return c.json({ error: "Reazione non valida" }, 400);
    }

    // Get message
    const message = await kv.get(`message:${messageId}`);
    if (!message) {
      return c.json({ error: "Messaggio non trovato" }, 404);
    }

    // Initialize reactions if not exists
    if (!message.reactions) {
      message.reactions = { heart: 0, thumbsup: 0, fire: 0, laugh: 0 };
    }

    // Initialize reactedTables if not exists (track who reacted)
    if (!message.reactedTables) {
      message.reactedTables = {};
    }

    // REAZIONI ESCLUSIVE: Un tavolo può avere solo UNA reazione attiva
    // Prima rimuovi eventuali reazioni precedenti di questo tavolo
    const allReactionTypes = ['heart', 'thumbsup', 'fire', 'laugh'];
    let previousReaction: string | null = null;

    for (const reactionType of allReactionTypes) {
      const key = `${tableNumber}_${reactionType}`;
      if (message.reactedTables[key]) {
        previousReaction = reactionType;
        // Rimuovi la vecchia reazione
        message.reactions[reactionType] = Math.max(0, message.reactions[reactionType] - 1);
        delete message.reactedTables[key];
      }
    }

    // Se clicca sulla stessa reazione che aveva già, la toglie (toggle off)
    // Altrimenti aggiunge la nuova reazione
    if (previousReaction !== reaction) {
      // Aggiungi la nuova reazione
      const reactionKey = `${tableNumber}_${reaction}`;
      message.reactions[reaction] = (message.reactions[reaction] || 0) + 1;
      message.reactedTables[reactionKey] = true;
    }
    // else: se era la stessa, l'abbiamo già rimossa sopra (toggle off)

    // Save updated message
    await kv.set(`message:${messageId}`, message);

    // Trova quale reazione ha selezionato questo tavolo (se ce n'è una)
    let userReaction: string | null = null;
    for (const reactionType of allReactionTypes) {
      const key = `${tableNumber}_${reactionType}`;
      if (message.reactedTables[key]) {
        userReaction = reactionType;
        break;
      }
    }

    return c.json({
      success: true,
      reactions: message.reactions,
      userReaction: userReaction // quale reazione ha questo tavolo
    });
  } catch (error) {
    console.log("Error adding reaction:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Challenge System Endpoints

// Create a new challenge (Admin only)
app.post("/make-server-09febf9d/admin/create-challenge", async (c) => {
  try {
    const { title, description, type, durationMinutes, badgeName, badgeEmoji } = await c.req.json();

    if (!title || !type || !durationMinutes || !badgeName || !badgeEmoji) {
      return c.json({ error: "Campi obbligatori mancanti" }, 400);
    }

    // Valid challenge types: most_messages, most_reactions, speed
    const validTypes = ['most_messages', 'most_reactions', 'speed'];
    if (!validTypes.includes(type)) {
      return c.json({ error: "Tipo di sfida non valido" }, 400);
    }

    if (durationMinutes < 1 || durationMinutes > 60) {
      return c.json({ error: "Durata non valida (1-60 minuti)" }, 400);
    }

    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const challenge = {
      id: challengeId,
      title,
      description: description || "",
      type,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      active: true,
      badgeName,
      badgeEmoji,
      winner: null,
      participants: [] as string[], // Table IDs that participated
      results: {} as { [key: string]: number } // tableId -> score
    };

    await kv.set(`challenge:${challengeId}`, challenge);

    // Add to active challenges list
    const activeChallenges = await kv.get("challenges:active") || [];
    activeChallenges.push(challengeId);
    await kv.set("challenges:active", activeChallenges);

    console.log(`Challenge created: ${title} (${type}) - ends at ${endsAt.toISOString()}`);

    return c.json({
      success: true,
      message: "Sfida creata con successo",
      challengeId,
      challenge
    });
  } catch (error) {
    console.log("Error creating challenge:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get all active challenges
app.get("/make-server-09febf9d/challenges/active", async (c) => {
  try {
    const activeChallengeIds = await kv.get("challenges:active") || [];
    const challenges = [];

    for (const challengeId of activeChallengeIds) {
      try {
        const challenge = await kv.get(`challenge:${challengeId}`);
        if (challenge && challenge.active) {
          // Check if challenge has expired
          const now = new Date();
          const endsAt = new Date(challenge.endsAt);

          if (now > endsAt) {
            // Challenge expired, determine winner
            await determineWinner(challengeId, challenge);
            challenge.active = false;
            await kv.set(`challenge:${challengeId}`, challenge);
          } else {
            challenges.push(challenge);
          }
        }
      } catch (error) {
        continue;
      }
    }

    return c.json({ challenges });
  } catch (error) {
    console.log("Error fetching active challenges:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get challenge by ID
app.get("/make-server-09febf9d/challenges/:id", async (c) => {
  try {
    const challengeId = c.req.param("id");
    const challenge = await kv.get(`challenge:${challengeId}`);

    if (!challenge) {
      return c.json({ error: "Sfida non trovata" }, 404);
    }

    // Check if expired and determine winner if needed
    const now = new Date();
    const endsAt = new Date(challenge.endsAt);

    if (now > endsAt && challenge.active) {
      await determineWinner(challengeId, challenge);
      challenge.active = false;
      await kv.set(`challenge:${challengeId}`, challenge);
    }

    return c.json({ challenge });
  } catch (error) {
    console.log("Error fetching challenge:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// End challenge manually and determine winner (Admin only)
app.post("/make-server-09febf9d/admin/end-challenge/:id", async (c) => {
  try {
    const challengeId = c.req.param("id");
    const challenge = await kv.get(`challenge:${challengeId}`);

    if (!challenge) {
      return c.json({ error: "Sfida non trovata" }, 404);
    }

    if (!challenge.active) {
      return c.json({ error: "La sfida è già terminata" }, 400);
    }

    // Determine winner
    await determineWinner(challengeId, challenge);

    challenge.active = false;
    await kv.set(`challenge:${challengeId}`, challenge);

    // Remove from active list
    const activeChallenges = await kv.get("challenges:active") || [];
    const updatedList = activeChallenges.filter((id: string) => id !== challengeId);
    await kv.set("challenges:active", updatedList);

    return c.json({
      success: true,
      message: "Sfida terminata",
      winner: challenge.winner,
      results: challenge.results
    });
  } catch (error) {
    console.log("Error ending challenge:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get table badges
app.get("/make-server-09febf9d/table-badges/:tableNumber", async (c) => {
  try {
    const tableId = c.req.param("tableNumber");
    const badges = await kv.get(`table:${tableId}:badges`) || [];

    return c.json({ badges, tableId });
  } catch (error) {
    console.log("Error fetching table badges:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Helper function to determine challenge winner
async function determineWinner(challengeId: string, challenge: any) {
  try {
    const allMessages = await kv.getByPrefix("message:");
    const results: { [key: string]: number } = {};

    const startTime = new Date(challenge.startedAt).getTime();
    const endTime = new Date(challenge.endsAt).getTime();

    // Filter messages within challenge timeframe
    const challengeMessages = allMessages.filter(msg => {
      const msgTime = new Date(msg.timestamp).getTime();
      return msgTime >= startTime && msgTime <= endTime && msg.fromTable !== "ADMIN";
    });

    if (challenge.type === 'most_messages') {
      // Count messages sent by each table
      for (const msg of challengeMessages) {
        if (!results[msg.fromTable]) {
          results[msg.fromTable] = 0;
        }
        results[msg.fromTable]++;
      }
    } else if (challenge.type === 'most_reactions') {
      // Count reactions received by each table
      for (const msg of challengeMessages) {
        if (!results[msg.fromTable]) {
          results[msg.fromTable] = 0;
        }

        if (msg.reactions) {
          const totalReactions =
            (msg.reactions.heart || 0) +
            (msg.reactions.thumbsup || 0) +
            (msg.reactions.fire || 0) +
            (msg.reactions.laugh || 0);
          results[msg.fromTable] += totalReactions;
        }
      }
    } else if (challenge.type === 'speed') {
      // First table to send 5 messages wins
      const messageCounts: { [key: string]: { count: number; firstFive: number } } = {};

      for (const msg of challengeMessages) {
        if (!messageCounts[msg.fromTable]) {
          messageCounts[msg.fromTable] = { count: 0, firstFive: 0 };
        }
        messageCounts[msg.fromTable].count++;

        if (messageCounts[msg.fromTable].count === 5 && messageCounts[msg.fromTable].firstFive === 0) {
          messageCounts[msg.fromTable].firstFive = new Date(msg.timestamp).getTime();
        }
      }

      // Winner is whoever reached 5 messages first
      for (const [tableId, data] of Object.entries(messageCounts)) {
        if (data.firstFive > 0) {
          results[tableId] = data.firstFive;
        }
      }
    }

    // Find winner (highest score for most_messages/most_reactions, lowest timestamp for speed)
    let winnerId: string | null = null;
    let winnerScore = challenge.type === 'speed' ? Infinity : 0;

    for (const [tableId, score] of Object.entries(results)) {
      if (challenge.type === 'speed') {
        if (score > 0 && score < winnerScore) {
          winnerScore = score;
          winnerId = tableId;
        }
      } else {
        if (score > winnerScore) {
          winnerScore = score;
          winnerId = tableId;
        }
      }
    }

    challenge.results = results;
    challenge.winner = winnerId;

    // Award badge to winner
    if (winnerId) {
      const badges = await kv.get(`table:${winnerId}:badges`) || [];
      badges.push({
        challengeId: challengeId,
        name: challenge.badgeName,
        emoji: challenge.badgeEmoji,
        awardedAt: new Date().toISOString(),
        challengeTitle: challenge.title
      });
      await kv.set(`table:${winnerId}:badges`, badges);

      console.log(`Badge "${challenge.badgeName}" awarded to table ${winnerId}`);
    }

    await kv.set(`challenge:${challengeId}`, challenge);
  } catch (error) {
    console.error("Error determining winner:", error);
  }
}

Deno.serve(app.fetch);