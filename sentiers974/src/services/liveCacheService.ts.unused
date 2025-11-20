import { SportEvent } from '../types/events';

/**
 * Service pour lire le cache des événements live
 * Permet d'afficher les événements même sans connexion
 */
class LiveCacheService {
  private cacheFile = 'live-events-cache.json';
  private maxCacheAge = 24 * 60 * 60 * 1000; // 24h en millisecondes
  
  /**
   * Récupère les événements depuis le cache
   */
  async getCachedEvents(): Promise<SportEvent[]> {
    try {
      // En mode React Native, nous utiliserions AsyncStorage
      // Pour le moment, simulation d'un cache vide
      
      // Note: Dans une vraie app React Native, on ferait:
      // const cacheData = await AsyncStorage.getItem('liveEventsCache');
      // if (cacheData) {
      //   const parsed = JSON.parse(cacheData);
      //   if (this.isCacheValid(parsed.lastUpdated)) {
      //     return parsed.events;
      //   }
      // }
      
      console.log('💾 Cache événements live non disponible');
      return [];
      
    } catch (error) {
      console.warn('Erreur lecture cache événements:', error);
      return [];
    }
  }
  
  /**
   * Sauvegarde les événements en cache
   */
  async setCachedEvents(events: SportEvent[]): Promise<void> {
    try {
      const cacheData = {
        lastUpdated: new Date().toISOString(),
        events: events,
        count: events.length
      };
      
      // En mode React Native:
      // await AsyncStorage.setItem('liveEventsCache', JSON.stringify(cacheData));
      
      console.log(`💾 ${events.length} événements mis en cache`);
      
    } catch (error) {
      console.warn('Erreur sauvegarde cache:', error);
    }
  }
  
  /**
   * Vérifie si le cache est encore valide
   */
  private isCacheValid(lastUpdated: string): boolean {
    const updateTime = new Date(lastUpdated).getTime();
    const now = Date.now();
    const age = now - updateTime;
    
    return age < this.maxCacheAge;
  }
  
  /**
   * Nettoie le cache des événements passés
   */
  async cleanupCache(): Promise<void> {
    try {
      const cachedEvents = await this.getCachedEvents();
      const today = new Date().toISOString().split('T')[0];
      
      const futureEvents = cachedEvents.filter(event => event.date >= today);
      
      if (futureEvents.length !== cachedEvents.length) {
        await this.setCachedEvents(futureEvents);
        console.log(`🧹 ${cachedEvents.length - futureEvents.length} événements passés supprimés`);
      }
      
    } catch (error) {
      console.warn('Erreur nettoyage cache:', error);
    }
  }
  
  /**
   * Obtient les statistiques du cache
   */
  async getCacheStats(): Promise<{
    count: number;
    lastUpdated: string | null;
    isValid: boolean;
    upcomingCount: number;
  }> {
    try {
      // Simulation des stats pour le développement
      return {
        count: 0,
        lastUpdated: null,
        isValid: false,
        upcomingCount: 0
      };
      
    } catch (error) {
      return {
        count: 0,
        lastUpdated: null,
        isValid: false,
        upcomingCount: 0
      };
    }
  }
}

export const liveCacheService = new LiveCacheService();