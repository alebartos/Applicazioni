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
