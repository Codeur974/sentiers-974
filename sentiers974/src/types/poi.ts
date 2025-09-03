export interface PointOfInterest {
  id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  distance: number;       // Distance parcourue au moment de création
  time: number;          // Temps écoulé depuis le début
  title: string;
  note?: string;
  photoUri?: string;     // Chemin local de la photo
  createdAt: number;     // Timestamp de création
  sessionId?: string;    // ID de la session (pour grouper)
}

export interface POICreationData {
  title: string;
  note?: string;
  photo?: boolean | string;       // true = prendre photo, string = URI photo existante
}