const axios = require('axios');
const cheerio = require('cheerio');

async function testPage() {
  try {
    console.log('🔍 Test de la page randopitons...');
    // Tester plusieurs pages
    const urls = [
      'https://randopitons.re/randonnee/1317-deux-boucles-bras-sec-palmiste-rouge',
      'https://randopitons.re/randonnee/1825-col-choupette-taibit-marla-plateau-kerval'
    ];
    
    for (const url of urls) {
      console.log(`\n\n🔍 === ANALYSE DE ${url} ===`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
    
    console.log('\n=== RECHERCHE DE DÉNIVELÉ ===');
    
    // Chercher toutes les occurrences de 'dénivelé' 
    const bodyText = $('body').text();
    console.log('Texte contenant "dénivelé":');
    const lines = bodyText.split('\n');
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes('dénivelé') || line.toLowerCase().includes('denivele')) {
        console.log(`  Ligne ${i}: ${line.trim()}`);
      }
    });
    
    console.log('\n=== RECHERCHE DE MÈTRES ===');
    // Chercher patterns avec 'm' 
    const meterMatches = bodyText.match(/\d+\s*m(?![a-z])/gi);
    if (meterMatches) {
      console.log('Valeurs en mètres trouvées:', meterMatches.slice(0, 10));
    }
    
    console.log('\n=== STRUCTURE DES INFOS ===');
    // Chercher dans des divs/spans spécifiques
    $('.info, .details, .characteristics, .fiche, .infos, .donnees').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 10) {
        console.log(`Info section ${i}: ${text.substring(0, 200)}...`);
      }
    });
    
    console.log('\n=== RECHERCHE DANS TABLES ===');
    // Chercher dans les tableaux
    $('table, .table').each((i, el) => {
      const tableText = $(el).text();
      if (tableText.includes('dénivelé') || tableText.includes('Dénivelé')) {
        console.log(`Table ${i}:`, tableText.substring(0, 300));
      }
    });
    
    console.log('\n=== RECHERCHE CONTEXTE DÉNIVELÉ ===');
    // Chercher le contexte autour de "Dénivelé positif"
    const regex = /Dénivelé positif[:\s]*(\d+)/i;
    const match = bodyText.match(regex);
    if (match) {
      console.log('Match trouvé:', match[0], '-> Valeur:', match[1]);
    } else {
      console.log('Aucun match avec regex /Dénivelé positif[:\\s]*(\\d+)/i');
      
      // Chercher différents patterns
      const patterns = [
        /Dénivelé positif[:\s]*(\d+)/i,
        /dénivelé[:\s]*(\d+)/i,
        /positif[:\s]*(\d+)/i,
        /Dénivelé.*?(\d+)/i
      ];
      
      patterns.forEach((pattern, i) => {
        const match = bodyText.match(pattern);
        if (match) {
          console.log(`Pattern ${i} trouvé:`, match[0]);
        }
      });
    }
    
    console.log('\n=== RECHERCHE DANS LES LISTES ===');
    // Chercher dans les listes et définitions
    $('dt, dd, li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.toLowerCase().includes('dénivelé') && text.length < 50) {
        const next = $(el).next().text().trim();
        console.log(`Liste item: "${text}" -> Suivant: "${next}"`);
      }
    });
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

testPage();