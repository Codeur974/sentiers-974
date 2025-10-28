const https = require('https');
const { JSDOM } = require('jsdom');

const rechercherAPICachee = async () => {
  return new Promise((resolve, reject) => {
    const url = 'https://randopitons.re/randonnees/liste';
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          console.log('🔍 Recherche d\'API cachée dans le code source...');
          
          // 1. Chercher les URLs d'API dans le code JavaScript
          const apiPatterns = [
            /fetch\(['"`]([^'"`]+)['"`]/g,
            /axios\.get\(['"`]([^'"`]+)['"`]/g,
            /\$\.ajax\({[^}]*url:\s*['"`]([^'"`]+)['"`]/g,
            /api[/.][\w/.-]+/gi,
            /\/api\/[^'"\s]+/gi,
            /randopitons\.re\/api\/[^'"\s]*/gi,
            /ajax[/.][\w/.-]+/gi
          ];
          
          const urlsTrouvees = new Set();
          
          apiPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(data)) !== null) {
              urlsTrouvees.add(match[1] || match[0]);
            }
          });
          
          console.log(`📡 ${urlsTrouvees.size} URLs potentielles trouvées:`);
          Array.from(urlsTrouvees).forEach(url => {
            console.log(`   - ${url}`);
          });
          
          // 2. Chercher les endpoints JSON
          const jsonPatterns = [
            /\.json\b/gi,
            /application\/json/gi,
            /dataType:\s*['"`]json['"`]/gi
          ];
          
          const jsonRefs = [];
          jsonPatterns.forEach(pattern => {
            const matches = data.match(pattern) || [];
            jsonRefs.push(...matches);
          });
          
          if (jsonRefs.length > 0) {
            console.log(`\n📄 ${jsonRefs.length} références JSON trouvées`);
          }
          
          // 3. Analyser les scripts JavaScript
          const dom = new JSDOM(data);
          const scripts = dom.window.document.querySelectorAll('script');
          
          console.log(`\n📜 ${scripts.length} scripts trouvés`);
          
          let apiEndpoints = [];
          
          scripts.forEach((script, index) => {
            const scriptContent = script.textContent || '';
            
            // Chercher des endpoints dans chaque script
            const endpoints = [
              ...scriptContent.match(/['"`][^'"`]*\/api\/[^'"`]*/g) || [],
              ...scriptContent.match(/['"`][^'"`]*\.json[^'"`]*/g) || [],
              ...scriptContent.match(/\/randonnees\/[^'"\s]*/g) || []
            ];
            
            if (endpoints.length > 0) {
              console.log(`\n🔧 Script ${index + 1}:`);
              endpoints.forEach(endpoint => {
                const cleanEndpoint = endpoint.replace(/['"``]/g, '');
                console.log(`   → ${cleanEndpoint}`);
                apiEndpoints.push(cleanEndpoint);
              });
            }
          });
          
          // 4. Chercher des variables de configuration
          const configPatterns = [
            /var\s+\w*[Cc]onfig\w*\s*=\s*{[^}]+}/g,
            /const\s+\w*[Cc]onfig\w*\s*=\s*{[^}]+}/g,
            /\w*[Uu]rl\w*\s*[:=]\s*['"`][^'"`]+['"`]/g
          ];
          
          console.log('\n⚙️ Configuration trouvée:');
          configPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(data)) !== null) {
              console.log(`   ${match[0].substring(0, 100)}...`);
            }
          });
          
          // 5. Chercher les appels AJAX spécifiques aux randonnées
          const ajaxPatterns = [
            /\$\.get\(['"`]([^'"`]*randonnee[^'"`]*)['"`]/gi,
            /\$\.post\(['"`]([^'"`]*randonnee[^'"`]*)['"`]/gi,
            /fetch\(['"`]([^'"`]*randonnee[^'"`]*)['"`]/gi
          ];
          
          console.log('\n🎯 Endpoints spécifiques randonnées:');
          ajaxPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(data)) !== null) {
              console.log(`   🎯 ${match[1]}`);
              apiEndpoints.push(match[1]);
            }
          });
          
          // 6. Tester quelques endpoints probables
          const endpointsProbables = [
            'https://randopitons.re/api/randonnees',
            'https://randopitons.re/api/sentiers',
            'https://randopitons.re/randonnees.json',
            'https://randopitons.re/api/liste',
            'https://randopitons.re/data/randonnees.json'
          ];
          
          console.log('\n🧪 Test des endpoints probables...');
          
          const testerEndpoint = (url) => {
            return new Promise((resolve) => {
              https.get(url, (res) => {
                let testData = '';
                res.on('data', chunk => testData += chunk);
                res.on('end', () => {
                  if (res.statusCode === 200) {
                    console.log(`   ✅ ${url} - Status ${res.statusCode}`);
                    if (testData.includes('[') && testData.includes('{')) {
                      console.log(`      📊 Contient du JSON (${testData.length} caractères)`);
                    }
                  } else {
                    console.log(`   ❌ ${url} - Status ${res.statusCode}`);
                  }
                  resolve();
                });
              }).on('error', () => {
                console.log(`   ❌ ${url} - Erreur de connexion`);
                resolve();
              });
            });
          };
          
          Promise.all(endpointsProbables.map(testerEndpoint)).then(() => {
            resolve({
              urlsTrouvees: Array.from(urlsTrouvees),
              apiEndpoints: [...new Set(apiEndpoints)]
            });
          });
          
        } catch (error) {
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
    const resultats = await rechercherAPICachee();
    
    console.log('\n📊 === RÉSUMÉ ===');
    console.log(`URLs potentielles: ${resultats.urlsTrouvees.length}`);
    console.log(`Endpoints API: ${resultats.apiEndpoints.length}`);
    
    if (resultats.apiEndpoints.length > 0) {
      console.log('\n🎯 Endpoints les plus prometteurs:');
      resultats.apiEndpoints.slice(0, 5).forEach(endpoint => {
        console.log(`   → ${endpoint}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
};

// Exécution
if (require.main === module) {
  main();
}

module.exports = rechercherAPICachee;