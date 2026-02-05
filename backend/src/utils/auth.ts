import bcrypt from 'bcrypt';
import sanitizeHtml from 'sanitize-html';

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
 * Requisiti: min 8 caratteri, almeno una maiuscola, una minuscola, un numero
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password richiesta' };
    }

    if (password.length < 8) {
        return { valid: false, error: 'Password deve essere di almeno 8 caratteri' };
    }

    if (password.length > 100) {
        return { valid: false, error: 'Password troppo lunga (max 100 caratteri)' };
    }

    // Verifica complessità: almeno una maiuscola, una minuscola, un numero
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        return {
            valid: false,
            error: 'Password deve contenere almeno una maiuscola, una minuscola e un numero'
        };
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
 * Sanitizza input testuale rimuovendo completamente HTML e tag pericolosi
 * Usa sanitize-html per protezione completa contro XSS
 */
export function sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
        return '';
    }

    // Rimuove completamente tutti i tag HTML
    const sanitized = sanitizeHtml(input, {
        allowedTags: [], // Non permette NESSUN tag HTML
        allowedAttributes: {}, // Non permette attributi
        disallowedTagsMode: 'recursiveEscape' // Escape ricorsivo dei tag non permessi
    });

    return sanitized.trim().substring(0, 100); // Lunghezza massima
}

/**
 * Sanitizza contenuto messaggi (permette formattazione base sicura)
 */
export function sanitizeMessageContent(input: string): string {
    if (!input || typeof input !== 'string') {
        return '';
    }

    // Permette solo formattazione base sicura
    const sanitized = sanitizeHtml(input, {
        allowedTags: ['b', 'i', 'em', 'strong', 'br'], // Solo tag di formattazione base
        allowedAttributes: {}, // Nessun attributo permesso
        disallowedTagsMode: 'recursiveEscape'
    });

    return sanitized.trim().substring(0, 500); // Max 500 caratteri per messaggi
}
