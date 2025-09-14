const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const verifierDifficultesReelles = async () => {
  try {
    console.log('🔍 Vérification RÉELLE des difficultés API vs Document .md');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // Charger le JSON du document officiel
    const jsonPath = path.join(__dirname, 'sentiers-officiels.json');
    const sentiersOfficiels = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`📄 Document chargé: ${sentiersOfficiels.length} sentiers`);
    
    // Récupérer TOUS les sentiers de l'API avec nom et difficulté
    const sentiersAPI = await Sentier.find({}, { nom: 1, difficulte: 1, _id: 0 });
    console.log(`🗄️ API récupérée: ${sentiersAPI.length} sentiers`);
    
    console.log('\n🔍 === COMPARAISON DIFFICULTÉS ===');
    
    let differences = 0;
    let correspondances = 0;
    const erreurs = [];
    
    // Pour chaque sentier du document, vérifier la difficulté dans l'API
    sentiersOfficiels.forEach(sentierDoc => {
      const sentierAPI = sentiersAPI.find(s => s.nom === sentierDoc.nom);
      
      if (sentierAPI) {
        if (sentierAPI.difficulte === sentierDoc.difficulte) {
          correspondances++;
        } else {
          differences++;
          erreurs.push({
            nom: sentierDoc.nom,
            documentMD: sentierDoc.difficulte,
            api: sentierAPI.difficulte
          });
        }
      }
    });
    
    console.log(`\n📊 RÉSULTATS:`);
    console.log(`✅ Correspondances: ${correspondances}`);
    console.log(`❌ Différences: ${differences}`);
    
    if (differences > 0) {
      console.log(`\n❌ === ${differences} DIFFICULTÉS INCORRECTES ===`);
      erreurs.slice(0, 20).forEach((erreur, index) => {
        console.log(`${index + 1}. "${erreur.nom}"`);
        console.log(`   Document .md: "${erreur.documentMD}"`);
        console.log(`   API actuelle: "${erreur.api}"`);
        console.log('');
      });
      
      if (erreurs.length > 20) {
        console.log(`   ... et ${erreurs.length - 20} autres différences`);
      }
      
      // Statistiques des erreurs
      console.log('\n📊 TYPES D\'ERREURS:');
      const typesErreurs = {};
      erreurs.forEach(erreur => {
        const cle = `"${erreur.api}" → "${erreur.documentMD}"`;
        typesErreurs[cle] = (typesErreurs[cle] || 0) + 1;
      });
      
      Object.entries(typesErreurs).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} sentiers`);
      });
    } else {
      console.log('✅ Toutes les difficultés correspondent parfaitement !');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Connexion MongoDB fermée');
  }
};

// Exécution
verifierDifficultesReelles();