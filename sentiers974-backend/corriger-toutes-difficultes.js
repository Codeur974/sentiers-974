const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const corrigerToutesDifficultes = async () => {
  try {
    console.log('🔧 Correction COMPLÈTE des difficultés selon le document officiel...');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // Charger le JSON du document officiel
    const jsonPath = path.join(__dirname, 'sentiers-officiels.json');
    const sentiersOfficiels = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`📄 Document chargé: ${sentiersOfficiels.length} sentiers`);
    
    // Récupérer TOUS les sentiers de l'API
    const sentiersAPI = await Sentier.find({});
    console.log(`🗄️ API récupérée: ${sentiersAPI.length} sentiers`);
    
    console.log('\n🔍 === IDENTIFICATION DES CORRECTIONS ===');
    
    let corrections = 0;
    let erreurs = 0;
    const correctionsAEffectuer = [];
    
    // Identifier toutes les corrections nécessaires
    sentiersOfficiels.forEach(sentierDoc => {
      const sentierAPI = sentiersAPI.find(s => s.nom === sentierDoc.nom);
      
      if (sentierAPI && sentierAPI.difficulte !== sentierDoc.difficulte) {
        correctionsAEffectuer.push({
          id: sentierAPI._id,
          nom: sentierDoc.nom,
          ancienneDifficulte: sentierAPI.difficulte,
          nouvelleDifficulte: sentierDoc.difficulte
        });
      }
    });
    
    console.log(`📊 ${correctionsAEffectuer.length} corrections identifiées`);
    
    if (correctionsAEffectuer.length === 0) {
      console.log('✅ Aucune correction nécessaire !');
      return;
    }
    
    // Afficher quelques exemples
    console.log('\n📋 Exemples de corrections à effectuer:');
    correctionsAEffectuer.slice(0, 10).forEach((correction, index) => {
      console.log(`${index + 1}. "${correction.nom}"`);
      console.log(`   ${correction.ancienneDifficulte} → ${correction.nouvelleDifficulte}`);
    });
    
    console.log(`\n🚀 Début des corrections...`);
    
    // Effectuer toutes les corrections
    for (let i = 0; i < correctionsAEffectuer.length; i++) {
      const correction = correctionsAEffectuer[i];
      
      try {
        await Sentier.findByIdAndUpdate(
          correction.id,
          { difficulte: correction.nouvelleDifficulte }
        );
        
        corrections++;
        
        if (corrections % 20 === 0) {
          console.log(`✅ ${corrections} corrections effectuées...`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur correction "${correction.nom}":`, error.message);
        erreurs++;
      }
    }
    
    console.log(`\n📊 === RÉSULTAT CORRECTIONS ===`);
    console.log(`✅ ${corrections} difficultés corrigées avec succès`);
    console.log(`❌ ${erreurs} erreurs rencontrées`);
    
    // Vérification finale
    console.log('\n🔍 === VÉRIFICATION FINALE ===');
    const sentiersAPIMisAJour = await Sentier.find({}, { nom: 1, difficulte: 1, _id: 0 });
    
    let correspondancesFinales = 0;
    let differencesFinales = 0;
    
    sentiersOfficiels.forEach(sentierDoc => {
      const sentierAPI = sentiersAPIMisAJour.find(s => s.nom === sentierDoc.nom);
      
      if (sentierAPI) {
        if (sentierAPI.difficulte === sentierDoc.difficulte) {
          correspondancesFinales++;
        } else {
          differencesFinales++;
        }
      }
    });
    
    console.log(`✅ Correspondances finales: ${correspondancesFinales}`);
    console.log(`❌ Différences restantes: ${differencesFinales}`);
    
    if (differencesFinales === 0) {
      console.log('\n🎉 SUCCÈS TOTAL ! Toutes les difficultés correspondent au document officiel !');
    } else {
      console.log(`\n⚠️ Il reste ${differencesFinales} différences à examiner manuellement`);
    }
    
    // Statistiques finales des difficultés
    console.log('\n📊 === RÉPARTITION FINALE DES DIFFICULTÉS ===');
    const statsFinales = await Sentier.aggregate([
      { $group: { _id: '$difficulte', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    statsFinales.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} sentiers`);
    });
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Connexion MongoDB fermée');
  }
};

// Exécution
corrigerToutesDifficultes();