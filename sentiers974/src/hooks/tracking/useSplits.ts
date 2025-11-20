import { useState } from 'react';

interface Split {
  km: number;
  time: number;
  duration: number;
  avgSpeed: number;
  type: 'auto' | 'manual';
  timestamp: number;
}

/**
 * Hook pour gérer les splits (chronométrage par km)
 */
export const useSplits = () => {
  const [splits, setSplits] = useState<Split[]>([]);
  const [lastKmPassed, setLastKmPassed] = useState(0);

  // Créer split automatique à chaque km
  const createAutoSplit = (distance: number, currentTime: number) => {
    const currentKm = Math.floor(distance);

    // Seulement si on a passé un nouveau kilomètre complet
    if (currentKm > lastKmPassed && currentKm > 0) {
      const lastSplitTime = splits.length > 0 ? splits[splits.length - 1].time : 0;
      const splitTime = currentTime - lastSplitTime;

      setSplits(prev => [...prev, {
        km: currentKm,
        time: currentTime,
        duration: splitTime,
        avgSpeed: splitTime > 0 ? (3600000 / splitTime) : 0,
        type: 'auto',
        timestamp: Date.now()
      }]);

      setLastKmPassed(currentKm);
      console.log(`🚴 Split auto ${currentKm}km - Temps: ${(splitTime / 1000).toFixed(0)}s`);
    }
  };

  // Créer split manuel
  const createManualSplit = (distance: number, currentTime: number) => {
    const lastSplitTime = splits.length > 0 ? splits[splits.length - 1].time : 0;
    const splitTime = currentTime - lastSplitTime;

    // Éviter splits trop rapprochés (min 10s)
    if (splitTime < 10000) {
      console.log(`⚠️ Split manuel ignoré - trop rapproché`);
      return;
    }

    const previousSplitDistance = splits.length > 0 ?
      (splits[splits.length - 1].type === 'auto' ? splits[splits.length - 1].km : 0) : 0;
    const distanceSinceLastSplit = distance - previousSplitDistance;

    setSplits(prev => [...prev, {
      km: Math.round(distance * 100) / 100,
      time: currentTime,
      duration: splitTime,
      avgSpeed: splitTime > 0 && distanceSinceLastSplit > 0 ?
        (distanceSinceLastSplit * 3600000 / splitTime) : 0,
      type: 'manual',
      timestamp: Date.now()
    }]);

    console.log(`⏱️ Split manuel - ${distance.toFixed(2)}km`);
  };

  // Statistiques des splits
  const getSplitStats = () => {
    if (splits.length === 0) return null;

    const autoSplits = splits.filter(s => s.type === 'auto');
    if (autoSplits.length === 0) return null;

    const durations = autoSplits.map(s => s.duration);
    const avgSplitTime = durations.reduce((a, b) => a + b, 0) / durations.length;
    const bestSplit = Math.min(...durations);
    const worstSplit = Math.max(...durations);

    return {
      bestSplit,
      worstSplit,
      avgSplitTime,
      totalSplits: splits.length,
      autoSplits: autoSplits.length
    };
  };

  const reset = () => {
    setSplits([]);
    setLastKmPassed(0);
  };

  return {
    splits,
    createAutoSplit,
    createManualSplit,
    getSplitStats,
    reset,
  };
};
