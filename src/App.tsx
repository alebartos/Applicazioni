import { useState, useEffect } from 'react';
import { LoginForm } from './components/login-form';
import { MessageBoard } from './components/message-board';
import { ComposeMessage } from './components/compose-message';
import { AdminPanel } from './components/admin-panel';
import { TVDisplay } from './components/tv-display';
import AdminSetup from './components/admin-setup';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { fetchWithRetry, buildApiUrl, getApiHeaders } from './utils/api-helper';

interface Message {
  id: string;
  content: string;
  fromTable: string | null;
  toTable: string;
  senderName?: string; // Real sender name (always saved, for admin use)
  publicSenderName?: string; // Public display name (null if anonymous)
  timestamp: Date;
  isAnonymous: boolean;
  isBroadcast?: boolean; // Broadcast message from admin
  reactions?: {
    heart: number;
    thumbsup: number;
    fire: number;
    laugh: number;
  };
}

interface User {
  firstName: string;
  lastName: string;
  tableCode: string;
  tableNumber: string; // Alfanumerico: A1, B2, DJ, 1, 2, etc.
  isAdmin?: boolean;
  isStaff?: boolean;
  permissions?: any; // Staff permissions object
}

type AppState = 'checking-setup' | 'admin-setup' | 'login' | 'message-board' | 'compose-message' | 'admin' | 'tv-display';

