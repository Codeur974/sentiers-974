const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');

// Configuration MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/randopitons';

/**
 * Nettoie et récupère les points d'intérêt valides de manière plus intelligente
 */
function restaurerPointsInteret(pointsInteret) {
  if (!pointsInteret || !Array.isArray(pointsInteret)) {
    return [];
  }

  // Nettoyer chaque point d'intérêt avec plus de tolérance
  const pointsNettoyes = pointsInteret
    .map(poi => {
      let nomPoi = '';
      
      // Extraire le nom selon la structure (objet ou string)
      if (typeof poi === 'object' && poi.nom) {
        nomPoi = poi.nom;
      } else if (typeof poi === 'string') {
        nomPoi = poi;
      } else {
        return null;
      }
      
      if (!nomPoi) return null;

      // Nettoyer le texte de base
      let poiClean = nomPoi
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\t/g, '')
        .trim();

      // Ignorer les entrées trop courtes
      if (poiClean.length < 4) return null;
      
      // Nettoyer les fragments tronqués mais garder les bons
      // Supprimer seulement les fins vraiment incomplètes
      if (poiClean.match(/\s(qu|sur les \d|pr|et le contourner jusqu|depuis|pour|vers|de l|du|des|en|le|la)$/i)) {
        const mots = poiClean.split(' ');
        if (mots.length > 3) {
          // Essayer de garder la partie significative
          const partie = mots.slice(0, -1).join(' ');
          if (partie.length >= 8) {
            poiClean = partie;
          } else {
            return null;
          }
        } else {
          return null;
        }
      }

      // Garder seulement les points d'intérêt qui semblent être des lieux ou éléments géographiques
      const motsCles = [
        'piton', 'cascade', 'bassin', 'col', 'sommet', 'roche', 'source', 'ravine', 
        'bras', 'forêt', 'plateau', 'crête', 'point de vue', 'gîte', 'refuge',
        'mare', 'étang', 'cirque', 'rempart', 'îlet', 'kerveguen', 'dimitile',
        'belvedere', 'calvaire', 'chapelle', 'thermal', 'chute'
      ];
      
      const contientMotCle = motsCles.some(mot => 
        poiClean.toLowerCase().includes(mot.toLowerCase())
      );
      
      if (!contientMotCle) {
        // Si pas de mot clé géographique, on garde quand même si c'est assez long et bien formé
        if (poiClean.length < 10 || poiClean.includes('qu') || poiClean.includes('pr')) {
          return null;
        }
      }

      // Capitaliser correctement
      poiClean = poiClean.split(' ')
        .map(mot => mot.charAt(0).toUpperCase() + mot.slice(1).toLowerCase())
        .join(' ');
      
      // Retourner un objet au bon format
      return {
        nom: poiClean,
        description: '',
        coordonnees: {},
        photos: []
      };
    })
    .filter(poi => poi && poi.nom && poi.nom.length >= 4);

  // Supprimer les doublons intelligemment
  const pointsUniques = [];
  const seen = new Set();

  for (const poi of pointsNettoyes) {
    // Normaliser pour détecter les similitudes
    const normalise = poi.nom.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    // Vérifier les similitudes exactes
    if (seen.has(normalise)) {
      continue;
    }
    
    // Vérifier les similitudes partielles (éviter "Piton Rouge" et "Piton Rouge qu")
    let estSimilaire = false;
    for (const dejaNormalise of seen) {
      if (normalise.length > 8 && dejaNormalise.length > 8) {
        // Si l'un contient l'autre et ils sont assez longs
        if (normalise.includes(dejaNormalise) || dejaNormalise.includes(normalise)) {
          estSimilaire = true;
          break;
        }
      }
    }
    
    if (!estSimilaire) {
      pointsUniques.push(poi);
      seen.add(normalise);
    }
  }

  // Limiter à 5 points d'intérêt les plus pertinents
  return pointsUniques.slice(0, 5);
}

/**
 * Script principal pour restaurer les points d'intérêt valides
 */
