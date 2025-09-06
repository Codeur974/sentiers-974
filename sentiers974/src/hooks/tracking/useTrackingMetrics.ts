import { useState, useRef, useCallback } from 'react';
import { logger } from '../../utils/logger';

/**
 * Hook spécialisé pour les métriques de tracking
 * Gère: distance, vitesse, steps, altitude, splits
 */
export function useTrackingMetrics(selectedSport: any) {
  const [distance, setDistance] = useState(0);
  const [steps, setSteps] = useState(0);
  const [instantSpeed, setInstantSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  
  // Altitude metrics
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);
  const [minAltitude, setMinAltitude] = useState<number | null>(null);
  const [maxAltitude, setMaxAltitude] = useState<number | null>(null);
  const [lastAltitude, setLastAltitude] = useState<number | null>(null);
  
  // Splits
  const [splits, setSplits] = useState<Array<{
    km: number;
    time: number;
    duration: number;
    avgSpeed: number;
    type: 'auto' | 'manual';
    timestamp: number;
  }>>([]);
  const [lastSplitDistance, setLastSplitDistance] = useState(0);
  
  // Refs for paused data
  const pausedDistance = useRef(0);
  const pausedSteps = useRef(0);
  
  // Update distance and related metrics
  const updateDistance = useCallback((newDistance: number, currentTime: number) => {
    setDistance(newDistance);
    
    // Auto split every kilometer
    const kmPassed = Math.floor(newDistance / 1000);
    const lastKmPassed = Math.floor(lastSplitDistance / 1000);
    
    if (kmPassed > lastKmPassed) {
      const splitTime = currentTime;
      const splitDistance = kmPassed * 1000;
      const duration = splitTime;
      const splitAvgSpeed = duration > 0 ? (splitDistance / (duration / 3600000)) : 0;
      
      setSplits(prev => [...prev, {
        km: kmPassed,
        time: splitTime,
        duration,
        avgSpeed: splitAvgSpeed,
        type: 'auto',
        timestamp: Date.now()
      }]);
      
      setLastSplitDistance(splitDistance);
      logger.tracking(`Split automatique ${kmPassed}km`, { avgSpeed: splitAvgSpeed.toFixed(2) });
    }
  }, [lastSplitDistance]);
  
  // Update speed metrics
  const updateSpeed = useCallback((speed: number) => {
    setInstantSpeed(speed);
    
    if (speed > maxSpeed) {
      setMaxSpeed(speed);
    }
    
    setSpeedHistory(prev => {
      const newHistory = [...prev, speed];
      // Keep only last 100 speed readings for average
      if (newHistory.length > 100) {
        newHistory.shift();
      }
      
      // Calculate moving average
      const sum = newHistory.reduce((acc, val) => acc + val, 0);
      setAvgSpeed(sum / newHistory.length);
      
      return newHistory;
    });
  }, [maxSpeed]);
  
  // Update altitude metrics
  const updateAltitude = useCallback((altitude: number | null) => {
    if (altitude === null) return;
    
    if (lastAltitude !== null) {
      const altitudeDiff = altitude - lastAltitude;
      if (altitudeDiff > 0) {
        setElevationGain(prev => prev + altitudeDiff);
      } else {
        setElevationLoss(prev => prev + Math.abs(altitudeDiff));
      }
    }
    
    if (minAltitude === null || altitude < minAltitude) {
      setMinAltitude(altitude);
    }
    
    if (maxAltitude === null || altitude > maxAltitude) {
      setMaxAltitude(altitude);
    }
    
    setLastAltitude(altitude);
  }, [lastAltitude, minAltitude, maxAltitude]);
  
  // Manual split creation
  const createManualSplit = useCallback((currentTime: number) => {
    const kmPassed = Math.floor(distance / 1000) + 1;
    const splitAvgSpeed = currentTime > 0 ? (distance / (currentTime / 3600000)) : 0;
    
    setSplits(prev => [...prev, {
      km: kmPassed,
      time: currentTime,
      duration: currentTime,
      avgSpeed: splitAvgSpeed,
      type: 'manual',
      timestamp: Date.now()
    }]);
    
    logger.tracking(`Split manuel ${kmPassed}km`, { avgSpeed: splitAvgSpeed.toFixed(2) });
  }, [distance]);
  
  // Calculate calories based on sport and metrics
  const calculateCalories = useCallback(() => {
    if (!selectedSport) return 0;
    
    const timeInHours = 0; // Will be provided by session hook
    let caloriesPerHour = 300; // Default
    
    switch (selectedSport.name?.toLowerCase()) {
      case 'course':
        caloriesPerHour = 600;
        break;
      case 'vélo':
        caloriesPerHour = 400;
        break;
      case 'marche':
        caloriesPerHour = 250;
        break;
      case 'randonnée':
        caloriesPerHour = 350;
        break;
      default:
        caloriesPerHour = 300;
    }
    
    return Math.round(timeInHours * caloriesPerHour);
  }, [selectedSport]);
  
  // Reset all metrics
  const resetMetrics = useCallback(() => {
    logger.tracking('Reset métriques');
    setDistance(0);
    setSteps(0);
    setInstantSpeed(0);
    setMaxSpeed(0);
    setAvgSpeed(0);
    setSpeedHistory([]);
    setElevationGain(0);
    setElevationLoss(0);
    setMinAltitude(null);
    setMaxAltitude(null);
    setLastAltitude(null);
    setSplits([]);
    setLastSplitDistance(0);
    pausedDistance.current = 0;
    pausedSteps.current = 0;
  }, []);
  
  // Pause handling
  const pauseMetrics = useCallback(() => {
    pausedDistance.current = distance;
    pausedSteps.current = steps;
    logger.tracking('Métriques mises en pause');
  }, [distance, steps]);
  
  const resumeMetrics = useCallback(() => {
    logger.tracking('Métriques reprises');
    // Metrics will continue from where they left off
  }, []);
  
  return {
    // States
    distance,
    steps,
    instantSpeed,
    maxSpeed,
    avgSpeed,
    speedHistory,
    elevationGain,
    elevationLoss,
    minAltitude,
    maxAltitude,
    lastAltitude,
    splits,
    
    // Actions
    updateDistance,
    updateSpeed,
    updateAltitude,
    createManualSplit,
    calculateCalories,
    resetMetrics,
    pauseMetrics,
    resumeMetrics,
    
    // Setters (for external updates)
    setSteps,
    setDistance
  };
}