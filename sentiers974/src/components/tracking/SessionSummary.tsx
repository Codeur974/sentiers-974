import { Text, View } from "react-native";
import { formatTime } from "../../utils";

interface SessionSummaryProps {
  duration: number;
  distance: number;
  steps: number;
  avgSpeed: number;
  calories: number;
  sportName: string;
}

export default function SessionSummary({
  duration,
  distance,
  steps,
  avgSpeed,
  calories,
  sportName,
}: SessionSummaryProps) {

  return (
    <View className="mt-6 p-4 bg-gray-50 rounded-xl">
      <Text className="text-lg font-bold text-center mb-3 text-gray-800">
        📊 Résumé de la session
      </Text>
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Durée:</Text>
        <Text className="font-semibold">{formatTime(duration)}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Distance:</Text>
        <Text className="font-semibold">{distance.toFixed(2)} km</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Pas effectués:</Text>
        <Text className="font-semibold">{Math.round(steps)} pas</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Vitesse moyenne:</Text>
        <Text className="font-semibold">{avgSpeed.toFixed(1)} km/h</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Calories brûlées:</Text>
        <Text className="font-semibold">{calories} cal</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-gray-600">Sport:</Text>
        <Text className="font-semibold">{sportName}</Text>
      </View>
    </View>
  );
}