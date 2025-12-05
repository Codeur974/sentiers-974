// Service pour récupérer les données des sentiers depuis notre API MongoDB
// Structure COMPLÈTE basée sur la liste exacte de randopitons.re

import Constants from 'expo-constants';

// Production: Backend déployé sur Render avec HTTPS
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl
  ? `${Constants.expoConfig.extra.apiUrl}/api`
  : 'https://sentiers-974.onrender.com/api';

export interface SentierReel {
  id: string;
  nom: string;
  difficulte: 'Facile' | 'Modéré' | 'Difficile' | 'Très difficile' | 'Expert';
  distance: number; // en km
  duree_heures: number;
  duree_formatee: string; // "4h30" format pour affichage
  denivele_positif: number; // en mètres
  denivele_negatif: number;
  type: 'Randonnée' | 'VTT' | 'Trail';
  region: 'Cirque de Cilaos' | 'Cirque de Mafate' | 'Cirque de Salazie' | 'Est' | 'Nord' | 'Ouest' | 'Sud' | 'Volcan';
  zone_specifique?: string; // IMPORTANT : Utiliser zone_specifique (pas sous_region)
  commune_depart?: string;
  description: string;
  points_interet: string[];
  point_depart: {
    nom: string;
    coordonnees: [number, number]; // [longitude, latitude]
    altitude: number;
    acces_voiture: boolean;
    parking_disponible: boolean;
  };
  point_arrivee?: {
    nom: string;
    coordonnees: [number, number];
    altitude: number;
  };
  trace_gpx?: string; // URL vers fichier GPX
  equipements_requis: string[];
  equipements_recommandes: string[];
  periode_ideale: {
    debut: string; // mois
    fin: string;
  };
  restrictions?: string[];
  dangers: string[];
  services_proximite: {
    hebergements: string[];
    restaurants: string[];
    locations_materiel: string[];
  };
  contact_urgence: {
    secours_montagne: string;
    gendarmerie: string;
  };
  derniere_mise_a_jour: string;
  source: 'IGN' | 'ParcNational' | 'OfficeToursime' | 'Communaute' | 'Randopitons';
  certification_officielle: boolean;
  balisage: {
    couleur?: string;
    type: string;
    etat: 'Excellent' | 'Bon' | 'Moyen' | 'Dégradé';
  };
}

class SentiersService {
  private readonly API_BASE = 'https://wxs.ign.fr/cartes/geoportail/r/wms';
  private readonly OVERPASS_API = 'https://overpass-api.de/api/interpreter';
  private readonly PARC_NATIONAL_API = 'https://www.reunion-parcnational.fr/api/sentiers';

