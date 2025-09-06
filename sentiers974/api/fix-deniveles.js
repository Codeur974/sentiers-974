const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

class DenivelesFixer {
  
  extractFromText(text, regex) {
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  async extractDenivele(url) {
    try {
      console.log(`  🔍 Scraping ${url}...`);
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
      console.error(`  ❌ Erreur scraping ${url}:`, error.message);
      return 0;
    }
  }

  async fixDeniveles() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ Connexion MongoDB établie');

      // Récupérer tous les sentiers avec dénivelé = 0
      const sentiersZero = await Sentier.find({ denivele_positif: 0 });
      console.log(`📊 ${sentiersZero.length} sentiers avec dénivelé = 0m à corriger`);

      let corrected = 0;
      let errors = 0;

      for (let i = 0; i < sentiersZero.length; i++) {
        const sentier = sentiersZero[i];
        console.log(`\n🔧 [${i+1}/${sentiersZero.length}] ${sentier.nom}`);
        
        try {
          const nouveauDenivele = await this.extractDenivele(sentier.url);
          
          if (nouveauDenivele > 0) {
            sentier.denivele_positif = nouveauDenivele;
            await sentier.save();
            
            console.log(`  ✅ Corrigé: 0m -> ${nouveauDenivele}m`);
            corrected++;
          } else {
            console.log(`  ⚪ Toujours 0m (pas de données trouvées)`);
          }
          
          // Pause pour éviter de surcharger le serveur
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`  ❌ Erreur: ${error.message}`);
          errors++;
        }
      }

      console.log(`\n🎯 Résultats:`);
      console.log(`   Sentiers corrigés: ${corrected}`);
      console.log(`   Erreurs: ${errors}`);
      console.log(`   Toujours à 0m: ${sentiersZero.length - corrected - errors}`);

      // Statistiques finales
      const stats = await Sentier.aggregate([
        {
          $group: {
            _id: null,
            avg_denivele: { $avg: '$denivele_positif' },
            min_denivele: { $min: '$denivele_positif' },
            max_denivele: { $max: '$denivele_positif' },
            zero_denivele: { $sum: { $cond: [{ $eq: ['$denivele_positif', 0] }, 1, 0] } },
            total: { $sum: 1 }
          }
        }
      ]);
      
      console.log(`\n📈 Nouvelles statistiques:`);
      console.log(`   Moyenne: ${Math.round(stats[0].avg_denivele)}m`);
      console.log(`   Min: ${stats[0].min_denivele}m`);
      console.log(`   Max: ${stats[0].max_denivele}m`);
      console.log(`   Sentiers avec 0m: ${stats[0].zero_denivele}/${stats[0].total}`);
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      await mongoose.connection.close();
    }
  }
}

const fixer = new DenivelesFixer();
fixer.fixDeniveles();