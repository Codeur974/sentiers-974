const RandopitonsScraper = require('./scraper.js');
const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function testNewSentiers() {
  const scraper = new RandopitonsScraper();
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // URLs qui donnaient "Données incomplètes" avant
    const testUrls = [
      'https://randopitons.re/randonnee/1638-grotte-ravine-maison-rouge-depuis-pont-neuf',
      'https://randopitons.re/randonnee/1613-tour-usine-gol-petits-etangs-ravine-gol',
      'https://randopitons.re/randonnee/1421-grande-boucle-etang-gol-depuis-bel-air',
      'https://randopitons.re/randonnee/1970-l-etang-sale-ravine-ruisseau-cinq-tunnels-rn1',
      'https://randopitons.re/randonnee/1902-l-etang-sale-piton-croix-chemin-entre-deux'
    ];
    
    let nouveaux = 0;
    let existants = 0;
    let erreurs = 0;
    
    console.log('🧪 Test du scraping amélioré sur 5 sentiers...\n');
    
    for (const url of testUrls) {
      try {
        const randopitonsId = scraper.extractIdFromUrl(url);
        const existing = await Sentier.findOne({ randopitons_id: randopitonsId });
        
        if (existing) {
          console.log(`⏭️  Déjà en base: ${existing.nom}`);
          existants++;
          continue;
        }
        
        const response = await scraper.httpClient.get(url);
        const cheerio = require('cheerio');
        const $ = cheerio.load(response.data);
        
        const sentierData = scraper.extractSentierData($, url);
        
        if (sentierData.nom) {
          const sentier = new Sentier(sentierData);
          await sentier.save();
          nouveaux++;
          console.log(`✅ [${nouveaux}] Nouveau: ${sentierData.nom} (${sentierData.region})`);
        } else {
          console.log(`⚠️  Toujours pas de nom valide: ${url}`);
          erreurs++;
        }
        
        // Pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Erreur ${url}: ${error.message}`);
        erreurs++;
      }
    }
    
    console.log(`\n📊 Résultats:`);
    console.log(`- Nouveaux sentiers ajoutés: ${nouveaux}`);
    console.log(`- Déjà en base: ${existants}`);
    console.log(`- Erreurs: ${erreurs}`);
    
    if (nouveaux > 0) {
      const total = await Sentier.countDocuments();
      console.log(`\n🎯 Total sentiers en base: ${total}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testNewSentiers();