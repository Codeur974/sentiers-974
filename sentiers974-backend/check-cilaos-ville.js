const fs = require('fs');
const path = require('path');

function extractSentiersFromCilaosVille() {
  try {
    const mdFilePath = path.join(__dirname, '../src/data/Nom des randonnées.md');
    const mdContent = fs.readFileSync(mdFilePath, 'utf8');
    
    const lines = mdContent.split('\n');
    let inCilaosVille = false;
    let sentiers = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Détecter le début de la section "Depuis la ville de Cilaos"
      if (line === '**Depuis la ville de Cilaos**') {
        inCilaosVille = true;
        console.log('📍 Trouvé la section "Depuis la ville de Cilaos"');
        continue;
      }
      
      // Si on trouve une autre section en gras, on sort
      if (inCilaosVille && line.startsWith('**') && line.endsWith('**')) {
        console.log('🔚 Fin de section, trouvé:', line);
        break;
      }
      
      // Si on est dans la bonne section, détecter les noms de sentiers
      if (inCilaosVille && 
          line && 
          !line.includes('&nbsp;') && 
          !line.match(/^\d+(\.\d+)?\s*km/) && 
          !line.match(/^\d+h\d*/) && 
          !line.match(/^\d+\s*m/) && 
          line.length > 5) {
        
        let sentierNom = line
          .replace(/Familiale\s*$/, '')
          .replace(/\t/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (sentierNom) {
          sentiers.push(sentierNom);
          console.log(`${sentiers.length}. ${sentierNom}`);
        }
      }
    }
    
    console.log(`\n📊 Total dans le fichier .md: ${sentiers.length} sentiers`);
    console.log('\n🏔️ Liste des sentiers depuis le fichier .md:');
    sentiers.forEach((sentier, i) => {
      console.log(`${i + 1}. ${sentier}`);
    });
    
    return sentiers;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return [];
  }
}

// Exécuter
extractSentiersFromCilaosVille();