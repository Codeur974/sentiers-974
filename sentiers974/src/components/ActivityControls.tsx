import { Text, TouchableOpacity, View } from "react-native";
import { useSessionStore } from "../store/useSessionStore";

export default function ActivityControls() {
  const {
    status,
    start: startSession,
    stop: stopSession,
    pause: pauseSession,
    resume: resumeSession,
  } = useSessionStore();
  return (
    <View className="items-center">
      <TouchableOpacity
        className={`px-8 py-4 rounded-xl ${
          status === "running" || status === "paused"
            ? "bg-red-600"
            : "bg-green-600"
        }`}
        onPress={() => {
          if (status === "running" || status === "paused") {
            const success = stopSession();
            console.log("Session arrêtée:", success);
          } else {
            const success = startSession();
            console.log("Session démarrée:", success);
          }
        }}
      >
        <Text className="text-white font-bold text-lg text-center">
          Status: {status}
        </Text>
      </TouchableOpacity>
      {status === "running" && (
        <TouchableOpacity
          className="bg-orange-600 px-8 py-4 rounded-xl mt-4"
          onPress={() => {
            const success = pauseSession();
            console.log("Session mise en pause:", success);
          }}
        >
          <Text className="text-white font-bold text-lg text-center">
            Pause
          </Text>
        </TouchableOpacity>
      )}
      {status === "paused" && (
        <TouchableOpacity
          className="bg-blue-600 px-8 py-4 rounded-xl mt-4"
          onPress={() => {
            const success = resumeSession();
            console.log("Session reprise:", success);
          }}
        >
          <Text className="text-white font-bold text-lg text-center">
            Reprendre
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}