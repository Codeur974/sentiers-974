import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Filter from "../components/Filter";
import {
  SessionSummary,
  TrackingControls,
  TrackingHeader,
  TrackingStats,
} from "../components/tracking";
import { useTrackingLogic } from "../hooks";

export default function TrackingScreen() {
  const [selectedSport, setSelectedSport] = useState<any>(null);

  // Utiliser le hook de logique de tracking
  const trackingLogic = useTrackingLogic(selectedSport);

  // Gérer le retour à la sélection
  const handleBackToSelection = () => {
    trackingLogic.handleBackToSelection();
    setSelectedSport(null);
  };

  // Si aucun sport sélectionné, afficher le sélecteur
  if (!selectedSport) {
    return (
      <ScrollView className="flex-1 bg-white">
        <View className="p-4">
          <Text className="text-2xl font-bold text-center mb-6 text-gray-800">
            🏃‍♀️ Nouvelle session
          </Text>
          <Filter onSportSelect={setSelectedSport} />
        </View>
      </ScrollView>
    );
  }

  // Si une erreur GPS critique est présente et qu'on n'a pas encore démarré
  if (trackingLogic.locationError && trackingLogic.status === "idle") {
    return (
      <ScrollView className="flex-1 bg-white">
        <View className="p-4">
          <TrackingHeader
            sport={selectedSport}
            status={trackingLogic.status}
            duration={trackingLogic.duration}
            onBackToSelection={handleBackToSelection}
          />
          
          <View className="mb-4 p-6 bg-red-50 rounded-xl border border-red-200">
            <Text className="text-red-700 font-bold text-center text-lg mb-2">
              ⚠️ Erreur GPS
            </Text>
            <Text className="text-red-600 text-center mb-4">
              {trackingLogic.locationError}
            </Text>
            <Text className="text-red-500 text-center text-sm">
              Veuillez activer la géolocalisation dans vos paramètres.
            </Text>
          </View>

          <TrackingControls
            status={trackingLogic.status}
            onStart={trackingLogic.handleStartTracking}
            onPause={trackingLogic.handlePauseTracking}
            onResume={trackingLogic.handleResumeTracking}
            onStop={trackingLogic.handleStopTracking}
            onNewSession={trackingLogic.handleNewSession}
            onBackToSelection={handleBackToSelection}
          />
        </View>
      </ScrollView>
    );
  }

  // Interface de tracking avec sport sélectionné
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <TrackingHeader
          sport={selectedSport}
          status={trackingLogic.status}
          duration={trackingLogic.duration}
          onBackToSelection={handleBackToSelection}
        />

        <TrackingStats
          calories={trackingLogic.calories}
          steps={trackingLogic.steps}
          instantSpeed={trackingLogic.instantSpeed}
          maxSpeed={trackingLogic.maxSpeed}
          distance={trackingLogic.distance}
          watching={trackingLogic.watching}
          coords={trackingLogic.coords}
          address={trackingLogic.address || undefined}
          sportName={selectedSport.nom}
          locationError={trackingLogic.locationError}
        />

        <TrackingControls
          status={trackingLogic.status}
          onStart={trackingLogic.handleStartTracking}
          onPause={trackingLogic.handlePauseTracking}
          onResume={trackingLogic.handleResumeTracking}
          onStop={trackingLogic.handleStopTracking}
          onNewSession={trackingLogic.handleNewSession}
          onBackToSelection={handleBackToSelection}
        />

        {trackingLogic.status === "stopped" && (
          <SessionSummary
            duration={trackingLogic.duration}
            distance={trackingLogic.distance}
            steps={trackingLogic.steps}
            avgSpeed={trackingLogic.avgSpeed}
            calories={trackingLogic.calories}
            sportName={selectedSport.nom}
          />
        )}
      </View>
    </ScrollView>
  );
}