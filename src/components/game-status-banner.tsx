import { Badge } from './ui/badge';
import { Clock, Play, Pause, Square } from 'lucide-react';

interface GameStatusBannerProps {
  status: 'not_started' | 'active' | 'paused' | 'ended';
  startedAt?: string;
  pausedAt?: string;
}

export function GameStatusBanner({ status, startedAt, pausedAt }: GameStatusBannerProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'not_started':
        return {
          icon: <Clock className="w-4 h-4" />,
          text: 'Gioco non iniziato',
          description: 'In attesa che l\'admin avvii il gioco',
          variant: 'secondary' as const,
          bgColor: 'bg-muted/50'
        };
      case 'active':
        return {
          icon: <Play className="w-4 h-4" />,
          text: 'Gioco in corso',
          description: startedAt ? `Iniziato: ${new Date(startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : '',
          variant: 'default' as const,
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'paused':
        return {
          icon: <Pause className="w-4 h-4" />,
          text: 'Gioco in pausa',
          description: pausedAt ? `Pausa: ${new Date(pausedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : '',
          variant: 'secondary' as const,
          bgColor: 'bg-yellow-50 border-yellow-200'
        };
      case 'ended':
        return {
          icon: <Square className="w-4 h-4" />,
          text: 'Gioco terminato',
          description: 'Il gioco è stato concluso dall\'admin',
          variant: 'destructive' as const,
          bgColor: 'bg-red-50 border-red-200'
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          text: 'Stato sconosciuto',
          description: '',
          variant: 'secondary' as const,
          bgColor: 'bg-muted/50'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`w-full p-4 border rounded-lg ${config.bgColor} transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={config.variant} className="flex items-center gap-2">
            {config.icon}
            {config.text}
          </Badge>
          {config.description && (
            <span className="text-sm text-muted-foreground">
              {config.description}
            </span>
          )}
        </div>
        {status === 'active' && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">Live</span>
          </div>
        )}
      </div>
      
      {status !== 'active' && (
        <div className="mt-2 text-sm text-muted-foreground">
          {status === 'not_started' && 'Non puoi inviare messaggi finché il gioco non inizia.'}
          {status === 'paused' && 'L\'invio di messaggi è temporaneamente sospeso.'}
          {status === 'ended' && 'Non è più possibile inviare messaggi.'}
        </div>
      )}
    </div>
  );
}