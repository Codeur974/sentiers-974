import axios from 'axios';
import { SportEvent } from './eventsApi';
import { getSportEmoji } from '../utils/sportCategories';

export interface StravaClub {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  member_count: number;
  sport_type: string;
}

export interface StravaEvent {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  timezone: string;
  address: string;
  club_id: number;
}

export interface StravaSegment {
  id: number;
  name: string;
  distance: number;
  average_grade: number;
  start_latlng: [number, number];
  end_latlng: [number, number];
  city: string;
  state: string;
  country: string;
}

class StravaApiService {
  private readonly BASE_URL = 'https://www.strava.com/api/v3';
  private readonly CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID || '';
  private readonly CLIENT_SECRET = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET || '';
  private readonly REDIRECT_URI = process.env.EXPO_PUBLIC_STRAVA_REDIRECT_URI || '';
  
  private accessToken: string | null = null;

  /**
   * Génère l'URL d'authentification Strava
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      response_type: 'code',
      redirect_uri: this.REDIRECT_URI,
      approval_prompt: 'force',
      scope: 'read'
    });

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Échange le code d'autorisation contre un access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code'
      });

      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('Erreur échange token Strava:', error);
      throw new Error('Impossible d\'obtenir le token Strava');
    }
  }

  /**
   * Définit l'access token pour les requêtes
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Headers d'authentification pour les requêtes
   */
  private getAuthHeaders() {
    if (!this.accessToken) {
      throw new Error('Access token Strava requis');
    }

    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Recherche des clubs à La Réunion
   */
  async searchReunionClubs(): Promise<StravaClub[]> {
    if (!this.accessToken) {
      console.warn('Pas de token Strava - clubs non disponibles');
      return [];
    }

    try {
      // Note: L'endpoint exact peut varier selon la version de l'API Strava
      const response = await axios.get(`${this.BASE_URL}/clubs/search`, {
        params: {
          location: 'La Réunion, France',
          per_page: 50
        },
        headers: this.getAuthHeaders(),
        timeout: 15000
      });

      // Filtrer les clubs réunionnais
      const reunionClubs = response.data.filter((club: any) => 
        club.city?.toLowerCase().includes('réunion') ||
        club.state?.toLowerCase().includes('réunion') ||
        club.country === 'France'
      );

      return reunionClubs.map(this.mapStravaClub);
    } catch (error) {
      console.warn('Erreur recherche clubs Strava:', error);
      return [];
    }
  }

  /**
   * Récupère les événements d'un club
   */
  async getClubEvents(clubId: number): Promise<StravaEvent[]> {
    if (!this.accessToken) {
      return [];
    }

    try {
      const response = await axios.get(`${this.BASE_URL}/clubs/${clubId}/events`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      return response.data.map(this.mapStravaEvent);
    } catch (error) {
      console.warn(`Erreur événements club ${clubId}:`, error);
      return [];
    }
  }

  /**
   * Explore les segments populaires à La Réunion
   */
  async exploreReunionSegments(): Promise<StravaSegment[]> {
    if (!this.accessToken) {
      return [];
    }

    try {
      // Bounding box de La Réunion
      const bounds = '-21.4,-55.8,-20.8,-55.2';
      
      const response = await axios.get(`${this.BASE_URL}/segments/explore`, {
        params: {
          bounds: bounds,
          activity_type: 'running',
          min_cat: 0,
          max_cat: 5
        },
        headers: this.getAuthHeaders(),
        timeout: 15000
      });

      return response.data.segments?.map(this.mapStravaSegment) || [];
    } catch (error) {
      console.warn('Erreur segments Strava:', error);
      return [];
    }
  }

  /**
   * Récupère tous les événements Strava pour La Réunion
   */
  async getAllReunionEvents(): Promise<SportEvent[]> {
    try {
      console.log('Récupération des événements Strava La Réunion...');
      
      // 1. Récupérer les clubs réunionnais
      const clubs = await this.searchReunionClubs();
      console.log(`${clubs.length} clubs trouvés à La Réunion`);

      // 2. Récupérer les événements de chaque club
      const allEvents: StravaEvent[] = [];
      for (const club of clubs.slice(0, 10)) { // Limiter à 10 clubs pour éviter rate limiting
        const clubEvents = await this.getClubEvents(club.id);
        allEvents.push(...clubEvents);
        
        // Petit délai entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`${allEvents.length} événements trouvés via clubs Strava`);

      // 3. Convertir en format SportEvent
      return allEvents.map(this.convertToSportEvent);

    } catch (error) {
      console.error('Erreur récupération événements Strava:', error);
      return [];
    }
  }

  /**
   * Mapper un club Strava
   */
  private mapStravaClub = (club: any): StravaClub => ({
    id: club.id,
    name: club.name || 'Club sans nom',
    city: club.city || '',
    state: club.state || '',
    country: club.country || 'France',
    member_count: club.member_count || 0,
    sport_type: club.sport_type || 'running'
  });

  /**
   * Mapper un événement Strava
   */
  private mapStravaEvent = (event: any): StravaEvent => ({
    id: event.id,
    name: event.name || 'Événement Strava',
    description: event.description || '',
    start_date: event.start_date || new Date().toISOString(),
    end_date: event.end_date || event.start_date || new Date().toISOString(),
    timezone: event.timezone || 'Indian/Reunion',
    address: event.address || 'La Réunion',
    club_id: event.club_id || 0
  });

  /**
   * Mapper un segment Strava
   */
  private mapStravaSegment = (segment: any): StravaSegment => ({
    id: segment.id,
    name: segment.name || 'Segment Strava',
    distance: segment.distance || 0,
    average_grade: segment.average_grade || 0,
    start_latlng: segment.start_latlng || [0, 0],
    end_latlng: segment.end_latlng || [0, 0],
    city: segment.city || '',
    state: segment.state || '',
    country: segment.country || 'France'
  });

  /**
   * Convertit un événement Strava en SportEvent
   */
  private convertToSportEvent = (stravaEvent: StravaEvent): SportEvent => {
    const startDate = new Date(stravaEvent.start_date);
    
    return {
      id: `strava_${stravaEvent.id}`,
      title: stravaEvent.name,
      sport: this.detectSportFromName(stravaEvent.name),
      emoji: getSportEmoji(this.detectSportFromName(stravaEvent.name)),
      date: startDate.toISOString().split('T')[0],
      time: startDate.toTimeString().substring(0, 5),
      location: stravaEvent.address || 'La Réunion',
      description: stravaEvent.description || 'Événement organisé via Strava',
      difficulty: 'moyen',
      organizer: 'Club Strava',
      registration: 'Via Strava',
      price: 'Voir sur Strava',
      website: `https://www.strava.com/clubs/${stravaEvent.club_id}/events/${stravaEvent.id}`
    };
  };

  /**
   * Détecte le sport à partir du nom de l'événement
   */
  private detectSportFromName(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('trail') || lowerName.includes('ultra')) return 'Trail';
    if (lowerName.includes('course') || lowerName.includes('running')) return 'Course';
    if (lowerName.includes('vélo') || lowerName.includes('cyclisme') || lowerName.includes('bike')) return 'Vélo';
    if (lowerName.includes('vtt') || lowerName.includes('mountain')) return 'VTT';
    if (lowerName.includes('rando') || lowerName.includes('randonnée') || lowerName.includes('hiking')) return 'Randonnée';
    if (lowerName.includes('natation') || lowerName.includes('swim')) return 'Natation';
    if (lowerName.includes('triathlon')) return 'Triathlon';
    
    return 'Sport';
  }

  /**
   * Retourne l'emoji du sport
   */
}

export const stravaApi = new StravaApiService();