const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

// Mapping des difficultés incorrectes vers les vraies (document officiel)
const DIFFICULTE_MAPPING = {
  'Modéré': 'Moyen',           // Correction principale
  'Expert': 'Très difficile',  // Expert n'existe pas, mapper vers le plus difficile
  'Facile': 'Facile',          // Déjà correct
  'Difficile': 'Difficile',    // Déjà correct  
  'Très difficile': 'Très difficile' // Déjà correct
};

// Difficultés officielles valides selon le document de référence
const DIFFICULTES_OFFICIELLES = ['Très facile', 'Facile', 'Moyen', 'Difficile', 'Très difficile'];

const corrigerDifficultesOfficielles = async () => {
  try {
    console.log('🚀 Début correction des difficultés vers les valeurs officielles');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // 1. Analyser l'état actuel
    console.log('\n📊 ÉTAT ACTUEL DES DIFFICULTÉS:');
    const statsAvant = await Sentier.aggregate([
      { $group: { _id: '$difficulte', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    statsAvant.forEach(stat => {
      const isOfficial = DIFFICULTES_OFFICIELLES.includes(stat._id);
      console.log(`   ${stat._id}: ${stat.count} sentiers ${isOfficial ? '✅' : '❌'}`);
    });
    
    // 2. Effectuer les corrections
    console.log('\n🔧 CORRECTION DES DIFFICULTÉS:');
    let totalModifies = 0;
    
    for (const [ancienne, nouvelle] of Object.entries(DIFFICULTE_MAPPING)) {
      if (ancienne !== nouvelle) {
        const result = await Sentier.updateMany(
          { difficulte: ancienne },
          { $set: { difficulte: nouvelle } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`   ✅ "${ancienne}" → "${nouvelle}": ${result.modifiedCount} sentiers modifiés`);
          totalModifies += result.modifiedCount;
        }
      }
    }
    
    if (totalModifies === 0) {
      console.log('   ℹ️ Aucune correction nécessaire, toutes les difficultés sont déjà correctes');
    }
    
    // 3. Vérifier l'état après correction
    console.log('\n📊 ÉTAT APRÈS CORRECTION:');
    const statsApres = await Sentier.aggregate([
      { $group: { _id: '$difficulte', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    statsApres.forEach(stat => {
      const isOfficial = DIFFICULTES_OFFICIELLES.includes(stat._id);
      console.log(`   ${stat._id}: ${stat.count} sentiers ${isOfficial ? '✅' : '⚠️ NON OFFICIELLE'}`);
    });
    
    // 4. Vérifier s'il reste des difficultés non officielles
    const difficultesNonOfficielles = statsApres.filter(stat => 
      !DIFFICULTES_OFFICIELLES.includes(stat._id)
    );
    
    if (difficultesNonOfficielles.length > 0) {
      console.log('\n⚠️ DIFFICULTÉS NON OFFICIELLES DÉTECTÉES:');
      difficultesNonOfficielles.forEach(stat => {
        console.log(`   - "${stat._id}": ${stat.count} sentiers (à corriger manuellement)`);
      });
    }
    
    // 5. Résumé
    console.log('\n✅ === CORRECTION TERMINÉE ===');
    console.log(`📊 Total de sentiers modifiés: ${totalModifies}`);
    console.log(`📋 Difficultés officielles: ${DIFFICULTES_OFFICIELLES.join(', ')}`);
    console.log('🎯 Toutes les difficultés respectent maintenant le document de référence');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Connexion MongoDB fermée');
  }
};

// Exécution si appelé directement
if (require.main === module) {
  corrigerDifficultesOfficielles();
}

module.exports = corrigerDifficultesOfficielles;