async function restaurerTousLesPointsInteret() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');

    console.log('🔍 Récupération des sentiers avec raw_data...');
    // Chercher les données originales dans raw_data
    const sentiers = await Sentier.find({ 'raw_data.points_interet': { $exists: true, $ne: null } });
    console.log(`📊 ${sentiers.length} sentiers avec données raw trouvés`);

    let compteur = 0;
    let modifies = 0;

    for (const sentier of sentiers) {
      compteur++;
      
      // Récupérer les points d'intérêt originaux depuis raw_data
      const pointsOriginaux = sentier.raw_data?.points_interet || [];
      const nouveauxPoints = restaurerPointsInteret(pointsOriginaux);

      if (nouveauxPoints.length > 0) {
        console.log(`\n🎯 Sentier ${compteur}/${sentiers.length}: ${sentier.nom}`);
        console.log(`   Points restaurés (${nouveauxPoints.length}): ${JSON.stringify(nouveauxPoints)}`);

        // Mettre à jour en base
        await Sentier.updateOne(
          { randopitons_id: sentier.randopitons_id },
          { $set: { points_interet: nouveauxPoints } }
        );
        
        modifies++;
      } else if (compteur % 50 === 0) {
        console.log(`⚪ Sentier ${compteur}/${sentiers.length}: ${sentier.nom} - Pas de points valides`);
      }
    }

    // Traiter aussi les sentiers sans raw_data mais en générant des points génériques
    console.log('\n🔍 Traitement des sentiers sans raw_data...');
    const sentiersRestants = await Sentier.find({ 
      points_interet: { $size: 0 },
      'raw_data.points_interet': { $exists: false }
    });
    
    console.log(`📊 ${sentiersRestants.length} sentiers sans points trouvés`);
    
    for (const sentier of sentiersRestants.slice(0, 100)) { // Limiter pour test
      const pointsGeneriques = genererPointsGeneriques(sentier);
      if (pointsGeneriques.length > 0) {
        await Sentier.updateOne(
          { randopitons_id: sentier.randopitons_id },
          { $set: { points_interet: pointsGeneriques } }
        );
        modifies++;
      }
    }

    console.log(`\n🎉 Restauration des points d'intérêt terminée !`);
    console.log(`   📊 ${compteur} sentiers avec raw_data traités`);
    console.log(`   🔧 ${modifies} listes de points restaurées`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

/**
 * Génère des points d'intérêt génériques basés sur les infos du sentier
 */
function genererPointsGeneriques(sentier) {
  const points = [];
  
  // Ajouter le point de départ s'il est intéressant
  if (sentier.point_depart?.nom && sentier.point_depart.nom !== 'Point de départ') {
    points.push({
      nom: sentier.point_depart.nom,
      description: 'Point de départ du sentier',
      coordonnees: {},
      photos: []
    });
  }
  
  // Ajouter des points basés sur la région
  const pointsRegion = {
    'Cirque de Cilaos': ['Vue sur le cirque', 'Remparts de Cilaos'],
    'Cirque de Mafate': ['Panorama sur Mafate', 'Îlets de Mafate'],  
    'Cirque de Salazie': ['Vue sur Salazie', 'Remparts de Salazie'],
    'Volcan': ['Paysage volcanique', 'Coulées de lave'],
    'Est': ['Forêt tropicale', 'Végétation luxuriante'],
    'Ouest': ['Vue océan', 'Côte ouest'],
    'Nord': ['Hauts de l\'île'],
    'Sud': ['Sud sauvage']
  };
  
  if (sentier.region && pointsRegion[sentier.region]) {
    pointsRegion[sentier.region].slice(0, 2).forEach(nom => {
      points.push({
        nom,
        description: '',
        coordonnees: {},
        photos: []
      });
    });
  }
  
  // Ajouter des points basés sur la difficulté/type
  if (sentier.altitude_max && sentier.altitude_max > 2000) {
    points.push({
      nom: 'Panorama haute altitude',
      description: '',
      coordonnees: {},
      photos: []
    });
  }
  
  if (sentier.denivele_positif > 1000) {
    points.push({
      nom: 'Vue panoramique',
      description: '',
      coordonnees: {},
      photos: []
    });
  }
  
  return points.slice(0, 3); // Maximum 3 points génériques
}

// Exécuter le script si appelé directement
if (require.main === module) {
  restaurerTousLesPointsInteret();
}

module.exports = { restaurerPointsInteret };