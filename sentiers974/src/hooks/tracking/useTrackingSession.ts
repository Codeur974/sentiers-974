import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSessionStore } from '../../store/useSessionStore';
import { logger } from '../../utils/logger';

/**
 * Hook spécialisé pour la gestion de session de tracking
 * Gère: sessionId, durée, états, persistence
 */
export function useTrackingSession(selectedSport: any) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const durationInterval = useRef<any>(null);
  const stepInterval = useRef<any>(null);
  
  const { 
    status, 
    start, 
    pause, 
    resume, 
    stop, 
    reset, 
    duration: getStoreDuration 
  } = useSessionStore();

  // Charger le sessionId depuis AsyncStorage au démarrage
  useEffect(() => {
    const loadSessionId = async () => {
      try {
        const storedSessionId = await AsyncStorage.getItem('currentSessionId');
        if (storedSessionId) {
          setSessionId(storedSessionId);
          logger.tracking('SessionId restauré', { sessionId: storedSessionId });
        }
      } catch (error) {
        logger.error('Erreur chargement sessionId:', error);
      }
    };
    
    loadSessionId();
  }, []);

  // Synchroniser la durée avec le store
  useEffect(() => {
    const storeDuration = getStoreDuration();
    if (storeDuration !== duration) {
      setDuration(storeDuration);
    }
  }, [getStoreDuration, duration]);

  // Gestion de l'intervalle de durée
  useEffect(() => {
    if (status === 'running') {
      durationInterval.current = setInterval(() => {
        setDuration(prev => prev + 1000);
        setForceUpdate(prev => prev + 1);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [status]);

  // Générer un nouvel ID de session
  const generateSessionId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const sportName = selectedSport?.name?.toLowerCase().replace(/\s+/g, '-') || 'activity';
    return `${sportName}-${timestamp}-${random}`;
  }, [selectedSport]);

  // Sauvegarder le sessionId
  const saveSessionId = useCallback(async (id: string) => {
    try {
      await AsyncStorage.setItem('currentSessionId', id);
      logger.tracking('SessionId sauvegardé', { sessionId: id });
    } catch (error) {
      logger.error('Erreur sauvegarde sessionId:', error);
    }
  }, []);

  // Supprimer le sessionId
  const clearSessionId = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('currentSessionId');
      setSessionId(null);
      logger.tracking('SessionId supprimé');
    } catch (error) {
      logger.error('Erreur suppression sessionId:', error);
    }
  }, []);

  // Démarrer une nouvelle session
  const startSession = useCallback(async () => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    await saveSessionId(newSessionId);
    
    start();
    setDuration(0);
    
    logger.tracking('Session démarrée', { 
      sessionId: newSessionId,
      sport: selectedSport?.name 
    });
    
    return newSessionId;
  }, [generateSessionId, saveSessionId, start, selectedSport]);

  // Mettre en pause la session
  const pauseSession = useCallback(() => {
    pause();
    logger.tracking('Session mise en pause', { sessionId });
  }, [pause, sessionId]);

  // Reprendre la session
  const resumeSession = useCallback(() => {
    resume();
    logger.tracking('Session reprise', { sessionId });
  }, [resume, sessionId]);

  // Arrêter la session
  const stopSession = useCallback(async () => {
    stop();
    await clearSessionId();
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    logger.tracking('Session arrêtée', { 
      sessionId,
      duration: Math.round(duration / 1000)
    });
  }, [stop, clearSessionId, sessionId, duration]);

  // Reset complet
  const resetSession = useCallback(async () => {
    reset();
    await clearSessionId();
    setDuration(0);
    setForceUpdate(0);
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    logger.tracking('Session reset');
  }, [reset, clearSessionId]);

  // Obtenir le temps formaté
  const getFormattedDuration = useCallback(() => {
    const totalSeconds = Math.floor(duration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [duration]);

  // Obtenir les informations de session
  const getSessionInfo = useCallback(() => {
    return {
      sessionId,
      status,
      duration,
      formattedDuration: getFormattedDuration(),
      sport: selectedSport,
      startTime: sessionId ? parseInt(sessionId.split('-')[1]) : null
    };
  }, [sessionId, status, duration, getFormattedDuration, selectedSport]);

  // Vérifier si une session est active
  const hasActiveSession = useCallback(() => {
    return sessionId !== null && (status === 'running' || status === 'paused');
  }, [sessionId, status]);

  // Obtenir la durée en heures (pour calculs de calories, etc.)
  const getDurationInHours = useCallback(() => {
    return duration / (1000 * 60 * 60);
  }, [duration]);

  return {
    // States
    sessionId,
    duration,
    status,
    forceUpdate,
    
    // Actions
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    resetSession,
    
    // Utilities
    getFormattedDuration,
    getSessionInfo,
    hasActiveSession,
    getDurationInHours,
    generateSessionId,
    
    // Refs
    stepInterval
  };
}