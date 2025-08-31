import axios from 'axios';
import { SportEvent } from './eventsApi';
import { getSportEmoji } from '../utils/sportCategories';

/**
 * Service pour récupérer les événements sportifs en temps réel
 * Combine plusieurs sources : APIs officielles, scraping, OpenAgenda
 */
class LiveEventsApiService {
  private readonly OPENAGENDA_KEY = process.env.EXPO_PUBLIC_OPENAGENDA_KEY || '';
  
  /**
   * Récupère tous les événements sportifs en temps réel
   */
  async getAllLiveEvents(): Promise<SportEvent[]> {
    const allEvents: SportEvent[] = [];

    try {
      // 1. OpenAgenda - recherche spécifique Réunion
      const openAgendaEvents = await this.getOpenAgendaEvents();
      allEvents.push(...openAgendaEvents);

      // 2. Scraping sites web réunionnais
      const scrapedEvents = await this.getScrapedEvents();
      allEvents.push(...scrapedEvents);

      // 3. API gouvernementales
      const govEvents = await this.getGovernmentEvents();
      allEvents.push(...govEvents);

      console.log(`📊 Total événements live récupérés: ${allEvents.length}`);
      
      // Dédoublonnage et tri par date
      return this.deduplicateAndSort(allEvents);

    } catch (error) {
      console.warn('Erreur récupération événements live:', error);
      return [];
    }
  }

  /**
   * Récupère les événements depuis OpenAgenda
   */
  private async getOpenAgendaEvents(): Promise<SportEvent[]> {
    try {
      const searches = [
        'La Réunion sport trail course',
        '974 marathon running vélo',
        'Saint-Denis Saint-Pierre Saint-Paul sport'
      ];

      const events: SportEvent[] = [];

      for (const query of searches) {
        try {
          const response = await axios.get('https://api.openagenda.com/v2/agendas', {
            params: {
              key: this.OPENAGENDA_KEY,
              q: query,
              size: 20
            },
            timeout: 10000
          });

          if (response.data?.agendas) {
            for (const agenda of response.data.agendas.slice(0, 5)) {
              const agendaEvents = await this.getEventsFromAgenda(agenda.uid);
              events.push(...agendaEvents);
            }
          }
        } catch (error) {
          console.warn(`Erreur OpenAgenda recherche "${query}":`, error);
        }
      }

      console.log(`📅 OpenAgenda: ${events.length} événements trouvés`);
      return events;

    } catch (error) {
      console.warn('Erreur OpenAgenda générale:', error);
      return [];
    }
  }

  /**
   * Récupère les événements d'un agenda spécifique
   */
  private async getEventsFromAgenda(agendaUid: string): Promise<SportEvent[]> {
    try {
      const response = await axios.get(`https://api.openagenda.com/v2/agendas/${agendaUid}/events`, {
        params: {
          key: this.OPENAGENDA_KEY,
          size: 50,
          when: 'upcoming'
        },
        timeout: 8000
      });

      return (response.data?.events || [])
        .filter(this.isSportEvent)
        .map(this.convertOpenAgendaEvent)
        .filter(event => this.isReunionEvent(event));

    } catch (error) {
      console.warn(`Erreur récupération agenda ${agendaUid}:`, error);
      return [];
    }
  }

  /**
   * Scraping des sites web réunionnais
   */
  private async getScrapedEvents(): Promise<SportEvent[]> {
    const events: SportEvent[] = [];

    try {
      // Site réunionsport.com
      const reunionSportEvents = await this.scrapeReunionSport();
      events.push(...reunionSportEvents);

      // Site département 974
      const depEvents = await this.scrapeDepartement974();
      events.push(...depEvents);

      console.log(`🕷️ Scraping: ${events.length} événements trouvés`);
      return events;

    } catch (error) {
      console.warn('Erreur scraping:', error);
      return [];
    }
  }

  /**
   * Scraping du site reunionsport.com
   */
  private async scrapeReunionSport(): Promise<SportEvent[]> {
    try {
      const response = await axios.get('https://reunionsport.com/wp-json/wp/v2/posts', {
        params: {
          per_page: 20,
          categories: 'sport,événement,competition',
          _fields: 'title,excerpt,date,link,categories'
        },
        timeout: 10000
      });

      return (response.data || [])
        .filter((post: any) => this.containsSportKeywords(post.title?.rendered || ''))
        .map(this.convertWordPressPost);

    } catch (error) {
      console.warn('Erreur scraping reunionsport.com:', error);
      return [];
    }
  }

