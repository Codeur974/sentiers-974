/**
 * Fetch avec timeout intelligent
 * Évite le freeze de l'app quand on passe du WiFi au 5G
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // en millisecondes
}

/**
 * Wrapper fetch avec timeout pour éviter les blocages réseau
 * @param url URL à fetcher
 * @param options Options fetch + timeout
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 3000, ...fetchOptions } = options; // 3s par défaut (au lieu de 30s)

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Timeout spécifique
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout après ${timeout}ms - Vérifiez votre connexion réseau`);
    }

    // Autres erreurs réseau
    throw error;
  }
}

/**
 * Vérifie si on est sur WiFi local (192.168.x.x accessible)
 * Utile pour détecter si le backend local est accessible
 */
export async function isLocalNetworkAvailable(backendUrl: string): Promise<boolean> {
  try {
    // Ping rapide (500ms max)
    const response = await fetchWithTimeout(backendUrl, {
      method: 'HEAD',
      timeout: 500,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch avec fallback automatique local/distant
 * Essaye MongoDB d'abord, puis fallback sur données locales si timeout
 */
export async function fetchWithFallback<T>(
  url: string,
  options: FetchWithTimeoutOptions = {},
  fallbackData?: T
): Promise<T> {
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      timeout: options.timeout || 3000, // 3s max par défaut
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.log(`⚠️ Fetch failed, using fallback:`, error);

    if (fallbackData !== undefined) {
      return fallbackData;
    }

    throw error;
  }
}
