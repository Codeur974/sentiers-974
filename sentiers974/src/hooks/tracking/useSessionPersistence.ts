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
 * Hook pour gérer la persistance des sessions
 * MongoDB + fallback AsyncStorage
 */
export const useSessionPersistence = () => {
  const { user } = useAuth();
  const { addToSyncQueue } = useDataStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Charger sessionId et deviceId au démarrage
  useEffect(() => {
    const loadSessionId = async () => {
      try {
        const storedSessionId = await AsyncStorage.getItem('currentSessionId');
        if (storedSessionId) {
          setSessionId(storedSessionId);
          console.log('🔄 SessionId restauré:', storedSessionId);
        }

        // Charger ou créer deviceId
        let storedDeviceId = await AsyncStorage.getItem('deviceId');
        if (!storedDeviceId) {
          storedDeviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          await AsyncStorage.setItem('deviceId', storedDeviceId);
          console.log('🆔 DeviceId créé:', storedDeviceId);
        }
        setDeviceId(storedDeviceId);

        // MIGRATION : Corriger les anciennes sessions avec sport objet
        await migrateOldSessions();
      } catch (error: any) {
        console.error('❌ Erreur chargement sessionId:', error);
      }
    };

    const migrateOldSessions = async () => {
      try {
        console.log('🔄 Migration: Correction anciennes sessions...');
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
            console.log('✅ Migration: Stats corrigées pour', key);
          }
        }
        console.log('✅ Migration terminée');
      } catch (error) {
        console.error('❌ Erreur migration:', error);
      }
    };

    loadSessionId();
  }, []);

  // Créer session
  const createSession = async (sport: any, coords: any, address: string) => {
    let newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    setSessionId(newSessionId);

    await AsyncStorage.setItem('currentSessionId', newSessionId);
    console.log('🆔 SessionId créé:', newSessionId);

    // Créer sur MongoDB avec timeout rapide (5s)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Déterminer le userId : user connecté > deviceId > 'anonymous'
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
          console.log('🔄 SessionId serveur:', serverSessionId);
        } else {
          console.log('✅ Session MongoDB créée');
        }
      } else {
        console.log('⚠️ MongoDB non disponible, continue en local');
      }
    } catch (error: any) {
      console.log('⚠️ MongoDB timeout/erreur:', error?.message || error);
    }

    return newSessionId;
  };

  // Sauvegarder session complète
  const saveSession = async (sessionData: any) => {
    if (!sessionId) {
      console.log('⚠️ saveSession: Pas de sessionId, abandon');
      return;
    }

    console.log('📝 saveSession: Début sauvegarde session', { sessionId, sessionData });

    const today = new Date().toISOString().split('T')[0];
    const statsKey = `daily_stats_${today}`;
    console.log('📅 saveSession: Date du jour:', today, 'Clé AsyncStorage:', statsKey);

    const updateLocalStats = async (logFallback = false) => {
      console.log('💾 updateLocalStats: Début mise à jour stats locales');
      const existingStatsJson = await AsyncStorage.getItem(statsKey);
      console.log('📊 updateLocalStats: Stats existantes:', existingStatsJson ? 'trouvées' : 'aucune');

      let dayPerformance = existingStatsJson ? JSON.parse(existingStatsJson) : {
        totalDistance: 0,
        totalTime: 0,
        totalCalories: 0,
        sessions: 0,
        sessionsList: []
      };

      console.log('📊 updateLocalStats: Avant ajout -', {
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

      console.log('📊 updateLocalStats: Après ajout -', {
        sessions: dayPerformance.sessions,
        sessionsList: dayPerformance.sessionsList.length,
        nouvelleSession: sessionId
      });

      await AsyncStorage.setItem(statsKey, JSON.stringify(dayPerformance));
      console.log('✅ updateLocalStats: Stats sauvegardées dans AsyncStorage');

      if (logFallback) {
        console.log('💾 Sauvegarde AsyncStorage (fallback MongoDB)');
      }
    };
    let localStatsUpdated = false;

    try {
      // Sauvegarder sur MongoDB
      console.log('🌐 saveSession: Tentative sauvegarde MongoDB...', MONGODB_API_URL);
      const response = await fetch(MONGODB_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionData,
          sessionId,
          status: 'completed'
        })
      });

      console.log('🌐 saveSession: Réponse MongoDB -', {
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ saveSession: Session MongoDB sauvegardée', responseData);
      } else {
        const errorText = await response.text();
        console.error('❌ saveSession: MongoDB erreur HTTP', response.status, errorText);
        throw new Error('MongoDB save failed');
      }
    } catch (mongoError) {
      console.error('⚠️ saveSession: MongoDB erreur, fallback AsyncStorage + ajout sync queue', mongoError);
      await updateLocalStats(true);
      localStatsUpdated = true;

      // Ajouter à la file de synchronisation pour retry automatique
      await addToSyncQueue({
        ...sessionData,
        sessionId,
        userId: user?.id || deviceId || 'anonymous'
      });
      console.log('📥 saveSession: Session ajoutée à la sync queue');
    }

    if (!localStatsUpdated) {
      console.log('💾 saveSession: Mise à jour stats locales (MongoDB OK)');
      await updateLocalStats();
    }

    // Émettre un event pour notifier que la session a été sauvegardée
    console.log('📢 saveSession: Émission event sessionSaved', { sessionId, date: today });
    DeviceEventEmitter.emit('sessionSaved', { sessionId, date: today });
    console.log('✅ saveSession: Sauvegarde terminée');
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
            console.log('🗑️ Session MongoDB supprimée:', sessionId);
          } else {
            console.log('⚠️ Impossible de supprimer la session MongoDB');
          }
        } catch (mongoError) {
          console.log('⚠️ Erreur suppression MongoDB (continue quand même)');
        }
      }

      // Supprimer localement
      await AsyncStorage.removeItem('currentSessionId');
      setSessionId(null);
      console.log('🗑️ SessionId local supprimé');
    } catch (error: any) {
      console.error('❌ Erreur suppression sessionId:', error);
    }
  };

  return {
    sessionId,
    createSession,
    saveSession,
    clearSession,
  };
};
