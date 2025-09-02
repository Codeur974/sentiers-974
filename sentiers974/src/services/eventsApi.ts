import axios from 'axios';
import { getAllReunionEvents, getTodayReunionEvents, getUpcomingReunionEvents } from '../data/reunionEvents';
import { liveEventsApi } from './liveEventsApi';
import { SportEvent } from '../types/events';

// Mapping des sports pour associer emojis et catégories
const SPORT_MAPPING: Record<string, { emoji: string; category: string }> = {
  'course': { emoji: '🏃‍♀️', category: 'Course' },
  'trail': { emoji: '🏃‍♂️', category: 'Trail' },
  'randonnee': { emoji: '🥾', category: 'Randonnée' },
  'marche': { emoji: '🚶‍♀️', category: 'Marche' },
  'vtt': { emoji: '🚵‍♀️', category: 'VTT' },
  'velo': { emoji: '🚴‍♀️', category: 'Vélo' },
  'natation': { emoji: '🏊‍♀️', category: 'Natation' },
  'surf': { emoji: '🏄‍♀️', category: 'Surf' },
  'sup': { emoji: '🏄‍♂️', category: 'SUP' },
  'kayak': { emoji: '🛶', category: 'Kayak' },
  'escalade': { emoji: '🧗‍♀️', category: 'Escalade' },
};

class EventsApiService {
  // APIs officielles
  private readonly OPENAGENDA_BASE_URL = 'https://api.openagenda.com/v2';
  private readonly REUNION_TOURISM_API = 'https://www.reunion.fr/api/events'; 
  private readonly SPORTS_GOUV_API = 'https://data.sports.gouv.fr/api/records/1.0';
  private readonly ILE_REUNION_TOURISME = 'https://www.ilereunion.com/api/events';
  
  // Clés API
  private readonly OPENAGENDA_KEY = process.env.EXPO_PUBLIC_OPENAGENDA_KEY || '';
  private readonly REUNION_TOURISM_KEY = process.env.EXPO_PUBLIC_REUNION_TOURISM_KEY || '';
  private readonly SPORTS_API_KEY = process.env.EXPO_PUBLIC_SPORTS_API_KEY || '';

  /**
   * Récupère les événements depuis OpenAgenda pour La Réunion
   */
  async getEventsFromOpenAgenda(): Promise<SportEvent[]> {
    if (!this.OPENAGENDA_KEY) {
      console.warn('Clé OpenAgenda manquante');
      return [];
    }

    try {
      // Recherche d'agendas spécifiques à La Réunion
      const agendasResponse = await axios.get(`${this.OPENAGENDA_BASE_URL}/agendas`, {
        params: {
          key: this.OPENAGENDA_KEY,
          q: 'Réunion sport trail course',
          size: 20,
        },
      });

      const events: SportEvent[] = [];
      
      // Pour chaque agenda trouvé, récupérer les événements
      for (const agenda of agendasResponse.data.agendas || []) {
        try {
          const eventsResponse = await axios.get(`${this.OPENAGENDA_BASE_URL}/agendas/${agenda.uid}/events`, {
            params: {
              key: this.OPENAGENDA_KEY,
              size: 30,
              when: 'upcoming',
              detailed: 1,
            },
          });
          
          const transformedEvents = this.transformOpenAgendaEvents(eventsResponse.data.events || []);
          events.push(...transformedEvents);
        } catch (agendaError) {
          console.warn(`Erreur agenda ${agenda.uid}:`, agendaError);
        }
      }

      return events;
    } catch (error) {
      console.warn('Erreur OpenAgenda API:', error);
      return [];
    }
  }

  /**
   * Récupère les événements depuis l'API Tourisme Réunion
   */
  async getEventsFromReunionTourism(): Promise<SportEvent[]> {
    try {
      const response = await axios.get(`${this.REUNION_TOURISM_API}`, {
        params: {
          category: 'sport',
          limit: 50,
          status: 'active',
          region: 'reunion',
        },
        headers: this.REUNION_TOURISM_KEY ? {
          'Authorization': `Bearer ${this.REUNION_TOURISM_KEY}`
        } : {},
      });

      return this.transformTourismEvents(response.data || []);
    } catch (error) {
      console.warn('Erreur Réunion Tourism API:', error);
      return [];
    }
  }

  /**
   * Récupère les événements depuis l'API data.gouv.fr pour les sports
   */
  async getEventsFromSportsGouv(): Promise<SportEvent[]> {
    try {
      const response = await axios.get(`${this.SPORTS_GOUV_API}/search`, {
        params: {
          dataset: 'equipements-sportifs',
          q: 'Réunion',
          rows: 50,
          facet: ['type_equipement', 'commune'],
        },
      });

      return this.transformSportsGouvEvents(response.data.records || []);
    } catch (error) {
      console.warn('Erreur Sports.gouv API:', error);
      return [];
    }
  }

  /**
   * Récupère depuis Facebook Events (via Graph API)
   */
  async getEventsFromFacebook(): Promise<SportEvent[]> {
    try {
      // Recherche d'événements publics à La Réunion
      const response = await axios.get(`https://graph.facebook.com/v18.0/search`, {
        params: {
          type: 'event',
          q: 'sport trail course La Réunion',
          access_token: process.env.EXPO_PUBLIC_FACEBOOK_ACCESS_TOKEN,
          fields: 'name,description,start_time,place,cover',
          limit: 30,
        },
      });

      return this.transformFacebookEvents(response.data.data || []);
    } catch (error) {
      console.warn('Erreur Facebook Events API:', error);
      return [];
    }
  }

  /**
   * Base de données principale d'événements réunionnais réels
   */
  getFallbackEvents(): SportEvent[] {
    return getAllReunionEvents();
  }

  /**
   * Point d'entrée principal - récupère tous les événements (local + live)
   */
  async getAllEvents(): Promise<SportEvent[]> {
    console.log('Récupération des événements sportifs de La Réunion');
    
    try {
      // 1. Base locale (garantie)
      const localEvents = this.getFallbackEvents();
      
      // 2. Événements live (bonus)
      const liveEvents = await liveEventsApi.getAllLiveEvents();
      
      // 3. Combinaison et dédoublonnage
      const allEvents = [...localEvents, ...liveEvents];
      
      console.log(`📊 Total: ${localEvents.length} locaux + ${liveEvents.length} live = ${allEvents.length} événements`);
      
      return this.deduplicateAndSort(allEvents);
      
    } catch (error) {
      console.warn('Erreur récupération événements live, utilisation base locale:', error);
      return this.getFallbackEvents();
    }
  }

  /**
   * Récupère uniquement les événements d'aujourd'hui
   */
  async getTodayEvents(): Promise<SportEvent[]> {
    return getTodayReunionEvents();
  }

  /**
   * Récupère les événements à venir (prochains 30 jours)
   */
  async getUpcomingEvents(days: number = 30): Promise<SportEvent[]> {
    return getUpcomingReunionEvents(days);
  }

  // Utilitaires privés

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Extrait le texte depuis un objet multilingue ou une chaîne simple
   */
  private extractText(...values: any[]): string {
    for (const value of values) {
      if (!value) continue;
      
      // Si c'est une chaîne simple, la retourner
      if (typeof value === 'string') {
        return value.trim();
      }
      
      // Si c'est un objet multilingue, essayer les langues dans l'ordre
      if (typeof value === 'object' && value !== null) {
        // Priorité : français, anglais, puis première langue disponible
        const langs = ['fr', 'en', 'de', 'it', 'es'];
        for (const lang of langs) {
          if (value[lang] && typeof value[lang] === 'string') {
            return value[lang].trim();
          }
        }
        
        // Si aucune langue reconnue, prendre la première propriété
        const keys = Object.keys(value);
        if (keys.length > 0 && typeof value[keys[0]] === 'string') {
          return value[keys[0]].trim();
        }
      }
    }
    
    return '';
  }

  private transformOpenAgendaEvents(events: any[]): SportEvent[] {
    return events.map(event => this.mapToSportEvent(event, 'openagenda'));
  }

