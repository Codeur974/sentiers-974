const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function searchMissingSentier() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Chercher le sentier manquant
    const searchText = 'La descente à la Chapelle par la Cascade de Bras Rouge depuis la Route de l\'Îlet à Cordes';
    
    console.log('🔍 Recherche exacte du sentier manquant...');
    console.log('Texte recherché:', searchText);
    
    let sentier = await Sentier.findOne({
      nom: { $regex: new RegExp('^' + searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
    });
    
    if (sentier) {
      console.log('✅ Trouvé exactement:', sentier.nom);
      console.log('   Région:', sentier.region);
      console.log('   Zone spécifique:', sentier.zone_specifique);
      return;
    }
    
    console.log('❌ Pas trouvé exactement, recherche partielle...');
    
    // Recherche partielle avec mots-clés
    const keywords = ['descente', 'Chapelle', 'Cascade', 'Bras Rouge', 'Route', 'Îlet à Cordes'];
    
    for (const keyword of keywords) {
      console.log('\n🔍 Recherche avec mot-clé:', keyword);
      const sentiers = await Sentier.find({
        nom: { $regex: new RegExp(keyword, 'i') }
      }).select('nom region zone_specifique').limit(5);
      
      if (sentiers.length > 0) {
        sentiers.forEach(s => {
          console.log('  - ' + s.nom + ' (région: ' + s.region + ', zone: ' + (s.zone_specifique || 'non définie') + ')');
        });
      } else {
        console.log('  Aucun résultat');
      }
    }
    
    // Recherche spéciale pour "la Chapelle" + "Bras Rouge"
    console.log('\n🔍 Recherche combinée "Chapelle" ET "Bras Rouge"...');
    const sentiersCombo = await Sentier.find({
      $and: [
        { nom: { $regex: new RegExp('Chapelle', 'i') } },
        { nom: { $regex: new RegExp('Bras Rouge', 'i') } }
      ]
    }).select('nom region zone_specifique');
    
    if (sentiersCombo.length > 0) {
      sentiersCombo.forEach(s => {
        console.log('  - ' + s.nom + ' (région: ' + s.region + ', zone: ' + (s.zone_specifique || 'non définie') + ')');
      });
    } else {
      console.log('  Aucun résultat');
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

searchMissingSentier();