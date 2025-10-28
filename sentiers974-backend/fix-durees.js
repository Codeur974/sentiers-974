const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

class DureesFixer {
  constructor() {
    console.log('🔧 Correcteur de durées aberrantes (depuis API)');
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

  async fixDurees() {
    console.log('🔍 Recherche des durées aberrantes...');
    
    // Trouver tous les sentiers avec des durées supérieures à 12h (aberrantes)
    const sentiersProblematiques = await Sentier.find({
      $expr: {
        $gt: [
          { $add: ['$duree.heures', { $divide: ['$duree.minutes', 60] }] },
          12
        ]
      }
    });

    console.log(`📊 ${sentiersProblematiques.length} sentiers avec durées aberrantes trouvés`);

    let corrected = 0;
    for (const sentier of sentiersProblematiques) {
      const dureeActuelle = sentier.duree.heures + (sentier.duree.minutes / 60);
      console.log(`⚠️  ${sentier.nom}: ${dureeActuelle.toFixed(2)}h (heures: ${sentier.duree.heures}, minutes: ${sentier.duree.minutes})`);
      
      // Estimation de durée basée sur distance et dénivelé
      const nouvelleduree = this.estimerDureeReelle(sentier.distance, sentier.denivele_positif);
      
      sentier.duree = nouvelleduree;
      await sentier.save();
      
      console.log(`✅ Corrigé: ${sentier.nom} → ${nouvelleduree.heures}h${nouvelleduree.minutes > 0 ? (nouvelleduree.minutes < 10 ? '0' : '') + nouvelleduree.minutes : ''}`);
      corrected++;
    }

    console.log(`🎯 ${corrected} durées corrigées`);
  }

  estimerDureeReelle(distance, denivele) {
    // Règle d'estimation : 1h pour 4km + 1h pour 300m de dénivelé positif
    const dureeDistance = distance / 4; // heures
    const dureeDenivele = denivele / 300; // heures
    
    const dureeEstimee = dureeDistance + dureeDenivele;
    
    // Convertir en heures/minutes
    const heures = Math.floor(dureeEstimee);
    const minutes = Math.round((dureeEstimee - heures) * 60);
    
    // S'assurer que c'est dans une fourchette raisonnable (30min à 10h)
    if (heures < 1 && minutes < 30) {
      return { heures: 1, minutes: 0 };
    }
    if (heures > 10) {
      return { heures: 8, minutes: 0 }; // Maximum raisonnable
    }
    
    return { heures, minutes };
  }

  async verifierReparation() {
    const sentiersEncore = await Sentier.find({
      $expr: {
        $gt: [
          { $add: ['$duree.heures', { $divide: ['$duree.minutes', 60] }] },
          12
        ]
      }
    });

    console.log(`🔍 Vérification: ${sentiersEncore.length} sentiers avec durées encore aberrantes`);
    
    if (sentiersEncore.length === 0) {
      console.log('🎉 Toutes les durées aberrantes ont été corrigées !');
    }
  }
}

// Script principal
async function main() {
  const fixer = new DureesFixer();
  
  try {
    await fixer.connectDB();
    await fixer.fixDurees();
    await fixer.verifierReparation();
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion fermée');
  }
}

if (require.main === module) {
  main();
}

module.exports = DureesFixer;