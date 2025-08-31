import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import Filter from "../components/Filter";
import Layout from "../components/Layout";
import {
  SessionSummary,
  TrackingControls,
  TrackingHeader,
  TrackingStats,
} from "../components/tracking";
import { useTrackingLogic } from "../hooks";

export default function TrackingScreen() {
  const [selectedSport, setSelectedSport] = useState<any>(null);
  const trackingLogic = useTrackingLogic(selectedSport);

  const handleBackToSelection = () => {
    trackingLogic.handleBackToSelection();
    setSelectedSport(null);
  };

  // Boutons du header
  const headerButtons = selectedSport && trackingLogic.status === "idle" ? (
    <TouchableOpacity
      onPress={handleBackToSelection}
      className="bg-blue-800 px-3 py-1 rounded-lg"
    >
      <Text className="text-white text-sm">🔄</Text>
    </TouchableOpacity>
  ) : null;

  // Boutons du footer selon l'état
  const getFooterButtons = () => {
    if (!selectedSport) return null;

    if (trackingLogic.locationError && trackingLogic.status === "idle") {
      return (
        <TouchableOpacity
          onPress={trackingLogic.handleStartTracking}
          className="bg-green-600 px-6 py-4 rounded-xl"
        >
          <Text className="text-white font-bold text-center text-lg">
            ▶️ Démarrer malgré l'erreur
          </Text>
        </TouchableOpacity>
      );
    }

    if (trackingLogic.status === "idle") {
      return (
        <TouchableOpacity
          onPress={trackingLogic.handleStartTracking}
          className="bg-green-600 px-6 py-4 rounded-xl"
        >
          <Text className="text-white font-bold text-center text-lg">
            ▶️ Démarrer la session
          </Text>
        </TouchableOpacity>
      );
    }

    if (trackingLogic.status === "running") {
      return (
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={trackingLogic.handlePauseTracking}
            className="bg-orange-600 px-4 py-4 rounded-xl flex-1 mr-1"
          >
            <Text className="text-white font-bold text-center">⏸️ Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={trackingLogic.handleStopTracking}
            className="bg-red-600 px-4 py-4 rounded-xl flex-1 ml-1"
          >
            <Text className="text-white font-bold text-center">⏹️ Arrêter</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (trackingLogic.status === "paused") {
      return (
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={trackingLogic.handleResumeTracking}
            className="bg-blue-600 px-4 py-4 rounded-xl flex-1 mr-1"
          >
            <Text className="text-white font-bold text-center">▶️ Reprendre</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={trackingLogic.handleStopTracking}
            className="bg-red-600 px-4 py-4 rounded-xl flex-1 ml-1"
          >
            <Text className="text-white font-bold text-center">⏹️ Terminer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (trackingLogic.status === "stopped") {
      return (
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={trackingLogic.handleNewSession}
            className="bg-green-600 px-4 py-4 rounded-xl flex-1 mr-1"
          >
            <Text className="text-white font-bold text-center">🔄 Refaire</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBackToSelection}
            className="bg-gray-600 px-4 py-4 rounded-xl flex-1 ml-1"
          >
            <Text className="text-white font-bold text-center">⚽ Changer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // Titre du header selon l'état
  const getHeaderTitle = () => {
    if (!selectedSport) return "Sélection du sport";
    if (trackingLogic.status === "running") return `${selectedSport.emoji} En cours`;
    if (trackingLogic.status === "paused") return `${selectedSport.emoji} En pause`;
    if (trackingLogic.status === "stopped") return `${selectedSport.emoji} Terminé`;
    return `${selectedSport.emoji} ${selectedSport.nom}`;
  };

  return (
    <Layout
      headerTitle={getHeaderTitle()}
      showBackButton={!selectedSport}
      headerButtons={headerButtons}
      footerButtons={getFooterButtons()}
    >
      <ScrollView className="flex-1 bg-white">
        <View className="p-4">
          {!selectedSport ? (
            <>
              <Text className="text-2xl font-bold text-center mb-6 text-gray-800">
                🏃‍♀️ Nouvelle session
              </Text>
              <Filter onSportSelect={setSelectedSport} />
            </>
          ) : (
            <>
              {trackingLogic.locationError && trackingLogic.status === "idle" && (
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
              )}

              <TrackingHeader
                sport={selectedSport}
                status={trackingLogic.status}
                duration={trackingLogic.duration}
                onBackToSelection={handleBackToSelection}
              />

              {trackingLogic.status !== "idle" && (
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
              )}

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
            </>
          )}
        </View>
      </ScrollView>
    </Layout>
  );
}