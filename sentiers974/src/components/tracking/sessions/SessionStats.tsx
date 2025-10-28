import React from 'react';
import { View, Text } from 'react-native';

interface SessionPerformance {
  distance: number;
  duration: number;
  calories: number;
  avgSpeed: number;
  maxSpeed: number;
  steps: number;
  sport: string;
  sessionId: string;
  timestamp: number;
}

interface SessionStatsProps {
  performance: SessionPerformance;
}

export const SessionStats: React.FC<SessionStatsProps> = ({ performance }) => {
  const formatDuration = (milliseconds: number) => {
    if (milliseconds === 0) return '0min';
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  };

  return (
    <>
      {/* Stats principales */}
      <View className="flex-row justify-between mb-2">
        <View className="items-center flex-1">
          <Text className="text-lg font-bold text-blue-700">
            {performance.distance.toFixed(1)}
          </Text>
          <Text className="text-xs text-gray-600">km</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-lg font-bold text-green-600">
            {formatDuration(performance.duration)}
          </Text>
          <Text className="text-xs text-gray-600">temps</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-lg font-bold text-orange-600">
            {performance.calories}
          </Text>
          <Text className="text-xs text-gray-600">cal</Text>
        </View>
      </View>

      {/* Détails session */}
      <View className="flex-row justify-between pt-2 border-t border-green-200">
        <Text className="text-xs text-gray-600">
          ⚡ {performance.avgSpeed.toFixed(1)} km/h moy
        </Text>
        <Text className="text-xs text-gray-600">
          🚀 {performance.maxSpeed.toFixed(1)} km/h max
        </Text>
        <Text className="text-xs text-gray-600">
          🚶 {performance.steps.toLocaleString()} pas
        </Text>
      </View>
    </>
  );
};