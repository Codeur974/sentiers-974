import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { useDataStore } from '../../store/useDataStore';
import { logger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://sentiers-974.onrender.com';
const MONGODB_API_URL = `${API_BASE_URL}/api/sessions`;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 secondes entre chaque retry

/**
 * Hook pour synchroniser automatiquement les sessions en attente
 * Détecte le retour de la connexion et tente de sync les sessions
 */
export const useNetworkSync = () => {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const {
    pendingSessions,
    isSyncing,
    removeFromSyncQueue,
    incrementRetry,
    setSyncing
  } = useDataStore();

  // Fonction pour synchroniser une session
  const syncSession = async (pendingSession: any) => {
    const { id, sessionData, retryCount } = pendingSession;

    if (retryCount >= MAX_RETRIES) {
      logger.warn('Session abandonnée après max retries', { id, retryCount }, 'SYNC');
      await removeFromSyncQueue(id);
      return false;
    }

    try {
      logger.debug('Tentative sync session', { id, attempt: retryCount + 1 }, 'SYNC');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const token =
        (await AsyncStorage.getItem('authToken')) ||
        (await AsyncStorage.getItem('userToken'));

      const response = await fetch(MONGODB_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...sessionData,
          status: 'completed'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        logger.info('Session sync réussie', { id }, 'SYNC');
        await removeFromSyncQueue(id);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      logger.warn('Échec sync session', { id, error: error.message }, 'SYNC');
      await incrementRetry(id);
      return false;
    }
  };

  // Fonction pour synchroniser toutes les sessions en attente
  const syncAllPending = async () => {
    if (isSyncing || pendingSessions.length === 0) {
      return;
    }

    setSyncing(true);
    logger.info('Démarrage sync', { count: pendingSessions.length }, 'SYNC');

    for (const pending of pendingSessions) {
      await syncSession(pending);
      // Petit délai entre chaque session pour ne pas surcharger
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setSyncing(false);
    logger.info('Sync terminée', undefined, 'SYNC');
  };

  // Écouter les changements de connexion réseau
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      logger.debug('État réseau', { connected: state.isConnected }, 'SYNC');

      // Si connexion revenue et qu'il y a des sessions en attente
      if (state.isConnected && pendingSessions.length > 0 && !isSyncing) {
        logger.info('Connexion détectée, démarrage sync', undefined, 'SYNC');
        syncAllPending();
      }
    });

    return () => {
      unsubscribe();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [pendingSessions.length, isSyncing]);

  // Vérification périodique toutes les 30 secondes si des sessions en attente
  useEffect(() => {
    if (pendingSessions.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        NetInfo.fetch().then(state => {
          if (state.isConnected && !isSyncing) {
            logger.debug('Vérification périodique sync', undefined, 'SYNC');
            syncAllPending();
          }
        });
      }, 30000); // 30 secondes
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [pendingSessions.length, isSyncing]);

  return {
    pendingSessions,
    isSyncing,
    syncAllPending
  };
};
