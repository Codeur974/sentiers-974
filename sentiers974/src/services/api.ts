// Service API pour communiquer avec le backend MongoDB
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Configuration de l'API
// Production: Backend dploy sur Render avec HTTPS
// Dev: Backend local (dcommenter pour dveloppement)
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl
  ? `${Constants.expoConfig.extra.apiUrl}/api`
  : 'https://sentiers-974.onrender.com/api';
// const API_BASE_URL = 'http://192.168.1.17:3001/api'; // Dev local

// Log pour debug (visible uniquement en dev)
if (__DEV__) {
  console.log(' API_BASE_URL configure:', API_BASE_URL);
  console.log(' Constants.expoConfig?.extra?.apiUrl:', Constants.expoConfig?.extra?.apiUrl);
}

// Export pour utilisation dans AuthContext
export const API_URL = API_BASE_URL;

// Log minimal pour voir l'URL utilise (utile en dev/diagnostic APK)
console.log('API_URL utilis:', API_URL);

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

  // Rcupre le token JWT (cl unifie `authToken`, fallback legacy `userToken`)
  private async getAuthToken() {
    const { secureGetItem } = await import('../utils/secureStorage');
    const token = await secureGetItem('authToken');
    if (token) return token;
    return await secureGetItem('userToken');
  }

  // Mthode gnrique pour les requtes avec retry automatique
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<ApiResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const token = await this.getAuthToken();
        const url = `${this.baseURL}${endpoint}`;

        const config: RequestInit = {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
          },
        };

        const response = await fetch(url, config);
        let data: any = null;
        try {
          data = await response.json();
        } catch (parseErr) {
          console.warn('[API] JSON parse failed', { url, status: response.status });
        }
        if (attempt === 0) {
          const size = Array.isArray(data) ? data.length : (data ? 1 : 0);
          console.log(`[API] ${options.method || 'GET'} ${url} -> status ${response.status}, size ${size}`);
        }

        if (!response.ok) {
          const backendMessage = data?.message || `Erreur ${response.status}`;
          const friendlyMessage = backendMessage.includes("point d'intérêt")
            ? "Ajoute une photo à ta session avant de valider."
            : backendMessage;
          // Erreurs 4xx ne doivent pas tre retryes
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              message: friendlyMessage,
            };
          }
          throw new Error(friendlyMessage);
        }

        return {
          success: true,
          data: data,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erreur inconnue');

        // Si c'est le dernier essai, on retourne l'erreur
        if (attempt === retries) {
          break;
        }

        // Attendre avant de ressayer (backoff exponentiel)
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(` Tentative ${attempt + 1}/${retries + 1} choue, retry dans ${delayMs}ms...`);
        await new Promise<void>(resolve => setTimeout(() => resolve(), delayMs));
      }
    }

    // Message d'erreur amlior
    const userFriendlyMessage = lastError?.message.includes('fetch')
      ? 'Impossible de se connecter au serveur. Vrifiez votre connexion internet.'
      : lastError?.message || 'Une erreur est survenue';

    console.error(' Erreur API aprs tous les retries:', lastError);
    return {
      success: false,
      message: userFriendlyMessage,
    };
  }

  // ===== ACTIVITS =====
  
  // Crer une nouvelle activit
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

  // Obtenir toutes les activits de l'utilisateur
  async getUserActivities() {
    return this.request('/activities');
  }

  // Obtenir une activit par ID
  async getActivity(activityId: string) {
    return this.request(`/activities/${activityId}`);
  }

  // Mettre  jour une activit
  async updateActivity(activityId: string, updateData: any) {
    return this.request(`/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Supprimer une activit
  async deleteActivity(activityId: string) {
    return this.request(`/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  // ===== POINTS D'INTRT =====
  
  // Crer un POI
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

  // Obtenir les POI d'une activit
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
      console.log(' Dbut upload photo:', { photoUri, filename, baseURL: this.baseURL });
      const token = await this.getAuthToken();
      
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: filename,
      } as any);

      const uploadUrl = `${this.baseURL}/upload`;
      console.log(' Upload photo vers:', uploadUrl);
      console.log(' Token prsent:', !!token);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          // Ne pas dfinir Content-Type manuellement avec FormData
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      console.log(' Status rponse:', response.status, response.statusText);
      const result = await response.json();
      console.log(' Rponse upload:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur upload');
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error(' Erreur upload photo:', error);
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
        // Stocker sous la cl standard + legacy pour compatibilit
        const { secureSetItem } = await import('../utils/secureStorage');
        await secureSetItem('authToken', data.token);
        await secureSetItem('userToken', data.token);
        await secureSetItem('userId', data.user?.id || '');
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

  // Dconnexion
  async logout() {
    const { secureDeleteItem } = await import('../utils/secureStorage');
    await secureDeleteItem('authToken');
    await secureDeleteItem('userToken');
    await secureDeleteItem('userId');
    return { success: true };
  }

  // Vrifier si l'utilisateur est connect
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  // Obtenir l'ID utilisateur actuel
  async getCurrentUserId(): Promise<string | null> {
    const { secureGetItem } = await import('../utils/secureStorage');
    const storedUserId = await secureGetItem('userId');
    if (storedUserId) return storedUserId;
    // Fallback pour les utilisateurs non connects : utiliser deviceId pour lier les sessions/POI
    const deviceId = await secureGetItem('deviceId');
    return deviceId;
  }

  // Supprimer le compte utilisateur et toutes ses donnes (RGPD)
  async deleteAccount() {
    try {
      // La route backend ncessite un token valide dans le header
      const response = await this.request('/auth/account', {
        method: 'DELETE'
      });

      if (response.success) {
        // Nettoyer le stockage local aprs suppression russie
        const { secureDeleteItem } = await import('../utils/secureStorage');
        await secureDeleteItem('authToken');
        await secureDeleteItem('userToken');
        await secureDeleteItem('userId');
      }

      return response;
    } catch (error) {
      console.error(' Erreur suppression compte:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur suppression compte'
      };
    }
  }

  // ===== SESSIONS DE TRACKING =====

  // Recuperer toutes les sessions de l'utilisateur
  async getUserSessions(params?: {
    limit?: number;
    sport?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sport) queryParams.append('sport', params.sport);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    const res = await this.request(`/sessions?${queryParams.toString()}`);
    // Loger le resultat pour diagnostiquer les sessions distantes
    const count = Array.isArray(res?.data) ? res.data.length : 0;
    console.log('[API] getUserSessions -> success:', res?.success, 'count:', count);
    return res;
  }

  // Recuperer les statistiques quotidiennes depuis MongoDB
  async getDailyStats(date: string) {
    return this.request(`/sessions/stats/daily?date=${date}`);
  }

  // Rcuprer une session spcifique
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

  // Ajouter une photo  une session
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
