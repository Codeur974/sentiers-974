const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

class RandopitonsScraper {
  constructor() {
    this.baseUrl = 'https://randopitons.re';
    this.delay = parseInt(process.env.SCRAPER_DELAY) || 1000;
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT) || 5;
    this.scraped = 0;
    this.errors = 0;
    
    // Configuration axios avec headers réalistes
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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

  async scrapeAllSentiers() {
    console.log('🚀 Début du scraping de TOUS les sentiers de randopitons.re...');
    
    try {
      // 1. Récupérer la liste complète des sentiers
      const urlsSentiers = await this.getAllSentiersUrls();
      console.log(`📊 ${urlsSentiers.length} sentiers trouvés au total`);
      
      // 2. Scraper chaque sentier en détail
      await this.scrapeAllDetails(urlsSentiers);
      
      console.log(`✅ Scraping terminé ! ${this.scraped} sentiers récupérés, ${this.errors} erreurs`);
      
    } catch (error) {
      console.error('❌ Erreur lors du scraping:', error);
    }
  }

  async getAllSentiersUrls() {
    console.log('🔍 Récupération de toutes les URLs des sentiers...');
    const urls = [];

    try {
      console.log('📄 Scraping de la page principale...');
      
      // Récupérer la page principale sans pagination
      const response = await this.httpClient.get(`${this.baseUrl}/randonnees/liste`);
      const $ = cheerio.load(response.data);
      
      // Chercher tous les liens de randonnées
      $('a[href*="/randonnee/"]').each((i, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/randonnee\/\d+/)) {
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          
          // Filtrer les URLs pour ne garder que les pages principales (pas les sections #profil, #commentaires)
          const cleanUrl = fullUrl.split('#')[0]; // Supprimer les ancres
          urls.push(cleanUrl);
        }
      });

