const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');

// Configuration MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/randopitons';

/**
 * Nettoie une description en supprimant les commentaires d'utilisateurs
 * et en résumant le contenu officiel
 */
function nettoyerEtResumerDescription(description) {
  if (!description || typeof description !== 'string') {
    return 'Sentier de randonnée à La Réunion.';
  }

  // Supprimer les doublons (texte répété)
  const paragraphes = description.split('\n\n');
  const paragraphesUniques = [...new Set(paragraphes)];
  let texteNettoye = paragraphesUniques.join('\n\n');

  // Patterns pour identifier les commentaires d'utilisateurs
  const patternsCommentaires = [
    /Randonnée faites?.*$/gmi,
    /Si vous aimez.*$/gmi,
    /Une boucle.*bien que.*$/gmi,
    /Boucle réalisée.*$/gmi,
    /Boucle parcourue.*$/gmi,
    /Boucle faite.*$/gmi,
    /Pour une première sortie.*$/gmi,
    /Sachez que vous pouvez.*$/gmi,
    /Attention! Vous devez.*$/gmi,
    /^[A-Z][^.!?]*(?:[.!?]|\n|$)/gm, // Phrases qui commencent comme des commentaires
  ];

  // Supprimer les commentaires identifiés
  patternsCommentaires.forEach(pattern => {
    texteNettoye = texteNettoye.replace(pattern, '');
  });

  // Nettoyer les lignes vides multiples
  texteNettoye = texteNettoye.replace(/\n\s*\n/g, '\n\n').trim();

  // Si le texte est encore trop long, prendre seulement les premiers paragraphes
  const lignes = texteNettoye.split('\n');
  const lignesOfficielles = [];

  for (const ligne of lignes) {
    // Ignorer les lignes qui ressemblent à des commentaires
    if (ligne.trim().length === 0) continue;
    
    if (
      ligne.includes('Randonnée') ||
      ligne.includes('Boucle') ||
      ligne.includes('Circuit') ||
      ligne.includes('Sentier') ||
      ligne.includes('faites') ||
      ligne.includes('réalisée') ||
      ligne.includes('parcourue') ||
      ligne.includes('sympa') ||
      ligne.includes('agréable') ||
      ligne.includes('vous pouvez') ||
      ligne.includes('Si vous') ||
      ligne.includes('Pour une')
    ) {
      // Probable commentaire d'utilisateur, on l'ignore
      continue;
    }

    lignesOfficielles.push(ligne);
    
    // Limiter à environ 200 mots
    if (lignesOfficielles.join(' ').split(' ').length > 200) {
      break;
    }
  }

  let descriptionFinale = lignesOfficielles.join('\n').trim();

  // Si c'est encore vide ou trop court, créer une description par défaut
  if (!descriptionFinale || descriptionFinale.length < 50) {
    descriptionFinale = 'Sentier de randonnée à La Réunion offrant de beaux paysages et panoramas.';
  }

  // Limiter à 3 phrases maximum
  const phrases = descriptionFinale.split(/[.!?]+/);
  if (phrases.length > 3) {
    descriptionFinale = phrases.slice(0, 3).join('. ') + '.';
  }

  // Nettoyer les espaces et caractères indésirables
  descriptionFinale = descriptionFinale
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n+/g, ' ');

  return descriptionFinale;
}

/**
 * Script principal pour nettoyer toutes les descriptions
 */
async function nettoyerToutesLesDescriptions() {
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
      
      const ancienneDescription = sentier.description_complete;
      const nouvelleDescription = nettoyerEtResumerDescription(ancienneDescription);

      if (ancienneDescription !== nouvelleDescription) {
        console.log(`\n📝 Sentier ${compteur}/${sentiers.length}: ${sentier.nom}`);
        console.log(`   Avant (${ancienneDescription?.length || 0} chars): ${(ancienneDescription || '').substring(0, 100)}...`);
        console.log(`   Après (${nouvelleDescription.length} chars): ${nouvelleDescription}`);

        // Mettre à jour en base
        await Sentier.updateOne(
          { randopitons_id: sentier.randopitons_id },
          { 
            $set: { 
              description_complete: nouvelleDescription,
              description_courte: nouvelleDescription 
            } 
          }
        );
        
        modifies++;
      } else {
        console.log(`✅ Sentier ${compteur}/${sentiers.length}: ${sentier.nom} - Déjà propre`);
      }
    }

    console.log(`\n🎉 Nettoyage terminé !`);
    console.log(`   📊 ${sentiers.length} sentiers traités`);
    console.log(`   🔧 ${modifies} descriptions modifiées`);
    console.log(`   ✅ ${sentiers.length - modifies} descriptions déjà propres`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  nettoyerToutesLesDescriptions();
}

module.exports = { nettoyerEtResumerDescription };