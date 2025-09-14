const https = require('https');
const { JSDOM } = require('jsdom');

const scrapeRandopitons = async () => {
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
          
          const sentiers = [];
          let currentRegion = '';
          let currentSousRegion = '';
          
          // Chercher tous les éléments de la liste
          const elements = document.querySelectorAll('.randonnee-list-item, .region-header, .sous-region-header');
          
          // Si pas d'éléments spécifiques, chercher dans tout le contenu
          const allLinks = document.querySelectorAll('a[href*="/randonnees/"]');
          const allText = document.body.textContent;
          
          console.log('🌐 Contenu récupéré du site randopitons.re');
          console.log(`📊 ${allLinks.length} liens de randonnées trouvés`);
          
          // Extraire les noms des liens
          const noms = [];
          allLinks.forEach(link => {
            const href = link.href;
            const text = link.textContent.trim();
            
            // FILTRER UNIQUEMENT LA RÉUNION - ignorer les départements métropolitains
            if (text && 
                !text.includes('Accueil') && 
                !text.includes('Contact') && 
                !text.includes('Mentions') &&
                !text.match(/^\d+$/) && // Ignorer les numéros seuls
                !text.match(/^\d{2}\s*-/) && // Ignorer les codes départements (06 -, 11 -, etc.)
                !text.includes(' - ') && // Souvent utilisé pour les départements métropolitains
                text.length > 3) {
              noms.push(text);
            }
          });
          
          // Rechercher aussi dans le texte brut pour les noms manqués (LA RÉUNION UNIQUEMENT)
          const lignes = allText.split('\n');
          lignes.forEach(ligne => {
            ligne = ligne.trim();
            // Chercher les lignes qui ressemblent à des noms de randonnées DE LA RÉUNION
            if (ligne.length > 10 && 
                ligne.length < 150 &&
                !ligne.includes('Copyright') &&
                !ligne.includes('@') &&
                !ligne.includes('http') &&
                !ligne.match(/^\d{2}\s*-/) && // Exclure les codes départements
                !ligne.includes(' - ') && // Exclure les formats métropolitains
                (ligne.includes('sentier') || 
                 ligne.includes('Sentier') ||
                 ligne.includes('randonnée') ||
                 ligne.includes('boucle') ||
                 ligne.includes('Boucle') ||
                 ligne.includes('Cirque') ||
                 ligne.includes('Piton') ||
                 ligne.includes('cascade') ||
                 ligne.includes('Cascade') ||
                 ligne.includes('sommet') ||
                 ligne.includes('Îlet') ||
                 ligne.includes('îlet') ||
                 ligne.includes('Mafate') ||
                 ligne.includes('Cilaos') ||
                 ligne.includes('Salazie'))) {
              if (!noms.includes(ligne)) {
                noms.push(ligne);
              }
            }
          });
          
          // Dédupliquer et nettoyer
          const nomsUniques = [...new Set(noms)]
            .filter(nom => nom.length > 5)
            .map(nom => nom.trim())
            .sort();
          
          console.log(`✅ ${nomsUniques.length} noms de sentiers extraits`);
          
          resolve(nomsUniques);
          
        } catch (error) {
          reject(error);
        }
      });
      
    }).on('error', (error) => {
      reject(error);
    });
  });
};

const comparerAvecAPI = async () => {
  try {
    console.log('🔍 Scraping du site randopitons.re...');
    const nomsSite = await scrapeRandopitons();
    
    console.log('\n📋 Premiers exemples extraits du site:');
    nomsSite.slice(0, 10).forEach((nom, index) => {
      console.log(`${index + 1}. "${nom}"`);
    });
    
    console.log(`\n📊 Total: ${nomsSite.length} sentiers extraits du site officiel`);
    
    return nomsSite;
    
  } catch (error) {
    console.error('❌ Erreur lors du scraping:', error);
  }
};

// Exécution
if (require.main === module) {
  comparerAvecAPI();
}

module.exports = comparerAvecAPI;