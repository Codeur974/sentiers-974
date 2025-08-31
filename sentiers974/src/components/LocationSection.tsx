import { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useGeolocation } from "../hooks";
import { useLocationStore } from "../store/useLocationStore";
import GoogleMapViewComponent from "./MapView";

export default function LocationSection() {
  const {
    coords,
    isLocating,
    address,
    locationError,
    showMap,
    getLocationAndShowMap,
    toggleMap,
    formatTime,
    resetMapDisplay,
    resetAll,
  } = useGeolocation();

  // Force le reset complet au montage du composant
  useEffect(() => {
    resetAll();
  }, []); // Empty dependency array - runs only on mount

  // Réinitialiser l'affichage de la carte quand le store location est reset
  const locationStore = useLocationStore();
  useEffect(() => {
    // Si les coords sont supprimées (lors du reset), masquer la carte immédiatement
    if (!locationStore.coords) {
      resetAll();
    }
  }, [locationStore.coords, resetAll]);

  // Région par défaut centrée sur La Réunion
  const defaultRegion = {
    latitude: -21.1151,
    longitude: 55.5364,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  // Région centrée sur la position actuelle
  const currentRegion = coords
    ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : defaultRegion;

  return (
    <View className="p-4 bg-white rounded-xl shadow-sm">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-semibold text-gray-800">📍 Position</Text>
        <View
          className={`px-3 py-1 rounded-full ${
            isLocating
              ? "bg-orange-100"
              : coords
              ? "bg-green-100"
              : "bg-gray-100"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              isLocating
                ? "text-orange-600"
                : coords
                ? "text-green-600"
                : "text-gray-600"
            }`}
          >
            {isLocating ? "Recherche..." : coords ? "Localisé" : "Prêt"}
          </Text>
        </View>
      </View>

      {/* Carte Google Maps - affichage contrôlé */}
      {showMap && coords && locationStore.coords && (
        <GoogleMapViewComponent
          coords={coords}
          address={address}
          isVisible={true}
          onToggle={toggleMap}
        />
      )}

      <TouchableOpacity
        className={`px-6 py-3 rounded-xl ${
          isLocating ? "bg-gray-400" : "bg-blue-600"
        }`}
        disabled={isLocating}
        onPress={getLocationAndShowMap}
      >
        <Text className="text-white font-semibold text-center">
          {isLocating ? "Localisation..." : "🗺️ Me localiser"}
        </Text>
      </TouchableOpacity>

      {/* Bouton pour afficher/masquer la carte */}
      {coords && (
        <TouchableOpacity
          className={`mt-2 px-6 py-3 rounded-xl ${
            showMap ? "bg-red-600" : "bg-green-600"
          }`}
          onPress={toggleMap}
        >
          <Text className="text-white font-semibold text-center">
            {showMap ? "🗺️ Masquer la carte" : "🗺️ Voir sur la carte"}
          </Text>
        </TouchableOpacity>
      )}

      {locationError && (
        <View className="mt-3 p-3 bg-red-50 rounded-lg">
          <Text className="text-red-600 text-sm text-center">
            ❌ {locationError}
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
            🕒 Mise à jour: {formatTime(coords.timestamp)}
          </Text>
        </View>
      )}
    </View>
  );
}