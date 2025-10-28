const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function fixRegionsMapping() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    // Mapping correct des sous-régions vers leurs régions principales selon le fichier .md
    const correctRegionMapping = {
      // Cirque de Cilaos
      'Dans les alentours de Bras Sec': 'Cirque de Cilaos',
      'Depuis la route de l\'Ilet à Cordes ou de l\'Îlet à Cordes': 'Cirque de Cilaos',
      'Depuis la ville de Cilaos': 'Cirque de Cilaos',
      'Depuis le Pavillon': 'Cirque de Cilaos',
      'Depuis Palmiste Rouge': 'Cirque de Cilaos',
      'Depuis le Bloc': 'Cirque de Cilaos',
      
      // Cirque de Mafate
      'A partir du Maïdo': 'Cirque de Mafate',
      'A Sans Souci': 'Cirque de Mafate',
      'Depuis un îlet du cirque': 'Cirque de Mafate',
      'Par le Col des Boeufs, le Bélier': 'Cirque de Mafate',
      'De la Rivière des Galets': 'Cirque de Mafate',
      'Depuis Dos D\'Ane': 'Cirque de Mafate',
      
      // Cirque de Salazie
      'A partir de Hell-Bourg ou de l\'Ilet à Vidot': 'Cirque de Salazie',
      'Depuis Grand Ilet ou la mare à Martin': 'Cirque de Salazie',
      'Depuis Salazie': 'Cirque de Salazie',
      
      // Est
      'Depuis Bras Panon': 'Est',
      'Depuis Saint-André': 'Est',
      'Du côté de Bourg Murat': 'Est',
      'La région de St Benoit': 'Est',
      'Les alentours de Bois Blanc et Sainte-Rose': 'Est',
      'Les alentours du volcan': 'Est',
      'La région de la Plaine des Palmistes': 'Est',
      'La région de Bébour - Bélouve': 'Est',
      
      // Nord
      'Depuis Dos d\'Ane': 'Nord',
      'Depuis le Brûlé': 'Nord',
      'Depuis Sainte-Suzanne': 'Nord',
      'La Montagne ou Saint-Bernard': 'Nord',
      'La Possession': 'Nord',
      'Les alentours de Saint-Denis': 'Nord',
      'Plusieurs directions vers la Roche Ecrite': 'Nord',
      'Région de Saint-André': 'Nord',
      
      // Ouest
      'Autour du Maïdo et RF Cryptomerias': 'Ouest',
      'Environs du Tévelave': 'Ouest',
      'Etang Salé les Hauts ou Avirons': 'Ouest',
      'La région de Saint-Leu': 'Ouest',
      'La région des Makes': 'Ouest',
      'Le long de la RF des Tamarins': 'Ouest',
      'Saint Paul': 'Ouest',
      'Saint-Gilles et Ermitage': 'Ouest',
      'Région de Bois d\'Olive et Saint-Louis': 'Ouest',
      'Vers l\' Etang Salé': 'Ouest',
      'La Rivière': 'Ouest',
      
      // Sud
      'A Grand Coude': 'Sud',
      'Autour de Petite Ile ou St Pierre': 'Sud',
      'Entre le Volcan et Bourg Murat': 'Sud',
      'La région de Langevin': 'Sud',
      'La région de Saint Joseph': 'Sud',
      'La région du Tampon': 'Sud',
      'Les alentours de l\'Entre-Deux': 'Sud',
      'Région de Bois Court': 'Sud',
      'Saint-Philippe et le Tremblet': 'Sud',
      'La région de Grand Galet': 'Sud',
      'Région de la Plaine des Grègues': 'Sud',
      
      // Volcan
      'Volcan Enclos': 'Volcan',
      'Volcan Hors enclos': 'Volcan',
      'Volcan Nord': 'Volcan',
      'Volcan Sud': 'Volcan'
    };
    
    console.log('🔄 Correction des régions principales...');
    
    let corrected = 0;
    let notFound = 0;
    
    // Parcourir tous les sentiers avec une zone_specifique
    const sentiers = await Sentier.find({ 
      zone_specifique: { $exists: true, $ne: null } 
    });
    
    console.log(`📊 ${sentiers.length} sentiers à vérifier...`);
    
    for (const sentier of sentiers) {
      const correctRegion = correctRegionMapping[sentier.zone_specifique];
      
      if (correctRegion) {
        if (sentier.region !== correctRegion) {
          await Sentier.findByIdAndUpdate(sentier._id, {
            region: correctRegion
          });
          console.log(`✅ Corrigé: "${sentier.nom.substring(0, 50)}..." → ${correctRegion} / ${sentier.zone_specifique}`);
          corrected++;
        }
      } else {
        console.log(`⚠️  Zone inconnue: "${sentier.zone_specifique}" pour "${sentier.nom.substring(0, 50)}..."`);
        notFound++;
      }
    }
    
    console.log(`\n🎉 Correction terminée:`);
    console.log(`   ✅ ${corrected} sentiers corrigés`);
    console.log(`   ⚠️  ${notFound} zones spécifiques non reconnues`);
    
    // Statistiques finales
    console.log('\n📊 Répartition finale par région:');
    const stats = await Sentier.aggregate([
      { $match: { zone_specifique: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: { region: '$region', zone_specifique: '$zone_specifique' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.region': 1, '_id.zone_specifique': 1 } }
    ]);
    
    const regionTotals = {};
    let currentRegion = '';
    for (const stat of stats) {
      if (stat._id.region !== currentRegion) {
        console.log(`\n🏔️  ${stat._id.region}:`);
        currentRegion = stat._id.region;
        regionTotals[currentRegion] = 0;
      }
      console.log(`   📍 ${stat._id.zone_specifique}: ${stat.count} sentiers`);
      regionTotals[currentRegion] += stat.count;
    }
    
    console.log('\n🌟 TOTAUX PAR RÉGION:');
    Object.entries(regionTotals).forEach(([region, total]) => {
      console.log(`   ${region}: ${total} sentiers`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Exécuter le script
fixRegionsMapping();