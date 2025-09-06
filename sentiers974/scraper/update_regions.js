const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

class RegionUpdater {
  constructor() {
    this.updated = 0;
  }

  async connectDB() {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connecté');
  }

  detectRegion(nom, pointDepart, description) {
    const nomLower = nom.toLowerCase();
    const pointDepartLower = pointDepart.toLowerCase();
    const descriptionLower = (description || '').toLowerCase();
    
    const texteCombine = `${nomLower} ${pointDepartLower} ${descriptionLower}`;
    
    // Mots-clés par région (ordre d'importance)
    const regionsKeywords = {
      'Cirque de Cilaos': [
        'cilaos', 'bras sec', 'palmiste rouge', 'dimitile', 'piton bethoune', 'bonnet pretre',
        'mare à joncs', 'kerveguen', 'caverne dufour', 'piton des neiges', 'bloc', 'thermes cilaos',
        'roche merveilleuse', 'bassin bleu', 'sentier sources', 'ilet à cordes', 'fleurs jaunes'
      ],
      'Cirque de Mafate': [
        'mafate', 'maïdo', 'roche plate', 'nouvelle', 'marla', 'trois ilets', 'orangers',
        'cayenne', 'grand place', 'bronchard', 'lataniers', 'col fourche', 'hell bourg'
      ],
      'Cirque de Salazie': [
        'salazie', 'hell-bourg', 'hell bourg', 'piton anchaing', 'ilet à vidot', 'rivière mat',
        'sources manouilh', 'terre plate', 'col fourche', 'bélouve', 'trou de fer'
      ],
      'Volcan': [
        'piton fournaise', 'pas bellecombe', 'bellecombe', 'cratère dolomieu', 'dolomieu',
        'coulée lave', 'plaine sables', 'volcan', 'enclos fouqué', 'bory', 'soufrière'
      ],
      'Est': [
        'takamaka', 'barrage patience', 'caroline', 'eden', 'plaine palmistes', 'bébour',
        'bélouve', 'saint-benoit', 'sainte-anne', 'grand étang', 'forêt bebour',
        'cascade niagara', 'cascade biberon', 'voile mariée'
      ],
      'Ouest': [
        'grand bénare', 'benare', 'glacière', 'maïdo', 'saint-paul', 'dos âne', 'cap noir',
        'port', 'saint-gilles', 'hermitage', 'cap la houssaye', 'théâtre', 'trois bassins'
      ],
      'Nord': [
        'roche écrite', 'roche ecrite', 'mamode camp', 'saint-denis', 'montagne', 'colorado',
        'chaudron', 'cascade niagara', 'takamaka saint benoit', 'salazie nord'
      ],
      'Sud': [
        'grand coude', 'bois court', 'entre-deux', 'saint-pierre', 'petite-île',
        'saint-joseph', 'vincendo', 'langevin', 'grand galet', 'basse vallée'
      ]
    };
    
    // Compteur de matches par région
    let regionScores = {};
    
    for (const [region, keywords] of Object.entries(regionsKeywords)) {
      regionScores[region] = 0;
      
      keywords.forEach((keyword, index) => {
        if (texteCombine.includes(keyword)) {
          const weight = keywords.length - index;
          regionScores[region] += weight;
        }
      });
    }
    
    // Trouver la région avec le meilleur score
    let bestRegion = 'Est'; // Changement du défaut
    let bestScore = 0;
    
    for (const [region, score] of Object.entries(regionScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestRegion = region;
      }
    }
    
    return { region: bestRegion, score: bestScore };
  }

  async updateAllRegions() {
    console.log('🔄 Mise à jour des régions de tous les sentiers...');
    
    const sentiers = await Sentier.find({});
    console.log(`📊 ${sentiers.length} sentiers à traiter`);
    
    for (const sentier of sentiers) {
      try {
        const pointDepart = sentier.point_depart?.nom || '';
        const description = sentier.description_complete || sentier.description_courte || '';
        
        const detection = this.detectRegion(sentier.nom, pointDepart, description);
        
        if (sentier.region !== detection.region) {
          console.log(`🔄 "${sentier.nom}" : ${sentier.region} → ${detection.region} (score: ${detection.score})`);
          
          sentier.region = detection.region;
          await sentier.save();
          this.updated++;
        }
        
      } catch (error) {
        console.error(`❌ Erreur mise à jour sentier ${sentier.nom}:`, error.message);
      }
    }
    
    console.log(`✅ Mise à jour terminée ! ${this.updated} sentiers mis à jour`);
    
    // Affichage des statistiques finales
    const stats = await Sentier.aggregate([
      { $group: { _id: '$region', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Répartition finale par région:');
    stats.forEach(s => console.log(`  - ${s._id}: ${s.count} sentiers`));
  }
}

async function main() {
  const updater = new RegionUpdater();
  
  try {
    await updater.connectDB();
    await updater.updateAllRegions();
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion fermée');
  }
}

if (require.main === module) {
  main();
}

module.exports = RegionUpdater;