  /**
   * Structure hiérarchique EXACTE des régions et sous-régions (basée sur votre fichier data/Nom des randonnées.md)
   */
  public static readonly REGIONS_HIERARCHY = {
    'Cirque de Cilaos': {
      emoji: '🏔️',
      sous_regions: [
        'Dans les alentours de Bras Sec',
        'Depuis la route de l\'Ilet à Cordes ou de l\'Îlet à Cordes',
        'Depuis la ville de Cilaos',
        'Depuis le Pavillon',
        'Depuis Palmiste Rouge',
        'Depuis le Bloc'
      ]
    },
    'Cirque de Mafate': {
      emoji: '🏕️',
      sous_regions: [
        'A partir du Maïdo',
        'A Sans Souci',
        'Depuis un îlet du cirque',
        'Par le Col des Boeufs, le Bélier',
        'De la Rivière des Galets',
        'Depuis Dos D\'Ane'
      ]
    },
    'Cirque de Salazie': {
      emoji: '🌿',
      sous_regions: [
        'A partir de Hell-Bourg ou de l\'Ilet à Vidot',
        'Depuis Grand Ilet ou la mare à Martin',
        'Depuis Salazie'
      ]
    },
    'Est': {
      emoji: '🌴',
      sous_regions: [
        'Depuis Bras Panon',
        'Depuis Saint-André',
        'Du côté de Bourg Murat',
        'La région de St Benoit',
        'Les alentours de Bois Blanc et Sainte-Rose',
        'Les alentours du volcan',
        'La région de la Plaine des Palmistes',
        'La région de Bébour - Bélouve'
      ]
    },
    'Nord': {
      emoji: '🏖️',
      sous_regions: [
        'Depuis Dos d\'Ane',
        'Depuis le Brûlé',
        'Depuis Sainte-Suzanne',
        'La Montagne ou Saint-Bernard',
        'La Possession',
        'Les alentours de Saint-Denis',
        'Plusieurs directions vers la Roche Ecrite',
        'Région de Saint-André'
      ]
    },
    'Ouest': {
      emoji: '🌅',
      sous_regions: [
        'Autour du Maïdo et RF Cryptomerias',
        'Environs du Tévelave',
        'Etang Salé les Hauts ou Avirons',
        'La région de Saint-Leu',
        'La région des Makes',
        'Le long de la RF des Tamarins',
        'Saint Paul',
        'Saint-Gilles et Ermitage',
        'Région de Bois d\'Olive et Saint-Louis',
        'Vers l\' Etang Salé',
        'La Rivière'
      ]
    },
    'Sud': {
      emoji: '🌋',
      sous_regions: [
        'A Grand Coude',
        'Autour de Petite Ile ou St Pierre',
        'Entre le Volcan et Bourg Murat',
        'La région de Langevin',
        'La région de Saint Joseph',
        'La région du Tampon',
        'Les alentours de l\'Entre-Deux',
        'Région de Bois Court',
        'Saint-Philippe et le Tremblet',
        'La région de Grand Galet',
        'Région de la Plaine des Grègues'
      ]
    },
    'Volcan': {
      emoji: '🔥',
      sous_regions: [
        'Volcan Enclos',
        'Volcan Hors enclos',
        'Volcan Nord',
        'Volcan Sud'
      ]
    }
  };

  /**
   * Formate la durée en heures vers le format "Xh Ymin"
   */
  private formatDuration(heures: number): string {
    const h = Math.floor(heures);
    const min = Math.round((heures - h) * 60);
    
    if (h === 0) return `${min}min`;
    if (min === 0) return `${h}h`;
    return `${h}h${min < 10 ? '0' : ''}${min}`;
  }
  
  // Bounding box de La Réunion
  private readonly REUNION_BBOX = {
    south: -21.3896,
    west: 55.2164,
    north: -20.8717,
    east: 55.8369
  };

  /**
   * Récupère tous les sentiers depuis notre API MongoDB
   */
  async getAllSentiers(filters?: {
    region?: string;
    zone_specifique?: string; // IMPORTANT : Utiliser zone_specifique
    difficulte?: string;
    type?: string;
    commune?: string;
    distance_min?: number;
    distance_max?: number;
    search?: string;
  }): Promise<SentierReel[]> {
    try {
      console.log('🔍 Récupération des sentiers depuis API MongoDB...');
      
      // Construction des paramètres de requête
      const params = new URLSearchParams();
      if (filters?.region) params.append('region', filters.region);
      if (filters?.zone_specifique) params.append('zone_specifique', filters.zone_specifique); // CORRIGÉ
      if (filters?.difficulte) params.append('difficulte', filters.difficulte);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.commune) params.append('commune', filters.commune);
      if (filters?.distance_min) params.append('distance_min', filters.distance_min.toString());
      if (filters?.distance_max) params.append('distance_max', filters.distance_max.toString());
      if (filters?.search) params.append('search', filters.search);
      
      // Demander plus de sentiers (par défaut 200)
      params.append('limit', '1000');
      
      const url = `${API_BASE_URL}/sentiers${params.toString() ? '?' + params.toString() : ''}`;
      console.log('🌐 URL API:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Erreur API:', response.status, response.statusText);
        throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
      }

      const apiResponse = await response.json();
      
      // L'API retourne un format avec pagination: {data: [...], pagination: {...}, success: true}
      let data;
      if (apiResponse.success && Array.isArray(apiResponse.data)) {
        data = apiResponse.data;
        console.log(`✅ ${data.length} sentiers récupérés depuis MongoDB (total: ${apiResponse.pagination?.total || data.length})`);
      } else if (Array.isArray(apiResponse)) {
        // Fallback si l'API retourne directement un tableau
        data = apiResponse;
        console.log(`✅ ${data.length} sentiers récupérés depuis MongoDB`);
      } else {
        console.error('❌ Format de données invalide:', apiResponse);
        throw new Error('Format de données invalide depuis l\'API');
      }
      
