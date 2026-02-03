import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Mail, User, Clock, Heart, ThumbsUp, Flame, Laugh } from "lucide-react";
import { buildApiUrl, getApiHeaders } from '../utils/api-helper';

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

interface MessageCardProps {
  message: Message;
  currentTable?: string;
  onReactionAdded?: () => void;
}

export function MessageCard({ message, currentTable, onReactionAdded }: MessageCardProps) {
  const [reactions, setReactions] = useState(message.reactions || { heart: 0, thumbsup: 0, fire: 0, laugh: 0 });
  const [userReaction, setUserReaction] = useState<string | null>(null);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReaction = async (reactionType: 'heart' | 'thumbsup' | 'fire' | 'laugh') => {
    if (!currentTable) return;

    try {
      const response = await fetch(
        buildApiUrl('add-reaction'),
        {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            messageId: message.id,
            reaction: reactionType,
            tableNumber: currentTable
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReactions(data.reactions);
        setUserReaction(data.userReaction);
        onReactionAdded?.();
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const reactionButtons = [
    { type: 'heart' as const, icon: Heart, color: 'text-red-500', label: '❤️' },
    { type: 'thumbsup' as const, icon: ThumbsUp, color: 'text-blue-500', label: '👍' },
    { type: 'fire' as const, icon: Flame, color: 'text-orange-500', label: '🔥' },
    { type: 'laugh' as const, icon: Laugh, color: 'text-yellow-500', label: '😂' },
  ];

  return (
    <Card className="mb-4 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            {message.isBroadcast ? (
              <Badge variant="outline" className="bg-white text-black border-2 border-purple-500 font-bold">
                📢 Amministrazione
              </Badge>
            ) : message.isAnonymous ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-secondary/60">
                  <User className="w-3 h-3 mr-1" />
                  Anonimo
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Da Tavolo {message.fromTable}
                </span>
              </div>
            ) : (
              <Badge variant="default" className="bg-primary text-primary-foreground">
                <User className="w-3 h-3 mr-1" />
                {message.publicSenderName || `Tavolo ${message.fromTable}`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatTime(message.timestamp)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-lg leading-relaxed">{message.content}</p>

        {/* Reactions */}
        {currentTable && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {reactionButtons.map(({ type, icon: Icon, color, label }) => {
              const isSelected = userReaction === type;
              const hasReactions = reactions[type] > 0;

              return (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(type)}
                  className={`h-8 px-2 transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-2 border-primary scale-110'
                      : hasReactions
                        ? 'bg-secondary'
                        : ''
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : color} mr-1`} />
                  <span className="text-xs font-semibold">{reactions[type] || 0}</span>
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}