import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { GameStatusBanner } from "./game-status-banner";
import { Send, ArrowLeft } from "lucide-react";
import { PaperPlaneLoading } from "./paper-plane-loading";
import logoImage from "figma:asset/61ee33e759d51e4543a7ff86753e250797659b2b.png";

interface ComposeMessageProps {
  currentTable: string;
  userFirstName: string;
  gameStatus: { status: string; startedAt?: string; pausedAt?: string };
  availableTables: string[]; // Lista dinamica dei tavoli disponibili (A1, B2, DJ, etc.)
  onSendMessage: (message: {
    content: string;
    toTable: string;
    senderName?: string;
    isAnonymous: boolean;
  }) => void;
  onBack: () => void;
}

export function ComposeMessage({ currentTable, userFirstName, gameStatus, availableTables, onSendMessage, onBack }: ComposeMessageProps) {
  const [content, setContent] = useState("");
  const [toTable, setToTable] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Filtra solo i tavoli diversi dal tavolo corrente
  const tables = availableTables.filter(t => t !== currentTable);

  const handleSend = async () => {
    // Previeni doppio invio
    if (!content.trim() || !toTable || isSending) return;

    setIsSending(true);

    try {
      // Chiama la funzione di invio (aspetta la risposta vera)
      await onSendMessage({
        content: content.trim(),
        toTable: toTable, // Ora è alfanumerico (A1, B2, DJ, etc.)
        senderName: isAnonymous ? undefined : userFirstName,
        isAnonymous
      });

      // Reset form solo dopo successo
      setContent("");
      setToTable("");
      setIsAnonymous(true);
    } catch (error) {
      console.error('Errore durante invio:', error);
      // L'errore è già gestito in App.tsx con toast
    } finally {
      setIsSending(false);
    }
  };

  const isGameActive = gameStatus.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-accent p-4">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-4 hover:bg-card/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Dashboard
        </Button>

        {/* Game Status */}
        <div className="mb-6">
          <GameStatusBanner 
            status={gameStatus.status as 'not_started' | 'active' | 'paused' | 'ended'}
            startedAt={gameStatus.startedAt}
            pausedAt={gameStatus.pausedAt}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="bg-white p-1 rounded-full shadow-sm">
                <img src={logoImage} alt="Messenger Game" className="w-6 h-6" />
              </div>
              Scrivi un Messaggio
            </CardTitle>
            <CardDescription>
              Dal Tavolo {currentTable} - Invia un messaggio a un altro tavolo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="toTable">Tavolo destinatario</Label>
              <Select value={toTable} onValueChange={setToTable} disabled={!isGameActive}>
                <SelectTrigger className="disabled:opacity-50">
                  <SelectValue placeholder="Seleziona il tavolo destinatario" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table.toString()}>
                      Tavolo {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Modalità messaggio</Label>
                  <p className="text-sm text-muted-foreground">
                    {isAnonymous ? "Il messaggio sarà anonimo" : `Il messaggio mostrerà "${userFirstName}"`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="anonymous-mode">Anonimo</Label>
                  <Switch
                    id="anonymous-mode"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                    disabled={!isGameActive}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Il tuo messaggio</Label>
              <Textarea
                id="message"
                placeholder={isGameActive ? "Scrivi qui il tuo messaggio..." : "Il gioco deve essere attivo per inviare messaggi"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!isGameActive}
                className="min-h-32 resize-none disabled:opacity-50"
                maxLength={500}
              />
              <p className="text-sm text-muted-foreground text-right">
                {content.length}/500 caratteri
              </p>
            </div>

            <Button 
              onClick={handleSend}
              disabled={!content.trim() || !toTable || isSending || !isGameActive}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              {isSending ? (
                <div className="flex items-center gap-2">
                  <PaperPlaneLoading />
                  Invio in corso...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Invia Messaggio
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}