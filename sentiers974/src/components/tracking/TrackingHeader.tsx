import { Text, TouchableOpacity, View } from "react-native";
import { formatTime, getStatusText } from "../../utils";

interface TrackingHeaderProps {
  sport: {
    emoji: string;
    nom: string;
    description: string;
  };
  status: string;
  duration: number;
  onBackToSelection: () => void;
}

export default function TrackingHeader({
  sport,
  status,
  duration,
  onBackToSelection,
}: TrackingHeaderProps) {

  return (
    <>
      {/* Header avec sport */}
      <View className="bg-blue-50 p-4 rounded-xl mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl">{sport.emoji}</Text>
          {status === "idle" && (
            <TouchableOpacity onPress={onBackToSelection}>
              <Text className="text-blue-600">← Changer</Text>
            </TouchableOpacity>
          )}
          {status !== "idle" && (
            <Text className="text-gray-400 text-sm">Sport verrouillé</Text>
          )}
        </View>
        <Text className="text-xl font-bold text-gray-800">{sport.nom}</Text>
        <Text className="text-gray-600">{sport.description}</Text>
      </View>

      {/* Chronomètre principal */}
      <View className="bg-gray-50 p-8 rounded-xl mb-6 items-center">
        <Text className="text-4xl font-mono font-bold text-gray-800 mb-2">
          {formatTime(duration)}
        </Text>
        <Text className="text-gray-600">{getStatusText(status)}</Text>
      </View>
    </>
  );
}