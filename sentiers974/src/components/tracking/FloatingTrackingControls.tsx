import React, { useState } from "react";
import { Text, TouchableOpacity, View, ScrollView } from "react-native";

interface FloatingTrackingControlsProps {
  selectedSport: any;
  trackingLogic: any;
  onBackToSelection: () => void;
}

export default function FloatingTrackingControls({
  selectedSport,
  trackingLogic,
  onBackToSelection,
}: FloatingTrackingControlsProps) {
  const [minimized, setMinimized] = useState(false);
  
  // Debug supprimé - causait trop de logs
  
  if (!selectedSport) return null;

  const getMainButton = () => {
    if (trackingLogic.locationError && trackingLogic.status === "idle") {
      return (
        <TouchableOpacity
          onPress={trackingLogic.handleStartTracking}
          className="bg-green-600 px-4 py-3 rounded-xl flex-1 mr-2"
        >
          <Text className="text-white font-bold text-center">
            ▶️ Démarrer
          </Text>
        </TouchableOpacity>
      );
    }

    if (trackingLogic.status === "idle") {
      return (
        <TouchableOpacity
          onPress={trackingLogic.handleStartTracking}
          className="bg-green-600 px-4 py-3 rounded-xl flex-1 mr-2"
        >
          <Text className="text-white font-bold text-center">
            ▶️ Démarrer
          </Text>
        </TouchableOpacity>
      );
    }

    if (trackingLogic.status === "running") {
      return (
        <TouchableOpacity
          onPress={trackingLogic.handlePauseTracking}
          className="bg-orange-600 px-4 py-3 rounded-xl flex-1 mr-2"
        >
          <Text className="text-white font-bold text-center">⏸️ Pause</Text>
        </TouchableOpacity>
      );
    }

    if (trackingLogic.status === "paused") {
      return (
        <TouchableOpacity
          onPress={trackingLogic.handleResumeTracking}
          className="bg-blue-600 px-4 py-3 rounded-xl flex-1 mr-2"
        >
          <Text className="text-white font-bold text-center">▶️ Reprendre</Text>
        </TouchableOpacity>
      );
    }

    if (trackingLogic.status === "stopped") {
      return (
        <TouchableOpacity
          onPress={trackingLogic.handleNewSession}
          className="bg-green-600 px-4 py-3 rounded-xl flex-1 mr-2"
        >
          <Text className="text-white font-bold text-center">🔄 Refaire</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const getSecondaryButton = () => {
    if (trackingLogic.status === "running" || trackingLogic.status === "paused") {
      return (
        <TouchableOpacity
          onPress={trackingLogic.handleStopTracking}
          className="bg-red-600 px-4 py-3 rounded-xl flex-1"
        >
          <Text className="text-white font-bold text-center">⏹️ Stop</Text>
        </TouchableOpacity>
      );
    }

    if (trackingLogic.status === "stopped") {
      return (
        <TouchableOpacity
          onPress={onBackToSelection}
          className="bg-gray-600 px-4 py-3 rounded-xl flex-1"
        >
          <Text className="text-white font-bold text-center">⚽ Changer</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View className="absolute bottom-4 left-4 right-4 z-30">
      <View className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
        {/* Header avec contrôles */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <View className="flex-row items-center">
            <Text className="text-lg font-bold mr-2">
              {selectedSport.emoji} {selectedSport.nom}
            </Text>
            {trackingLogic.status === "running" && (
              <View className="bg-green-100 px-2 py-1 rounded-full">
                <Text className="text-green-600 text-xs font-medium">EN COURS</Text>
              </View>
            )}
            {trackingLogic.status === "paused" && (
              <View className="bg-orange-100 px-2 py-1 rounded-full">
                <Text className="text-orange-600 text-xs font-medium">PAUSE</Text>
              </View>
            )}
            {trackingLogic.status === "stopped" && (
              <View className="bg-blue-100 px-2 py-1 rounded-full">
                <Text className="text-blue-600 text-xs font-medium">TERMINÉ</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            onPress={() => setMinimized(!minimized)}
            className="bg-gray-200 px-3 py-2 rounded-lg"
          >
            <Text className="text-gray-600 font-bold">
              {minimized ? "⬆️" : "⬇️"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats complètes ou réduites */}
        {!minimized && trackingLogic.status !== "idle" && (
          <ScrollView className="max-h-64">
            <View className="p-4">
              {/* Erreur GPS si présente */}
              {trackingLogic.locationError && (
                <View className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                  <Text className="text-red-700 font-bold text-center mb-1">⚠️ Erreur GPS</Text>
                  <Text className="text-red-600 text-center text-sm">{trackingLogic.locationError}</Text>
                </View>
              )}

              {/* Stats principales */}
              <View className="mb-4">
                <Text className="text-lg font-bold text-center mb-3">
                  ⏱️ {Math.floor(trackingLogic.duration / 60000)}:{String(Math.floor((trackingLogic.duration % 60000) / 1000)).padStart(2, '0')}
                </Text>
                
                <View className="flex-row justify-between mb-3">
                  <View className="items-center flex-1">
                    <Text className="text-2xl font-bold text-blue-600">{trackingLogic.distance.toFixed(2)}</Text>
                    <Text className="text-xs text-gray-500">Distance (km)</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-2xl font-bold text-green-600">{trackingLogic.instantSpeed.toFixed(1)}</Text>
                    <Text className="text-xs text-gray-500">Vitesse actuelle (km/h)</Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-2xl font-bold text-orange-600">{trackingLogic.calories}</Text>
                    <Text className="text-xs text-gray-500">Calories</Text>
                  </View>
                </View>
              </View>

              {/* Stats détaillées */}
              <View className="space-y-3">
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-700">🏃‍♂️ Nombre de pas</Text>
                  <Text className="font-bold">{trackingLogic.steps.toLocaleString()}</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-700">⚡ Vitesse max</Text>
                  <Text className="font-bold">{trackingLogic.maxSpeed.toFixed(1)} km/h</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-700">📊 Vitesse moyenne totale</Text>
                  <Text className="font-bold">{trackingLogic.avgSpeed.toFixed(1)} km/h</Text>
                </View>
                
                
                {trackingLogic.coords && (
                  <>
                    <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                      <Text className="text-gray-700">🎯 Précision GPS</Text>
                      <Text className="font-bold">±{trackingLogic.coords.accuracy?.toFixed(0) || '?'}m</Text>
                    </View>
                    
                    {trackingLogic.coords.altitude && (
                      <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                        <Text className="text-gray-700">⛰️ Altitude</Text>
                        <Text className="font-bold">{trackingLogic.coords.altitude.toFixed(0)}m</Text>
                      </View>
                    )}
                  </>
                )}
                
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-700">🛣️ Points GPS</Text>
                  <Text className="font-bold">{trackingLogic.trackingPath?.length || 0}</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-700">📡 GPS actif</Text>
                  <Text className="font-bold">{trackingLogic.watching ? "✅ Oui" : "❌ Non"}</Text>
                </View>
                
                
                {trackingLogic.address && (
                  <View className="py-2">
                    <Text className="text-gray-700 mb-1">📍 Position</Text>
                    <Text className="text-sm text-gray-600">{trackingLogic.address}</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Vue minimisée */}
        {minimized && trackingLogic.status !== "idle" && (
          <View className="px-4 py-2">
            <View className="flex-row justify-between items-center">
              <Text className="font-bold">
                ⏱️ {Math.floor(trackingLogic.duration / 60000)}:{String(Math.floor((trackingLogic.duration % 60000) / 1000)).padStart(2, '0')}
              </Text>
              <Text className="font-bold">📏 {trackingLogic.distance.toFixed(2)} km</Text>
              <Text className="font-bold">🏃 {trackingLogic.instantSpeed.toFixed(1)} km/h</Text>
              <Text className="font-bold">🔥 {trackingLogic.calories} kcal</Text>
            </View>
          </View>
        )}

        {/* Message de démarrage */}
        {trackingLogic.status === "idle" && (
          <View className="px-4 py-3">
            <Text className="text-center text-gray-600">
              Appuyez sur ▶️ pour commencer votre session {selectedSport.nom}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}