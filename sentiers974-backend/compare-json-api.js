const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const comparerJsonAvecAPI = async () => {
  try {
    console.log('🔍 Comparaison JSON officiel vs API...');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // Charger le JSON officiel
    const jsonPath = path.join(__dirname, 'sentiers-officiels.json');
    const sentiersOfficiels = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`📄 JSON officiel chargé: ${sentiersOfficiels.length} sentiers`);
    
    // Récupérer les données API
    const sentiersAPI = await Sentier.find({}, { nom: 1, difficulte: 1, _id: 0 });
    const nomsAPI = sentiersAPI.map(s => s.nom);
    console.log(`🗄️ API récupérée: ${nomsAPI.length} sentiers`);
    
    // === COMPARAISON ===
    console.log('\n🔍 === COMPARAISON DÉTAILLÉE ===');
    
    // 1. Correspondances exactes
    const correspondancesExactes = sentiersOfficiels.filter(sentier => 
      nomsAPI.includes(sentier.nom)
    );
    
    console.log(`\n✅ CORRESPONDANCES EXACTES (${correspondancesExactes.length}):`);
    correspondancesExactes.slice(0, 10).forEach(sentier => {
      console.log(`   ✓ "${sentier.nom}" (${sentier.difficulte}, ${sentier.distance}km)`);
    });
    if (correspondancesExactes.length > 10) {
      console.log(`   ... et ${correspondancesExactes.length - 10} autres`);
    }
    
    // 2. Manquants dans l'API
    const manquantsAPI = sentiersOfficiels.filter(sentier => 
      !nomsAPI.includes(sentier.nom)
    );
    
    console.log(`\n❌ MANQUANTS DANS L'API (${manquantsAPI.length}):`);
    manquantsAPI.slice(0, 10).forEach(sentier => {
      console.log(`   ✗ "${sentier.nom}" (${sentier.difficulte}, ${sentier.distance}km)`);
    });
    if (manquantsAPI.length > 10) {
      console.log(`   ... et ${manquantsAPI.length - 10} autres`);
    }
    
    // 3. Problème "Familiale" dans les noms
    const avecFamiliale = manquantsAPI.filter(sentier => 
      sentier.nom.includes('Familiale')
    );
    
    if (avecFamiliale.length > 0) {
      console.log(`\n⚠️ PROBLÈME "FAMILIALE" DÉTECTÉ (${avecFamiliale.length}):`);
      avecFamiliale.slice(0, 5).forEach(sentier => {
        const nomSansFamiliale = sentier.nom.replace('Familiale', '').trim();
        const existeDansAPI = nomsAPI.includes(nomSansFamiliale);
        console.log(`   "${sentier.nom}"`);
        console.log(`   → Sans "Familiale": "${nomSansFamiliale}" ${existeDansAPI ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);
      });
    }
    
    // 4. Analyse des difficultés
    console.log(`\n📊 ANALYSE DES DIFFICULTÉS:`);
    const difficultes = {};
    sentiersOfficiels.forEach(sentier => {
      difficultes[sentier.difficulte] = (difficultes[sentier.difficulte] || 0) + 1;
    });
    
    Object.entries(difficultes).forEach(([diff, count]) => {
      console.log(`   ${diff}: ${count} sentiers`);
    });
    
    // 5. Répartition par régions
    console.log(`\n🏔️ RÉPARTITION PAR RÉGIONS:`);
    const regions = {};
    sentiersOfficiels.forEach(sentier => {
      if (sentier.region) {
        regions[sentier.region] = (regions[sentier.region] || 0) + 1;
      }
    });
    
    Object.entries(regions).forEach(([region, count]) => {
      console.log(`   ${region}: ${count} sentiers`);
    });
    
    // === RÉSUMÉ FINAL ===
    const pourcentageCorrespondance = ((correspondancesExactes.length / sentiersOfficiels.length) * 100).toFixed(1);
    
    console.log('\n📊 === RÉSUMÉ FINAL ===');
    console.log(`📄 Document officiel (JSON): ${sentiersOfficiels.length} sentiers`);
    console.log(`🗄️ API/Base de données: ${nomsAPI.length} sentiers`);
    console.log(`✅ Correspondances exactes: ${correspondancesExactes.length}`);
    console.log(`❌ Manquants dans l'API: ${manquantsAPI.length}`);
    console.log(`📈 Taux de correspondance: ${pourcentageCorrespondance}%`);
    console.log(`⚠️ Problèmes "Familiale": ${avecFamiliale.length}`);
    
    if (pourcentageCorrespondance < 70) {
      console.log('\n🚨 RECOMMANDATIONS:');
      console.log('   1. Nettoyer les noms avec "Familiale" collé');
      console.log('   2. Vérifier les variations de noms');
      console.log('   3. Importer les sentiers manquants');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Connexion MongoDB fermée');
  }
};

// Exécution
comparerJsonAvecAPI();