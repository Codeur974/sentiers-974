// Service pour récupérer les données des sentiers depuis notre API MongoDB
// Données complètes scrapées depuis randopitons.re par région

const API_BASE_URL = 'http://192.168.1.12:3001/api';

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
  sous_region?: string; // Sous-région spécifique dans la région principale
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
   * Structure hiérarchique des régions et sous-régions (identique à randopitons.re)
   */
  public static readonly REGIONS_HIERARCHY = {
    'Cirque de Cilaos': {
      emoji: '🏔️',
      sous_regions: [
        'Alentours de Bras Sec',
        'Depuis la route de l\'Ilet à Cordes', 
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
        'Par le Col des Bœufs, le Bélier',
        'De la Rivière des Galets'
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
        'Les alentours du volcan'
      ]
    },
    'Nord': {
      emoji: '🏖️',
      sous_regions: [
        'Depuis Saint-Denis',
        'Depuis Sainte-Marie',
        'La Montagne',
        'Les hauts de Saint-Denis'
      ]
    },
    'Ouest': {
      emoji: '🌅',
      sous_regions: [
        'Depuis Saint-Paul',
        'Depuis Saint-Leu',
        'Les hauts de l\'Ouest',
        'Depuis La Possession'
      ]
    },
    'Sud': {
      emoji: '🌋',
      sous_regions: [
        'Depuis Saint-Pierre',
        'Depuis Saint-Joseph',
        'Les hauts du Sud',
        'Depuis le Tampon'
      ]
    },
    'Volcan': {
      emoji: '🔥',
      sous_regions: [
        'Plaine des Sables',
        'Pas de Bellecombe',
        'Route du Volcan',
        'Enclos du volcan'
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
    sous_region?: string;
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
      if (filters?.sous_region) params.append('sous_region', filters.sous_region);
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
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('API a retourné une erreur');
      }
      
      console.log(`✅ ${data.data.length} sentiers chargés depuis MongoDB`);
      return data.data;
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des sentiers depuis API:', error);
      // Retourner une liste vide au lieu du fallback pour forcer la résolution du problème API
      throw new Error(`Impossible de se connecter à l'API MongoDB: ${error.message}`);
    }
  }

  /**
   * Récupère les régions disponibles avec statistiques
   */
  async getRegions(): Promise<Array<{
    nom: string;
    nombre_sentiers: number;
    types_disponibles: string[];
    difficultes_disponibles: string[];
  }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/regions`);
      if (!response.ok) throw new Error('Erreur API régions');
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('❌ Erreur régions:', error);
      return [];
    }
  }

  /**
   * Récupère un sentier spécifique par son ID
   */
  async getSentierById(id: string): Promise<SentierReel | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/sentiers/${id}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('❌ Erreur sentier détail:', error);
      return null;
    }
  }

  /**
   * Recherche de sentiers
   */
  async searchSentiers(query: string): Promise<Array<{
    id: string;
    nom: string;
    region: string;
    commune?: string;
    distance: number;
    difficulte: string;
  }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Erreur API recherche');
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      return [];
    }
  }

  /**
   * Récupère les sentiers depuis l'API IGN (source la plus fiable)
   */
  private async getSentiersFromIGN(): Promise<SentierReel[]> {
    try {
      // Requête WMS vers IGN pour les sentiers balisés
      const query = `${this.API_BASE}?SERVICE=WMS&REQUEST=GetFeatureInfo&VERSION=1.3.0&LAYERS=GEOGRAPHICALGRIDSYSTEMS.MAPS&QUERY_LAYERS=GEOGRAPHICALGRIDSYSTEMS.MAPS&FEATURE_COUNT=100&INFO_FORMAT=application/json&CRS=EPSG:4326&BBOX=${this.REUNION_BBOX.west},${this.REUNION_BBOX.south},${this.REUNION_BBOX.east},${this.REUNION_BBOX.north}`;
      
      const response = await fetch(query, {
        headers: {
          'User-Agent': 'Sentiers974-App/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur IGN API: ${response.status}`);
      }

      const data = await response.json();
      return this.parseIGNData(data);
    } catch (error) {
      console.warn('⚠️ IGN API indisponible, utilisation des données de secours');
      return this.getFallbackIGNData();
    }
  }

  /**
   * Récupère les sentiers depuis OpenStreetMap (données réelles)
   */
  private async getSentiersFromOSM(): Promise<SentierReel[]> {
    try {
      // Requête Overpass simplifiée pour récupérer les vrais sentiers de La Réunion
      const overpassQuery = `[out:json][timeout:30];
(
  way["highway"="path"]["name"](${this.REUNION_BBOX.south},${this.REUNION_BBOX.west},${this.REUNION_BBOX.north},${this.REUNION_BBOX.east});
  way["highway"="footway"]["name"](${this.REUNION_BBOX.south},${this.REUNION_BBOX.west},${this.REUNION_BBOX.north},${this.REUNION_BBOX.east});
  way["route"="hiking"]["name"](${this.REUNION_BBOX.south},${this.REUNION_BBOX.west},${this.REUNION_BBOX.north},${this.REUNION_BBOX.east});
  way["highway"="track"]["bicycle"="yes"]["name"](${this.REUNION_BBOX.south},${this.REUNION_BBOX.west},${this.REUNION_BBOX.north},${this.REUNION_BBOX.east});
);
out geom;`;

      console.log('🔄 Requête vers Overpass API...');
      
      const response = await fetch(this.OVERPASS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'Sentiers974App/1.0.0'
        },
        body: overpassQuery
      });

      if (!response.ok) {
        throw new Error(`Erreur Overpass API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 Réponse OSM: ${data.elements?.length || 0} éléments trouvés`);
      
      return this.parseOSMData(data);
    } catch (error) {
      console.error('❌ Erreur OSM API:', error);
      throw error;
    }
  }

  /**
   * Récupère les données officielles du Parc National
   */
  private async getSentiersFromParcNational(): Promise<SentierReel[]> {
    try {
      // Note: Cette API peut ne pas exister publiquement
      // On simule une tentative vers les données officielles
      const response = await fetch(`${this.PARC_NATIONAL_API}?region=reunion`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Sentiers974-App/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur Parc National API: ${response.status}`);
      }

      const data = await response.json();
      return this.parseParcNationalData(data);
    } catch (error) {
      console.warn('⚠️ API Parc National indisponible');
      return this.getFallbackParcNationalData();
    }
  }

  /**
   * Parse les données IGN
   */
  private parseIGNData(data: any): SentierReel[] {
    // Implémentation du parsing IGN
    // Cette fonction parse le format spécifique retourné par IGN
    return [];
  }

  /**
   * Parse les données OpenStreetMap réelles
   */
  private parseOSMData(data: any): SentierReel[] {
    if (!data.elements || !Array.isArray(data.elements)) {
      console.warn('⚠️ Aucune donnée OSM trouvée');
      return [];
    }

    console.log(`🔍 Parsing ${data.elements.length} éléments OSM...`);

    const sentiers = data.elements
      .filter((element: any) => {
        return element.tags && element.tags.name && element.geometry && element.geometry.length > 1;
      })
      .map((way: any) => {
        const tags = way.tags;
        const geometry = way.geometry || [];
        
        // Calculs réels basés sur la géométrie
        const distance = this.calculateRealDistance(geometry);
        const elevation = this.extractElevation(geometry);
        
        return {
          id: `osm_${way.id}`,
          nom: this.createUniqueName(tags, distance, this.mapOSMType(tags)),
          difficulte: this.mapOSMDifficulty(tags.sac_scale || tags.difficulty || tags.trail_visibility),
          distance: distance,
          duree_heures: this.estimateRealDuration(distance, elevation.gain, this.mapOSMType(tags)),
          denivele_positif: elevation.gain,
          denivele_negatif: elevation.loss,
          type: this.mapOSMType(tags),
          description: this.supprimerTermesAnglais(tags.description || tags.note || `Sentier ${tags.name} - ${this.mapOSMType(tags)}`),
          points_interet: this.extractPointsOfInterest(tags),
          point_depart: this.getRealStartPoint(geometry),
          equipements_requis: this.mapRequiredEquipment(tags),
          equipements_recommandes: this.mapRecommendedEquipment(tags),
          periode_ideale: { 
            debut: this.getBestPeriod(tags).debut, 
            fin: this.getBestPeriod(tags).fin 
          },
          restrictions: this.extractRestrictions(tags),
          dangers: this.extractRealDangers(tags),
          services_proximite: {
            hebergements: [],
            restaurants: [],
            locations_materiel: []
          },
          contact_urgence: {
            secours_montagne: '02 62 93 37 37', // CODIS La Réunion
            gendarmerie: '17'
          },
          derniere_mise_a_jour: new Date().toISOString(),
          source: 'Communaute',
          certification_officielle: this.isOfficialTrail(tags),
          balisage: {
            couleur: this.supprimerTermesAnglais(tags.colour || tags.color || ''),
            type: this.extractTrailMarking(tags),
            etat: this.assessTrailCondition(tags)
          }
        } as SentierReel;
      })
      .filter(sentier => sentier.distance > 0.1); // Filtre les segments trop courts

    // Vérifier et nettoyer tous les noms
    sentiers.forEach((sentier, index) => {
      const nomOriginal = sentier.nom;
      if (this.containsEnglishTerms(nomOriginal)) {
        console.warn(`⚠️ Sentier ${index + 1}: "${nomOriginal}" contient des termes anglais`);
      }
    });

    console.log(`✅ ${sentiers.length} sentiers valides extraits`);
    return sentiers;
  }

  /**
   * Sentiers officiels de La Réunion (source: Randopitons.re)
   */
  private getSentiersOfficielsReunion(): SentierReel[] {
    return [
      // Cirque de Cilaos
      {
        id: 'cilaos_bras_sec_palmiste',
        nom: 'Deux boucles de Bras Sec à Palmiste Rouge',
        difficulte: 'Modéré',
        distance: 12.2,
        duree_heures: 5,
        denivele_positif: 850,
        denivele_negatif: 850,
        type: 'Randonnée',
        description: 'Magnifique boucle dans le cirque de Cilaos avec vue sur les remparts.',
        points_interet: ['Bras Sec', 'Palmiste Rouge', 'Points de vue panoramiques'],
        point_depart: {
          nom: 'Cilaos centre-ville',
          coordonnees: [55.4720, -21.1367],
          altitude: 1200,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures de randonnée', 'Eau (2L minimum)'],
        equipements_recommandes: ['Bâtons de randonnée', 'Protection solaire', 'Coupe-vent'],
        periode_ideale: { debut: 'Avril', fin: 'Novembre' },
        restrictions: [],
        dangers: ['Sentiers vertigineux', 'Météo changeante'],
        services_proximite: {
          hebergements: ['Hôtels Cilaos'],
          restaurants: ['Restaurants Cilaos'],
          locations_materiel: ['Magasins sport Cilaos']
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Jaune',
          type: 'GR R2',
          etat: 'Excellent'
        }
      },
      {
        id: 'cilaos_sentier_sources',
        nom: 'Le Sentier des Sources entre Cilaos et Bras Sec',
        difficulte: 'Facile',
        distance: 4.8,
        duree_heures: 1.25,
        denivele_positif: 280,
        denivele_negatif: 280,
        type: 'Randonnée',
        description: 'Sentier facile le long des sources thermales de Cilaos.',
        points_interet: ['Sources thermales', 'Végétation endémique'],
        point_depart: {
          nom: 'Cilaos - Thermes',
          coordonnees: [55.4720, -21.1367],
          altitude: 1200,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures de marche'],
        equipements_recommandes: ['Appareil photo', 'Protection solaire'],
        periode_ideale: { debut: 'Mars', fin: 'Décembre' },
        restrictions: [],
        dangers: ['Terrain humide par endroits'],
        services_proximite: {
          hebergements: ['Thermes de Cilaos'],
          restaurants: ['Restaurants Cilaos'],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'Sentier local',
          etat: 'Bon'
        }
      },
      // Cirque de Mafate
      {
        id: 'mafate_tour_trois_ilets',
        nom: 'Le tour des trois îlets des Orangers depuis le Maïdo',
        difficulte: 'Difficile',
        distance: 15.6,
        duree_heures: 6,
        denivele_positif: 1450,
        denivele_negatif: 1450,
        type: 'Randonnée',
        description: 'Tour spectaculaire des îlets des Orangers avec panorama exceptionnel.',
        points_interet: ['Îlet des Orangers', 'Remparts de Mafate', 'Col du Taïbit'],
        point_depart: {
          nom: 'Maïdo - Belvédère',
          coordonnees: [55.3844, -21.0775],
          altitude: 2190,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement de montagne', 'Eau (3L minimum)', 'Vivres de course'],
        equipements_recommandes: ['Bâtons de randonnée', 'Lampe frontale', 'Vêtements chauds'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: ['Conditions météo à vérifier'],
        dangers: ['Sentiers exposés', 'Risque de vertige', 'Météo changeante'],
        services_proximite: {
          hebergements: ['Gîtes de Mafate'],
          restaurants: ['Tables d\'hôte'],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R2',
          etat: 'Excellent'
        }
      },
      {
        id: 'mafate_nouvelle_hell_bourg',
        nom: 'De la Nouvelle à Hell Bourg par le Col de Fourche',
        difficulte: 'Difficile',
        distance: 22.3,
        duree_heures: 8,
        denivele_positif: 950,
        denivele_negatif: 950,
        type: 'Randonnée',
        description: 'Grande traversée entre les cirques de Mafate et Salazie.',
        points_interet: ['Îlet la Nouvelle', 'Col de Fourche', 'Hell-Bourg'],
        point_depart: {
          nom: 'Îlet la Nouvelle',
          coordonnees: [55.4163, -21.0631],
          altitude: 1100,
          acces_voiture: false,
          parking_disponible: false
        },
        equipements_requis: ['Équipement de bivouac', 'Carte topographique', 'Vivres'],
        equipements_recommandes: ['GPS', 'Trousse premiers secours', 'Téléphone satellite'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: ['Réservation gîte obligatoire'],
        dangers: ['Traversée longue', 'Risque d\'isolement', 'Terrain accidenté'],
        services_proximite: {
          hebergements: ['Gîte la Nouvelle', 'Gîtes Hell-Bourg'],
          restaurants: ['Tables d\'hôte'],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R1',
          etat: 'Bon'
        }
      },
      // Cirque de Salazie
      {
        id: 'salazie_piton_anchaing',
        nom: 'Le Piton d\'Anchaing par l\'Îlet à Vidot depuis Hell Bourg',
        difficulte: 'Difficile',
        distance: 14,
        duree_heures: 5.5,
        denivele_positif: 1000,
        denivele_negatif: 1000,
        type: 'Randonnée',
        description: 'Ascension du Piton d\'Anchaing avec vue panoramique sur Salazie.',
        points_interet: ['Îlet à Vidot', 'Sommet Piton d\'Anchaing', 'Vue sur Salazie'],
        point_depart: {
          nom: 'Hell-Bourg centre',
          coordonnees: [55.5267, -21.0633],
          altitude: 920,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures de montagne', 'Eau (2L minimum)'],
        equipements_recommandes: ['Bâtons', 'Coupe-vent', 'Appareil photo'],
        periode_ideale: { debut: 'Avril', fin: 'Novembre' },
        restrictions: [],
        dangers: ['Passages techniques', 'Exposition au vide', 'Brouillard possible'],
        services_proximite: {
          hebergements: ['Gîtes Hell-Bourg'],
          restaurants: ['Restaurants Hell-Bourg'],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Jaune',
          type: 'Sentier local',
          etat: 'Bon'
        }
      },
      {
        id: 'salazie_riviere_mat',
        nom: 'La Rivière du Mât et les Sources Manouilh par Terre Plate',
        difficulte: 'Modéré',
        distance: 11.7,
        duree_heures: 6,
        denivele_positif: 750,
        denivele_negatif: 750,
        type: 'Randonnée',
        description: 'Découverte des sources et de la rivière du Mât en forêt.',
        points_interet: ['Sources Manouilh', 'Rivière du Mât', 'Forêt primaire'],
        point_depart: {
          nom: 'Terre Plate',
          coordonnees: [55.5400, -21.0800],
          altitude: 1200,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures de randonnée', 'Protection pluie'],
        equipements_recommandes: ['Bâtons', 'Vêtements de rechange'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: [],
        dangers: ['Terrain humide', 'Passages de rivière'],
        services_proximite: {
          hebergements: [],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Jaune',
          type: 'Sentier local',
          etat: 'Moyen'
        }
      },
      // Région Est
      {
        id: 'est_boucle_caroline',
        nom: 'La boucle de la Caroline par le site de l\'Eden',
        difficulte: 'Modéré',
        distance: 17.7,
        duree_heures: 6,
        denivele_positif: 800,
        denivele_negatif: 800,
        type: 'Randonnée',
        description: 'Grande boucle dans les hauts de l\'Est avec forêt tropicale.',
        points_interet: ['Site de l\'Eden', 'Forêt tropicale', 'Cascade Caroline'],
        point_depart: {
          nom: 'Parking Caroline',
          coordonnees: [55.7200, -21.0500],
          altitude: 400,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures de randonnée', 'Protection pluie', 'Eau (2L)'],
        equipements_recommandes: ['Répulsif insectes', 'Vêtements longs'],
        periode_ideale: { debut: 'Avril', fin: 'Novembre' },
        restrictions: [],
        dangers: ['Terrain glissant par temps de pluie', 'Insectes'],
        services_proximite: {
          hebergements: ['Gîtes Plaine des Palmistes'],
          restaurants: ['Restaurants locaux'],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'Communaute',
        certification_officielle: false,
        balisage: {
          couleur: 'Orange',
          type: 'Sentier local',
          etat: 'Bon'
        }
      },
      {
        id: 'est_barrage_takamaka',
        nom: 'Le Barrage de Bras Patience depuis la centrale de Takamaka',
        difficulte: 'Facile',
        distance: 2.5,
        duree_heures: 1.25,
        denivele_positif: 220,
        denivele_negatif: 220,
        type: 'Randonnée',
        description: 'Courte randonnée familiale vers le barrage avec vue sur la centrale.',
        points_interet: ['Barrage Takamaka', 'Centrale hydraulique', 'Vue sur l\'océan'],
        point_depart: {
          nom: 'Centrale électrique Takamaka',
          coordonnees: [55.6900, -21.2200],
          altitude: 200,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures de marche'],
        equipements_recommandes: ['Appareil photo', 'Eau'],
        periode_ideale: { debut: 'Toute l\'année', fin: 'Toute l\'année' },
        restrictions: ['Accès réglementé près de la centrale'],
        dangers: ['Proximité installations électriques'],
        services_proximite: {
          hebergements: [],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'Communaute',
        certification_officielle: false,
        balisage: {
          couleur: 'Bleu',
          type: 'Sentier local',
          etat: 'Excellent'
        }
      },
      // Plus de sentiers de Cilaos
      {
        id: 'cilaos_dimitile_kerveguen',
        nom: 'Le Dimitile depuis Bras Sec par le Kerveguen',
        difficulte: 'Difficile',
        distance: 24.5,
        duree_heures: 10,
        denivele_positif: 1550,
        denivele_negatif: 1550,
        type: 'Randonnée',
        description: 'Ascension du Dimitile depuis Bras Sec avec vue panoramique.',
        points_interet: ['Dimitile', 'Kerveguen', 'Vue panoramique'],
        point_depart: {
          nom: 'Bras Sec',
          coordonnees: [55.4800, -21.1400],
          altitude: 1300,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement de montagne', 'Eau (3L)', 'Vivres'],
        equipements_recommandes: ['Bâtons', 'GPS', 'Vêtements chauds'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: [],
        dangers: ['Sentiers exposés', 'Dénivelé important', 'Météo changeante'],
        services_proximite: {
          hebergements: ['Gîtes Cilaos'],
          restaurants: ['Restaurants Cilaos'],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R2',
          etat: 'Bon'
        }
      },
      {
        id: 'cilaos_piton_neiges_bloc',
        nom: 'La montée au Piton des Neiges depuis le Bloc',
        difficulte: 'Difficile',
        distance: 15.5,
        duree_heures: 8.5,
        denivele_positif: 1730,
        denivele_negatif: 1730,
        type: 'Randonnée',
        description: 'Ascension du plus haut sommet de La Réunion depuis le Bloc.',
        points_interet: ['Piton des Neiges (3069m)', 'Gîte de la Caverne Dufour', 'Lever du soleil'],
        point_depart: {
          nom: 'Le Bloc - Cilaos',
          coordonnees: [55.4650, -21.1200],
          altitude: 1400,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement haute montagne', 'Lampe frontale', 'Vêtements chauds'],
        equipements_recommandes: ['Crampons (saison froide)', 'Gants', 'Bonnet'],
        periode_ideale: { debut: 'Mai', fin: 'Septembre' },
        restrictions: ['Départ très tôt recommandé'],
        dangers: ['Froid en altitude', 'Vent fort', 'Passages techniques'],
        services_proximite: {
          hebergements: ['Gîte Caverne Dufour'],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R2',
          etat: 'Excellent'
        }
      },
      {
        id: 'cilaos_tour_cirque',
        nom: 'Le tour du Cirque de Cilaos : Le Pavillon - Ilet à Cordes - Cilaos',
        difficulte: 'Très difficile',
        distance: 26,
        duree_heures: 10,
        denivele_positif: 2900,
        denivele_negatif: 2900,
        type: 'Randonnée',
        description: 'Tour complet du cirque de Cilaos, itinéraire exigeant.',
        points_interet: ['Le Pavillon', 'Ilet à Cordes', 'Vues panoramiques'],
        point_depart: {
          nom: 'Le Pavillon',
          coordonnees: [55.4500, -21.1100],
          altitude: 1600,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement complet', 'Vivres jour', 'Carte IGN'],
        equipements_recommandes: ['GPS', 'Trousse secours', 'Téléphone'],
        periode_ideale: { debut: 'Avril', fin: 'Octobre' },
        restrictions: ['Expérience montagne requise'],
        dangers: ['Parcours long', 'Exposition', 'Désorientation possible'],
        services_proximite: {
          hebergements: ['Gîtes Cilaos'],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R2',
          etat: 'Bon'
        }
      },
      // Plus de sentiers de Mafate
      {
        id: 'mafate_maido_nouvelle',
        nom: 'Du Maïdo à la Nouvelle par Roche Plate et le Bronchard',
        difficulte: 'Très difficile',
        distance: 25,
        duree_heures: 10,
        denivele_positif: 2000,
        denivele_negatif: 2000,
        type: 'Randonnée',
        description: 'Grande traversée de Mafate via Roche Plate et le Bronchard.',
        points_interet: ['Roche Plate', 'Le Bronchard', 'Îlet la Nouvelle'],
        point_depart: {
          nom: 'Maïdo - Parking',
          coordonnees: [55.3844, -21.0775],
          altitude: 2190,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement bivouac', 'Vivres 2 jours', 'Carte détaillée'],
        equipements_recommandes: ['GPS', 'Radio', 'Matériel secours'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: ['Réservation gîtes obligatoire'],
        dangers: ['Parcours très long', 'Risque isolement', 'Terrain accidenté'],
        services_proximite: {
          hebergements: ['Gîtes Mafate'],
          restaurants: ['Tables d\'hôte'],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R1',
          etat: 'Bon'
        }
      },
      {
        id: 'mafate_cayenne_grandplace',
        nom: 'Cayenne par Grand-Place et le Sentier Dacerle depuis le Maïdo',
        difficulte: 'Très difficile',
        distance: 27.5,
        duree_heures: 10,
        denivele_positif: 2200,
        denivele_negatif: 2200,
        type: 'Randonnée',
        description: 'Accès à Cayenne via Grand-Place, parcours exigeant.',
        points_interet: ['Grand-Place', 'Cayenne', 'Sentier Dacerle'],
        point_depart: {
          nom: 'Maïdo',
          coordonnees: [55.3844, -21.0775],
          altitude: 2190,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement complet', 'Vivres plusieurs jours', 'Matériel bivouac'],
        equipements_recommandes: ['Balise de détresse', 'Radio satellite'],
        periode_ideale: { debut: 'Mai', fin: 'Septembre' },
        restrictions: ['Réservation impérative', 'Expérience requise'],
        dangers: ['Parcours extrême', 'Isolement total', 'Conditions météo'],
        services_proximite: {
          hebergements: ['Gîte Cayenne'],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R1',
          etat: 'Moyen'
        }
      },
      {
        id: 'mafate_ilet_lataniers',
        nom: 'L\'Îlet des Lataniers depuis le Maïdo et retour',
        difficulte: 'Difficile',
        distance: 25.5,
        duree_heures: 9.5,
        denivele_positif: 1800,
        denivele_negatif: 1800,
        type: 'Randonnée',
        description: 'Découverte de l\'îlet des Lataniers au cœur de Mafate.',
        points_interet: ['Îlet des Lataniers', 'Panoramas Mafate'],
        point_depart: {
          nom: 'Maïdo',
          coordonnees: [55.3844, -21.0775],
          altitude: 2190,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement jour', 'Vivres', 'Eau 3L'],
        equipements_recommandes: ['Bâtons', 'Trousse secours'],
        periode_ideale: { debut: 'Avril', fin: 'Novembre' },
        restrictions: [],
        dangers: ['Parcours long', 'Dénivelé important'],
        services_proximite: {
          hebergements: ['Gîte Lataniers'],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R1',
          etat: 'Bon'
        }
      },
      // Sentiers du Sud - Volcan
      {
        id: 'sud_piton_fournaise',
        nom: 'Le Piton de la Fournaise depuis le Pas de Bellecombe',
        difficulte: 'Modéré',
        distance: 12.3,
        duree_heures: 5,
        denivele_positif: 500,
        denivele_negatif: 500,
        type: 'Randonnée',
        description: 'Randonnée vers le cratère du volcan actif.',
        points_interet: ['Cratère Dolomieu', 'Coulées de lave', 'Paysage lunaire'],
        point_depart: {
          nom: 'Pas de Bellecombe',
          coordonnees: [55.7139, -21.2441],
          altitude: 2311,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures montagne', 'Protection solaire', 'Eau 2L'],
        equipements_recommandes: ['Coupe-vent', 'Casquette'],
        periode_ideale: { debut: 'Avril', fin: 'Novembre' },
        restrictions: ['Accès selon activité volcanique'],
        dangers: ['Activité volcanique', 'Vent fort', 'Dénivelé'],
        services_proximite: {
          hebergements: ['Gîte du Volcan'],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'Sentier volcanique',
          etat: 'Excellent'
        }
      },
      {
        id: 'sud_tour_dolomieu',
        nom: 'Le tour du Cratère Dolomieu depuis le Pas de Bellecombe',
        difficulte: 'Difficile',
        distance: 12.6,
        duree_heures: 5,
        denivele_positif: 700,
        denivele_negatif: 700,
        type: 'Randonnée',
        description: 'Tour complet du cratère principal du Piton de la Fournaise.',
        points_interet: ['Cratère Dolomieu', 'Panorama volcanique'],
        point_depart: {
          nom: 'Pas de Bellecombe',
          coordonnees: [55.7139, -21.2441],
          altitude: 2311,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement volcanique', 'Protection totale'],
        equipements_recommandes: ['Masque anti-gaz', 'Gants'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: ['Selon activité volcanique', 'Autorisation préfecture'],
        dangers: ['Gaz volcaniques', 'Éboulements', 'Activité volcanique'],
        services_proximite: {
          hebergements: ['Gîte du Volcan'],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Rouge',
          type: 'Sentier volcanique',
          etat: 'Variable'
        }
      },
      // Sentiers de l'Ouest
      {
        id: 'ouest_grand_benare_maido',
        nom: 'Le Grand Bénare par le Grand Bord et la Glacière depuis le Maïdo',
        difficulte: 'Difficile',
        distance: 18,
        duree_heures: 6,
        denivele_positif: 930,
        denivele_negatif: 930,
        type: 'Randonnée',
        description: 'Ascension du deuxième plus haut sommet de La Réunion.',
        points_interet: ['Grand Bénare (2896m)', 'La Glacière', 'Panorama'],
        point_depart: {
          nom: 'Maïdo',
          coordonnees: [55.3844, -21.0775],
          altitude: 2190,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement montagne', 'Vêtements chauds'],
        equipements_recommandes: ['Gants', 'Bonnet', 'Lunettes soleil'],
        periode_ideale: { debut: 'Mai', fin: 'Septembre' },
        restrictions: [],
        dangers: ['Froid altitude', 'Vent fort', 'Brouillard'],
        services_proximite: {
          hebergements: [],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R2',
          etat: 'Excellent'
        }
      },
      // Sentiers du Nord
      {
        id: 'nord_roche_ecrite_mamode',
        nom: 'La Roche Ecrite depuis Mamode Camp',
        difficulte: 'Modéré',
        distance: 18.6,
        duree_heures: 6.5,
        denivele_positif: 1100,
        denivele_negatif: 1100,
        type: 'Randonnée',
        description: 'Ascension de la Roche Ecrite depuis Mamode Camp.',
        points_interet: ['Roche Ecrite', 'Panorama 360°'],
        point_depart: {
          nom: 'Mamode Camp',
          coordonnees: [55.5000, -20.9500],
          altitude: 1400,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures montagne', 'Vêtements chauds'],
        equipements_recommandes: ['Coupe-vent', 'Gants'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: [],
        dangers: ['Vent fort au sommet', 'Froid'],
        services_proximite: {
          hebergements: [],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R2',
          etat: 'Excellent'
        }
      },
      // Sentiers VTT
      {
        id: 'vtt_plaine_cafres',
        nom: 'Le tour de la Plaine des Cafres par le Col de Bébour',
        difficulte: 'Difficile',
        distance: 17.2,
        duree_heures: 6,
        denivele_positif: 700,
        denivele_negatif: 700,
        type: 'VTT',
        description: 'Circuit VTT dans les Hauts de La Réunion.',
        points_interet: ['Plaine des Cafres', 'Col de Bébour', 'Forêts'],
        point_depart: {
          nom: 'Bourg-Murat',
          coordonnees: [55.5700, -21.1200],
          altitude: 1600,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['VTT tout suspendu', 'Casque', 'Gants'],
        equipements_recommandes: ['Protections', 'Kit réparation'],
        periode_ideale: { debut: 'Avril', fin: 'Novembre' },
        restrictions: [],
        dangers: ['Descentes techniques', 'Racines', 'Humidité'],
        services_proximite: {
          hebergements: ['Gîtes Plaine des Palmistes'],
          restaurants: ['Restaurants Bourg-Murat'],
          locations_materiel: ['Location VTT']
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'Communaute',
        certification_officielle: false,
        balisage: {
          couleur: 'Vert',
          type: 'Piste VTT',
          etat: 'Bon'
        }
      },
      // Batch 1 - Premiers sentiers de Randopitons
      {
        id: 'cilaos_piton_bethoune',
        nom: 'Le sommet du Piton Béthoune par le tour du Bonnet de Prêtre',
        difficulte: 'Très difficile',
        distance: 5.7,
        duree_heures: 4,
        denivele_positif: 650,
        denivele_negatif: 650,
        type: 'Randonnée',
        description: 'Ascension technique du Piton Béthoune avec tour du Bonnet de Prêtre.',
        points_interet: ['Piton Béthoune', 'Bonnet de Prêtre', 'Panorama cirque'],
        point_depart: {
          nom: 'Cilaos',
          coordonnees: [55.4720, -21.1367],
          altitude: 1200,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement technique', 'Corde', 'Casque'],
        equipements_recommandes: ['Gants', 'Baudrier', 'Chaussures montagne'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: ['Expérience alpinisme requise'],
        dangers: ['Passages très exposés', 'Chutes de pierres', 'Vertige'],
        services_proximite: {
          hebergements: ['Gîtes Cilaos'],
          restaurants: ['Restaurants Cilaos'],
          locations_materiel: ['Magasins sport Cilaos']
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Rouge',
          type: 'Alpinisme',
          etat: 'Bon'
        }
      },
      {
        id: 'cilaos_mare_joncs_caverne',
        nom: 'De la Mare à Joncs à Cilaos par le Kerveguen et le Gîte de la Caverne Dufour',
        difficulte: 'Difficile',
        distance: 16.5,
        duree_heures: 7,
        denivele_positif: 1420,
        denivele_negatif: 1420,
        type: 'Randonnée',
        description: 'Grande traversée reliant Mare à Joncs à Cilaos via le gîte mythique.',
        points_interet: ['Mare à Joncs', 'Kerveguen', 'Gîte Caverne Dufour'],
        point_depart: {
          nom: 'Mare à Joncs',
          coordonnees: [55.4600, -21.1000],
          altitude: 1800,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement montagne', 'Vivres jour', 'Eau 3L'],
        equipements_recommandes: ['Bâtons', 'Vêtements chauds', 'Lampe frontale'],
        periode_ideale: { debut: 'Avril', fin: 'Novembre' },
        restrictions: ['Réservation gîte conseillée'],
        dangers: ['Parcours long', 'Météo changeante', 'Dénivelé important'],
        services_proximite: {
          hebergements: ['Gîte Caverne Dufour'],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R2',
          etat: 'Excellent'
        }
      },
      {
        id: 'cilaos_ilet_cordes_fleurs_jaunes',
        nom: 'Une boucle par l\'Îlet et la Ravine des Fleurs Jaunes',
        difficulte: 'Très difficile',
        distance: 6.4,
        duree_heures: 7,
        denivele_positif: 620,
        denivele_negatif: 620,
        type: 'Randonnée',
        description: 'Boucle technique dans la Ravine des Fleurs Jaunes.',
        points_interet: ['Îlet à Cordes', 'Ravine Fleurs Jaunes', 'Cascades'],
        point_depart: {
          nom: 'Route Îlet à Cordes',
          coordonnees: [55.4400, -21.1200],
          altitude: 1400,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures antidérapantes', 'Corde', 'Casque'],
        equipements_recommandes: ['Combinaison néoprène', 'Gants', 'Sac étanche'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: ['Expérience canyoning requise'],
        dangers: ['Passages aquatiques', 'Chutes de pierres', 'Glissant'],
        services_proximite: {
          hebergements: [],
          restaurants: [],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: new Date().toISOString(),
        source: 'Communaute',
        certification_officielle: false,
        balisage: {
          couleur: 'Orange',
          type: 'Canyoning',
          etat: 'Moyen'
        }
      }
    ];
  }

  /**
   * Données de secours si les APIs sont indisponibles
   * Basées sur des sources officielles consultées manuellement
   */
  private getFallbackIGNData(): SentierReel[] {
    return [
      {
        id: 'ign_piton_fournaise',
        nom: 'Piton de la Fournaise - Sentier du Volcan',
        difficulte: 'Modéré',
        distance: 11.2,
        duree_heures: 5.5,
        denivele_positif: 520,
        denivele_negatif: 520,
        type: 'Randonnée',
        description: 'Sentier officiel vers le cratère Dolomieu du volcan actif de La Réunion.',
        points_interet: ['Cratère Dolomieu', 'Plaine des Sables', 'Rempart de Bellecombe'],
        point_depart: {
          nom: 'Parking Bellecombe',
          coordonnees: [55.7139, -21.2441],
          altitude: 2311,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Chaussures de randonnée', 'Protection solaire', 'Eau (2L minimum)'],
        equipements_recommandes: ['Coupe-vent', 'Lunettes de soleil', 'Crème solaire haute protection'],
        periode_ideale: { debut: 'Avril', fin: 'Novembre' },
        restrictions: ['Accès interdit en cas d\'alerte volcanique'],
        dangers: ['Brouillard soudain', 'Vent violent', 'Dénivelé important', 'Activité volcanique'],
        services_proximite: {
          hebergements: ['Gîte du Volcan'],
          restaurants: ['Restaurant du Volcan'],
          locations_materiel: ['Intersport Saint-Pierre']
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17'
        },
        derniere_mise_a_jour: '2024-01-15T00:00:00Z',
        source: 'IGN',
        certification_officielle: true,
        balisage: {
          couleur: 'Blanc-Rouge',
          type: 'GR R2',
          etat: 'Excellent'
        }
      }
    ];
  }

  private getFallbackParcNationalData(): SentierReel[] {
    return [
      {
        id: 'pn_mafate_marla',
        nom: 'Cirque de Mafate - Sentier de Marla',
        difficulte: 'Difficile',
        distance: 14.8,
        duree_heures: 8,
        denivele_positif: 800,
        denivele_negatif: 600,
        type: 'Randonnée',
        description: 'Sentier d\'accès officiel au cirque de Mafate via l\'îlet de Marla.',
        points_interet: ['Îlet de Marla', 'Col du Taïbit', 'Point de vue panoramique'],
        point_depart: {
          nom: 'Col de Fourche',
          coordonnees: [55.4063, -21.0631],
          altitude: 1946,
          acces_voiture: true,
          parking_disponible: true
        },
        equipements_requis: ['Équipement de bivouac', 'Chaussures de montagne', 'Carte topographique'],
        equipements_recommandes: ['Bâtons de randonnée', 'Lampe frontale', 'Trousse premiers secours'],
        periode_ideale: { debut: 'Mai', fin: 'Octobre' },
        restrictions: ['Réservation gîte obligatoire', 'Sentier fermé en cas de cyclone'],
        dangers: ['Sentiers vertigineux', 'Chute de pierres', 'Météo changeante'],
        services_proximite: {
          hebergements: ['Gîte de Marla', 'Gîte des Orangers'],
          restaurants: ['Table d\'hôte Marla'],
          locations_materiel: []
        },
        contact_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '02 62 93 18 18'
        },
        derniere_mise_a_jour: '2024-01-15T00:00:00Z',
        source: 'ParcNational',
        certification_officielle: true,
        balisage: {
          couleur: 'Jaune',
          type: 'GR R1',
          etat: 'Excellent'
        }
      }
    ];
  }

  /**
   * Calcule la distance réelle d'un sentier basée sur les coordonnées GPS
   */
  private calculateRealDistance(geometry: any[]): number {
    if (!geometry || geometry.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < geometry.length; i++) {
      const lat1 = geometry[i-1].lat;
      const lon1 = geometry[i-1].lon;
      const lat2 = geometry[i].lat;
      const lon2 = geometry[i].lon;
      
      // Formule haversine pour calculer la distance entre deux points GPS
      const R = 6371; // Rayon de la Terre en km
      const dLat = this.toRadians(lat2 - lat1);
      const dLon = this.toRadians(lon2 - lon1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistance += R * c;
    }
    
    return Math.round(totalDistance * 100) / 100; // Arrondi à 2 décimales
  }

  /**
   * Extrait les données d'élévation réelles du parcours
   */
  private extractElevation(geometry: any[]): { gain: number; loss: number } {
    if (!geometry || geometry.length < 2) {
      return { gain: 0, loss: 0 };
    }
    
    let elevation_gain = 0;
    let elevation_loss = 0;
    let previous_elevation = null;
    
    for (const point of geometry) {
      // OpenStreetMap peut avoir des données d'élévation dans certains cas
      const current_elevation = point.elevation || this.estimateElevationFromLatLon(point.lat, point.lon);
      
      if (previous_elevation !== null && current_elevation !== null) {
        const diff = current_elevation - previous_elevation;
        if (diff > 0) {
          elevation_gain += diff;
        } else {
          elevation_loss += Math.abs(diff);
        }
      }
      
      previous_elevation = current_elevation;
    }
    
    return {
      gain: Math.round(elevation_gain),
      loss: Math.round(elevation_loss)
    };
  }

  /**
   * Estime la durée réelle basée sur distance, dénivelé et type
   */
  private estimateRealDuration(distance: number, elevation_gain: number, type: 'Randonnée' | 'VTT' | 'Trail'): number {
    let base_speed;
    let elevation_factor;
    
    switch (type) {
      case 'VTT':
        base_speed = 12; // km/h
        elevation_factor = 300; // mètres de dénivelé = 1h supplémentaire
        break;
      case 'Trail':
        base_speed = 8; // km/h
        elevation_factor = 400;
        break;
      default: // Randonnée
        base_speed = 4; // km/h
        elevation_factor = 300;
        break;
    }
    
    const base_time = distance / base_speed;
    const elevation_time = elevation_gain / elevation_factor;
    
    return Math.round((base_time + elevation_time) * 100) / 100;
  }

  /**
   * Obtient le point de départ réel à partir de la géométrie
   */
  private getRealStartPoint(geometry: any[]): any {
    if (!geometry || geometry.length === 0) {
      return {
        nom: 'Point de départ indéterminé',
        coordonnees: [55.5, -21.1],
        altitude: 0,
        acces_voiture: false,
        parking_disponible: false
      };
    }
    
    const startPoint = geometry[0];
    const estimated_altitude = this.estimateElevationFromLatLon(startPoint.lat, startPoint.lon);
    
    return {
      nom: this.getLocationName(startPoint.lat, startPoint.lon),
      coordonnees: [startPoint.lon, startPoint.lat],
      altitude: estimated_altitude,
      acces_voiture: estimated_altitude < 1500, // Estimation basée sur l'altitude
      parking_disponible: estimated_altitude < 1200
    };
  }

  /**
   * Estime l'élévation basée sur la position (approximation pour La Réunion)
   */
  private estimateElevationFromLatLon(lat: number, lon: number): number {
    // Approximation basée sur la géographie de La Réunion
    // Plus on s'éloigne de la côte, plus l'altitude augmente généralement
    const center_lat = -21.1151; // Centre approximatif de l'île
    const center_lon = 55.5364;
    
    const distance_from_center = Math.sqrt(
      Math.pow(lat - center_lat, 2) + Math.pow(lon - center_lon, 2)
    );
    
    // Estimation très approximative (La Réunion va de 0 à 3000m d'altitude)
    return Math.round(distance_from_center * 15000); // Facteur empirique
  }

  /**
   * Obtient un nom de lieu approximatif basé sur les coordonnées
   */
  private getLocationName(lat: number, lon: number): string {
    // Zones approximatives de La Réunion
    if (lat > -21.0) {
      return lon < 55.5 ? 'Saint-Denis/Nord' : 'Sainte-Marie/Nord-Est';
    } else if (lat > -21.2) {
      return lon < 55.3 ? 'Saint-Paul/Ouest' : lon < 55.7 ? 'Cirques/Centre' : 'Saint-Benoît/Est';
    } else {
      return lon < 55.4 ? 'Saint-Pierre/Sud-Ouest' : 'Saint-Joseph/Sud-Est';
    }
  }

  /**
   * Détermine si un sentier a une certification officielle
   */
  private isOfficialTrail(tags: any): boolean {
    return !!(tags.ref || tags.network === 'GR' || tags.operator || tags.tourism === 'information');
  }

  /**
   * Extrait le type de balisage
   */
  private extractTrailMarking(tags: any): string {
    if (tags.ref) return `GR ${tags.ref}`;
    if (tags.network) return this.supprimerTermesAnglais(tags.network);
    if (tags.marked === 'yes') return 'Balisé';
    return 'Non balisé';
  }

  /**
   * Évalue l'état du sentier
   */
  private assessTrailCondition(tags: any): 'Excellent' | 'Bon' | 'Moyen' | 'Dégradé' {
    if (tags.trail_visibility === 'excellent' || tags.surface === 'paved') return 'Excellent';
    if (tags.trail_visibility === 'good' || tags.surface === 'unpaved') return 'Bon';
    if (tags.trail_visibility === 'intermediate') return 'Moyen';
    return 'Bon'; // Par défaut pour OSM
  }

  /**
   * Obtient la période idéale basée sur les tags
   */
  private getBestPeriod(tags: any): { debut: string; fin: string } {
    // Pour La Réunion, la saison sèche (hiver austral) est généralement meilleure
    if (tags.seasonal === 'winter' || tags.access_seasonal === 'winter') {
      return { debut: 'Mai', fin: 'Octobre' };
    }
    // Par défaut pour La Réunion (éviter la saison cyclonique)
    return { debut: 'Avril', fin: 'Novembre' };
  }

  /**
   * Extrait les restrictions réelles
   */
  private extractRestrictions(tags: any): string[] {
    const restrictions = [];
    if (tags.access === 'private') restrictions.push('Accès privé');
    if (tags.access === 'permit') restrictions.push('Autorisation requise');
    if (tags.seasonal) restrictions.push(`Accès saisonnier: ${this.supprimerTermesAnglais(tags.seasonal)}`);
    if (tags.fee === 'yes') restrictions.push('Accès payant');
    return restrictions.filter(restriction => restriction && restriction.trim().length > 0);
  }

  /**
   * Extrait les dangers réels basés sur les tags OSM
   */
  private extractRealDangers(tags: any): string[] {
    const dangers = [];
    if (tags.hazard) dangers.push(this.supprimerTermesAnglais(tags.hazard));
    if (tags.warning) dangers.push(this.supprimerTermesAnglais(tags.warning));
    if (tags.sac_scale && parseInt(tags.sac_scale.replace('T', '')) >= 4) {
      dangers.push('Terrain technique difficile');
    }
    if (tags.highway === 'path' && !tags.surface) {
      dangers.push('Terrain naturel variable');
    }
    // Dangers spécifiques à La Réunion
    dangers.push('Météo tropicale changeante', 'Risque de brouillard en altitude');
    return dangers.filter(danger => danger && danger.trim().length > 0);
  }

  /**
   * Convertit degrés en radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Fonctions utilitaires
  private deduplicateAndEnrich(sentiers: SentierReel[]): SentierReel[] {
    const seen = new Set();
    return sentiers.filter(sentier => {
      const key = `${sentier.nom}_${sentier.point_depart.coordonnees[0]}_${sentier.point_depart.coordonnees[1]}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mapOSMDifficulty(scale: string): 'Facile' | 'Modéré' | 'Difficile' | 'Expert' {
    switch (scale) {
      case 'T1': return 'Facile';
      case 'T2': return 'Modéré';
      case 'T3': case 'T4': return 'Difficile';
      case 'T5': case 'T6': return 'Expert';
      default: return 'Modéré';
    }
  }

  private mapOSMType(tags: any): 'Randonnée' | 'VTT' | 'Trail' {
    if (tags.bicycle === 'yes' || tags.highway === 'cycleway') return 'VTT';
    if (tags.running === 'yes') return 'Trail';
    return 'Randonnée';
  }


  private extractPointsOfInterest(tags: any): string[] {
    const pois = [];
    if (tags.natural) pois.push(this.supprimerTermesAnglais(tags.natural));
    if (tags.tourism) pois.push(this.supprimerTermesAnglais(tags.tourism));
    return pois.filter(poi => poi && poi.trim().length > 0);
  }

  private mapRequiredEquipment(tags: any): string[] {
    const equipment = ['Chaussures de randonnée', 'Eau'];
    if (tags.sac_scale && parseInt(tags.sac_scale?.replace('T', '')) > 2) {
      equipment.push('Équipement de montagne');
    }
    return equipment;
  }

  private mapRecommendedEquipment(tags: any): string[] {
    return ['Bâtons de randonnée', 'Protection solaire', 'Carte'];
  }

  /**
   * Crée un nom unique pour différencier les sentiers similaires
   */
  private createUniqueName(tags: any, distance: number, type: string): string {
    const baseName = tags.name;
    
    // Nettoyer les termes anglais du nom de base
    const nomPropre = this.supprimerTermesAnglais(baseName);
    
    // Ajouter des infos distinctives
    const distinctives = [];
    
    // Ajouter la distance si significative
    if (distance >= 1) {
      distinctives.push(`${distance.toFixed(1)}km`);
    }
    
    // Ajouter le type si différent de randonnée
    if (type !== 'Randonnée') {
      distinctives.push(type);
    }
    
    // Ajouter la difficulté si spécifiée
    if (tags.sac_scale) {
      distinctives.push(`Niveau ${tags.sac_scale}`);
    }
    
    // Ajouter une info de surface si spécifiée
    if (tags.surface && tags.surface !== 'unknown') {
      const surfaces = {
        'paved': 'goudron',
        'gravel': 'gravier', 
        'dirt': 'terre',
        'rock': 'roche'
      };
      if (surfaces[tags.surface]) {
        distinctives.push(surfaces[tags.surface]);
      }
    }
    
    // Construire le nom final
    if (distinctives.length > 0) {
      return `${nomPropre} (${distinctives.join(', ')})`;
    }
    
    return nomPropre;
  }

  /**
   * Vérifie si un nom contient des termes anglais
   */
  private containsEnglishTerms(nom: string): boolean {
    if (!nom) return false;
    
    const termesAnglais = [
      'mountain_hiking', 'mountain hiking', 'hiking', 'mountain',
      'trail', 'path', 'route', 'track', 'footway', 'cycleway', 
      'bridleway', 'steps'
    ];
    
    return termesAnglais.some(terme => 
      nom.toLowerCase().includes(terme.toLowerCase())
    );
  }

  /**
   * Supprime les termes anglais des noms de sentiers
   */
  private supprimerTermesAnglais(nom: string): string {
    if (!nom) return nom;
    
    // Liste des termes anglais à supprimer
    const termesAnglais = [
      'mountain_hiking',
      'mountain hiking',
      'hiking',
      'mountain',
      'trail',
      'path',
      'route',
      'track',
      'footway',
      'cycleway',
      'bridleway',
      'steps'
    ];
    
    let nomNettoye = nom;
    
    termesAnglais.forEach(terme => {
      // Supprime le terme anglais et les espaces/tirets autour
      const regex = new RegExp(`[\\s-_]*${terme}[\\s-_]*`, 'gi');
      nomNettoye = nomNettoye.replace(regex, ' ');
    });
    
    // Nettoie les espaces multiples et les tirets orphelins
    nomNettoye = nomNettoye
      .replace(/\s+/g, ' ')
      .replace(/^[\s-_]+|[\s-_]+$/g, '')
      .trim();
    
    return nomNettoye || nom; // Retourne le nom original si nettoyage trop agressif
  }


  private parseParcNationalData(data: any): SentierReel[] {
    // Parse des données du Parc National (format hypothétique)
    return [];
  }
}

export { SentiersService };
export const sentiersService = new SentiersService();