const https = require('https');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const scraperTableauComplet = async () => {
  return new Promise((resolve, reject) => {
    const url = 'https://randopitons.re/randonnees/liste';
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          console.log('🔍 Scraping du tableau complet randopitons.re...');
          
          const dom = new JSDOM(data);
          const document = dom.window.document;
          
          // Chercher le tableau avec les randonnées
          const rows = document.querySelectorAll('table tbody tr');
          console.log(`📊 ${rows.length} lignes de tableau trouvées`);
          
          const sentiers = [];
          
          rows.forEach((row, index) => {
            const cols = row.querySelectorAll('td');
            
            if (cols.length >= 7) {
              const region = cols[0]?.textContent?.trim() || '';
              const nom = cols[1]?.textContent?.trim() || '';
              const type = cols[2]?.textContent?.trim() || '';
              const qualiteSentier = cols[3]?.textContent?.trim() || '';
              const difficulte = cols[4]?.textContent?.trim() || '';
              const distance = cols[5]?.textContent?.trim() || '';
              const duree = cols[6]?.textContent?.trim() || '';
              const denivele = cols.length >= 8 ? cols[7]?.textContent?.trim() || '' : '';
              
              // Filtrer uniquement La Réunion (ignorer les autres régions)
              const regionsReunion = [
                'Cirque de Cilaos',
                'Cirque de Mafate', 
                'Cirque de Salazie',
                'Est',
                'Ouest',
                'Nord',
                'Sud',
                'Volcan'
              ];
              
              // Vérifier que c'est bien La Réunion et pas une ligne vide
              if (nom && nom.length > 5 && 
                  (regionsReunion.includes(region) || 
                   nom.includes('Piton') || 
                   nom.includes('Cilaos') ||
                   nom.includes('Mafate') ||
                   nom.includes('Salazie') ||
                   nom.includes('Îlet') ||
                   nom.includes('Bras ') ||
                   nom.includes('Ravine')) &&
                  !nom.match(/^\d{2}\s*-/) && // Pas de codes départements français
                  !nom.includes('Maurice') && // Pas l'île Maurice
                  !nom.includes('MART') && // Pas Martinique
                  !nom.includes('MAY') && // Pas Mayotte
                  !nom.includes('MADA') // Pas Madagascar
              ) {
                
                sentiers.push({
                  region: region,
                  nom: nom,
                  type: type,
                  qualiteSentier: qualiteSentier,
                  difficulte: difficulte,
                  distance: distance,
                  duree: duree,
                  denivele: denivele
                });
                
                // Afficher les premiers pour debug
                if (sentiers.length <= 10) {
                  console.log(`✅ ${sentiers.length}. "${nom}"`);
                  console.log(`   Région: ${region} | Type: ${type} | Qualité: ${qualiteSentier} | Difficulté: ${difficulte}`);
                }
              }
            }
          });
          
          console.log(`\n📊 RÉSULTAT SCRAPING:`);
          console.log(`✅ ${sentiers.length} sentiers de La Réunion récupérés`);
          
          // Statistiques par région
          console.log('\n🏔️ Répartition par régions:');
          const statsRegions = {};
          sentiers.forEach(sentier => {
            const region = sentier.region || 'Non définie';
            statsRegions[region] = (statsRegions[region] || 0) + 1;
          });
          
          Object.entries(statsRegions)
            .sort(([,a], [,b]) => b - a)
            .forEach(([region, count]) => {
              console.log(`   ${region}: ${count} sentiers`);
            });
          
          // Statistiques par type
          console.log('\n🎯 Répartition par types:');
          const statsTypes = {};
          sentiers.forEach(sentier => {
            const type = sentier.type || 'Non défini';
            if (type) {
              statsTypes[type] = (statsTypes[type] || 0) + 1;
            }
          });
          
          Object.entries(statsTypes)
            .sort(([,a], [,b]) => b - a)
            .forEach(([type, count]) => {
              console.log(`   ${type}: ${count} sentiers`);
            });
          
          // Statistiques par difficulté
          console.log('\n📊 Répartition par difficultés:');
          const statsDiff = {};
          sentiers.forEach(sentier => {
            const diff = sentier.difficulte || 'Non définie';
            if (diff) {
              statsDiff[diff] = (statsDiff[diff] || 0) + 1;
            }
          });
          
          Object.entries(statsDiff)
            .sort(([,a], [,b]) => b - a)
            .forEach(([diff, count]) => {
              console.log(`   ${diff}: ${count} sentiers`);
            });
          
          resolve(sentiers);
          
        } catch (error) {
          console.error('❌ Erreur parsing:', error);
          reject(error);
        }
      });
      
    }).on('error', (error) => {
      reject(error);
    });
  });
};

const main = async () => {
  try {
    const sentiers = await scraperTableauComplet();
    
    if (sentiers.length > 0) {
      // Sauvegarder en JSON
      const outputPath = path.join(__dirname, 'randopitons-tableau-complet.json');
      fs.writeFileSync(outputPath, JSON.stringify(sentiers, null, 2), 'utf-8');
      console.log(`\n💾 Fichier sauvegardé: ${outputPath}`);
      
      // Créer aussi un CSV pour Excel
      const csvContent = [
        'Région,Nom,Type,QualitéSentier,Difficulté,Distance,Durée,Dénivelé',
        ...sentiers.map(s => `"${s.region}","${s.nom}","${s.type}","${s.qualiteSentier}","${s.difficulte}","${s.distance}","${s.duree}","${s.denivele}"`)
      ].join('\n');
      
      const csvPath = path.join(__dirname, 'randopitons-tableau-complet.csv');
      fs.writeFileSync(csvPath, csvContent, 'utf-8');
      console.log(`💾 Fichier CSV sauvegardé: ${csvPath}`);
      
      console.log(`\n🎉 SUCCESS! ${sentiers.length} sentiers de La Réunion avec TOUS les détails récupérés !`);
      
    } else {
      console.log('❌ Aucun sentier récupéré');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
};

// Exécution
if (require.main === module) {
  main();
}

module.exports = scraperTableauComplet;