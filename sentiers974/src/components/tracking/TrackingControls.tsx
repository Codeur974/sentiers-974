import { Text, TouchableOpacity, View } from "react-native";

interface TrackingControlsProps {
  status: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNewSession: () => void;
  onBackToSelection: () => void;
}

export default function TrackingControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onNewSession,
  onBackToSelection,
}: TrackingControlsProps) {
  return (
    <View className="space-y-3">
      {status === "idle" && (
        <TouchableOpacity
          className="bg-green-600 p-4 rounded-xl"
          onPress={onStart}
        >
          <Text className="text-white font-bold text-center text-lg">
            ▶️ Démarrer la session
          </Text>
        </TouchableOpacity>
      )}

      {status === "running" && (
        <>
          <TouchableOpacity
            className="bg-orange-600 p-4 rounded-xl"
            onPress={onPause}
          >
            <Text className="text-white font-bold text-center text-lg">
              ⏸️ Mettre en pause
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-600 p-4 rounded-xl"
            onPress={onStop}
          >
            <Text className="text-white font-bold text-center text-lg">
              ⏹️ Arrêter la session
            </Text>
          </TouchableOpacity>
        </>
      )}

      {status === "paused" && (
        <>
          <TouchableOpacity
            className="bg-blue-600 p-4 rounded-xl"
            onPress={onResume}
          >
            <Text className="text-white font-bold text-center text-lg">
              ▶️ Reprendre
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-600 p-4 rounded-xl"
            onPress={onStop}
          >
            <Text className="text-white font-bold text-center text-lg">
              ⏹️ Terminer la session
            </Text>
          </TouchableOpacity>
        </>
      )}

      {status === "stopped" && (
        <>
          <TouchableOpacity
            className="bg-green-600 p-4 rounded-xl"
            onPress={onNewSession}
          >
            <Text className="text-white font-bold text-center text-lg">
              🔄 Refaire ce sport
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-gray-600 p-4 rounded-xl"
            onPress={onBackToSelection}
          >
            <Text className="text-white font-bold text-center text-lg">
              ⚽ Changer de sport
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}