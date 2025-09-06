const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function fixFinalDurees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connexion MongoDB établie');

    // Récupérer TOUS les sentiers
    const tousSentiers = await Sentier.find({});
    console.log(`📊 ${tousSentiers.length} sentiers à nettoyer`);

    let corrected = 0;

    for (const sentier of tousSentiers) {
      const dureeCalculee = sentier.duree.heures + (sentier.duree.minutes / 60);
      const dureeString = dureeCalculee.toString();
      
      // Vérifier si la durée a des décimales bizarres OU des minutes/heures non-entières
      const hasWeirdDecimals = dureeString.includes('.') && dureeString.split('.')[1].length > 2;
      const hasNonIntegerMinutes = sentier.duree.minutes % 1 !== 0;
      const hasNonIntegerHours = sentier.duree.heures % 1 !== 0;
      
      if (hasWeirdDecimals || hasNonIntegerMinutes || hasNonIntegerHours) {
        console.log(`🔧 ${sentier.nom}: ${sentier.duree.heures}h${sentier.duree.minutes}m = ${dureeCalculee}h`);
        
        // Arrondir la durée totale et reconvertir proprement
        const dureeArrondie = Math.round(dureeCalculee * 4) / 4; // Arrondir au quart d'heure
        const nouvelleshHures = Math.floor(dureeArrondie);
        const nouvellesMinutes = Math.round((dureeArrondie - nouvelleshHures) * 60);
        
        // Validation des valeurs
        let heuresFinales = Math.max(0, nouvelleshHures);
        let minutesFinales = Math.max(0, Math.min(59, nouvellesMinutes));
        
        // Gérer le cas où les minutes donnent 60
        if (minutesFinales >= 60) {
          heuresFinales += Math.floor(minutesFinales / 60);
          minutesFinales = minutesFinales % 60;
        }
        
        // S'assurer que les valeurs sont des entiers
        heuresFinales = Math.round(heuresFinales);
        minutesFinales = Math.round(minutesFinales);
        
        sentier.duree = { 
          heures: heuresFinales, 
          minutes: minutesFinales 
        };
        
        await sentier.save();
        
        const nouvelledureeCalculee = heuresFinales + (minutesFinales / 60);
        console.log(`   ✅ ${heuresFinales}h${minutesFinales > 0 ? (minutesFinales < 10 ? '0' : '') + minutesFinales : ''} = ${nouvelledureeCalculee}h`);
        corrected++;
      }
    }

    console.log(`\n🎯 ${corrected} durées nettoyées sur ${tousSentiers.length} sentiers`);

    // Vérification finale
    const verification = await Sentier.find({});
    let problemesRestants = 0;
    
    for (const sentier of verification) {
      const dureeCalculee = sentier.duree.heures + (sentier.duree.minutes / 60);
      const dureeString = dureeCalculee.toString();
      
      // Vérifier les décimales bizarres OU valeurs non-entières
      const hasProblems = 
        (dureeString.includes('.') && dureeString.split('.')[1].length > 2) ||
        (sentier.duree.minutes % 1 !== 0) ||
        (sentier.duree.heures % 1 !== 0) ||
        (sentier.duree.minutes >= 60) ||
        (sentier.duree.minutes < 0) ||
        (sentier.duree.heures < 0);
        
      if (hasProblems) {
        console.log(`⚠️  RESTE: ${sentier.nom} = ${dureeCalculee}h (${sentier.duree.heures}h${sentier.duree.minutes}m)`);
        problemesRestants++;
      }
    }

    console.log(`\n🔍 Vérification finale: ${problemesRestants} durées problématiques restantes`);
    
    if (problemesRestants === 0) {
      console.log('🎉 Toutes les durées sont maintenant propres et utilisent des entiers !');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixFinalDurees();