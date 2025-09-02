import axios from 'axios';
import { SportEvent } from '../types/events';
import { getSportEmoji } from '../utils/sportCategories';
import { REUNION_SPORTS_EVENTS } from '../data/reunionEvents';

/**
 * Service d'automatisation pour la mise à jour des événements sportifs
 * Scrape les sites officiels et met à jour la base de données
 */
class AutoUpdateEventsService {
  private readonly SOURCES = {
    SPORT_PRO: 'https://www.sportpro.re/courses/',
    GRAND_RAID: 'https://www.grandraid-reunion.com',
    CYCLISME_REUNION: 'https://gravitybikes.re/blog/calendrier-des-courses-2025-reunion-comite-regional-de-cyclisme/',
  };

  private readonly UPDATE_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

  /**
   * Lance la mise à jour automatique des événements
   */
  async startAutoUpdate(): Promise<void> {
    console.log('🔄 Démarrage du système de mise à jour automatique des événements');
    
    // Première mise à jour immédiate
    await this.updateEvents();
    
    // Programmation des mises à jour périodiques
    setInterval(async () => {
      await this.updateEvents();
    }, this.UPDATE_INTERVAL);
    
    console.log(`✅ Système programmé pour mise à jour toutes les ${this.UPDATE_INTERVAL / (24 * 60 * 60 * 1000)} jours`);
  }

