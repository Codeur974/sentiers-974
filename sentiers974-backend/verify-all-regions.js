const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function verifyAllRegions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    // Lire le fichier .md
    const mdFilePath = path.join(__dirname, '../src/data/Nom des randonnées.md');
    const mdContent = fs.readFileSync(mdFilePath, 'utf8');
    
    console.log('📖 Lecture du fichier .md...');
    
    // Parser le contenu en respectant EXACTEMENT les délimitations en **gras**
    const lines = mdContent.split('\n');
    let currentRegion = null;
    let currentSousRegion = null;
    let allMappings = {};
    
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
          if (!allMappings[currentRegion]) allMappings[currentRegion] = {};
        } else if (currentRegion) {
          // C'est une sous-région
          currentSousRegion = content;
          console.log(`   📍 Sous-région: ${currentSousRegion}`);
          allMappings[currentRegion][currentSousRegion] = [];
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
          allMappings[currentRegion][currentSousRegion].push(sentierNom);
        }
      }
    }
    
    // Afficher le résumé du fichier .md
    console.log('\n📊 RÉSUMÉ DU FICHIER .MD:');
    let totalMD = 0;
    Object.entries(allMappings).forEach(([region, sousRegions]) => {
      let regionTotal = 0;
      Object.entries(sousRegions).forEach(([sousRegion, sentiers]) => {
        regionTotal += sentiers.length;
        totalMD += sentiers.length;
      });
      console.log(`   ${region}: ${regionTotal} sentiers`);
    });
    console.log(`   TOTAL: ${totalMD} sentiers`);
    
    // Maintenant vérifier chaque région/sous-région
    console.log('\n🔍 VÉRIFICATION DÉTAILLÉE:');
    console.log('='.repeat(80));
    
    let globalIssues = {
      missing: [],
      wrongZone: [],
      noZone: []
    };
    
    for (const [region, sousRegions] of Object.entries(allMappings)) {
      console.log(`\n🏔️  RÉGION: ${region}`);
      
      for (const [sousRegion, sentiersExpected] of Object.entries(sousRegions)) {
        console.log(`\n   📍 SOUS-RÉGION: ${sousRegion}`);
        console.log(`   Attendu depuis .md: ${sentiersExpected.length} sentiers`);
        
        // Récupérer les sentiers actuels en base
        const sentiersActuels = await Sentier.find({
          zone_specifique: sousRegion
        }).select('nom region zone_specifique');
        
        console.log(`   Trouvé en base: ${sentiersActuels.length} sentiers`);
        
        if (sentiersActuels.length === sentiersExpected.length) {
          console.log(`   ✅ NOMBRES CORRESPONDENT`);
        } else {
          console.log(`   ❌ DIFFÉRENCE: ${sentiersActuels.length - sentiersExpected.length}`);
          
          // Chercher les sentiers manquants
          const sentiersActuelsNoms = sentiersActuels.map(s => s.nom);
          const manquants = sentiersExpected.filter(nom => 
            !sentiersActuelsNoms.some(actualNom => 
              actualNom.toLowerCase().includes(nom.toLowerCase()) || 
              nom.toLowerCase().includes(actualNom.toLowerCase())
            )
          );
          
          if (manquants.length > 0) {
            console.log(`   🚨 SENTIERS MANQUANTS (${manquants.length}):`);
            manquants.forEach((nom, i) => {
              console.log(`      ${i+1}. "${nom}"`);
              globalIssues.missing.push({
                region,
                sousRegion,
                sentier: nom
              });
            });
          }
          
          // Chercher les sentiers en trop (qui ne devraient pas être là)
          const enTrop = sentiersActuels.filter(sentier => 
            !sentiersExpected.some(expectedNom => 
              sentier.nom.toLowerCase().includes(expectedNom.toLowerCase()) || 
              expectedNom.toLowerCase().includes(sentier.nom.toLowerCase())
            )
          );
          
          if (enTrop.length > 0) {
            console.log(`   ⚠️  SENTIERS EN TROP (${enTrop.length}):`);
            enTrop.forEach((sentier, i) => {
              console.log(`      ${i+1}. "${sentier.nom}" (région: ${sentier.region})`);
              globalIssues.wrongZone.push({
                region,
                sousRegion,
                sentier: sentier.nom,
                sentierRegion: sentier.region
              });
            });
          }
        }
      }
    }
    
    // Chercher les sentiers sans zone_specifique dans les bonnes régions
    console.log('\n🔍 SENTIERS SANS ZONE SPÉCIFIQUE:');
    const sentiersRegionsSansZone = await Sentier.find({
      region: { $in: regions },
      $or: [
        { zone_specifique: { $exists: false } },
        { zone_specifique: null },
        { zone_specifique: '' }
      ]
    }).select('nom region');
    
    console.log(`Trouvés: ${sentiersRegionsSansZone.length} sentiers`);
    
    if (sentiersRegionsSansZone.length > 0) {
      sentiersRegionsSansZone.forEach(s => {
        console.log(`   - "${s.nom}" (région: ${s.region})`);
        globalIssues.noZone.push({
          sentier: s.nom,
          region: s.region
        });
      });
    }
    
    // Résumé global
    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ GLOBAL DES PROBLÈMES:');
    console.log(`   🚨 Sentiers manquants: ${globalIssues.missing.length}`);
    console.log(`   ⚠️  Sentiers mal placés: ${globalIssues.wrongZone.length}`);
    console.log(`   📝 Sentiers sans zone: ${globalIssues.noZone.length}`);
    console.log(`   🎯 TOTAL problèmes: ${globalIssues.missing.length + globalIssues.wrongZone.length + globalIssues.noZone.length}`);
    
    // Sauvegarde du rapport
    const rapport = {
      timestamp: new Date().toISOString(),
      totalMD: totalMD,
      problemes: globalIssues,
      details: allMappings
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'verification-report.json'), 
      JSON.stringify(rapport, null, 2),
      'utf8'
    );
    
    console.log('\n💾 Rapport sauvegardé dans: verification-report.json');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Exécuter le script
verifyAllRegions();