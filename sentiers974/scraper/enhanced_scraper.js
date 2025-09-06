const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');

class EnhancedRandopitonsScraper {
  constructor() {
    this.baseUrl = 'https://randopitons.re';
    
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      }
    });
  }

  async connectDB() {
    try {
      await mongoose.connect('mongodb://localhost:27017/randopitons');
      console.log('✅ MongoDB connecté');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error);
      throw error;
    }
  }

  /**
   * Scrape une page de sentier avec extraction améliorée
   */
  async scrapeSentierPage(url) {
    try {
      console.log(`🔍 Scraping amélioré: ${url}`);
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);

      // Extraction du nom (titre principal)
      const nom = this.extractNom($);
      
      // Extraction de la description complète (section principale)
      const description = this.extractDescriptionComplete($);
      
      // Extraction de l'itinéraire détaillé (section spécifique)
      const itineraire = this.extractItineraireDetaille($);
      
      // Extraction des vrais points d'intérêt
      const pointsInteret = this.extractVraisPointsInteret($);
      
      // Extraction des particularités du sentier
      const particularites = this.extractParticularites($);
      
      // Extraction des conseils pratiques
      const conseils = this.extractConseilsPratiques($);

      return {
        nom,
        description_complete: description,
        itineraire_detaille: itineraire,
        points_interet: pointsInteret,
        particularites: particularites,
        conseils_pratiques: conseils,
        url: url,
        last_enhanced_scrape: new Date()
      };

    } catch (error) {
      console.error(`❌ Erreur scraping ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Extraction améliorée du nom
   */
  extractNom($) {
    // Essayer plusieurs sélecteurs pour le titre
    const selectors = [
      'h1.trail-title',
      'h1',
      '.page-title',
      '.trail-name',
      'title'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        const nom = element.text().trim().replace(/\s+/g, ' ');
        if (nom.length > 10 && nom.length < 200) {
          return nom;
        }
      }
    }

    return 'Sentier de randonnée';
  }

  /**
   * Extraction améliorée de la description complète
   */
  extractDescriptionComplete($) {
    let description = '';

    // Chercher le contenu principal de description
    const contentSelectors = [
      '.trail-description',
      '.description',
      '.content p',
      '.main-content p'
    ];

    for (const selector of contentSelectors) {
      $(selector).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 100 && text.length < 2000) {
          description += text + '\n\n';
        }
      });
      if (description.length > 200) break;
    }

    // Si pas trouvé, prendre le contenu général mais filtré
    if (description.length < 100) {
      const bodyText = $('body').text();
      const paragraphs = bodyText.split('\n').filter(p => 
        p.length > 50 && 
        p.length < 500 &&
        !p.includes('commentaire') &&
        !p.includes('Copyright') &&
        !p.includes('Randopitons')
      );
      description = paragraphs.slice(0, 3).join('\n\n');
    }

    return this.cleanText(description);
  }

  /**
   * Extraction spécifique de l'itinéraire détaillé
   */
  extractItineraireDetaille($) {
    let itineraire = '';

    // Chercher spécifiquement la section itinéraire
    const itineraireSelectors = [
      '*:contains("Itinéraire")',
      '*:contains("Parcours")',
      '*:contains("Trajet")',
      '*:contains("Route à suivre")'
    ];

    for (const selector of itineraireSelectors) {
      $(selector).each((i, el) => {
        const parent = $(el).parent();
        const siblings = parent.nextAll().slice(0, 5); // Prendre les 5 éléments suivants
        
        siblings.each((j, sibling) => {
          const text = $(sibling).text().trim();
          if (text.length > 100 && text.length < 1500) {
            itineraire += text + '\n\n';
          }
        });

        if (itineraire.length > 200) return false; // Arrêter la boucle
      });
      if (itineraire.length > 200) break;
    }

    // Fallback: chercher des paragraphes qui ressemblent à un itinéraire
    if (itineraire.length < 100) {
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.match(/(?:partir|suivre|rejoindre|monter|descendre|emprunter|passer|traverser)/i) && 
            text.length > 100 && text.length < 800) {
          itineraire += text + '\n\n';
        }
      });
    }

    return this.cleanText(itineraire);
  }

  /**
   * Extraction améliorée des vrais points d'intérêt
   */
  extractVraisPointsInteret($) {
    const points = [];
    const bodyText = $('body').text();

    // Patterns plus précis pour les POI
    const poiPatterns = [
      /\d+\s+(?:petites?\s+)?(?:chutes?|cascades?|bassins?)[^.!?]*[.!?]/gi,
      /(?:cascade|chute|bassin)\s+(?:de\s+)?[A-Z][a-zA-Zé\s]+/gi,
      /(?:piton|sommet|col|crête)\s+(?:de\s+|des\s+)?[A-Z][a-zA-Zé\s]+/gi,
      /(?:forêt|jardin|site|collection)\s+(?:de\s+|des\s+)?[A-Z][a-zA-Zé\s]+/gi,
      /[A-Z][a-zA-Zé\s]+(?:\s+(?:waterfalls?|falls?|basin|forest|garden))/gi
    ];

    poiPatterns.forEach(pattern => {
      const matches = bodyText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.trim().replace(/[.!?]+$/, '');
          if (cleaned.length > 8 && cleaned.length < 80) {
            // Éviter les doublons
            const normalized = cleaned.toLowerCase();
            if (!points.some(p => p.nom.toLowerCase().includes(normalized.substring(0, 15)))) {
              points.push({
                nom: this.capitalizeText(cleaned),
                description: '',
                coordonnees: {},
                photos: []
              });
            }
          }
        });
      }
    });

    // Limiter à 6 points d'intérêt
    return points.slice(0, 6);
  }

  /**
   * Extraction des particularités du sentier
   */
  extractParticularites($) {
    let particularites = '';

    // Chercher section particularités
    $('*:contains("Particularité"), *:contains("Spécificité"), *:contains("Caractéristique")').each((i, el) => {
      const section = $(el).parent().text();
      if (section.length > 50 && section.length < 800) {
        particularites += section + '\n\n';
      }
    });

    return this.cleanText(particularites);
  }

  /**
   * Extraction des conseils pratiques
   */
  extractConseilsPratiques($) {
    let conseils = '';

    // Chercher section conseils
    $('*:contains("Conseil"), *:contains("Recommandation"), *:contains("Attention")').each((i, el) => {
      const section = $(el).parent().text();
      if (section.length > 30 && section.length < 500) {
        conseils += section + '\n\n';
      }
    });

    return this.cleanText(conseils);
  }

  /**
   * Nettoyage du texte
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .substring(0, 2000) // Limiter la taille
      .trim();
  }

  /**
   * Capitalisation correcte
   */
  capitalizeText(text) {
    return text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Mise à jour d'un sentier existant
   */
  async updateSentier(randopitons_id, data) {
    try {
      await Sentier.updateOne(
        { randopitons_id: randopitons_id },
        { 
          $set: {
            description_complete: data.description_complete,
            itineraire_detaille: data.itineraire_detaille,
            points_interet: data.points_interet,
            conseils_pratiques: data.conseils_pratiques,
            last_enhanced_scrape: data.last_enhanced_scrape
          }
        }
      );
      return true;
    } catch (error) {
      console.error(`❌ Erreur mise à jour ${randopitons_id}:`, error);
      return false;
    }
  }

  /**
   * Script principal pour améliorer tous les sentiers
   */
  async enhanceAllSentiers() {
    try {
      await this.connectDB();
      
      console.log('🚀 Début de l\'amélioration des sentiers...');
      const sentiers = await Sentier.find({}).limit(10); // Commencer par 10 pour test
      console.log(`📊 ${sentiers.length} sentiers à améliorer`);

      let updated = 0;
      let errors = 0;

      for (const sentier of sentiers) {
        try {
          console.log(`\n🔄 Amélioration: ${sentier.nom}`);
          
          const enhancedData = await this.scrapeSentierPage(sentier.url);
          
          if (enhancedData && enhancedData.nom) {
            const success = await this.updateSentier(sentier.randopitons_id, enhancedData);
            if (success) {
              console.log(`✅ Mis à jour: ${sentier.nom}`);
              console.log(`   📝 Description: ${enhancedData.description_complete?.substring(0, 100)}...`);
              console.log(`   🗺️ Itinéraire: ${enhancedData.itineraire_detaille?.substring(0, 100)}...`);
              console.log(`   🎯 Points (${enhancedData.points_interet.length}): ${enhancedData.points_interet.map(p => p.nom).join(', ')}`);
              updated++;
            } else {
              errors++;
            }
          } else {
            console.log(`⚠️ Pas de données: ${sentier.nom}`);
            errors++;
          }

          // Délai entre requêtes
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`❌ Erreur pour ${sentier.nom}:`, error.message);
          errors++;
        }
      }

      console.log(`\n🎉 Amélioration terminée !`);
      console.log(`   ✅ ${updated} sentiers améliorés`);
      console.log(`   ❌ ${errors} erreurs`);

    } catch (error) {
      console.error('❌ Erreur générale:', error);
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Connexion MongoDB fermée');
    }
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  const scraper = new EnhancedRandopitonsScraper();
  scraper.enhanceAllSentiers();
}

module.exports = EnhancedRandopitonsScraper;