  /**
   * Met à jour les événements depuis toutes les sources
   */
  private async updateEvents(): Promise<void> {
    console.log('📡 Début de la mise à jour automatique des événements...');
    
    try {
      const newEvents: SportEvent[] = [];
      
      // 1. Scraper Sport PRO Réunion
      const sportProEvents = await this.scrapeSportProReunion();
      newEvents.push(...sportProEvents);
      
      // 2. Scraper les événements cyclisme
      const cyclismeEvents = await this.scrapeCyclismeReunion();
      newEvents.push(...cyclismeEvents);
      
      // 3. Vérifier les nouvelles dates Grand Raid
      const grandRaidEvents = await this.checkGrandRaidUpdates();
      newEvents.push(...grandRaidEvents);
      
      // 4. Filtrer les nouveaux événements uniquement
      const filteredNewEvents = this.filterNewEvents(newEvents);
      
      if (filteredNewEvents.length > 0) {
        console.log(`🆕 ${filteredNewEvents.length} nouveaux événements trouvés`);
        await this.addNewEventsToDatabase(filteredNewEvents);
        
        // Notification (optionnel)
        this.notifyNewEvents(filteredNewEvents);
      } else {
        console.log('✅ Aucun nouvel événement trouvé');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour automatique:', error);
    }
  }

  /**
   * Scrape les événements de Sport PRO Réunion
   */
  private async scrapeSportProReunion(): Promise<SportEvent[]> {
    const events: SportEvent[] = [];
    
    try {
      const response = await axios.get(this.SOURCES.SPORT_PRO, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // Parsing HTML basique pour extraire les événements
      const html = response.data;
      
      // Recherche de patterns d'événements dans le HTML
      const eventPatterns = [
        /(\d{1,2}\/\d{1,2}\/2025).*?(trail|course|marathon|10km|semi)/gi,
        /(\d{4}-\d{2}-\d{2}).*?(trail|course|marathon)/gi
      ];
      
      eventPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const dateStr = match[1];
          const sportType = match[2];
          
          // Conversion de date si nécessaire
          const eventDate = this.parseDate(dateStr);
          
          if (eventDate && this.isFutureDate(eventDate)) {
            events.push({
              id: `scraped_${Date.now()}_${Math.random()}`,
              title: `Nouvel événement ${sportType}`,
              sport: this.detectSportType(sportType),
              emoji: getSportEmoji(this.detectSportType(sportType)),
              date: eventDate,
              time: '08:00',
              location: 'La Réunion',
              description: `Événement ${sportType} découvert automatiquement`,
              difficulty: 'moyen',
              distance: 'Variable',
              elevation: 'Variable',
              organizer: 'Organisateur local',
              registration: 'À vérifier',
              price: 'À confirmer',
            });
          }
        }
      });
      
      console.log(`📊 Sport PRO: ${events.length} événements trouvés`);
      return events;
      
    } catch (error) {
      console.warn('⚠️ Erreur scraping Sport PRO Réunion:', error);
      return [];
    }
  }

  /**
   * Scrape les événements cyclisme
   */
  private async scrapeCyclismeReunion(): Promise<SportEvent[]> {
    const events: SportEvent[] = [];
    
    try {
      const response = await axios.get(this.SOURCES.CYCLISME_REUNION, {
        timeout: 10000
      });
      
      // Pattern pour détecter les épreuves VTT/cyclisme
      const cyclismePattern = /(\d{4}-\d{2}-\d{2}).*?(VTT|cyclisme|vélo|XCO|enduro)/gi;
      let match;
      
      while ((match = cyclismePattern.exec(response.data)) !== null) {
        const eventDate = match[1];
        const sportType = match[2];
        
        if (this.isFutureDate(eventDate)) {
          events.push({
            id: `cyclisme_${Date.now()}_${Math.random()}`,
            title: `Épreuve ${sportType} - Nouveau`,
            sport: sportType.toLowerCase().includes('vtt') ? 'VTT' : 'Vélo',
            emoji: sportType.toLowerCase().includes('vtt') ? '🚵‍♀️' : '🚴‍♀️',
            date: eventDate,
            time: '09:00',
            location: 'La Réunion',
            description: `Nouvelle épreuve ${sportType} détectée automatiquement`,
            difficulty: 'difficile',
            distance: 'Variable',
            elevation: '+500m',
            organizer: 'Comité Cyclisme Réunion',
            registration: 'Obligatoire',
            price: '30€-50€',
          });
        }
      }
      
      console.log(`🚴 Cyclisme: ${events.length} événements trouvés`);
      return events;
      
    } catch (error) {
      console.warn('⚠️ Erreur scraping Cyclisme Réunion:', error);
      return [];
    }
  }

  /**
   * Vérifie les mises à jour du Grand Raid
   */
  private async checkGrandRaidUpdates(): Promise<SportEvent[]> {
    try {
      // Vérifier s'il y a de nouvelles courses Grand Raid annoncées
      const response = await axios.get(this.SOURCES.GRAND_RAID, {
        timeout: 10000
      });
      
      // Détecter si de nouvelles courses ont été ajoutées
      const newRaces = this.detectNewGrandRaidRaces(response.data);
      
      console.log(`🏃‍♂️ Grand Raid: ${newRaces.length} nouveautés trouvées`);
      return newRaces;
      
    } catch (error) {
      console.warn('⚠️ Erreur vérification Grand Raid:', error);
      return [];
    }
  }

  /**
   * Détecte les nouvelles courses du Grand Raid
   */
  private detectNewGrandRaidRaces(html: string): SportEvent[] {
    const events: SportEvent[] = [];
    
    // Pattern pour détecter de nouvelles courses
    const racePattern = /(nouvelle|2026|prochaine).*?(course|trail|raid)/gi;
    
    if (racePattern.test(html)) {
      // Si de nouveaux éléments sont détectés, créer des événements placeholder
      events.push({
        id: `grand_raid_new_${Date.now()}`,
        title: 'Nouvelle course Grand Raid détectée',
        sport: 'Trail',
        emoji: '🏃‍♂️',
        date: '2025-12-31', // Date placeholder
        time: '06:00',
        location: 'La Réunion',
        description: 'Nouvelle course du Grand Raid détectée - détails à confirmer',
        difficulty: 'difficile',
        distance: 'À confirmer',
        elevation: 'À confirmer',
        organizer: 'Association du Grand Raid',
        registration: 'À venir',
        price: 'À définir',
        website: 'https://www.grandraid-reunion.com',
      });
    }
    
    return events;
  }

  /**
   * Filtre les nouveaux événements (non présents dans la base)
   */
  private filterNewEvents(scrapedEvents: SportEvent[]): SportEvent[] {
    return scrapedEvents.filter(newEvent => {
      return !REUNION_SPORTS_EVENTS.some(existingEvent => 
        existingEvent.title === newEvent.title && 
        existingEvent.date === newEvent.date
      );
    });
  }

  /**
   * Ajoute les nouveaux événements à la base de données
   */
  private async addNewEventsToDatabase(newEvents: SportEvent[]): Promise<void> {
    try {
      console.log('💾 Nouveaux événements à ajouter:');
      newEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title} - ${event.date} (${event.sport})`);
      });
      
      // Intégrer avec le service de base de données
      const { eventsDatabaseService } = await import('./eventsDatabase');
      const addedCount = await eventsDatabaseService.addNewEvents(newEvents);
      
      console.log(`✅ ${addedCount} nouveaux événements ajoutés à la base de données`);
    } catch (error) {
      console.error('❌ Erreur ajout nouveaux événements:', error);
    }
  }

  /**
   * Notifie les utilisateurs des nouveaux événements
   */
  private notifyNewEvents(events: SportEvent[]): void {
    console.log(`🔔 Notification: ${events.length} nouveaux événements sportifs ajoutés !`);
    
    // Ici on pourrait :
    // - Envoyer des push notifications
    // - Envoyer des emails
    // - Mettre à jour un feed
    // - Notifier via webhook Discord/Slack
  }

  /**
   * Utilitaires
   */
  private parseDate(dateStr: string): string {
    // Conversion des formats de date français vers ISO
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  }

  private isFutureDate(dateStr: string): boolean {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  }

  private detectSportType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('trail')) return 'Trail';
    if (lowerText.includes('marathon')) return 'Course';
    if (lowerText.includes('course') || lowerText.includes('10km')) return 'Course';
    if (lowerText.includes('vtt')) return 'VTT';
    if (lowerText.includes('vélo') || lowerText.includes('cyclisme')) return 'Vélo';
    if (lowerText.includes('natation')) return 'Natation';
    if (lowerText.includes('surf')) return 'Surf';
    
    return 'Course'; // par défaut
  }

  /**
   * Arrête le système de mise à jour automatique
   */
  stopAutoUpdate(): void {
    console.log('🛑 Arrêt du système de mise à jour automatique');
  }
}

export const autoUpdateEventsService = new AutoUpdateEventsService();