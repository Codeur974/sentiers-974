import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useGeolocation } from "../hooks";
import { useLocationStore } from "../store/useLocationStore";
import { LocationCoords, LocationHelper } from "../utils/locationUtils";
import { formatTimestamp } from "../utils/timeFormatter";
import EnhancedMapView from "./EnhancedMapView";

export default function LocationSection() {
  const [localShowMap, setLocalShowMap] = useState(true); // État local pour l'accueil
  const [localIsLocating, setLocalIsLocating] = useState(false); // État de localisation local
  const [locationError, setError] = useState<string | null>(null); // Erreur locale
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Pour distinguer premier chargement vs retour
  
  const { resetAll } = useGeolocation();
  
  // Utiliser le store global comme TrackingScreen
  const { coords, address, setCoords, setAddress, setIsLocating } = useLocationStore();

  // Plus de logique compliquée - on laisse HomeScreen gérer les resets
  useFocusEffect(
    useCallback(() => {
      console.log("🏠 LocationSection focus");
    }, [])
  );

  // Fonction pour localiser en utilisant le store global
  const getLocationForHome = async () => {
    console.log("🔍 Début localisation accueil");
    setLocalIsLocating(true);
    setError(null);
    
    try {
      // Utiliser LocationHelper et sauver dans le store global
      const result = await LocationHelper.getFullLocation();
      
      console.log("📍 Résultat LocationHelper:", result);
      
      if (result.error) {
        console.log("❌ Erreur dans le résultat:", result.error);
        setError(result.error);
        return;
      }

      if (result.coords) {
        console.log("✅ Coords obtenues:", result.coords);
        console.log("🏠 Adresse obtenue:", result.address);
        
        // Utiliser le store global comme TrackingScreen
        setCoords(result.coords);
        setAddress(result.address);
        
        console.log("💾 Coordonnées sauvées dans le store global");
      } else {
        console.log("❌ Aucune coordonnée dans le résultat");
        setError("Position non trouvée");
      }
    } catch (error) {
      console.log("❌ Erreur de localisation:", error);
      setError("Impossible de localiser");
    } finally {
      console.log("🏁 Fin localisation accueil");
      setLocalIsLocating(false);
    }
  };

  // Plus d'écoute automatique des storeCoords
  // Les coords locales ne sont mises à jour QUE quand l'utilisateur clique sur 📍

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
            localIsLocating
              ? "bg-orange-100"
              : coords
              ? "bg-green-100"
              : "bg-gray-100"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              localIsLocating
                ? "text-orange-600"
                : coords
                ? "text-green-600"
                : "text-gray-600"
            }`}
          >
            {localIsLocating ? "Recherche..." : coords ? "Localisé" : "Prêt"}
          </Text>
        </View>
      </View>


      {/* Carte affichée seulement si on a des coordonnées */}
      {localShowMap && coords && (
        <View className="mb-4 h-64 rounded-xl overflow-hidden">
          <EnhancedMapView
            coords={coords}
            address={address || "Position actuelle"}
            isVisible={true}
            onToggle={() => setLocalShowMap(false)}
            trackingPath={[]}
            isTracking={false}
            showControls={false}
          />
        </View>
      )}

      <View className="flex-row justify-center space-x-4">
        <TouchableOpacity
          className={`w-16 h-16 rounded-full items-center justify-center ${
            localIsLocating ? "bg-gray-100" : "bg-blue-500"
          }`}
          disabled={localIsLocating}
          onPress={getLocationForHome}
        >
          <Text className="text-2xl">
            {localIsLocating ? "⏳" : "📍"}
          </Text>
        </TouchableOpacity>

        {coords && (
          <TouchableOpacity
            className={`w-16 h-16 rounded-full items-center justify-center ${
              localShowMap ? "bg-red-500" : "bg-green-500"
            }`}
            onPress={() => setLocalShowMap(!localShowMap)}
          >
            <Text className="text-2xl">
              {localShowMap ? "❌" : "🗺️"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
            🕒 Mise à jour: {formatTimestamp(coords.timestamp)}
          </Text>
        </View>
      )}
    </View>
  );
}