const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function fixMissingSentier() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    // Trouver et corriger le sentier manquant
    const sentierPattern = 'La descente à la Chapelle par la Cascade de Bras Rouge depuis.*la Route de l\'Îlet à Cordes';
    
    console.log('🔍 Recherche du sentier à corriger...');
    const sentier = await Sentier.findOne({
      nom: { $regex: new RegExp(sentierPattern, 'i') }
    });
    
    if (sentier) {
      console.log('✅ Sentier trouvé:', sentier.nom);
      console.log('   ID:', sentier._id);
      console.log('   Région actuelle:', sentier.region);
      console.log('   Zone spécifique actuelle:', sentier.zone_specifique || 'NON DÉFINIE');
      
      // Mettre à jour la zone spécifique
      const result = await Sentier.findByIdAndUpdate(sentier._id, {
        zone_specifique: 'Depuis la ville de Cilaos'
      }, { new: true });
      
      console.log('\\n🔧 Correction effectuée:');
      console.log('   ✅ Zone spécifique mise à jour:', result.zone_specifique);
      
      // Vérifier le nombre final
      console.log('\\n📊 Vérification finale...');
      const count = await Sentier.countDocuments({
        zone_specifique: 'Depuis la ville de Cilaos'
      });
      
      console.log(`✅ Nombre total de sentiers dans "Depuis la ville de Cilaos": ${count}`);
      
    } else {
      console.log('❌ Sentier non trouvé !');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixMissingSentier();