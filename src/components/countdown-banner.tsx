import { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { Button } from './ui/button';

interface CountdownBannerProps {
  countdown: {
    active: boolean;
    endsAt?: string;
    message?: string;
  };
}

export function CountdownBanner({ countdown }: CountdownBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!countdown.active || !countdown.endsAt || dismissed) {
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(countdown.endsAt!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Tempo scaduto!');
        return;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [countdown, dismissed]);

  if (!countdown.active || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Clock className="w-5 h-5 animate-pulse" />
          <div>
            <p className="font-semibold text-sm sm:text-base">{countdown.message || 'Tempo rimanente'}</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-wider">{timeLeft}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="text-white hover:bg-white/20 shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
