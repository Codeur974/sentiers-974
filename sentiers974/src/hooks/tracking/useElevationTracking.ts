import { useState, useEffect } from 'react';

/**
 * Hook pour gérer le dénivelé
 * Adapté pour La Réunion (0-3070m)
 */
export const useElevationTracking = (coords: any, status: string) => {
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);
  const [minAltitude, setMinAltitude] = useState<number | null>(null);
  const [maxAltitude, setMaxAltitude] = useState<number | null>(null);
  const [lastAltitude, setLastAltitude] = useState<number | null>(null);

  useEffect(() => {
    if (!coords?.altitude || status !== 'running') return;

    // Initialiser min/max au premier point
    if (minAltitude === null || maxAltitude === null) {
      setMinAltitude(coords.altitude);
      setMaxAltitude(coords.altitude);
      setLastAltitude(coords.altitude);
      return;
    }

    // Mettre à jour min/max
    if (coords.altitude < minAltitude) setMinAltitude(coords.altitude);
    if (coords.altitude > maxAltitude) setMaxAltitude(coords.altitude);

    // Calculer gain/perte avec seuil adaptatif selon altitude
    if (lastAltitude !== null) {
      const altitudeDiff = coords.altitude - lastAltitude;

      // Seuil adaptatif pour La Réunion (variations pression atmosphérique)
      let threshold = 1; // Base: 1m
      if (coords.altitude > 2000) {
        threshold = 3; // Haute montagne: 3m (Piton des Neiges, Maïdo)
      } else if (coords.altitude > 1000) {
        threshold = 2; // Moyenne montagne: 2m (Cilaos, volcans)
      }

      if (Math.abs(altitudeDiff) > threshold) {
        if (altitudeDiff > 0) {
          setElevationGain(prev => prev + altitudeDiff);
        } else {
          setElevationLoss(prev => prev + Math.abs(altitudeDiff));
        }
      }
    }

    setLastAltitude(coords.altitude);
  }, [coords, status]);

  const reset = () => {
    setElevationGain(0);
    setElevationLoss(0);
    setMinAltitude(null);
    setMaxAltitude(null);
    setLastAltitude(null);
  };

  const hydrate = (data: { elevationGain?: number; elevationLoss?: number; minAltitude?: number | null; maxAltitude?: number | null; lastAltitude?: number | null }) => {
    if (data.elevationGain !== undefined) setElevationGain(data.elevationGain);
    if (data.elevationLoss !== undefined) setElevationLoss(data.elevationLoss);
    if (data.minAltitude !== undefined) setMinAltitude(data.minAltitude);
    if (data.maxAltitude !== undefined) setMaxAltitude(data.maxAltitude);
    if (data.lastAltitude !== undefined) setLastAltitude(data.lastAltitude);
  };

  return {
    elevationGain,
    elevationLoss,
    minAltitude,
    maxAltitude,
    hydrate,
    reset,
  };
};
