import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Users, MessageCircle, Table, Trash2, UserPlus, RefreshCw, Play, Pause, Square, RotateCcw, Radio, Clock, Trophy, Send, User, Lock, Edit } from 'lucide-react';
import { GameStatusBanner } from './game-status-banner';
import StaffModal from './staff-modal';
import { buildApiUrl, getApiHeaders } from '../utils/api-helper';

interface Message {
  id: string;
  content: string;
  fromTable: number;
  toTable: number;
  senderName?: string; // Real sender name (always saved, for admin tracking)
  publicSenderName?: string; // Public display name (null if anonymous)
  timestamp: string;
  isAnonymous: boolean;
}

interface ActiveTable {
  tableNumber: string; // Alfanumerico: A1, B2, DJ, 1, 2, etc.
  code: string;
  users: Array<{
    firstName: string;
    lastName: string;
    joinedAt: string;
  }>;
  userCount: number;
}

interface GameStatus {
  status: 'not_started' | 'active' | 'paused' | 'ended';
  startedAt?: string;
  pausedAt?: string;
}

interface AdminPanelProps {
  adminName: string;
  onLogout: () => void;
  isAdmin?: boolean;
  isStaff?: boolean;
  permissions?: any;
}

export function AdminPanel({ adminName, onLogout, isAdmin = true, isStaff = false, permissions = {} }: AdminPanelProps) {
  // Permission helper function
  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true; // Admin has all permissions
    if (!isStaff) return false;
    return permissions[permission] === true;
  };

  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [activeTables, setActiveTables] = useState<ActiveTable[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCode, setNewTableCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>({ status: 'not_started' });

  // Broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Countdown state
  const [countdownMinutes, setCountdownMinutes] = useState('10');
  const [countdownMessage, setCountdownMessage] = useState('Tempo rimanente');
  const [activeCountdown, setActiveCountdown] = useState<{active: boolean; endsAt?: string; message?: string}>({ active: false });

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<Array<{tableId: string; points: number}>>([]);

  // Challenge state
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [challengeType, setChallengeType] = useState<'most_messages' | 'most_reactions' | 'speed'>('most_messages');
  const [challengeDuration, setChallengeDuration] = useState('5');
  const [challengeBadgeName, setChallengeBadgeName] = useState('');
  const [challengeBadgeEmoji, setChallengeBadgeEmoji] = useState('🏆');
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);

  // Profilo & Staff state
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [newAdminCode, setNewAdminCode] = useState('');
  const [isUpdatingCode, setIsUpdatingCode] = useState(false);

  // Fetch all messages
  const fetchAllMessages = async () => {
    try {
      const response = await fetch(buildApiUrl('admin/all-messages'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setAllMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Errore nel caricamento dei messaggi');
    }
  };

  // Fetch active tables
  const fetchActiveTables = async () => {
    try {
      const response = await fetch(buildApiUrl('admin/active-tables'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setActiveTables(data.activeTables);
      }
    } catch (error) {
      console.error('Error fetching active tables:', error);
      toast.error('Errore nel caricamento dei tavoli');
    }
  };

  // Fetch game status
  const fetchGameStatus = async () => {
    try {
      const response = await fetch(buildApiUrl('game-status'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setGameStatus(data);
      }
    } catch (error) {
      console.error('Error fetching game status:', error);
      toast.error('Errore nel caricamento dello stato del gioco');
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(buildApiUrl('admin/table-stats'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  // Fetch active challenges
  const fetchActiveChallenges = async () => {
    try {
      const response = await fetch(buildApiUrl('challenges/active'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setActiveChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Error fetching active challenges:', error);
    }
  };

  // Create challenge
  const handleCreateChallenge = async () => {
    if (!challengeTitle || !challengeBadgeName) {
      toast.error('Titolo e nome badge obbligatori');
      return;
    }

    const durationMinutes = parseInt(challengeDuration);
    if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 60) {
      toast.error('Durata non valida (1-60 minuti)');
      return;
    }

    setIsCreatingChallenge(true);
    try {
      const response = await fetch(
          buildApiUrl('admin/create-challenge'),
          {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              title: challengeTitle,
              description: challengeDescription,
              type: challengeType,
              durationMinutes,
              badgeName: challengeBadgeName,
              badgeEmoji: challengeBadgeEmoji
            })
          }
      );

      if (response.ok) {
        toast.success('Sfida creata con successo!');
        // Reset form
        setChallengeTitle('');
        setChallengeDescription('');
        setChallengeDuration('5');
        setChallengeBadgeName('');
        setChallengeBadgeEmoji('🏆');
        // Refresh challenges list
        await fetchActiveChallenges();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Errore nella creazione della sfida');
      }
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  // End challenge manually
  const handleEndChallenge = async (challengeId: string) => {
    try {
      const response = await fetch(
          buildApiUrl(`admin/end-challenge/${challengeId}`),
          {
            method: 'POST',
            headers: getApiHeaders()
          }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Sfida terminata! Vincitore: Tavolo ${data.winner || 'Nessuno'}`);
        await fetchActiveChallenges();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Errore nel terminare la sfida');
      }
    } catch (error) {
      console.error('Error ending challenge:', error);
      toast.error('Errore di connessione');
    }
  };

  // Fetch countdown
  const fetchCountdown = async () => {
    try {
      const response = await fetch(buildApiUrl('countdown'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setActiveCountdown(data);
      }
    } catch (error) {
      console.error('Error fetching countdown:', error);
    }
  };

  // Fetch admin profile
  const fetchAdminProfile = async () => {
    try {
      const response = await fetch(buildApiUrl('admin/profile'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setAdminProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    }
  };

  // Fetch staff members
  const fetchStaff = async () => {
    try {
      const response = await fetch(buildApiUrl('staff'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setStaffMembers(data.staff);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  // Send broadcast message
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Inserisci un messaggio');
      return;
    }

    setIsSendingBroadcast(true);
    try {
      const response = await fetch(buildApiUrl('admin/broadcast-message'), {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ content: broadcastMessage })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Messaggio inviato a ${data.tableCount} tavoli!`);
        setBroadcastMessage('');
        await fetchAllMessages();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Errore nell\'invio del messaggio');
      }
    } catch (error) {
      console.error('Error broadcasting message:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Start countdown
  const handleStartCountdown = async () => {
    const minutes = parseInt(countdownMinutes);
    if (isNaN(minutes) || minutes < 1 || minutes > 60) {
      toast.error('Inserisci minuti validi (1-60)');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('admin/set-countdown'), {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          minutes,
          message: countdownMessage
        })
      });

      if (response.ok) {
        toast.success(`Countdown di ${minutes} minuti avviato!`);
        await fetchCountdown();
      } else {
        toast.error('Errore nell\'avvio del countdown');
      }
    } catch (error) {
      console.error('Error starting countdown:', error);
      toast.error('Errore di connessione');
    }
  };

  // Stop countdown
  const handleStopCountdown = async () => {
    try {
      const response = await fetch(buildApiUrl('admin/stop-countdown'), {
        method: 'POST',
        headers: getApiHeaders()
      });

      if (response.ok) {
        toast.success('Countdown fermato!');
        await fetchCountdown();
      } else {
        toast.error('Errore nel fermare il countdown');
      }
    } catch (error) {
      console.error('Error stopping countdown:', error);
      toast.error('Errore di connessione');
    }
  };

  // Create new table code
  const handleCreateTableCode = async () => {
    if (!newTableNumber || !newTableCode) {
      toast.error('Inserisci numero tavolo e codice');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('admin/create-table-code'), {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          tableNumber: newTableNumber.trim().toUpperCase(), // Alfanumerico: A1, B2, DJ, etc.
          code: newTableCode
        })
      });

      if (response.ok) {
        toast.success(`Codice tavolo ${newTableNumber} creato con successo!`);
        setNewTableNumber('');
        setNewTableCode('');
        await fetchActiveTables();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Errore nella creazione del codice tavolo');
      }
    } catch (error) {
      console.error('Error creating table code:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete table
  const handleDeleteTable = async (tableNumber: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il Tavolo ${tableNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`admin/delete-table/${tableNumber}`), {
        method: 'DELETE',
        headers: getApiHeaders()
      });

      if (response.ok) {
        toast.success(`Tavolo ${tableNumber} eliminato con successo!`);
        await fetchActiveTables();
      } else {
        toast.error('Errore nell\'eliminazione del tavolo');
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Errore di connessione');
    }
  };

  // Game control functions
  const handleStartGame = async () => {
    if (!confirm('Sei sicuro di voler avviare il gioco?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('admin/start-game'), {
        method: 'POST',
        headers: getApiHeaders()
      });

      if (response.ok) {
        toast.success('Gioco avviato con successo!');
        await fetchGameStatus();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Errore nell\'avvio del gioco');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseGame = async () => {
    if (!confirm('Sei sicuro di voler mettere in pausa il gioco?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('admin/pause-game'), {
        method: 'POST',
        headers: getApiHeaders()
      });

      if (response.ok) {
        toast.success('Gioco messo in pausa');
        await fetchGameStatus();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Errore nella pausa del gioco');
      }
    } catch (error) {
      console.error('Error pausing game:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeGame = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('admin/resume-game'), {
        method: 'POST',
        headers: getApiHeaders()
      });

      if (response.ok) {
        toast.success('Gioco ripreso');
        await fetchGameStatus();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Errore nella ripresa del gioco');
      }
    } catch (error) {
      console.error('Error resuming game:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndGame = async () => {
    if (!confirm('Sei sicuro di voler terminare il gioco? Questa azione non può essere annullata.')) return;

    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('admin/end-game'), {
        method: 'POST',
        headers: getApiHeaders()
      });

      if (response.ok) {
        toast.success('Gioco terminato');
        await fetchGameStatus();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Errore nella terminazione del gioco');
      }
    } catch (error) {
      console.error('Error ending game:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetGame = async () => {
    if (!confirm('Sei sicuro di voler resettare completamente il gioco? Tutti i messaggi e utenti verranno eliminati. Questa azione non può essere annullata.')) return;

    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('admin/reset-game'), {
        method: 'POST',
        headers: getApiHeaders()
      });

      if (response.ok) {
        toast.success('Gioco resettato completamente');
        await Promise.all([fetchGameStatus(), fetchAllMessages(), fetchActiveTables()]);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Errore nel reset del gioco');
      }
    } catch (error) {
      console.error('Error resetting game:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };


  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchAllMessages(), fetchActiveTables(), fetchGameStatus()]);
    setIsLoading(false);
    toast.info('Dati aggiornati');
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load data on mount
  useEffect(() => {
    fetchAllMessages();
    fetchActiveTables();
    fetchGameStatus();
    fetchLeaderboard();
    fetchCountdown();
    fetchActiveChallenges();
    fetchAdminProfile();
    fetchStaff();
  }, []);

  // Auto-refresh leaderboard, countdown, and challenges every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard();
      fetchCountdown();
      fetchActiveChallenges();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen for auto-refresh events
  useEffect(() => {
    const handleAutoRefresh = () => {
      fetchAllMessages();
      fetchActiveTables();
      fetchGameStatus();
      fetchActiveChallenges();
    };

    window.addEventListener('admin-refresh', handleAutoRefresh);
    return () => window.removeEventListener('admin-refresh', handleAutoRefresh);
  }, []);

  // Calculate stats
  const totalUsers = activeTables.reduce((sum, table) => sum + table.userCount, 0);
  const totalTables = activeTables.length;

  return (
      <>
        <div className="min-h-screen bg-background p-2 sm:p-4">
          <div className="container mx-auto max-w-7xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">Pannello Admin</h1>
                <p className="text-muted-foreground">Benvenuto, {adminName}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 min-w-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-blue-600 truncate">Admin Live Monitor</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleRefresh} variant="outline" disabled={isLoading} size="sm" className="flex-1 sm:flex-initial">
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''} sm:mr-2`} />
                    <span className="hidden sm:inline">Aggiorna Ora</span>
                  </Button>
                  <Button onClick={onLogout} variant="destructive" size="sm" className="flex-1 sm:flex-initial">
                    Logout
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-3">
                  <CardTitle className="text-xs sm:text-sm font-medium">Tavoli Attivi</CardTitle>
                  <Table className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-xl sm:text-2xl font-bold">{totalTables}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-3">
                  <CardTitle className="text-xs sm:text-sm font-medium">Utenti Connessi</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-xl sm:text-2xl font-bold">{totalUsers}</div>
                </CardContent>
              </Card>

              <Card className="sm:col-span-2 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-3">
                  <CardTitle className="text-xs sm:text-sm font-medium">Messaggi Totali</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-xl sm:text-2xl font-bold">{allMessages.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Game Status */}
            <GameStatusBanner
                status={gameStatus.status}
                startedAt={gameStatus.startedAt}
                pausedAt={gameStatus.pausedAt}
            />

            {/* Game Controls */}
            <Card className="mb-6">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg">Controlli del Gioco</CardTitle>
                <CardDescription className="text-sm">
                  Gestisci lo stato del gioco e controlla quando i giocatori possono inviare messaggi
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
                  {gameStatus.status === 'not_started' && (
                      <Button onClick={handleStartGame} disabled={isLoading || !hasPermission('manage_game_state')} className="bg-green-600 hover:bg-green-700 min-h-[44px]" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Avvia Gioco
                      </Button>
                  )}

                  {gameStatus.status === 'active' && (
                      <Button onClick={handlePauseGame} disabled={isLoading || !hasPermission('manage_game_state')} variant="outline" className="min-h-[44px]" size="sm">
                        <Pause className="w-4 h-4 mr-2" />
                        Pausa Gioco
                      </Button>
                  )}

                  {gameStatus.status === 'paused' && (
                      <>
                        <Button onClick={handleResumeGame} disabled={isLoading || !hasPermission('manage_game_state')} className="bg-green-600 hover:bg-green-700 min-h-[44px]" size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Riprendi Gioco
                        </Button>
                        <Button onClick={handleEndGame} disabled={isLoading || !hasPermission('manage_game_state')} variant="destructive" className="min-h-[44px]" size="sm">
                          <Square className="w-4 h-4 mr-2" />
                          Termina Gioco
                        </Button>
                      </>
                  )}

                  {(gameStatus.status === 'active' || gameStatus.status === 'paused') && gameStatus.status !== 'paused' && (
                      <Button onClick={handleEndGame} disabled={isLoading || !hasPermission('manage_game_state')} variant="destructive" className="min-h-[44px]" size="sm">
                        <Square className="w-4 h-4 mr-2" />
                        Termina Gioco
                      </Button>
                  )}

                  <Button onClick={handleResetGame} disabled={isLoading || !hasPermission('manage_game_state')} variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground min-h-[44px] sm:col-span-2 lg:col-span-1" size="sm">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Completo
                  </Button>
                </div>
                {!hasPermission('manage_game_state') && (
                    <p className="text-xs text-muted-foreground mt-2 px-1">
                      ⚠️ Non hai i permessi per controllare lo stato del gioco
                    </p>
                )}
              </CardContent>
            </Card>

            {/* Main Content */}
            <Tabs defaultValue="tables" className="space-y-4 sm:space-y-6">
              <TabsList className="flex flex-wrap justify-center gap-1 h-auto p-2 bg-muted/50 rounded-lg">
                {hasPermission('manage_tables') && (
                    <TabsTrigger value="tables" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <Table className="w-4 h-4 mr-1.5" />
                      Tavoli
                    </TabsTrigger>
                )}
                {hasPermission('view_users') && (
                    <TabsTrigger value="users" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <Users className="w-4 h-4 mr-1.5" />
                      Utenti
                    </TabsTrigger>
                )}
                {hasPermission('view_messages') && (
                    <TabsTrigger value="messages" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <MessageCircle className="w-4 h-4 mr-1.5" />
                      Messaggi
                    </TabsTrigger>
                )}
                {hasPermission('send_broadcast') && (
                    <TabsTrigger value="broadcast" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <Radio className="w-4 h-4 mr-1.5" />
                      Broadcast
                    </TabsTrigger>
                )}
                {hasPermission('manage_countdown') && (
                    <TabsTrigger value="countdown" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <Clock className="w-4 h-4 mr-1.5" />
                      Countdown
                    </TabsTrigger>
                )}
                {hasPermission('view_leaderboard') && (
                    <TabsTrigger value="leaderboard" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <Trophy className="w-4 h-4 mr-1.5" />
                      Classifica
                    </TabsTrigger>
                )}
                {hasPermission('manage_challenges') && (
                    <TabsTrigger value="challenges" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <Trophy className="w-4 h-4 mr-1.5" />
                      Sfide
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="profilo" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <User className="w-4 h-4 mr-1.5" />
                      Profilo
                    </TabsTrigger>
                )}
                {hasPermission('manage_tv') && (
                    <TabsTrigger value="tv-display" className="text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                      <Radio className="w-4 h-4 mr-1.5" />
                      TV Display
                    </TabsTrigger>
                )}
              </TabsList>

              {/* Tables Management */}
              <TabsContent value="tables">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Create New Table */}
                  <Card>
                    <CardHeader className="px-4 sm:px-6">
                      <CardTitle className="text-base sm:text-lg">Crea Nuovo Tavolo</CardTitle>
                      <CardDescription className="text-sm">
                        Aggiungi un nuovo codice tavolo per la sessione di gioco
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 sm:px-6">
                      <div className="space-y-2">
                        <Label htmlFor="tableNumber" className="text-sm">ID Tavolo</Label>
                        <Input
                            id="tableNumber"
                            type="text"
                            placeholder="es. A1, B2, DJ, VIP1, etc."
                            value={newTableNumber}
                            onChange={(e) => setNewTableNumber(e.target.value)}
                            className="min-h-[44px]"
                            maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tableCode" className="text-sm">Codice Tavolo</Label>
                        <Input
                            id="tableCode"
                            placeholder="es. ABC123"
                            value={newTableCode}
                            onChange={(e) => setNewTableCode(e.target.value.toUpperCase())}
                            className="min-h-[44px]"
                        />
                      </div>
                      <Button
                          onClick={handleCreateTableCode}
                          disabled={isLoading}
                          className="w-full min-h-[44px]"
                          size="sm"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Crea Tavolo
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Active Tables List */}
                  <Card>
                    <CardHeader className="px-4 sm:px-6">
                      <CardTitle className="text-base sm:text-lg">Tavoli Attivi ({totalTables})</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <ScrollArea className="h-64 sm:h-80">
                        <div className="space-y-3">
                          {activeTables.map((table) => (
                              <div key={table.tableNumber} className="flex items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm sm:text-base">Tavolo {table.tableNumber}</div>
                                  <div className="text-xs sm:text-sm text-muted-foreground break-all">
                                    Codice: <span className="font-mono">{table.code}</span>
                                  </div>
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    {table.userCount} utenti
                                  </Badge>
                                </div>
                                <Button
                                    onClick={() => handleDeleteTable(table.tableNumber)}
                                    variant="destructive"
                                    size="sm"
                                    className="flex-shrink-0 min-h-[36px] min-w-[36px] p-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                          ))}
                          {activeTables.length === 0 && (
                              <div className="text-center text-muted-foreground py-8 text-sm">
                                Nessun tavolo attivo
                              </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Connected Users */}
              <TabsContent value="users">
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Utenti Connessi per Tavolo</CardTitle>
                    <CardDescription className="text-sm">
                      Refresh automatico attivo - Visualizzazione in tempo reale degli utenti connessi
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <ScrollArea className="h-80 sm:h-96">
                      <div className="space-y-4 sm:space-y-6">
                        {activeTables.map((table) => (
                            <div key={table.tableNumber}>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                                <h3 className="font-medium text-sm sm:text-base">Tavolo {table.tableNumber}</h3>
                                <Badge variant="outline" className="text-xs">{table.userCount} utenti</Badge>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-green-600">Live</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 sm:mb-6">
                                {table.users.map((user, index) => (
                                    <div key={index} className="p-3 border rounded-lg">
                                      <div className="font-medium text-sm sm:text-base">{user.firstName} {user.lastName}</div>
                                      <div className="text-xs sm:text-sm text-muted-foreground">
                                        Connesso: {formatTimestamp(user.joinedAt)}
                                      </div>
                                    </div>
                                ))}
                                {table.users.length === 0 && (
                                    <div className="text-muted-foreground col-span-full text-sm">
                                      Nessun utente connesso
                                    </div>
                                )}
                              </div>
                              <Separator />
                            </div>
                        ))}
                        {activeTables.length === 0 && (
                            <div className="text-center text-muted-foreground py-8 text-sm">
                              Nessun tavolo attivo
                            </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Messages */}
              <TabsContent value="messages">
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Tutti i Messaggi ({allMessages.length})</CardTitle>
                    <CardDescription className="text-sm">
                      🔍 Cronologia completa dei messaggi con visibilità ADMIN sui mittenti reali (anche per messaggi anonimi)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <ScrollArea className="h-80 sm:h-96">
                      <div className="space-y-4">
                        {allMessages.map((message) => (
                            <div key={message.id} className="p-3 sm:p-4 border rounded-lg">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Tavolo {message.fromTable} → Tavolo {message.toTable}
                                  </Badge>
                                  {message.isAnonymous && (
                                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                        📋 Anonimo
                                      </Badge>
                                  )}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                                  {formatTimestamp(message.timestamp)}
                                </div>
                              </div>
                              <p className="text-sm mb-2 break-words">{message.content}</p>
                              <div className="text-xs sm:text-sm bg-blue-50 p-2 sm:p-3 rounded border">
                                {message.senderName ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                      <strong className="text-blue-800 text-xs sm:text-sm">🔍 Mittente Reale (ADMIN VIEW):</strong>
                                      <span className="text-blue-700 break-words">{message.senderName}</span>
                                      {message.isAnonymous && (
                                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs mt-1 sm:mt-0 w-fit">
                                            Inviato come Anonimo ai destinatari
                                          </Badge>
                                      )}
                                    </div>
                                ) : (
                                    <span className="text-red-600 text-xs sm:text-sm break-words">⚠️ Mittente sconosciuto (dati mancanti nel database)</span>
                                )}
                              </div>
                            </div>
                        ))}
                        {allMessages.length === 0 && (
                            <div className="text-center text-muted-foreground py-8 text-sm">
                              Nessun messaggio inviato
                            </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Broadcast Messages */}
              <TabsContent value="broadcast">
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Radio className="w-5 h-5 text-purple-500" />
                      Messaggio Broadcast
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Invia un messaggio a tutti i tavoli contemporaneamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 sm:px-6">
                    <div className="space-y-2">
                      <Label htmlFor="broadcast" className="text-sm">Messaggio</Label>
                      <textarea
                          id="broadcast"
                          className="w-full min-h-[120px] px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                          placeholder="Scrivi qui il messaggio che sarà inviato a tutti i tavoli..."
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                          maxLength={500}
                      />
                      <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {broadcastMessage.length}/500 caratteri
                    </span>
                        {activeTables.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                        Sarà inviato a {activeTables.length} {activeTables.length === 1 ? 'tavolo' : 'tavoli'}
                      </span>
                        )}
                      </div>
                    </div>
                    <Button
                        onClick={handleBroadcast}
                        disabled={isSendingBroadcast || !broadcastMessage.trim()}
                        className="w-full min-h-[44px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        size="sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSendingBroadcast ? 'Invio in corso...' : 'Invia a Tutti i Tavoli'}
                    </Button>
                    {activeTables.length === 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Nessun tavolo attivo. Crea almeno un tavolo prima di inviare un broadcast.
                          </p>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Countdown Timer */}
              <TabsContent value="countdown">
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      Timer Countdown
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Avvia un countdown visibile a tutti i tavoli
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4 sm:px-6">
                    {activeCountdown.active && activeCountdown.endsAt && (
                        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
                            <h3 className="font-semibold text-orange-800">Countdown Attivo</h3>
                          </div>
                          <p className="text-sm text-orange-700 mb-1">
                            <strong>Messaggio:</strong> {activeCountdown.message}
                          </p>
                          <p className="text-sm text-orange-700 mb-3">
                            <strong>Scadenza:</strong> {new Date(activeCountdown.endsAt).toLocaleString('it-IT')}
                          </p>
                          <Button
                              onClick={handleStopCountdown}
                              variant="destructive"
                              size="sm"
                              className="w-full min-h-[44px]"
                          >
                            <Square className="w-4 h-4 mr-2" />
                            Ferma Countdown
                          </Button>
                        </div>
                    )}

                    {!activeCountdown.active && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="countdownMinutes" className="text-sm">Durata (minuti)</Label>
                              <Input
                                  id="countdownMinutes"
                                  type="number"
                                  min="1"
                                  max="60"
                                  placeholder="es. 10"
                                  value={countdownMinutes}
                                  onChange={(e) => setCountdownMinutes(e.target.value)}
                                  className="min-h-[44px]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="countdownMessage" className="text-sm">Messaggio</Label>
                              <Input
                                  id="countdownMessage"
                                  type="text"
                                  placeholder="es. Tempo rimanente"
                                  value={countdownMessage}
                                  onChange={(e) => setCountdownMessage(e.target.value)}
                                  className="min-h-[44px]"
                              />
                            </div>
                          </div>
                          <Button
                              onClick={handleStartCountdown}
                              className="w-full min-h-[44px] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                              size="sm"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Avvia Countdown
                          </Button>
                        </>
                    )}

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        💡 Il countdown apparirà come banner in cima alla schermata di tutti i tavoli connessi
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Leaderboard */}
              <TabsContent value="leaderboard">
                <div className="max-w-2xl mx-auto">
                  <Card>
                    <CardHeader className="px-4 sm:px-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-center sm:text-left">
                          <CardTitle className="text-base sm:text-lg flex items-center justify-center sm:justify-start gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Classifica Tavoli
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            Top 10 tavoli - Punteggi: msg (0.5pt) | ❤️ (2pt) | 🔥 (1.5pt) | 👍 (1pt) | 😂 (0.5pt)
                          </CardDescription>
                        </div>
                        <Button
                            onClick={fetchLeaderboard}
                            variant="outline"
                            size="sm"
                            className="min-h-[36px] w-full sm:w-auto"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Aggiorna
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <ScrollArea className="h-80 sm:h-[450px]">
                        {leaderboard.length > 0 ? (
                            <div className="space-y-3 pr-4">
                              {leaderboard.map((entry, index) => (
                                  <div
                                      key={entry.tableId}
                                      className={`flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg overflow-hidden ${
                                          index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300' :
                                              index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300' :
                                                  index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300' :
                                                      'bg-background'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                      <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold text-sm sm:text-base flex-shrink-0 ${
                                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                              index === 1 ? 'bg-gray-400 text-gray-900' :
                                                  index === 2 ? 'bg-orange-400 text-orange-900' :
                                                      'bg-muted text-muted-foreground'
                                      }`}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-sm sm:text-base truncate">Tavolo {entry.tableId}</div>
                                        <div className="text-xs sm:text-sm text-muted-foreground">
                                          {entry.points} {entry.points === 1 ? 'punto' : 'punti'}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="text-sm sm:text-base px-3 py-1 flex-shrink-0 font-semibold">
                                      {entry.points}
                                    </Badge>
                                  </div>
                              ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-12">
                              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                              <p className="text-base font-medium">Nessun punteggio ancora</p>
                              <p className="text-sm mt-2">La classifica apparirà quando i tavoli inizieranno a inviare messaggi e ricevere reazioni</p>
                            </div>
                        )}
                      </ScrollArea>
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-xs sm:text-sm text-green-800">
                            Aggiornamento automatico ogni 10 secondi
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Challenges Management */}
              <TabsContent value="challenges">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Create Challenge */}
                  <Card>
                    <CardHeader className="px-4 sm:px-6">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Crea Nuova Sfida
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Crea una sfida per i tavoli con badge come premio
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 sm:px-6">
                      <div className="space-y-2">
                        <Label htmlFor="challengeTitle" className="text-sm">Titolo Sfida</Label>
                        <Input
                            id="challengeTitle"
                            value={challengeTitle}
                            onChange={(e) => setChallengeTitle(e.target.value)}
                            placeholder="Es: Chi invia più messaggi?"
                            className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="challengeDescription" className="text-sm">Descrizione (opzionale)</Label>
                        <Input
                            id="challengeDescription"
                            value={challengeDescription}
                            onChange={(e) => setChallengeDescription(e.target.value)}
                            placeholder="Dettagli della sfida"
                            className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="challengeType" className="text-sm">Tipo di Sfida</Label>
                        <select
                            id="challengeType"
                            value={challengeType}
                            onChange={(e) => setChallengeType(e.target.value as any)}
                            className="w-full px-3 py-2 text-sm border rounded-md"
                        >
                          <option value="most_messages">Più Messaggi Inviati</option>
                          <option value="most_reactions">Più Reazioni Ricevute</option>
                          <option value="speed">Prima a 5 Messaggi (Velocità)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="challengeDuration" className="text-sm">Durata (minuti)</Label>
                        <Input
                            id="challengeDuration"
                            type="number"
                            min="1"
                            max="60"
                            value={challengeDuration}
                            onChange={(e) => setChallengeDuration(e.target.value)}
                            className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="challengeBadgeName" className="text-sm">Nome Badge</Label>
                        <Input
                            id="challengeBadgeName"
                            value={challengeBadgeName}
                            onChange={(e) => setChallengeBadgeName(e.target.value)}
                            placeholder="Es: Re dei Messaggi"
                            className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="challengeBadgeEmoji" className="text-sm">Emoji Badge</Label>
                        <Input
                            id="challengeBadgeEmoji"
                            value={challengeBadgeEmoji}
                            onChange={(e) => setChallengeBadgeEmoji(e.target.value)}
                            placeholder="🏆"
                            className="text-sm"
                            maxLength={2}
                        />
                      </div>
                      <Button
                          onClick={handleCreateChallenge}
                          disabled={isCreatingChallenge}
                          className="w-full min-h-[40px]"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        {isCreatingChallenge ? 'Creazione...' : 'Crea Sfida'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Active Challenges */}
                  <Card>
                    <CardHeader className="px-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Sfide Attive
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Sfide in corso - terminano automaticamente
                          </CardDescription>
                        </div>
                        <Button
                            onClick={fetchActiveChallenges}
                            variant="outline"
                            size="sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <ScrollArea className="h-[500px]">
                        {activeChallenges.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12">
                              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                              <p className="text-sm">Nessuna sfida attiva</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                              {activeChallenges.map((challenge) => {
                                const endsAt = new Date(challenge.endsAt);
                                const now = new Date();
                                const timeLeft = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 60000));

                                return (
                                    <div
                                        key={challenge.id}
                                        className="p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-white"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl">{challenge.badgeEmoji}</span>
                                            <h3 className="font-semibold text-sm">{challenge.title}</h3>
                                          </div>
                                          {challenge.description && (
                                              <p className="text-xs text-muted-foreground mb-2">
                                                {challenge.description}
                                              </p>
                                          )}
                                          <div className="flex flex-wrap gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                              {challenge.type === 'most_messages' && '📨 Più Messaggi'}
                                              {challenge.type === 'most_reactions' && '❤️ Più Reazioni'}
                                              {challenge.type === 'speed' && '⚡ Velocità'}
                                            </Badge>
                                            <Badge variant={timeLeft <= 1 ? 'destructive' : 'default'} className="text-xs">
                                              <Clock className="w-3 h-3 mr-1" />
                                              {timeLeft} min
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                              Badge: {challenge.badgeName}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                          onClick={() => handleEndChallenge(challenge.id)}
                                          variant="destructive"
                                          size="sm"
                                          className="w-full mt-2"
                                      >
                                        Termina Ora
                                      </Button>
                                    </div>
                                );
                              })}
                            </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Profilo e Staff */}
              <TabsContent value="profilo">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Admin Profile Card */}
                  <Card>
                    <CardHeader className="px-4 sm:px-6">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        Profilo Admin
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Informazioni account amministratore
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 sm:px-6">
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <p className="font-medium">{adminName}</p>
                        </div>
                        {adminProfile && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <Label className="text-xs text-muted-foreground">Codice Admin Segreto</Label>
                              <p className="font-mono font-bold text-lg">{adminProfile.secretTableCode}</p>
                            </div>
                        )}
                      </div>

                      <Separator />

                      {/* Change Admin Code */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm">Cambia Codice Admin</h3>
                        <div className="space-y-2">
                          <Label htmlFor="newAdminCode" className="text-sm">Nuovo Codice</Label>
                          <Input
                              id="newAdminCode"
                              value={newAdminCode}
                              onChange={(e) => setNewAdminCode(e.target.value.toUpperCase())}
                              placeholder="es. ADM2024"
                              className="min-h-[44px] font-mono"
                              maxLength={10}
                          />
                        </div>
                        <Button
                            onClick={async () => {
                              if (!newAdminCode.trim()) {
                                toast.error('Inserisci un nuovo codice');
                                return;
                              }
                              setIsUpdatingCode(true);
                              try {
                                const response = await fetch(buildApiUrl('admin/secret-code'), {
                                  method: 'PUT',
                                  headers: getApiHeaders(),
                                  body: JSON.stringify({ newCode: newAdminCode })
                                });
                                const result = await response.json();
                                if (response.ok) {
                                  toast.success('Codice aggiornato con successo');
                                  setAdminProfile({ ...adminProfile, secretTableCode: result.newCode });
                                  setNewAdminCode('');
                                } else {
                                  toast.error(result.error || 'Errore aggiornamento codice');
                                }
                              } catch (error) {
                                toast.error('Errore di connessione');
                              }
                              setIsUpdatingCode(false);
                            }}
                            disabled={isUpdatingCode || !newAdminCode.trim()}
                            className="w-full min-h-[44px]"
                            variant="outline"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          {isUpdatingCode ? 'Aggiornamento...' : 'Aggiorna Codice'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          ⚠️ Il nuovo codice sarà richiesto al prossimo login admin
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Staff Management Card */}
                  <Card>
                    <CardHeader className="px-4 sm:px-6">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        Gestione Staff
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Aggiungi e gestisci membri dello staff
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <Button
                          onClick={() => {
                            setEditingStaff(null);
                            setShowStaffModal(true);
                          }}
                          className="w-full min-h-[44px] mb-4"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Aggiungi Nuovo Staff
                      </Button>

                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {staffMembers.map((staff) => (
                              <div key={staff.id} className="p-3 border rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-medium">{staff.firstName} {staff.lastName}</p>
                                    <p className="text-xs text-muted-foreground font-mono">
                                      Codice: {staff.tableCode}
                                    </p>
                                  </div>
                                  <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                                    {staff.isActive ? 'Attivo' : 'Disabilitato'}
                                  </Badge>
                                </div>

                                {/* Permission badges */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {Object.entries(staff.permissions)
                                      .filter(([_, enabled]) => enabled)
                                      .map(([perm]) => (
                                          <Badge key={perm} variant="outline" className="text-xs">
                                            {perm.replace(/_/g, ' ')}
                                          </Badge>
                                      ))}
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                      onClick={() => {
                                        setEditingStaff(staff);
                                        setShowStaffModal(true);
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1"
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Modifica
                                  </Button>
                                  <Button
                                      onClick={async () => {
                                        if (confirm('Eliminare questo membro dello staff?')) {
                                          try {
                                            const response = await fetch(buildApiUrl(`staff/${staff.id}`), {
                                              method: 'DELETE',
                                              headers: getApiHeaders()
                                            });
                                            if (response.ok) {
                                              toast.success('Staff eliminato');
                                              setStaffMembers(staffMembers.filter(s => s.id !== staff.id));
                                            } else {
                                              toast.error('Errore eliminazione');
                                            }
                                          } catch (error) {
                                            toast.error('Errore di connessione');
                                          }
                                        }
                                      }}
                                      variant="destructive"
                                      size="sm"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                          ))}
                          {staffMembers.length === 0 && (
                              <div className="text-center text-muted-foreground py-8 text-sm">
                                Nessun membro dello staff
                              </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* TV Display */}
              <TabsContent value="tv-display">
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Radio className="w-5 h-5 text-purple-500" />
                      Display TV
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Mostra classifica e statistiche su grande schermo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 px-4 sm:px-6">
                    {/* TV Display URL */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">URL per TV Display</Label>
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">
                          Apri questo URL su un browser del TV/proiettore:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-3 bg-white border rounded text-sm font-mono break-all">
                            {window.location.origin}?tv
                          </code>
                          <Button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}?tv`);
                                toast.success('URL copiato!');
                              }}
                              variant="outline"
                              size="sm"
                          >
                            Copia
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Open TV Display */}
                    <div className="space-y-3">
                      <Button
                          onClick={() => window.open(`${window.location.origin}?tv`, '_blank')}
                          className="w-full min-h-[48px] text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        <Radio className="w-5 h-5 mr-2" />
                        Apri TV Display in Nuova Finestra
                      </Button>
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Radio className="w-4 h-4 text-blue-500" />
                        Cosa mostra il TV Display:
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                        <li>Top 5 tavoli della classifica in tempo reale</li>
                        <li>Ultimi 3 messaggi broadcast dall'amministrazione</li>
                        <li>Statistiche live: messaggi totali, utenti attivi, tavoli, reazioni</li>
                        <li>Design ottimizzato per visualizzazione a distanza</li>
                        <li>Aggiornamento automatico ogni 5 secondi</li>
                      </ul>
                    </div>

                    {/* Tips */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-green-500" />
                        Suggerimenti:
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                        <li>Usa F11 sul browser per visualizzazione a schermo intero</li>
                        <li>Assicurati che il TV sia connesso alla rete</li>
                        <li>La pagina si aggiorna automaticamente, non serve ricaricare</li>
                        <li>Posiziona il TV in un punto visibile a tutti</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Staff Modal */}
        <StaffModal
            isOpen={showStaffModal}
            onClose={() => {
              setShowStaffModal(false);
              setEditingStaff(null);
            }}
            onSuccess={() => {
              fetchStaff();
              setShowStaffModal(false);
              setEditingStaff(null);
            }}
            editingStaff={editingStaff}
        />
      </>
  );
}