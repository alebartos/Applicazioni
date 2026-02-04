import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Shield, User, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildApiUrl, getApiHeaders } from '../utils/api-helper';

interface AdminSetupProps {
    onSetupComplete: (adminData: {
        firstName: string;
        lastName: string;
        tableCode: string;
        tableNumber: number;
        isAdmin: boolean;
    }) => void;
}

export default function AdminSetup({ onSetupComplete }: AdminSetupProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Password strength indicator
    const getPasswordStrength = (pass: string): { label: string; color: string } => {
        if (pass.length === 0) return { label: '', color: '' };
        if (pass.length < 6) return { label: 'Debole', color: 'text-red-500' };
        if (pass.length < 10) return { label: 'Media', color: 'text-yellow-500' };
        return { label: 'Forte', color: 'text-green-500' };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validation
        if (!firstName.trim() || !lastName.trim()) {
            setError('Nome e cognome sono obbligatori');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password deve essere di almeno 6 caratteri');
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Le password non coincidono');
            setIsLoading(false);
            return;
        }

        try {
            // Create admin account
            const response = await fetch(buildApiUrl('admin/setup'), {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    password: password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Errore durante la creazione dell\'account');
                setIsLoading(false);
                return;
            }

            // Success!
            toast.success('Account admin creato con successo!', {
                description: `Codice admin: ${result.admin.secretTableCode}`
            });

            // Auto-login to admin dashboard
            onSetupComplete({
                firstName: result.admin.firstName,
                lastName: result.admin.lastName,
                tableCode: result.admin.secretTableCode,
                tableNumber: 0,
                isAdmin: true
            });

        } catch (error) {
            console.error('Setup error:', error);
            setError('Errore di connessione. Riprova.');
            setIsLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength(password);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Configurazione Admin</CardTitle>
                    <CardDescription className="text-base">
                        Benvenuto! Crea il tuo account amministratore per iniziare.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* First Name */}
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
                                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                                autoFocus
                            />
                        </div>

                        {/* Last Name */}
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
                                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Minimo 6 caratteri"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                            />
                            {password && (
                                <p className={`text-sm ${passwordStrength.color}`}>
                                    Sicurezza: {passwordStrength.label}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Conferma Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Ripeti la password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                            />
                            {confirmPassword && confirmPassword === password && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Le password coincidono
                                </p>
                            )}
                            {confirmPassword && confirmPassword !== password && (
                                <p className="text-sm text-red-600">
                                    Le password non coincidono
                                </p>
                            )}
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit button */}
                        <Button
                            type="submit"
                            className="w-full min-h-[44px] bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                            disabled={isLoading || !firstName.trim() || !lastName.trim() || !password || !confirmPassword}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Creazione account...
                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Crea Account Admin
                </span>
                            )}
                        </Button>

                        {/* Info box */}
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                                <strong>ℹ️ Nota:</strong> Riceverai un codice admin segreto (default: 001) che ti servirà per accedere.
                                Potrai cambiarlo successivamente nella sezione Profilo.
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
