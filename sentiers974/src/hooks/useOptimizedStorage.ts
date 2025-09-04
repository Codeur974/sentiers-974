import { useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

/**
 * Hook d'optimisation pour AsyncStorage avec cache en mémoire
 * Évite les accès répétés au stockage et améliore les performances
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number; // Time to live en ms
}

export function useOptimizedStorage<T = any>() {
  const cache = useRef(new Map<string, CacheEntry<T>>());

  // Nettoyage du cache expiré
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    for (const [key, entry] of cache.current.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        cache.current.delete(key);
        logger.debug(`Cache expired for key: ${key}`, undefined, 'STORAGE');
      }
    }
  }, []);

  // Get avec cache
  const getItem = useCallback(async (key: string, ttl?: number): Promise<T | null> => {
    try {
      // Nettoyer le cache expiré périodiquement
      if (Math.random() < 0.1) { // 10% de chance
        cleanExpiredCache();
      }

      // Vérifier le cache d'abord
      const cached = cache.current.get(key);
      if (cached) {
        const now = Date.now();
        const isExpired = cached.ttl && (now - cached.timestamp > cached.ttl);
        
        if (!isExpired) {
          logger.debug(`Cache hit for key: ${key}`, undefined, 'STORAGE');
          return cached.value;
        } else {
          cache.current.delete(key);
        }
      }

      // Pas en cache ou expiré, récupérer depuis AsyncStorage
      const value = await AsyncStorage.getItem(key);
      const parsedValue = value ? JSON.parse(value) : null;

      // Mettre en cache si une valeur existe
      if (parsedValue !== null) {
        cache.current.set(key, {
          value: parsedValue,
          timestamp: Date.now(),
          ttl
        });
        logger.debug(`Cached value for key: ${key}`, undefined, 'STORAGE');
      }

      return parsedValue;
    } catch (error) {
      logger.error(`Error getting item ${key}:`, error, 'STORAGE');
      return null;
    }
  }, [cleanExpiredCache]);

  // Set avec mise à jour du cache
  const setItem = useCallback(async (key: string, value: T, ttl?: number): Promise<boolean> => {
    try {
      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(value));

      // Mettre à jour le cache
      cache.current.set(key, {
        value,
        timestamp: Date.now(),
        ttl
      });

      logger.debug(`Item set for key: ${key}`, undefined, 'STORAGE');
      return true;
    } catch (error) {
      logger.error(`Error setting item ${key}:`, error, 'STORAGE');
      return false;
    }
  }, []);

  // Remove avec nettoyage du cache
  const removeItem = useCallback(async (key: string): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(key);
      cache.current.delete(key);
      logger.debug(`Item removed for key: ${key}`, undefined, 'STORAGE');
      return true;
    } catch (error) {
      logger.error(`Error removing item ${key}:`, error, 'STORAGE');
      return false;
    }
  }, []);

  // Opérations en batch pour meilleures performances
  const batchGet = useCallback(async (keys: string[], ttl?: number): Promise<Record<string, T | null>> => {
    const result: Record<string, T | null> = {};
    
    // Séparer les clés cachées et non-cachées
    const uncachedKeys: string[] = [];
    const now = Date.now();

    for (const key of keys) {
      const cached = cache.current.get(key);
      if (cached && (!cached.ttl || now - cached.timestamp <= cached.ttl)) {
        result[key] = cached.value;
      } else {
        uncachedKeys.push(key);
      }
    }

    // Récupérer les clés non-cachées
    if (uncachedKeys.length > 0) {
      try {
        const pairs = await AsyncStorage.multiGet(uncachedKeys);
        for (const [key, value] of pairs) {
          const parsedValue = value ? JSON.parse(value) : null;
          result[key] = parsedValue;

          // Mettre en cache
          if (parsedValue !== null) {
            cache.current.set(key, {
              value: parsedValue,
              timestamp: now,
              ttl
            });
          }
        }
        logger.debug(`Batch get completed for ${uncachedKeys.length} keys`, undefined, 'STORAGE');
      } catch (error) {
        logger.error('Error in batch get:', error, 'STORAGE');
        // En cas d'erreur, marquer comme null
        for (const key of uncachedKeys) {
          result[key] = null;
        }
      }
    }

    return result;
  }, []);

  const batchSet = useCallback(async (items: Array<[string, T]>, ttl?: number): Promise<boolean> => {
    try {
      // Préparer les données pour AsyncStorage
      const pairs = items.map(([key, value]) => [key, JSON.stringify(value)] as [string, string]);
      
      await AsyncStorage.multiSet(pairs);

      // Mettre à jour le cache
      const now = Date.now();
      for (const [key, value] of items) {
        cache.current.set(key, {
          value,
          timestamp: now,
          ttl
        });
      }

      logger.debug(`Batch set completed for ${items.length} items`, undefined, 'STORAGE');
      return true;
    } catch (error) {
      logger.error('Error in batch set:', error, 'STORAGE');
      return false;
    }
  }, []);

  // Clear cache (utile pour les tests ou réinitialisation)
  const clearCache = useCallback(() => {
    cache.current.clear();
    logger.debug('Cache cleared', undefined, 'STORAGE');
  }, []);

  // Stats du cache
  const getCacheStats = useCallback(() => {
    return {
      size: cache.current.size,
      keys: Array.from(cache.current.keys())
    };
  }, []);

  return {
    getItem,
    setItem,
    removeItem,
    batchGet,
    batchSet,
    clearCache,
    getCacheStats
  };
}

// Version spécialisée pour les performances de tracking
export function useTrackingStorage() {
  const storage = useOptimizedStorage();
  
  const getDailyStats = useCallback((date: string) => {
    return storage.getItem(`daily_stats_${date}`, 5 * 60 * 1000); // Cache 5 minutes
  }, [storage]);

  const setDailyStats = useCallback((date: string, stats: any) => {
    return storage.setItem(`daily_stats_${date}`, stats, 5 * 60 * 1000);
  }, [storage]);

  const getSessionData = useCallback((sessionId: string) => {
    return storage.getItem(`session_${sessionId}`, 10 * 60 * 1000); // Cache 10 minutes
  }, [storage]);

  const setSessionData = useCallback((sessionId: string, data: any) => {
    return storage.setItem(`session_${sessionId}`, data, 10 * 60 * 1000);
  }, [storage]);

  return {
    ...storage,
    getDailyStats,
    setDailyStats,
    getSessionData,
    setSessionData
  };
}