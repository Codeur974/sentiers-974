const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

class RandopitonsScraperOptimized {
  constructor() {
    this.baseUrl = 'https://randopitons.re';
    this.delay = 2000; // Délai plus long pour être respectueux
    this.scraped = 0;
    this.errors = 0;
    
    // Régions de La Réunion selon randopitons.re (SANS "Ailleurs")
    this.regions = [
      { name: 'Cirque de Cilaos', filter: 'cilaos' },
      { name: 'Cirque de Mafate', filter: 'mafate' },
      { name: 'Cirque de Salazie', filter: 'salazie' },
      { name: 'Est', filter: 'est' },
      { name: 'Nord', filter: 'nord' },
      { name: 'Ouest', filter: 'ouest' },
      { name: 'Sud', filter: 'sud' },
      { name: 'Volcan', filter: 'volcan' }
      // ❌ PAS "Ailleurs" - seulement La Réunion
    ];
    
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
  }

  async connectDB() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ Connexion MongoDB établie');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error);
      throw error;
    }
  }

  async scrapeAllRegions() {
    console.log('🚀 Début du scraping optimisé par région...');
    
    try {
      for (const region of this.regions) {
        console.log(`\n🏔️ === RÉGION: ${region.name} ===`);
        await this.scrapeRegion(region);
        
        // Pause entre les régions
        console.log(`⏸️ Pause 5s entre les régions...`);
        await this.sleep(5000);
      }
      
      console.log(`\n✅ Scraping terminé ! ${this.scraped} sentiers récupérés, ${this.errors} erreurs`);
      
    } catch (error) {
      console.error('❌ Erreur lors du scraping:', error);
    }
  }

  async scrapeRegion(region) {
    try {
      // Récupérer tous les sentiers de cette région
      const urlsSentiers = await this.getSentiersFromRegion(region);
      
      if (urlsSentiers.length === 0) {
        console.log(`⚠️ Aucun sentier trouvé pour ${region.name}`);
        return;
      }
      
      console.log(`📊 ${urlsSentiers.length} sentiers trouvés dans ${region.name}`);
      
      // Scraper chaque sentier
      for (let i = 0; i < urlsSentiers.length; i++) {
        const url = urlsSentiers[i];
        console.log(`[${i+1}/${urlsSentiers.length}] ${region.name}: ${url}`);
        
        await this.scrapeSentierDetail(url, region.name);
        
        // Pause entre chaque sentier
        await this.sleep(this.delay);
      }
      
    } catch (error) {
      console.error(`❌ Erreur région ${region.name}:`, error);
    }
  }

  async getSentiersFromRegion(region) {
    console.log(`🔍 Recherche des sentiers dans ${region.name}...`);
    
    const urls = new Set(); // Utiliser Set pour éliminer automatiquement les doublons
    
    try {
      // Approche 1: Recherche par mot-clé de région
      await this.searchByKeyword(region.filter, urls);
      
      // Approche 2: Parcourir la liste générale et filtrer par nom/contenu
      await this.searchInGeneralList(region.name, urls);
      
    } catch (error) {
      console.error(`❌ Erreur recherche ${region.name}:`, error);
    }
    
    return Array.from(urls);
  }

  async searchByKeyword(keyword, urlsSet) {
    try {
      // Recherche sur randopitons avec mot-clé
      const searchUrl = `${this.baseUrl}/randonnees/liste?search=${keyword}`;
      console.log(`🔎 Recherche: ${searchUrl}`);
      
      const response = await this.httpClient.get(searchUrl);
      const $ = cheerio.load(response.data);
      
      $('a[href*="/randonnee/"]').each((i, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/randonnee\/\d+/)) {
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          urlsSet.add(fullUrl);
        }
      });
      
    } catch (error) {
      console.error(`❌ Erreur recherche mot-clé ${keyword}:`, error.message);
    }
  }

  async searchInGeneralList(regionName, urlsSet) {
    try {
      // Parcourir quelques pages de la liste générale
      for (let page = 1; page <= 5; page++) { // Limiter à 5 pages pour éviter la boucle infinie
        console.log(`📄 Scan page ${page} pour ${regionName}...`);
        
        const response = await this.httpClient.get(`${this.baseUrl}/randonnees/liste?page=${page}`);
        const $ = cheerio.load(response.data);
        
        let foundInPage = 0;
        
        $('a[href*="/randonnee/"]').each((i, element) => {
          const href = $(element).attr('href');
          const title = $(element).text().trim();
          
          // Filtrer par titre contenant le nom de la région
          if (href && this.isFromRegion(title, regionName)) {
            const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
            urlsSet.add(fullUrl);
            foundInPage++;
          }
        });
        
        console.log(`📍 ${foundInPage} sentiers de ${regionName} trouvés page ${page}`);
        
        // Si aucun sentier trouvé sur cette page, pas la peine de continuer
        if (foundInPage === 0 && page > 1) {
          break;
        }
        
        await this.sleep(1000); // Pause entre pages
      }
      
    } catch (error) {
      console.error(`❌ Erreur scan liste pour ${regionName}:`, error.message);
    }
  }

  isFromRegion(title, regionName) {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    const regionLower = regionName.toLowerCase();
    
    // Mots-clés spécifiques par région
    const keywords = {
      'Cirque de Cilaos': ['cilaos', 'bras sec', 'dimitile', 'piton des neiges', 'kerveguen'],
      'Cirque de Mafate': ['mafate', 'maïdo', 'col de fourche', 'nouvelle', 'marla', 'cayenne', 'grand place'],
      'Cirque de Salazie': ['salazie', 'hell-bourg', 'hell bourg', 'bélouve', 'piton d\'anchaing'],
      'Est': ['saint-benoît', 'saint benoit', 'sainte-rose', 'sainte rose', 'plaine des palmistes', 'takamaka'],
      'Nord': ['saint-denis', 'saint denis', 'sainte-marie', 'sainte marie', 'roche écrite', 'roche ecrite'],
      'Ouest': ['saint-paul', 'saint paul', 'saint-leu', 'saint leu', 'trois bassins', 'maïdo'],
      'Sud': ['saint-pierre', 'saint pierre', 'saint-joseph', 'saint joseph', 'wild sud'],
      'Volcan': ['volcan', 'fournaise', 'pas de bellecombe', 'cratère', 'dolomieu', 'plaine des sables']
    };
    
    const regionKeywords = keywords[regionName] || [regionLower];
    
    return regionKeywords.some(keyword => titleLower.includes(keyword));
  }

  async scrapeSentierDetail(url, regionName) {
    try {
      // Vérifier si déjà en base
      const randopitonsId = this.extractIdFromUrl(url);
      const existing = await Sentier.findOne({ randopitons_id: randopitonsId });
      
      if (existing) {
        console.log(`⏭️  Déjà en base: ${existing.nom}`);
        return;
      }

      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);
      
      const sentierData = this.extractSentierData($, url, regionName);
      
      if (sentierData.nom && sentierData.distance > 0) {
        const sentier = new Sentier(sentierData);
        await sentier.save();
        this.scraped++;
        console.log(`✅ [${this.scraped}] ${sentierData.nom} - ${sentierData.distance}km (${regionName})`);
      } else {
        console.log(`⚠️  Données incomplètes: ${url}`);
        this.errors++;
      }
      
    } catch (error) {
      console.error(`❌ Erreur ${url}: ${error.message}`);
      this.errors++;
    }
  }

  extractSentierData($, url, regionName) {
    try {
      // Extraction du nom
      const nom = $('h1').first().text().trim() || 
                  $('.title, .rando-title, h2').first().text().trim();
      
      if (!nom) return {};
      
      // Extraction des caractéristiques numériques améliorée
      const bodyText = $('body').text();
      
      const distance = this.extractDistance($, bodyText);
      const duree = this.extractDuree($, bodyText);
      const denivele = this.extractDenivele($, bodyText);
      const altitude = this.extractAltitude($, bodyText);
      const difficulte = this.extractDifficulte($, bodyText);
      
      // Extraction des descriptions détaillées
      const descriptions = this.extractDescriptions($);
      
      // Extraction des points d'intérêt
      const pointsInteret = this.extractPointsInteret($, bodyText, nom);
      
      // Extraction des équipements et dangers
      const equipements = this.extractEquipements($, bodyText);
      const dangers = this.extractDangers($, bodyText);
      
      // Détermination de la commune de départ
      const communeDepart = this.extractCommuneDepart(nom, bodyText, regionName);
      
      // Point de départ
      const pointDepart = this.extractPointDepart($, nom, communeDepart, regionName);
      
      return {
        randopitons_id: this.extractIdFromUrl(url),
        url: url,
        nom: nom,
        region: regionName,
        commune_depart: communeDepart,
        difficulte: difficulte,
        distance: distance,
        duree: duree,
        denivele_positif: denivele,
        denivele_negatif: denivele,
        altitude_min: altitude.min,
        altitude_max: altitude.max,
        description_complete: descriptions.complete,
        description_courte: descriptions.courte,
        itineraire_detaille: descriptions.itineraire,
        conseils_pratiques: descriptions.conseils,
        points_interet: pointsInteret,
        equipements_obligatoires: equipements.obligatoires,
        equipements_recommandes: equipements.recommandes,
        dangers: dangers,
        point_depart: pointDepart,
        derniere_mise_a_jour_site: this.extractDate($),
        raw_data: {
          html_length: $.html().length,
          extracted_at: new Date(),
          url: url
        }
      };
      
    } catch (error) {
      console.error('Erreur extraction données:', error);
      return {};
    }
  }

  // Méthodes d'extraction améliorées
  extractDistance($, bodyText) {
    // Chercher "X km" ou "X,X km"
    const patterns = [
      /(\d+[,.]?\d*)\s*km/i,
      /distance[:\s]+(\d+[,.]?\d*)/i,
      /long[a-z]*[:\s]+(\d+[,.]?\d*)/i
    ];
    
    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(',', '.'));
      }
    }
    
    return 0;
  }

  extractDuree($, bodyText) {
    const heuresMatch = bodyText.match(/(\d+)\s*h(?:eure)?s?/i);
    const minutesMatch = bodyText.match(/(\d+)\s*m(?:in)?s?/i) || 
                        bodyText.match(/h\s*(\d+)/i);
    
    return {
      heures: heuresMatch ? parseInt(heuresMatch[1]) : 0,
      minutes: minutesMatch ? parseInt(minutesMatch[1]) : 0
    };
  }

  extractDenivele($, bodyText) {
    const patterns = [
      /dénivelé[:\s]+(\d+)/i,
      /(\d+)\s*m.*dénivelé/i,
      /elevation[:\s]+(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return 0;
  }

  extractAltitude($, bodyText) {
    const altitudes = bodyText.match(/(\d+)\s*m(?:ètres?)?/gi) || [];
    const heights = altitudes
      .map(alt => parseInt(alt.match(/\d+/)[0]))
      .filter(h => h > 0 && h < 4000); // Altitudes réalistes pour La Réunion
    
    if (heights.length === 0) return { min: null, max: null };
    
    return {
      min: Math.min(...heights),
      max: Math.max(...heights)
    };
  }

  extractDifficulte($, bodyText) {
    const text = bodyText.toLowerCase();
    
    if (text.includes('très difficile') || text.includes('tres difficile')) return 'Très difficile';
    if (text.includes('expert') || text.includes('extrême')) return 'Expert';
    if (text.includes('difficile')) return 'Difficile';
    if (text.includes('facile')) return 'Facile';
    if (text.includes('modéré') || text.includes('moderate') || text.includes('moyen')) return 'Modéré';
    
    return 'Modéré'; // Par défaut
  }

  extractDescriptions($) {
    let complete = '';
    let courte = '';
    let itineraire = '';
    let conseils = '';
    
    // Description complète - tous les paragraphes significatifs
    $('p, .description, .content').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50 && !this.isMetaText(text)) {
        complete += text + '\n\n';
      }
    });
    
    // Description courte - premier paragraphe significatif
    const firstPara = $('p').first().text().trim();
    if (firstPara.length > 20) {
      courte = firstPara.substring(0, 200) + (firstPara.length > 200 ? '...' : '');
    }
    
    // Itinéraire - chercher des sections spécifiques
    $('*').each((i, el) => {
      const text = $(el).text();
      if (text.toLowerCase().includes('itinéraire') || 
          text.toLowerCase().includes('parcours') ||
          text.toLowerCase().includes('trajet')) {
        itineraire += text + '\n';
      }
    });
    
    // Conseils
    $('*').each((i, el) => {
      const text = $(el).text();
      if (text.toLowerCase().includes('conseil') ||
          text.toLowerCase().includes('recommandation') ||
          text.toLowerCase().includes('attention')) {
        conseils += text + '\n';
      }
    });
    
    return {
      complete: complete.trim(),
      courte: courte.trim(),
      itineraire: itineraire.trim(),
      conseils: conseils.trim()
    };
  }

  isMetaText(text) {
    const metaKeywords = [
      'distance', 'durée', 'dénivelé', 'difficulté',
      'dernière mise à jour', 'auteur', 'copyright'
    ];
    
    const textLower = text.toLowerCase();
    return metaKeywords.some(keyword => textLower.startsWith(keyword));
  }

  extractPointsInteret($, bodyText, nom) {
    const points = [];
    
    // Patterns pour identifier les lieux d'intérêt
    const locationPatterns = [
      /(?:cascade|chute|bassin)[\s\w-]*[A-Z][\w\s-]+/gi,
      /(?:piton|sommet|col|crête)[\s\w-]*[A-Z][\w\s-]+/gi,
      /(?:forêt|jardin|site|point de vue)[\s\w-]*[A-Z][\w\s-]+/gi,
      /(?:îlet|ilet)[\s\w-]*[A-Z][\w\s-]+/gi
    ];
    
    locationPatterns.forEach(pattern => {
      const matches = bodyText.match(pattern) || [];
      matches.forEach(match => {
        const cleaned = match.trim();
        if (cleaned.length > 5 && cleaned.length < 50 && !cleaned.includes(nom)) {
          points.push({
            nom: cleaned,
            description: ''
          });
        }
      });
    });
    
    return points.slice(0, 8); // Limiter à 8 points
  }

  extractEquipements($, bodyText) {
    const obligatoires = [];
    const recommandes = [];
    
    const equipementsList = [
      'chaussures de randonnée', 'chaussures de montagne',
      'eau', 'protection solaire', 'crème solaire',
      'bâtons de randonnée', 'bâtons',
      'casque', 'corde', 'lampe frontale',
      'vêtements chauds', 'coupe-vent', 'gants',
      'vivres', 'nourriture'
    ];
    
    const textLower = bodyText.toLowerCase();
    
    equipementsList.forEach(equip => {
      if (textLower.includes(equip)) {
        if (textLower.includes(`${equip} obligatoire`) || 
            textLower.includes(`${equip} indispensable`) ||
            textLower.includes(`${equip} nécessaire`)) {
          obligatoires.push(equip);
        } else {
          recommandes.push(equip);
        }
      }
    });
    
    return { obligatoires, recommandes };
  }

  extractDangers($, bodyText) {
    const dangers = [];
    const textLower = bodyText.toLowerCase();
    
    const dangersList = [
      'chutes de pierres', 'éboulement',
      'vertige', 'vide', 'précipice',
      'terrain glissant', 'glissant',
      'passages exposés', 'exposition',
      'météo changeante', 'brouillard',
      'vent fort', 'tempête',
      'rivière en crue', 'crue',
      'terrain technique', 'technique',
      'déshydratation', 'chaleur'
    ];
    
    dangersList.forEach(danger => {
      if (textLower.includes(danger)) {
        dangers.push(danger);
      }
    });
    
    return dangers;
  }

  extractCommuneDepart(nom, bodyText, regionName) {
    const communes = [
      'Saint-Denis', 'Saint-Pierre', 'Saint-Paul', 'Saint-Joseph',
      'Saint-Benoît', 'Saint-Louis', 'Saint-Leu', 'Sainte-Marie',
      'Sainte-Rose', 'Sainte-Suzanne', 'Saint-André', 'Cilaos',
      'Hell-Bourg', 'Salazie', 'Entre-Deux', 'Le Port',
      'La Possession', 'Bras-Panon', 'Plaine des Palmistes',
      'Petite-Ile', 'L\'Étang-Salé', 'Les Avirons', 'Trois-Bassins'
    ];
    
    const textToSearch = `${nom} ${bodyText}`;
    
    for (const commune of communes) {
      if (textToSearch.includes(commune)) {
        return commune;
      }
    }
    
    return null;
  }

  extractPointDepart($, nom, commune, regionName) {
    const coords = this.getRegionCoordinates(regionName, commune);
    
    return {
      nom: commune || this.extractDepartFromName(nom) || regionName,
      coordonnees: {
        longitude: coords[0],
        latitude: coords[1]
      },
      altitude: coords[2] || 0,
      acces_voiture: coords[2] < 2000, // Estimation
      parking_disponible: coords[2] < 1500
    };
  }

  extractDepartFromName(nom) {
    // Extraire le point de départ depuis le nom
    const patterns = [
      /depuis\s+([\w\s-]+)/i,
      /de\s+([\w\s-]+)\s+à/i,
      /par\s+([\w\s-]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = nom.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  getRegionCoordinates(regionName, commune) {
    // Coordonnées approximatives par région et commune
    const coordsMap = {
      'Cirque de Cilaos': [55.4720, -21.1367, 1200],
      'Cirque de Mafate': [55.4163, -21.0631, 1100],
      'Cirque de Salazie': [55.5267, -21.0633, 920],
      'Est': [55.6500, -21.1500, 300],
      'Nord': [55.4500, -20.8800, 100],
      'Ouest': [55.3000, -21.0500, 200],
      'Sud': [55.4700, -21.3200, 50],
      'Volcan': [55.7139, -21.2441, 2311]
    };
    
    // Coordonnées spécifiques par commune si disponible
    const communeCoords = {
      'Cilaos': [55.4720, -21.1367, 1200],
      'Hell-Bourg': [55.5267, -21.0633, 920],
      'Saint-Denis': [55.4500, -20.8800, 50],
      'Saint-Pierre': [55.4700, -21.3200, 20],
      'Pas de Bellecombe': [55.7139, -21.2441, 2311],
      'Maïdo': [55.3844, -21.0775, 2190]
    };
    
    return communeCoords[commune] || coordsMap[regionName] || [55.5000, -21.1000, 500];
  }

  extractDate($) {
    const dateText = $('body').text();
    const dateMatch = dateText.match(/(\d{2}\/\d{2}\/\d{4})/);
    
    if (dateMatch) {
      const [day, month, year] = dateMatch[1].split('/');
      return new Date(year, month - 1, day);
    }
    
    return new Date();
  }

  // Fonctions utilitaires
  extractIdFromUrl(url) {
    const match = url.match(/\/randonnee\/(\d+)/);
    return match ? match[1] : url.split('/').pop().split('-')[0];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Script principal
async function main() {
  const scraper = new RandopitonsScraperOptimized();
  
  try {
    await scraper.connectDB();
    await scraper.scrapeAllRegions();
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

if (require.main === module) {
  main();
}

module.exports = RandopitonsScraperOptimized;