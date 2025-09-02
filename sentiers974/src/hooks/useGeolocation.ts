import { useState } from "react";
import { Linking } from "react-native";
import { useLocationStore } from "../store/useLocationStore";
import { LocationHelper } from "../utils/locationUtils";
import { formatTimestamp } from "../utils/timeFormatter";

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
    console.log("🔍 Début de la localisation");
    setIsLocating(true);
    setError(null);

    try {
      const result = await LocationHelper.getFullLocation();
      
      if (result.error) {
        console.log("❌ Erreur de localisation:", result.error);
        setError(result.error);
        return;
      }

      if (result.coords) {
        console.log("📍 Position obtenue:", result.coords);
        setCoords(result.coords);
        setAddress(result.address);
      }
    } catch (error) {
      console.log("❌ Erreur de localisation:", error);
      setError("Impossible de localiser");
    } finally {
      console.log("🏁 Fin de la localisation");
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
    setShowMap(true); // Afficher la carte seulement quand on clique sur ce bouton
  };

  const toggleMap = () => {
    setShowMap(!showMap);
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
    formatTime: formatTimestamp,
    resetMapDisplay,
    resetAll,
  };
};