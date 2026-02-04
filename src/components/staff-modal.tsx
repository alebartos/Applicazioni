import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { User, Lock, Hash, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { buildApiUrl, getApiHeaders } from '../config/api';

interface StaffPermissions {
    manage_tables: boolean;
    view_users: boolean;
    view_messages: boolean;
    send_broadcast: boolean;
    manage_countdown: boolean;
    view_leaderboard: boolean;
    manage_challenges: boolean;
    manage_tv: boolean;
    manage_game_state: boolean;
}

const PERMISSION_LABELS: Record<keyof StaffPermissions, string> = {
    manage_tables: 'Gestione Tavoli',
    view_users: 'Visualizza Utenti',
    view_messages: 'Visualizza Messaggi',
    send_broadcast: 'Invia Broadcast',
    manage_countdown: 'Gestione Countdown',
    view_leaderboard: 'Visualizza Classifica',
    manage_challenges: 'Gestione Sfide',
    manage_tv: 'Controllo TV Display',
    manage_game_state: 'Controllo Stato Gioco',
};

const DEFAULT_PERMISSIONS: StaffPermissions = {
    manage_tables: false,
    view_users: true,
    view_messages: true,
    send_broadcast: false,
    manage_countdown: false,
    view_leaderboard: true,
    manage_challenges: false,
    manage_tv: false,
    manage_game_state: false,
};

interface StaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingStaff?: {
        id: number;
        firstName: string;
        lastName: string;
        tableCode: string;
        permissions: StaffPermissions;
        isActive: boolean;
    } | null;
}

export default function StaffModal({ isOpen, onClose, onSuccess, editingStaff }: StaffModalProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [tableCode, setTableCode] = useState('');
    const [password, setPassword] = useState('');
    const [permissions, setPermissions] = useState<StaffPermissions>(DEFAULT_PERMISSIONS);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Load editing data
    useEffect(() => {
        if (editingStaff) {
            setFirstName(editingStaff.firstName);
            setLastName(editingStaff.lastName);
            setTableCode(editingStaff.tableCode);
            setPermissions(editingStaff.permissions);
            setPassword(''); // Don't load password
        } else {
            // Reset form for new staff
            setFirstName('');
            setLastName('');
            setTableCode('');
            setPassword('');
            setPermissions(DEFAULT_PERMISSIONS);
        }
        setError('');
    }, [editingStaff, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validation
        if (!firstName.trim() || !lastName.trim() || !tableCode.trim()) {
            setError('Nome, cognome e codice tavolo sono obbligatori');
            setIsLoading(false);
            return;
        }

        if (!editingStaff && !password.trim()) {
            setError('Password richiesta per nuovo staff');
            setIsLoading(false);
            return;
        }

        if (password && password.length < 6) {
            setError('Password deve essere almeno 6 caratteri');
            setIsLoading(false);
            return;
        }

        try {
            const url = editingStaff
                ? buildApiUrl(`staff/${editingStaff.id}`)
                : buildApiUrl('staff');

            const method = editingStaff ? 'PUT' : 'POST';

            const body: any = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                tableCode: tableCode.toUpperCase().trim(),
                permissions
            };

            if (password.trim()) {
                body.password = password;
            }

            const response = await fetch(url, {
                method,
                headers: getApiHeaders(),
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Errore durante il salvataggio');
                setIsLoading(false);
                return;
            }

            toast.success(
                editingStaff
                    ? 'Membro staff aggiornato con successo'
                    : 'Membro staff creato con successo'
            );

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving staff:', error);
            setError('Errore di connessione');
            setIsLoading(false);
        }
    };

    const togglePermission = (key: keyof StaffPermissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {editingStaff ? 'Modifica Membro Staff' : 'Aggiungi Nuovo Staff'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingStaff
                            ? 'Modifica i dettagli e i permessi del membro staff'
                            : 'Crea un nuovo membro staff con credenziali e permessi personalizzati'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName" className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Nome
                            </Label>
                            <Input
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={isLoading}
                                placeholder="Nome"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName" className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Cognome
                            </Label>
                            <Input
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={isLoading}
                                placeholder="Cognome"
                            />
                        </div>
                    </div>

                    {/* Table Code */}
                    <div className="space-y-2">
                        <Label htmlFor="tableCode" className="flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            Codice Tavolo Staff
                        </Label>
                        <Input
                            id="tableCode"
                            value={tableCode}
                            onChange={(e) => setTableCode(e.target.value.toUpperCase())}
                            disabled={isLoading}
                            placeholder="es. STAFF1"
                            className="font-mono"
                            maxLength={10}
                        />
                        <p className="text-xs text-muted-foreground">
                            Codice unico per questo membro staff (max 10 caratteri)
                        </p>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Password {editingStaff && '(lascia vuoto per non modificare)'}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            placeholder={editingStaff ? 'Nuova password (opzionale)' : 'Password (min 6 caratteri)'}
                        />
                    </div>

                    {/* Permissions */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Permessi</Label>
                        <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg">
                            {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                <div key={key} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`perm-${key}`}
                                        checked={permissions[key as keyof StaffPermissions]}
                                        onCheckedChange={() => togglePermission(key as keyof StaffPermissions)}
                                        disabled={isLoading}
                                    />
                                    <Label
                                        htmlFor={`perm-${key}`}
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        {label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Seleziona i permessi che questo staff avrà nella dashboard admin
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isLoading ? 'Salvataggio...' : (editingStaff ? 'Aggiorna' : 'Crea Staff')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Annulla
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
