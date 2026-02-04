/**
 * Interfaccia per i permessi dello staff
 */
export interface StaffPermissions {
    manage_tables: boolean;       // Gestione codici tavolo
    view_users: boolean;           // Visualizza utenti connessi
    view_messages: boolean;        // Visualizza tutti i messaggi
    send_broadcast: boolean;       // Invia messaggi broadcast
    manage_countdown: boolean;     // Gestione timer
    view_leaderboard: boolean;     // Visualizza classifica
    manage_challenges: boolean;    // Gestione sfide
    manage_tv: boolean;            // Controllo TV display
    manage_game_state: boolean;    // Controllo stato gioco (start/pause/end)
}

/**
 * Permessi di default per nuovo staff (solo visualizzazione)
 */
export const DEFAULT_PERMISSIONS: StaffPermissions = {
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

/**
 * Parsing sicuro dei permessi da JSON
 */
export function parsePermissions(permissionsJson: string): StaffPermissions {
    try {
        const parsed = JSON.parse(permissionsJson);
        // Merge con default per assicurare tutti i campi
        return { ...DEFAULT_PERMISSIONS, ...parsed };
    } catch (error) {
        console.error('Error parsing permissions:', error);
        return DEFAULT_PERMISSIONS;
    }
}

/**
 * Serializza permessi in JSON string
 */
export function serializePermissions(permissions: Partial<StaffPermissions>): string {
    const fullPermissions = { ...DEFAULT_PERMISSIONS, ...permissions };
    return JSON.stringify(fullPermissions);
}

/**
 * Controlla se un utente ha un permesso specifico
 */
export function hasPermission(
    permissions: StaffPermissions,
    permission: keyof StaffPermissions
): boolean {
    return permissions[permission] === true;
}

/**
 * Valida che i permessi siano validi
 */
export function validatePermissions(permissions: unknown): { valid: boolean; error?: string } {
    if (typeof permissions !== 'object' || permissions === null) {
        return { valid: false, error: 'Permessi devono essere un oggetto' };
    }

    const validKeys = Object.keys(DEFAULT_PERMISSIONS);

    for (const key in permissions) {
        if (!validKeys.includes(key)) {
            return { valid: false, error: `Permesso non valido: ${key}` };
        }

        const value = (permissions as any)[key];
        if (typeof value !== 'boolean') {
            return { valid: false, error: `Valore permesso deve essere boolean: ${key}` };
        }
    }

    return { valid: true };
}

/**
 * Nomi user-friendly dei permessi (per UI)
 */
export const PERMISSION_LABELS: Record<keyof StaffPermissions, string> = {
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
