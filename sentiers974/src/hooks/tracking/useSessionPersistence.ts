import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utiliser la variable d'environnement du .env
const MONGODB_API_URL = `${process.env.EXPO_PUBLIC_API_URL}/api/sessions`;

/**
 * Hook pour gérer la persistance des sessions
 * MongoDB + fallback AsyncStorage
 */
export const useSessionPersistence = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Charger sessionId au démarrage
  useEffect(() => {
    const loadSessionId = async () => {
      try {
        const storedSessionId = await AsyncStorage.getItem('currentSessionId');
        if (storedSessionId) {
          setSessionId(storedSessionId);
          console.log('🔄 SessionId restauré:', storedSessionId);
        }
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

      const response = await fetch(MONGODB_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          userId: 'default-user',
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
      console.error('⚠️ MongoDB erreur, fallback AsyncStorage');
      await updateLocalStats(true);
      localStatsUpdated = true;
    }

    if (!localStatsUpdated) {
      await updateLocalStats();
    }
  };

  // Supprimer session
  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem('currentSessionId');
      setSessionId(null);
      console.log('🗑️ SessionId supprimé');
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