      console.log(`📍 ${urls.length} URLs trouvées`);

    } catch (error) {
      console.error(`❌ Erreur lors de la récupération des URLs:`, error.message);
      throw error;
    }

    // Éliminer les doublons
    const uniqueUrls = [...new Set(urls)];
    console.log(`🎯 ${uniqueUrls.length} URLs uniques trouvées`);
    
    return uniqueUrls;
  }

  async scrapeAllDetails(urls) {
    console.log(`🔄 Début du scraping détaillé de ${urls.length} sentiers...`);
    
    // Traitement par batch pour éviter de surcharger le serveur
    for (let i = 0; i < urls.length; i += this.maxConcurrent) {
      const batch = urls.slice(i, i + this.maxConcurrent);
      console.log(`📦 Traitement batch ${Math.floor(i/this.maxConcurrent) + 1}/${Math.ceil(urls.length/this.maxConcurrent)} (${batch.length} sentiers)`);
      
      await Promise.all(batch.map(url => this.scrapeSentierDetail(url)));
      
      // Pause entre les batches
      await this.sleep(this.delay * 2);
    }
  }

  async scrapeSentierDetail(url) {
    try {
      console.log(`🔍 Scraping: ${url}`);
      
      // Vérifier si déjà en base
      const randopitonsId = this.extractIdFromUrl(url);
      const existing = await Sentier.findOne({ randopitons_id: randopitonsId });
      
      if (existing) {
        console.log(`⏭️  Déjà en base: ${existing.nom}`);
        return;
      }

      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);
      
      const sentierData = this.extractSentierData($, url);
      
      if (sentierData.nom) {
        const sentier = new Sentier(sentierData);
        await sentier.save();
        this.scraped++;
        console.log(`✅ [${this.scraped}] ${sentierData.nom} - ${sentierData.distance}km`);
      } else {
        console.log(`⚠️  Données incomplètes: ${url}`);
        this.errors++;
      }
      
    } catch (error) {
      console.error(`❌ Erreur ${url}: ${error.message}`);
      this.errors++;
    }
  }

  extractSentierData($, url) {
    try {
      // Extraction du nom avec plusieurs fallbacks
      let nom = $('h1').first().text().trim();
      
      // Si pas de h1, chercher dans d'autres éléments
      if (!nom) {
        nom = $('h2').first().text().trim();
      }
      if (!nom) {
        nom = $('h3').first().text().trim();
      }
      if (!nom) {
        // Essayer d'extraire depuis le title
        const title = $('title').text().trim();
        if (title && title.includes('—')) {
          nom = title.split('—')[0].trim();
        } else if (title && title.includes('|')) {
          nom = title.split('|')[0].trim();
        } else if (title) {
          nom = title.replace(/Randopitons?/gi, '').trim();
        }
      }
      
      console.log(`🏷️  Nom extrait: "${nom}" depuis ${url}`);
      
      // Extraction des caractéristiques principales
      const distance = this.parseNumber($('.distance').text()) || 
                      this.parseNumber($('span:contains("km")').text()) ||
                      this.extractFromText($('body').text(), /(\d+[,.]?\d*)\s*km/i);
      
      const dureeText = $('.duree').text() || $('span:contains("h")').text() || '';
      const duree = this.parseDuree(dureeText);
      
      const denivele = this.parseNumber($('.denivele, .elevation').text()) ||
                      this.extractFromText($('body').text(), /Dénivelé positif[:\s]*(\d+)/i) ||
                      this.extractFromText($('body').text(), /(\d+)\s*m.*dénivelé/i) ||
                      this.extractFromText($('body').text(), /dénivelé.*?(\d+)\s*m/i);
      
      const difficulte = this.parseDifficulte(
        $('.difficulte').text() || 
        $('span:contains("Difficulté")').parent().text() ||
        $('body').text()
      );

      // Extraction de l'altitude
      const altitudeText = $('body').text();
      const altitudeMin = this.extractFromText(altitudeText, /altitude.*?(\d+)\s*m/i) ||
                         this.extractFromText(altitudeText, /entre\s+(\d+)\s*m/i);
      const altitudeMax = this.extractFromText(altitudeText, /et\s+(\d+)\s*m/i);

      // Extraction des descriptions
      const descriptionComplete = this.extractDescription($);
      const itineraireDetaille = this.extractItineraire($);
      const conseils = this.extractConseils($);
      
      // Extraction des points d'intérêt
      const pointsInteret = this.extractPointsInteret($);
      
      // Extraction des équipements
      const equipements = this.extractEquipements($);
      
      // Extraction des dangers et précautions
      const dangers = this.extractDangers($);
      
      // Point de départ (estimation basée sur le nom et le contenu)
      const pointDepart = this.extractPointDepart($, nom);
      
      // Date de mise à jour
      const dateMiseAJour = this.extractDate($);

      // Détection de la région basée sur le nom et le contenu
      const region = this.detectRegion(nom, pointDepart.nom, $('body').text());

      return {
        randopitons_id: this.extractIdFromUrl(url),
        url: url,
        nom: nom,
        region: region,
        difficulte: difficulte || 'Modéré',
        distance: distance || 0,
        duree: duree,
        denivele_positif: denivele || 0,
        denivele_negatif: denivele || 0,
        altitude_min: altitudeMin,
        altitude_max: altitudeMax || altitudeMin,
        description_complete: descriptionComplete,
        itineraire_detaille: itineraireDetaille,
        conseils_pratiques: conseils,
        points_interet: pointsInteret,
        equipements_obligatoires: equipements.obligatoires,
        equipements_recommandes: equipements.recommandes,
        dangers: dangers,
        point_depart: pointDepart,
        derniere_mise_a_jour_site: dateMiseAJour,
        raw_data: {
          html_length: $.html().length,
          extracted_at: new Date()
        }
      };
      
    } catch (error) {
      console.error('Erreur extraction données:', error);
      return {};
    }
  }

  extractDescription($) {
    // Chercher la description dans plusieurs endroits possibles
    let description = '';
    
    // Description principale
    const mainDesc = $('.description, .content, .rando-description, p').first().text();
    if (mainDesc && mainDesc.length > 50) {
      description += mainDesc + '\n\n';
    }
    
    // Autres paragraphes descriptifs
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 100 && !text.match(/^(Distance|Durée|Dénivelé|Difficulté)/i)) {
        description += text + '\n\n';
      }
    });
    
    return description.trim();
  }

  extractItineraire($) {
    let itineraire = '';
    
    // Chercher les sections d'itinéraire
    $('*:contains("Itinéraire"), *:contains("Parcours"), *:contains("Route")').each((i, el) => {
      const section = $(el).parent().text();
      if (section.length > 50) {
        itineraire += section + '\n\n';
      }
    });
    
    return itineraire.trim();
  }

  extractConseils($) {
    let conseils = '';
    
    $('*:contains("Conseil"), *:contains("Recommandation"), *:contains("Attention")').each((i, el) => {
      const text = $(el).text();
      if (text.length > 20) {
        conseils += text + '\n';
      }
    });
    
    return conseils.trim();
  }

  extractPointsInteret($) {
    const points = [];
    const bodyText = $('body').text();
    
    // Patterns pour identifier les points d'intérêt
    const patterns = [
      /(?:cascade|chute|bassin|rivière|source)[\w\s]*[A-Z][\w\s]+/gi,
      /(?:piton|sommet|col|crête)[\w\s]*[A-Z][\w\s]+/gi,
      /(?:forêt|jardin|site)[\w\s]*[A-Z][\w\s]+/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = bodyText.match(pattern) || [];
      matches.forEach(match => {
        if (match.length > 5 && match.length < 50) {
          points.push({
            nom: match.trim(),
            description: ''
          });
        }
      });
    });
    
    return points.slice(0, 10); // Limiter à 10 points max
  }

  extractEquipements($) {
    const equipements = { obligatoires: [], recommandes: [] };
    const bodyText = $('body').text().toLowerCase();
    
    const equipementsCommuns = [
      'chaussures de randonnée', 'eau', 'protection solaire',
      'bâtons', 'casque', 'corde', 'lampe frontale',
      'vêtements chauds', 'coupe-vent', 'gants'
    ];
    
    equipementsCommuns.forEach(equip => {
      if (bodyText.includes(equip)) {
        if (bodyText.includes(`${equip} obligatoire`) || bodyText.includes(`${equip} indispensable`)) {
          equipements.obligatoires.push(equip);
        } else {
          equipements.recommandes.push(equip);
        }
      }
    });
    
    return equipements;
  }

  extractDangers($) {
    const dangers = [];
    const bodyText = $('body').text().toLowerCase();
    
    const dangersCommuns = [
      'chutes de pierres', 'vertige', 'terrain glissant',
      'passages exposés', 'météo changeante', 'brouillard',
      'vent fort', 'rivière en crue', 'terrain technique'
    ];
    
    dangersCommuns.forEach(danger => {
      if (bodyText.includes(danger) || bodyText.includes(danger.replace('terrain ', ''))) {
        dangers.push(danger);
      }
    });
    
    return dangers;
  }

  extractPointDepart($, nom) {
    // Essayer d'extraire le point de départ du nom ou du contenu
    const bodyText = $('body').text();
    
    // Chercher des patterns de lieux
    const lieux = [
      'Cilaos', 'Hell-Bourg', 'Salazie', 'Maïdo', 'Col de Fourche',
      'Pas de Bellecombe', 'Saint-Denis', 'Saint-Pierre', 'Saint-Paul',
      'Bras Sec', 'Mare à Joncs', 'La Nouvelle'
    ];
    
    let lieu = 'La Réunion';
    for (const l of lieux) {
      if (nom.includes(l) || bodyText.includes(l)) {
        lieu = l;
        break;
      }
    }
    
    // Coordonnées approximatives (à affiner selon le lieu)
    const coords = this.getApproxCoordinates(lieu);
    
    return {
      nom: lieu,
      coordonnees: {
        longitude: coords[0],
        latitude: coords[1]
      },
      altitude: coords[2] || 0,
      acces_voiture: true,
      parking_disponible: true
    };
  }

  getApproxCoordinates(lieu) {
    const coordsMap = {
      'Cilaos': [55.4720, -21.1367, 1200],
      'Hell-Bourg': [55.5267, -21.0633, 920],
      'Salazie': [55.5400, -21.0800, 400],
      'Maïdo': [55.3844, -21.0775, 2190],
      'Col de Fourche': [55.4063, -21.0631, 1946],
      'Pas de Bellecombe': [55.7139, -21.2441, 2311],
      'Saint-Denis': [55.4500, -20.8800, 50],
      'Saint-Pierre': [55.4700, -21.3200, 20],
      'Saint-Paul': [55.2700, -21.0100, 50],
      'Bras Sec': [55.4800, -21.1400, 1300],
      'Mare à Joncs': [55.4600, -21.1000, 1800],
      'La Nouvelle': [55.4163, -21.0631, 1100]
    };
    
    return coordsMap[lieu] || [55.5000, -21.1000, 500];
  }

  extractDate($) {
    // Chercher une date de mise à jour
    const dateText = $('*:contains("mise à jour"), *:contains("modifié"), .date').text();
    const dateMatch = dateText.match(/(\d{2}\/\d{2}\/\d{4})/);
    
    if (dateMatch) {
      const [day, month, year] = dateMatch[1].split('/');
      return new Date(year, month - 1, day);
    }
    
    return new Date();
  }

  detectRegion(nom, pointDepart, contenu) {
    const nomLower = nom.toLowerCase();
    const pointDepartLower = pointDepart.toLowerCase();
    const contenuLower = contenu.toLowerCase();
    
    // Combinaison nom + point de départ + contenu pour une meilleure détection
    const texteCombine = `${nomLower} ${pointDepartLower} ${contenuLower}`;
    
    // Mots-clés par région (ordre d'importance)
    const regionsKeywords = {
      'Cirque de Cilaos': [
        'cilaos', 'bras sec', 'palmiste rouge', 'dimitile', 'piton bethoune', 'bonnet pretre',
        'mare à joncs', 'kerveguen', 'caverne dufour', 'piton des neiges', 'bloc', 'thermes cilaos',
        'roche merveilleuse', 'bassin bleu', 'sentier sources', 'ilet à cordes', 'fleurs jaunes'
      ],
      'Cirque de Mafate': [
        'mafate', 'maïdo', 'roche plate', 'nouvelle', 'marla', 'trois ilets', 'orangers',
        'cayenne', 'grand place', 'bronchard', 'lataniers', 'col fourche', 'hell bourg'
      ],
      'Cirque de Salazie': [
        'salazie', 'hell-bourg', 'hell bourg', 'piton anchaing', 'ilet à vidot', 'rivière mat',
        'sources manouilh', 'terre plate', 'col fourche', 'bélouve', 'trou de fer'
      ],
      'Volcan': [
        'piton fournaise', 'pas bellecombe', 'bellecombe', 'cratère dolomieu', 'dolomieu',
        'coulée lave', 'plaine sables', 'volcan', 'enclos fouqué', 'bory', 'soufrière'
      ],
      'Est': [
        'takamaka', 'barrage patience', 'caroline', 'eden', 'plaine palmistes', 'bébour',
        'bélouve', 'saint-benoit', 'sainte-anne', 'grand étang', 'forêt bebour',
        'cascade niagara', 'cascade biberon', 'voile mariée'
      ],
      'Ouest': [
        'grand bénare', 'benare', 'glacière', 'maïdo', 'saint-paul', 'dos âne', 'cap noir',
        'port', 'saint-gilles', 'hermitage', 'cap la houssaye', 'théâtre', 'trois bassins'
      ],
      'Nord': [
        'roche écrite', 'roche ecrite', 'mamode camp', 'saint-denis', 'montagne', 'colorado',
        'chaudron', 'cascade niagara', 'takamaka saint benoit', 'salazie nord'
      ],
      'Sud': [
        'grand coude', 'bois court', 'entre-deux', 'saint-pierre', 'petite-île',
        'saint-joseph', 'vincendo', 'langevin', 'grand galet', 'basse vallée'
      ]
    };
    
    // Compteur de matches par région
    let regionScores = {};
    
    for (const [region, keywords] of Object.entries(regionsKeywords)) {
      regionScores[region] = 0;
      
      keywords.forEach((keyword, index) => {
        if (texteCombine.includes(keyword)) {
          // Pondération : les premiers mots-clés ont plus de poids
          const weight = keywords.length - index;
          regionScores[region] += weight;
        }
      });
    }
    
    // Trouver la région avec le meilleur score
    let bestRegion = 'Cirque de Cilaos'; // Par défaut
    let bestScore = 0;
    
    for (const [region, score] of Object.entries(regionScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestRegion = region;
      }
    }
    
    // Si aucun match significatif, essayer de détecter par coordonnées approximatives
    if (bestScore === 0) {
      return this.detectRegionByLocation(pointDepart);
    }
    
    console.log(`🎯 Région détectée: ${bestRegion} (score: ${bestScore}) pour "${nom}"`);
    return bestRegion;
  }

  detectRegionByLocation(pointDepart) {
    // Détection approximative par géolocalisation (coordonnées typiques)
    const coords = pointDepart.nom;
    
    // Régions approximatives par coordonnées de La Réunion
    const regionsGeo = {
      'Cirque de Cilaos': ['cilaos', 'bras sec'],
      'Cirque de Mafate': ['maïdo', 'col fourche'],
      'Cirque de Salazie': ['salazie', 'hell-bourg'],
      'Volcan': ['bellecombe', 'bourg murat'],
      'Est': ['saint-benoit', 'plaine palmistes'],
      'Ouest': ['saint-paul', 'trois bassins'],
      'Nord': ['saint-denis', 'sainte-marie'],
      'Sud': ['saint-pierre', 'entre-deux']
    };
    
    for (const [region, lieux] of Object.entries(regionsGeo)) {
      if (lieux.some(lieu => coords.toLowerCase().includes(lieu))) {
        return region;
      }
    }
    
    return 'Cirque de Cilaos'; // Défaut
  }

  // Fonctions utilitaires
  extractIdFromUrl(url) {
    const match = url.match(/\/randonnee\/(\d+)/);
    return match ? match[1] : url.split('/').pop();
  }

  parseNumber(text) {
    if (!text) return null;
    const match = text.match(/(\d+[,.]?\d*)/);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  parseDuree(text) {
    if (!text) return { heures: 0, minutes: 0 };
    
    // Nettoyer le texte et chercher des patterns de durée
    const cleanText = text.toLowerCase().trim();
    
    // Pattern pour "2h30", "3h45", etc.
    const dureeCompleteMatch = cleanText.match(/(\d+)\s*h\s*(\d+)/i);
    if (dureeCompleteMatch) {
      return {
        heures: parseInt(dureeCompleteMatch[1]),
        minutes: parseInt(dureeCompleteMatch[2])
      };
    }
    
    // Pattern pour "2h", "3h", etc. (sans minutes)
    const heuresSeulMatch = cleanText.match(/(\d+)\s*h(?!\d)/i);
    if (heuresSeulMatch) {
      return {
        heures: parseInt(heuresSeulMatch[1]),
        minutes: 0
      };
    }
    
    // Pattern pour minutes seules (rare mais possible)
    const minutesSeulMatch = cleanText.match(/(\d+)\s*min/i);
    if (minutesSeulMatch) {
      return {
        heures: 0,
        minutes: parseInt(minutesSeulMatch[1])
      };
    }
    
    // Fallback : estimer une durée raisonnable (2h par défaut)
    return { heures: 2, minutes: 0 };
  }

  parseDifficulte(text) {
    if (!text) return 'Modéré';
    
    const t = text.toLowerCase();
    if (t.includes('facile')) return 'Facile';
    if (t.includes('très difficile')) return 'Très difficile';
    if (t.includes('difficile')) return 'Difficile';
    if (t.includes('expert')) return 'Expert';
    if (t.includes('modéré') || t.includes('moyenne')) return 'Modéré';
    
    return 'Modéré';
  }

  extractFromText(text, regex) {
    const match = text.match(regex);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Script principal
async function main() {
  const scraper = new RandopitonsScraper();
  
  try {
    await scraper.connectDB();
    await scraper.scrapeAllSentiers();
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = RandopitonsScraper;