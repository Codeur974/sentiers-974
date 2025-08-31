import AsyncStorage from '@react-native-async-storage/async-storage';
import { SportEvent } from './eventsApi';
import { REUNION_SPORTS_EVENTS } from '../data/reunionEvents';

/**
 * Service de gestion de la base de données des événements
 * Stockage local avec AsyncStorage + synchronisation automatique
 */
class EventsDatabaseService {
  private readonly STORAGE_KEY = 'reunion_sports_events';
  private readonly LAST_UPDATE_KEY = 'events_last_update';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

  /**
   * Initialise la base de données avec les événements de base
   */
  async initializeDatabase(): Promise<void> {
    console.log('📦 Initialisation de la base de données événements');
    
    try {
      const storedEvents = await this.getStoredEvents();
      
      if (!storedEvents || storedEvents.length === 0) {
        // Première installation - charger les données de base
        await this.saveEvents(REUNION_SPORTS_EVENTS);
        await this.setLastUpdateTimestamp();
        console.log(`✅ Base initialisée avec ${REUNION_SPORTS_EVENTS.length} événements`);
      } else {
        console.log(`📊 Base existante trouvée: ${storedEvents.length} événements`);
      }
    } catch (error) {
      console.error('❌ Erreur initialisation base:', error);
    }
  }

  /**
   * Récupère tous les événements stockés
   */
  async getAllEvents(): Promise<SportEvent[]> {
    try {
      const storedEvents = await this.getStoredEvents();
      
      if (storedEvents) {
        // Filtrer les événements passés automatiquement
        const futureEvents = this.filterFutureEvents(storedEvents);
        
        if (futureEvents.length !== storedEvents.length) {
          // Mettre à jour le stockage si des événements ont été filtrés
          await this.saveEvents(futureEvents);
          console.log(`🧹 ${storedEvents.length - futureEvents.length} événements passés supprimés`);
        }
        
        return futureEvents;
      }
      
      return REUNION_SPORTS_EVENTS;
    } catch (error) {
      console.error('❌ Erreur récupération événements:', error);
      return REUNION_SPORTS_EVENTS;
    }
  }

  /**
   * Ajoute de nouveaux événements sans doublons
   */
  async addNewEvents(newEvents: SportEvent[]): Promise<number> {
    try {
      const existingEvents = await this.getAllEvents();
      const eventsToAdd: SportEvent[] = [];
      
      // Filtrer les doublons
      newEvents.forEach(newEvent => {
        const isDuplicate = existingEvents.some(existing => 
          existing.title === newEvent.title && 
          existing.date === newEvent.date &&
          existing.location === newEvent.location
        );
        
        if (!isDuplicate) {
          eventsToAdd.push(newEvent);
        }
      });
      
      if (eventsToAdd.length > 0) {
        const updatedEvents = [...existingEvents, ...eventsToAdd];
        await this.saveEvents(updatedEvents);
        await this.setLastUpdateTimestamp();
        
        console.log(`➕ ${eventsToAdd.length} nouveaux événements ajoutés`);
        return eventsToAdd.length;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Erreur ajout nouveaux événements:', error);
      return 0;
    }
  }

  /**
   * Met à jour un événement existant
   */
  async updateEvent(eventId: string, updatedEvent: SportEvent): Promise<boolean> {
    try {
      const existingEvents = await this.getAllEvents();
      const eventIndex = existingEvents.findIndex(event => event.id === eventId);
      
      if (eventIndex !== -1) {
        existingEvents[eventIndex] = updatedEvent;
        await this.saveEvents(existingEvents);
        console.log(`📝 Événement ${eventId} mis à jour`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erreur mise à jour événement:', error);
      return false;
    }
  }

  /**
   * Supprime un événement
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const existingEvents = await this.getAllEvents();
      const filteredEvents = existingEvents.filter(event => event.id !== eventId);
      
      if (filteredEvents.length !== existingEvents.length) {
        await this.saveEvents(filteredEvents);
        console.log(`🗑️ Événement ${eventId} supprimé`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erreur suppression événement:', error);
      return false;
    }
  }

  /**
   * Vérifie si la base a besoin d'être mise à jour
   */
  async needsUpdate(): Promise<boolean> {
    try {
      const lastUpdate = await AsyncStorage.getItem(this.LAST_UPDATE_KEY);
      
      if (!lastUpdate) return true;
      
      const lastUpdateTime = parseInt(lastUpdate);
      const now = Date.now();
      
      return (now - lastUpdateTime) > this.CACHE_DURATION;
    } catch (error) {
      console.error('❌ Erreur vérification mise à jour:', error);
      return true;
    }
  }

  /**
   * Force la synchronisation avec les sources externes
   */
  async forceSynchronization(): Promise<void> {
    console.log('🔄 Synchronisation forcée de la base de données');
    
    try {
      const { autoUpdateEventsService } = await import('./autoUpdateEventsService');
      await autoUpdateEventsService.startAutoUpdate();
      
      await this.setLastUpdateTimestamp();
      console.log('✅ Synchronisation terminée');
    } catch (error) {
      console.error('❌ Erreur synchronisation forcée:', error);
    }
  }

  /**
   * Statistiques de la base de données
   */
  async getStatistics(): Promise<{
    totalEvents: number;
    eventsBySport: Record<string, number>;
    eventsThisMonth: number;
    lastUpdate: string;
  }> {
    try {
      const events = await this.getAllEvents();
      const lastUpdate = await AsyncStorage.getItem(this.LAST_UPDATE_KEY);
      
      // Statistiques par sport
      const eventsBySport: Record<string, number> = {};
      events.forEach(event => {
        eventsBySport[event.sport] = (eventsBySport[event.sport] || 0) + 1;
      });
      
      // Événements du mois en cours
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const eventsThisMonth = events.filter(event => 
        event.date.startsWith(currentMonth)
      ).length;
      
      return {
        totalEvents: events.length,
        eventsBySport,
        eventsThisMonth,
        lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)).toLocaleString() : 'Jamais'
      };
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      return {
        totalEvents: 0,
        eventsBySport: {},
        eventsThisMonth: 0,
        lastUpdate: 'Erreur'
      };
    }
  }

  /**
   * Vide complètement la base (pour debug)
   */
  async clearDatabase(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.LAST_UPDATE_KEY);
      console.log('🗑️ Base de données vidée');
    } catch (error) {
      console.error('❌ Erreur vidage base:', error);
    }
  }

  /**
   * Méthodes privées
   */
  private async getStoredEvents(): Promise<SportEvent[] | null> {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      console.error('❌ Erreur lecture stockage:', error);
      return null;
    }
  }

  private async saveEvents(events: SportEvent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('❌ Erreur sauvegarde stockage:', error);
    }
  }

  private async setLastUpdateTimestamp(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LAST_UPDATE_KEY, Date.now().toString());
    } catch (error) {
      console.error('❌ Erreur sauvegarde timestamp:', error);
    }
  }

  private filterFutureEvents(events: SportEvent[]): SportEvent[] {
    const today = new Date().toISOString().split('T')[0];
    return events.filter(event => event.date >= today);
  }
}

export const eventsDatabaseService = new EventsDatabaseService();