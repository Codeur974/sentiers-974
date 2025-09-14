const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const auditCompletDonnees = async () => {
  try {
    console.log('🔍 AUDIT COMPLET des données API vs Site officiel...');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // Charger les données du site officiel (API cachée)
    const siteOfficielPath = path.join(__dirname, 'sentiers-api-suggestions.json');
    const sentiersSiteOfficiel = JSON.parse(fs.readFileSync(siteOfficielPath, 'utf-8'));
    console.log(`📄 Site officiel: ${sentiersSiteOfficiel.length} sentiers`);
    
    // Récupérer toutes les données de votre API
    const sentiersVotreAPI = await Sentier.find({});
    console.log(`🗄️ Votre API: ${sentiersVotreAPI.length} sentiers`);
    
    console.log('\n🔍 === ANALYSE DÉTAILLÉE ===');
    
    // 1. SENTIERS DANS VOTRE API MAIS PAS SUR LE SITE OFFICIEL
    console.log('\n❌ === SENTIERS EN TROP DANS VOTRE API ===');
    const nomsSiteOfficiel = sentiersSiteOfficiel.map(s => s.nom);
    const sentiersEnTrop = sentiersVotreAPI.filter(sentier => 
      !nomsSiteOfficiel.includes(sentier.nom)
    );
    
    console.log(`📊 ${sentiersEnTrop.length} sentiers en trop dans votre API:`);
    sentiersEnTrop.slice(0, 15).forEach((sentier, index) => {
      console.log(`${index + 1}. "${sentier.nom}"`);
      console.log(`   Source: ${sentier.source || 'Inconnue'}`);
      console.log(`   Région: ${sentier.region}`);
    });
    if (sentiersEnTrop.length > 15) {
      console.log(`   ... et ${sentiersEnTrop.length - 15} autres`);
    }
    
    // 2. SENTIERS SUR LE SITE OFFICIEL MAIS PAS DANS VOTRE API
    console.log('\n❌ === SENTIERS MANQUANTS DANS VOTRE API ===');
    const nomsVotreAPI = sentiersVotreAPI.map(s => s.nom);
    const sentiersManquants = sentiersSiteOfficiel.filter(sentier => 
      !nomsVotreAPI.includes(sentier.nom)
    );
    
    console.log(`📊 ${sentiersManquants.length} sentiers manquants dans votre API:`);
    sentiersManquants.slice(0, 15).forEach((sentier, index) => {
      console.log(`${index + 1}. "${sentier.nom}"`);
      console.log(`   Région officielle: ${sentier.region}`);
      console.log(`   URL: ${sentier.url}`);
    });
    if (sentiersManquants.length > 15) {
      console.log(`   ... et ${sentiersManquants.length - 15} autres`);
    }
    
    // 3. CORRESPONDANCES EXACTES
    const correspondancesExactes = sentiersVotreAPI.filter(sentier => 
      nomsSiteOfficiel.includes(sentier.nom)
    );
    console.log(`\n✅ ${correspondancesExactes.length} correspondances exactes`);
    
    // 4. ANALYSE DES SOURCES DE VOS DONNÉES
    console.log('\n📊 === ANALYSE DES SOURCES DANS VOTRE API ===');
    const sourceStats = {};
    sentiersVotreAPI.forEach(sentier => {
      const source = sentier.source || 'Inconnue';
      sourceStats[source] = (sourceStats[source] || 0) + 1;
    });
    
    Object.entries(sourceStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count} sentiers`);
      });
    
    // 5. ANALYSE DES RÉGIONS - COMPARAISON
    console.log('\n🏔️ === COMPARAISON DES RÉGIONS ===');
    
    console.log('\nRépartition VOTRE API:');
    const regionsVotreAPI = {};
    sentiersVotreAPI.forEach(sentier => {
      const region = sentier.region || 'Non définie';
      regionsVotreAPI[region] = (regionsVotreAPI[region] || 0) + 1;
    });
    Object.entries(regionsVotreAPI)
      .sort(([,a], [,b]) => b - a)
      .forEach(([region, count]) => {
        console.log(`   ${region}: ${count} sentiers`);
      });
    
    console.log('\nRépartition SITE OFFICIEL:');
    const regionsSiteOfficiel = {};
    sentiersSiteOfficiel.forEach(sentier => {
      const region = sentier.region || 'Non définie';
      regionsSiteOfficiel[region] = (regionsSiteOfficiel[region] || 0) + 1;
    });
    Object.entries(regionsSiteOfficiel)
      .sort(([,a], [,b]) => b - a)
      .forEach(([region, count]) => {
        console.log(`   ${region}: ${count} sentiers`);
      });
    
    // 6. SENTIERS SUSPECTS (noms très différents du style officiel)
    console.log('\n⚠️ === SENTIERS SUSPECTS DANS VOTRE API ===');
    const sentiersSuspects = sentiersVotreAPI.filter(sentier => {
      const nom = sentier.nom;
      return (
        nom.includes('VTT ') || // VTT format différent
        nom.match(/^\d+\./) || // Commence par un numéro
        nom.length < 10 || // Trop court
        nom.length > 100 || // Trop long
        !nom.includes(' ') // Pas d'espaces
      );
    });
    
    console.log(`📊 ${sentiersSuspects.length} sentiers suspects trouvés:`);
    sentiersSuspects.slice(0, 10).forEach((sentier, index) => {
      console.log(`${index + 1}. "${sentier.nom}"`);
      console.log(`   Raison: Format atypique`);
    });
    if (sentiersSuspects.length > 10) {
      console.log(`   ... et ${sentiersSuspects.length - 10} autres`);
    }
    
    // 7. RÉSUMÉ FINAL ET RECOMMANDATIONS
    console.log('\n📊 === RÉSUMÉ AUDIT ===');
    console.log(`📄 Site officiel randopitons.re: ${sentiersSiteOfficiel.length} sentiers`);
    console.log(`🗄️ Votre API actuelle: ${sentiersVotreAPI.length} sentiers`);
    console.log(`✅ Correspondances exactes: ${correspondancesExactes.length}`);
    console.log(`❌ Sentiers en trop: ${sentiersEnTrop.length}`);
    console.log(`❌ Sentiers manquants: ${sentiersManquants.length}`);
    console.log(`⚠️ Sentiers suspects: ${sentiersSuspects.length}`);
    
    const tauxFiabilite = ((correspondancesExactes.length / Math.max(sentiersSiteOfficiel.length, sentiersVotreAPI.length)) * 100).toFixed(1);
    console.log(`📈 Taux de fiabilité: ${tauxFiabilite}%`);
    
    console.log('\n🚨 === RECOMMANDATIONS URGENTES ===');
    
    if (sentiersEnTrop.length > 100) {
      console.log('1. ❌ CRITIQUE: Vous avez trop de sentiers non officiels');
    }
    
    if (sentiersManquants.length > 100) {
      console.log('2. ❌ CRITIQUE: Il manque de nombreux sentiers officiels');
    }
    
    if (parseFloat(tauxFiabilite) < 80) {
      console.log('3. 🚨 URGENT: Taux de fiabilité trop bas pour un lancement');
    }
    
    if (sentiersSuspects.length > 50) {
      console.log('4. ⚠️ ATTENTION: Beaucoup de sentiers au format suspect');
    }
    
    // Sauvegarder le rapport
    const rapport = {
      date: new Date().toISOString(),
      siteOfficiel: sentiersSiteOfficiel.length,
      votreAPI: sentiersVotreAPI.length,
      correspondances: correspondancesExactes.length,
      enTrop: sentiersEnTrop.length,
      manquants: sentiersManquants.length,
      suspects: sentiersSuspects.length,
      tauxFiabilite: parseFloat(tauxFiabilite),
      sentiersEnTrop: sentiersEnTrop.map(s => ({ nom: s.nom, source: s.source, region: s.region })),
      sentiersManquants: sentiersManquants.map(s => ({ nom: s.nom, region: s.region, url: s.url })),
      sentiersSuspects: sentiersSuspects.map(s => ({ nom: s.nom, source: s.source }))
    };
    
    const rapportPath = path.join(__dirname, 'rapport-audit-donnees.json');
    fs.writeFileSync(rapportPath, JSON.stringify(rapport, null, 2), 'utf-8');
    console.log(`\n💾 Rapport détaillé sauvegardé: ${rapportPath}`);
    
  } catch (error) {
    console.error('❌ Erreur audit:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Connexion MongoDB fermée');
  }
};

// Exécution
auditCompletDonnees();