// Types TypeScript pour l'API MongoDB

// ===== UTILISATEUR =====
export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ===== ACTIVITÉ =====
export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp?: number;
  elevation?: number;
  speed?: number;
}

export interface ActivityElevation {
  gain: number;
  loss: number;
  max: number;
  min: number;
}

export interface ActivityLocation {
  region?: string;
  trail?: string;
  difficulty?: 'facile' | 'moyen' | 'difficile' | 'expert';
}

export interface ActivityWeather {
  temperature?: number;
  humidity?: number;
  conditions?: string;
}

export interface ActivityPhoto {
  url: string;
  caption?: string;
}

export interface Activity {
  _id: string;
  user: string;
  title: string;
  activityType: 'course' | 'randonnee' | 'velo' | 'natation' | 'trail' | 'vtt' | 'surf' | 'kitesurf';
  gpsData: GPSPoint[];
  distance: number;
  duration: number; // en secondes
  elevation: ActivityElevation;
  location?: ActivityLocation;
  weather?: ActivityWeather;
  notes?: string;
  photos: ActivityPhoto[];
  date: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityData {
  title: string;
  activityType: Activity['activityType'];
  gpsData: GPSPoint[];
  distance: number;
  duration: number;
  elevation: ActivityElevation;
  location?: ActivityLocation;
  weather?: ActivityWeather;
  notes?: string;
}

// ===== POINT D'INTÉRÊT =====
export interface POILocation {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface POITracking {
  distance: number; // Distance parcourue quand POI créé (km)
  time: number;     // Temps écoulé quand POI créé (ms)
}

export interface POIPhoto {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface PointOfInterest {
  _id: string;
  activity: string;
  user: string;
  title: string;
  note?: string;
  location: POILocation;
  tracking: POITracking;
  photo?: POIPhoto;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePOIData {
  title: string;
  note?: string;
  location: POILocation;
  tracking: POITracking;
  photo?: {
    uri: string;
    filename: string;
    mimeType: string;
  };
}

// ===== RÉPONSES API =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ===== UPLOAD =====
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// ===== STATISTIQUES =====
export interface UserStats {
  totalActivities: number;
  totalDistance: number; // en km
  totalDuration: number; // en secondes
  totalElevationGain: number;
  favoriteActivity: Activity['activityType'];
  activitiesByType: Record<Activity['activityType'], number>;
  activitiesByMonth: Array<{
    month: string;
    count: number;
    distance: number;
  }>;
}