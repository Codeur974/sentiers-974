const https = require('https');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const recupererTypesIndividuels = async () => {
  try {
    console.log('🔍 Récupération des types de parcours depuis les pages individuelles...');
    
    // Charger la liste des sentiers
    const sentiersPath = path.join(__dirname, 'sentiers-api-suggestions.json');
    const sentiers = JSON.parse(fs.readFileSync(sentiersPath, 'utf-8'));
    
    console.log(`📊 ${sentiers.length} sentiers à analyser`);
    
    // Prendre un échantillon pour tester
    const echantillon = sentiers
      .filter(s => s.region && (s.region.includes('Cirque') || s.region === 'Est' || s.region === 'Ouest'))
      .slice(0, 20);
    
    console.log(`🧪 Test sur ${echantillon.length} sentiers échantillon`);
    
    const resultats = [];
    
    for (let i = 0; i < echantillon.length; i++) {
      const sentier = echantillon[i];
      
      console.log(`\n${i + 1}/${echantillon.length} - "${sentier.nom}"`);
      
      try {
        const typeInfo = await analyserPageSentier(sentier.url);
        
        if (typeInfo) {
          resultats.push({
            ...sentier,
            typeParcours: typeInfo.type,
            difficulte: typeInfo.difficulte,
            distance: typeInfo.distance,
            duree: typeInfo.duree
          });
          
          console.log(`   ✅ Type: ${typeInfo.type}`);
          if (typeInfo.difficulte) console.log(`   📊 Difficulté: ${typeInfo.difficulte}`);
        } else {
          console.log(`   ❌ Pas de type trouvé`);
        }
        
        // Pause pour éviter de surcharger le serveur
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
      }
    }
    
    console.log(`\n📊 === RÉSULTATS ===`);
    console.log(`✅ ${resultats.length} sentiers avec types récupérés`);
    
    // Statistiques des types
    const statsTypes = {};
    resultats.forEach(r => {
      if (r.typeParcours) {
        statsTypes[r.typeParcours] = (statsTypes[r.typeParcours] || 0) + 1;
      }
    });
    
    console.log('\n🎯 Types de parcours trouvés:');
    Object.entries(statsTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} sentiers`);
    });
    
    // Sauvegarder les résultats
    if (resultats.length > 0) {
      const outputPath = path.join(__dirname, 'sentiers-avec-types-test.json');
      fs.writeFileSync(outputPath, JSON.stringify(resultats, null, 2), 'utf-8');
      console.log(`\n💾 Fichier test sauvegardé: ${outputPath}`);
    }
    
    return resultats;
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
};

const analyserPageSentier = async (url) => {
  return new Promise((resolve, reject) => {
    const fullUrl = `https://randopitons.re${url}`;
    
    https.get(fullUrl, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const dom = new JSDOM(data);
          const document = dom.window.document;
          
          // Chercher les types dans différents endroits
          let type = null;
          let difficulte = null;
          let distance = null;
          let duree = null;
          
          // 1. Chercher dans les icônes/images
          const images = document.querySelectorAll('img');
          images.forEach(img => {
            const alt = img.alt?.toLowerCase();
            const src = img.src?.toLowerCase();
            
            if (alt || src) {
              if ((alt && alt.includes('boucle')) || (src && src.includes('boucle'))) {
                type = 'Boucle';
              } else if ((alt && alt.includes('aller') && alt.includes('retour')) || 
                        (src && src.includes('aller') && src.includes('retour'))) {
                type = 'Aller-retour';
              } else if ((alt && alt.includes('aller') && alt.includes('simple')) || 
                        (src && src.includes('aller') && src.includes('simple'))) {
                type = 'Aller-simple';
              }
            }
          });
          
          // 2. Chercher dans le texte
          const textContent = document.body.textContent;
          
          if (!type) {
            if (textContent.includes('Boucle') || textContent.includes('boucle')) {
              type = 'Boucle';
            } else if (textContent.includes('Aller-retour') || textContent.includes('aller-retour')) {
              type = 'Aller-retour';  
            } else if (textContent.includes('Aller-simple') || textContent.includes('aller-simple')) {
              type = 'Aller-simple';
            }
          }
          
          // 3. Chercher difficulté, distance, durée
          const difficulteMatch = textContent.match(/(Très facile|Facile|Moyen|Difficile|Très difficile)/);
          if (difficulteMatch) difficulte = difficulteMatch[1];
          
          const distanceMatch = textContent.match(/(\d+(?:\.\d+)?)\s*km/);
          if (distanceMatch) distance = parseFloat(distanceMatch[1]);
          
          const dureeMatch = textContent.match(/(\d+)h?(\d*)(?:min)?/);
          if (dureeMatch) duree = dureeMatch[0];
          
          resolve(type ? { type, difficulte, distance, duree } : null);
          
        } catch (error) {
          reject(error);
        }
      });
      
    }).on('error', (error) => {
      reject(error);
    });
  });
};

// Exécution
if (require.main === module) {
  recupererTypesIndividuels();
}

module.exports = recupererTypesIndividuels;