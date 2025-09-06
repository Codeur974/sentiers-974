const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

class DenivelesTester {
  
  extractFromText(text, regex) {
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  async extractDenivele(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const bodyText = $('body').text();
      
      // Pattern optimisé basé sur notre analyse
      const denivele = 
        this.extractFromText(bodyText, /Dénivelé positif[:\s]*(\d+)/i) ||
        this.extractFromText(bodyText, /(\d+)\s*m.*dénivelé/i) ||
        this.extractFromText(bodyText, /dénivelé.*?(\d+)\s*m/i);
      
      return denivele || 0;
    } catch (error) {
      console.error(`Erreur scraping ${url}:`, error.message);
      return 0;
    }
  }

  async testDeniveles() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connexion MongoDB établie');

      // Tester sur 5 sentiers avec dénivelé = 0
      const sentiersTest = await Sentier.find({ denivele_positif: 0 }).limit(5);
      console.log(`📊 Test sur ${sentiersTest.length} sentiers`);

      for (const sentier of sentiersTest) {
        console.log(`\n🔍 ${sentier.nom}`);
        console.log(`  URL: ${sentier.url}`);
        console.log(`  Dénivelé actuel: ${sentier.denivele_positif}m`);
        
        const nouveauDenivele = await this.extractDenivele(sentier.url);
        console.log(`  Dénivelé extrait: ${nouveauDenivele}m`);
        
        if (nouveauDenivele > 0) {
          console.log(`  ✅ Correction possible: ${sentier.denivele_positif}m -> ${nouveauDenivele}m`);
        } else {
          console.log(`  ⚪ Pas de données trouvées`);
        }
        
        // Pause
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      await mongoose.connection.close();
    }
  }
}

const tester = new DenivelesTester();
tester.testDeniveles();