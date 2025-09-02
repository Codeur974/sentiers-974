import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { TrackingControls, TrackingHeader, TrackingStats, SessionSummary } from ".";

interface TrackingModalProps {
  visible: boolean;
  selectedSport: any;
  trackingLogic: any;
  onBackToSelection: () => void;
  onClose: () => void;
}

export default function TrackingModal({
  visible,
  selectedSport,
  trackingLogic,
  onBackToSelection,
  onClose,
}: TrackingModalProps) {
  const [minimized, setMinimized] = useState(false);
  const { height } = Dimensions.get('window');
  
  const modalHeight = minimized ? height * 0.3 : height * 0.8;

  if (!visible || !selectedSport) return null;

  const getFooterButtons = () => {
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
            onPress={onBackToSelection}
            className="bg-gray-600 px-4 py-4 rounded-xl flex-1 ml-1"
          >
            <Text className="text-white font-bold text-center">⚽ Changer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // Si pas visible, ne rien rendre pour éviter de bloquer les interactions
  if (!visible) return null;

  return (
    <View 
      className="absolute inset-0 z-50"
      style={{ pointerEvents: 'box-none' }} // Permet aux événements de passer à travers les zones transparentes
    >
      {/* Overlay semi-transparent cliquable pour fermer */}
      <TouchableOpacity 
        className="flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        onPress={onClose}
        activeOpacity={1}
      />
      
      {/* Contenu de la modale */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl"
        style={{ 
          height: modalHeight,
          pointerEvents: 'auto' // Force les interactions sur la modale
        }}
      >
        {/* Header de la modale avec contrôles de réduction */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <View className="flex-row items-center">
            <Text className="text-xl font-bold">
              {selectedSport.emoji} {selectedSport.nom}
            </Text>
            {trackingLogic.status === "running" && (
              <View className="ml-2 px-2 py-1 bg-green-100 rounded-full">
                <Text className="text-green-600 text-xs font-medium">EN COURS</Text>
              </View>
            )}
          </View>
          
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => setMinimized(!minimized)}
              className="bg-gray-200 px-3 py-2 rounded-lg"
            >
              <Text className="text-gray-600 font-bold">
                {minimized ? "⬆️" : "⬇️"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onClose}
              className="bg-red-100 px-3 py-2 rounded-lg"
            >
              <Text className="text-red-600 font-bold">✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenu de la modale */}
        <ScrollView className="flex-1">
          <View className="p-4">
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

            {!minimized && (
              <>
                <TrackingHeader
                  sport={selectedSport}
                  status={trackingLogic.status}
                  duration={trackingLogic.duration}
                  onBackToSelection={onBackToSelection}
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
            
            {/* Affichage minimal en mode réduit */}
            {minimized && (
              <View className="py-2">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-lg font-semibold">
                    {trackingLogic.status === "running" && "🏃‍♂️ En cours"}
                    {trackingLogic.status === "paused" && "⏸️ En pause"}
                    {trackingLogic.status === "stopped" && "✅ Terminé"}
                    {trackingLogic.status === "idle" && "🚀 Prêt"}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {Math.floor(trackingLogic.duration / 60000)}:{String(Math.floor((trackingLogic.duration % 60000) / 1000)).padStart(2, '0')}
                  </Text>
                </View>
                
                {trackingLogic.status !== "idle" && (
                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <Text className="text-xs text-gray-500">Distance</Text>
                      <Text className="font-bold">{trackingLogic.distance.toFixed(2)} km</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-xs text-gray-500">Vitesse</Text>
                      <Text className="font-bold">{trackingLogic.instantSpeed.toFixed(1)} km/h</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-xs text-gray-500">Calories</Text>
                      <Text className="font-bold">{trackingLogic.calories} kcal</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer avec boutons d'action */}
        <View className="p-4 border-t border-gray-200">
          {getFooterButtons()}
        </View>
      </View>
    </View>
  );
}