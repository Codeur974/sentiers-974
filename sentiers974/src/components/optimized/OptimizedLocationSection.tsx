import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { logger } from '../../utils/logger';

interface LocationSectionProps {
  coords: any;
  address: string;
  isLocating: boolean;
  locationError: string | null;
  onGetLocation: () => void;
  permission: string | null;
}

/**
 * Version optimisée de LocationSection avec React.memo
 * Évite les re-renders inutiles lors des changements de state
 */
const OptimizedLocationSection = React.memo(function LocationSection({
  coords,
  address,
  isLocating,
  locationError,
  onGetLocation,
  permission
}: LocationSectionProps) {
  logger.debug('Render LocationSection', { 
    hasCoords: !!coords, 
    isLocating, 
    hasError: !!locationError 
  }, 'PERF');

  const renderLocationStatus = () => {
    if (permission === 'denied') {
      return (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <Text className="text-red-700 font-semibold text-center mb-2">
            🚫 Permission refusée
          </Text>
          <Text className="text-red-600 text-center text-sm">
            Activez la localisation dans les paramètres de l'app
          </Text>
        </View>
      );
    }

    if (locationError) {
      return (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <Text className="text-red-700 font-semibold text-center mb-2">
            ⚠️ Erreur de localisation
          </Text>
          <Text className="text-red-600 text-center text-sm">
            {locationError}
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderLocationInfo = () => {
    if (coords) {
      return (
        <View className="bg-green-50 border border-green-200 rounded-xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-green-700 font-semibold">
              📍 Position actuelle
            </Text>
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-green-700 text-xs font-medium">
                GPS actif
              </Text>
            </View>
          </View>
          
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Latitude:</Text>
              <Text className="text-gray-900 font-mono">
                {coords.latitude?.toFixed(6)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Longitude:</Text>
              <Text className="text-gray-900 font-mono">
                {coords.longitude?.toFixed(6)}
              </Text>
            </View>
            {coords.altitude && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Altitude:</Text>
                <Text className="text-gray-900 font-mono">
                  {Math.round(coords.altitude)}m
                </Text>
              </View>
            )}
            {coords.accuracy && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Précision:</Text>
                <Text className="text-gray-900 font-mono">
                  ±{Math.round(coords.accuracy)}m
                </Text>
              </View>
            )}
          </View>
          
          {address && (
            <View className="mt-3 pt-3 border-t border-green-200">
              <Text className="text-gray-600 text-sm">
                📍 {address}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <Text className="text-gray-600 text-center">
          📍 Aucune position disponible
        </Text>
        <Text className="text-gray-500 text-center text-sm mt-1">
          Appuyez sur le bouton pour localiser
        </Text>
      </View>
    );
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900">
          🌍 Localisation
        </Text>
        
        <TouchableOpacity
          className={`px-4 py-2 rounded-xl ${
            isLocating ? 'bg-gray-300' : 'bg-blue-500'
          }`}
          onPress={onGetLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#666" />
              <Text className="text-gray-600 ml-2 font-medium">
                Localisation...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-medium">
              📍 Localiser
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {renderLocationStatus()}
      {renderLocationInfo()}
    </View>
  );
});

export default OptimizedLocationSection;