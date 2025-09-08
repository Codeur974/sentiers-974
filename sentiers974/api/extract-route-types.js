const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const puppeteer = require('puppeteer');
require('dotenv').config();

async function extractRouteTypes() {
  let browser;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    // Lancer Puppeteer
    console.log('🌐 Lancement du navigateur...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Aller sur la page liste des randonnées
    console.log('📖 Chargement de la page randopitons.re...');
    await page.goto('https://randopitons.re/randonnees/liste', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Attendre que la page soit chargée
    await page.waitForSelector('.randonnee-item', { timeout: 10000 });
    
    // Extraire les informations de chaque randonnée
    console.log('🔍 Extraction des types de parcours...');
    
    const randonneesData = await page.evaluate(() => {
      const items = document.querySelectorAll('.randonnee-item');
      const results = [];
      
      items.forEach((item, index) => {
        try {
          // Nom de la randonnée
          const titleElement = item.querySelector('h3, .randonnee-title, .title');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          // Type de parcours (icône)
          let routeType = 'non-défini';
          const iconElements = item.querySelectorAll('img');
          
          iconElements.forEach(icon => {
            const src = icon.src || icon.getAttribute('src') || '';
            if (src.includes('boucle.png')) {
              routeType = 'boucle';
            } else if (src.includes('aller-retour.png')) {
              routeType = 'aller-retour';
            } else if (src.includes('aller-simple.png')) {
              routeType = 'aller-simple';
            }
          });
          
          // URL de détail pour récupérer plus d'infos si besoin
          const linkElement = item.querySelector('a');
          const url = linkElement ? linkElement.href : '';
          
          if (title) {
            results.push({
              title: title,
              routeType: routeType,
              url: url,
              index: index
            });
          }
        } catch (error) {
          console.log('Erreur item', index, error.message);
        }
      });
      
      return results;
    });
    
    console.log(`📊 ${randonneesData.length} randonnées extraites`);
    
    // Afficher quelques exemples
    console.log('\\n🔍 Exemples extraits:');
    randonneesData.slice(0, 10).forEach(rando => {
      console.log(`   ${rando.routeType.padEnd(15)} - ${rando.title.substring(0, 60)}...`);
    });
    
    // Statistiques
    const stats = {
      boucle: randonneesData.filter(r => r.routeType === 'boucle').length,
      'aller-retour': randonneesData.filter(r => r.routeType === 'aller-retour').length,
      'aller-simple': randonneesData.filter(r => r.routeType === 'aller-simple').length,
      'non-défini': randonneesData.filter(r => r.routeType === 'non-défini').length
    };
    
    console.log('\\n📊 STATISTIQUES:');
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} randonnées`);
    });
    
    // Maintenant essayer de faire correspondre avec notre base de données
    console.log('\\n🔄 Mise à jour de la base de données...');
    
    let matched = 0;
    let notMatched = 0;
    
    for (const randonData of randonneesData) {
      try {
        // Recherche dans notre base
        const sentier = await Sentier.findOne({
          $or: [
            { nom: { $regex: new RegExp(randonData.title.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&'), 'i') } },
            { nom: { $regex: new RegExp(randonData.title.substring(0, 30).replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&'), 'i') } }
          ]
        });
        
        if (sentier) {
          // Mettre à jour avec le type de parcours
          await Sentier.findByIdAndUpdate(sentier._id, {
            type_parcours: randonData.routeType
          });
          
          console.log(`✅ "${sentier.nom}" → ${randonData.routeType}`);
          matched++;
        } else {
          console.log(`❌ Non trouvé: "${randonData.title}"`);
          notMatched++;
        }
      } catch (error) {
        console.error(`Erreur pour "${randonData.title}":`, error.message);
        notMatched++;
      }
    }
    
    console.log('\\n📊 RÉSULTATS MISE À JOUR:');
    console.log(`   ✅ ${matched} sentiers mis à jour`);
    console.log(`   ❌ ${notMatched} sentiers non trouvés`);
    
    // Sauvegarder les données extraites
    const fs = require('fs');
    fs.writeFileSync(
      './route-types-extracted.json', 
      JSON.stringify(randonneesData, null, 2),
      'utf8'
    );
    
    console.log('💾 Données sauvegardées dans: route-types-extracted.json');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    await mongoose.disconnect();
  }
}

// Exécuter le script
extractRouteTypes();