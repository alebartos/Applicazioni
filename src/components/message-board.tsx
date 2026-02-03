import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { MessageCard } from "./message-card";
import { GameStatusBanner } from "./game-status-banner";
import { CountdownBanner } from "./countdown-banner";
import { Mail, Plus, RefreshCw, LogOut, Bell, Users, Trophy } from "lucide-react";
import logoImage from "figma:asset/61ee33e759d51e4543a7ff86753e250797659b2b.png";
import { buildApiUrl, getApiHeaders } from '../utils/api-helper';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  startedAt: string;
  endsAt: string;
  active: boolean;
  badgeName: string;
  badgeEmoji: string;
}

interface Message {
  id: string;
  content: string;
  fromTable: string | null;
  senderName?: string; // Real sender name (always saved, for admin use)
  publicSenderName?: string; // Public display name (null if anonymous)
  timestamp: Date;
  isAnonymous: boolean;
  isBroadcast?: boolean;
  reactions?: {
    heart: number;
    thumbsup: number;
    fire: number;
    laugh: number;
  };
}

interface MessageBoardProps {
  currentTable: string;
  userFirstName: string;
  messages: Message[];
  gameStatus: { status: string; startedAt?: string; pausedAt?: string };
  onComposeMessage: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}

export function MessageBoard({
  currentTable,
  userFirstName,
  messages,
  gameStatus,
  onComposeMessage,
  onLogout,
  onRefresh
}: MessageBoardProps) {
  const [lastMessageCount, setLastMessageCount] = useState(messages.length);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<Array<{firstName: string; lastName: string; joinedAt: string}>>([]);
  const [lastUserCount, setLastUserCount] = useState(0);
  const [countdown, setCountdown] = useState<{active: boolean; endsAt?: string; message?: string}>({ active: false });
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);

  // Fetch connected users for current table
  const fetchConnectedUsers = async () => {
    try {
      const response = await fetch(buildApiUrl(`table-users/${currentTable}`), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setConnectedUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching connected users:', error);
    }
  };

  // Fetch countdown timer
  const fetchCountdown = async () => {
    try {
      const response = await fetch(buildApiUrl('countdown'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setCountdown(data);
      }
    } catch (error) {
      console.error('Error fetching countdown:', error);
    }
  };

  // Fetch active challenges
  const fetchChallenges = async () => {
    try {
      const response = await fetch(buildApiUrl('challenges/active'), {
        headers: getApiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setActiveChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  };

  useEffect(() => {
    if (messages.length > lastMessageCount) {
      // New message arrived
      setLastMessageCount(messages.length);
      setHasNewMessages(true);
      
      // Reset the notification after 3 seconds
      setTimeout(() => setHasNewMessages(false), 3000);
    }
  }, [messages.length, lastMessageCount]);

  useEffect(() => {
    if (connectedUsers.length > lastUserCount && lastUserCount > 0) {
      // New user connected (only if we had previous data)
      // You could add a notification here if needed
    }
    setLastUserCount(connectedUsers.length);
  }, [connectedUsers.length, lastUserCount]);

  // Auto-refresh connected users every 10 seconds (ridotto da 4 per performance)
  useEffect(() => {
    fetchConnectedUsers(); // Initial fetch

    const usersInterval = setInterval(() => {
      fetchConnectedUsers();
    }, 10000); // Cambiato da 4000 a 10000

    return () => clearInterval(usersInterval);
  }, [currentTable]);

  // Auto-refresh countdown every 5 seconds
  useEffect(() => {
    fetchCountdown(); // Initial fetch

    const countdownInterval = setInterval(() => {
      fetchCountdown();
    }, 5000);

    return () => clearInterval(countdownInterval);
  }, []);

  // Auto-refresh challenges every 5 seconds
  useEffect(() => {
    fetchChallenges(); // Initial fetch

    const challengesInterval = setInterval(() => {
      fetchChallenges();
    }, 5000);

    return () => clearInterval(challengesInterval);
  }, []);

  const unreadMessages = messages.filter(m => {
    // Simple unread logic - in real app this would be tracked properly
    const now = new Date();
    const messageTime = m.timestamp;
    return (now.getTime() - messageTime.getTime()) < 30000; // Last 30 seconds
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-accent p-4">
      <div className="max-w-4xl mx-auto">
        {/* Countdown Timer */}
        <CountdownBanner countdown={countdown} />

        {/* Game Status */}
        <div className="mb-6">
          <GameStatusBanner
            status={gameStatus.status as 'not_started' | 'active' | 'paused' | 'ended'}
            startedAt={gameStatus.startedAt}
            pausedAt={gameStatus.pausedAt}
          />
        </div>

        {/* Active Challenges Banner */}
        {activeChallenges.length > 0 && (
          <div className="mb-6 space-y-3">
            {activeChallenges.map((challenge) => {
              const now = new Date();
              const endsAt = new Date(challenge.endsAt);
              const timeLeft = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));
              const minutesLeft = Math.floor(timeLeft / 60);
              const secondsLeft = timeLeft % 60;

              return (
                <Card key={challenge.id} className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded-lg">
                          <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {challenge.badgeEmoji} {challenge.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {challenge.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-lg font-mono px-4 py-2">
                        ⏱️ {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Premio: <strong className="text-yellow-700">{challenge.badgeName}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Iniziata: {new Date(challenge.startedAt).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1.5 rounded-full shadow-sm">
                <img src={logoImage} alt="Messenger Game" className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl text-primary font-semibold">
                  Tavolo {currentTable}
                </h1>
                <p className="text-muted-foreground">
                  Benvenuto/a {userFirstName} - Dashboard Messaggeria
                </p>
              </div>
            </div>
            
            {/* Desktop buttons */}
            <div className="hidden sm:flex gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">Auto-refresh attivo</span>
              </div>
              <Button 
                variant="outline" 
                onClick={onRefresh}
                className="hover:bg-card border-primary/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna ora
              </Button>
              <Button 
                variant="outline" 
                onClick={onLogout}
                className="hover:bg-card border-primary/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          
          {/* Mobile buttons - stacked */}
          <div className="flex flex-col sm:hidden gap-3">
            <Button 
              onClick={onComposeMessage}
              disabled={gameStatus.status !== 'active'}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Messaggio
            </Button>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-green-50 border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Live</span>
              </div>
              <Button 
                variant="outline" 
                onClick={onRefresh}
                className="flex-1 hover:bg-card border-primary/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna ora
              </Button>
              <Button 
                variant="outline" 
                onClick={onLogout}
                className="flex-1 hover:bg-card border-primary/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          
          {/* Desktop new message button */}
          <div className="hidden sm:block">
            <Button 
              onClick={onComposeMessage}
              disabled={gameStatus.status !== 'active'}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Messaggio
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messaggi Totali</p>
                  <p className="text-2xl">{messages.length}</p>
                </div>
                <Mail className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nuovi Messaggi</p>
                  <p className="text-2xl">{unreadMessages.length}</p>
                </div>
                <Bell className="w-8 h-8 text-primary/70" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utenti Online</p>
                  <p className="text-2xl">{connectedUsers.length}</p>
                </div>
                <Users className="w-8 h-8 text-primary/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Messages Notification */}
        {hasNewMessages && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
              <span className="text-green-700 font-medium">
                Nuovo messaggio ricevuto! 🎉
              </span>
            </div>
          </div>
        )}

        {/* Connected Users */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Utenti Connessi al Tavolo {currentTable}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-600">Live</span>
              </div>
            </CardTitle>
            <CardDescription>
              {connectedUsers.length === 0 
                ? "Nessun utente attualmente connesso" 
                : `${connectedUsers.length} utente${connectedUsers.length !== 1 ? 'i' : ''} connesso${connectedUsers.length !== 1 ? 'i' : ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectedUsers.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">In attesa di connessioni...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {connectedUsers.map((user, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.firstName === userFirstName ? 'Tu' : 'Online'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Messaggi Ricevuti
              {hasNewMessages && (
                <Badge className="bg-green-600 text-white animate-pulse">
                  Nuovo!
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {messages.length === 0 
                ? "Non hai ancora ricevuto messaggi" 
                : `${messages.length} messaggio${messages.length !== 1 ? 'i' : ''} ricevuto${messages.length !== 1 ? 'i' : ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">Nessun messaggio ancora</p>
                <p className="text-sm text-muted-foreground mb-4">
                  I messaggi che riceverai da altri tavoli appariranno qui
                </p>
                <Button 
                  onClick={onComposeMessage}
                  disabled={gameStatus.status !== 'active'}
                  variant="outline"
                  className="disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Invia il primo messaggio
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {messages
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map((message) => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      currentTable={currentTable}
                      onReactionAdded={onRefresh}
                    />
                  ))
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}