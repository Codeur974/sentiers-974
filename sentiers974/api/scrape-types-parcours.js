const https = require('https');
const { JSDOM } = require('jsdom');

const scrapeTypesParcours = async () => {
  return new Promise((resolve, reject) => {
    const url = 'https://randopitons.re/randonnees/liste';
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const dom = new JSDOM(data);
          const document = dom.window.document;
          
          console.log('🌐 Page récupérée, analyse du contenu...');
          
          // Chercher les tableaux
          const tables = document.querySelectorAll('table');
          console.log(`📊 ${tables.length} tableaux trouvés`);
          
          // Chercher toutes les lignes de tableau
          const rows = document.querySelectorAll('tr');
          console.log(`📝 ${rows.length} lignes de tableau trouvées`);
          
          const sentiers = [];
          
          // Analyser chaque ligne de tableau
          rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            
            if (cells.length >= 3) { // Au minimum 3 colonnes
              const nomCell = cells[0];
              const typeCell = cells[1];
              
              if (nomCell && typeCell) {
                const nom = nomCell.textContent?.trim();
                const type = typeCell.textContent?.trim();
                
                // Filtrer les noms valides (plus de 10 caractères, pas de département français)
                if (nom && nom.length > 10 && 
                    !nom.match(/^\d{2}\s*-/) && 
                    !nom.includes('Nom de') &&
                    type && type.length < 20) {
                  
                  sentiers.push({
                    nom: nom,
                    type: type
                  });
                }
              }
            }
          });
          
          // Chercher aussi les liens spécifiques de randonnées
          const links = document.querySelectorAll('a[href*="/randonnees/"]');
          console.log(`🔗 ${links.length} liens de randonnées trouvés`);
          
          // Alternative : chercher dans le contenu textuel
          const textContent = document.body.textContent;
          const lignes = textContent.split('\n');
          
          console.log('📄 Analyse du contenu textuel...');
          
          // Chercher les patterns de données
          lignes.forEach(ligne => {
            ligne = ligne.trim();
            
            // Chercher les lignes qui semblent contenir des données de sentiers
            if (ligne.includes('\t') && 
                (ligne.includes('Boucle') || 
                 ligne.includes('Aller-retour') || 
                 ligne.includes('Aller-simple'))) {
              
              const parts = ligne.split('\t');
              if (parts.length >= 2) {
                const nom = parts[0]?.trim();
                const type = parts[1]?.trim();
                
                if (nom && nom.length > 10 && 
                    !nom.match(/^\d{2}\s*-/) && 
                    (type === 'Boucle' || type === 'Aller-retour' || type === 'Aller-simple')) {
                  
                  sentiers.push({
                    nom: nom,
                    type: type
                  });
                }
              }
            }
          });
          
          // Dédupliquer
          const sentiersUniques = sentiers.filter((sentier, index, self) =>
            index === self.findIndex(s => s.nom === sentier.nom)
          );
          
          console.log(`✅ ${sentiersUniques.length} sentiers avec types récupérés`);
          
          if (sentiersUniques.length > 0) {
            console.log('\n📋 Premiers exemples:');
            sentiersUniques.slice(0, 10).forEach((sentier, index) => {
              console.log(`${index + 1}. "${sentier.nom}" - ${sentier.type}`);
            });
          }
          
          resolve(sentiersUniques);
          
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
    console.log('🔍 Scraping des types de parcours depuis randopitons.re...');
    const sentiers = await scrapeTypesParcours();
    
    if (sentiers.length > 0) {
      // Sauvegarder en JSON
      const fs = require('fs');
      const path = require('path');
      
      const outputPath = path.join(__dirname, 'types-parcours-randopitons.json');
      fs.writeFileSync(outputPath, JSON.stringify(sentiers, null, 2), 'utf-8');
      console.log(`💾 Fichier sauvegardé: ${outputPath}`);
    } else {
      console.log('❌ Aucun sentier avec type récupéré');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
};

// Exécution
if (require.main === module) {
  main();
}

module.exports = scrapeTypesParcours;