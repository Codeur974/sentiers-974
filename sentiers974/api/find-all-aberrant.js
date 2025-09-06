const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function findAllAberrant() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connexion MongoDB établie');

    // Trouver tous les sentiers avec des durées calculées > 12h
    const sentiersAberrants = await Sentier.find({
      $expr: {
        $gt: [
          { $add: ['$duree.heures', { $divide: ['$duree.minutes', 60] }] },
          12
        ]
      }
    });

    console.log(`📊 ${sentiersAberrants.length} sentiers avec durées > 12h trouvés :`);
    
    sentiersAberrants.forEach((sentier, index) => {
      const dureeCalculee = sentier.duree.heures + (sentier.duree.minutes / 60);
      console.log(`${index + 1}. ${sentier.nom}`);
      console.log(`   Durée: ${sentier.duree.heures}h${sentier.duree.minutes}m = ${dureeCalculee.toFixed(2)}h`);
      console.log(`   Distance: ${sentier.distance}km, Dénivelé: ${sentier.denivele_positif}m`);
      console.log('');
    });

    // Trouver aussi ceux avec des minutes aberrantes (> 59)
    const minutesAberrantes = await Sentier.find({
      'duree.minutes': { $gt: 59 }
    });

    console.log(`\n📊 ${minutesAberrantes.length} sentiers avec minutes > 59 :`);
    minutesAberrantes.forEach((sentier, index) => {
      console.log(`${index + 1}. ${sentier.nom}: ${sentier.duree.heures}h${sentier.duree.minutes}m`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
  }
}

findAllAberrant();