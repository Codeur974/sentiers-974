const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function fixDecimalMinutes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connexion MongoDB établie');

    // Trouver tous les sentiers avec des minutes décimales (non entières)
    const tousSentiers = await Sentier.find({});
    console.log(`📊 ${tousSentiers.length} sentiers à analyser`);

    let corrected = 0;

    for (const sentier of tousSentiers) {
      // Vérifier si les minutes ou heures ne sont pas des entiers
      const minutesDecimales = sentier.duree.minutes % 1 !== 0;
      const heuresDecimales = sentier.duree.heures % 1 !== 0;
      
      if (minutesDecimales || heuresDecimales) {
        const dureeCalculee = sentier.duree.heures + (sentier.duree.minutes / 60);
        
        console.log(`⚠️  ${sentier.nom}`);
        console.log(`   Durée avec décimales: ${sentier.duree.heures}h${sentier.duree.minutes}m = ${dureeCalculee}h`);
        
        // Arrondir à des nombres entiers
        const nouvellesHeures = Math.floor(dureeCalculee);
        const nouvellesMinutes = Math.round((dureeCalculee - nouvellesHeures) * 60);
        
        // Gérer le cas où les minutes arrondies donnent 60
        let heuresFinales = nouvellesHeures;
        let minutesFinales = nouvellesMinutes;
        
        if (minutesFinales >= 60) {
          heuresFinales += Math.floor(minutesFinales / 60);
          minutesFinales = minutesFinales % 60;
        }
        
        sentier.duree = { 
          heures: heuresFinales, 
          minutes: minutesFinales 
        };
        
        await sentier.save();
        
        console.log(`   ✅ Corrigé: ${heuresFinales}h${minutesFinales > 0 ? (minutesFinales < 10 ? '0' : '') + minutesFinales : ''}`);
        corrected++;
      }
    }

    console.log(`\n🎯 ${corrected} durées avec décimales corrigées sur ${tousSentiers.length} sentiers`);

    // Vérification finale - chercher des durées qui donnent des décimales bizarres
    const verification = await Sentier.find({});
    let problemesRestants = 0;
    
    for (const sentier of verification) {
      const dureeCalculee = sentier.duree.heures + (sentier.duree.minutes / 60);
      const dureeString = dureeCalculee.toString();
      
      // Si la durée a plus de 2 décimales
      if (dureeString.includes('.') && dureeString.split('.')[1].length > 2) {
        console.log(`⚠️  Reste: ${sentier.nom} = ${dureeCalculee}h`);
        problemesRestants++;
      }
    }

    console.log(`\n🔍 Vérification: ${problemesRestants} durées avec décimales bizarres restantes`);
    
    if (problemesRestants === 0) {
      console.log('🎉 Toutes les durées ont maintenant des valeurs propres !');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixDecimalMinutes();