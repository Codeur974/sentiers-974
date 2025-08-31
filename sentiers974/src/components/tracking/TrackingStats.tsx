import { Text, View } from "react-native";
import { getSportType, getSportMetrics } from "../../utils";

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

export default function TrackingStats({
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

      {/* Stats principales adaptées au sport */}
      <View className="flex-row mb-4">
        <View className="flex-1 bg-green-50 p-3 rounded-xl mr-1">
          <Text className="text-green-600 font-semibold text-center text-sm">
            {metrics.primary.icon} {metrics.primary.label}
          </Text>
          <Text className="text-lg font-bold text-center text-green-800">
            {getMetricValue(metrics.primary.key)}
          </Text>
        </View>
        
        <View className="flex-1 bg-blue-50 p-3 rounded-xl mx-1">
          <Text className="text-blue-600 font-semibold text-center text-sm">
            {metrics.secondary.icon} {metrics.secondary.label}
          </Text>
          <Text className="text-lg font-bold text-center text-blue-800">
            {getMetricValue(metrics.secondary.key)}
          </Text>
          {metrics.secondary.key === 'maxSpeed' && (
            <Text className="text-xs text-center text-blue-600">km/h max</Text>
          )}
        </View>
        
        <View className="flex-1 bg-orange-50 p-3 rounded-xl ml-1">
          <Text className="text-orange-600 font-semibold text-center text-sm">
            {metrics.tertiary.icon} {metrics.tertiary.label}
          </Text>
          <Text className="text-lg font-bold text-center text-orange-800">
            {getMetricValue(metrics.tertiary.key)}
          </Text>
          <Text className="text-xs text-center text-orange-600">
            km/h instant.
          </Text>
        </View>
      </View>

      {/* Distance et position avec précision GPS */}
      <View className="flex-row mb-6">
        <View className="flex-1 bg-purple-50 p-4 rounded-xl mr-2">
          <Text className="text-purple-600 font-semibold text-center">
            📏 Distance
          </Text>
          <Text className="text-xl font-bold text-center text-purple-800">
            {distance.toFixed(2)} km
          </Text>
        </View>
        <View className="flex-1 bg-gray-50 p-4 rounded-xl ml-2">
          <Text className="text-gray-600 font-semibold text-center">
            📍 GPS
          </Text>
          <Text
            className={`text-sm font-bold text-center ${
              watching && coords
                ? "text-green-800"
                : watching
                ? "text-orange-800"
                : "text-red-800"
            }`}
          >
            {watching && coords
              ? `Actif (±${coords.accuracy?.toFixed(0) || "?"}m)`
              : watching
              ? "Recherche..."
              : "Inactif"}
          </Text>
          {address && (
            <Text className="text-xs text-center text-gray-600 mt-1">
              {address}
            </Text>
          )}
        </View>
      </View>
    </>
  );
}