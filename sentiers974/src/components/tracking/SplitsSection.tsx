import React from "react";
import { View, Text } from "react-native";

interface Split {
  km: number;
  time: number;
  duration: number;
  avgSpeed: number;
  type: 'auto' | 'manual';
  timestamp: number;
}

interface SplitStats {
  bestSplit: number;
  worstSplit: number;
  avgSplitTime: number;
  totalSplits: number;
  autoSplits: number;
}

interface SplitsSectionProps {
  splits: Split[];
  splitStats: SplitStats | null;
}

export default function SplitsSection({ splits, splitStats }: SplitsSectionProps) {
  if (!splits || splits.length === 0) {
    return null;
  }

  return (
    <>
      <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
        <Text className="text-gray-700">⏱️ Splits totaux</Text>
        <Text className="font-bold">{splits.length}</Text>
      </View>
      
      {splitStats && (
        <>
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <Text className="text-gray-700">🏆 Meilleur split</Text>
            <Text className="font-bold text-green-600">
              {Math.floor(splitStats.bestSplit / 60000)}:{String(Math.floor((splitStats.bestSplit % 60000) / 1000)).padStart(2, '0')}
            </Text>
          </View>
          
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <Text className="text-gray-700">📊 Split moyen</Text>
            <Text className="font-bold">
              {Math.floor(splitStats.avgSplitTime / 60000)}:{String(Math.floor((splitStats.avgSplitTime % 60000) / 1000)).padStart(2, '0')}
            </Text>
          </View>
        </>
      )}
      
      {/* Derniers splits */}
      <View className="py-2">
        <Text className="text-gray-700 mb-2 font-bold">📋 Derniers splits</Text>
        {splits.slice(-3).map((split, index) => (
          <View key={split.timestamp} className="flex-row justify-between items-center py-1">
            <Text className="text-sm text-gray-600">
              {split.type === 'auto' ? `${split.km}km` : `${split.km.toFixed(2)}km`}
              {split.type === 'manual' && ' 👆'}
            </Text>
            <View className="flex-row items-center space-x-2">
              <Text className="text-sm font-bold">
                {Math.floor(split.duration / 60000)}:{String(Math.floor((split.duration % 60000) / 1000)).padStart(2, '0')}
              </Text>
              {split.avgSpeed > 0 && (
                <Text className="text-xs text-blue-600">
                  {split.avgSpeed.toFixed(1)}km/h
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </>
  );
}