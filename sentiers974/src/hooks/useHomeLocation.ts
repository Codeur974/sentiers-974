import { useState } from "react";
import { useLocationStore } from "../store/useLocationStore";
import { LocationHelper } from "../utils/locationUtils";

/**
 * Hook spécialisé pour la gestion de la localisation sur la page d'accueil
 * Combine l'état local d'affichage avec le store global de localisation
 */
export const useHomeLocation = () => {
  const [showMap, setShowMap] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store global pour cohérence avec TrackingScreen
  const { coords, address, setCoords, setAddress } = useLocationStore();

  const getLocation = async () => {
    console.log("🔍 Début localisation accueil");
    setIsLocating(true);
    setError(null);
    
    try {
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
      setIsLocating(false);
    }
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  return {
    // État
    coords,
    address,
    showMap,
    isLocating,
    error,
    
    // Actions
    getLocation,
    toggleMap,
    setShowMap
  };
};