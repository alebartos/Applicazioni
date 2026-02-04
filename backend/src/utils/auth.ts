import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash una password usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica una password confrontandola con l'hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Valida la robustezza di una password
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password richiesta' };
    }

    if (password.length < 6) {
        return { valid: false, error: 'Password deve essere di almeno 6 caratteri' };
    }

    if (password.length > 100) {
        return { valid: false, error: 'Password troppo lunga (max 100 caratteri)' };
    }

    return { valid: true };
}

/**
 * Valida un codice tavolo
 */
export function validateTableCode(code: string): { valid: boolean; error?: string } {
    if (!code || typeof code !== 'string') {
        return { valid: false, error: 'Codice tavolo richiesto' };
    }

    const trimmedCode = code.trim();

    if (trimmedCode.length === 0) {
        return { valid: false, error: 'Codice tavolo non può essere vuoto' };
    }

    if (trimmedCode.length > 10) {
        return { valid: false, error: 'Codice tavolo troppo lungo (max 10 caratteri)' };
    }

    // Solo caratteri alfanumerici
    if (!/^[A-Z0-9]+$/i.test(trimmedCode)) {
        return { valid: false, error: 'Codice tavolo può contenere solo lettere e numeri' };
    }

    return { valid: true };
}

/**
 * Sanitizza input testuale
 */
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Rimuove < e >
        .substring(0, 100); // Lunghezza massima
}
