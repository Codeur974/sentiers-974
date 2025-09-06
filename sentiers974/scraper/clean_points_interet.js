const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');

// Configuration MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/randopitons';

/**
 * Nettoie et déduplique les points d'intérêt
 */
function nettoyerPointsInteret(pointsInteret) {
  if (!pointsInteret || !Array.isArray(pointsInteret)) {
    return [];
  }

  // Nettoyer chaque point d'intérêt
  const pointsNettoyes = pointsInteret
    .map(poi => {
      if (!poi || typeof poi !== 'string') return null;
      
      // Nettoyer le texte
      let poiClean = poi
        .replace(/\n/g, ' ') // Supprimer les retours à la ligne
        .replace(/\s+/g, ' ') // Remplacer espaces multiples par un seul
        .replace(/^\s+|\s+$/g, '') // Trim
        .replace(/\t/g, '') // Supprimer les tabulations
        .replace(/[^\w\s-àâäéèêëïîôöùûüÿç']/gi, '') // Garder seulement lettres, espaces, tirets et accents
        .trim();

      // Ignorer les entrées trop courtes ou vides
      if (poiClean.length < 3) return null;
      
      // Ignorer les fragments tronqués (se terminent bizarrement)
      if (poiClean.match(/\s(qu|sur|les|de|du|des|en|et|le|la|pour)$/i)) {
        // Essayer de nettoyer en gardant le début
        const mots = poiClean.split(' ');
        if (mots.length > 2) {
          // Garder seulement les premiers mots significatifs
          poiClean = mots.slice(0, -1).join(' ');
        } else {
          return null; // Trop court après nettoyage
        }
      }

      // Capitaliser correctement
      poiClean = poiClean.charAt(0).toUpperCase() + poiClean.slice(1).toLowerCase();
      
      return poiClean;
    })
    .filter(poi => poi && poi.length >= 3); // Filtrer les nulls et textes trop courts

  // Supprimer les doublons et similitudes
  const pointsUniques = [];
  const vus = new Set();

  for (const poi of pointsNettoyes) {
    const poiNormalise = poi.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Garder seulement lettres et chiffres pour comparaison
      .substring(0, 15); // Comparer seulement les 15 premiers caractères
    
    // Vérifier si on a déjà un point similaire
    let dejaSimilaire = false;
    for (const dejaNormalise of vus) {
      if (poiNormalise.includes(dejaNormalise) || dejaNormalise.includes(poiNormalise)) {
        dejaSimilaire = true;
        break;
      }
    }

    if (!dejaSimilaire && !vus.has(poiNormalise)) {
      pointsUniques.push(poi);
      vus.add(poiNormalise);
    }
  }

  // Limiter à 8 points d'intérêt maximum
  return pointsUniques.slice(0, 8);
}

/**
 * Script principal pour nettoyer tous les points d'intérêt
 */
async function nettoyerTousLesPointsInteret() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');

    console.log('🔍 Récupération des sentiers...');
    const sentiers = await Sentier.find({});
    console.log(`📊 ${sentiers.length} sentiers trouvés`);

    let compteur = 0;
    let modifies = 0;

    for (const sentier of sentiers) {
      compteur++;
      
      const anciensPoints = sentier.points_interet || [];
      const nouveauxPoints = nettoyerPointsInteret(anciensPoints);

      // Vérifier si il y a des changements
      const hasChanges = JSON.stringify(anciensPoints) !== JSON.stringify(nouveauxPoints);

      if (hasChanges) {
        console.log(`\n🎯 Sentier ${compteur}/${sentiers.length}: ${sentier.nom}`);
        console.log(`   Avant (${anciensPoints.length}): ${JSON.stringify(anciensPoints)}`);
        console.log(`   Après (${nouveauxPoints.length}): ${JSON.stringify(nouveauxPoints)}`);

        // Mettre à jour en base
        await Sentier.updateOne(
          { randopitons_id: sentier.randopitons_id },
          { $set: { points_interet: nouveauxPoints } }
        );
        
        modifies++;
      } else if (compteur % 100 === 0) {
        console.log(`✅ Sentier ${compteur}/${sentiers.length}: ${sentier.nom} - Points OK`);
      }
    }

    console.log(`\n🎉 Nettoyage des points d'intérêt terminé !`);
    console.log(`   📊 ${sentiers.length} sentiers traités`);
    console.log(`   🔧 ${modifies} listes de points modifiées`);
    console.log(`   ✅ ${sentiers.length - modifies} listes déjà propres`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  nettoyerTousLesPointsInteret();
}

module.exports = { nettoyerPointsInteret };