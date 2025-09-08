const puppeteer = require('puppeteer');

async function explorePageStructure() {
  let browser;
  
  try {
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
    
    // Attendre un peu que la page se charge
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Explorer la structure de la page
    console.log('🔍 Exploration de la structure HTML...');
    
    const pageInfo = await page.evaluate(() => {
      // Chercher différents sélecteurs possibles
      const possibleSelectors = [
        '.randonnee-item',
        '.randonnee',
        '.hike-item',
        '.hike',
        '.sentier',
        '.list-item',
        '.card',
        '.item',
        '[class*="randonnee"]',
        '[class*="hike"]',
        '[class*="sentier"]',
        'tr', // lignes de tableau
        'li', // éléments de liste
        '.row',
        '[class*="list"]'
      ];
      
      const results = {};
      
      possibleSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            results[selector] = {
              count: elements.length,
              firstElementClasses: elements[0].className,
              firstElementText: elements[0].textContent?.substring(0, 100) || ''
            };
          }
        } catch (e) {
          // Ignorer les erreurs de sélecteur
        }
      });
      
      // Chercher aussi les images d'icônes
      const allImages = document.querySelectorAll('img');
      const iconImages = [];
      allImages.forEach((img, index) => {
        const src = img.src || img.getAttribute('src') || '';
        if (src.includes('boucle') || src.includes('aller-retour') || src.includes('aller-simple') || src.includes('icon')) {
          iconImages.push({
            index,
            src,
            alt: img.alt,
            className: img.className
          });
        }
      });
      
      // Obtenir le HTML des 500 premiers caractères de body pour debug
      const bodyHTML = document.body.innerHTML.substring(0, 500);
      
      return {
        title: document.title,
        url: window.location.href,
        possibleSelectors: results,
        iconImages: iconImages,
        totalImages: allImages.length,
        bodyStart: bodyHTML
      };
    });
    
    console.log('📊 INFORMATIONS SUR LA PAGE:');
    console.log('Titre:', pageInfo.title);
    console.log('URL:', pageInfo.url);
    console.log('Total d\'images:', pageInfo.totalImages);
    console.log('Images d\'icônes trouvées:', pageInfo.iconImages.length);
    
    console.log('\\n🎯 Sélecteurs possibles:');
    Object.entries(pageInfo.possibleSelectors).forEach(([selector, info]) => {
      console.log(`   ${selector}: ${info.count} éléments`);
      console.log(`      Classes: ${info.firstElementClasses}`);
      console.log(`      Texte: ${info.firstElementText.substring(0, 50)}...`);
    });
    
    console.log('\\n🖼️  Icônes trouvées:');
    pageInfo.iconImages.forEach(icon => {
      console.log(`   ${icon.src} (classe: ${icon.className}, alt: ${icon.alt})`);
    });
    
    console.log('\\n📄 Début du HTML:');
    console.log(pageInfo.bodyStart);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

explorePageStructure();