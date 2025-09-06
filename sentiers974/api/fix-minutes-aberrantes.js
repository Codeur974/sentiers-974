const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function fixMinutesAberrantes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connexion MongoDB établie');

    // Trouver tous les sentiers avec des minutes aberrantes (> 59)
    const sentiersProblematiques = await Sentier.find({
      'duree.minutes': { $gt: 59 }
    });

    console.log(`📊 ${sentiersProblematiques.length} sentiers avec minutes aberrantes trouvés`);

    let corrected = 0;
    for (const sentier of sentiersProblematiques) {
      const minutesOriginales = sentier.duree.minutes;
      const dureeOriginale = sentier.duree.heures + (minutesOriginales / 60);
      
      console.log(`⚠️  ${sentier.nom}: ${sentier.duree.heures}h${minutesOriginales}m (${dureeOriginale.toFixed(2)}h)`);
      
      // Corriger en estimant une durée réaliste
      const nouvelleduree = estimerDureeReelle(sentier.distance, sentier.denivele_positif);
      
      sentier.duree = nouvelleduree;
      await sentier.save();
      
      console.log(`✅ Corrigé: ${sentier.nom} → ${nouvelleduree.heures}h${nouvelleduree.minutes > 0 ? (nouvelleduree.minutes < 10 ? '0' : '') + nouvelleduree.minutes : ''}`);
      corrected++;
    }

    console.log(`🎯 ${corrected} durées avec minutes aberrantes corrigées`);

    // Vérification finale
    const sentiersEncore = await Sentier.find({
      'duree.minutes': { $gt: 59 }
    });

    console.log(`🔍 Vérification: ${sentiersEncore.length} sentiers avec minutes aberrantes encore présentes`);
    
    if (sentiersEncore.length === 0) {
      console.log('🎉 Toutes les minutes aberrantes ont été corrigées !');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
  }
}

function estimerDureeReelle(distance, denivele) {
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

fixMinutesAberrantes();