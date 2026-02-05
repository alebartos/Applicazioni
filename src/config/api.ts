/**
 * Configurazione API
 *
 * Questo file centralizza la configurazione per le chiamate API.
 * Cambia USE_LOCAL_BACKEND per passare da Supabase al backend locale.
 */

// ============================================
// CONFIGURAZIONE - MODIFICA QUI
// ============================================
/**
 * Configurazione API
 *
 * Questo file centralizza la configurazione per le chiamate API al backend Express.
 */

// ============================================
// CONFIGURAZIONE
// ============================================

// Rileva se siamo in produzione (Docker) o sviluppo
const IS_PRODUCTION = import.meta.env.PROD;

// Backend Express
// - In sviluppo: http://localhost:3001/api
// - In produzione (Docker): /api (proxy nginx)
const BACKEND_URL = IS_PRODUCTION ? '/api' : 'http://localhost:3001/api';

// ============================================
// ESPORTAZIONI
// ============================================

export const API_CONFIG = {
  // URL base per le API
  baseUrl: BACKEND_URL,

  // Headers di default per le richieste
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Helper per costruire URL API completi
 */
export function apiUrl(endpoint: string): string {
  // Rimuovi slash iniziale se presente
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.baseUrl}/${cleanEndpoint}`;
}

/**
 * Helper per fetch con configurazione automatica
 */
export async function apiFetch(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
  const url = apiUrl(endpoint);

  return fetch(url, {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers
    }
  });
}

// true = usa backend locale (Express)
// false = usa Supabase (originale)
const USE_LOCAL_BACKEND = true;

// Rileva se siamo in produzione (Docker) o sviluppo
const IS_PRODUCTION = import.meta.env.PROD;

// Backend locale
// - In sviluppo: http://localhost:3001/api
// - In produzione (Docker): /api (proxy nginx)
const LOCAL_BACKEND_URL = IS_PRODUCTION ? '/api' : 'http://localhost:3001/api';

// Supabase (originale)
const SUPABASE_PROJECT_ID = 'iwyshloivkvsnbqvobtu';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3eXNobG9pdmt2c25icXZvYnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NTkyOTMsImV4cCI6MjA3MzQzNTI5M30.08dhmUUe1k0OK2XBx3M1zDU5FicBf4ggzJcDirHN1GI';
const SUPABASE_FUNCTION_PATH = 'make-server-09febf9d';

// ============================================
// ESPORTAZIONI - NON MODIFICARE
// ============================================

export const API_CONFIG = {
  useLocalBackend: USE_LOCAL_BACKEND,

  // URL base per le API
  baseUrl: USE_LOCAL_BACKEND
    ? LOCAL_BACKEND_URL
    : `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${SUPABASE_FUNCTION_PATH}`,

  // Headers per le richieste
  headers: USE_LOCAL_BACKEND
    ? { 'Content-Type': 'application/json' }
    : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
};

/**
 * Helper per costruire URL API
 */
export function apiUrl(endpoint: string): string {
  // Rimuovi slash iniziale se presente
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.baseUrl}/${cleanEndpoint}`;
}

/**
 * Helper per fetch con configurazione automatica
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = apiUrl(endpoint);

  return fetch(url, {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers
    }
  });
}
