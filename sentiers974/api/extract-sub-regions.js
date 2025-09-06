const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

class SubRegionExtractor {
  
  // Mapping des sous-régions basé sur l'analyse de Randopitons.re
  getSubRegionMapping() {
    return {
      'Cirque de Cilaos': {
        'Depuis Bras Sec': ['Bras Sec', 'Mare à Joncs', 'Maison forestière'],
        'Depuis la route de l\'Ilet à Cordes': ['Ilet à Cordes', 'route de l\'Ilet', 'Ilet Fleurs Jaunes'],
        'Depuis la ville de Cilaos': ['Cilaos', 'centre de Cilaos', 'église de Cilaos', 'Thermes'],
        'Depuis le Pavillon': ['Pavillon', 'Peter Both'],
        'Depuis Palmiste Rouge': ['Palmiste Rouge'],
        'Depuis le Bloc': ['Bloc', 'Kervéguen']
      },
      'Cirque de Mafate': {
        'À partir du Maïdo': ['Maïdo'],
        'À Sans Souci': ['Sans Souci'],
        'Depuis un îlet du cirque': ['Nouvelle', 'Aurère', 'Grand Place', 'Cayenne', 'Roche Plate'],
        'Par le Col des Bœufs, le Bélier': ['Col des Bœufs', 'Bélier', 'Bord Martin'],
        'De la Rivière des Galets': ['Rivière des Galets', 'Dos d\'Ane'],
        'Depuis Dos D\'Ane': ['Dos d\'Ane']
      },
      'Cirque de Salazie': {
        'Depuis Hell-Bourg': ['Hell-Bourg', 'Grand Ilet'],
        'Depuis Salazie': ['Salazie'],
        'Depuis Mare à Vieille Place': ['Mare à Vieille Place'],
        'Depuis Mare à Martin': ['Mare à Martin']
      },
      'Est': {
        'Plaine des Palmistes': ['Plaine des Palmistes', 'Bélouve', 'Biberon'],
        'Saint-André': ['Saint-André', 'Rivière du Mât'],
        'Saint-Benoît': ['Saint-Benoît', 'Takamaka', 'Grand Étang'],
        'Sainte-Rose': ['Sainte-Rose', 'Bois Blanc'],
        'Sainte-Anne': ['Sainte-Anne']
      },
      'Nord': {
        'Saint-Denis': ['Saint-Denis', 'Roche Écrite', 'Brûlé de Saint-Denis'],
        'Sainte-Marie': ['Sainte-Marie'],
        'Sainte-Suzanne': ['Sainte-Suzanne', 'Quartier Français'],
        'La Possession': ['La Possession']
      },
      'Ouest': {
        'Saint-Paul': ['Saint-Paul', 'Tour des Roches', 'Maïdo'],
        'Le Port': ['Le Port'],
        'La Possession': ['La Possession', 'Rivière des Galets'],
        'Saint-Leu': ['Saint-Leu', 'Étang-Salé']
      },
      'Sud': {
        'Saint-Pierre': ['Saint-Pierre', 'Ravine des Cabris'],
        'Saint-Joseph': ['Saint-Joseph', 'Langevin', 'Grand Coude'],
        'Saint-Louis': ['Saint-Louis', 'Makes', 'Tévelave'],
        'Entre-Deux': ['Entre-Deux', 'Dimitile']
      },
      'Volcan': {
        'Plaine des Cafres': ['Plaine des Cafres', 'Bourg-Murat'],
        'Plaine des Sables': ['Plaine des Sables'],
        'Enclos du volcan': ['Pas de Bellecombe', 'Cratère', 'Enclos'],
        'Hautes Plaines': ['Hautes Plaines', 'Nez de Bœuf']
      }
    };
  }
  
  // Déterminer la sous-région basée sur le point de départ
  detectSubRegion(region, pointDepart, nomSentier) {
    const mapping = this.getSubRegionMapping();
    const regionMapping = mapping[region];
    
    if (!regionMapping) return null;
    
    const searchText = `${pointDepart} ${nomSentier}`.toLowerCase();
    
    // Chercher la sous-région qui correspond le mieux
    for (const [subRegion, keywords] of Object.entries(regionMapping)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          return subRegion;
        }
      }
    }
    
    return null;
  }
  
  async extractSubRegions() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connexion MongoDB établie');
      
      const sentiers = await Sentier.find({});
      console.log(`📊 Analyse de ${sentiers.length} sentiers`);
      
      let updated = 0;
      const subRegionStats = {};
      
      for (const sentier of sentiers) {
        const subRegion = this.detectSubRegion(
          sentier.region, 
          sentier.point_depart.nom, 
          sentier.nom
        );
        
        if (subRegion) {
          sentier.zone_specifique = subRegion;
          await sentier.save();
          updated++;
          
          // Stats
          const key = `${sentier.region} > ${subRegion}`;
          subRegionStats[key] = (subRegionStats[key] || 0) + 1;
        }
      }
      
      console.log(`\n✅ ${updated} sentiers mis à jour avec sous-régions`);
      
      console.log('\n📈 Répartition par sous-région:');
      Object.entries(subRegionStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([region, count]) => {
          console.log(`  ${region}: ${count} sentiers`);
        });
        
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      await mongoose.connection.close();
    }
  }
}

const extractor = new SubRegionExtractor();
extractor.extractSubRegions();