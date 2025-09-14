const fs = require('fs');
const path = require('path');

const parseDocumentOfficiel = () => {
  console.log('📄 Parsing du document officiel des randonnées...');
  
  const filePath = path.join(__dirname, '../src/data/Nom des randonnées.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const sentiers = [];
  let currentSentier = {};
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Ignorer les lignes vides et les headers/sections
    if (!line || line.startsWith('**') || line.startsWith('Nom de') || line.includes('\t') || line.includes('Type')) {
      i++;
      continue;
    }
    
    // Si c'est un nom de sentier (ligne qui n'est pas vide et pas une section)
    if (line.length > 0 && !line.startsWith('&nbsp;') && !line.includes('km')) {
      currentSentier = { nom: line };
      
      // Chercher la ligne de difficulté qui suit
      let j = i + 1;
      while (j < lines.length && (!lines[j].trim() || !lines[j].trim().startsWith('&nbsp;'))) {
        j++;
      }
      
      if (j < lines.length && lines[j].trim().startsWith('&nbsp;')) {
        currentSentier.difficulte = lines[j].trim().replace('&nbsp;', '');
        
        // Chercher la ligne de données qui suit
        let k = j + 1;
        while (k < lines.length && !lines[k].trim().includes('km')) {
          k++;
        }
        
        if (k < lines.length && lines[k].trim().includes('km') && lines[k].trim().includes('h')) {
          const dataLine = lines[k].trim();
          const parts = dataLine.split(/\s+/); // Split par espaces multiples
          
          if (parts.length >= 3) {
            currentSentier.distance = parts[0].replace('km', '').trim();
            currentSentier.duree = parts[1].trim();
            currentSentier.denivele = parts[2].replace('m', '').trim();
            
            sentiers.push({...currentSentier});
          }
          i = k + 1;
        } else {
          i = j + 1;
        }
      } else {
        i = j + 1;
      }
    } else {
      i++;
    }
  }
  
  console.log(`✅ ${sentiers.length} sentiers parsés du document officiel`);
  
  // Afficher quelques exemples
  console.log('\n📋 Exemples extraits:');
  sentiers.slice(0, 5).forEach((sentier, index) => {
    console.log(`${index + 1}. "${sentier.nom}"`);
    console.log(`   Difficulté: ${sentier.difficulte}`);
    console.log(`   Distance: ${sentier.distance} km`);
    console.log(`   Durée: ${sentier.duree}`);
    console.log(`   Dénivelé: ${sentier.denivele} m\n`);
  });
  
  return sentiers;
};

// Exécution si appelé directement
if (require.main === module) {
  const sentiers = parseDocumentOfficiel();
  console.log(`\n🎯 Total: ${sentiers.length} sentiers avec toutes leurs infos récupérées !`);
}

module.exports = parseDocumentOfficiel;