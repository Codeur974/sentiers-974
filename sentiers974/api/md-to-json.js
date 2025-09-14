const fs = require('fs');
const path = require('path');

const mdToJson = () => {
  console.log('📄 Conversion MD vers JSON...');
  
  const filePath = path.join(__dirname, '../src/data/Nom des randonnées.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  console.log('🔍 Premières lignes du fichier:');
  lines.slice(0, 20).forEach((line, index) => {
    console.log(`${index + 1}. "${line.trim()}"`);
  });
  
  console.log('\n🔧 Parsing des sentiers avec la structure détectée...');
  const sentiers = [];
  let currentRegion = '';
  let currentSousRegion = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Sections/régions
    if (line.startsWith('**') && line.endsWith('**')) {
      const region = line.replace(/\*\*/g, '');
      if (region.includes('Cirque')) {
        currentRegion = region;
        currentSousRegion = '';
      } else {
        currentSousRegion = region;
      }
      continue;
    }
    
    // Ignorer header et lignes vides
    if (!line || line.includes('Type') || line.includes('Difficulté')) {
      continue;
    }
    
    // Nom de sentier (ligne longue sans &nbsp; ni données)
    if (line.length > 10 && 
        !line.startsWith('&nbsp;') && 
        !line.includes('km') && 
        !line.includes('\t')) {
      
      // Chercher difficulté (ligne suivante avec &nbsp;)
      let difficulte = '';
      let distance = '';
      let duree = '';
      let denivele = '';
      
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        
        if (nextLine.startsWith('&nbsp;')) {
          difficulte = nextLine.replace('&nbsp;', '');
          
          // Chercher données (ligne après difficulté)
          for (let k = j + 1; k < lines.length; k++) {
            const dataLine = lines[k].trim();
            
            if (dataLine.includes('km') && dataLine.includes('h') && dataLine.includes('m')) {
              const parts = dataLine.split('\t');
              if (parts.length >= 3) {
                distance = parts[0].replace('km', '').trim();
                duree = parts[1].trim();
                denivele = parts[2].replace('m', '').trim();
              }
              break;
            }
          }
          break;
        }
      }
      
      if (difficulte && distance) {
        sentiers.push({
          nom: line,
          difficulte,
          distance: parseFloat(distance),
          duree,
          denivele: parseInt(denivele),
          region: currentRegion,
          sousRegion: currentSousRegion
        });
        
        console.log(`✅ Parsé: "${line}" - ${difficulte} - ${distance}km`);
      }
    }
  }
  
  console.log(`\n📊 Total parsé: ${sentiers.length} sentiers`);
  
  // Créer le fichier JSON
  const outputPath = path.join(__dirname, 'sentiers-officiels.json');
  fs.writeFileSync(outputPath, JSON.stringify(sentiers, null, 2), 'utf-8');
  console.log(`💾 Fichier créé: ${outputPath}`);
  
  return sentiers;
};

// Exécution
if (require.main === module) {
  mdToJson();
}

module.exports = mdToJson;