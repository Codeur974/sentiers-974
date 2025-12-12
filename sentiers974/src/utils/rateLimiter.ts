/**
 * Système de rate limiting pour prévenir les abus et attaques
 * Limite le nombre de requêtes par action et par période de temps
 */

interface RateLimitConfig {
  maxAttempts: number;      // Nombre maximum de tentatives
  windowMs: number;         // Fenêtre de temps en millisecondes
  blockDurationMs?: number; // Durée de blocage après dépassement (optionnel)
}

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Configure un rate limit pour une action spécifique
   */
  configure(action: string, config: RateLimitConfig): void {
    this.configs.set(action, config);
  }

  /**
   * Vérifie si une action est autorisée
   * @returns { allowed: boolean, remainingAttempts: number, resetIn: number }
   */
  check(action: string, identifier?: string): {
    allowed: boolean;
    remainingAttempts: number;
    resetIn: number;
    error?: string;
  } {
    const config = this.configs.get(action);
    if (!config) {
      throw new Error(`Rate limit non configuré pour l'action: ${action}`);
    }

    const key = identifier ? `${action}:${identifier}` : action;
    const now = Date.now();
    const entry = this.storage.get(key);

    // Pas d'entrée existante = première tentative
    if (!entry) {
      return {
        allowed: true,
        remainingAttempts: config.maxAttempts - 1,
        resetIn: config.windowMs
      };
    }

    // Vérifier si bloqué
    if (entry.blockedUntil && now < entry.blockedUntil) {
      const remainingMs = entry.blockedUntil - now;
      return {
        allowed: false,
        remainingAttempts: 0,
        resetIn: remainingMs,
        error: `Trop de tentatives. Réessayez dans ${Math.ceil(remainingMs / 1000)} secondes.`
      };
    }

    // Vérifier si la fenêtre de temps est expirée
    const timeSinceFirst = now - entry.firstAttempt;
    if (timeSinceFirst > config.windowMs) {
      // Reset la fenêtre
      return {
        allowed: true,
        remainingAttempts: config.maxAttempts - 1,
        resetIn: config.windowMs
      };
    }

    // Vérifier si le nombre maximum est atteint
    if (entry.count >= config.maxAttempts) {
      const remainingMs = config.windowMs - timeSinceFirst;
      return {
        allowed: false,
        remainingAttempts: 0,
        resetIn: remainingMs,
        error: `Trop de tentatives. Réessayez dans ${Math.ceil(remainingMs / 1000)} secondes.`
      };
    }

    // Tentative autorisée
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - entry.count - 1,
      resetIn: config.windowMs - timeSinceFirst
    };
  }

  /**
   * Enregistre une tentative
   */
  record(action: string, identifier?: string): void {
    const config = this.configs.get(action);
    if (!config) {
      throw new Error(`Rate limit non configuré pour l'action: ${action}`);
    }

    const key = identifier ? `${action}:${identifier}` : action;
    const now = Date.now();
    const entry = this.storage.get(key);

    if (!entry) {
      // Première tentative
      this.storage.set(key, {
        count: 1,
        firstAttempt: now
      });
      return;
    }

    // Vérifier si la fenêtre est expirée
    const timeSinceFirst = now - entry.firstAttempt;
    if (timeSinceFirst > config.windowMs) {
      // Reset
      this.storage.set(key, {
        count: 1,
        firstAttempt: now
      });
      return;
    }

    // Incrémenter le compteur
    entry.count++;

    // Si dépassement + blockDuration configuré, bloquer
    if (entry.count > config.maxAttempts && config.blockDurationMs) {
      entry.blockedUntil = now + config.blockDurationMs;
    }

    this.storage.set(key, entry);
  }

  /**
   * Reset les tentatives pour une action
   */
  reset(action: string, identifier?: string): void {
    const key = identifier ? `${action}:${identifier}` : action;
    this.storage.delete(key);
  }

  /**
   * Nettoie les entrées expirées (à appeler périodiquement)
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.storage.forEach((entry, key) => {
      const action = key.split(':')[0];
      const config = this.configs.get(action);

      if (!config) {
        keysToDelete.push(key);
        return;
      }

      // Supprimer si expiré
      const timeSinceFirst = now - entry.firstAttempt;
      const isExpired = timeSinceFirst > config.windowMs + (config.blockDurationMs || 0);

      if (isExpired && (!entry.blockedUntil || now > entry.blockedUntil)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.storage.delete(key));
  }
}

// Instance singleton
const rateLimiter = new RateLimiter();

// Configuration des différentes actions
rateLimiter.configure('login', {
  maxAttempts: 5,           // 5 tentatives max
  windowMs: 15 * 60 * 1000, // dans une fenêtre de 15 minutes
  blockDurationMs: 5 * 60 * 1000 // bloquer 5 minutes après dépassement
});

rateLimiter.configure('signup', {
  maxAttempts: 3,           // 3 tentatives max
  windowMs: 60 * 60 * 1000, // dans 1 heure
  blockDurationMs: 30 * 60 * 1000 // bloquer 30 minutes
});

rateLimiter.configure('upload_image', {
  maxAttempts: 10,          // 10 uploads max
  windowMs: 60 * 1000,      // par minute
});

rateLimiter.configure('upload_multiple', {
  maxAttempts: 3,           // 3 uploads multiples max
  windowMs: 60 * 1000,      // par minute
});

rateLimiter.configure('create_poi', {
  maxAttempts: 20,          // 20 POI max
  windowMs: 60 * 1000,      // par minute
});

// Nettoyer toutes les 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

export default rateLimiter;
