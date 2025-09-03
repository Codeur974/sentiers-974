import React from "react";
import { View, Text } from "react-native";

interface ChartData {
  time: number;
  altitude: number | null;
  speed: number;
  distance: number;
  timestamp: number;
}

interface PerformanceChartsProps {
  chartData: ChartData[];
  duration: number;
}

export default function PerformanceCharts({ chartData, duration }: PerformanceChartsProps) {
  if (chartData.length < 3) {
    return (
      <View className="bg-gray-50 p-3 rounded-lg mb-3">
        <Text className="text-center text-gray-500 text-sm">
          📊 Collecte des données en cours...
        </Text>
      </View>
    );
  }

  // Données altitude
  const altitudes = chartData.filter(d => d.altitude !== null).map(d => d.altitude!);
  const hasAltitude = altitudes.length > 0;
  const minAlt = hasAltitude ? Math.min(...altitudes) : 0;
  const maxAlt = hasAltitude ? Math.max(...altitudes) : 0;

  // Données vitesse
  const speeds = chartData.map(d => d.speed);
  const maxSpeed = Math.max(...speeds);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  return (
    <View>
      {/* Graphique Altitude */}
      {hasAltitude && (
        <View className="bg-blue-50 p-3 rounded-lg mb-3 border border-blue-200">
          <Text className="text-gray-700 mb-2 font-bold">📈 Profil altitude</Text>
          <View className="bg-white p-2 rounded">
            <View className="flex-row items-end" style={{ height: 40 }}>
              {chartData.slice(-15).map((point, index) => {
                if (!point.altitude) return <View key={index} className="flex-1" />;
                
                const range = maxAlt - minAlt || 1;
                const height = Math.max(((point.altitude - minAlt) / range) * 35, 2);
                
                return (
                  <View key={index} className="flex-1 items-center">
                    <View className="bg-blue-600 w-1 rounded-t" style={{ height }} />
                  </View>
                );
              })}
            </View>
            <Text className="text-xs text-center text-blue-700 mt-2">
              {minAlt.toFixed(0)}m → {maxAlt.toFixed(0)}m (+{(maxAlt - minAlt).toFixed(0)}m)
            </Text>
          </View>
        </View>
      )}

      {/* Graphique Vitesse */}
      <View className="bg-green-50 p-3 rounded-lg mb-3 border border-green-200">
        <Text className="text-gray-700 mb-2 font-bold">🏃‍♂️ Évolution vitesse</Text>
        <View className="bg-white p-2 rounded">
          <View className="flex-row items-end" style={{ height: 40 }}>
            {chartData.slice(-15).map((point, index) => {
              const height = Math.max((point.speed / maxSpeed) * 35, 1);
              
              let color = 'bg-yellow-500';
              if (point.speed > avgSpeed * 1.3) color = 'bg-green-600';
              if (point.speed < avgSpeed * 0.7) color = 'bg-red-500';
              
              return (
                <View key={index} className="flex-1 items-center">
                  <View className={`w-1 rounded-t ${color}`} style={{ height }} />
                </View>
              );
            })}
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-xs text-green-700">Max: {maxSpeed.toFixed(1)}km/h</Text>
            <Text className="text-xs text-green-700">Moy: {avgSpeed.toFixed(1)}km/h</Text>
          </View>
        </View>
      </View>

      <Text className="text-xs text-center text-gray-400">
        📊 {chartData.length} points • Dernières 15 mesures
      </Text>
    </View>
  );
}