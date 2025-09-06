const axios = require('axios');
const cheerio = require('cheerio');

class UrlAnalyzer {
  constructor() {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      }
    });
  }

  async analyzeUrl(url) {
    try {
      console.log(`\n🔍 Analyse de: ${url}`);
      
      const response = await this.httpClient.get(url);
      const $ = cheerio.load(response.data);
      
      // Extraction du nom comme le fait le scraper
      const nom = $('h1').first().text().trim();
      const title = $('title').text().trim();
      const metaDescription = $('meta[name="description"]').attr('content');
      
      console.log(`📝 Nom (h1): "${nom}"`);
      console.log(`📑 Title: "${title}"`);
      console.log(`📋 Meta description: "${metaDescription || 'N/A'}"`);
      
      // Chercher d'autres éléments possibles
      const otherTitles = [];
      $('h2, h3, .title, .nom, .name').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 3) {
          otherTitles.push(text);
        }
      });
      
      if (otherTitles.length > 0) {
        console.log(`📌 Autres titres trouvés: ${otherTitles.slice(0, 3).join(' | ')}`);
      }
      
      // Vérifier si c'est une page d'erreur ou redirection
      const bodyText = $('body').text().toLowerCase();
      if (bodyText.includes('404') || bodyText.includes('not found') || bodyText.includes('page non trouvée')) {
        console.log(`❌ Page d'erreur détectée`);
      }
      
      if (bodyText.includes('connexion') || bodyText.includes('login') || bodyText.includes('maintenance')) {
        console.log(`🔒 Page de connexion/maintenance détectée`);
      }
      
      // Analyser la structure de la page
      const hasContent = $('.content, .description, p').length > 0;
      console.log(`📊 Structure: ${hasContent ? 'Contenu présent' : 'Pas de contenu détecté'}`);
      
      return {
        url,
        nom,
        title,
        hasValidName: nom && nom.length > 3,
        hasContent,
        isErrorPage: bodyText.includes('404') || bodyText.includes('not found')
      };
      
    } catch (error) {
      console.log(`❌ Erreur: ${error.message}`);
      return {
        url,
        error: error.message,
        hasValidName: false
      };
    }
  }
}

async function main() {
  const analyzer = new UrlAnalyzer();
  
  // URLs qui ont donné "Données incomplètes" d'après les logs
  const problematicUrls = [
    'https://randopitons.re/randonnee/1638-grotte-ravine-maison-rouge-depuis-pont-neuf',
    'https://randopitons.re/randonnee/1613-tour-usine-gol-petits-etangs-ravine-gol',
    'https://randopitons.re/randonnee/1421-grande-boucle-etang-gol-depuis-bel-air',
    'https://randopitons.re/randonnee/1970-l-etang-sale-ravine-ruisseau-cinq-tunnels-rn1',
    'https://randopitons.re/randonnee/1902-l-etang-sale-piton-croix-chemin-entre-deux'
  ];
  
  console.log('🔍 Analyse des URLs problématiques...\n');
  
  for (const url of problematicUrls) {
    await analyzer.analyzeUrl(url);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause de 1s entre les requêtes
  }
  
  console.log('\n✅ Analyse terminée');
}

main().catch(console.error);