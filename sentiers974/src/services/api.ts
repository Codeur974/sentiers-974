// Service API pour communiquer avec le backend MongoDB
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration de l'API
// Production: Backend déployé sur Render avec HTTPS
// Dev: Backend local (décommenter pour développement)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sentiers-974.onrender.com/api';
// const API_BASE_URL = 'http://192.168.1.17:3001/api'; // Dev local

// Export pour utilisation dans AuthContext
export const API_URL = API_BASE_URL;

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Méthode générique pour les requêtes
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur API');
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Erreur API:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  // ===== ACTIVITÉS =====
  
  // Créer une nouvelle activité
  async createActivity(activityData: {
    title: string;
    activityType: string;
    gpsData: Array<{
      lat: number;
      lng: number;
      timestamp?: number;
      elevation?: number;
      speed?: number;
    }>;
    distance: number;
    duration: number;
    elevation: {
      gain: number;
      loss: number;
      max: number;
      min: number;
    };
    location?: {
      region?: string;
      trail?: string;
      difficulty?: string;
    };
    notes?: string;
  }) {
    return this.request('/activities', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }

  // Obtenir toutes les activités de l'utilisateur
  async getUserActivities() {
    // Test de connexion backend d'abord
    try {
      console.log('🔌 Test connexion backend...');
      const testResponse = await fetch(`http://192.168.1.17:3001/`);
      const testResult = await testResponse.text();
      console.log('✅ Backend accessible:', testResult);
    } catch (error) {
      console.error('❌ Backend inaccessible:', error);
      return { success: false, message: 'Backend inaccessible' };
    }
    
    return this.request('/activities');
  }

  // Obtenir une activité par ID
  async getActivity(activityId: string) {
    return this.request(`/activities/${activityId}`);
  }

  // Mettre à jour une activité
  async updateActivity(activityId: string, updateData: any) {
    return this.request(`/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Supprimer une activité
  async deleteActivity(activityId: string) {
    return this.request(`/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  // ===== POINTS D'INTÉRÊT =====
  
  // Créer un POI
  async createPOI(activityId: string, poiData: {
    title: string;
    note?: string;
    location: {
      latitude: number;
      longitude: number;
      altitude?: number;
    };
    tracking: {
      distance: number;
      time: number;
    };
    photo?: {
      uri: string;
      filename: string;
      mimeType: string;
    };
  }) {
    return this.request('/poi', {
      method: 'POST',
      body: JSON.stringify({
        activity: activityId,
        ...poiData,
      }),
    });
  }

  // Obtenir les POI d'une activité
  async getActivityPOIs(activityId: string) {
    return this.request(`/poi/activity/${activityId}`);
  }

  // Supprimer un POI
  async deletePOI(poiId: string) {
    return this.request(`/poi/${poiId}`, {
      method: 'DELETE',
    });
  }

  // ===== UPLOAD PHOTOS =====
  
  // Upload d'une photo
  async uploadPhoto(photoUri: string, filename: string = 'photo.jpg') {
    try {
      console.log('🔍 Début upload photo:', { photoUri, filename, baseURL: this.baseURL });
      const token = await AsyncStorage.getItem('userToken');
      
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: filename,
      } as any);

      const uploadUrl = `${this.baseURL.replace('/api', '')}/api/upload/photo`;
      console.log('📤 Upload photo vers:', uploadUrl);
      console.log('🔐 Token présent:', !!token);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          // Ne pas définir Content-Type manuellement avec FormData
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      console.log('📊 Status réponse:', response.status, response.statusText);
      const result = await response.json();
      console.log('📥 Réponse upload:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur upload');
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('❌ Erreur upload photo:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur upload',
      };
    }
  }

  // ===== AUTHENTIFICATION =====
  
  // Connexion utilisateur
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      const data = response.data as any;
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.user?.id || '');
      }
    }

    return response;
  }

  // Inscription utilisateur
  async register(name: string, email: string, password: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  // Déconnexion
  async logout() {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userId');
    return { success: true };
  }

  // Vérifier si l'utilisateur est connecté
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('userToken');
    return !!token;
  }

  // Obtenir l'ID utilisateur actuel
  async getCurrentUserId(): Promise<string | null> {
    return await AsyncStorage.getItem('userId');
  }

  // ===== SESSIONS DE TRACKING =====

  // Récupérer toutes les sessions de l'utilisateur
  async getUserSessions(params?: {
    limit?: number;
    sport?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('userId', 'default-user'); // TODO: remplacer par vrai userId

    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sport) queryParams.append('sport', params.sport);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    return this.request(`/sessions?${queryParams.toString()}`);
  }

  // Récupérer les statistiques quotidiennes depuis MongoDB
  async getDailyStats(date: string) {
    return this.request(`/sessions/stats/daily?userId=default-user&date=${date}`);
  }

  // Récupérer une session spécifique
  async getSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}`);
  }

  // Supprimer une session
  async deleteSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }

  // ===== PHOTOS DANS SESSIONS =====

  // Ajouter une photo à une session
  async addPhotoToSession(sessionId: string, photoData: {
    title: string;
    note?: string;
    uri?: string;
  }) {
    return this.request(`/sessions/${sessionId}/photos`, {
      method: 'POST',
      body: JSON.stringify(photoData)
    });
  }

  // Supprimer une photo d'une session
  async removePhotoFromSession(sessionId: string, photoId: string) {
    return this.request(`/sessions/${sessionId}/photos/${photoId}`, {
      method: 'DELETE'
    });
  }
}

// Instance singleton
export const apiService = new ApiService();
export default apiService;