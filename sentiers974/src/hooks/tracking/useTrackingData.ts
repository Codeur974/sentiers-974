import { useState, useCallback } from 'react';
import { logger } from '../../utils/logger';

/**
 * Hook spécialisé pour les données de tracking
 * Gère: chart data, points d'intérêt, historiques
 */
export function useTrackingData() {
  // Données pour graphiques
  const [chartData, setChartData] = useState<Array<{
    time: number;           // Temps écoulé en ms
    altitude: number | null; // Altitude en m
    speed: number;          // Vitesse instantanée km/h
    distance: number;       // Distance parcourue km
    timestamp: number;      // Timestamp réel
  }>>([]);
  
  // Points d'intérêt
  const [pointsOfInterest, setPointsOfInterest] = useState<Array<{
    id: string;
    latitude: number;
    longitude: number;
    altitude?: number;
    distance: number;       // Distance au moment où créé
    time: number;          // Temps écoulé
    title: string;
    note?: string;
    photo?: string;        // URI de la photo
    timestamp: number;     // Timestamp réel
  }>>([]);

  // Ajouter un point de données au chart
  const addChartDataPoint = useCallback((
    time: number,
    altitude: number | null,
    speed: number,
    distance: number
  ) => {
    const dataPoint = {
      time,
      altitude,
      speed,
      distance: distance / 1000, // Convertir en km
      timestamp: Date.now()
    };
    
    setChartData(prev => {
      const newData = [...prev, dataPoint];
      // Garder seulement les 1000 derniers points pour les performances
      if (newData.length > 1000) {
        return newData.slice(-1000);
      }
      return newData;
    });
    
    logger.debug('Point graphique ajouté', {
      time: Math.round(time / 1000),
      speed: speed.toFixed(1),
      distance: (distance / 1000).toFixed(2)
    }, 'TRACKING');
  }, []);

  // Créer un point d'intérêt
  const createPointOfInterest = useCallback((
    latitude: number,
    longitude: number,
    altitude: number | undefined,
    distance: number,
    time: number,
    title: string,
    note?: string,
    photo?: string
  ) => {
    const poi = {
      id: `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      latitude,
      longitude,
      altitude,
      distance,
      time,
      title,
      note,
      photo,
      timestamp: Date.now()
    };

    setPointsOfInterest(prev => [...prev, poi]);
    logger.tracking('Point d\'intérêt créé', { title, distance: Math.round(distance) });
    
    return poi;
  }, []);

  // Supprimer un point d'intérêt
  const deletePointOfInterest = useCallback((poiId: string) => {
    setPointsOfInterest(prev => {
      const filtered = prev.filter(poi => poi.id !== poiId);
      logger.tracking('Point d\'intérêt supprimé', { poiId });
      return filtered;
    });
  }, []);

  // Modifier un point d'intérêt
  const updatePointOfInterest = useCallback((
    poiId: string,
    updates: Partial<{
      title: string;
      note: string;
      photo: string;
    }>
  ) => {
    setPointsOfInterest(prev => prev.map(poi => {
      if (poi.id === poiId) {
        const updated = { ...poi, ...updates };
        logger.tracking('Point d\'intérêt modifié', { poiId, updates });
        return updated;
      }
      return poi;
    }));
  }, []);

  // Obtenir les données de chart pour une période spécifique
  const getChartDataForPeriod = useCallback((startTime: number, endTime: number) => {
    return chartData.filter(point => 
      point.timestamp >= startTime && point.timestamp <= endTime
    );
  }, [chartData]);

  // Obtenir les POI dans une zone géographique
  const getPOIsInArea = useCallback((
    centerLat: number,
    centerLon: number,
    radiusKm: number
  ) => {
    return pointsOfInterest.filter(poi => {
      const distance = calculateDistance(
        centerLat, centerLon,
        poi.latitude, poi.longitude
      );
      return distance <= radiusKm * 1000; // Convertir km en mètres
    });
  }, [pointsOfInterest]);

  // Calculer la distance entre deux points
  const calculateDistance = useCallback((
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number => {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Obtenir les statistiques des données
  const getDataStats = useCallback(() => {
    if (chartData.length === 0) {
      return {
        totalPoints: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        maxAltitude: null,
        minAltitude: null,
        altitudeGain: 0,
        altitudeLoss: 0
      };
    }

    const speeds = chartData.map(p => p.speed).filter(s => s > 0);
    const altitudes = chartData.map(p => p.altitude).filter(a => a !== null) as number[];
    
    let altitudeGain = 0;
    let altitudeLoss = 0;
    
    for (let i = 1; i < altitudes.length; i++) {
      const diff = altitudes[i] - altitudes[i-1];
      if (diff > 0) {
        altitudeGain += diff;
      } else {
        altitudeLoss += Math.abs(diff);
      }
    }

    return {
      totalPoints: chartData.length,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      maxAltitude: altitudes.length > 0 ? Math.max(...altitudes) : null,
      minAltitude: altitudes.length > 0 ? Math.min(...altitudes) : null,
      altitudeGain,
      altitudeLoss
    };
  }, [chartData]);

  // Reset toutes les données
  const resetAllData = useCallback(() => {
    logger.tracking('Reset données tracking');
    setChartData([]);
    setPointsOfInterest([]);
  }, []);

  // Exporter les données en JSON
  const exportData = useCallback(() => {
    const exportData = {
      chartData,
      pointsOfInterest,
      stats: getDataStats(),
      exportedAt: new Date().toISOString()
    };
    
    logger.tracking('Données exportées', { 
      chartPoints: chartData.length,
      poisCount: pointsOfInterest.length 
    });
    
    return exportData;
  }, [chartData, pointsOfInterest, getDataStats]);

  return {
    // States
    chartData,
    pointsOfInterest,
    
    // Chart data actions
    addChartDataPoint,
    getChartDataForPeriod,
    getDataStats,
    
    // POI actions
    createPointOfInterest,
    deletePointOfInterest,
    updatePointOfInterest,
    getPOIsInArea,
    
    // Utilities
    calculateDistance,
    resetAllData,
    exportData,
    
    // Setters (for external use)
    setChartData,
    setPointsOfInterest
  };
}