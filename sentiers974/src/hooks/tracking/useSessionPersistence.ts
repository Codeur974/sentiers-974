import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';
import { useDataStore } from '../../store/useDataStore';
import { DeviceEventEmitter } from 'react-native';

// Utiliser la variable d'environnement du .env
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://sentiers-974.onrender.com';
const MONGODB_API_URL = `${API_BASE_URL}/api/sessions`;

/**
 * Hook pour gÃ©rer la persistance des sessions
 * MongoDB + fallback AsyncStorage
 */
export const useSessionPersistence = () => {
  const { user } = useAuth();
  const { addToSyncQueue } = useDataStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Charger sessionId et deviceId au dÃ©marrage
  useEffect(() => {
    const loadSessionId = async () => {
      try {
        const storedSessionId = await AsyncStorage.getItem('currentSessionId');
        if (storedSessionId) {
          setSessionId(storedSessionId);
          console.log('ðŸ”„ SessionId restaurÃ©:', storedSessionId);
        }

        // Charger ou crÃ©er deviceId
        let storedDeviceId = await AsyncStorage.getItem('deviceId');
        if (!storedDeviceId) {
          storedDeviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          await AsyncStorage.setItem('deviceId', storedDeviceId);
          console.log('ðŸ†” DeviceId crÃ©Ã©:', storedDeviceId);
        }
        setDeviceId(storedDeviceId);

        // MIGRATION : Corriger les anciennes sessions avec sport objet
        await migrateOldSessions();
      } catch (error: any) {
        console.error('âŒ Erreur chargement sessionId:', error);
      }
    };

    const migrateOldSessions = async () => {
      try {
        console.log('ðŸ”„ Migration: Correction anciennes sessions...');
        const allKeys = await AsyncStorage.getAllKeys();
        const statsKeys = allKeys.filter(key => key.startsWith('daily_stats_'));

        for (const key of statsKeys) {
          const statsJson = await AsyncStorage.getItem(key);
          if (!statsJson) continue;

          const stats = JSON.parse(statsJson);
          let needsUpdate = false;

          if (stats.sessionsList && Array.isArray(stats.sessionsList)) {
            stats.sessionsList = stats.sessionsList.map((session: any) => {
              if (session.sport && typeof session.sport === 'object') {
                needsUpdate = true;
                return {
                  ...session,
                  sport: session.sport.nom || 'Sport'
                };
              }
              return session;
            });
          }

          if (needsUpdate) {
            await AsyncStorage.setItem(key, JSON.stringify(stats));
            console.log('âœ… Migration: Stats corrigÃ©es pour', key);
          }
        }
        console.log('âœ… Migration terminÃ©e');
      } catch (error) {
        console.error('âŒ Erreur migration:', error);
      }
    };

    loadSessionId();
  }, []);

  // CrÃ©er session
  const createSession = async (sport: any, coords: any, address: string) => {
    let newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    setSessionId(newSessionId);

    await AsyncStorage.setItem('currentSessionId', newSessionId);
    console.log('ðŸ†” SessionId crÃ©Ã©:', newSessionId);

    // CrÃ©er sur MongoDB avec timeout rapide (5s)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // DÃ©terminer le userId : user connectÃ© > deviceId > 'anonymous'
      const userId = user?.id || deviceId || 'anonymous';
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
          sessionId: newSessionId,
          userId: userId,
          sport: sport,
          distance: 0,
          duration: 0,
          calories: 0,
          avgSpeed: 0,
          maxSpeed: 0,
          steps: 0,
          startCoordinates: coords ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy
          } : null,
          startLocation: coords ? {
            address: address || 'Position inconnue'
          } : null,
          trackingPath: [],
          pois: [],
          photos: [],
          status: 'active'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const serverSessionId = data.data?.id || data.data?.sessionId;
        if (serverSessionId && serverSessionId !== newSessionId) {
          newSessionId = serverSessionId;
          setSessionId(serverSessionId);
          await AsyncStorage.setItem('currentSessionId', serverSessionId);
          console.log('ðŸ”„ SessionId serveur:', serverSessionId);
        } else {
          console.log('âœ… Session MongoDB crÃ©Ã©e');
        }
      } else {
        console.log('âš ï¸ MongoDB non disponible, continue en local');
      }
    } catch (error: any) {
      console.log('âš ï¸ MongoDB timeout/erreur:', error?.message || error);
    }

    return newSessionId;
  };

  // Sauvegarder session complÃ¨te
  const saveSession = async (sessionData: any) => {
    if (!sessionId) {
      console.log('âš ï¸ saveSession: Pas de sessionId, abandon');
      return;
    }

    console.log('ðŸ“ saveSession: DÃ©but sauvegarde session', { sessionId, sessionData });

    const today = new Date().toISOString().split('T')[0];
    const statsKey = `daily_stats_${today}`;
    console.log('ðŸ“… saveSession: Date du jour:', today, 'ClÃ© AsyncStorage:', statsKey);

    const updateLocalStats = async (logFallback = false) => {
      console.log('ðŸ’¾ updateLocalStats: DÃ©but mise Ã  jour stats locales');
      const existingStatsJson = await AsyncStorage.getItem(statsKey);
      console.log('ðŸ“Š updateLocalStats: Stats existantes:', existingStatsJson ? 'trouvÃ©es' : 'aucune');

      let dayPerformance = existingStatsJson ? JSON.parse(existingStatsJson) : {
        totalDistance: 0,
        totalTime: 0,
        totalCalories: 0,
        sessions: 0,
        sessionsList: []
      };

      console.log('ðŸ“Š updateLocalStats: Avant ajout -', {
        sessions: dayPerformance.sessions,
        sessionsList: dayPerformance.sessionsList.length
      });

      dayPerformance.totalDistance += sessionData.distance;
      dayPerformance.totalTime += sessionData.duration;
      dayPerformance.totalCalories += sessionData.calories;
      dayPerformance.sessions += 1;
      dayPerformance.sessionsList.push({
        sessionId,
        ...sessionData,
        sport: sessionData.sport?.nom || sessionData.sport, // Extraire le nom du sport si c'est un objet
        timestamp: Date.now()
      });

      console.log('ðŸ“Š updateLocalStats: AprÃ¨s ajout -', {
        sessions: dayPerformance.sessions,
        sessionsList: dayPerformance.sessionsList.length,
        nouvelleSession: sessionId
      });

      await AsyncStorage.setItem(statsKey, JSON.stringify(dayPerformance));
      console.log('âœ… updateLocalStats: Stats sauvegardÃ©es dans AsyncStorage');

      if (logFallback) {
        console.log('ðŸ’¾ Sauvegarde AsyncStorage (fallback MongoDB)');
      }
    };
    let localStatsUpdated = false;

    try {
      // Sauvegarder sur MongoDB
      console.log('ðŸŒ saveSession: Tentative sauvegarde MongoDB...', MONGODB_API_URL);
      const response = await fetch(MONGODB_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionData,
          sessionId,
          status: 'completed'
        })
      });

      console.log('ðŸŒ saveSession: RÃ©ponse MongoDB -', {
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('âœ… saveSession: Session MongoDB sauvegardÃ©e', responseData);
      } else {
        const errorText = await response.text();
        console.error('âŒ saveSession: MongoDB erreur HTTP', response.status, errorText);
        throw new Error('MongoDB save failed');
      }
    } catch (mongoError) {
      console.error('âš ï¸ saveSession: MongoDB erreur, fallback AsyncStorage + ajout sync queue', mongoError);
      await updateLocalStats(true);
      localStatsUpdated = true;

      // Ajouter Ã  la file de synchronisation pour retry automatique
      await addToSyncQueue({
        ...sessionData,
        sessionId,
        userId: user?.id || deviceId || 'anonymous'
      });
      console.log('ðŸ“¥ saveSession: Session ajoutÃ©e Ã  la sync queue');
    }

    if (!localStatsUpdated) {
      console.log('ðŸ’¾ saveSession: Mise Ã  jour stats locales (MongoDB OK)');
      await updateLocalStats();
    }

    // Ã‰mettre un event pour notifier que la session a Ã©tÃ© sauvegardÃ©e
    console.log('ðŸ“¢ saveSession: Ã‰mission event sessionSaved', { sessionId, date: today });
    DeviceEventEmitter.emit('sessionSaved', { sessionId, date: today });
    console.log('âœ… saveSession: Sauvegarde terminÃ©e');
  };

  // Supprimer session
  const clearSession = async () => {
    try {
      // Supprimer de MongoDB si sessionId existe
      if (sessionId) {
        try {
          const response = await fetch(`${MONGODB_API_URL}/${sessionId}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            console.log('ðŸ—‘ï¸ Session MongoDB supprimÃ©e:', sessionId);
          } else {
            console.log('âš ï¸ Impossible de supprimer la session MongoDB');
          }
        } catch (mongoError) {
          console.log('âš ï¸ Erreur suppression MongoDB (continue quand mÃªme)');
        }
      }

      // Supprimer localement
      await AsyncStorage.removeItem('currentSessionId');
      setSessionId(null);
      console.log('ðŸ—‘ï¸ SessionId local supprimÃ©');
    } catch (error: any) {
      console.error('âŒ Erreur suppression sessionId:', error);
    }
  };

  return {
    sessionId,
    createSession,
    saveSession,
    clearSession,
  };
};

