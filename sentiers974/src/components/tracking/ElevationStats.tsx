import React from "react";
import { View, Text } from "react-native";

interface ElevationStatsProps {
  elevationGain: number;
  elevationLoss: number;
  minAltitude: number | null;
  maxAltitude: number | null;
  currentAltitude?: number | null;
}

export default function ElevationStats({ 
  elevationGain, 
  elevationLoss, 
  minAltitude, 
  maxAltitude,
  currentAltitude 
}: ElevationStatsProps) {
  return (
    <>
      <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
        <Text className="text-gray-700">📈 Dénivelé +</Text>
        <Text className="font-bold">+{elevationGain.toFixed(0)}m</Text>
      </View>
      
      <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
        <Text className="text-gray-700">📉 Dénivelé -</Text>
        <Text className="font-bold">-{elevationLoss.toFixed(0)}m</Text>
      </View>
      
      {minAltitude !== null && maxAltitude !== null && (
        <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
          <Text className="text-gray-700">🏔️ Altitude min/max</Text>
          <Text className="font-bold">{minAltitude.toFixed(0)}m / {maxAltitude.toFixed(0)}m</Text>
        </View>
      )}
      
      {currentAltitude && (
        <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
          <Text className="text-gray-700">⛰️ Altitude actuelle</Text>
          <Text className="font-bold">{currentAltitude.toFixed(0)}m</Text>
        </View>
      )}
    </>
  );
}