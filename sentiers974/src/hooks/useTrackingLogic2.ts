import { useEffect, useCallback } from 'react';
import { useTrackingSession } from './tracking/useTrackingSession';
import { useTrackingMetrics } from './tracking/useTrackingMetrics';
import { useTrackingLocation } from './tracking/useTrackingLocation';
import { useTrackingData } from './tracking/useTrackingData';
import { getSportType, getSportMetrics } from '../utils';
import { logger } from '../utils/logger';

/**
 * Version modulaire et optimisée de useTrackingLogic
 * Décomposée en hooks spécialisés pour une meilleure maintenabilité
 * Compatible avec l'API existante - peut remplacer useTrackingLogic.ts
 */
export const useTrackingLogic2 = (selectedSport: any) => {
  // Hooks spécialisés
  const session = useTrackingSession(selectedSport);
  const metrics = useTrackingMetrics(selectedSport);
  const location = useTrackingLocation();
  const trackingData = useTrackingData();

  // Synchronisation des données GPS avec les métriques
  useEffect(() => {
    if (location.coords && location.lastCoords && session.status === 'running') {
      // Calculer la distance parcourue
      const distanceIncrement = trackingData.calculateDistance(
        location.lastCoords.latitude,
        location.lastCoords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );
      
      if (distanceIncrement > 0) {
        const newTotalDistance = metrics.distance + distanceIncrement;
        metrics.updateDistance(newTotalDistance, session.duration);
        
        // Mettre à jour la vitesse
        if (location.coords.speed !== null) {
          const speedKmh = (location.coords.speed || 0) * 3.6; // m/s vers km/h
          metrics.updateSpeed(speedKmh);
        }
        
        // Mettre à jour l'altitude
        metrics.updateAltitude(location.coords.altitude);
        
        // Ajouter un point au graphique
        trackingData.addChartDataPoint(
          session.duration,
          location.coords.altitude,
          (location.coords.speed || 0) * 3.6,
          newTotalDistance
        );
      }
    }
  }, [location.coords, location.lastCoords, session.status, session.duration, metrics, trackingData]);

  // Gestion automatique des pas (simulation pour certains sports)
  useEffect(() => {
    if (session.status === 'running' && selectedSport?.name?.toLowerCase() === 'course') {
      session.stepInterval.current = setInterval(() => {
        // Estimation des pas basée sur la vitesse
        const stepsPerSecond = Math.max(0, Math.min(3, metrics.instantSpeed / 10));
        metrics.setSteps(prev => prev + Math.round(stepsPerSecond));
      }, 1000);
    } else {
      if (session.stepInterval.current) {
        clearInterval(session.stepInterval.current);
        session.stepInterval.current = null;
      }
    }

    return () => {
      if (session.stepInterval.current) {
        clearInterval(session.stepInterval.current);
      }
    };
  }, [session.status, selectedSport, metrics.instantSpeed, session.stepInterval]);

  // Actions composées
  const startTracking = useCallback(async () => {
    try {
      logger.tracking('Démarrage tracking complet');
      
      // Démarrer la session
      const sessionId = await session.startSession();
      
      // Démarrer la localisation
      const locationStarted = await location.startLocationTracking();
      if (!locationStarted) {
        throw new Error('Impossible de démarrer la localisation');
      }
      
      // Obtenir la position initiale
      await location.getCurrentLocation();
      
      logger.tracking('Tracking démarré avec succès', { sessionId });
      return sessionId;
    } catch (error) {
      logger.error('Erreur démarrage tracking:', error);
      throw error;
    }
  }, [session.startSession, location.startLocationTracking, location.getCurrentLocation]);

  const pauseTracking = useCallback(() => {
    logger.tracking('Mise en pause tracking');
    session.pauseSession();
    metrics.pauseMetrics();
  }, [session.pauseSession, metrics.pauseMetrics]);

  const resumeTracking = useCallback(() => {
    logger.tracking('Reprise tracking');
    session.resumeSession();
    metrics.resumeMetrics();
  }, [session.resumeSession, metrics.resumeMetrics]);

  const stopTracking = useCallback(async () => {
    try {
      logger.tracking('Arrêt tracking complet');
      
      // Arrêter la session
      await session.stopSession();
      
      // Arrêter la localisation
      await location.stopLocationTracking();
      
      logger.tracking('Tracking arrêté avec succès');
    } catch (error) {
      logger.error('Erreur arrêt tracking:', error);
      throw error;
    }
  }, [session.stopSession, location.stopLocationTracking]);

  const resetTracking = useCallback(async () => {
    try {
      logger.tracking('Reset tracking complet');
      
      // Reset tous les hooks
      await session.resetSession();
      metrics.resetMetrics();
      location.resetLocation();
      trackingData.resetAllData();
      
      logger.tracking('Tracking reset avec succès');
    } catch (error) {
      logger.error('Erreur reset tracking:', error);
      throw error;
    }
  }, [session.resetSession, metrics.resetMetrics, location.resetLocation, trackingData.resetAllData]);

  // Fonctions utilitaires composées
  const createPOI = useCallback((title: string, note?: string, photo?: string) => {
    if (!location.coords || !session.sessionId) {
      logger.warn('Impossible de créer POI: pas de coordonnées ou session');
      return null;
    }

    return trackingData.createPointOfInterest(
      location.coords.latitude,
      location.coords.longitude,
      location.coords.altitude,
      metrics.distance,
      session.duration,
      title,
      note,
      photo
    );
  }, [location.coords, session.sessionId, session.duration, metrics.distance, trackingData.createPointOfInterest]);

  const getTrackingStats = useCallback(() => {
    const sessionInfo = session.getSessionInfo();
    const dataStats = trackingData.getDataStats();
    const calories = metrics.calculateCalories();
    
    return {
      ...sessionInfo,
      distance: metrics.distance,
      steps: metrics.steps,
      instantSpeed: metrics.instantSpeed,
      maxSpeed: metrics.maxSpeed,
      avgSpeed: metrics.avgSpeed,
      elevationGain: metrics.elevationGain,
      elevationLoss: metrics.elevationLoss,
      minAltitude: metrics.minAltitude,
      maxAltitude: metrics.maxAltitude,
      splits: metrics.splits,
      chartData: trackingData.chartData,
      pointsOfInterest: trackingData.pointsOfInterest,
      calories,
      trackingPath: location.trackingPath,
      ...dataStats
    };
  }, [session, metrics, trackingData, location]);

  // Interface compatible avec useTrackingLogic original
  return {
    // Session data
    sessionId: session.sessionId,
    status: session.status,
    duration: session.duration,
    
    // Metrics data
    distance: metrics.distance,
    steps: metrics.steps,
    instantSpeed: metrics.instantSpeed,
    maxSpeed: metrics.maxSpeed,
    avgSpeed: metrics.avgSpeed,
    elevationGain: metrics.elevationGain,
    elevationLoss: metrics.elevationLoss,
    minAltitude: metrics.minAltitude,
    maxAltitude: metrics.maxAltitude,
    splits: metrics.splits,
    
    // Location data
    coords: location.coords,
    address: location.address,
    watching: location.watching,
    locationError: location.locationError,
    lastCoords: location.lastCoords,
    locationHistory: location.locationHistory,
    trackingPath: location.trackingPath,
    
    // Chart and POI data
    chartData: trackingData.chartData,
    pointsOfInterest: trackingData.pointsOfInterest,
    
    // Calculated values
    calculateCalories: metrics.calculateCalories,
    
    // Actions
    start: startTracking,
    pause: pauseTracking,
    resume: resumeTracking,
    stop: stopTracking,
    reset: resetTracking,
    
    // Location actions
    getCurrentLocation: location.getCurrentLocation,
    getAddressFromCoords: location.getAddressFromCoords,
    
    // POI actions
    createPOI,
    deletePOI: trackingData.deletePointOfInterest,
    updatePOI: trackingData.updatePointOfInterest,
    
    // Manual actions
    createManualSplit: metrics.createManualSplit,
    
    // Utilities
    getTrackingStats,
    getFormattedDuration: session.getFormattedDuration,
    hasActiveSession: session.hasActiveSession,
    
    // Force update (compatibility)
    forceUpdate: session.forceUpdate,
    
    // Raw hooks access (for advanced use)
    _hooks: {
      session,
      metrics,
      location,
      trackingData
    }
  };
};