import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useDataStore } from '../../store/useDataStore';
import { DeviceEventEmitter } from 'react-native';

// Utiliser la variable d'environnement du .env
const MONGODB_API_URL = `${process.env.EXPO_PUBLIC_API_URL}/api/sessions`;

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
      } catch (error: any) {
        console.error('❌ Erreur chargement sessionId:', error);
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

      const response = await fetch(MONGODB_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (!sessionId) return;

    const today = new Date().toISOString().split('T')[0];
    const statsKey = `daily_stats_${today}`;
    const updateLocalStats = async (logFallback = false) => {
      const existingStatsJson = await AsyncStorage.getItem(statsKey);
      let dayPerformance = existingStatsJson ? JSON.parse(existingStatsJson) : {
        totalDistance: 0,
        totalTime: 0,
        totalCalories: 0,
        sessions: 0,
        sessionsList: []
      };

      dayPerformance.totalDistance += sessionData.distance;
      dayPerformance.totalTime += sessionData.duration;
      dayPerformance.totalCalories += sessionData.calories;
      dayPerformance.sessions += 1;
      dayPerformance.sessionsList.push({
        sessionId,
        ...sessionData,
        timestamp: Date.now()
      });

      await AsyncStorage.setItem(statsKey, JSON.stringify(dayPerformance));
      if (logFallback) {
        console.log('💾 Sauvegarde AsyncStorage');
      }
    };
    let localStatsUpdated = false;

    try {
      // Sauvegarder sur MongoDB
      const response = await fetch(MONGODB_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionData,
          sessionId,
          status: 'completed'
        })
      });

      if (response.ok) {
        console.log('💾 Session MongoDB sauvegardée');
      } else {
        throw new Error('MongoDB save failed');
      }
    } catch (mongoError) {
      console.error('⚠️ MongoDB erreur, fallback AsyncStorage + ajout sync queue');
      await updateLocalStats(true);
      localStatsUpdated = true;

      // Ajouter à la file de synchronisation pour retry automatique
      await addToSyncQueue({
        ...sessionData,
        sessionId,
        userId: user?.id || deviceId || 'anonymous'
      });
    }

    if (!localStatsUpdated) {
      await updateLocalStats();
    }

    // Émettre un event pour notifier que la session a été sauvegardée
    DeviceEventEmitter.emit('sessionSaved', { sessionId, date: today });
    console.log('📢 Event sessionSaved émis');
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
