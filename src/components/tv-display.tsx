import { useState, useEffect } from 'react';
import { Trophy, MessageSquare, Users, Radio } from 'lucide-react';
import { buildApiUrl, getApiHeaders } from '../utils/api-helper';

interface LeaderboardEntry {
  tableId: string;
  points: number;
}

interface BroadcastMessage {
  id: string;
  content: string;
  timestamp: string;
}

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

interface RecentMessage {
  id: string;
  content: string;
  fromTable: string;
  toTable: string;
  timestamp: string;
  isAnonymous: boolean;
}

interface LiveStats {
  totalMessages: number;
  totalUsers: number;
  totalReactions: number;
  activeTables: number;
}

export function TVDisplay() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [stats, setStats] = useState<LiveStats>({
    totalMessages: 0,
    totalUsers: 0,
    totalReactions: 0,
    activeTables: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(
        buildApiUrl('admin/table-stats'),
        {
          headers: getApiHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  // Fetch broadcast messages and recent messages
  const fetchBroadcasts = async () => {
    try {
      const response = await fetch(
        buildApiUrl('admin/all-messages'),
        {
          headers: getApiHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Deduplicate broadcasts - show only unique messages based on content+timestamp
        const broadcastMap = new Map<string, any>();
        data.messages
          .filter((msg: any) => msg.isBroadcast)
          .forEach((msg: any) => {
            // Create unique key based on content (broadcast messages with same content are duplicates)
            const key = msg.content.trim();
            // Keep only the first occurrence (or the one with earliest timestamp)
            if (!broadcastMap.has(key)) {
              broadcastMap.set(key, msg);
            }
          });

        const uniqueBroadcasts = Array.from(broadcastMap.values())
          .slice(0, 3)
          .map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            timestamp: msg.timestamp
          }));
        setBroadcasts(uniqueBroadcasts);

        // Get recent messages (not broadcasts)
        const recentMsgs = data.messages
          .filter((msg: any) => !msg.isBroadcast)
          .slice(0, 6)
          .map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            fromTable: msg.fromTable,
            toTable: msg.toTable,
            timestamp: msg.timestamp,
            isAnonymous: msg.isAnonymous
          }));
        setRecentMessages(recentMsgs);
      }
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
    }
  };

  // Fetch live statistics
  const fetchStats = async () => {
    try {
      const messagesResponse = await fetch(
        buildApiUrl('admin/all-messages'),
        {
          headers: getApiHeaders()
        }
      );

      const tablesResponse = await fetch(
        buildApiUrl('admin/active-tables'),
        {
          headers: getApiHeaders()
        }
      );

      if (messagesResponse.ok && tablesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const tablesData = await tablesResponse.json();

        let totalReactions = 0;
        messagesData.messages.forEach((msg: any) => {
          if (msg.reactions) {
            totalReactions +=
              (msg.reactions.heart || 0) +
              (msg.reactions.thumbsup || 0) +
              (msg.reactions.fire || 0) +
              (msg.reactions.laugh || 0);
          }
        });

        let totalUsers = 0;
        tablesData.activeTables.forEach((table: any) => {
          totalUsers += table.userCount;
        });

        setStats({
          totalMessages: messagesData.messages.filter((m: any) => !m.isBroadcast).length,
          totalUsers: totalUsers,
          totalReactions: totalReactions,
          activeTables: tablesData.activeTables.length
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch active challenges
  const fetchChallenges = async () => {
    try {
      const response = await fetch(
        buildApiUrl('challenges/active'),
        {
          headers: getApiHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  };

  // Update time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Initial load and refresh every 5 seconds
  useEffect(() => {
    fetchLeaderboard();
    fetchBroadcasts();
    fetchStats();
    fetchChallenges();

    const interval = setInterval(() => {
      fetchLeaderboard();
      fetchBroadcasts();
      fetchStats();
      fetchChallenges();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)',
      display: 'grid',
      gridTemplateRows: '10vh 18vh 72vh',
      gap: '0',
      padding: '0',
      margin: '0'
    }}>
      {/* HEADER */}
      <div style={{ padding: '1.2vh 2vw' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #fbbf24 0%, #f97316 50%, #ec4899 100%)',
          borderRadius: '1.5vh',
          padding: '0 3vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '4px solid #fde047'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw' }}>
            <div style={{
              width: '2.5vh',
              height: '2.5vh',
              background: 'white',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></div>
            <h1 style={{
              fontSize: '5.5vh',
              fontWeight: '900',
              color: 'white',
              margin: 0,
              textShadow: '4px 4px 8px rgba(0,0,0,0.5)',
              letterSpacing: '0.1vw'
            }}>
              🏆 CLASSIFICA LIVE
            </h1>
          </div>
          <div style={{
            fontSize: '5vh',
            fontWeight: '900',
            color: 'white',
            textShadow: '3px 3px 6px rgba(0,0,0,0.5)'
          }}>
            {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ padding: '0 2vw 2vh 2vw' }}>
        <div style={{
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2vw'
        }}>
          {/* Messaggi */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            borderRadius: '1.8vh',
            padding: '1.5vh 1.5vw',
            border: '5px solid #60a5fa',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5vh'
          }}>
            <MessageSquare style={{ width: '4.5vh', height: '4.5vh', color: 'white' }} />
            <div style={{ fontSize: '5.5vh', fontWeight: '900', color: 'white', textShadow: '3px 3px 6px rgba(0,0,0,0.4)', lineHeight: '1' }}>
              {stats.totalMessages}
            </div>
            <div style={{ fontSize: '2vh', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.15vw' }}>
              MESSAGGI
            </div>
          </div>

          {/* Utenti */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '1.8vh',
            padding: '1.5vh 1.5vw',
            border: '5px solid #34d399',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5vh'
          }}>
            <Users style={{ width: '4.5vh', height: '4.5vh', color: 'white' }} />
            <div style={{ fontSize: '5.5vh', fontWeight: '900', color: 'white', textShadow: '3px 3px 6px rgba(0,0,0,0.4)', lineHeight: '1' }}>
              {stats.totalUsers}
            </div>
            <div style={{ fontSize: '2vh', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.15vw' }}>
              UTENTI
            </div>
          </div>

          {/* Tavoli */}
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
            borderRadius: '1.8vh',
            padding: '1.5vh 1.5vw',
            border: '5px solid #c084fc',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5vh'
          }}>
            <Trophy style={{ width: '4.5vh', height: '4.5vh', color: 'white' }} />
            <div style={{ fontSize: '5.5vh', fontWeight: '900', color: 'white', textShadow: '3px 3px 6px rgba(0,0,0,0.4)', lineHeight: '1' }}>
              {stats.activeTables}
            </div>
            <div style={{ fontSize: '2vh', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.15vw' }}>
              TAVOLI
            </div>
          </div>

          {/* Reazioni */}
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)',
            borderRadius: '1.8vh',
            padding: '1.5vh 1.5vw',
            border: '5px solid #f87171',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5vh'
          }}>
            <div style={{ fontSize: '4.5vh' }}>❤️</div>
            <div style={{ fontSize: '5.5vh', fontWeight: '900', color: 'white', textShadow: '3px 3px 6px rgba(0,0,0,0.4)', lineHeight: '1' }}>
              {stats.totalReactions}
            </div>
            <div style={{ fontSize: '2vh', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.15vw' }}>
              REAZIONI
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - 3 COLONNE */}
      <div style={{
        padding: '0 2vw 2vh 2vw',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2vw',
        overflow: 'hidden',
        maxHeight: '100%'
      }}>
        {/* COLONNA SINISTRA: CLASSIFICA */}
        <div style={{
          background: 'white',
          borderRadius: '2vh',
          padding: '2vh 1.8vw',
          border: '5px solid #fbbf24',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5vw',
            marginBottom: '2.5vh',
            paddingBottom: '2vh',
            borderBottom: '4px solid #fbbf24'
          }}>
            <div style={{
              width: '6vh',
              height: '6vh',
              background: '#fbbf24',
              borderRadius: '1.2vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <Trophy style={{ width: '4vh', height: '4vh', color: '#78350f' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '4.5vh', fontWeight: '900', color: '#111827', margin: 0, lineHeight: '1' }}>
                TOP 5
              </h2>
              <p style={{ fontSize: '1.8vh', fontWeight: '700', color: '#4b5563', margin: '0.8vh 0 0 0' }}>
                Msg 0.5 • ❤️ 2 • 🔥 1.5 • 👍 1 • 😂 0.5
              </p>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {leaderboard.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <Trophy style={{ width: '10vh', height: '10vh', color: '#d1d5db', margin: '0 auto 2vh' }} />
                  <p style={{ fontSize: '3vh', color: '#9ca3af', fontWeight: '700' }}>Nessun dato</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                {leaderboard.map((entry, index) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const bgColors = [
                    'linear-gradient(90deg, #fbbf24 0%, #f97316 100%)',
                    'linear-gradient(90deg, #d1d5db 0%, #9ca3af 100%)',
                    'linear-gradient(90deg, #fb923c 0%, #ef4444 100%)',
                    'linear-gradient(90deg, #bfdbfe 0%, #93c5fd 100%)',
                    'linear-gradient(90deg, #bfdbfe 0%, #93c5fd 100%)'
                  ];
                  const borderColors = ['#f59e0b', '#6b7280', '#ea580c', '#60a5fa', '#60a5fa'];

                  return (
                    <div
                      key={entry.tableId}
                      style={{
                        background: bgColors[index],
                        borderRadius: '1.5vh',
                        padding: '2vh 1.5vw',
                        border: `5px solid ${borderColors[index]}`,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5vw',
                        animation: `slideIn 0.6s ease-out ${index * 0.1}s both`
                      }}
                    >
                      <div style={{
                        width: '7vh',
                        height: '7vh',
                        background: '#111827',
                        borderRadius: '1.2vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '4.5vh',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        flexShrink: 0
                      }}>
                        {medals[index] || `${index + 1}`}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '3.8vh', fontWeight: '900', color: '#111827', lineHeight: '1' }}>
                          T.{entry.tableId}
                        </div>
                      </div>

                      <div style={{ fontSize: '6vh', fontWeight: '900', color: '#111827', flexShrink: 0, lineHeight: '1' }}>
                        {entry.points}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLONNA CENTRO: SFIDE */}
        <div style={{
          background: 'white',
          borderRadius: '2vh',
          padding: '2vh 1.8vw',
          border: '5px solid #f59e0b',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5vw',
            marginBottom: '2.5vh',
            paddingBottom: '2vh',
            borderBottom: '4px solid #f59e0b'
          }}>
            <div style={{
              width: '6vh',
              height: '6vh',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '1.2vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <Trophy style={{ width: '4vh', height: '4vh', color: 'white' }} />
            </div>
            <h2 style={{ fontSize: '4.5vh', fontWeight: '900', color: '#111827', margin: 0, lineHeight: '1' }}>
              SFIDE ATTIVE
            </h2>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {challenges.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <Trophy style={{ width: '10vh', height: '10vh', color: '#d1d5db', margin: '0 auto 2vh' }} />
                  <p style={{ fontSize: '3vh', color: '#9ca3af', fontWeight: '700' }}>Nessuna sfida attiva</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                {challenges.map((challenge, index) => {
                  const now = new Date();
                  const endsAt = new Date(challenge.endsAt);
                  const timeLeft = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));
                  const minutesLeft = Math.floor(timeLeft / 60);
                  const secondsLeft = timeLeft % 60;

                  return (
                    <div
                      key={challenge.id}
                      style={{
                        background: 'linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '1.5vh',
                        padding: '2.5vh 1.8vw',
                        border: '4px solid #fbbf24',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                        animation: `pulse 2s ease-in-out ${index * 0.2}s infinite`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', marginBottom: '1.5vh' }}>
                        <div style={{
                          padding: '0.8vh 1.2vw',
                          background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                          borderRadius: '1vh',
                          color: 'white',
                          fontSize: '1.6vh',
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.8vw'
                        }}>
                          <Trophy style={{ width: '2vh', height: '2vh' }} />
                          SFIDA
                        </div>
                        <span style={{
                          fontSize: '1.6vh',
                          fontWeight: '900',
                          color: '#dc2626',
                          background: '#fee2e2',
                          padding: '0.5vh 1vw',
                          borderRadius: '0.8vh'
                        }}>
                          ⏱️ {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '2.8vh', lineHeight: '1.3', color: '#111827', fontWeight: '900', margin: '0 0 1vh 0' }}>
                        {challenge.badgeEmoji} {challenge.title}
                      </h3>
                      {challenge.description && (
                        <p style={{ fontSize: '2vh', lineHeight: '1.4', color: '#374151', fontWeight: '600', margin: 0 }}>
                          {challenge.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLONNA DESTRA: ANNUNCI */}
        <div style={{
          background: 'white',
          borderRadius: '2vh',
          padding: '2vh 1.8vw',
          border: '5px solid #a855f7',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100%'
        }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5vw',
              marginBottom: '2.5vh',
              paddingBottom: '2vh',
              borderBottom: '4px solid #a855f7'
            }}>
              <div style={{
                width: '6vh',
                height: '6vh',
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                borderRadius: '1.2vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                <Radio style={{ width: '4vh', height: '4vh', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '4vh', fontWeight: '900', color: '#111827', margin: 0, lineHeight: '1' }}>
                  ANNUNCI
                </h2>
                <p style={{ fontSize: '1.6vh', fontWeight: '700', color: '#6b7280', margin: '0.8vh 0 0 0' }}>
                  Dalla direzione
                </p>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              {broadcasts.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Radio style={{ width: '8vh', height: '8vh', color: '#d1d5db', margin: '0 auto 1.5vh' }} />
                    <p style={{ fontSize: '2.5vh', color: '#9ca3af', fontWeight: '700' }}>Nessun annuncio</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
                  {/* Broadcast Messages */}
                  {broadcasts.map((broadcast, index) => (
                    <div
                      key={broadcast.id}
                      style={{
                        background: 'linear-gradient(90deg, #f3e8ff 0%, #fce7f3 100%)',
                        borderRadius: '1.5vh',
                        padding: '2.5vh 1.8vw',
                        border: '4px solid #d8b4fe',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
                        animation: `pulse 2s ease-in-out ${index * 0.2}s infinite`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1vw', marginBottom: '1.5vh' }}>
                        <div style={{
                          padding: '0.8vh 1.2vw',
                          background: 'white',
                          borderRadius: '1vh',
                          color: '#111827',
                          fontSize: '1.6vh',
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.8vw',
                          border: '2px solid #9333ea'
                        }}>
                          <Radio style={{ width: '2vh', height: '2vh', color: '#9333ea' }} />
                          AMMINISTRAZIONE
                        </div>
                        <span style={{ fontSize: '1.5vh', fontWeight: '700', color: '#6b7280' }}>
                          {formatTime(broadcast.timestamp)}
                        </span>
                      </div>
                      <p style={{ fontSize: '2.5vh', lineHeight: '1.5', color: '#111827', fontWeight: '700', margin: 0 }}>
                        {broadcast.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      <style>{`
        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateX(-30px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes ping {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
