const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

// Liste manuelle des sentiers principaux de La Réunion depuis randopitons.re
const sentiersRandopitons = [
  // Cirque de Cilaos
  "Deux boucles de Bras Sec à Palmiste Rouge",
  "Le Sentier des Sources entre Cilaos et Bras Sec",
  "Le sommet du Piton Béthoune par le tour du Bonnet de Prêtre",
  "Le Dimitile depuis Bras Sec par le Kerveguen",
  "De la Mare à Joncs à Cilaos par le Kerveguen et le Gîte de la Caverne Dufour",
  "Une boucle par l'Îlet et la Ravine des Fleurs Jaunes",
  "De la route de l'Ilet à Cordes à l'Îlet Fleurs Jaunes",
  "Le Plateau de Kerval par le Taïbit depuis la route de l'Ilet à Cordes",
  "Le Col Choupette par le Taibit, Marla et le Plateau du Kerval",
  "L'Ilet des Salazes et le point de vue de Cap Bouteille",
  "La boucle de la Roche Merveilleuse depuis l'hôtel des Thermes de Cilaos.",
  "De Cilaos aux cascades des Anciens Thermes",
  "Une boucle à Cilaos par Bras Sec et la RF de la Roche Merveilleuse",
  "De la Mare à Joncs à la maison forestière de Bras Sec",
  
  // Cirque de Mafate
  "Le tour des trois îlets des Orangers depuis le Maïdo et retour",
  "Du Maïdo au Maïdo par l'Îlet et le Rempart des Orangers",
  "Du Maïdo à la Nouvelle par Roche Plate, le Bronchard et retour",
  "Cayenne par Grand-Place et le Sentier Dacerle depuis le Maïdo et retour",
  "Le tour du sommet du Bronchard depuis le Maïdo",
  "Îlet à Bourse par Roche Plate depuis le Maïdo",
  "Îlet à Malheur par Îlet à Bourse depuis le Maïdo",
  "Marla par Roche Plate depuis le Maïdo",
  
  // Cirque de Salazie
  "Le captage sur la Ravine José Lebeau par Mare d'Affouche et Trou Blanc",
  "De Hell Bourg au Bras de Caverne par l'ancien chemin de fer",
  "De l'Îlet à Vidot au sommet du Piton Tambour par le Grand Ilet",
  "De la Rivière du Mât et Sources Manouilh par Hell Bourg",
  "Du Piton d'Anchain par l'Îlet à Vidot et retour par Hell Bourg",
  
  // Est
  "Les cascades de la Grande Ravine de l'Eden par Belouve et la Plaine des Palmistes",
  "De la Ligne Bambou à l'Eden par Belouve",
  "De l'Eden au Grand Rein par Belouve",
  "13 bassins et 10 cascades de la Ravine Goyaves à Roche Maigre",
  "Le Bassin la Mer et le Bassin la Paix par Grand Galet",
  
  // Ouest
  "Le Maïdo par la Glacière de Marla",
  "Le Maïdo par le Cap Noir et la Petite France",
  "Le tour du Piton Maïdo",
  "Une boucle à la Petite France par le Cap Noir",
  "Le Bassin des Aigrettes par les Gorges de la Rivière des Galets",
  
  // Sud
  "Le sentier littoral de Vincendo au Tremblet par la pointe de la Table",
  "Entre-Deux par le Dimitile",
  "Le tour du Piton de l'Eau",
  "Du Tremblet à la Pointe de la Table par le littoral",
  
  // Nord
  "La Roche Écrite par la Plaine d'Affouches",
  "Le tour de la Plaine d'Affouches",
  "Le Piton des Neiges par Grand Ilet",
  "La Caverne Dufour par Hell Bourg"
];

const comparerAvecSiteOfficiel = async () => {
  try {
    console.log('🔍 Comparaison avec les sentiers du site officiel randopitons.re...');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // Récupérer les noms de l'API
    console.log('\n🗄️ Récupération des noms de l\'API...');
    const sentiersAPI = await Sentier.find({}, { nom: 1, _id: 0 });
    const nomsAPI = sentiersAPI.map(s => s.nom);
    console.log(`✅ ${nomsAPI.length} noms récupérés de l'API`);
    
    // Comparaison
    console.log('\n🔍 === COMPARAISON AVEC LE SITE OFFICIEL ===');
    console.log(`📄 Site randopitons.re: ${sentiersRandopitons.length} sentiers principaux`);
    console.log(`🗄️ API/Base de données: ${nomsAPI.length} sentiers`);
    
    // Correspondances exactes
    const correspondancesExactes = sentiersRandopitons.filter(nom => nomsAPI.includes(nom));
    console.log(`\n✅ Correspondances exactes (${correspondancesExactes.length}):`);
    correspondancesExactes.forEach(nom => console.log(`   ✓ "${nom}"`));
    
    // Sentiers du site absents de l'API
    const manquantsAPI = sentiersRandopitons.filter(nom => !nomsAPI.includes(nom));
    console.log(`\n❌ Sentiers du site ABSENTS de l'API (${manquantsAPI.length}):`);
    manquantsAPI.forEach(nom => console.log(`   ✗ "${nom}"`));
    
    // Recherche de correspondances approximatives pour les manquants
    console.log(`\n🔍 Recherche de correspondances approximatives...`);
    manquantsAPI.forEach(nomSite => {
      const motsClefs = nomSite.split(' ').filter(mot => mot.length > 3);
      const correspondancesApprox = nomsAPI.filter(nomAPI => {
        return motsClefs.some(mot => nomAPI.includes(mot));
      });
      
      if (correspondancesApprox.length > 0) {
        console.log(`\n🔍 "${nomSite}" pourrait correspondre à :`);
        correspondancesApprox.slice(0, 3).forEach(nom => console.log(`   ~ "${nom}"`));
      }
    });
    
    // Résumé
    const pourcentageCorrespondance = ((correspondancesExactes.length / sentiersRandopitons.length) * 100).toFixed(1);
    console.log('\n📊 === RÉSUMÉ ===');
    console.log(`📄 Sentiers principaux du site: ${sentiersRandopitons.length}`);
    console.log(`🗄️ Sentiers dans l'API: ${nomsAPI.length}`);
    console.log(`✅ Correspondances exactes: ${correspondancesExactes.length}`);
    console.log(`❌ Manquants dans l'API: ${manquantsAPI.length}`);
    console.log(`📈 Taux de correspondance: ${pourcentageCorrespondance}%`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Connexion MongoDB fermée');
  }
};

// Exécution
comparerAvecSiteOfficiel();