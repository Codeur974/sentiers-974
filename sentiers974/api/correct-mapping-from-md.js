const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function correctMappingFromMD() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    // D'abord, réinitialiser toutes les zones_specifiques
    console.log('🔄 Réinitialisation des zones spécifiques...');
    await Sentier.updateMany({}, { $unset: { zone_specifique: "" } });
    
    // Lire le fichier .md
    const mdFilePath = path.join(__dirname, '../src/data/Nom des randonnées.md');
    const mdContent = fs.readFileSync(mdFilePath, 'utf8');
    
    console.log('📖 Lecture du fichier .md...');
    
    // Parser le contenu en respectant EXACTEMENT les délimitations en **gras**
    const lines = mdContent.split('\n');
    let currentRegion = null;
    let currentSousRegion = null;
    let sentierMappings = [];
    
    const regions = ['Cirque de Cilaos', 'Cirque de Mafate', 'Cirque de Salazie', 'Est', 'Nord', 'Ouest', 'Sud', 'Volcan'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Détecter les régions principales : **Cirque de Cilaos**, **Est**, etc.
      if (line.startsWith('**') && line.endsWith('**')) {
        const content = line.replace(/\*\*/g, '').trim();
        
        if (regions.includes(content)) {
          // C'est une région principale
          currentRegion = content;
          currentSousRegion = null;
          console.log(`\n🏔️  === RÉGION: ${currentRegion} ===`);
        } else if (currentRegion) {
          // C'est une sous-région
          currentSousRegion = content;
          console.log(`   📍 Sous-région: ${currentSousRegion}`);
        }
      }
      
      // Détecter les noms de sentiers
      else if (line && 
               currentRegion && 
               currentSousRegion &&
               !line.includes('&nbsp;') && 
               !line.match(/^\d+(\.\d+)?\s*km/) && // pas de "12.2 km"
               !line.match(/^\d+h\d*/) && // pas de "5h"
               !line.match(/^\d+\s*m/) && // pas de "850 m"
               !line.includes('Nom de la randonnée') &&
               !line.includes('Type') &&
               !line.includes('Difficulté') &&
               line.length > 5) {
        
        // Nettoyer le nom du sentier
        let sentierNom = line
          .replace(/Familiale\s*$/, '')
          .replace(/\t/g, ' ') // remplacer les tabs par des espaces
          .replace(/\s+/g, ' ') // normaliser les espaces multiples
          .trim();
        
        if (sentierNom) {
          sentierMappings.push({
            nom: sentierNom,
            region: currentRegion,
            zone_specifique: currentSousRegion
          });
          console.log(`      ✅ "${sentierNom}"`);
        }
      }
    }
    
    console.log(`\n📊 Total: ${sentierMappings.length} sentiers extraits du fichier .md`);
    
    // Grouper par sous-région pour vérification
    const groupedBySousRegion = {};
    sentierMappings.forEach(mapping => {
      const key = `${mapping.region} / ${mapping.zone_specifique}`;
      if (!groupedBySousRegion[key]) {
        groupedBySousRegion[key] = [];
      }
      groupedBySousRegion[key].push(mapping.nom);
    });
    
    console.log('\n📈 Vérification par sous-région:');
    Object.entries(groupedBySousRegion).forEach(([key, sentiers]) => {
      console.log(`   ${key}: ${sentiers.length} sentiers`);
    });
    
    // Maintenant mettre à jour la base de données
    let totalUpdated = 0;
    let notFound = [];
    
    console.log('\n🔄 Mise à jour de la base de données...');
    
    for (const mapping of sentierMappings) {
      try {
        // Recherche exacte d'abord
        let sentier = await Sentier.findOne({
          nom: { $regex: new RegExp(`^${mapping.nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
        
        // Si pas trouvé, recherche partielle
        if (!sentier) {
          sentier = await Sentier.findOne({
            nom: { $regex: new RegExp(mapping.nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
          });
        }
        
        if (sentier) {
          // Mettre à jour SEULEMENT la zone_specifique (garder la région existante)
          await Sentier.findByIdAndUpdate(sentier._id, {
            zone_specifique: mapping.zone_specifique
          });
          
          console.log(`✅ "${mapping.nom}" → ${mapping.zone_specifique}`);
          totalUpdated++;
        } else {
          notFound.push(mapping.nom);
        }
      } catch (error) {
        console.error(`❌ Erreur pour "${mapping.nom}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Mise à jour terminée:`);
    console.log(`   ✅ ${totalUpdated} sentiers mis à jour`);
    console.log(`   ⚠️  ${notFound.length} sentiers non trouvés en base`);
    
    if (notFound.length > 0) {
      console.log('\n❌ Sentiers non trouvés:');
      notFound.slice(0, 10).forEach(nom => console.log(`   - "${nom}"`));
      if (notFound.length > 10) {
        console.log(`   ... et ${notFound.length - 10} autres`);
      }
    }
    
    // Statistiques finales par région/sous-région
    console.log('\n📊 Répartition finale par sous-région:');
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
    
    let currentRegionStats = '';
    for (const stat of stats) {
      if (stat._id.region !== currentRegionStats) {
        console.log(`\n🏔️  ${stat._id.region}:`);
        currentRegionStats = stat._id.region;
      }
      console.log(`   📍 ${stat._id.zone_specifique}: ${stat.count} sentiers`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Exécuter le script
correctMappingFromMD();