  private transformTourismEvents(events: any[]): SportEvent[] {
    return events.map(event => this.mapToSportEvent(event, 'tourism'));
  }

  private transformSportsGouvEvents(records: any[]): SportEvent[] {
    return records.map(record => this.mapToSportEvent(record.fields, 'sportsgouv'));
  }

  private transformFacebookEvents(events: any[]): SportEvent[] {
    return events.map(event => this.mapToSportEvent(event, 'facebook'));
  }

  private mapToSportEvent(event: any, source: string): SportEvent {
    // Extraire le texte selon la source
    const title = this.extractText(event.title, event.nom, 'Événement sportif');
    const description = this.extractText(event.description, event.resume, '');
    
    // Gestion spéciale des locations (souvent des objets complexes)
    let location = 'La Réunion';
    if (event.location) {
      if (typeof event.location === 'string') {
        location = event.location;
      } else if (event.location.name) {
        location = this.extractText(event.location.name);
      } else if (event.location.address) {
        location = this.extractText(event.location.address);
      } else if (event.location.city) {
        location = this.extractText(event.location.city);
      }
    } else if (event.lieu) {
      location = this.extractText(event.lieu);
    }
    
    // Détection automatique du sport basée sur le titre/description
    const sport = this.detectSport(title + ' ' + description);
    const sportInfo = SPORT_MAPPING[sport] || { emoji: '🏃‍♀️', category: 'Course' };

    return {
      id: `${source}_${event.id || Math.random()}`,
      title: title,
      sport: sportInfo.category,
      emoji: sportInfo.emoji,
      date: this.extractDate(event),
      time: this.extractTime(event),
      location: location,
      description: description,
      difficulty: this.detectDifficulty(title + ' ' + description),
      organizer: this.extractText(event.organizer, event.organisateur, 'Organisateur local'),
      registration: 'Voir site web',
      price: 'Voir site web',
      website: event.url || event.website,
      image: event.image?.url || event.photo,
    };
  }

  private detectSport(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('trail') || lowerText.includes('ultra')) return 'trail';
    if (lowerText.includes('course') || lowerText.includes('running')) return 'course';
    if (lowerText.includes('randonnée') || lowerText.includes('rando')) return 'randonnee';
    if (lowerText.includes('marche') || lowerText.includes('nordique')) return 'marche';
    if (lowerText.includes('vtt') || lowerText.includes('mountain bike')) return 'vtt';
    if (lowerText.includes('vélo') || lowerText.includes('cyclisme')) return 'velo';
    if (lowerText.includes('natation') || lowerText.includes('nage')) return 'natation';
    if (lowerText.includes('surf')) return 'surf';
    if (lowerText.includes('sup') || lowerText.includes('paddle')) return 'sup';
    if (lowerText.includes('kayak')) return 'kayak';
    if (lowerText.includes('escalade') || lowerText.includes('grimpe')) return 'escalade';
    
    return 'course'; // Par défaut
  }

  private detectDifficulty(text: string): 'facile' | 'moyen' | 'difficile' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('ultra') || lowerText.includes('difficile') || lowerText.includes('expert')) {
      return 'difficile';
    }
    if (lowerText.includes('débutant') || lowerText.includes('facile') || lowerText.includes('family')) {
      return 'facile';
    }
    return 'moyen';
  }

  private extractDate(event: any): string {
    // Logique pour extraire la date selon le format de l'API
    if (event.date) return new Date(event.date).toISOString().split('T')[0];
    if (event.dateStart) return new Date(event.dateStart).toISOString().split('T')[0];
    return this.formatDate(new Date());
  }

  private extractTime(event: any): string {
    // Logique pour extraire l'heure
    if (event.time) return event.time;
    if (event.dateStart) {
      const date = new Date(event.dateStart);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return '08:00';
  }

  private deduplicateAndSort(events: SportEvent[]): SportEvent[] {
    // Supprimer les doublons basés sur le titre et la date
    const unique = events.filter((event, index, self) => 
      index === self.findIndex(e => e.title === event.title && e.date === event.date)
    );

    // Trier par date puis par heure
    return unique.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }
}

export const eventsApi = new EventsApiService();