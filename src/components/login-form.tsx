import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Users, Lock, User } from "lucide-react";
import { PaperPlaneLoading } from "./paper-plane-loading";
import logoImage from "figma:asset/61ee33e759d51e4543a7ff86753e250797659b2b.png";
import { buildApiUrl, getApiHeaders } from '../utils/api-helper';

interface LoginFormProps {
  onLogin: (data: {
    firstName: string;
    lastName: string;
    tableCode: string;
    tableNumber: number;
    adminPassword?: string;
  }) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tableCode, setTableCode] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validateTableCode = async (code: string): Promise<{ valid: boolean; tableNumber?: string; error?: string }> => {
    try {
      const response = await fetch(buildApiUrl('validate-table-code'), {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ tableCode: code })
      });

      const data = await response.json();

      if (!response.ok) {
        return { valid: false, error: data.error || 'Errore nella validazione del codice' };
      }

      return { valid: data.valid, tableNumber: data.tableNumber };
    } catch (error) {
      console.error('Error validating table code:', error);
      return { valid: false, error: 'Errore di connessione al server' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validation
    if (!firstName.trim() || !lastName.trim() || !tableCode.trim()) {
      setError("Tutti i campi sono obbligatori");
      setIsLoading(false);
      return;
    }

    // Check if attempting admin login
    const isAdminAttempt = tableCode.toUpperCase() === '001';

    if (isAdminAttempt) {
      // Admin login - passa la password al server per validazione
      if (!adminPassword.trim()) {
        setError("Password admin richiesta");
        setIsLoading(false);
        return;
      }

      onLogin({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tableCode: tableCode.toUpperCase(),
        tableNumber: 0, // Special value for admin
        adminPassword: adminPassword.trim()
      });
      setIsLoading(false);
      return;
    }

    // Regular user - validate table code with backend
    const validation = await validateTableCode(tableCode.toUpperCase());
    
    if (!validation.valid) {
      setError(validation.error || "Codice tavolo non valido");
      setIsLoading(false);
      return;
    }

    // Login successful
    onLogin({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      tableCode: tableCode.toUpperCase(),
      tableNumber: validation.tableNumber!
    });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-accent flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-2 rounded-full shadow-md">
              <img src={logoImage} alt="Messenger Game" className="w-16 h-16" />
            </div>
          </div>
          <CardTitle className="text-3xl text-primary">
            Messenger Game
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Inserisci i tuoi dati per accedere al tavolo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Inserisci il tuo nome"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cognome
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Inserisci il tuo cognome"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tableCode" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Codice Tavolo
                </Label>
                <Input
                  id="tableCode"
                  type="text"
                  placeholder="Inserisci il codice fornito"
                  value={tableCode}
                  onChange={(e) => setTableCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/50 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Il codice tavolo è fornito dal personale del locale
                </p>
              </div>

              {/* Campo Password Admin - visibile solo se codice tavolo è 001 */}
              {tableCode.toUpperCase() === '001' && (
                <div className="space-y-2 border-2 border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                  <Label htmlFor="adminPassword" className="flex items-center gap-2 text-yellow-900">
                    <Lock className="w-4 h-4" />
                    Password Admin
                  </Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Inserisci password admin"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    disabled={isLoading}
                    className="transition-all duration-200 focus:ring-2 focus:ring-yellow-500/50"
                  />
                  <p className="text-xs text-yellow-800">
                    ⚠️ Password richiesta per accesso amministratore
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button 
              type="submit"
              disabled={isLoading || !firstName.trim() || !lastName.trim() || !tableCode.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <PaperPlaneLoading />
                  Accesso in corso...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Accedi al Tavolo
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Il codice tavolo viene fornito dal personale del locale per ogni sessione di gioco
              </p>
              <p className="text-xs text-muted-foreground/70">
                Per accesso admin utilizzare le credenziali fornite dal sistema
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}