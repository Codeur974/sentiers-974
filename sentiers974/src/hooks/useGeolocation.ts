import * as Location from "expo-location";
import { useState } from "react";
import { Linking } from "react-native";
import { useLocationStore } from "../store/useLocationStore";

export const useGeolocation = () => {
  const {
    coords,
    isLocating,
    address,
    locationError,
    setIsLocating,
    setCoords,
    setAddress,
    setError,
  } = useLocationStore();
  
  const [showMap, setShowMap] = useState(false);

  const getLocation = async () => {
    setIsLocating(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission GPS requise");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: Date.now(),
      };
      
      setCoords(coords);

      // Récupérer l'adresse via reverse geocoding
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        
        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          const cityName = address.city || address.subregion || address.region || "Lieu inconnu";
          setAddress(cityName);
        }
      } catch (geocodeError) {
        console.log("Erreur reverse geocoding:", geocodeError);
        setAddress("Ville non trouvée");
      }
    } catch (error) {
      setError("Impossible de localiser");
    } finally {
      setIsLocating(false);
    }
  };

  const openInMaps = () => {
    if (coords) {
      const url = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      Linking.openURL(url);
    }
  };

  const getLocationAndShowMap = async () => {
    await getLocation();
    // Ne plus afficher automatiquement la carte
    // L'utilisateur peut choisir de l'afficher via toggleMap
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resetMapDisplay = () => {
    setShowMap(false);
  };

  const resetAll = () => {
    setShowMap(false);
  };

  return {
    // État
    coords,
    isLocating,
    address,
    locationError,
    showMap,
    
    // Actions
    getLocation,
    openInMaps,
    getLocationAndShowMap,
    toggleMap,
    formatTime,
    resetMapDisplay,
    resetAll,
  };
};