  /**
   * Scraping du site département 974
   */
  private async scrapeDepartement974(): Promise<SportEvent[]> {
    try {
      // Note: Le département n'a pas d'API publique, donc scraping HTML
      const response = await axios.get('https://www.departement974.fr/agenda', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SentierApp/1.0)'
        }
      });

      // Parsing HTML simplifié (à améliorer avec cheerio si nécessaire)
      const events = this.parseHtmlEvents(response.data);
      return events;

    } catch (error) {
      console.warn('Erreur scraping département974:', error);
      return [];
    }
  }

  /**
   * APIs gouvernementales
   */
  private async getGovernmentEvents(): Promise<SportEvent[]> {
    try {
      // API data.gouv.fr pour infrastructures sportives
      const response = await axios.get('https://www.data.gouv.fr/api/1/datasets/', {
        params: {
          q: 'sport événement Réunion 974',
          page_size: 10
        },
        timeout: 10000
      });

      // Transformer les datasets en événements (logique à adapter)
      const events = (response.data?.data || [])
        .filter((dataset: any) => this.isEventDataset(dataset))
        .map(this.convertDatasetToEvent);

      console.log(`🏛️ APIs gouvernementales: ${events.length} événements`);
      return events;

    } catch (error) {
      console.warn('Erreur APIs gouvernementales:', error);
      return [];
    }
  }

  /**
   * Filtres et conversions
   */
  private isSportEvent = (event: any): boolean => {
    const title = event.title?.fr || event.title || '';
    const description = event.description?.fr || event.description || '';
    const text = `${title} ${description}`.toLowerCase();
    
    const sportKeywords = [
      'trail', 'course', 'marathon', 'running', 'vélo', 'vtt', 'cyclisme',
      'natation', 'surf', 'sport', 'randonnée', 'escalade', 'kayak',
      'triathlon', 'fitness', 'musculation', 'tennis', 'football'
    ];

    return sportKeywords.some(keyword => text.includes(keyword));
  };

  private isReunionEvent = (event: SportEvent): boolean => {
    const location = event.location.toLowerCase();
    const title = event.title.toLowerCase();
    
    const reunionKeywords = [
      'réunion', '974', 'saint-denis', 'saint-pierre', 'saint-paul',
      'saint-louis', 'le port', 'la possession', 'saint-andré',
      'saint-benoit', 'sainte-marie', 'sainte-suzanne', 'salazie',
      'cilaos', 'entre-deux', 'plaine-des-palmistes', 'petite-île',
      'saint-leu', 'trois-bassins', 'avirons', 'étang-salé',
      'tampon', 'saint-joseph', 'maïdo', 'piton', 'cirque'
    ];

    return reunionKeywords.some(keyword => 
      location.includes(keyword) || title.includes(keyword)
    );
  };

  private containsSportKeywords = (text: string): boolean => {
    const keywords = [
      'course', 'trail', 'marathon', 'semi', 'sport', 'running',
      'vélo', 'vtt', 'natation', 'competition', 'championnat',
      'tournoi', 'match', 'rencontre'
    ];
    
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  };

  private convertOpenAgendaEvent = (event: any): SportEvent => {
    const startDate = new Date(event.dateRange?.start || event.firstDate);
    
    return {
      id: `openagenda_${event.uid}`,
      title: event.title?.fr || event.title || 'Événement sportif',
      sport: this.detectSportType(event.title?.fr || event.title || ''),
      emoji: getSportEmoji(this.detectSportType(event.title?.fr || event.title || '')),
      date: startDate.toISOString().split('T')[0],
      time: startDate.toTimeString().substring(0, 5),
      location: event.location?.name || 'La Réunion',
      description: event.description?.fr || event.description || 'Événement sportif',
      difficulty: 'moyen',
      organizer: event.organizer || 'OpenAgenda',
      registration: 'Voir site web',
      price: 'Variable',
      website: event.canonicalUrl || event.url
    };
  };

  private convertWordPressPost = (post: any): SportEvent => {
    const postDate = new Date(post.date);
    
    return {
      id: `wordpress_${post.id}`,
      title: post.title?.rendered || 'Actualité sportive',
      sport: this.detectSportType(post.title?.rendered || ''),
      emoji: getSportEmoji(this.detectSportType(post.title?.rendered || '')),
      date: postDate.toISOString().split('T')[0],
      time: '10:00',
      location: 'La Réunion',
      description: this.stripHtml(post.excerpt?.rendered || ''),
      difficulty: 'moyen',
      organizer: 'Reunion Sport',
      registration: 'Voir article',
      price: 'Non spécifié',
      website: post.link
    };
  };

  private parseHtmlEvents = (html: string): SportEvent[] => {
    // Parsing HTML simplifié - à améliorer avec une vraie lib HTML
    const events: SportEvent[] = [];
    
    // Cette fonction nécessiterait cheerio pour un parsing correct
    // Pour l'instant, retour vide
    
    return events;
  };

  private convertDatasetToEvent = (dataset: any): SportEvent => {
    return {
      id: `dataset_${dataset.id}`,
      title: dataset.title || 'Dataset sportif',
      sport: 'Data',
      emoji: '📊',
      date: new Date(dataset.created_at).toISOString().split('T')[0],
      time: '00:00',
      location: 'La Réunion',
      description: dataset.description || 'Dataset gouvernemental',
      difficulty: 'info',
      organizer: 'data.gouv.fr',
      registration: 'Consultation libre',
      price: 'Gratuit',
      website: dataset.page
    };
  };

  private isEventDataset = (dataset: any): boolean => {
    const title = (dataset.title || '').toLowerCase();
    return title.includes('événement') || title.includes('competition') || title.includes('sport');
  };

  private detectSportType = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('trail')) return 'Trail';
    if (lowerText.includes('marathon') || lowerText.includes('course')) return 'Course';
    if (lowerText.includes('vélo') || lowerText.includes('cyclisme')) return 'Vélo';
    if (lowerText.includes('vtt')) return 'VTT';
    if (lowerText.includes('natation')) return 'Natation';
    if (lowerText.includes('surf')) return 'Surf';
    if (lowerText.includes('rando')) return 'Randonnée';
    if (lowerText.includes('escalade')) return 'Escalade';
    
    return 'Sport';
  };


  private stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, '').substring(0, 200);
  };

  private deduplicateAndSort = (events: SportEvent[]): SportEvent[] => {
    // Dédoublonnage par titre similaire
    const unique = events.filter((event, index, self) => 
      index === self.findIndex(e => 
        this.similarTitles(e.title, event.title) && e.date === event.date
      )
    );

    // Tri par date
    return unique.sort((a, b) => a.date.localeCompare(b.date));
  };

  private similarTitles = (title1: string, title2: string): boolean => {
    const clean1 = title1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = title2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return clean1 === clean2 || 
           clean1.includes(clean2) || 
           clean2.includes(clean1);
  };
}

export const liveEventsApi = new LiveEventsApiService();