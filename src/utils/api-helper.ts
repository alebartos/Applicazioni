/**
 * Utility per fetch con retry automatico e gestione errori
 */

import { API_CONFIG, apiUrl } from '../config/api';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Costruisce l'URL completo per un endpoint API
 * Usa la configurazione centralizzata (locale o Supabase)
 */
export function buildApiUrl(endpoint: string): string {
  return apiUrl(endpoint);
}

/**
 * Ottiene gli headers configurati per le chiamate API
 * Include automaticamente il JWT token se presente
 */
export function getApiHeaders(): Record<string, string> {
  const headers = { ...API_CONFIG.headers };

  // ✅ Aggiungi JWT token se presente in localStorage
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch con retry automatico in caso di errori di rete o server
 * @param url - URL da chiamare
 * @param options - Opzioni fetch standard
 * @param retries - Numero massimo di tentativi (default: 3)
 * @returns Response
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 3
): Promise<Response> {

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Se la richiesta ha successo, ritorna
      if (response.ok) {
        return response;
      }

      // Se errore 5xx (server error), riprova
      if (response.status >= 500 && attempt < retries - 1) {
        console.log(`Server error (${response.status}), retrying... (attempt ${attempt + 1}/${retries})`);
        await sleep(1000 * (attempt + 1)); // Backoff esponenziale: 1s, 2s, 3s
        continue;
      }

      // Altri errori (4xx), ritorna subito senza retry
      return response;

    } catch (error) {
      // Errore di rete (es. nessuna connessione)
      console.error(`Network error on attempt ${attempt + 1}/${retries}:`, error);

      if (attempt < retries - 1) {
        await sleep(1000 * (attempt + 1)); // Backoff esponenziale
        continue;
      }

      // Ultimo tentativo fallito, rilancia l'errore
      throw error;
    }
  }

  throw new Error('Max retries reached');
}

/**
 * Wrapper per chiamate API con gestione errori standard
 */
export async function apiCall<T>(
    url: string,
    options: RequestInit = {},
    errorMessage = 'Errore durante la richiesta'
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const response = await fetchWithRetry(url, options);

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
      return {
        success: false,
        error: errorData.error || `${errorMessage} (${response.status})`
      };
    }
  } catch (error) {
    console.error('API call error:', error);
    return {
      success: false,
      error: 'Errore di connessione. Verifica la tua rete.'
    };
  }
}
