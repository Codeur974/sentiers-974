const https = require('https');

const extraireAPISuggestions = async () => {
  return new Promise((resolve, reject) => {
    const url = 'https://randopitons.re/recherche/suggestions';
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          console.log('🔍 Récupération de l\'API suggestions...');
          const jsonData = JSON.parse(data);
          
          if (!jsonData.suggestions) {
            console.log('❌ Pas de suggestions trouvées');
            resolve([]);
            return;
          }
          
          console.log(`📊 ${jsonData.suggestions.length} suggestions totales récupérées`);
          
          // Filtrer uniquement La Réunion (Cirques + autres régions de La Réunion)
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
          
          const sentiersReunion = jsonData.suggestions.filter(suggestion => {
            const region = suggestion.data?.region;
            return region && (
              regionsReunion.includes(region) ||
              region.includes('Cirque') ||
              // Essayer de détecter La Réunion par les noms
              (suggestion.value && (
                suggestion.value.includes('Cilaos') ||
                suggestion.value.includes('Mafate') ||
                suggestion.value.includes('Salazie') ||
                suggestion.value.includes('Piton') ||
                suggestion.value.includes('Hell Bourg') ||
                suggestion.value.includes('Îlet') ||
                suggestion.value.includes('îlet') ||
                suggestion.value.includes('Bras ') ||
                suggestion.value.includes('Ravine')
              ))
            );
          });
          
          console.log(`🏝️ ${sentiersReunion.length} sentiers de La Réunion identifiés`);
          
          // Extraire les données utiles
          const sentiersFormates = sentiersReunion.map(suggestion => ({
            nom: suggestion.value,
            url: suggestion.data.url,
            region: suggestion.data.region,
            id: suggestion.data.url ? suggestion.data.url.split('/').pop() : null
          }));
          
          // Afficher quelques exemples
          console.log('\n📋 Premiers exemples:');
          sentiersFormates.slice(0, 10).forEach((sentier, index) => {
            console.log(`${index + 1}. "${sentier.nom}"`);
            console.log(`   Région: ${sentier.region}`);
            console.log(`   URL: ${sentier.url}`);
            console.log('');
          });
          
          // Statistiques par région
          console.log('\n📊 Répartition par régions:');
          const statsRegions = {};
          sentiersFormates.forEach(sentier => {
            statsRegions[sentier.region] = (statsRegions[sentier.region] || 0) + 1;
          });
          
          Object.entries(statsRegions)
            .sort(([,a], [,b]) => b - a)
            .forEach(([region, count]) => {
              console.log(`   ${region}: ${count} sentiers`);
            });
          
          resolve(sentiersFormates);
          
        } catch (error) {
          console.error('❌ Erreur parsing JSON:', error.message);
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
    const sentiers = await extraireAPISuggestions();
    
    // Sauvegarder en JSON
    if (sentiers.length > 0) {
      const fs = require('fs');
      const path = require('path');
      
      const outputPath = path.join(__dirname, 'sentiers-api-suggestions.json');
      fs.writeFileSync(outputPath, JSON.stringify(sentiers, null, 2), 'utf-8');
      console.log(`\n💾 Fichier sauvegardé: ${outputPath}`);
      
      console.log(`\n🎯 Total: ${sentiers.length} sentiers de La Réunion récupérés via l'API cachée !`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
};

// Exécution
if (require.main === module) {
  main();
}

module.exports = extraireAPISuggestions;