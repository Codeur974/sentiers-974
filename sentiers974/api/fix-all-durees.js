const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function fixAllDurees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connexion MongoDB établie');

    // Récupérer TOUS les sentiers
    const tousSentiers = await Sentier.find({});
    console.log(`📊 ${tousSentiers.length} sentiers à analyser`);

    let corrected = 0;
    const problematiques = [];

    for (const sentier of tousSentiers) {
      const dureeCalculee = sentier.duree.heures + (sentier.duree.minutes / 60);
      
      // Durées aberrantes : < 0.5h (30min) OU > 10h OU minutes >= 60
      const estAberrante = 
        dureeCalculee < 0.5 || 
        dureeCalculee > 10 || 
        sentier.duree.minutes >= 60 ||
        sentier.duree.heures < 0 ||
        sentier.duree.minutes < 0;

      if (estAberrante) {
        problematiques.push({
          nom: sentier.nom,
          dureeOriginale: `${sentier.duree.heures}h${sentier.duree.minutes}m`,
          dureeCalculee: dureeCalculee,
          distance: sentier.distance,
          denivele: sentier.denivele_positif
        });

        console.log(`⚠️  ${sentier.nom}`);
        console.log(`   Durée aberrante: ${sentier.duree.heures}h${sentier.duree.minutes}m = ${dureeCalculee.toFixed(2)}h`);
        console.log(`   Distance: ${sentier.distance}km, Dénivelé: ${sentier.denivele_positif}m`);
        
        // Estimation de durée réaliste
        const nouvelleduree = estimerDureeReelle(sentier.distance, sentier.denivele_positif);
        
        sentier.duree = nouvelleduree;
        await sentier.save();
        
        console.log(`   ✅ Corrigé: ${nouvelleduree.heures}h${nouvelleduree.minutes > 0 ? (nouvelleduree.minutes < 10 ? '0' : '') + nouvelleduree.minutes : ''}`);
        console.log('');
        corrected++;
      }
    }

    console.log(`\n🎯 ${corrected} durées aberrantes corrigées sur ${tousSentiers.length} sentiers`);
    console.log(`📊 ${tousSentiers.length - corrected} sentiers avaient des durées correctes`);

    // Vérification finale
    const verification = await Sentier.find({
      $or: [
        { $expr: { $lt: [{ $add: ['$duree.heures', { $divide: ['$duree.minutes', 60] }] }, 0.5] } },
        { $expr: { $gt: [{ $add: ['$duree.heures', { $divide: ['$duree.minutes', 60] }] }, 10] } },
        { 'duree.minutes': { $gte: 60 } },
        { 'duree.heures': { $lt: 0 } },
        { 'duree.minutes': { $lt: 0 } }
      ]
    });

    console.log(`\n🔍 Vérification finale: ${verification.length} durées aberrantes restantes`);
    if (verification.length === 0) {
      console.log('🎉 Toutes les durées sont maintenant dans des fourchettes réalistes !');
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
  
  let dureeEstimee = dureeDistance + dureeDenivele;
  
  // S'assurer que c'est dans une fourchette réaliste
  if (dureeEstimee < 0.5) dureeEstimee = 0.75; // Minimum 45 minutes
  if (dureeEstimee > 10) dureeEstimee = 8; // Maximum 8 heures
  
  // Convertir en heures/minutes
  const heures = Math.floor(dureeEstimee);
  const minutes = Math.round((dureeEstimee - heures) * 60);
  
  return { heures, minutes };
}

fixAllDurees();