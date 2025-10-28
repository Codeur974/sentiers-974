import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useHomeLocation } from "../../hooks";
import { formatTimestamp } from "../../utils/timeFormatter";
import EnhancedMapView from "../map/EnhancedMapView";

export default function LocationSection() {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Hook personnalisé qui encapsule toute la logique
  const {
    coords,
    address,
    showMap,
    isLocating,
    error,
    getLocation,
    toggleMap,
    setShowMap
  } = useHomeLocation();

  // Plus de logique compliquée - on laisse HomeScreen gérer les resets
  useFocusEffect(
    useCallback(() => {
      console.log("🏠 LocationSection focus");
    }, [])
  );



  return (
    <View className="p-4 bg-white rounded-2xl shadow-lg mb-6">
      <View className="flex-row justify-between items-center mb-3">
        <View
          className={`px-3 py-1 rounded-full ${
            isLocating
              ? "bg-orange-100"
              : coords
              ? "bg-green-100"
              : "bg-blue-100"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              isLocating
                ? "text-orange-600"
                : coords
                ? "text-green-600"
                : "text-blue-600"
            }`}
          >
            {isLocating ? "Recherche..." : coords ? "Localisé" : "Volcan"}
          </Text>
        </View>
      </View>


      {/* Carte - toujours affichée avec La Réunion par défaut */}
      {showMap && (
        <View className="mb-4 h-64 rounded-xl overflow-hidden">
          {coords ? (
            <EnhancedMapView
              coords={coords}
              address={address || "Position actuelle"}
              isVisible={true}
              onToggle={() => setShowMap(false)}
              trackingPath={[]}
              isTracking={false}
              showControls={false}
            />
          ) : (
            <EnhancedMapView
              coords={{ latitude: -21.2447, longitude: 55.7081, timestamp: Date.now() }}
              address="Piton de la Fournaise - Volcan actif"
              isVisible={true}
              onToggle={() => setShowMap(false)}
              trackingPath={[]}
              isTracking={false}
              showControls={false}
            />
          )}
        </View>
      )}

      <View className="flex-row justify-center" style={{ gap: 60 }}>
        <TouchableOpacity
          disabled={isLocating}
          onPress={getLocation}
          className="items-center"
        >
          <Text 
            className={`text-3xl ${isLocating ? "text-gray-400" : "text-gray-800"}`}
            style={{ 
              textShadowColor: 'rgba(0, 0, 0, 0.3)', 
              textShadowOffset: { width: 1, height: 1 }, 
              textShadowRadius: 1 
            }}
          >
            {isLocating ? "⏳" : "⌖"}
          </Text>
          <Text className={`text-xs mt-2 ${isLocating ? "text-gray-400" : "text-gray-600"}`}>
            {isLocating ? "Recherche..." : "Me localiser"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleMap}
          className="items-center"
        >
          <Text 
            className={`text-3xl ${showMap ? "text-gray-600" : "text-blue-600"}`}
            style={{ 
              textShadowColor: 'rgba(0, 0, 0, 0.3)', 
              textShadowOffset: { width: 1, height: 1 }, 
              textShadowRadius: 1 
            }}
          >
            {showMap ? "⨯" : "🗺️"}
          </Text>
          <Text className={`text-xs mt-2 ${showMap ? "text-gray-600" : "text-blue-600"}`}>
            {showMap ? "Fermer" : "Carte"}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View className="mt-3 p-3 bg-red-50 rounded-lg">
          <Text className="text-red-600 text-sm text-center">
            ❌ {error}
          </Text>
        </View>
      )}

      {coords && (
        <View className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1">
          <Text className="text-sm font-medium text-gray-700">
            📍 {address || "Localisation en cours..."}
          </Text>
          {coords.altitude && (
            <Text className="text-xs text-gray-600">
              ⛰️ Altitude: {coords.altitude.toFixed(0)}m
            </Text>
          )}
          {coords.accuracy && (
            <Text className="text-xs text-gray-600">
              🎯 Précision: ±{coords.accuracy.toFixed(0)}m
            </Text>
          )}
          <Text className="text-xs text-gray-500">
            🕒 Mise à jour: {formatTimestamp(coords.timestamp)}
          </Text>
        </View>
      )}
    </View>
  );
}