// Check for TV display mode in URL immediately (before component renders)
const checkTVMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tv') !== null || urlParams.get('display') === 'tv';
};

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>(checkTVMode() ? 'tv-display' : 'checking-setup');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [gameStatus, setGameStatus] = useState<{ status: string; startedAt?: string; pausedAt?: string }>({ status: 'not_started' });
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Fetch game status
  const fetchGameStatus = async () => {
    try {
      const response = await fetchWithRetry(
          buildApiUrl('game-status'),
          { headers: getApiHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setGameStatus(data);
      }
    } catch (error) {
      console.error('Error fetching game status:', error);
      // Silenzioso, non mostrare errore all'utente per status check
    }
  };

  // Fetch messages for current table
  const fetchMessages = async (tableNumber: number | string) => {
    try {
      const response = await fetchWithRetry(
          buildApiUrl(`messages/${tableNumber}`),
          { headers: getApiHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        const messagesWithDates = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));

        // Controlla se ci sono nuovi messaggi e mostra notifica
        if (messagesWithDates.length > allMessages.length && allMessages.length > 0) {
          const newMessagesCount = messagesWithDates.length - allMessages.length;

          // Mostra notifica con suono e vibrazione
          showNotification('Nuovo messaggio!', `Hai ricevuto ${newMessagesCount} nuovo${newMessagesCount > 1 ? 'i' : ''} messaggio${newMessagesCount > 1 ? 'i' : ''}!`);

          // Mostra anche toast visivo in-app (sempre visibile anche senza permessi)
          toast.success('📬 Nuovo messaggio ricevuto!', {
            description: `${newMessagesCount} nuovo${newMessagesCount > 1 ? 'i' : ''} messaggio${newMessagesCount > 1 ? 'i' : ''}`,
            duration: 4000,
          });
        }

        setAllMessages(messagesWithDates);
      } else {
        console.error('Error fetching messages:', response.status);
        // Non mostrare toast ad ogni errore di polling, solo in console
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Errore silenzioso per polling, toast solo se è la prima volta
      if (allMessages.length === 0) {
        toast.error('Errore nel caricamento dei messaggi. Verifica la connessione.');
      }
    }
  };

  // Fetch available tables
  const fetchAvailableTables = async () => {
    try {
      const response = await fetchWithRetry(
          buildApiUrl('active-table-numbers'),
          { headers: getApiHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableTables(data.tableNumbers || []);
      }
    } catch (error) {
      console.error('Error fetching available tables:', error);
      // Fallback ai primi 12 tavoli se il caricamento fallisce
      setAvailableTables(Array.from({ length: 12 }, (_, i) => i + 1));
    }
  };

  // Inizializza audio context (necessario per sbloccare audio su mobile)
  const initAudioContext = () => {
    try {
      if (!audioContext) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);

        // Resume context se sospeso (policy browser)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  };

  // Richiedi permessi notifiche e mostra notifica
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }

    // Inizializza anche audio context (utente ha interagito)
    initAudioContext();
  };

  // Riproduci suono di notifica
  const playNotificationSound = () => {
    try {
      // Usa audio context esistente o creane uno nuovo
      let ctx = audioContext;
      if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
      }

      // Resume context se sospeso
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Primo beep
      const oscillator1 = ctx.createOscillator();
      const gainNode1 = ctx.createGain();

      oscillator1.connect(gainNode1);
      gainNode1.connect(ctx.destination);

      oscillator1.frequency.value = 800; // Frequenza in Hz
      oscillator1.type = 'sine';

      gainNode1.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      oscillator1.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 0.1);

      // Secondo beep dopo 0.15 secondi
      const oscillator2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();

      oscillator2.connect(gainNode2);
      gainNode2.connect(ctx.destination);

      oscillator2.frequency.value = 1000;
      oscillator2.type = 'sine';

      gainNode2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      oscillator2.start(ctx.currentTime + 0.15);
      oscillator2.stop(ctx.currentTime + 0.25);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Vibra il dispositivo (mobile)
  const vibrateDevice = () => {
    if ('vibrate' in navigator) {
      // Vibrazione pattern: vibra 200ms, pausa 100ms, vibra 200ms
      navigator.vibrate([200, 100, 200]);
    }
  };

  const showNotification = (title: string, body: string) => {
    // Riproduci suono
    playNotificationSound();

    // Vibra dispositivo (solo su mobile)
    vibrateDevice();

    // Mostra notifica browser se permesso
    if (notificationPermission === 'granted' && 'Notification' in window) {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'new-message',
        requireInteraction: false, // Non bloccare l'utente
        silent: false, // Non silenziare (anche se browser potrebbe ignorare)
        vibrate: [200, 100, 200], // Pattern vibrazione
      });

      // Porta focus all'app quando si clicca sulla notifica
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-chiudi dopo 5 secondi
      setTimeout(() => notification.close(), 5000);
    }
  };

  // Remove user from table when closing page
  const removeUserFromTable = async () => {
    if (!currentUser || currentUser.tableNumber === '0') return;

    try {
      await fetch(
          buildApiUrl('remove-user-from-table'),
          {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              tableNumber: currentUser.tableNumber,
              firstName: currentUser.firstName,
              lastName: currentUser.lastName
            }),
            keepalive: true // Importante per far funzionare la richiesta durante unload
          }
      );
    } catch (error) {
      console.error('Error removing user from table:', error);
    }
  };



  const handleLogin = async (userData: {
    firstName: string;
    lastName: string;
    tableCode: string;
    tableNumber: number;
    adminPassword?: string;
    isAdmin?: boolean;
    isStaff?: boolean;
    permissions?: any;
  }) => {
    // Login Admin (diretto da login form con isAdmin già verificato)
    if (userData.isAdmin) {
      // SECURITY: Verifica il JWT token con il backend PRIMA di mostrare la dashboard
      // Questo previene il bypass dove l'attaccante modifica la risposta 401->200
      const authToken = localStorage.getItem('authToken');

      if (!authToken) {
        toast.error('Errore di autenticazione: token mancante');
        return;
      }

      try {
        const verifyResponse = await fetch(buildApiUrl('admin/profile'), {
          headers: getApiHeaders()
        });

        if (!verifyResponse.ok) {
          // Token invalido o fake - non procedere
          localStorage.removeItem('authToken');
          toast.error('Autenticazione fallita. Riprova.');
          return;
        }

        // Token valido - ora possiamo procedere
      } catch (error) {
        console.error('Error verifying admin token:', error);
        localStorage.removeItem('authToken');
        toast.error('Errore di verifica autenticazione');
        return;
      }

      setCurrentUser({
        ...userData,
        tableNumber: String(userData.tableNumber)
      });
      setCurrentState('admin');

      // Save admin to localStorage
      localStorage.setItem('messagingame_user', JSON.stringify({
        ...userData,
        isAdmin: true
      }));

      await fetchGameStatus();
      toast.success(`Benvenuto Admin ${userData.firstName}!`, {
        description: 'Accesso al pannello di amministrazione'
      });
      return;
    }

    // ✅ Login Staff (diretto da login form con isStaff già verificato)
    if (userData.isStaff) {
      // 🔒 SECURITY: Verifica il JWT token con il backend PRIMA di mostrare la dashboard
      const authToken = localStorage.getItem('authToken');

      if (!authToken) {
        toast.error('Errore di autenticazione: token mancante');
        return;
      }

      try {
        // Verifica il token chiamando un endpoint protetto
        const verifyResponse = await fetch(buildApiUrl('admin/active-tables'), {
          headers: getApiHeaders()
        });

        if (!verifyResponse.ok) {
          localStorage.removeItem('authToken');
          toast.error('Autenticazione staff fallita. Riprova.');
          return;
        }
      } catch (error) {
        console.error('Error verifying staff token:', error);
        localStorage.removeItem('authToken');
        toast.error('Errore di verifica autenticazione');
        return;
      }

      setCurrentUser({
        ...userData,
        tableNumber: String(userData.tableNumber)
      });
      setCurrentState('admin'); // Staff accede comunque alla dashboard admin (con permessi limitati)

      // Save staff to localStorage
      localStorage.setItem('messagingame_user', JSON.stringify({
        ...userData,
        isStaff: true,
        permissions: userData.permissions
      }));

      await fetchGameStatus();
      toast.success(`Benvenuto ${userData.firstName}!`, {
        description: 'Accesso alla dashboard staff'
      });
      return;
    }

    // FALLBACK: Tentativo login admin legacy (se c'è password e codice 001)
    if (userData.tableCode === '001' && userData.adminPassword) {
      try {
        const response = await fetchWithRetry(
            buildApiUrl('admin/login'),
            {
              method: 'POST',
              headers: getApiHeaders(),
              body: JSON.stringify(userData)
            }
        );

        if (response.ok) {
          const result = await response.json();

          if (result.isAdmin) {
            setCurrentUser({
              ...userData,
              tableNumber: String(userData.tableNumber)
            });
            setCurrentState('admin');

            // ✅ Save JWT token to localStorage
            if (result.token) {
              localStorage.setItem('authToken', result.token);
            }

            // Save admin to localStorage
            localStorage.setItem('messagingame_user', JSON.stringify({
              ...userData,
              isAdmin: true
            }));

            await fetchGameStatus();
            toast.success(`Benvenuto Admin ${userData.firstName}!`, {
              description: 'Accesso al pannello di amministrazione'
            });
            return;
          }
        } else {
          toast.error('Credenziali admin non valide');
          return;
        }
      } catch (error) {
        console.error('Error during admin login:', error);
        toast.error('Errore durante il login admin');
        return;
      }
    }

    // Login normale utente
    setCurrentUser({
      ...userData,
      tableNumber: String(userData.tableNumber)
    });
    setCurrentState('message-board');

    // Save user to localStorage
    localStorage.setItem('messagingame_user', JSON.stringify(userData));

    // Richiedi permessi per le notifiche
    await requestNotificationPermission();

    // Add user to table when they log in
    try {
      await fetchWithRetry(
          buildApiUrl('add-user-to-table'),
          {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              tableNumber: userData.tableNumber,
              firstName: userData.firstName,
              lastName: userData.lastName
            })
          }
      );
    } catch (error) {
      console.error('Error adding user to table:', error);
      // Non bloccare il login se questo fallisce
    }

    // Fetch messages, game status and available tables
    await Promise.all([
      fetchMessages(userData.tableNumber),
      fetchGameStatus(),
      fetchAvailableTables()
    ]);
    toast.success(`Benvenuto/a ${userData.firstName}!`, {
      description: `Accesso effettuato al Tavolo ${userData.tableNumber}`
    });
  };

  const handleComposeMessage = () => {
    setCurrentState('compose-message');
  };

  const handleSendMessage = async (messageData: {
    content: string;
    toTable: number;
    senderName?: string;
    isAnonymous: boolean;
  }) => {
    if (!currentUser) return;

    try {
      const response = await fetchWithRetry(
          buildApiUrl('send-message'),
          {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              content: messageData.content,
              fromTable: currentUser.tableNumber,
              toTable: messageData.toTable,
              senderName: messageData.senderName || currentUser.firstName,
              isAnonymous: messageData.isAnonymous
            })
          }
      );

      if (response.ok) {
        setCurrentState('message-board');
        toast.success(
            `Messaggio inviato al Tavolo ${messageData.toTable}!`,
            {
              description: messageData.isAnonymous ? 'Messaggio anonimo' : `Da: ${messageData.senderName || currentUser.firstName}`
            }
        );
        // Refresh messages immediately after sending
        await fetchMessages(currentUser.tableNumber);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
        toast.error('Errore nell\'invio del messaggio', {
          description: errorData.error || 'Riprova più tardi'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Errore di connessione', {
        description: 'Verifica la connessione internet e riprova'
      });
    }
  };

  const handleBackToBoard = () => {
    setCurrentState('message-board');
  };

  const handleLogout = async (showMessage: boolean = true) => {
    // Remove user from table before logout
    await removeUserFromTable();

    // Clear localStorage
    localStorage.removeItem('messagingame_user');

    setCurrentState('login');
    setCurrentUser(null);

    if (showMessage) {
      toast.info('Logout effettuato con successo');
    }
  };

  const handleRefresh = async () => {
    if (currentUser) {
      await Promise.all([fetchMessages(currentUser.tableNumber), fetchGameStatus()]);
      toast.info('Messaggi aggiornati');
    }
  };

  // Check if admin exists on first load
  useEffect(() => {
    // Skip if we're in TV display mode
    if (currentState === 'tv-display') return;

    const checkAdminExists = async () => {
      try {
        const response = await fetch(buildApiUrl('admin/exists'), {
          headers: getApiHeaders()
        });

        if (response.ok) {
          const data = await response.json();

          if (!data.exists) {
            // No admin exists, show setup page
            setCurrentState('admin-setup');
          } else {
            // Admin exists, show normal login page
            setCurrentState('login');
          }
        } else {
          // Error checking, default to login
          setCurrentState('login');
        }
      } catch (error) {
        console.error('Error checking admin existence:', error);
        // On error, default to login page
        setCurrentState('login');
      }
    };

    checkAdminExists();
  }, []);

  // Auto-login on page load if user is saved in localStorage
  // Skip if in TV display mode
  useEffect(() => {
    // Don't auto-login if we're in TV display mode
    if (currentState === 'tv-display') return;

    const restoreUserSession = async () => {
      const savedUser = localStorage.getItem('messagingame_user');
      if (!savedUser) return;

      try {
        const userData = JSON.parse(savedUser);

        // Se è admin o staff, verifica JWT token prima di riconnettere
        if (userData.isAdmin || userData.isStaff) {
          const authToken = localStorage.getItem('authToken');

          // ✅ SECURITY: Verifica che esista un JWT token
          if (!authToken) {
            console.warn('⚠️ No JWT token found - logging out');
            localStorage.removeItem('messagingame_user');
            toast.error('Sessione scaduta. Effettua nuovamente il login.');
            return;
          }

          // ✅ SECURITY: Verifica che il JWT token sia valido chiamando un endpoint protetto
          try {
            const profileResponse = await fetch(
                buildApiUrl('admin/profile'),
                { headers: getApiHeaders() }
            );

            if (!profileResponse.ok) {
              // Token non valido o scaduto
              console.warn('⚠️ JWT token invalid or expired - logging out');
              localStorage.removeItem('messagingame_user');
              localStorage.removeItem('authToken');
              toast.error('Sessione scaduta. Effettua nuovamente il login.');
              return;
            }

            // Token valido - riconnetti
            setCurrentUser(userData);
            setCurrentState('admin');
            await fetchGameStatus();
            toast.info(`Bentornato/a ${userData.isAdmin ? 'Admin' : 'Staff'} ${userData.firstName}!`);
            return;
          } catch (error) {
            console.error('Error validating token:', error);
            localStorage.removeItem('messagingame_user');
            localStorage.removeItem('authToken');
            toast.error('Errore durante la validazione della sessione.');
            return;
          }
        }

        // Per utenti normali: verifica che il tavolo esista ancora
        const tableCheckResponse = await fetch(
            buildApiUrl('active-table-numbers'),
            { headers: getApiHeaders() }
        );

        if (tableCheckResponse.ok) {
          const { tableNumbers } = await tableCheckResponse.json();
          const tableExists = tableNumbers.includes(userData.tableNumber);

          if (!tableExists) {
            // Tavolo eliminato, fare logout
            localStorage.removeItem('messagingame_user');
            toast.error('Il tuo tavolo è stato rimosso. Effettua nuovamente il login.');
            return;
          }

          // Tavolo esiste, riconnetti l'utente
          setCurrentUser(userData);
          setCurrentState('message-board');

          // Add user back to table
          await fetch(
              buildApiUrl('add-user-to-table'),
              {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({
                  tableNumber: userData.tableNumber,
                  firstName: userData.firstName,
                  lastName: userData.lastName
                })
              }
          );

          // Load data
          await Promise.all([
            fetchMessages(userData.tableNumber),
            fetchGameStatus(),
            fetchAvailableTables()
          ]);

          toast.info(`Bentornato/a ${userData.firstName}!`);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('messagingame_user');
      }
    };

    restoreUserSession();
  }, []);

  // Check periodically if table still exists (logout forzato se tavolo viene cancellato)
  useEffect(() => {
    if (currentState !== 'message-board' || !currentUser) return;

    const checkTableExists = async () => {
      try {
        const response = await fetch(
            buildApiUrl('active-table-numbers'),
            { headers: getApiHeaders() }
        );

        if (response.ok) {
          const { tableNumbers } = await response.json();
          const tableExists = tableNumbers.includes(currentUser.tableNumber);

          if (!tableExists) {
            // Tavolo eliminato/resettato - logout forzato
            toast.error('Il gioco è stato resettato. Effettua nuovamente il login.');
            await handleLogout(false);
          }
        }
      } catch (error) {
        console.error('Error checking table existence:', error);
      }
    };

    // Check ogni 15 secondi
    const tableCheckInterval = setInterval(checkTableExists, 15000);

    return () => clearInterval(tableCheckInterval);
  }, [currentState, currentUser]);

  // Auto-refresh for game status (every 10 seconds - ridotto da 2 per performance)
  useEffect(() => {
    if (currentState === 'login') return;

    const gameStatusInterval = setInterval(() => {
      fetchGameStatus();
    }, 10000); // Cambiato da 2000 a 10000

    return () => clearInterval(gameStatusInterval);
  }, [currentState]);

  // Auto-refresh for messages (every 5 seconds - ridotto da 3)
  useEffect(() => {
    if (currentState !== 'message-board' || !currentUser) return;

    const messagesInterval = setInterval(() => {
      fetchMessages(currentUser.tableNumber);
    }, 5000); // Cambiato da 3000 a 5000

    return () => clearInterval(messagesInterval);
  }, [currentState, currentUser]);

  // Heartbeat per mantenere l'utente attivo nella lista (ogni 2 minuti)
  useEffect(() => {
    if (currentState !== 'message-board' || !currentUser) return;

    const sendHeartbeat = async () => {
      try {
        await fetchWithRetry(
            buildApiUrl('user-heartbeat'),
            {
              method: 'POST',
              headers: getApiHeaders(),
              body: JSON.stringify({
                tableNumber: currentUser.tableNumber,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName
              })
            }
        );
      } catch (error) {
        console.error('Heartbeat error:', error);
        // Errore silenzioso, non crittico
      }
    };

    // Heartbeat iniziale
    sendHeartbeat();

    // Heartbeat ogni 2 minuti
    const heartbeatInterval = setInterval(sendHeartbeat, 120000);

    return () => clearInterval(heartbeatInterval);
  }, [currentState, currentUser]);

  // Auto-refresh for admin panel (every 10 seconds - ridotto da 5)
  useEffect(() => {
    if (currentState !== 'admin') return;

    const adminRefreshInterval = setInterval(() => {
      // Trigger refresh in admin panel by dispatching a custom event
      window.dispatchEvent(new CustomEvent('admin-refresh'));
    }, 10000); // Cambiato da 5000 a 10000

    return () => clearInterval(adminRefreshInterval);
  }, [currentState]);

  // Auto-refresh available tables list (every 30 seconds)
  useEffect(() => {
    if (currentState !== 'message-board' && currentState !== 'compose-message') return;

    const tablesRefreshInterval = setInterval(() => {
      fetchAvailableTables();
    }, 30000); // Every 30 seconds

    return () => clearInterval(tablesRefreshInterval);
  }, [currentState]);

  // Cleanup user when closing page (beforeunload)
  useEffect(() => {
    if (currentState !== 'message-board' || !currentUser) return;

    const handleBeforeUnload = () => {
      removeUserFromTable();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentState, currentUser]);

  // Get messages for current table (already filtered by backend)
  const currentTableMessages = allMessages;

  if (currentState === 'checking-setup') {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin text-4xl">⏳</div>
        </div>
    );
  }

  if (currentState === 'admin-setup') {
    return (
        <>
          <AdminSetup onSetupComplete={handleLogin} />
          <Toaster />
        </>
    );
  }

  if (currentState === 'login') {
    return (
        <>
          <LoginForm onLogin={handleLogin} />
          <Toaster />
        </>
    );
  }

  if (currentState === 'compose-message' && currentUser) {
    return (
        <>
          <ComposeMessage
              currentTable={currentUser.tableNumber}
              userFirstName={currentUser.firstName}
              gameStatus={gameStatus}
              availableTables={availableTables}
              onSendMessage={handleSendMessage}
              onBack={handleBackToBoard}
          />
          <Toaster />
        </>
    );
  }

  if (currentState === 'admin' && currentUser) {
    return (
        <>
          <AdminPanel
              adminName={currentUser.firstName}
              onLogout={handleLogout}
              isAdmin={currentUser.isAdmin}
              isStaff={currentUser.isStaff}
              permissions={currentUser.permissions}
          />
          <Toaster />
        </>
    );
  }

  if (currentState === 'message-board' && currentUser) {
    return (
        <>
          <MessageBoard
              currentTable={currentUser.tableNumber}
              userFirstName={currentUser.firstName}
              messages={currentTableMessages}
              gameStatus={gameStatus}
              onComposeMessage={handleComposeMessage}
              onLogout={handleLogout}
              onRefresh={handleRefresh}
          />
          <Toaster />
        </>
    );
  }

  if (currentState === 'tv-display') {
    return <TVDisplay />;
  }

  return null;
}