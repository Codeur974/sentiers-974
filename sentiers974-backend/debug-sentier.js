const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function debugSentier() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connexion MongoDB établie');

    // Trouver le sentier spécifique
    const sentier = await Sentier.findOne({ randopitons_id: "1003" });
    
    if (sentier) {
      console.log('🔍 Sentier trouvé:');
      console.log('ID:', sentier._id);
      console.log('Nom:', sentier.nom);
      console.log('Durée brute:', sentier.duree);
      console.log('Durée calculée:', sentier.duree.heures + (sentier.duree.minutes / 60));
      
      // Corriger manuellement ce sentier
      console.log('\n🔧 Correction manuelle...');
      sentier.duree = { heures: 2, minutes: 30 }; // 2h30 comme sur Randopitons
      await sentier.save();
      console.log('✅ Sentier corrigé:', sentier.duree);
    } else {
      console.log('❌ Sentier non trouvé avec randopitons_id: 1003');
      
      // Chercher par nom
      const sentierParNom = await Sentier.findOne({ 
        nom: { $regex: "La boucle du Sentier de l'Eden", $options: 'i' } 
      });
      
      if (sentierParNom) {
        console.log('✅ Trouvé par nom:');
        console.log('ID:', sentierParNom._id);
        console.log('randopitons_id:', sentierParNom.randopitons_id);
        console.log('Durée brute:', sentierParNom.duree);
        console.log('Durée calculée:', sentierParNom.duree.heures + (sentierParNom.duree.minutes / 60));
        
        // Corriger ce sentier
        console.log('\n🔧 Correction manuelle...');
        sentierParNom.duree = { heures: 2, minutes: 30 };
        await sentierParNom.save();
        console.log('✅ Sentier corrigé:', sentierParNom.duree);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
  }
}

debugSentier();