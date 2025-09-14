const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const parseDocumentOfficiel = require('./parse-document-officiel');
require('dotenv').config();

const comparerSentiers = async () => {
  try {
    console.log('🔍 Comparaison des noms de sentiers...');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // 1. Récupérer les noms du document officiel
    console.log('\n📄 Extraction des noms du document officiel...');
    const sentiersDocument = parseDocumentOfficiel();
    const nomsDocument = sentiersDocument.map(s => s.nom);
    console.log(`✅ ${nomsDocument.length} noms extraits du document`);
    
    // 2. Récupérer les noms de l'API
    console.log('\n🗄️ Récupération des noms de l\'API...');
    const sentiersAPI = await Sentier.find({}, { nom: 1, _id: 0 });
    const nomsAPI = sentiersAPI.map(s => s.nom);
    console.log(`✅ ${nomsAPI.length} noms récupérés de l'API`);
    
    // 3. Comparaison
    console.log('\n🔍 === COMPARAISON ===');
    
    // Noms qui sont dans le document mais pas dans l'API
    const manquantsAPI = nomsDocument.filter(nom => !nomsAPI.includes(nom));
    console.log(`\n❌ Sentiers du document ABSENTS de l'API (${manquantsAPI.length}):`);
    manquantsAPI.slice(0, 10).forEach(nom => console.log(`   - "${nom}"`));
    if (manquantsAPI.length > 10) {
      console.log(`   ... et ${manquantsAPI.length - 10} autres`);
    }
    
    // Noms qui sont dans l'API mais pas dans le document
    const manquantsDocument = nomsAPI.filter(nom => !nomsDocument.includes(nom));
    console.log(`\n⚠️ Sentiers de l'API ABSENTS du document (${manquantsDocument.length}):`);
    manquantsDocument.slice(0, 10).forEach(nom => console.log(`   - "${nom}"`));
    if (manquantsDocument.length > 10) {
      console.log(`   ... et ${manquantsDocument.length - 10} autres`);
    }
    
    // Noms qui correspondent exactement
    const correspondances = nomsDocument.filter(nom => nomsAPI.includes(nom));
    console.log(`\n✅ Correspondances exactes (${correspondances.length}):`);
    correspondances.slice(0, 5).forEach(nom => console.log(`   - "${nom}"`));
    if (correspondances.length > 5) {
      console.log(`   ... et ${correspondances.length - 5} autres`);
    }
    
    // 4. Résumé
    console.log('\n📊 === RÉSUMÉ ===');
    console.log(`📄 Document officiel: ${nomsDocument.length} sentiers`);
    console.log(`🗄️ API/Base de données: ${nomsAPI.length} sentiers`);
    console.log(`✅ Correspondances exactes: ${correspondances.length}`);
    console.log(`❌ Manquants dans l'API: ${manquantsAPI.length}`);
    console.log(`⚠️ Manquants dans le document: ${manquantsDocument.length}`);
    
    const pourcentageCorrespondance = ((correspondances.length / Math.max(nomsDocument.length, nomsAPI.length)) * 100).toFixed(1);
    console.log(`📈 Taux de correspondance: ${pourcentageCorrespondance}%`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Connexion MongoDB fermée');
  }
};

// Exécution
comparerSentiers();