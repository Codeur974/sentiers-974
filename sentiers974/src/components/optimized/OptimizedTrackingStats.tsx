import React from 'react';
import { Text, View } from "react-native";
import { getSportType, getSportMetrics } from "../../utils";
import { logger } from '../../utils/logger';

interface TrackingStatsProps {
  calories: number;
  steps: number;
  instantSpeed: number;
  maxSpeed: number;
  distance: number;
  watching: boolean;
  coords: any;
  address?: string;
  sportName: string;
  locationError?: string | null;
}

/**
 * Version optimisée de TrackingStats avec React.memo
 * Évite les re-renders inutiles lors des mises à jour de position
 */
const OptimizedTrackingStats = React.memo(function TrackingStats({
  calories,
  steps,
  instantSpeed,
  maxSpeed,
  distance,
  watching,
  coords,
  address,
  sportName,
  locationError,
}: TrackingStatsProps) {
  logger.debug('Render TrackingStats', { sportName, distance }, 'PERF');
  
  const sportType = getSportType(sportName);
  const metrics = getSportMetrics(sportType);
  
  const getMetricValue = (key: string) => {
    switch (key) {
      case 'calories': return calories;
      case 'steps': return Math.round(steps);
      case 'instantSpeed': return instantSpeed.toFixed(1);
      case 'maxSpeed': return maxSpeed.toFixed(1);
      default: return '0';
    }
  };

  return (
    <>
      {/* Affichage de l'erreur GPS si elle existe */}
      {locationError && (
        <View className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
          <Text className="text-red-700 font-semibold text-center">
            ⚠️ Erreur GPS
          </Text>
          <Text className="text-red-600 text-center text-sm mt-1">
            {locationError}
          </Text>
        </View>
      )}

      {/* Stats principales */}
      <View className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <View className="p-5">
          <View className="grid grid-cols-2 gap-4">
            <View className="text-center">
              <Text className="text-3xl font-bold text-blue-600 mb-1">
                {(distance / 1000).toFixed(2)}
              </Text>
              <Text className="text-gray-600 font-medium">km</Text>
            </View>
            
            <View className="text-center">
              <Text className="text-3xl font-bold text-green-600 mb-1">
                {instantSpeed.toFixed(1)}
              </Text>
              <Text className="text-gray-600 font-medium">km/h</Text>
            </View>
            
            {/* Métriques spécifiques au sport */}
            {metrics.map((metric, index) => (
              <View key={index} className="text-center">
                <Text className="text-2xl font-bold text-purple-600 mb-1">
                  {getMetricValue(metric.key)}
                </Text>
                <Text className="text-gray-600 font-medium text-sm">
                  {metric.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Informations de localisation */}
        {coords && (
          <View className="px-5 pb-4 pt-2 border-t border-gray-100">
            <View className="flex-row items-center justify-center">
              <Text className={`text-sm font-medium ${watching ? 'text-green-600' : 'text-gray-500'}`}>
                {watching ? '📡 GPS actif' : '📡 GPS inactif'}
              </Text>
              {coords.accuracy && (
                <Text className="text-xs text-gray-500 ml-2">
                  ±{Math.round(coords.accuracy)}m
                </Text>
              )}
            </View>
            {address && (
              <Text className="text-xs text-gray-500 text-center mt-1" numberOfLines={1}>
                📍 {address}
              </Text>
            )}
          </View>
        )}
      </View>
    </>
  );
});

export default OptimizedTrackingStats;