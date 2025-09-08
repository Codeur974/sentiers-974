const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function updateSentiersFromMD() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    // Lire le fichier .md
    const mdFilePath = path.join(__dirname, '../src/data/Nom des randonnées.md');
    const mdContent = fs.readFileSync(mdFilePath, 'utf8');
    
    console.log('📖 Lecture du fichier .md...');
    
    // Parser le contenu pour extraire la structure
    const lines = mdContent.split('\n');
    let currentRegion = null;
    let currentSousRegion = null;
    let sentierMappings = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Détecter les régions principales (ex: **Cirque de Cilaos**)
      if (line.startsWith('**') && line.endsWith('**') && !line.includes('alentours') && !line.includes('Depuis')) {
        const region = line.replace(/\*\*/g, '');
        // Vérifier si c'est une région principale
        const regions = ['Cirque de Cilaos', 'Cirque de Mafate', 'Cirque de Salazie', 'Est', 'Nord', 'Ouest', 'Sud', 'Volcan'];
        if (regions.includes(region)) {
          currentRegion = region;
          currentSousRegion = null;
          console.log(`🏔️  Région: ${currentRegion}`);
        }
      }
      
      // Détecter les sous-régions (ex: **Dans les alentours de Bras Sec**)
      else if (line.startsWith('**') && line.endsWith('**')) {
        currentSousRegion = line.replace(/\*\*/g, '');
        console.log(`   📍 Sous-région: ${currentSousRegion}`);
      }
      
      // Détecter les noms de sentiers (lignes non vides, pas de **, pas de &nbsp;, pas de km/h/m)
      else if (line && 
               !line.startsWith('**') && 
               !line.includes('&nbsp;') && 
               !line.includes(' km') && 
               !line.includes(' h') && 
               !line.includes(' m') &&
               !line.includes('Nom de la randonnée') &&
               !line.includes('Type') &&
               !line.includes('Difficulté') &&
               line.length > 10) {
        
        // Nettoyer le nom du sentier
        let sentierNom = line
          .replace(/Familiale\s*$/, '')
          .replace(/\s+$/, '')
          .trim();
        
        if (sentierNom && currentRegion && currentSousRegion) {
          sentierMappings.push({
            nom: sentierNom,
            region: currentRegion,
            zone_specifique: currentSousRegion
          });
          console.log(`      ✅ ${sentierNom}`);
        }
      }
    }
    
    console.log(`\n📊 ${sentierMappings.length} sentiers extraits du fichier .md`);
    
    // Maintenant mettre à jour la base de données
    let totalUpdated = 0;
    let notFound = 0;
    
    for (const mapping of sentierMappings) {
      try {
        // Rechercher le sentier par nom (recherche flexible)
        const sentier = await Sentier.findOne({
          nom: { $regex: new RegExp(mapping.nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        });
        
        if (sentier) {
          // Mettre à jour la région et zone_specifique
          await Sentier.findByIdAndUpdate(sentier._id, {
            region: mapping.region,
            zone_specifique: mapping.zone_specifique
          });
          
          console.log(`✅ Mis à jour: "${mapping.nom}" → ${mapping.region} / ${mapping.zone_specifique}`);
          totalUpdated++;
        } else {
          console.log(`⚠️  Non trouvé en base: "${mapping.nom}"`);
          notFound++;
        }
      } catch (error) {
        console.error(`❌ Erreur pour "${mapping.nom}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Mise à jour terminée:`);
    console.log(`   ✅ ${totalUpdated} sentiers mis à jour`);
    console.log(`   ⚠️  ${notFound} sentiers non trouvés en base`);
    
    // Statistiques par région
    console.log('\n📊 Répartition par région:');
    const stats = await Sentier.aggregate([
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
      console.log(`   📍 ${stat._id.zone_specifique || 'Non spécifié'}: ${stat.count} sentiers`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Exécuter le script
updateSentiersFromMD();