      // Convertir et formater les données
      const sentiers: SentierReel[] = data.map((item: any) => ({
        id: item._id || item.id,
        nom: item.nom || 'Sentier sans nom',
        difficulte: this.mapDifficulte(item.difficulte),
        distance: item.distance || 0,
        duree_heures: item.duree_heures || 0,
        duree_formatee: this.formatDuration(item.duree_heures || 0),
        denivele_positif: item.denivele_positif || 0,
        denivele_negatif: item.denivele_negatif || 0,
        type: item.type || 'Randonnée',
        region: item.region,
        zone_specifique: item.zone_specifique, // IMPORTANT : Utiliser zone_specifique
        commune_depart: item.commune_depart,
        description: item.description || '',
        points_interet: item.points_interet || [],
        point_depart: item.point_depart || {
          nom: 'Point de départ',
          coordonnees: [-21.1151, 55.5364], // Centre de La Réunion par défaut
          altitude: 0,
          acces_voiture: true,
          parking_disponible: true
        },
        point_arrivee: item.point_arrivee,
        trace_gpx: item.trace_gpx,
        equipements_requis: item.equipements_requis || [],
        equipements_recommandes: item.equipements_recommandes || [],
        periode_ideale: item.periode_ideale || { debut: 'avril', fin: 'novembre' },
        restrictions: item.restrictions || [],
        dangers: item.dangers || [],
        services_proximite: item.services_proximite || {
          hebergements: [],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: item.contact_urgence || {
          secours_montagne: '15',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: item.derniere_mise_a_jour || new Date().toISOString(),
        source: item.source || 'Randopitons',
        certification_officielle: item.certification_officielle || false,
        balisage: item.balisage || {
          type: 'Sentier balisé',
          etat: 'Bon'
        }
      }));

      return sentiers;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des sentiers:', error);
      
      // En cas d'erreur, retourner des données vides plutôt qu'un crash
      return [];
    }
  }

  /**
   * Récupère un sentier spécifique par son ID
   */
  async getSentierById(id: string): Promise<SentierReel | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/sentiers/${id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération du sentier:', error);
      return null;
    }
  }

  /**
   * Récupère les statistiques des sentiers
   */
  async getStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/sentiers/stats`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      return null;
    }
  }

  /**
   * Mappe les niveaux de difficulté depuis l'API
   */
  private mapDifficulte(difficulte: string): SentierReel['difficulte'] {
    if (!difficulte) return 'Modéré';
    
    const diff = difficulte.toLowerCase();
    
    if (diff.includes('très facile') || diff.includes('familiale')) return 'Facile';
    if (diff.includes('facile')) return 'Facile';
    if (diff.includes('moyen') || diff.includes('modéré')) return 'Modéré';
    if (diff.includes('difficile') && diff.includes('très')) return 'Très difficile';
    if (diff.includes('difficile')) return 'Difficile';
    if (diff.includes('expert')) return 'Expert';
    
    return 'Modéré';
  }

  /**
   * Obtient la liste des régions avec émojis
   */
  static getRegions(): Array<{nom: string, emoji: string, sous_regions: string[]}> {
    return Object.entries(this.REGIONS_HIERARCHY).map(([nom, data]) => ({
      nom,
      emoji: data.emoji,
      sous_regions: data.sous_regions
    }));
  }

  /**
   * Obtient les sous-régions d'une région donnée
   */
  static getSousRegions(region: string): string[] {
    return this.REGIONS_HIERARCHY[region as keyof typeof this.REGIONS_HIERARCHY]?.sous_regions || [];
  }

  /**
   * Obtient l'émoji d'une région donnée
   */
  static getRegionEmoji(region: string): string {
    return this.REGIONS_HIERARCHY[region as keyof typeof this.REGIONS_HIERARCHY]?.emoji || '🏔️';
  }
}

export { SentiersService };
export default new SentiersService();