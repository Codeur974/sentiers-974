const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function fixAllMissingSentiers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    // Liste des 14 sentiers manquants identifiés
    const sentiersACorreger = [
      {
        pattern: 'De Bourg Murat au Gîte de Bélouve par le Col de Bellevue.*Plaine des Marsouins',
        region: 'Est',
        zone_specifique: 'Du côté de Bourg Murat'
      },
      {
        pattern: 'La Cascade du Bras de Caverne.*point de vue sur le Trou de Fer.*Bélouve',
        region: 'Est',
        zone_specifique: 'La région de Bébour - Bélouve'
      },
      {
        pattern: 'La boucle de la Redoute au Colorado.*Montagne.*Chemin des Anglais',
        region: 'Nord',
        zone_specifique: 'Les alentours de Saint-Denis'
      },
      {
        pattern: 'Des Makes au point de vue sur les Makes.*Sentier du Malabar Mort.*Piton des Merles',
        region: 'Ouest',
        zone_specifique: 'La région des Makes'
      },
      {
        pattern: 'Le tunnel de la ravine souterraine de la Plaine Bois de Nèfles.*Grand Serré',
        region: 'Ouest',
        zone_specifique: 'La région des Makes'
      },
      {
        pattern: 'De la Fenêtre des Makes aux Canaux.*Bras Patate.*Chaîne du Bois de Nèfles',
        region: 'Ouest',
        zone_specifique: 'La région des Makes'
      },
      {
        pattern: 'L.ascension.*tour du Piton de Mont-Vert',
        region: 'Sud',
        zone_specifique: 'Autour de Petite Ile ou St Pierre'
      },
      {
        pattern: 'Roche Plate.*Nez de Boeuf.*Sentier.*Rivière des Remparts',
        region: 'Sud',
        zone_specifique: 'Entre le Volcan et Bourg Murat'
      },
      {
        pattern: 'De Langevin au Gîte du Volcan.*Cap Blanc.*Grand Pays.*Plaine des Sables',
        region: 'Sud',
        zone_specifique: 'La région de Langevin'
      },
      {
        pattern: 'La boucle de Matouta.*Gîte de Basse Vallée',
        region: 'Sud',
        zone_specifique: 'Saint-Philippe et le Tremblet'
      },
      {
        pattern: 'De Grand Galet à la Plaine des Sables.*Cap Blanc.*Grand Pays.*Grande Ravine',
        region: 'Sud',
        zone_specifique: 'La région de Grand Galet'
      },
      {
        pattern: 'Le grand tour de la Plaine des Sables.*Piton Rouge.*Oratoire Sainte-Thérèse',
        region: 'Volcan',
        zone_specifique: 'Volcan Hors enclos'
      },
      {
        pattern: 'La boucle du Piton Haüy.*Piton du Rond de Langevin.*Cratères Aubert de la Rue',
        region: 'Volcan',
        zone_specifique: 'Volcan Hors enclos'
      },
      {
        pattern: 'Cassé de la Rivière de l.Est.*Pas de Bellecombe.*Nez Coupé de Sainte-Rose',
        region: 'Volcan',
        zone_specifique: 'Volcan Nord'
      }
    ];
    
    console.log(`🔧 Correction de ${sentiersACorreger.length} sentiers manquants...`);
    console.log('='.repeat(80));
    
    let corrected = 0;
    let notFound = 0;
    
    for (let i = 0; i < sentiersACorreger.length; i++) {
      const config = sentiersACorreger[i];
      
      console.log(`\n${i + 1}/${sentiersACorreger.length} - Recherche: ${config.pattern.substring(0, 60)}...`);
      
      try {
        // Chercher le sentier avec le pattern regex
        const sentier = await Sentier.findOne({
          nom: { $regex: new RegExp(config.pattern, 'i') }
        });
        
        if (sentier) {
          console.log(`✅ Trouvé: "${sentier.nom}"`);
          console.log(`   Région actuelle: ${sentier.region}`);
          console.log(`   Zone actuelle: ${sentier.zone_specifique || 'NON DÉFINIE'}`);
          
          // Vérifier si le sentier est dans la bonne région
          if (sentier.region !== config.region) {
            console.log(`   ⚠️  Correction région: ${sentier.region} → ${config.region}`);
          }
          
          // Mettre à jour le sentier
          const result = await Sentier.findByIdAndUpdate(sentier._id, {
            region: config.region,
            zone_specifique: config.zone_specifique
          }, { new: true });
          
          console.log(`   🎯 Corrigé → Région: ${result.region}, Zone: ${result.zone_specifique}`);
          corrected++;
          
        } else {
          console.log(`❌ SENTIER NON TROUVÉ avec le pattern: ${config.pattern}`);
          
          // Essayer avec des mots-clés spécifiques
          const keywords = config.pattern.replace(/\.\*/g, ' ').split(' ').filter(k => k.length > 3);
          console.log(`   🔍 Tentative avec mots-clés: ${keywords.join(', ')}`);
          
          for (const keyword of keywords.slice(0, 2)) {
            const alternatives = await Sentier.find({
              nom: { $regex: new RegExp(keyword, 'i') }
            }).select('nom region zone_specifique').limit(3);
            
            if (alternatives.length > 0) {
              console.log(`   📝 Alternatives avec "${keyword}":`);
              alternatives.forEach(alt => {
                console.log(`      - "${alt.nom.substring(0, 80)}..." (${alt.region})`);
              });
              break;
            }
          }
          
          notFound++;
        }
        
      } catch (error) {
        console.error(`❌ Erreur pour pattern "${config.pattern}":`, error.message);
        notFound++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ DE LA CORRECTION:');
    console.log(`   ✅ ${corrected} sentiers corrigés`);
    console.log(`   ❌ ${notFound} sentiers non trouvés`);
    console.log(`   🎯 Total traité: ${corrected + notFound}/${sentiersACorreger.length}`);
    
    if (corrected > 0) {
      console.log('\n🔍 Vérification finale par région...');
      
      // Vérifier les totaux par région après correction
      const regionsToCheck = ['Est', 'Nord', 'Ouest', 'Sud', 'Volcan'];
      
      for (const region of regionsToCheck) {
        const count = await Sentier.countDocuments({
          region: region,
          zone_specifique: { $exists: true, $ne: null }
        });
        console.log(`   ${region}: ${count} sentiers avec zone spécifique`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Exécuter le script
fixAllMissingSentiers();