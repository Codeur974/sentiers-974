import * as Location from "expo-location";

export interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface LocationResult {
  coords: LocationCoords | null;
  address: string | null;
  error: string | null;
}

/**
 * Utilitaire unifié pour la géolocalisation
 */
export class LocationHelper {
  /**
   * Demander les permissions GPS
   */
  static async requestPermission(): Promise<{ granted: boolean; error?: string }> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === "granted",
        error: status !== "granted" ? "Permission GPS requise" : undefined
      };
    } catch (error) {
      return {
        granted: false,
        error: "Erreur lors de la demande de permission"
      };
    }
  }

  /**
   * Obtenir la position actuelle
   */
  static async getCurrentPosition(): Promise<LocationCoords | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error("Impossible d'obtenir la position");
    }
  }

  /**
   * Obtenir l'adresse via reverse geocoding
   */
  static async getAddressFromCoords(coords: LocationCoords): Promise<string | null> {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        return address.city || address.subregion || address.region || "Lieu inconnu";
      }
      return null;
    } catch (error) {
      console.log("Erreur reverse geocoding:", error);
      return "Ville non trouvée";
    }
  }

  /**
   * Processus complet de localisation
   */
  static async getFullLocation(): Promise<LocationResult> {
    try {
      // 1. Vérifier les permissions
      const permissionResult = await this.requestPermission();
      if (!permissionResult.granted) {
        return {
          coords: null,
          address: null,
          error: permissionResult.error || "Permission refusée"
        };
      }

      // 2. Obtenir la position
      const coords = await this.getCurrentPosition();
      if (!coords) {
        return {
          coords: null,
          address: null,
          error: "Position non trouvée"
        };
      }

      // 3. Obtenir l'adresse
      const address = await this.getAddressFromCoords(coords);

      return {
        coords,
        address,
        error: null
      };
    } catch (error) {
      return {
        coords: null,
        address: null,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }
}