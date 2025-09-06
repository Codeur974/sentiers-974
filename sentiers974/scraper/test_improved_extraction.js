const RandopitonsScraper = require('./scraper.js');

async function testImprovedExtraction() {
  const scraper = new RandopitonsScraper();
  
  // Test sur une URL problématique
  const testUrl = 'https://randopitons.re/randonnee/1638-grotte-ravine-maison-rouge-depuis-pont-neuf';
  
  try {
    console.log('🧪 Test de l\'extraction améliorée...\n');
    
    const response = await scraper.httpClient.get(testUrl);
    const cheerio = require('cheerio');
    const $ = cheerio.load(response.data);
    
    const sentierData = scraper.extractSentierData($, testUrl);
    
    console.log('\n📋 Résultat de l\'extraction:');
    console.log('- Nom:', sentierData.nom || 'VIDE');
    console.log('- Région:', sentierData.region || 'VIDE'); 
    console.log('- Distance:', sentierData.distance || 'VIDE');
    console.log('- Difficulté:', sentierData.difficulte || 'VIDE');
    console.log('- Point de départ:', sentierData.point_depart?.nom || 'VIDE');
    
    if (sentierData.nom) {
      console.log('\n✅ Extraction réussie !');
    } else {
      console.log('\n❌ Extraction toujours échoue');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testImprovedExtraction();